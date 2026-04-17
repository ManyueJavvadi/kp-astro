"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { Target, Calendar, MapPin, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { theme, styles } from "@/lib/theme";
import { ContentCard, SectionLabel, SectionHeading } from "@/components/ui/content-card";
import { api } from "@/lib/api";
import { toast } from "sonner";

const EVENTS = [
  { key: "marriage", label: "Marriage" },
  { key: "business", label: "Business" },
  { key: "house_warming", label: "House warming" },
  { key: "travel", label: "Travel" },
  { key: "education", label: "Education" },
];

export default function MuhurthaPage() {
  const [eventType, setEventType] = useState("marriage");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [lat, setLat] = useState(17.385);
  const [lon, setLon] = useState(78.4867);
  const [place, setPlace] = useState("Hyderabad, India");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const run = async () => {
    if (!dateStart || !dateEnd) {
      toast.error("Pick a date range");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/muhurtha/find", {
        event_type: eventType,
        date_start: dateStart,
        date_end: dateEnd,
        latitude: lat,
        longitude: lon,
        timezone_offset: 5.5,
        participants: [],
      });
      setResult(res.data);
    } catch {
      toast.error("Muhurtha search failed");
    }
    setLoading(false);
  };

  const windows: any[] = result?.windows ?? [];

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
        <div style={styles.sectionLabel}>Auspicious Timing</div>
        <h1 style={styles.pageTitle}>Muhurtha finder</h1>
        <p style={{ fontSize: 13, color: theme.text.muted, margin: "4px 0 0", maxWidth: 600 }}>
          Scans every 4 minutes of your date range. Scores each Lagna Sub-Lord
          against event-specific house requirements, plus Badhaka + Moon SL + Panchang.
        </p>
      </header>

      <ContentCard>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={styles.sectionLabel}>Event type</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {EVENTS.map((t) => {
                const active = eventType === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setEventType(t.key)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 500,
                      border: active ? theme.border.accent : theme.border.default,
                      backgroundColor: active ? "rgba(201,169,110,0.1)" : theme.bg.content,
                      color: active ? theme.gold : theme.text.secondary,
                      cursor: "pointer",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12 }}>
            <div>
              <div style={styles.sectionLabel}>From</div>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                style={styles.input}
              />
            </div>
            <div>
              <div style={styles.sectionLabel}>To</div>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                style={styles.input}
              />
            </div>
            <div>
              <div style={styles.sectionLabel}>Event location</div>
              <div style={{ position: "relative" }}>
                <MapPin size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: theme.text.muted }} />
                <input
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  style={{ ...styles.input, paddingLeft: 32 }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={styles.sectionLabel}>Latitude</div>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
                style={styles.input}
              />
            </div>
            <div>
              <div style={styles.sectionLabel}>Longitude</div>
              <input
                type="number"
                step="0.0001"
                value={lon}
                onChange={(e) => setLon(parseFloat(e.target.value))}
                style={styles.input}
              />
            </div>
          </div>

          <button
            onClick={run}
            disabled={loading}
            style={{
              ...styles.primaryButton,
              height: 40,
              alignSelf: "flex-start",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Target size={14} />}
            Find auspicious windows
          </button>
        </div>
      </ContentCard>

      {/* Results */}
      {result && windows.length === 0 && (
        <ContentCard>
          <div style={{ textAlign: "center", padding: 24, fontSize: 13, color: theme.text.muted }}>
            No strong muhurtha windows in that range. Try a longer range or a
            different event type.
          </div>
        </ContentCard>
      )}

      {result?.nearby_better && (
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            backgroundColor: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.3)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.warning, marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Better window nearby
          </div>
          <div style={{ fontSize: 13, color: theme.text.primary }}>
            {result.nearby_better.date_display} · Score {result.nearby_better.score}{" "}
            <span style={{ color: theme.warning }}>({result.nearby_better.quality})</span>
          </div>
        </div>
      )}

      {windows.length > 0 && (
        <div>
          <SectionLabel>
            {windows.length} WINDOW{windows.length !== 1 ? "S" : ""} · RANKED BY SCORE
          </SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {windows.map((w: any, i: number) => {
              const isExp = expanded === i;
              const qColor =
                w.quality === "Excellent" ? theme.gold : w.quality === "Good" ? theme.success : theme.text.muted;
              return (
                <ContentCard key={i} padding="none">
                  <button
                    onClick={() => setExpanded(isExp ? null : i)}
                    style={{
                      width: "100%",
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: theme.text.primary,
                      textAlign: "left",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 2 }}>{w.date_display}</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: qColor, lineHeight: 1.2 }}>
                        {w.start_time} – {w.end_time}
                      </div>
                      <div style={{ fontSize: 11, color: theme.text.muted, marginTop: 4 }}>
                        Lagna: <span style={{ color: theme.text.primary }}>{w.lagna}</span> ·
                        SL: <span style={{ color: theme.gold }}> {w.lagna_sublord}</span> ·
                        Houses: {w.signified_houses?.join(", ")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: qColor, lineHeight: 1 }}>
                        {w.score}
                      </div>
                      <div style={{ fontSize: 10, color: theme.text.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {w.quality}
                      </div>
                    </div>
                  </button>
                  {isExp && (
                    <div
                      style={{
                        padding: "16px 20px",
                        borderTop: theme.border.default,
                        backgroundColor: theme.bg.page,
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: 10,
                      }}
                    >
                      <KV label="Moon sign" value={w.moon_sign} />
                      <KV label="Moon nakshatra" value={w.moon_nakshatra} />
                      <KV label="Event cusp CSL" value={w.event_cusp_csl} />
                      <KV label="H11 CSL" value={w.h11_csl} />
                      <KV
                        label="Badhaka"
                        value={w.badhaka_check?.passed ? "PASS" : "FAIL"}
                        icon={
                          w.badhaka_check?.passed ? (
                            <CheckCircle2 size={12} color={theme.success} />
                          ) : (
                            <XCircle size={12} color={theme.error} />
                          )
                        }
                      />
                      <KV
                        label="Moon SL favorable"
                        value={w.moon_sl_favorable ? "Yes" : "No"}
                        icon={
                          w.moon_sl_favorable ? (
                            <CheckCircle2 size={12} color={theme.success} />
                          ) : (
                            <XCircle size={12} color={theme.error} />
                          )
                        }
                      />
                      <KV label="Tithi" value={w.panchang?.tithi} />
                      <KV label="Yoga" value={w.panchang?.yoga} />
                    </div>
                  )}
                </ContentCard>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}

function KV({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 10px",
        backgroundColor: theme.bg.content,
        borderRadius: 6,
        fontSize: 12,
      }}
    >
      <span style={{ color: theme.text.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>
        {label}
      </span>
      <span style={{ color: theme.text.primary, display: "flex", alignItems: "center", gap: 4 }}>
        {icon}
        {value ?? "—"}
      </span>
    </div>
  );
}
