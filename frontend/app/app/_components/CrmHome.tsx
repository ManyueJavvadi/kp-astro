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

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { type ClientPublic } from "@/lib/api/hooks";
import { CrmShell } from "./CrmShell";
import { TodayPanchangStrip } from "./TodayPanchangStrip";
import { ClientsRoster } from "./ClientsRoster";
import { AddClientModal } from "./AddClientModal";
import { useWorkspace } from "../_lib/workspace-context";
import { useIsMobile } from "@/hooks/useIsMobile";
import { theme } from "@/lib/theme";

/**
 * CrmHome takes NO props — it's a self-contained CRM landing.
 *
 * Phase 2 Slice 4 (2026-06-02): Refactored to route directly to
 * /app/clients/[id] instead of calling an onOpenSession callback.
 * This gives proper deep-linkable URLs and lets browser back work
 * naturally between CRM home and per-client workspaces.
 *
 * On mount, CrmHome ALSO resets workspace state — so navigating
 * BACK to /app from /app/clients/[id]/* clears the last-opened
 * client and shows the CRM home (instead of stale workspace state).
 */
export function CrmHome() {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();
  const {
    setSetupDone,
    setWorkspaceData,
    setBirthDetails,
    setCurrentSessionId,
  } = useWorkspace();

  // Slice 4 — reset workspace state on mount. When the user
  // navigates from /app/clients/[id]/* back to /app (the home),
  // CrmHome remounts. Clearing workspaceData + setupDone here means
  // they see the CRM roster, not the stale workspace of the last
  // client. Idempotent — safe to fire on every mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
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
    // Deps intentionally empty — fire exactly once per mount, not
    // every time setters change (they're stable but useEffect dep
    // arrays don't know that without manual annotation).
  }, []);

  function handleOpenClient(client: ClientPublic) {
    // Slice 4 — navigate to the per-client URL. /app/clients/[id]
    // loads the chart_session + pushes context + renders the
    // workspace inline. Browser back returns here.
    router.push(`/app/clients/${client.id}`);
  }

  function handleClientCreated(clientId: string, _sessionId: string) {
    setModalOpen(false);
    // Navigate to the new client's workspace URL.
    router.push(`/app/clients/${clientId}`);
  }

  return (
    <CrmShell
      pageTitle="Home"
      // Desktop: inline "+ Add client" pill in the header.
      // Mobile: hide that (would collide with the serif title) and
      // expose the same action as a gold breathing FAB instead.
      pageActions={
        isMobile ? null : (
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
        )
      }
      mobilePrimaryAction={{
        label: "Add client",
        icon: <UserPlus size={22} />,
        onClick: () => setModalOpen(true),
      }}
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
