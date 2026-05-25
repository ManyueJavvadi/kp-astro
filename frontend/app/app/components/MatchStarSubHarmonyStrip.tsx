"use client";
/**
 * MatchStarSubHarmonyStrip — PR M4
 *
 * Renders the Star ↔ Sub layered reading for both partners' H7 CSL
 * side-by-side. KSK strict (RULE 16): KP is NOT a flat UNION — it's a
 * TENSION between the STAR layer (declares nature of matter) and the
 * SUB layer (decides whether it fructifies).
 *
 * The naive 4-step UNION used by H7 promise verdict tells you houses
 * are touched; this split exposes WHICH layer carries the yes signal —
 * critical for KSK-grade accuracy.
 *
 * Renders inside the KP sub-tab, below the H7 promise tiles.
 */
import { useLanguage } from "@/lib/i18n";

type Harmony = {
  csl: string;
  star_lord: string;
  sub_lord: string;
  star_houses: number[];
  sub_houses: number[];
  star_relevant: number[];
  star_denial: number[];
  sub_relevant: number[];
  sub_denial: number[];
  harmony: "HARMONY" | "ALIGNED" | "TENSION" | "CONTRA" | "DENIED" | "NEUTRAL";
  note: string;
};

type Props = {
  p1Harmony?: Harmony;
  p2Harmony?: Harmony;
  p1Name?: string;
  p2Name?: string;
};

function harmonyDetails(h: string) {
  const map: Record<string, { color: string; symbol: string }> = {
    HARMONY: { color: "#34d399", symbol: "++" },
    ALIGNED: { color: "#34d399", symbol: "+" },
    CONTRA:  { color: "#fbbf24", symbol: "±" },
    TENSION: { color: "#f87171", symbol: "−" },
    DENIED:  { color: "#f87171", symbol: "−−" },
    NEUTRAL: { color: "var(--muted)", symbol: "·" },
  };
  return map[h] ?? map.NEUTRAL;
}

function PartnerHarmonyCard({ harmony, name, color }: { harmony: Harmony; name: string; color: string }) {
  const { t } = useLanguage();
  const dets = harmonyDetails(harmony.harmony);

  return (
    <div
      style={{
        padding: "12px 14px",
        background: "rgba(255,255,255,0.01)",
        border: "0.5px solid var(--border2)",
        borderRadius: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color, letterSpacing: "0.04em" }}>
          {name} · H7 CSL {harmony.csl}
        </div>
        <span
          style={{
            padding: "3px 10px",
            background: `${dets.color}18`,
            border: `0.5px solid ${dets.color}55`,
            borderRadius: 999,
            color: dets.color,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.06em",
          }}
        >
          {dets.symbol} {harmony.harmony}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
        <div style={{ padding: "8px 10px", background: "rgba(0,0,0,0.15)", borderRadius: 6, border: "0.5px solid var(--border)" }}>
          <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
            {t("STAR layer", "నక్షత్ర స్థాయి")} · {harmony.star_lord}
          </div>
          <div style={{ color: "var(--text)" }}>
            {harmony.star_relevant.length > 0 && (
              <span style={{ color: "#34d399" }}>{harmony.star_relevant.map(h => `H${h}`).join(", ")} ✓ </span>
            )}
            {harmony.star_denial.length > 0 && (
              <span style={{ color: "#f87171" }}>{harmony.star_denial.map(h => `H${h}`).join(", ")} ✗</span>
            )}
            {harmony.star_relevant.length === 0 && harmony.star_denial.length === 0 && (
              <span style={{ color: "var(--muted)" }}>{t("no marriage hit", "వివాహ హిట్ లేదు")}</span>
            )}
          </div>
        </div>
        <div style={{ padding: "8px 10px", background: "rgba(0,0,0,0.15)", borderRadius: 6, border: "0.5px solid var(--border)" }}>
          <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
            {t("SUB layer · deciding gate", "సబ్ స్థాయి · నిర్ణయం")} · {harmony.sub_lord}
          </div>
          <div style={{ color: "var(--text)" }}>
            {harmony.sub_relevant.length > 0 && (
              <span style={{ color: "#34d399" }}>{harmony.sub_relevant.map(h => `H${h}`).join(", ")} ✓ </span>
            )}
            {harmony.sub_denial.length > 0 && (
              <span style={{ color: "#f87171" }}>{harmony.sub_denial.map(h => `H${h}`).join(", ")} ✗</span>
            )}
            {harmony.sub_relevant.length === 0 && harmony.sub_denial.length === 0 && (
              <span style={{ color: "var(--muted)" }}>{t("no marriage hit", "వివాహ హిట్ లేదు")}</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.5 }}>
        {harmony.note}
      </div>
    </div>
  );
}

export default function MatchStarSubHarmonyStrip({ p1Harmony, p2Harmony, p1Name, p2Name }: Props) {
  const { t } = useLanguage();
  if (!p1Harmony && !p2Harmony) return null;

  return (
    <div className="match-section">
      <div className="match-section-title">
        {t("Star ↔ Sub Harmony (KSK strict)", "నక్షత్రం ↔ సబ్ సమన్వయం")}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
        {t(
          "KP is a TENSION between two layers — the STAR LORD declares the nature of the matter, the SUB LORD decides whether it fructifies. When the SUB layer (deciding gate) carries denial, the marriage signal blocks even if STAR shows promise.",
          "KP రెండు స్థాయుల మధ్య TENSION — STAR LORD విషయ స్వభావం, SUB LORD దాని నిర్ణయం. SUB నిరాకరణ చూపిస్తే STAR అనుకూలంగా ఉన్నా వివాహం ఆగుతుంది."
        )}
      </div>
      <div className="match-section-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {p1Harmony && <PartnerHarmonyCard harmony={p1Harmony} name={p1Name || "Person 1"} color="var(--accent)" />}
        {p2Harmony && <PartnerHarmonyCard harmony={p2Harmony} name={p2Name || "Person 2"} color="#93c5fd" />}
      </div>
    </div>
  );
}
