"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { TrendingUp, Loader2, Users } from "lucide-react";
import { theme, styles } from "@/lib/theme";
import { ContentCard, SectionLabel, SectionHeading } from "@/components/ui/content-card";
import { useClientsList } from "@/hooks/use-clients";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function TransitPage() {
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { data: clients } = useClientsList();

  const run = async () => {
    if (!clientId) {
      toast.error("Pick a client first");
      return;
    }
    setLoading(true);
    try {
      const ws = await api.get(`/clients/${clientId}/workspace`);
      const res = await api.post("/transit/analyze", {
        natal: ws.data,
        transit_date: date,
      });
      setResult(res.data);
    } catch {
      toast.error("Transit analysis failed");
    }
    setLoading(false);
  };

  const opts = clients?.items ?? [];

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
      <header>
        <div style={styles.sectionLabel}>Gochar · Current Sky</div>
        <h1 style={styles.pageTitle}>Transit analysis</h1>
        <p style={{ fontSize: 13, color: theme.text.muted, margin: "4px 0 0", maxWidth: 600 }}>
          Ranks current-sky planet transits against a natal chart by dasha/bhukti
          relevance. Flags Sade Sati phases.
        </p>
      </header>

      <ContentCard>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: 12, alignItems: "end" }}>
          <div>
            <div style={styles.sectionLabel}>Client</div>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={styles.input}>
              <option value="">— pick client —</option>
              {opts.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={styles.sectionLabel}>Transit date</div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={styles.input}
            />
          </div>
          <button
            onClick={run}
            disabled={loading}
            style={{
              ...styles.primaryButton,
              height: 36,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <TrendingUp size={14} />}
            Analyze
          </button>
        </div>
      </ContentCard>

      {!clientId && !result && opts.length > 0 && (
        <ContentCard>
          <div style={{ textAlign: "center", padding: 24 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                backgroundColor: "rgba(201,169,110,0.1)",
                color: theme.gold,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Users size={20} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 6 }}>
              Pick a client to begin
            </div>
            <div style={{ fontSize: 13, color: theme.text.muted, maxWidth: 440, margin: "0 auto" }}>
              Transit analysis requires a natal chart. Select any client above.
            </div>
          </div>
        </ContentCard>
      )}

      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 0",
            color: theme.text.muted,
          }}
        >
          <Loader2 size={18} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} />
          Analyzing transits…
        </div>
      )}

      {result && (
        <ContentCard>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <SectionHeading>Transit result · {date}</SectionHeading>
            {result.sade_sati_active && (
              <span
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 999,
                  backgroundColor: "rgba(251,191,36,0.12)",
                  color: theme.warning,
                  fontWeight: 500,
                }}
              >
                Sade Sati active
              </span>
            )}
          </div>
          <div
            style={{
              padding: 12,
              backgroundColor: theme.bg.page,
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "monospace",
              color: theme.text.secondary,
              whiteSpace: "pre-wrap",
              maxHeight: 600,
              overflow: "auto",
              lineHeight: 1.5,
            }}
          >
            {JSON.stringify(result, null, 2)}
          </div>
        </ContentCard>
      )}
    </main>
  );
}
