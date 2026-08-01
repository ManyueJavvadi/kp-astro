"use client";
/**
 * MatchKootaSystems — PR A1.13 (2026-08-01)
 *
 * Publishes BOTH matching systems side by side, because our astrologers
 * are South Indian/Telugu and the two traditions genuinely differ:
 *
 *   NORTH — Ashtakoota, 8 kootas, 36 points, aggregate score (>=18 pass).
 *   SOUTH — Dashakoota, 10 poruthams, pass/fail per porutham, and Rajju
 *           + Vedha treated by many practitioners as HARD BLOCKERS that
 *           reject a match regardless of the score.
 *
 * Crucially, practitioners do NOT agree on how absolute Rajju/Vedha are.
 * So the South panel carries a DUAL VERDICT — one counting the blockers,
 * one ignoring them — and flags when the two disagree. The astrologer
 * picks the tradition they practise instead of us silently choosing.
 *
 * The Dashakoota REUSES the koota results already computed for the
 * Ashtakoota (backend), so the two systems can never disagree on a
 * koota they share.
 */
import { useLanguage } from "@/lib/i18n";

type Kuta = { kuta: string; score: number; max: number; note?: string; has_dosha?: boolean };
type Porutham = {
  porutham: string;
  passed: boolean;
  has_dosha?: boolean;
  score?: number;
  max?: number;
  note?: string;
  lookup_ok?: boolean;
};
type Verdict = {
  label: string;
  counts_blockers: boolean;
  passed: number;
  total: number;
  note: string;
};

type Props = {
  ashtakoota?: {
    kutas: Kuta[];
    total_score: number;
    max_score: number;
    verdict: string;
    percentage?: number;
  } | null;
  dashakoota?: {
    poruthams: Porutham[];
    passed_count: number;
    total_count: number;
    hard_blockers: string[];
    hard_blockers_hit: string[];
    verdict_strict: Verdict;
    verdict_without_blockers: Verdict;
    verdicts_disagree: boolean;
  } | null;
};

const GREEN = "#34d399";
const AMBER = "#fbbf24";
const RED = "#f87171";
const MUTED = "var(--muted)";

function verdictColor(label: string): string {
  if (/reject/i.test(label)) return RED;
  if (/excellent/i.test(label)) return "var(--accent)";
  if (/good/i.test(label)) return GREEN;
  if (/average/i.test(label)) return AMBER;
  return RED;
}

function ashtaColor(total: number, max: number): string {
  const pct = max ? (total / max) * 100 : 0;
  if (pct >= 78) return "var(--accent)";
  if (pct >= 58) return GREEN;
  if (pct >= 50) return AMBER;
  return RED;
}

