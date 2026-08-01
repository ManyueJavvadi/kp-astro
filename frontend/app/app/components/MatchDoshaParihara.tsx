"use client";
/**
 * MatchDoshaParihara — PR A1.13b (2026-08-01)
 *
 * Every flagged dosha, shown WITH its cancellation check.
 *
 * Why this panel is the single biggest trust signal in the tab: reporting
 * "Nadi dosha" or "Manglik" without checking the parihara is how families
 * get frightened out of perfectly workable matches. A practising
 * astrologer always checks the cancellation before speaking. So nothing
 * here renders a bare red flag — each row reads
 *
 *     raw flag  ->  applicable parihara  ->  net severity
 *
 * which is exactly the sentence the astrologer needs to be able to say to
 * the family: "technically yes, but it is cancelled because ..."
 */
import { useLanguage } from "@/lib/i18n";

type Parihara = {
  raw_dosha?: boolean;
  cancelled?: boolean;
  cancellations?: string[];
  net_severity?: string;
  base_severity?: string;
  note?: string;
  maturation_note?: string | null;
  mars_house?: number | null;
  mars_sign?: string;
};

type GanaResult = {
  boy_gana?: string;
  girl_gana?: string;
  harsh_direction?: boolean;
  classical_exception?: boolean;
  softeners?: string[];
  net_severity?: string;
  note?: string;
};

type Props = {
  parihara?: {
    nadi: Parihara;
    bhakoot: Parihara;
    gana: GanaResult;
    manglik_person1: Parihara;
    manglik_person2: Parihara;
    summary?: { any_standing: boolean; standing: string[]; cancelled: string[]; note: string };
  } | null;
  p1Name?: string;
  p2Name?: string;
};

const GREEN = "#34d399";
const AMBER = "#fbbf24";
const RED = "#f87171";
const MUTED = "var(--muted)";

function severityColor(sev?: string): string {
  const s = (sev || "").toLowerCase();
  if (s === "none" || s === "cancelled") return GREEN;
  if (s === "mild" || s === "softened") return AMBER;
  if (s === "moderate") return AMBER;
  if (s === "severe" || s === "significant" || s === "stands") return RED;
  return MUTED;
}

