"use client";
/**
 * HoraryBhavatBhavamCard — PR H7
 *
 * When the horary question references a relative (mother, father, spouse,
 * child, sibling, in-law, boss), the engine detects this and rotates all
 * topic houses via Bhavat Bhavam ("house from house"). This card surfaces
 * the translation so the astrologer instantly understands:
 *   - Which relative was detected
 *   - Where the relative's H1 maps in the native's chart
 *   - Which houses got rotated (yes / no / primary)
 *   - Accuracy floor (~70% via Bhavat Bhavam vs ~85-90% with own chart)
 *
 * Source: knowledge/bhavat_bhavam.md, RULE 13.
 */
import { Users } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type BhavatBhavam = {
  relative: string;
  relative_label_en: string;
  relative_label_te: string;
  native_house_for_relative_h1: number;
  translated_yes: number[];
  translated_no: number[];
  translated_primary: number;
  accuracy_note: string;
};

type Props = {
  ctx: BhavatBhavam | null | undefined;
};

export default function HoraryBhavatBhavamCard({ ctx }: Props) {
  const { t, lang } = useLanguage();
  if (!ctx) return null;

  const relLabel = lang === "te" ? ctx.relative_label_te : ctx.relative_label_en;

  return (
    <div
      style={{
        padding: "12px 16px",
        background: "rgba(251,146,60,0.06)",
        border: "1px solid rgba(251,146,60,0.32)",
        borderRadius: 10,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <Users size={16} color="#fb923c" strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            color: "#fb923c",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          {t("Bhavat Bhavam active — relative question", "భావత్ భావం సక్రియం — బంధువు ప్రశ్న")}
        </div>
        <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, marginBottom: 6 }}>
          {t(
            `Question is about your ${relLabel} — houses rotated.`,
            `మీ ${relLabel} గురించి ప్రశ్న — భావాలు తిప్పబడ్డాయి.`
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.55, marginBottom: 6 }}>
          {t(
            `Relative's H1 = native's H${ctx.native_house_for_relative_h1}. All topic houses rotated accordingly.`,
            `బంధువు H1 = మీ H${ctx.native_house_for_relative_h1}. అన్ని టాపిక్ భావాలు అదనంగా తిప్పబడ్డాయి.`
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span>
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>{t("Primary", "ప్రాథమికం")}:</span>{" "}
            H{ctx.translated_primary}
          </span>
          <span>
            <span style={{ color: "#34d399", fontWeight: 600 }}>{t("Yes", "అనుకూలం")}:</span>{" "}
            {ctx.translated_yes.map((h) => `H${h}`).join(", ")}
          </span>
          <span>
            <span style={{ color: "#f87171", fontWeight: 600 }}>{t("No", "నిరాకరణ")}:</span>{" "}
            {ctx.translated_no.map((h) => `H${h}`).join(", ")}
          </span>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.5 }}>
          {ctx.accuracy_note}
        </div>
      </div>
    </div>
  );
}
