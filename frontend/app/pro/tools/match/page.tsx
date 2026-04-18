"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { HeartHandshake, Loader2, Users } from "lucide-react";
import { theme, styles } from "@/lib/theme";
import { ContentCard, SectionLabel, SectionHeading } from "@/components/ui/content-card";
import { useClientsList } from "@/hooks/use-clients";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function MatchPage() {
  const [id1, setId1] = useState("");
  const [id2, setId2] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { data: clients } = useClientsList();

  const run = async () => {
    if (!id1 || !id2) {
      toast.error("Pick both clients");
      return;
    }
    if (id1 === id2) {
      toast.error("Pick two different clients");
      return;
    }
    setLoading(true);
    try {
      const c1 = (await api.get<any>(`/clients/${id1}`)).data;
      const c2 = (await api.get<any>(`/clients/${id2}`)).data;
      const person1 = {
        name: c1.full_name,
        date: c1.birth_dt_local_str.split("T")[0],
        time: c1.birth_dt_local_str.split("T")[1].slice(0, 5),
        latitude: c1.birth_lat,
        longitude: c1.birth_lon,
        timezone_offset: 5.5,
        gender: c1.gender,
      };
      const person2 = {
        name: c2.full_name,
        date: c2.birth_dt_local_str.split("T")[0],
        time: c2.birth_dt_local_str.split("T")[1].slice(0, 5),
        latitude: c2.birth_lat,
        longitude: c2.birth_lon,
        timezone_offset: 5.5,
        gender: c2.gender,
      };
      const res = await api.post("/compatibility/match", { person1, person2 });
      setResult(res.data);
    } catch {
      toast.error("Match failed");
    }
    setLoading(false);
  };

  const opts = clients?.items ?? [];
  const ashta = result?.ashtakoota;

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
        <div style={styles.sectionLabel}>KP + Ashtakoota Compatibility</div>
        <h1 style={styles.pageTitle}>Kundli match</h1>
      </header>

      <ContentCard>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={styles.sectionLabel}>Person 1</div>
            <select
              value={id1}
              onChange={(e) => setId1(e.target.value)}
              style={styles.input}
            >
              <option value="">— pick client —</option>
              {opts.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={styles.sectionLabel}>Person 2</div>
            <select
              value={id2}
              onChange={(e) => setId2(e.target.value)}
              style={styles.input}
            >
              <option value="">— pick client —</option>
              {opts.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          style={{
            ...styles.primaryButton,
            height: 40,
            marginTop: 16,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <HeartHandshake size={14} />}
          Compute compatibility
        </button>
      </ContentCard>

      {opts.length < 2 && !result && (
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
              Need at least 2 clients
            </div>
            <div style={{ fontSize: 13, color: theme.text.muted, maxWidth: 380, margin: "0 auto" }}>
              Add both partners as clients on the Clients page, then return here.
            </div>
          </div>
        </ContentCard>
      )}

      {result && (
        <>
          <div
            style={{
              background: `linear-gradient(135deg, rgba(201,169,110,0.08), transparent)`,
              border: `1px solid ${theme.gold}40`,
              borderRadius: 10,
              padding: 28,
              textAlign: "center",
            }}
          >
            <SectionLabel>Overall verdict</SectionLabel>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: theme.text.primary,
                marginTop: 8,
                marginBottom: 16,
                letterSpacing: "-0.01em",
              }}
            >
              {result.overall_verdict}
            </div>
            <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {ashta && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    padding: "6px 14px",
                    borderRadius: 999,
                    backgroundColor: "rgba(201,169,110,0.15)",
                    color: theme.gold,
                    fontWeight: 500,
                  }}
                >
                  {ashta.total_score}/{ashta.max_score} Gunas · {ashta.percentage}%
                </span>
              )}
              {result.kuja_dosha?.mutual_cancellation && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    padding: "6px 14px",
                    borderRadius: 999,
                    backgroundColor: "rgba(52,211,153,0.15)",
                    color: theme.success,
                    fontWeight: 500,
                  }}
                >
                  Mangal Dosha cancelled
                </span>
              )}
            </div>
          </div>

          <ContentCard>
            <SectionHeading>Full analysis</SectionHeading>
            <div
              style={{
                marginTop: 12,
                padding: 12,
                backgroundColor: theme.bg.page,
                borderRadius: 6,
                fontSize: 11,
                fontFamily: "monospace",
                color: theme.text.secondary,
                whiteSpace: "pre-wrap",
                maxHeight: 500,
                overflow: "auto",
                lineHeight: 1.5,
              }}
            >
              {JSON.stringify(result, null, 2)}
            </div>
          </ContentCard>
        </>
      )}
    </main>
  );
}
