"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Edit,
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Star,
} from "lucide-react";
import { theme, styles } from "@/lib/theme";
import { useClient, useClientWorkspace } from "@/hooks/use-clients";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ChartTab } from "@/components/pro/chart-tab";
import { HousesTab } from "@/components/pro/houses-tab";
import { DashaTab } from "@/components/pro/dasha-tab";
import { AnalysisTab } from "@/components/pro/analysis-tab";
import { SessionsTab } from "@/components/pro/sessions-tab";
import { PredictionsTab } from "@/components/pro/predictions-tab";
import { NotesTab } from "@/components/pro/notes-tab";
import { EditClientDialog } from "@/components/pro/edit-client-dialog";
import { FollowupsTab } from "@/components/pro/followups-tab";

const TABS = [
  { key: "chart", label: "Chart" },
  { key: "houses", label: "Houses" },
  { key: "dasha", label: "Dasha" },
  { key: "analysis", label: "Analysis" },
  { key: "sessions", label: "Sessions" },
  { key: "predictions", label: "Predictions" },
  { key: "followups", label: "Follow-ups" },
  { key: "notes", label: "Notes" },
];

function useIsNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

export default function ClientWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState("chart");
  const { data: client, isLoading: clientLoading, isError } = useClient(id);
  const { data: ws, isLoading: wsLoading } = useClientWorkspace(id);
  const isNarrow = useIsNarrow();

  if (clientLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.text.muted,
        }}
      >
        <Loader2 size={16} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} />
        Loading client…
      </main>
    );
  }

  if (isError || !client) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "48px 32px",
          maxWidth: 500,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <AlertCircle size={32} color={theme.error} style={{ margin: "64px auto 12px" }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: theme.text.primary, marginBottom: 6 }}>
          Client not found
        </div>
        <div style={{ fontSize: 13, color: theme.text.muted, marginBottom: 16 }}>
          It may have been archived or removed.
        </div>
        <Link href="/pro/clients" style={styles.secondaryButton}>
          ← Back to clients
        </Link>
      </main>
    );
  }

  const birthDate = client.birth_dt_local_str.split("T")[0];
  const birthTime = client.birth_dt_local_str.split("T")[1]?.slice(0, 5) ?? "";

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Client header — compact, dense */}
      <header
        style={{
          padding: isNarrow ? "16px 16px" : "20px 32px",
          borderBottom: theme.border.default,
          backgroundColor: theme.bg.page,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 12,
            color: theme.text.muted,
            marginBottom: 12,
          }}
        >
          <Link
            href="/pro/clients"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: theme.text.muted,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={12} /> Clients
          </Link>
          <span style={{ color: theme.text.dim }}>/</span>
          <span style={{ color: theme.text.secondary }}>{client.full_name}</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                background: `linear-gradient(135deg, ${theme.gold}, ${theme.goldDim})`,
                color: "#07070d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {client.full_name[0].toUpperCase()}
            </div>
            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: theme.text.primary,
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                {client.full_name}
              </h1>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginTop: 4,
                  fontSize: 12,
                  color: theme.text.muted,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Calendar size={12} /> {birthDate} · {birthTime}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={12} /> {client.birth_place}
                </span>
                {client.phone && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Phone size={12} /> {client.phone}
                  </span>
                )}
                {client.email && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Mail size={12} /> {client.email}
                  </span>
                )}
              </div>
              {/* Lagna + moon + tags */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {ws?.cusps?.[0]?.sign_en && (
                  <Chip color={theme.gold}>
                    <Star size={10} /> {ws.cusps[0].sign_en} Lagna
                  </Chip>
                )}
                {ws?.planets?.find?.((p: any) => p.planet_en === "Moon")?.sign_en && (
                  <Chip>
                    Moon in {ws.planets.find((p: any) => p.planet_en === "Moon").sign_en}
                  </Chip>
                )}
                {(client.tags ?? []).map((t: string) => (
                  <Chip key={t} warning={t === "priority"}>
                    {t}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <EditClientDialog client={client} />
            <ExportPDFButton ws={ws} clientName={client.full_name} />
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div
        style={{
          padding: isNarrow ? "0 8px" : "0 32px",
          borderBottom: theme.border.default,
          backgroundColor: theme.bg.page,
          position: "sticky",
          top: 0,
          zIndex: 10,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ display: "flex", gap: 4, minWidth: "max-content" }}>
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  position: "relative",
                  padding: "12px 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: active ? theme.text.primary : theme.text.muted,
                }}
              >
                {t.label}
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: -1,
                      left: 14,
                      right: 14,
                      height: 2,
                      backgroundColor: theme.gold,
                      borderRadius: 1,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: isNarrow ? "16px" : "24px 32px", flex: 1 }}>
        {activeTab === "chart" &&
          (wsLoading ? <TabLoading /> : ws ? <ChartTab ws={ws} /> : <TabError />)}
        {activeTab === "houses" &&
          (wsLoading ? <TabLoading /> : ws ? <HousesTab ws={ws} /> : <TabError />)}
        {activeTab === "dasha" &&
          (wsLoading ? <TabLoading /> : ws ? <DashaTab ws={ws} /> : <TabError />)}
        {activeTab === "analysis" && (
          <AnalysisTab
            input={{
              name: client.full_name,
              date: birthDate,
              time: birthTime,
              latitude: client.birth_lat,
              longitude: client.birth_lon,
              timezone_offset: ws?.timezone_offset ?? 5.5,
            }}
          />
        )}
        {activeTab === "sessions" && <SessionsTab clientId={client.id} />}
        {activeTab === "predictions" && <PredictionsTab clientId={client.id} />}
        {activeTab === "followups" && <FollowupsTab clientId={client.id} />}
        {activeTab === "notes" && (
          <NotesTab clientId={client.id} initial={client.notes_private ?? null} />
        )}
      </div>
    </main>
  );
}

