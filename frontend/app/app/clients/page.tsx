"use client";

/**
 * /app/clients — full clients list view.
 *
 * Phase 2 Slice 3 (2026-06-02). Stub-ish in this slice — the CRM
 * home (/app) already shows the clients roster (capped at 10).
 * This page just shows ALL of them, same component reused, no cap.
 *
 * Phase 2 Slice 4 will introduce /app/clients/[id] routes; from
 * this page, clicking a client will navigate there. For Slice 3,
 * clicking a client uses the same hand-off-to-workspace pattern
 * as the home page (via window-level event or shared context).
 *
 * KEEP IT SIMPLE: in Slice 3 this page just renders the roster.
 * The actual click handling redirects to /app for the workspace
 * load (a 2026-06-02-Slice-3 limitation; cleaner in Slice 4).
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { CrmShell } from "../_components/CrmShell";
import { ClientsRoster } from "../_components/ClientsRoster";
import { AddClientModal } from "../_components/AddClientModal";
import type { ClientPublic } from "@/lib/api/hooks";

export default function ClientsPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  function handleOpenClient(client: ClientPublic) {
    // Slice 4 — proper per-client URL. /app/clients/[id] handles
    // loading the chart_session + rendering the workspace.
    router.push(`/app/clients/${client.id}`);
  }

  function handleClientCreated(clientId: string) {
    setModalOpen(false);
    router.push(`/app/clients/${clientId}`);
  }

  return (
    <CrmShell
      pageTitle="Clients"
      mobilePrimaryAction={{
        label: "Add client",
        icon: <UserPlus size={22} />,
        onClick: () => setModalOpen(true),
      }}
    >
      <ClientsRoster
        onAddClient={() => setModalOpen(true)}
        onOpenClient={handleOpenClient}
      />
      <AddClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleClientCreated}
      />
    </CrmShell>
  );
}
