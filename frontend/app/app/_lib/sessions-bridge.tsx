"use client";

/**
 * SessionsBridge (Phase 1 — read-side sync from DB to WorkspaceContext).
 *
 * What it does:
 *   When the user is authenticated, fetch their chart_sessions from the
 *   backend (TanStack Query) and mirror them into WorkspaceContext's
 *   savedSessions array. The sidebar + multi-chart switcher in page.tsx
 *   read from WorkspaceContext, so they automatically reflect the
 *   server-side state without any page.tsx changes.
 *
 * What it does NOT do (yet — next commit will add):
 *   Write-side mutation pass-through. Today, page.tsx's setSavedSessions
 *   calls update LOCAL state only. To persist new charts / edits / deletes
 *   to the DB, the call sites in page.tsx need to be wired to
 *   useCreateChartSession() / useUpdateChartSession() / useDeleteChartSession().
 *   That's a focused next commit ("P1.5b") because it touches ~10 sites
 *   in page.tsx and warrants its own verification.
 *
 *   Until P1.5b: charts created in this session are visible in the sidebar
 *   immediately but disappear on page refresh (unchanged from pre-Phase-1
 *   behavior). After P1.5b: they persist.
 *
 * Why split read/write across commits:
 *   - Read sync = isolated, no page.tsx changes, low risk
 *   - Write sync = touches page.tsx mutation sites, needs careful regression
 *     verification (Match/Muhurtha/Horary result invalidation, chart
 *     edit modal, new chart modal, etc.)
 *
 * Anonymous users:
 *   This bridge is a no-op when not authenticated. WorkspaceContext's
 *   savedSessions stays as in-memory React state (current behavior).
 *
 * Mount point:
 *   Inside /app/layout.tsx, INSIDE the WorkspaceProvider so it can call
 *   useWorkspace().
 */

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useChartSessions } from "@/lib/api/hooks";
import { useWorkspace } from "./workspace-context";
import type { ChartSessionPublic } from "@/lib/api/hooks";
import type { ChartSession } from "../types";

/**
 * Adapt a backend ChartSessionPublic to the frontend's ChartSession shape.
 *
 * The two shapes were independently designed (frontend was localStorage-
 * first, backend is DB-first). Map carefully — silent missing fields
 * cause subtle UI bugs (chart name disappears, sidebar item blank, etc.)
 */
function apiSessionToWorkspace(api: ChartSessionPublic): ChartSession {
  return {
    id: api.id,
    name: api.name,
    birthDetails: {
      name: api.birth_name ?? "",
      date: api.birth_date ?? "",
      time: api.birth_time ?? "",
      ampm: api.birth_ampm ?? "AM",
      place: api.birth_place_name ?? "",
      latitude: api.birth_latitude,
      longitude: api.birth_longitude,
      gender: (api.birth_gender as "male" | "female" | "") ?? "",
      timezone_offset: api.birth_timezone_offset ?? undefined,
    },
    workspaceData: api.workspace_data ?? null,
    // Frontend type expects { q, a, isTopic? }[] shape; API returns
    // dict[]; cast and trust the shape was created via this app.
    analysisMessages:
      (api.analysis_messages as { q: string; a: string; isTopic?: boolean }[]) ??
      [],
    activeTopic: (api.ui_state?.activeTopic as string) ?? "",
    selectedHouse: (api.ui_state?.selectedHouse as number | null) ?? null,
    chatQ: (api.ui_state?.chatQ as string) ?? "",
    analysisLang:
      (api.ui_state?.analysisLang as "english" | "telugu_english") ?? "english",
    activeTab: (api.ui_state?.activeTab as string) ?? "chart",
  };
}

/**
 * SessionsBridge — invisible component (returns null). Mount inside
 * WorkspaceProvider in layout.tsx.
 *
 * On first successful fetch after auth, also auto-loads the most recent
 * session as the active workspace (sets birthDetails, workspaceData,
 * setupDone=true). This fixes the "land back on onboarding after page
 * refresh" UX issue — astrologers expect their last chart to be there
 * waiting on /app load.
 *
 * The auto-load is one-shot per auth session (tracked via ref) so we
 * don't fight the user's manual session-switching after the initial
 * landing.
 */
export function SessionsBridge() {
  const { status } = useAuth();
  const {
    setSavedSessions,
    setSetupDone,
    setBirthDetails,
    setWorkspaceData,
    setCurrentSessionId,
    setTimezoneOffset,
    setMode,
    setupDone,
  } = useWorkspace();
  const { data, isSuccess } = useChartSessions();
  // Tracks whether we've already done the one-time auto-load for this
  // browser tab's auth session. Using ref (not state) because we don't
  // want re-renders, just an idempotency guard.
  const didAutoLoadRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") {
      // Reset the guard so re-login (in same tab) can auto-load again.
      didAutoLoadRef.current = false;
      return;
    }
    if (!isSuccess || !data) return;

    const sessions = data.items.map(apiSessionToWorkspace);
    setSavedSessions(sessions);

    // Auto-load the most recent session if:
    //   - We haven't auto-loaded yet this auth session
    //   - User hasn't already started onboarding (setupDone still false)
    //   - There IS at least one session in the DB
    // The API returns sessions ordered by updated_at DESC, so items[0]
    // is the most recently touched.
    if (
      !didAutoLoadRef.current &&
      !setupDone &&
      sessions.length > 0 &&
      sessions[0].workspaceData
    ) {
      const top = sessions[0];
      setBirthDetails(top.birthDetails);
      setWorkspaceData(top.workspaceData);
      setCurrentSessionId(top.id);
      if (top.birthDetails.timezone_offset !== undefined) {
        setTimezoneOffset(top.birthDetails.timezone_offset);
      }
      setMode("astrologer");
      setSetupDone(true);
      didAutoLoadRef.current = true;
    }
  }, [
    status,
    isSuccess,
    data,
    setupDone,
    setSavedSessions,
    setSetupDone,
    setBirthDetails,
    setWorkspaceData,
    setCurrentSessionId,
    setTimezoneOffset,
    setMode,
  ]);

  return null;
}
