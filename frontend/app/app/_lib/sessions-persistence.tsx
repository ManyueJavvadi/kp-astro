"use client";

/**
 * Sessions persistence (Phase 1.5b — write-side mutation pass-through).
 *
 * Wraps the TanStack create/update/delete chart-session mutations behind
 * two friendly functions that page.tsx can call alongside its existing
 * local setSavedSessions updates:
 *
 *   const { saveSession, removeSession } = useSessionPersistence();
 *
 *   saveSession(session)   — POST if session is new (Date.now() id),
 *                            PATCH if it already has a UUID (server-issued id).
 *   removeSession(id)      — DELETE if id is a UUID; no-op for local-only.
 *
 * Why these functions in addition to local setSavedSessions:
 *   page.tsx already calls setSavedSessions(...) for instant UI feedback.
 *   These persistence calls run in parallel — fire-and-forget — to mirror
 *   the change to the DB. On error, show a toast; UI keeps working
 *   locally. On the next page load, SessionsBridge re-reads from DB and
 *   the canonical state wins.
 *
 * Why we don't replace setSavedSessions entirely:
 *   - Anonymous users (not logged in) still get a working in-memory
 *     sidebar without the network round-trip
 *   - Optimistic UX: chart shows up immediately, no spinner
 *   - The 5 page.tsx call sites have different semantics (snapshot,
 *     edit, switch, remove); using explicit functions keeps each site
 *     clear instead of cramming everything into a setter wrapper
 *
 * ID convention:
 *   - Server-issued sessions  → UUID v4 (36-char hex-with-dashes, from
 *                                gen_random_uuid())
 *   - Local-only sessions     → Date.now().toString() (numeric string)
 *   This shape difference lets us tell "needs CREATE" from "needs UPDATE"
 *   without any extra bookkeeping flag.
 */

import { useCallback, useRef } from "react";
import {
  useCreateChartSession,
  useUpdateChartSessionByIdFactory,
  useDeleteChartSession,
  type ChartSessionCreate,
  type ChartSessionUpdate,
} from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/auth-context";
import type { ChartSession } from "../types";

// Match RFC 4122 UUID v4. Anything else (notably Date.now() ids) goes
// down the CREATE path.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isServerIssuedId(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * Adapt frontend ChartSession → backend ChartSessionCreate.
 *
 * The two shapes evolved separately (frontend was localStorage-first,
 * backend is DB-first). Map carefully — silent missing fields cause
 * subtle DB issues (chart name lost, birth date NULL, etc.)
 */
function workspaceToApiCreate(s: ChartSession): ChartSessionCreate {
  return {
    name: s.name,
    birth_name: s.birthDetails.name || undefined,
    birth_date: s.birthDetails.date || undefined,
    birth_time: s.birthDetails.time || undefined,
    birth_ampm: s.birthDetails.ampm || undefined,
    birth_place_name: s.birthDetails.place || undefined,
    birth_latitude: s.birthDetails.latitude ?? undefined,
    birth_longitude: s.birthDetails.longitude ?? undefined,
    birth_timezone_offset: s.birthDetails.timezone_offset ?? undefined,
    birth_gender: s.birthDetails.gender || undefined,
    workspace_data: s.workspaceData ?? undefined,
    analysis_messages: s.analysisMessages?.length
      ? (s.analysisMessages as unknown as Array<Record<string, unknown>>)
      : undefined,
    ui_state: {
      activeTopic: s.activeTopic,
      selectedHouse: s.selectedHouse,
      chatQ: s.chatQ,
      analysisLang: s.analysisLang,
      activeTab: s.activeTab,
    },
  };
}

/**
 * Adapt frontend ChartSession → backend ChartSessionUpdate.
 *
 * Same as create but the field set is identical for now. Kept as a
 * separate function so future-divergence is easy (e.g., we might
 * stop sending workspace_data on updates if it bloats the wire).
 */
function workspaceToApiUpdate(s: ChartSession): ChartSessionUpdate {
  return workspaceToApiCreate(s);
}

export interface SessionPersistence {
  /** True when the auth context is ready AND user is signed in. */
  isAuthenticated: boolean;

