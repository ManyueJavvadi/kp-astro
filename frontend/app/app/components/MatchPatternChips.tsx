"use client";
/**
 * MatchPatternChips — PR M3
 *
 * Renders canonical KP marriage patterns detected by the compatibility
 * engine. Three groups: per-partner (chart1, chart2) + couple-wide.
 *
 * Patterns: M1/M2/M3/M5 (per partner) + T1/T2 (couple)
 *   M1 — Venus/Jupiter marriage karaka active (classical trigger)
 *   M2 — Saturn delay-not-denial
 *   M3 — H7 fixed sign + fruitful CSL (stable single marriage)
 *   M5 — KSK primary timing (AD-lord = supporting CSL)
 *   T1 — Joint Period (both partners' MD+AD signify)
 *   T2 — RP Amplifier (canonical cross-match)
 *
 * Pattern naming is what distinguishes a deep KSK reading from a
 * generic significator scan (RULE 19 — pattern recognition).
 */
import { Zap, Star, Sparkles, AlertTriangle, Hourglass } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type Pattern = {
  id: string;
  name: string;
  name_te?: string;
  evidence: string;
  evidence_te?: string;
  tone: "gold" | "amber";
};

type Props = {
  patternsP1?: Pattern[];
  patternsP2?: Pattern[];
  patternsCouple?: Pattern[];
  p1Name?: string;
  p2Name?: string;
};

const ICONS: Record<string, typeof Zap> = {
  M1: Sparkles,
  M2: Hourglass,
  M3: Star,
  M5: Zap,
  T1: Sparkles,
  T2: Zap,
  D2: AlertTriangle,
};

function Chip({ pattern, lang }: { pattern: Pattern; lang: string }) {
  const Icon = ICONS[pattern.id] ?? Sparkles;
  const isGold = pattern.tone === "gold";
  const color = isGold ? "var(--accent)" : "#fbbf24";
  const bg = isGold ? "rgba(201,169,110,0.12)" : "rgba(251,191,36,0.10)";
  const border = isGold ? "rgba(201,169,110,0.42)" : "rgba(251,191,36,0.42)";
  const name = lang === "te" && pattern.name_te ? pattern.name_te : pattern.name;
  const evidence = lang === "te" && pattern.evidence_te ? pattern.evidence_te : pattern.evidence;
  return (
    <span
      title={evidence}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        background: bg,
        border: `0.5px solid ${border}`,
        borderRadius: 999,
        fontSize: 11,
        color,
        fontWeight: 600,
        cursor: "help",
        letterSpacing: "0.02em",
      }}
    >
      <Icon size={11} strokeWidth={2} />
      <span style={{ fontWeight: 700 }}>{pattern.id}</span>
      <span style={{ opacity: 0.85, fontWeight: 500 }}>· {name}</span>
    </span>
  );
}

export default function MatchPatternChips({
  patternsP1,
  patternsP2,
  patternsCouple,
  p1Name,
  p2Name,
}: Props) {
  const { t, lang } = useLanguage();
  const hasP1 = patternsP1 && patternsP1.length > 0;
  const hasP2 = patternsP2 && patternsP2.length > 0;
  const hasCouple = patternsCouple && patternsCouple.length > 0;
  if (!hasP1 && !hasP2 && !hasCouple) return null;

  return (
    <div
      style={{
        marginTop: 10,
        padding: "10px 12px",
        background: "rgba(201,169,110,0.04)",
        border: "0.5px solid rgba(201,169,110,0.20)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: "var(--muted)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        {t("Canonical KP patterns fired", "క్యానానికల్ KP నమూనాలు")}
      </div>

      {hasCouple && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, letterSpacing: "0.05em" }}>
            {t("Couple-wide", "జంట-సంబంధం")}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {patternsCouple!.map((p, i) => <Chip key={`c-${i}`} pattern={p} lang={lang} />)}
          </div>
        </div>
      )}

      {hasP1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, letterSpacing: "0.05em" }}>
            {p1Name || t("Person 1", "వ్యక్తి 1")}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {patternsP1!.map((p, i) => <Chip key={`p1-${i}`} pattern={p} lang={lang} />)}
          </div>
        </div>
      )}

      {hasP2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 10, color: "#93c5fd", fontWeight: 600, letterSpacing: "0.05em" }}>
            {p2Name || t("Person 2", "వ్యక్తి 2")}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {patternsP2!.map((p, i) => <Chip key={`p2-${i}`} pattern={p} lang={lang} />)}
          </div>
        </div>
      )}
    </div>
  );
}
