"use client";

/**
 * CrmHome — the authenticated astrologer's landing page.
 *
 * Phase 2 Slice 3 (2026-06-02). Replaces the dead onboarding form
 * ("Decode the cosmos / Your name / DOB / I am a / KP astrologer")
 * for logged-in users. Now the page is CRM-first:
 *   [Today panchang strip]
 *   [Recent activity feed (stub for now)]
 *   [Clients roster (search + list)]
 *   [+ Add client button]
 *
 * Per master plan §6 — this is the structural shift. The
 * astrologer's first impression is "your clients live here, ready
 * to be served" not "enter your own birth details."
 *
 * Bridging behavior with the existing workspace (until Slice 4 lands
 * the proper /app/clients/[id] route):
 *   - Clicking a client opens that client's chart_session via the
 *     existing handleSwitchSession flow (sets workspaceData +
 *     setupDone=true → workspace UI takes over).
 *   - Add client modal: after the 3-step flow completes (POST
 *     /clients, POST /astrologer/workspace, POST /chart-sessions),
 *     we load that client's workspace via the same handleSwitchSession
 *     path.
 *   - This means CrmHome HANDS OFF to the existing workspace; it
 *     doesn't replace it. Slice 4 introduces a real route boundary.
 *
 * Recent activity feed: placeholder for now. Spec'd post-launch.
 * Showing a "Coming soon" hint keeps the layout balanced without
 * faking data.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useChartSessions, type ClientPublic } from "@/lib/api/hooks";
import { CrmShell } from "./CrmShell";
import { TodayPanchangStrip } from "./TodayPanchangStrip";
import { ClientsRoster } from "./ClientsRoster";
import { AddClientModal } from "./AddClientModal";
import { useWorkspace } from "../_lib/workspace-context";
import { theme } from "@/lib/theme";
import type { ChartSession } from "../types";

interface CrmHomeProps {
  /** Handler from page.tsx that loads a chart session into the
   *  workspace state (sets workspaceData, setupDone, etc.). Same
   *  function that powers the existing sidebar's "Switch chart"
   *  button — we reuse it to preserve all the downstream side
   *  effects (Match/Muhurtha/Horary clear, chart-scope key bridge,
   *  etc.). */
  onOpenSession: (session: ChartSession) => Promise<void> | void;
}

export function CrmHome({ onOpenSession }: CrmHomeProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();
  const { savedSessions } = useWorkspace();
  const { data: sessionsList } = useChartSessions();

  /**
   * Find the most recent chart_session for a given client. Returns
   * null if no session exists yet (rare; modal creates one on add).
   *
   * Searches both:
   *   - WorkspaceContext.savedSessions (in-memory, includes the
   *     just-created one before next refetch)
   *   - sessionsList.items (canonical, from useChartSessions hook)
   * — and dedupes by id. The WorkspaceContext + SessionsBridge
   * keep these in sync but during a 1-2s window after a write
   * mutation, savedSessions has the newer data.
   */
  function findSessionForClient(clientId: string): ChartSession | null {
    // Build a combined list (savedSessions has the shape we need
    // for handleSwitchSession — use that). If a saved session has
    // a client_id matching, take it. Most-recent wins by updated_at
    // sort which the API already does.
    const apiSessions = sessionsList?.items ?? [];
    // Match savedSessions (which has no client_id field today)
    // against apiSessions by id; carry the client_id information
    // through that join.
    for (const api of apiSessions) {
      if (api.client_id !== clientId) continue;
      const local = savedSessions.find((s) => s.id === api.id);
      if (local) return local;
      // Fallback — convert api → ChartSession shape.
      // SessionsBridge does this conversion; here we do a minimal
      // version for the hand-off.
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
        analysisMessages:
          (api.analysis_messages as { q: string; a: string; isTopic?: boolean }[]) ?? [],
        activeTopic: (api.ui_state?.activeTopic as string) ?? "",
        selectedHouse: (api.ui_state?.selectedHouse as number | null) ?? null,
        chatQ: (api.ui_state?.chatQ as string) ?? "",
        analysisLang:
          (api.ui_state?.analysisLang as "english" | "telugu_english") ?? "english",
        activeTab: (api.ui_state?.activeTab as string) ?? "chart",
      };
    }
    return null;
  }

  function handleOpenClient(client: ClientPublic) {
    const session = findSessionForClient(client.id);
    if (!session) {
      // Edge case: client has no chart_session yet. Shouldn't happen
      // for clients created via the Add Client modal (which creates
      // one). Could happen if someone added clients via direct API.
      // For Slice 3 just show a console hint.
      // eslint-disable-next-line no-console
      console.warn("No chart session found for client", client.id);
      return;
    }
    void onOpenSession(session);
  }

  function handleClientCreated(clientId: string, _sessionId: string) {
    setModalOpen(false);
    // Open the newly-created client's workspace. Brief delay so the
    // sessions list refetch can pull in the new session before we
    // look it up.
    setTimeout(() => {
      const session = findSessionForClient(clientId);
      if (session) {
        void onOpenSession(session);
      } else {
        // Fallback: just force a router refresh to pick up new data
        router.refresh();
      }
    }, 300);
  }

  return (
    <CrmShell
      pageTitle="Home"
      pageActions={
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            padding: "8px 14px",
            background: "linear-gradient(180deg, #c9a96e 0%, #b8985d 100%)",
            color: "#09090f",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add client
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Today's panchang strip */}
        <TodayPanchangStrip />

        {/* Recent activity — placeholder for now */}
        <RecentActivityStub />

        {/* Clients roster (with cap on home — full list at /app/clients) */}
        <section>
          <h2
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: theme.text.muted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              margin: "0 0 12px",
            }}
          >
            Your clients
          </h2>
          <ClientsRoster
            onAddClient={() => setModalOpen(true)}
            onOpenClient={handleOpenClient}
            hideAddButton
            maxItems={10}
          />
        </section>
      </div>

      <AddClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleClientCreated}
      />
    </CrmShell>
  );
}

function RecentActivityStub() {
  return (
    <section>
      <h2
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: theme.text.muted,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          margin: "0 0 12px",
        }}
      >
        Recent activity
      </h2>
      <div
        style={{
          padding: 18,
          background: "rgba(7,11,20,0.4)",
          border: "1px dashed rgba(255,255,255,0.08)",
          borderRadius: 8,
          fontSize: 12,
          color: theme.text.muted,
          textAlign: "center",
        }}
      >
        Activity feed coming soon — client portal opens, follow-up requests,
        prediction-resolution reminders.
      </div>
    </section>
  );
}
