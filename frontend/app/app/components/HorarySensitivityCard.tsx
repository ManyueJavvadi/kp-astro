"use client";
/**
 * HorarySensitivityCard — PR H8
 *
 * Renders the protective-framing note for Tier 2 (life-impact) and
 * Tier 3 (life-or-death) horary questions. Per sensitivity_tiers.md +
 * RULE 52, sensitive topics REQUIRE explicit caveats before the verdict
 * is delivered — both for ethical floor AND for honest framing of what
 * KP can and cannot tell the astrologer.
 *
 * Tier 3 also surfaces crisis resources (iCall / Vandrevala / NIMHANS /
 * 988) when mental-health or suicide topics are detected.
 *
 * Tier 1 questions render no card (no protective framing needed).
 */
import { AlertOctagon, AlertTriangle, Phone } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type CrisisResource = {
  region: string;
  name: string;
  number: string;
  hours: string;
};

type Sensitivity = {
  tier: 1 | 2 | 3;
  base_tier: 1 | 2 | 3;
  escalators_triggered: string[];
  framing_required: boolean;
  framing_note_en: string;
  framing_note_te: string;
  crisis_resources: CrisisResource[];
};

type Props = {
  sensitivity: Sensitivity | null | undefined;
};

export default function HorarySensitivityCard({ sensitivity }: Props) {
  const { t, lang } = useLanguage();
  if (!sensitivity || !sensitivity.framing_required) return null;

  const isTier3 = sensitivity.tier === 3;
  const tone = isTier3 ? "#f87171" : "#fbbf24";
  const toneBg = isTier3 ? "rgba(248,113,113,0.06)" : "rgba(251,191,36,0.06)";
  const toneBorder = isTier3 ? "rgba(248,113,113,0.40)" : "rgba(251,191,36,0.32)";
  const Icon = isTier3 ? AlertOctagon : AlertTriangle;

  const note = lang === "te" ? sensitivity.framing_note_te : sensitivity.framing_note_en;
  const tierLabel = isTier3
    ? t("Tier 3 · Life-or-death — maximum care", "టైర్ 3 · జీవన్మరణ — గరిష్ఠ జాగ్రత్త")
    : t("Tier 2 · Life-impact — careful framing", "టైర్ 2 · జీవిత-ప్రభావం");

  return (
    <div
      style={{
        padding: "14px 16px",
        background: toneBg,
        border: `1px solid ${toneBorder}`,
        borderRadius: 10,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <Icon size={18} color={tone} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            color: tone,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          {tierLabel}
        </div>

        {sensitivity.escalators_triggered.length > 0 && (
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, fontStyle: "italic" }}>
            {t(
              `Auto-escalated to Tier 3 by question content: "${sensitivity.escalators_triggered.slice(0, 3).join('", "')}"`,
              `ప్రశ్నలోని పదాల ద్వారా టైర్ 3కు ఎస్కలేట్: "${sensitivity.escalators_triggered.slice(0, 3).join('", "')}"`
            )}
          </div>
        )}

        <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.6, marginBottom: 8 }}>
          {note}
        </div>

        {sensitivity.crisis_resources.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `0.5px solid ${toneBorder}` }}>
            <div
              style={{
                fontSize: 10,
                color: tone,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 6,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Phone size={11} strokeWidth={2} />
              {t("Crisis resources", "సంక్షోభ వనరులు")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
              {sensitivity.crisis_resources.map((cr, i) => (
                <div key={i} style={{ color: "var(--muted)" }}>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{cr.region}</span>{" · "}
                  <span style={{ color: tone, fontWeight: 600 }}>{cr.name}</span>{" "}
                  <span style={{ color: "var(--accent)" }}>{cr.number}</span>{" "}
                  <span style={{ opacity: 0.7 }}>({cr.hours})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
