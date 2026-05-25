"use client";
/**
 * HoraryPatternChips — PR H4
 *
 * Renders canonical KP patterns detected by the horary engine
 * (T1/T2/T3/D2 from pattern_library.md). Each pattern is a chip with:
 *   - gold tone for positive (timing-confirming) patterns: T1/T2/T3
 *   - amber tone for friction patterns: D2 (offer-then-withdrawn)
 *
 * Tooltip shows the evidence trail so the astrologer can verify the
 * pattern claim immediately.
 *
 * Pattern naming is what distinguishes a deep KSK reading from a
 * generic significator scan (RULE 19 — pattern recognition).
 */
import { Zap, Star, Sparkles, AlertTriangle } from "lucide-react";
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
  patterns: Pattern[] | undefined;
};

const ICONS: Record<string, typeof Zap> = {
  T1: Sparkles,    // joint period — multi-layer convergence
  T2: Zap,         // RP amplifier — timing fire
  T3: Star,        // self-significator — pure
  D2: AlertTriangle, // offer-then-withdrawn — friction
};

export default function HoraryPatternChips({ patterns }: Props) {
  const { t, lang } = useLanguage();
  if (!patterns || patterns.length === 0) return null;

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "0.5px solid rgba(201,169,110,0.2)" }}>
      <div
        style={{
          fontSize: 9,
          color: "var(--muted)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        {t("Canonical KP patterns fired", "క్యానానికల్ KP నమూనాలు")}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {patterns.map((p, i) => {
          const Icon = ICONS[p.id] ?? Sparkles;
          const isGold = p.tone === "gold";
          const color = isGold ? "var(--accent)" : "#fbbf24";
          const bg = isGold ? "rgba(201,169,110,0.12)" : "rgba(251,191,36,0.10)";
          const border = isGold ? "rgba(201,169,110,0.42)" : "rgba(251,191,36,0.42)";
          const name = lang === "te" && p.name_te ? p.name_te : p.name;
          const evidence = lang === "te" && p.evidence_te ? p.evidence_te : p.evidence;
          return (
            <span
              key={`${p.id}-${i}`}
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
              <span style={{ fontWeight: 700 }}>{p.id}</span>
              <span style={{ opacity: 0.85, fontWeight: 500 }}>· {name}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
