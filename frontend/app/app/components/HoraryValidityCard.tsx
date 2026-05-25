"use client";
/**
 * HoraryValidityCard — PR H1
 *
 * Renders the "Query Validity" pre-verdict card showing whether the
 * Prashna Lagna falls within KSK's canonical 5°–25° decision window.
 *
 * - GREEN  ("ripened")    → Lagna 5°–25° in sign, query is structurally ripe
 * - YELLOW ("premature")  → Lagna < 5°, query may be too early
 * - YELLOW ("expired")    → Lagna > 25°, query may be too late
 *
 * The verdict cascade still runs regardless; this card surfaces the KSK
 * structural caveat so the astrologer weighs it before delivering.
 *
 * Source: kpastrology.com horary rules + theastrologyonline.com KP horary
 * method + KSK Reader I chapter on Prashna validity.
 */
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type LagnaValidity = {
  state: "premature" | "ripened" | "expired";
  degree_in_sign: number;
  window_start: number;
  window_end: number;
  in_window: boolean;
  doctrine: string;
};

type Props = {
  validity: LagnaValidity | undefined;
};

export default function HoraryValidityCard({ validity }: Props) {
  const { t } = useLanguage();
  if (!validity) return null;

  const isRipened = validity.state === "ripened";
  const Icon = isRipened ? CheckCircle2 : validity.state === "premature" ? Clock : AlertTriangle;
  const tone = isRipened ? "#34d399" : "#fbbf24";
  const toneBg = isRipened ? "rgba(52,211,153,0.06)" : "rgba(251,191,36,0.06)";
  const toneBorder = isRipened ? "rgba(52,211,153,0.28)" : "rgba(251,191,36,0.32)";

  const stateLabel = isRipened
    ? t("Query is ripe", "ప్రశ్న పరిపక్వం")
    : validity.state === "premature"
    ? t("Query may be premature", "ప్రశ్న ముందుగా అడిగినట్లు")
    : t("Query may be too late", "ప్రశ్నకు సమయం దాటిపోయింది");

  const explainer = isRipened
    ? t(
        `Lagna at ${validity.degree_in_sign.toFixed(2)}° — well within the canonical 5°–25° KSK decision window. The question is structurally ripe for a clean horary verdict.`,
        `లగ్నం ${validity.degree_in_sign.toFixed(2)}° వద్ద — KSK 5°–25° నిర్ణయ విండోలో. ప్రశ్న స్పష్టమైన ఫలితం కోసం సిద్ధంగా ఉంది.`
      )
    : validity.state === "premature"
    ? t(
        `Lagna at ${validity.degree_in_sign.toFixed(2)}° — below the 5° canonical threshold. Per KSK Reader I, the matter may not have ripened yet. Re-querying after 2–3 weeks (once the situation matures) often produces a cleaner Prashna. The verdict below remains structurally accurate — treat timing with extra caution.`,
        `లగ్నం ${validity.degree_in_sign.toFixed(2)}° వద్ద — KSK ప్రకారం 5° కంటే తక్కువ ఉంటే విషయం పరిపక్వం కాలేదు. 2-3 వారాల తర్వాత మళ్లీ ప్రశ్నించడం మంచిది. క్రింది ఫలితం నిర్మాణాత్మకంగా సరైనదే — సమయం పట్ల జాగ్రత్త వహించండి.`
      )
    : t(
        `Lagna at ${validity.degree_in_sign.toFixed(2)}° — above the 25° canonical threshold. Per KSK Reader I, the matter may have already passed its decision window. Consider whether a related event has already occurred. The verdict reflects the current chart structure.`,
        `లగ్నం ${validity.degree_in_sign.toFixed(2)}° వద్ద — KSK ప్రకారం 25° దాటితే నిర్ణయ సమయం దాటిపోయింది. సంబంధిత సంఘటన ఇప్పటికే జరిగి ఉండవచ్చు.`
      );

  return (
    <div
      style={{
        padding: "12px 16px",
        background: toneBg,
        border: `1px solid ${toneBorder}`,
        borderRadius: 10,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <Icon size={16} color={tone} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            color: "var(--muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          {t("Query validity · KSK 5°–25° rule", "ప్రశ్న యాప్థతా · KSK 5°–25° నియమం")}
        </div>
        <div style={{ fontSize: 13, color: tone, fontWeight: 600, marginBottom: 4 }}>
          {stateLabel}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.55 }}>
          {explainer}
        </div>
      </div>
    </div>
  );
}
