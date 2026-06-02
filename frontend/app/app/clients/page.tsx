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
import { CrmShell } from "../_components/CrmShell";
import { ClientsRoster } from "../_components/ClientsRoster";
import { AddClientModal } from "../_components/AddClientModal";
import type { ClientPublic } from "@/lib/api/hooks";

export default function ClientsPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  function handleOpenClient(_client: ClientPublic) {
    // Slice 3: route back to /app where CrmHome handles the workspace
    // load via WorkspaceContext + onOpenSession. Real per-client route
    // lands in Slice 4 (/app/clients/[id]).
    // Storing the client id in sessionStorage so /app can pick it up
    // and auto-open it on mount.
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "devastroai:open-client-id",
        _client.id,
      );
    }
    router.push("/app");
  }

  function handleClientCreated(_clientId: string) {
    setModalOpen(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "devastroai:open-client-id",
        _clientId,
      );
    }
    router.push("/app");
  }

  return (
    <CrmShell pageTitle="Clients">
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
