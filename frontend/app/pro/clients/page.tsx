"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Loader2,
  Users,
  ChevronRight,
} from "lucide-react";
import { theme, styles } from "@/lib/theme";
import { NewClientDialog } from "@/components/pro/new-client-dialog";
import { useClientsList, type ClientRow } from "@/hooks/use-clients";

const TAGS = ["all", "career", "marriage", "health", "priority", "foreign", "family"];

export default function ClientsListPage() {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const { data, isLoading } = useClientsList({
    q: query || undefined,
    tag: activeTag === "all" ? undefined : activeTag,
  });

  return (
    <main
      style={{
        padding: "24px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        minHeight: "100vh",
      }}
    >
      {/* Page header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={styles.sectionLabel}>Clients</div>
          <h1 style={styles.pageTitle}>
            Your directory
            <span style={{ color: theme.text.muted, fontWeight: 400, marginLeft: 8 }}>
              ({data?.total ?? 0})
            </span>
          </h1>
          <p style={{ fontSize: 13, color: theme.text.muted, margin: "4px 0 0" }}>
            Everyone you've added. Search by name, phone, email, or place.
          </p>
        </div>
        <NewClientDialog />
      </header>

      {/* Search + tags */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ position: "relative" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: theme.text.muted,
            }}
          />
          <input
            placeholder="Search clients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              ...styles.input,
              height: 40,
              paddingLeft: 36,
              backgroundColor: theme.bg.content,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TAGS.map((t) => {
            const active = activeTag === t;
            return (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  border: active ? theme.border.accent : theme.border.default,
                  backgroundColor: active ? "rgba(201,169,110,0.1)" : theme.bg.content,
                  color: active ? theme.gold : theme.text.secondary,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "48px 0", color: theme.text.muted }}>
          <Loader2 size={18} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} />
          Loading…
        </div>
      )}

      {!isLoading && (data?.items ?? []).length === 0 && <EmptyState query={query} tag={activeTag} />}

      {!isLoading && (data?.items ?? []).length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {data!.items.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </div>
      )}
    </main>
  );
}

function ClientCard({ client: c }: { client: ClientRow }) {
  return (
    <Link
      href={`/pro/clients/${c.id}`}
      style={{
        backgroundColor: theme.bg.content,
        border: theme.border.default,
        borderRadius: theme.radius.md,
        padding: 16,
        textDecoration: "none",
        color: theme.text.primary,
        display: "flex",
        alignItems: "center",
        gap: 12,
        transition: "border-color 150ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${theme.gold}, ${theme.goldDim})`,
          color: "#07070d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {c.full_name[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.text.primary, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {c.full_name}
        </div>
        <div style={{ fontSize: 11, color: theme.text.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {c.birth_place}
        </div>
        {c.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
            {c.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 3,
                  backgroundColor: t === "priority" ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)",
                  color: t === "priority" ? theme.warning : theme.text.muted,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <ChevronRight size={14} color={theme.text.dim} />
    </Link>
  );
}

function EmptyState({ query, tag }: { query: string; tag: string }) {
  const filtered = query || tag !== "all";
  return (
    <div
      style={{
        backgroundColor: theme.bg.content,
        border: theme.border.default,
        borderRadius: theme.radius.md,
        padding: "48px 32px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          backgroundColor: "rgba(201,169,110,0.1)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.gold,
          marginBottom: 16,
        }}
      >
        <Users size={22} />
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: theme.text.primary, margin: "0 0 8px" }}>
        {filtered ? "No matches" : "Your client directory is empty"}
      </h2>
      <p style={{ fontSize: 13, color: theme.text.muted, maxWidth: 440, margin: "0 auto 20px", lineHeight: 1.5 }}>
        {filtered
          ? "Try a different search or clear the tag filter."
          : "Add your first client to start tracking consultations, predictions, and follow-ups. All data stays private."}
      </p>
      {!filtered && <NewClientDialog />}
    </div>
  );
}
