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
import { useIsMobile } from "@/hooks/useIsMobile";
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
  const isMobile = useIsMobile();

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

        {/* Desktop: inline pill. Mobile: hidden — the floating gold
            FAB in CrmShell handles the same action without crowding
            the search bar. */}
        {!hideAddButton && !isMobile && (
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
  const isMobile = useIsMobile();

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

  const genderGlyph =
    client.gender === "male" ? "♂" : client.gender === "female" ? "♀" : "◈";
  const birthDate = client.birth_date ? formatBirthDate(client.birth_date) : "";
  const lastSeen = timeAgo(client.last_session_at);

  // ─── Mobile card layout ─────────────────────────────────────────
  // Vertical stack with clear hierarchy + 44px+ tap targets per
  // CLAUDE.md mobile rules. No fighting for horizontal space —
  // every row gets its own line so nothing overlaps.
  if (isMobile) {
    return (
      <li
        style={{
          padding: 0,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClick}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            width: "100%",
            padding: "14px 56px 14px 16px", // right pad for the Link2 corner
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            color: "inherit",
            fontFamily: "inherit",
            gap: 6,
          }}
        >
          {/* Name + gender glyph + chevron */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 15,
              fontWeight: 600,
              color: theme.text.primary,
              lineHeight: 1.25,
            }}
          >
            <span
              aria-hidden
              style={{
                fontSize: 13,
                color:
                  client.gender === "male"
                    ? "#60a5fa"
                    : client.gender === "female"
                    ? "#f472b6"
                    : theme.text.muted,
              }}
            >
              {genderGlyph}
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {client.name}
            </span>
            <ChevronRight
              size={14}
              style={{ color: theme.text.muted, flexShrink: 0 }}
            />
          </div>

          {/* Birth date row */}
          {birthDate && (
            <div
              style={{
                fontSize: 12,
                color: theme.text.muted,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                lineHeight: 1.3,
              }}
            >
              <Calendar size={11} style={{ flexShrink: 0 }} />
              <span>{birthDate}</span>
            </div>
          )}

          {/* Place row */}
          {client.birth_place_name && (
            <div
              style={{
                fontSize: 12,
                color: theme.text.muted,
                display: "flex",
                alignItems: "flex-start",
                gap: 5,
                lineHeight: 1.35,
              }}
            >
              <MapPin size={11} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                {client.birth_place_name}
              </span>
            </div>
          )}

          {/* Stats chips row — last seen + charts + notes */}
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            <StatChip>Last: {lastSeen}</StatChip>
            {client.chart_session_count > 0 && (
              <StatChip>
                {client.chart_session_count} chart
                {client.chart_session_count === 1 ? "" : "s"}
              </StatChip>
            )}
            {client.note_count > 0 && (
              <StatChip>
                {client.note_count} note{client.note_count === 1 ? "" : "s"}
              </StatChip>
            )}
          </div>
        </button>

        {/* Portal admin link — absolute-positioned in the top-right
            corner so it doesn't compete with the name row for
            horizontal space. 44px touch target. */}
        <Link
          href={`/app/clients/${client.id}/portal`}
          onClick={(e) => e.stopPropagation()}
          title="Open portal admin"
          aria-label={`Open ${client.name}'s portal admin`}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "1px solid rgba(201,169,110,0.25)",
            background: "rgba(201,169,110,0.06)",
            color: "#c9a96e",
          }}
        >
          <Link2 size={14} />
        </Link>
      </li>
    );
  }

  // ─── Desktop row layout ─────────────────────────────────────────
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
          {birthDate && <span>{birthDate}</span>}
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
            Last: {lastSeen}
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

/** Tiny pill used in the mobile client card stats row. Visually
 *  separates last-seen / chart-count / note-count so they never
 *  collide the way they did pre-redesign. */
function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 999,
        fontSize: 10.5,
        color: theme.text.muted,
        whiteSpace: "nowrap",
        lineHeight: 1.3,
      }}
    >
      {children}
    </span>
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
