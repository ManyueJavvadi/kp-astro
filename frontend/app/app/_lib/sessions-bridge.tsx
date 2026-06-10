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

import { useEffect } from "react";
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
  // Only destructure setSavedSessions — the other workspace setters
  // were used by the (now-removed) auto-load block.
  const { setSavedSessions } = useWorkspace();
  // 2026-06-10 cross-device sync: refetch the sessions list when the tab
  // regains focus, so returning to a laptop pulls AI Q&A added from
  // another device (e.g. the phone). The global default disables
  // focus-refetch (astrologers alt-tab constantly); we opt THIS query
  // back in because it's the source the analysis-tab fast-forward reads.
  // staleTime keeps it from re-firing on every rapid focus flip.
  const { data, isSuccess } = useChartSessions({
    refetchOnWindowFocus: true,
    staleTime: 15 * 1000,
  });

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!isSuccess || !data) return;
    // Mirror the DB session list into WorkspaceContext.savedSessions so
    // the sidebar "Switch chart" and CRM clients roster reflect the
    // canonical server-side state.
    const sessions = data.items.map(apiSessionToWorkspace);
    setSavedSessions(sessions);

    // Phase 2 Slice 3 (2026-06-02) — REMOVED auto-load of most-recent
    // session. The CRM home is now the proper landing for authenticated
    // astrologers — they CHOOSE which client to open from the roster.
    // Auto-loading the most recent session would skip the CRM home
    // entirely (because setSetupDone(true) flips page.tsx into the
    // workspace render).
    //
    // Before P2.S3: auto-load was necessary because the alternative was
    // the dead "enter your birth details" onboarding form.
    // After P2.S3: clicking a client on CRM home triggers
    // handleSwitchSession, which sets workspaceData + setupDone=true
    // → workspace renders. User stays in control of which client opens.
    //
    // If we later want a "remember last-opened client across sessions"
    // feature (Phase 3+), it'd be added back here behind a user
    // preference toggle.
  }, [status, isSuccess, data, setSavedSessions]);

  return null;
}
