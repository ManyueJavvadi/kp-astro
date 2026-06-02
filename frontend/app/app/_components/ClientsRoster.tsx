"use client";

/**
 * ClientsRoster — searchable list of the astrologer's clients.
 *
 * Phase 2 Slice 3 (2026-06-02). Renders on the CRM home + on a
 * dedicated /app/clients page. Reads from useClients() TanStack hook.
 *
 * Each row clickable — for Slice 3, clicking opens the matching
 * chart_session (if one exists) via handleSwitchSession on the legacy
 * workspace. Slice 4 replaces with /app/clients/[id] route navigation.
 *
 * Search is purely client-side over loaded data (substring match on
 * name, phone, email). For large rosters (>500 clients) we'd add
 * server-side search. Not v1 concern.
 */

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronRight, Plus, MapPin, Calendar, Link2 } from "lucide-react";
import { useClients, type ClientPublic } from "@/lib/api/hooks";
import { theme } from "@/lib/theme";

interface ClientsRosterProps {
  /** Callback when "+ Add client" is clicked (opens the modal). */
  onAddClient: () => void;
  /** Callback when a client row is clicked. Receives the client. */
  onOpenClient: (client: ClientPublic) => void;
  /** If true, hide the "+ Add client" button (e.g., when this roster
   *  is embedded on a page that has its own header CTA). */
  hideAddButton?: boolean;
  /** Optional maxItems — for the CRM home we might cap at 10 and show
   *  "View all" link. */
  maxItems?: number;
}

export function ClientsRoster({
  onAddClient,
  onOpenClient,
  hideAddButton = false,
  maxItems,
}: ClientsRosterProps) {
  const { data, isLoading, isError } = useClients();
  const [search, setSearch] = useState("");

  const allClients = data?.items ?? [];
  const filtered = allClients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.birth_place_name || "").toLowerCase().includes(q)
    );
  });
  const visible = maxItems ? filtered.slice(0, maxItems) : filtered;

  return (
    <div>
      {/* Search bar + add button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "rgba(7,11,20,0.6)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
          }}
        >
          <Search size={14} style={{ color: theme.text.muted, flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search clients by name, phone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: theme.text.primary,
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
        </div>

        {!hideAddButton && (
          <button
            type="button"
            onClick={onAddClient}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "linear-gradient(180deg, #c9a96e 0%, #b8985d 100%)",
              border: "none",
              borderRadius: 8,
              color: "#09090f",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={14} />
            Add client
          </button>
        )}
      </div>

      {/* List body */}
      {isLoading && (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            fontSize: 12,
            color: theme.text.muted,
          }}
        >
          Loading clients…
        </div>
      )}

      {isError && (
        <div
          style={{
            padding: 16,
            border: "1px solid rgba(248,113,113,0.3)",
            background: "rgba(248,113,113,0.06)",
            borderRadius: 8,
            color: "#f87171",
            fontSize: 13,
          }}
        >
          Couldn&apos;t load your clients. Check your connection and
          refresh.
        </div>
      )}

      {!isLoading && !isError && allClients.length === 0 && (
        <EmptyState onAddClient={onAddClient} />
      )}

      {!isLoading && allClients.length > 0 && filtered.length === 0 && (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            fontSize: 13,
            color: theme.text.muted,
          }}
        >
          No clients match "<strong>{search}</strong>".
        </div>
      )}

      {visible.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            overflow: "hidden",
            background: "rgba(7,11,20,0.4)",
          }}
        >
          {visible.map((c) => (
            <ClientRow key={c.id} client={c} onClick={() => onOpenClient(c)} />
          ))}
        </ul>
      )}

      {maxItems && filtered.length > maxItems && (
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: theme.text.muted,
            textAlign: "center",
          }}
        >
          Showing {maxItems} of {filtered.length}.{" "}
          {/* Slice 3: /app/clients page is a placeholder for now */}
          <a
            href="/app/clients"
            style={{ color: "#c9a96e", textDecoration: "none" }}
          >
            View all →
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────