  /**
   * Persist a session. Decides CREATE vs UPDATE by inspecting the id.
   *
   * Fire-and-forget — does not block. Errors surface via the toast
   * callback if provided. The local sidebar already reflects the change
   * before this returns; the API call is purely for cross-device durability.
   *
   * @param session    — the chart session (after page.tsx has applied its
   *                     local state update)
   * @param onError    — optional callback for displaying a user-visible
   *                     error toast
   * @param onCreated  — optional callback fired once, after a CREATE
   *                     (POST) succeeds, with the server-issued UUID. The
   *                     caller uses it to remap the local Date.now() id to
   *                     the real id so subsequent saves PATCH instead of
   *                     creating duplicate rows. (2026-06-08 audit fix.)
   */
  saveSession(
    session: ChartSession,
    onError?: (err: Error) => void,
    onCreated?: (serverId: string) => void,
  ): void;

  /**
   * Delete a session by id. No-op if id isn't a server-issued UUID
   * (anonymous local-only sessions don't exist on the server).
   */
  removeSession(id: string, onError?: (err: Error) => void): void;
}

export function useSessionPersistence(): SessionPersistence {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";

  const createMutation = useCreateChartSession();
  const updateFactory = useUpdateChartSessionByIdFactory();
  const deleteMutation = useDeleteChartSession();

  // 2026-06-08 audit fix (P1 duplicate rows): local-id sessions used to
  // take the CREATE branch on EVERY save. The AI-persist code fires two
  // saves per question (stream-complete + 1500ms debounce), and nothing
  // ever remapped the local Date.now() id to the server UUID — so each
  // question inserted up to 2 duplicate chart_sessions rows (each
  // carrying the full ~50KB workspace_data JSONB), accumulating forever
  // and showing duplicate sidebar chips. Two guards fix it:
  //   1. inFlightCreates — while a CREATE for a given local id is in
  //      flight, skip further CREATEs for that same id (kills the
  //      2-triggers-per-question double-insert).
  //   2. onCreated remap — when the CREATE resolves, the caller swaps
  //      currentSessionId/savedSessions to the server UUID, so every
  //      later save for that session PATCHes the one row.
  const inFlightCreates = useRef<Set<string>>(new Set());

  const saveSession = useCallback<SessionPersistence["saveSession"]>(
    (session, onError, onCreated) => {
      if (!isAuthenticated) return; // anonymous mode: in-memory only

      if (isServerIssuedId(session.id)) {
        // Existing DB row → PATCH
        const updateMutation = updateFactory(session.id);
        updateMutation.mutate(workspaceToApiUpdate(session), {
          onError: (err) => onError?.(err as Error),
        });
      } else {
        // Local-only id → POST. Guard against concurrent CREATEs for the
        // same local id: the first one wins and remaps the id; any save
        // that fires before it resolves is dropped here (the post-remap
        // PATCH path will persist the latest state on the next trigger).
        if (inFlightCreates.current.has(session.id)) return;
        inFlightCreates.current.add(session.id);
        const localId = session.id;
        createMutation.mutate(workspaceToApiCreate(session), {
          onSuccess: (data) => {
            inFlightCreates.current.delete(localId);
            // data is the ChartSessionPublic the server created; its id
            // is the canonical UUID. Hand it back so the caller remaps.
            const serverId = (data as { id?: string } | undefined)?.id;
            if (serverId) onCreated?.(serverId);
          },
          onError: (err) => {
            inFlightCreates.current.delete(localId);
            onError?.(err as Error);
          },
        });
      }
    },
    [isAuthenticated, createMutation, updateFactory],
  );

  const removeSession = useCallback<SessionPersistence["removeSession"]>(
    (id, onError) => {
      if (!isAuthenticated) return;
      if (!isServerIssuedId(id)) return; // local-only — nothing on server
      deleteMutation.mutate(id, {
        onError: (err) => onError?.(err as Error),
      });
    },
    [isAuthenticated, deleteMutation],
  );

  return {
    isAuthenticated,
    saveSession,
    removeSession,
  };
}