export default function MatchKootaSystems({ ashtakoota, dashakoota }: Props) {
  const { t } = useLanguage();
  if (!ashtakoota && !dashakoota) return null;

  const aColor = ashtakoota ? ashtaColor(ashtakoota.total_score, ashtakoota.max_score) : MUTED;

  return (
    <div className="match-section" style={{ padding: "16px" }}>
      <div className="match-section-title" style={{ marginBottom: 4 }}>
        {t("Stage 2 · Compatibility — both traditions", "దశ 2 · అనుకూలత — రెండు సంప్రదాయాలు")}
      </div>
      <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.6, marginBottom: 14 }}>
        {t(
          "North India scores 36 points in aggregate. South India (Telugu practice) checks 10 poruthams pass/fail and treats Rajju and Vedha as blockers. Both are shown — they answer the same question differently.",
          "ఉత్తర భారతం 36 గుణాలు మొత్తంగా లెక్కిస్తుంది. దక్షిణ భారతం (తెలుగు పద్ధతి) 10 పొంతనలు చూసి రజ్జు, వేధ లను అడ్డంకులుగా పరిగణిస్తుంది."
        )}
      </div>

      <div className="match-section-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* ══ NORTH — Ashtakoota 36 ══ */}
        {ashtakoota && (
          <div style={{ padding: "13px 14px", borderRadius: 10, background: "rgba(255,255,255,0.012)", border: "0.5px solid var(--border2)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10.5, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {t("North · Ashtakoota", "ఉత్తరం · అష్టకూట")}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: aColor }}>
                {ashtakoota.total_score}
                <span style={{ fontSize: 11, color: MUTED, fontWeight: 400 }}>/{ashtakoota.max_score}</span>
              </span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: aColor, marginBottom: 10 }}>
              {ashtakoota.verdict}
            </div>
            {ashtakoota.kutas?.map(k => {
              const pct = k.max ? (k.score / k.max) * 100 : 0;
              const c = k.has_dosha ? RED : pct >= 99 ? GREEN : pct >= 50 ? AMBER : RED;
              return (
                <div key={k.kuta} title={k.note} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                  <span style={{ fontSize: 11, color: "var(--text)", minWidth: 86 }}>{k.kuta}</span>
                  <div style={{ flex: 1, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: c }} />
                  </div>
                  <span style={{ fontSize: 10.5, color: c, minWidth: 34, textAlign: "right" }}>
                    {k.score}/{k.max}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ SOUTH — Dashakoota 10 ══ */}
        {dashakoota && (
          <div style={{ padding: "13px 14px", borderRadius: 10, background: "rgba(255,255,255,0.012)", border: "0.5px solid var(--border2)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10.5, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {t("South · Dashakoota", "దక్షిణం · దశకూట")}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                {dashakoota.passed_count}
                <span style={{ fontSize: 11, color: MUTED, fontWeight: 400 }}>/{dashakoota.total_count}</span>
              </span>
            </div>
            {dashakoota.poruthams?.map(p => {
              const isBlocker = dashakoota.hard_blockers?.includes(p.porutham);
              const c = p.passed ? GREEN : RED;
              return (
                <div key={p.porutham} title={p.note} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3.5px 0" }}>
                  <span style={{ fontSize: 11, color: "var(--text)", minWidth: 92 }}>
                    {p.porutham}
                    {isBlocker && (
                      <span
                        title={t("Treated as a hard blocker in South Indian practice", "దక్షిణ భారత పద్ధతిలో కఠిన అడ్డంకి")}
                        style={{ fontSize: 8.5, color: AMBER, marginLeft: 4, verticalAlign: "super" }}
                      >
                        ▲
                      </span>
                    )}
                  </span>
                  <span style={{ flex: 1, height: 1, background: "var(--border2)" }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: c, minWidth: 38, textAlign: "right" }}>
                    {p.passed ? t("PASS", "సరి") : t("FAIL", "కాదు")}
                  </span>
                </div>
              );
            })}
            <div style={{ fontSize: 9.5, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
              ▲ {t("Rajju and Vedha — treated as blockers by many practitioners.", "రజ్జు, వేధ — చాలామంది అడ్డంకిగా పరిగణిస్తారు.")}
            </div>
          </div>
        )}
      </div>

      {/* ══ DUAL VERDICT — the point of this panel ══ */}
      {dashakoota && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10.5, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
            {t("South Indian verdict — two readings", "దక్షిణ భారత తీర్పు — రెండు పఠనాలు")}
          </div>
          <div className="match-section-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[dashakoota.verdict_strict, dashakoota.verdict_without_blockers].map((v, i) => {
              const c = verdictColor(v.label);
              return (
                <div
                  key={i}
                  style={{
                    padding: "12px 13px", borderRadius: 10,
                    background: `${c}0d`, border: `0.5px solid ${c}44`,
                  }}
                >
                  <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                    {v.counts_blockers
                      ? t("Counting Rajju / Vedha", "రజ్జు / వేధ కలిపి")
                      : t("Ignoring Rajju / Vedha", "రజ్జు / వేధ మినహా")}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: c, lineHeight: 1.35 }}>
                    {v.label}
                  </div>
                  <div style={{ fontSize: 10.5, color: MUTED, marginTop: 5 }}>
                    {v.passed}/{v.total} {t("poruthams", "పొంతనలు")}
                  </div>
                  <div style={{ fontSize: 10.5, color: MUTED, marginTop: 6, lineHeight: 1.55 }}>
                    {v.note}
                  </div>
                </div>
              );
            })}
          </div>

          {dashakoota.verdicts_disagree && (
            <div
              style={{
                marginTop: 10, padding: "10px 13px", borderRadius: 8,
                background: `${AMBER}0d`, border: `0.5px solid ${AMBER}44`,
                fontSize: 11, color: "var(--text)", lineHeight: 1.6,
              }}
            >
              <b style={{ color: AMBER }}>{t("The two readings disagree.", "రెండు పఠనాలు విభేదిస్తున్నాయి.")}</b>{" "}
              {t(
                "This match turns entirely on whether you treat",
                "ఈ పొంతన పూర్తిగా దీనిపై ఆధారపడి ఉంది —"
              )}{" "}
              <b>{dashakoota.hard_blockers_hit.join(" + ")}</b>{" "}
              {t(
                "as an absolute blocker. Traditional South Indian practice does; many practising astrologers weigh it as one factor among several. State your position to the family — that is the decision they are actually asking you to make.",
                "ను సంపూర్ణ అడ్డంకిగా తీసుకుంటారా అనేది. సాంప్రదాయ దక్షిణ భారత పద్ధతి తీసుకుంటుంది; చాలామంది జ్యోతిష్కులు దీన్ని ఒక అంశంగా మాత్రమే చూస్తారు."
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
