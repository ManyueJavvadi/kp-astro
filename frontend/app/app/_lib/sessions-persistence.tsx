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

import { useCallback } from "react";
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
   * @param session  — the chart session (after page.tsx has applied its
   *                   local state update)
   * @param onError  — optional callback for displaying a user-visible
   *                   error toast
   */
  saveSession(
    session: ChartSession,
    onError?: (err: Error) => void,
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

  const saveSession = useCallback<SessionPersistence["saveSession"]>(
    (session, onError) => {
      if (!isAuthenticated) return; // anonymous mode: in-memory only

      if (isServerIssuedId(session.id)) {
        // Existing DB row → PATCH
        const updateMutation = updateFactory(session.id);
        updateMutation.mutate(workspaceToApiUpdate(session), {
          onError: (err) => onError?.(err as Error),
        });
      } else {
        // Local-only id → POST. The new server id will appear in the
        // next SessionsBridge re-read; local id stays until then. This
        // is fine because page.tsx references sessions by content
        // (workspaceData, birthDetails) not strictly by id — and the
        // sidebar updates seamlessly when the DB list arrives.
        createMutation.mutate(workspaceToApiCreate(session), {
          onError: (err) => onError?.(err as Error),
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