function ClientRow({
  client,
  onClick,
}: {
  client: ClientPublic;
  onClick: () => void;
}) {
  // Format birth date for display: "09/09/2000" → "Sep 9, 2000"
  // Server stores DD/MM/YYYY (legacy frontend) OR YYYY-MM-DD.
  // Handle both gracefully.
  function formatBirthDate(s: string | null): string {
    if (!s) return "";
    let d: Date | null = null;
    if (s.includes("-")) {
      d = new Date(s);
    } else if (s.includes("/")) {
      const [dd, mm, yyyy] = s.split("/");
      if (yyyy && mm && dd) d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }
    if (!d || isNaN(d.getTime())) return s;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function timeAgo(iso: string | null): string {
    if (!iso) return "—";
    const then = new Date(iso).getTime();
    const now = Date.now();
    const days = Math.floor((now - then) / 86_400_000);
    if (days < 1) return "today";
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return "1 month ago";
    if (months < 12) return `${months} months ago`;
    const years = Math.floor(months / 12);
    return years === 1 ? "1 year ago" : `${years} years ago`;
  }

  return (
    <li
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        cursor: "pointer",
        transition: "background 120ms",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "rgba(255,255,255,0.02)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: theme.text.primary,
            marginBottom: 2,
          }}
        >
          {client.name}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 11,
            color: theme.text.muted,
            flexWrap: "wrap",
          }}
        >
          {client.birth_date && <span>{formatBirthDate(client.birth_date)}</span>}
          {client.birth_place_name && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <MapPin size={10} />
              {client.birth_place_name}
            </span>
          )}
          {client.gender && (
            <span style={{ opacity: 0.6 }}>
              {client.gender === "male" ? "♂ Male" : client.gender === "female" ? "♀ Female" : client.gender}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 11,
          color: theme.text.muted,
        }}
      >
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Calendar size={10} />
            Last: {timeAgo(client.last_session_at)}
          </div>
          {client.chart_session_count > 0 && (
            <div style={{ marginTop: 2, opacity: 0.7 }}>
              {client.chart_session_count} chart{client.chart_session_count === 1 ? "" : "s"}
            </div>
          )}
          {client.note_count > 0 && (
            <div style={{ marginTop: 2, opacity: 0.7 }}>
              {client.note_count} note{client.note_count === 1 ? "" : "s"}
            </div>
          )}
        </div>
        {/* Portal admin link — Phase 3 Slice 4. stopPropagation so the
            row click doesn't ALSO fire (opening the workspace). */}
        <Link
          href={`/app/clients/${client.id}/portal`}
          onClick={(e) => e.stopPropagation()}
          title="Open portal admin (compose notes + share URL with client)"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.06)",
            color: theme.text.muted,
            transition: "all 120ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#c9a96e";
            e.currentTarget.style.borderColor = "rgba(201,169,110,0.3)";
            e.currentTarget.style.background = "rgba(201,169,110,0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = theme.text.muted;
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Link2 size={12} />
        </Link>
        <ChevronRight size={14} style={{ flexShrink: 0 }} />
      </div>
    </li>
  );
}

function EmptyState({ onAddClient }: { onAddClient: () => void }) {
  return (
    <div
      style={{
        padding: 60,
        textAlign: "center",
        border: "1px dashed rgba(255,255,255,0.1)",
        borderRadius: 10,
        background: "rgba(7,11,20,0.3)",
      }}
    >
      <div
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 20,
          color: theme.text.primary,
          marginBottom: 8,
        }}
      >
        Welcome to your CRM
      </div>
      <p
        style={{
          fontSize: 13,
          color: theme.text.muted,
          maxWidth: 420,
          margin: "0 auto 20px",
          lineHeight: 1.55,
        }}
      >
        Start by adding your first client. Their birth chart, your notes,
        and a private portal URL for them — all in one place.
      </p>
      <button
        type="button"
        onClick={onAddClient}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 18px",
          background: "linear-gradient(180deg, #c9a96e 0%, #b8985d 100%)",
          border: "none",
          borderRadius: 8,
          color: "#09090f",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <Plus size={14} />
        Add your first client
      </button>
    </div>
  );
}