function TabLoading() {
  return (
    <div
      style={{
        padding: "48px 0",
        textAlign: "center",
        color: theme.text.muted,
      }}
    >
      <Loader2 size={18} style={{ marginRight: 8, animation: "spin 1s linear infinite", display: "inline" }} />
      Computing chart…
    </div>
  );
}

function TabError() {
  return (
    <div
      style={{
        padding: "48px 0",
        textAlign: "center",
        color: theme.text.muted,
      }}
    >
      <AlertCircle size={20} color={theme.error} style={{ marginBottom: 8 }} />
      <div>Could not compute chart. Check backend.</div>
    </div>
  );
}

function Chip({
  children,
  color,
  warning,
}: {
  children: React.ReactNode;
  color?: string;
  warning?: boolean;
}) {
  const fg = color ?? (warning ? theme.warning : theme.text.muted);
  const bg = warning
    ? "rgba(251,191,36,0.1)"
    : color
    ? "rgba(201,169,110,0.12)"
    : "rgba(255,255,255,0.04)";
  const border = warning
    ? "1px solid rgba(251,191,36,0.25)"
    : color
    ? theme.border.accent
    : theme.border.default;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 4,
        backgroundColor: bg,
        color: fg,
        border,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}

function ExportPDFButton({ ws, clientName }: { ws: any; clientName: string }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!ws) {
      toast.error("Wait for chart to compute");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/pdf/export", ws, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientName.replace(/\s+/g, "_")}_KP_Report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch {
      toast.error("PDF export failed");
    }
    setLoading(false);
  };
  return (
    <button
      onClick={handle}
      disabled={loading}
      style={{ ...styles.secondaryButton, opacity: loading ? 0.6 : 1 }}
    >
      {loading ? (
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
      ) : (
        <Download size={14} />
      )}
      Export PDF
    </button>
  );
}
