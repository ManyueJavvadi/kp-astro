"use client";

/**
 * /app/clients/[id] — per-client workspace route.
 *
 * Phase 2 Slice 4 (2026-06-02). The proper deep-linkable URL for
 * a client's workspace. URL stays /app/clients/[id]; browser back
 * works; page refresh preserves which client is open.
 *
 * Implementation approach (chosen because it doesn't require
 * extracting the 1200-line workspace UI from page.tsx):
 *   1. Read clientId from route params
 *   2. Load that client's most recent chart_session via TanStack
 *   3. Push session data into WorkspaceContext (birthDetails,
 *      workspaceData, setupDone=true, currentSessionId, mode,
 *      timezone)
 *   4. Render <Home /> (imported from /app/page.tsx). Home reads
 *      WorkspaceContext, sees setupDone=true, renders the existing
 *      workspace UI scoped to this client.
 *
 * Edge cases handled:
 *   - Client has no chart_session yet → redirect to /app with a
 *     console hint. Future: render "Compute chart for this client"
 *     CTA inline.
 *   - Sessions still loading → render a centered loading state
 *     (avoids flashing CRM home before workspace appears)
 *   - Anonymous visitor → AuthGate redirects (already covered)
 *
 * What's NOT in Slice 4:
 *   - Per-tab routes (/app/clients/[id]/chart, /houses, etc.) —
 *     Slice 5
 *   - Real /app/clients/[id]/portal route — Phase 3
 *   - Editing client metadata inline — Phase 2 polish
 *
 * Sacred-region note:
 *   This page imports Home from page.tsx but does NOT modify Home
 *   itself. Home still reads useWorkspace() and renders the same
 *   workspace UI it always has. We're just providing a different
 *   route + entry path to the same component.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
// C8 fix (2026-06-02): use the per-client filter instead of the full
// roster. With many clients × many sessions, fetching all and
// filtering client-side was a meaningful waste of bandwidth.
import { useChartSessionsForClient } from "@/lib/api/hooks";
import { useWorkspace } from "../../_lib/workspace-context";
import { theme } from "@/lib/theme";
// Default export of /app/page.tsx — the Home component. Importing it
// here renders the same workspace UI Home renders on /app.
import Home from "../../page";
// U9 fix (2026-06-02): mount AddClientModal here so the "+ New Client"
// button in PersonHeroBanner (top of the workspace) can open the
// correct flow that creates BOTH a client row AND a chart_session.
// The PersonHeroBanner dispatches `workspace-add-client` — we listen.
import { AddClientModal } from "../../_components/AddClientModal";

export default function ClientWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = (params?.id as string) ?? "";

  const { data: sessions, isSuccess, isLoading, isError, refetch } =
    useChartSessionsForClient(clientId);
  const {
    setBirthDetails,
    setWorkspaceData,
    setSetupDone,
    setCurrentSessionId,
    setMode,
    setTimezoneOffset,
  } = useWorkspace();

  // Local guard so we render the workspace ONLY after context is set
  // (avoids briefly flashing CrmHome before setupDone=true takes effect).
  const [contextReady, setContextReady] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    if (!isSuccess || !sessions) return;
    // The filtered endpoint returns only sessions for this client;
    // head of list is most recently updated.
    const session = sessions.items[0];
    if (!session) {
      // Edge case: client exists but has no chart_session. Could
      // happen if the user added a client via direct API call or
      // if the chart_session creation failed mid-Add-Client flow.
      // Bounce back to /app where they can re-trigger or pick another.
      // eslint-disable-next-line no-console
      console.warn("No chart_session found for client:", clientId);
      setNotFound(true);
      return;
    }
    // Push session data into WorkspaceContext. Mirrors the handful
    // of state mutations handleSwitchSession does in page.tsx for
    // the "switch chart" sidebar action. Keep this in sync if
    // handleSwitchSession changes.
    setBirthDetails({
      name: session.birth_name ?? "",
      date: session.birth_date ?? "",
      time: session.birth_time ?? "",
      ampm: session.birth_ampm ?? "AM",
      place: session.birth_place_name ?? "",
      latitude: session.birth_latitude,
      longitude: session.birth_longitude,
      gender: (session.birth_gender as "male" | "female" | "") ?? "",
      timezone_offset: session.birth_timezone_offset ?? undefined,
    });
    if (session.workspace_data) {
      setWorkspaceData(session.workspace_data);
    }
    setCurrentSessionId(session.id);
    setMode("astrologer");
    if (session.birth_timezone_offset != null) {
      setTimezoneOffset(session.birth_timezone_offset);
    }
    // setupDone LAST — flipping this is what triggers Home to render
    // the workspace UI (instead of CrmHome).
    setSetupDone(true);
    setContextReady(true);
  }, [
    clientId,
    isSuccess,
    sessions,
    setBirthDetails,
    setWorkspaceData,
    setCurrentSessionId,
    setMode,
    setTimezoneOffset,
    setSetupDone,
  ]);

  // Bounce to /app when client has no chart yet. Delayed by a render
  // so the user sees a brief "redirecting…" before the URL changes.
  useEffect(() => {
    if (!notFound) return;
    const t = setTimeout(() => router.replace("/app"), 600);
    return () => clearTimeout(t);
  }, [notFound, router]);

  // Phase 2 polish (2026-06-02) — CRITICAL: reset workspace state on
  // UNMOUNT. Without this, navigating away (top-bar "Back to clients",
  // sidebar nav, browser back) leaves setupDone=true + workspaceData
  // populated. Then /app/page.tsx re-renders, sees setupDone=true,
  // and renders the STALE workspace UI for the old client instead of
  // CrmHome. CrmHome has its own reset effect — but it only runs if
  // CrmHome actually mounts, and it never mounts while setupDone is
  // true. Classic catch-22, fixed at the unmount side.
  //
  // Empty dep array — cleanup fires only on real unmount, not on
  // every re-render of this page. Effect body itself does nothing on
  // mount; the work is purely in the returned cleanup.
  useEffect(() => {
    return () => {
      setSetupDone(false);
      setWorkspaceData(null);
      setCurrentSessionId("");
      setBirthDetails({
        name: "",
        date: "",
        time: "",
        ampm: "AM",
        place: "",
        latitude: null,
        longitude: null,
        gender: "",
      });
    };
    // Intentionally empty — setters are stable refs from context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // P0-5 (deep-scan-2): isError branch was missing — before this fix
  // a 500 / network blip on /chart-sessions left the page stuck on
  // "Loading client workspace…" forever with no retry path. Now we
  // show an inline error card with a Retry button that re-runs the
  // useChartSessionsForClient query (TanStack handles dedupe).
  if (isError) {
    return (
      <CenteredMessage>
        <strong>Couldn&apos;t load this client&apos;s workspace.</strong>
        <br />
        <span style={{ fontSize: 12, opacity: 0.8 }}>
          Check your connection, then retry.
        </span>
        <br />
        <button
          type="button"
          onClick={() => void refetch()}
          style={{
            marginTop: 14,
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid rgba(201,169,110,0.45)",
            background: "rgba(201,169,110,0.08)",
            color: "#c9a96e",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </CenteredMessage>
    );
  }

  // While we wait for sessions to load + push context, show a
  // centered loading state. Once context is ready, render Home which
  // reads the context and shows the workspace.
  if (notFound) {
    return (
      <CenteredMessage>
        <strong>No chart for this client yet.</strong>
        <br />
        Returning you to the home screen…
      </CenteredMessage>
    );
  }

  if (isLoading || !contextReady) {
    return (
      <CenteredMessage>
        <Loader2
          size={18}
          style={{
            animation: "spin 1s linear infinite",
            verticalAlign: "middle",
            marginRight: 8,
          }}
        />
        Loading client workspace…
      </CenteredMessage>
    );
  }

  // Context is set; render the existing Home component which will see
  // setupDone=true + workspaceData populated and render the workspace UI.
  return (
    <>
      <Home />
      <NewClientFromWorkspace />
    </>
  );
}

/**
 * U9 fix (2026-06-02) — listens for `workspace-add-client` dispatched
 * by PersonHeroBanner's "+ New Client" button, opens the AddClientModal.
 * On success, navigates to the new client's workspace.
 *
 * Why a separate component: hooks (useState, useEffect, useRouter)
 * can't live in the conditional-render branch above without forcing
 * the whole component into a different shape. Component boundary
 * isolates them cleanly.
 */
function NewClientFromWorkspace() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("workspace-add-client", handler);
    return () => window.removeEventListener("workspace-add-client", handler);
  }, []);
  return (
    <AddClientModal
      open={open}
      onClose={() => setOpen(false)}
      onCreated={(clientId) => {
        setOpen(false);
        router.push(`/app/clients/${clientId}`);
      }}
    />
  );
}

// ─── Small helpers ───────────────────────────────────────────────────

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        textAlign: "center",
        color: theme.text.muted,
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <div>{children}</div>
    </div>
  );
}