function DoshaRow({
  label, result, subject,
}: {
  label: string;
  result?: Parihara;
  subject?: string;
}) {
  const { t } = useLanguage();
  if (!result) return null;

  const raw = !!result.raw_dosha;
  const cancelled = !!result.cancelled;
  const sev = result.net_severity || (raw ? "Stands" : "None");
  const color = severityColor(sev);

  return (
    <div
      style={{
        padding: "11px 13px",
        borderRadius: 9,
        background: raw ? `${color}0a` : "rgba(255,255,255,0.012)",
        border: `0.5px solid ${raw ? `${color}44` : "var(--border2)"}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
          {label}
          {subject && <span style={{ color: MUTED, fontWeight: 400 }}> · {subject}</span>}
        </span>
        <span
          style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
            background: `${color}18`, border: `0.5px solid ${color}55`, color,
            whiteSpace: "nowrap",
          }}
        >
          {!raw
            ? t("Not present", "లేదు")
            : cancelled
            ? t("Cancelled", "రద్దు")
            : sev}
        </span>
      </div>

      {/* The raw -> parihara -> net chain */}
      {raw && (
        <div style={{ marginTop: 7 }}>
          {result.base_severity && (
            <div style={{ fontSize: 10.5, color: MUTED }}>
              {t("Raw", "ముడి")}: {result.base_severity}
              {result.mars_house ? ` · Mars H${result.mars_house}` : ""}
              {result.mars_sign ? ` (${result.mars_sign})` : ""}
            </div>
          )}
          {cancelled && result.cancellations && result.cancellations.length > 0 ? (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 10.5, color: GREEN, fontWeight: 600 }}>
                {t("Parihara applies", "పరిహారం వర్తిస్తుంది")}:
              </div>
              <ul style={{ margin: "3px 0 0", paddingLeft: 15 }}>
                {result.cancellations.map((c, i) => (
                  <li key={i} style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.55 }}>{c}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div style={{ fontSize: 10.5, color: RED, marginTop: 4, lineHeight: 1.5 }}>
              {t(
                "No applicable parihara found — this one genuinely stands.",
                "పరిహారం లేదు — ఇది నిజంగా నిలుస్తుంది."
              )}
            </div>
          )}
          {result.maturation_note && (
            <div style={{ fontSize: 10, color: MUTED, marginTop: 5, fontStyle: "italic" }}>
              {result.maturation_note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MatchDoshaParihara({ parihara, p1Name, p2Name }: Props) {
  const { t } = useLanguage();
  if (!parihara) return null;

  const gana = parihara.gana;
  const ganaColor = severityColor(gana?.net_severity);
  const summary = parihara.summary;

  return (
    <div className="match-section" style={{ padding: "16px" }}>
      <div className="match-section-title" style={{ marginBottom: 4 }}>
        {t("Doshas & parihara (cancellations)", "దోషాలు & పరిహారం")}
      </div>
      <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.6, marginBottom: 13 }}>
        {t(
          "Every dosha is shown with its cancellation check. A dosha reported without its parihara is incomplete — and is how families are needlessly frightened away from workable matches.",
          "ప్రతి దోషాన్ని దాని పరిహారంతో కలిపి చూపిస్తున్నాం. పరిహారం చూడకుండా దోషం చెప్పడం అసంపూర్ణం."
        )}
      </div>

      {summary && (
        <div
          style={{
            padding: "10px 13px", borderRadius: 8, marginBottom: 12,
            background: summary.any_standing ? `${RED}0d` : `${GREEN}0d`,
            border: `0.5px solid ${summary.any_standing ? `${RED}44` : `${GREEN}44`}`,
            fontSize: 11.5, color: "var(--text)", fontWeight: 600,
          }}
        >
          {summary.note}
        </div>
      )}

      <div style={{ display: "grid", gap: 9 }}>
        <DoshaRow label={t("Nadi dosha", "నాడీ దోషం")} result={parihara.nadi} />
        <DoshaRow label={t("Bhakoot dosha", "భకూట దోషం")} result={parihara.bhakoot} />

        {/* Gana has its own shape — directional exception, not a raw flag */}
        {gana && (
          <div
            style={{
              padding: "11px 13px", borderRadius: 9,
              background: "rgba(255,255,255,0.012)",
              border: `0.5px solid ${gana.net_severity === "None" ? "var(--border2)" : `${ganaColor}44`}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                {t("Gana", "గణం")}
                <span style={{ color: MUTED, fontWeight: 400 }}>
                  {" "}· {gana.boy_gana} / {gana.girl_gana}
                </span>
              </span>
              <span
                style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                  background: `${ganaColor}18`, border: `0.5px solid ${ganaColor}55`, color: ganaColor,
                }}
              >
                {gana.net_severity}
              </span>
            </div>
            {gana.classical_exception && (
              <div style={{ fontSize: 10.5, color: AMBER, marginTop: 6, lineHeight: 1.55 }}>
                {t(
                  "Classical exception: a Manushya boy with a Rakshasa girl is not treated as a flat zero.",
                  "సాంప్రదాయ మినహాయింపు: మనుష్య వరుడు + రాక్షస వధువు పూర్తి సున్నా కాదు."
                )}
              </div>
            )}
            {gana.softeners && gana.softeners.length > 0 && (
              <ul style={{ margin: "5px 0 0", paddingLeft: 15 }}>
                {gana.softeners.map((s, i) => (
                  <li key={i} style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.55 }}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DoshaRow
          label={t("Manglik / Kuja", "కుజ దోషం")}
          result={parihara.manglik_person1}
          subject={p1Name}
        />
        <DoshaRow
          label={t("Manglik / Kuja", "కుజ దోషం")}
          result={parihara.manglik_person2}
          subject={p2Name}
        />
      </div>
    </div>
  );
}
