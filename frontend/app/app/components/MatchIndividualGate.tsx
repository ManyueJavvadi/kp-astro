"use client";
/**
 * MatchIndividualGate — PR A1.13 (2026-08-01)
 *
 * THE STAGE-1 GATE. This is the panel an experienced astrologer reaches
 * for FIRST, before any compatibility score.
 *
 * Practitioner rule this encodes (per a working Telugu astrologer):
 *   "First see the individual charts. If those are good, then see the
 *    match." When a boy's family brings the girl's chart, he reads HER
 *    chart alone and may say "her chart itself is not good — I wouldn't
 *    recommend the marriage even with more points and good compatibility."
 *
 * So this panel answers, per person and independent of the partner:
 *   1. Papa Samyam — the affliction load (Sun/Mars/Saturn/Rahu/Ketu in
 *      houses 1/2/4/7/8/12, counted from Lagna, Moon AND Venus), and how
 *      the two loads compare. South Indian; the tool behind the verdict
 *      above.
 *   2. Is marriage promised at all (KP 7th cuspal sub-lord)?
 *   3. Withdrawal from bonding / emotional unavailability.
 *   4. Separation proneness.
 *   5. Spouse-longevity concern.
 *   6. Multiple-marriage signature.
 *
 * FRAMING DISCIPLINE (non-negotiable — these readings affect real
 * people's marriages):
 *   - No single placement is a verdict. We show tendencies + evidence.
 *   - We never auto-reject anyone. The gate escalates to the astrologer.
 *   - Every flag is paired with its severity, not a bare yes/no.
 *
 * All data here is ALREADY computed by compatibility_engine — this
 * component re-composes it into the order an astrologer actually works
 * in. Only papa_samyam is new.
 */
import { useLanguage } from "@/lib/i18n";

type PapaHit = { graha: string; house: number; reference: string; sign?: string };
type PapaRef = { available: boolean; count: number; hits: PapaHit[]; note: string };
type PapaSide = {
  name?: string;
  total: number;
  max_possible: number;
  band: string;
  by_reference: Record<string, PapaRef>;
  note?: string;
};
type PapaComparison = {
  boy_total: number;
  girl_total: number;
  difference: number;
  balance: string;
  classical_rule_satisfied: boolean;
  symmetric_rule_satisfied: boolean;
  classical_note: string;
  symmetric_note: string;
};

type Loose = Record<string, unknown> | undefined | null;

type Props = {
  papaSamyam?: {
    boy: PapaSide;
    girl: PapaSide;
    comparison: PapaComparison;
  } | null;
  p1Name?: string;
  p2Name?: string;
  /** kp_analysis.chart1_promise / chart2_promise */
  p1Promise?: Loose;
  p2Promise?: Loose;
  p1NoDesire?: Loose;
  p2NoDesire?: Loose;
  p1Separation?: Loose;
  p2Separation?: Loose;
  p1SpouseLongevity?: Loose;
  p2SpouseLongevity?: Loose;
  p1MultiMarriage?: Loose;
  p2MultiMarriage?: Loose;
  /** boy_girl mapping so we can align papa_samyam (boy/girl) to p1/p2 */
  boyName?: string;
};

const GREEN = "#34d399";
const AMBER = "#fbbf24";
const RED = "#f87171";
const MUTED = "var(--muted)";

function bandColor(band: string): string {
  switch ((band || "").toLowerCase()) {
    case "clean": return GREEN;
    case "light": return GREEN;
    case "moderate": return AMBER;
    case "heavy": return RED;
    case "very heavy": return RED;
    default: return MUTED;
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function bool(v: unknown): boolean {
  return v === true;
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** One flag row: label, severity chip, and the evidence beneath it. */
function SignalRow({
  label, severity, color, evidence, tone,
}: {
  label: string;
  severity: string;
  color: string;
  evidence?: string[];
  tone?: string;
}) {
  return (
    <div style={{ padding: "8px 0", borderTop: "0.5px solid var(--border2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "var(--text)" }}>{label}</span>
        <span
          style={{
            fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
            padding: "2px 8px", borderRadius: 999,
            background: `${color}18`, border: `0.5px solid ${color}55`, color,
            whiteSpace: "nowrap",
          }}
        >
          {severity}
        </span>
      </div>
      {tone && (
        <div style={{ fontSize: 10.5, color: MUTED, marginTop: 3, lineHeight: 1.5 }}>{tone}</div>
      )}
      {evidence && evidence.length > 0 && (
        <ul style={{ margin: "4px 0 0", paddingLeft: 14 }}>
          {evidence.slice(0, 4).map((e, i) => (
            <li key={i} style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.55 }}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Papa Samyam load meter for one chart. */
function PapaMeter({ papa }: { papa: PapaSide }) {
  const { t } = useLanguage();
  const color = bandColor(papa.band);
  const pct = papa.max_possible ? (papa.total / papa.max_possible) * 100 : 0;

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t("Papa Samyam · affliction load", "పాప సామ్యం · దోష భారం")}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {papa.total}<span style={{ fontSize: 10, color: MUTED, fontWeight: 400 }}>/{papa.max_possible}</span>
          <span style={{ fontSize: 10, marginLeft: 6, color }}>{papa.band}</span>
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 999 }} />
      </div>
      {/* Per-reference breakdown — Lagna / Moon / Venus */}
      <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
        {["Lagna", "Moon", "Venus"].map(ref => {
          const info = papa.by_reference?.[ref];
          if (!info) return null;
          const c = !info.available ? MUTED : info.count === 0 ? GREEN : info.count <= 2 ? AMBER : RED;
          return (
            <span
              key={ref}
              title={info.note}
              style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 6,
                background: `${c}12`, border: `0.5px solid ${c}44`, color: c,
              }}
            >
              {ref} {info.available ? info.count : "—"}
            </span>
          );
        })}
      </div>
      {/* The actual hits, so the astrologer can defend the number */}
      {papa.by_reference && (
        <div style={{ fontSize: 10, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>
          {(["Lagna", "Moon", "Venus"] as const).map(ref => {
            const info = papa.by_reference?.[ref];
            if (!info?.available || !info.hits?.length) return null;
            return (
              <div key={ref}>
                <span style={{ opacity: 0.7 }}>from {ref}:</span>{" "}
                {info.hits.map(h => `${h.graha} H${h.house}`).join(", ")}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PersonGateCard({
  name, color, papa, promise, noDesire, separation, spouseLongevity, multiMarriage,
}: {
  name: string;
  color: string;
  papa?: PapaSide;
  promise?: Loose;
  noDesire?: Loose;
  separation?: Loose;
  spouseLongevity?: Loose;
  multiMarriage?: Loose;
}) {
  const { t } = useLanguage();

  // ── 1. Marriage promise (KP H7 CSL) ──
  const promiseVerdict = str((promise as Record<string, unknown>)?.verdict) ||
                         str((promise as Record<string, unknown>)?.promise_tier);
  const promiseOk = /promis/i.test(promiseVerdict) && !/denied|denial/i.test(promiseVerdict);
  const promiseColor = !promiseVerdict ? MUTED : promiseOk
    ? (/caveat|caution/i.test(promiseVerdict) ? AMBER : GREEN)
    : RED;

  // ── 2. Withdrawal from bonding ──
  const ndFlagged = bool((noDesire as Record<string, unknown>)?.flagged);
  const ndNotes = arr((noDesire as Record<string, unknown>)?.notes).map(String);

  // ── 3. Separation proneness ──
  const sepLevel = str((separation as Record<string, unknown>)?.risk_level) || "—";
  const sepFactors = arr((separation as Record<string, unknown>)?.factors).map(String);
  const sepColor = /high|severe/i.test(sepLevel) ? RED
    : /moderate|elevated/i.test(sepLevel) ? AMBER
    : /low|none/i.test(sepLevel) ? GREEN : MUTED;

  // ── 4. Spouse longevity ──
  const slLevel = str((spouseLongevity as Record<string, unknown>)?.concern_level) || "—";
  const slColor = /elevated|high|severe/i.test(slLevel) ? AMBER
    : /low|none|normal/i.test(slLevel) ? GREEN : MUTED;

  // ── 5. Multiple marriage ──
  const mmFlagged = bool((multiMarriage as Record<string, unknown>)?.flagged) ||
                    bool((multiMarriage as Record<string, unknown>)?.indicated);

  // ── Net gate (advisory only) ──
  const redCount = [
    promiseColor === RED, sepColor === RED,
    (papa?.band || "").toLowerCase().includes("very heavy"),
  ].filter(Boolean).length;
  const amberCount = [
    promiseColor === AMBER, sepColor === AMBER, slColor === AMBER, ndFlagged, mmFlagged,
    (papa?.band || "").toLowerCase() === "heavy",
  ].filter(Boolean).length;

  const gate = redCount > 0
    ? { label: t("Needs careful review", "జాగ్రత్తగా సమీక్షించాలి"), color: RED }
    : amberCount >= 2
    ? { label: t("Proceed with caution", "జాగ్రత్తతో ముందుకు"), color: AMBER }
    : { label: t("Individually clear", "వ్యక్తిగతంగా సరే"), color: GREEN };

  return (
    <div
      className="match-section"
      style={{ padding: "14px 15px", display: "flex", flexDirection: "column", gap: 2 }}
    >
      {/* Header + net gate */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{name}</span>
        <span
          style={{
            fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
            background: `${gate.color}18`, border: `0.5px solid ${gate.color}55`,
            color: gate.color, whiteSpace: "nowrap",
          }}
        >
          {gate.label}
        </span>
      </div>

      {papa && <PapaMeter papa={papa} />}

      <SignalRow
        label={t("Marriage promised (H7 sub-lord)", "వివాహ వాగ్దానం (H7 ఉప అధిపతి)")}
        severity={promiseVerdict || "—"}
        color={promiseColor}
      />
      <SignalRow
        label={t("Withdrawal from bonding", "అనుబంధం నుండి దూరం")}
        severity={ndFlagged ? t("Flagged", "గుర్తించబడింది") : t("Not flagged", "లేదు")}
        color={ndFlagged ? AMBER : GREEN}
        evidence={ndNotes}
        tone={ndFlagged ? t("Ketu/Venus or Venus/Saturn indifference signature.", "కేతు/శుక్ర ఉదాసీన సంకేతం.") : undefined}
      />
      <SignalRow
        label={t("Separation proneness", "విడిపోయే ధోరణి")}
        severity={sepLevel}
        color={sepColor}
        evidence={sepFactors}
      />
      <SignalRow
        label={t("Spouse longevity signal", "జీవిత భాగస్వామి ఆయుష్షు")}
        severity={slLevel}
        color={slColor}
      />
      {mmFlagged && (
        <SignalRow
          label={t("Multiple-marriage signature", "బహు వివాహ సంకేతం")}
          severity={t("Present", "ఉంది")}
          color={AMBER}
        />
      )}
    </div>
  );
}

export default function MatchIndividualGate(props: Props) {
  const { t } = useLanguage();
  const {
    papaSamyam, p1Name = "Person 1", p2Name = "Person 2", boyName,
  } = props;

  // papa_samyam is keyed boy/girl; align it back to p1/p2 by name.
  const p1IsBoy = !!boyName && boyName === p1Name;
  const papaP1 = papaSamyam ? (p1IsBoy ? papaSamyam.boy : papaSamyam.girl) : undefined;
  const papaP2 = papaSamyam ? (p1IsBoy ? papaSamyam.girl : papaSamyam.boy) : undefined;

  const cmp = papaSamyam?.comparison;

  return (
    <div className="match-section" style={{ padding: "16px 16px 14px" }}>
      <div className="match-section-title" style={{ marginBottom: 4 }}>
        {t("Stage 1 · Each chart on its own", "దశ 1 · ప్రతి జాతకం విడిగా")}
      </div>
      <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.6, marginBottom: 14 }}>
        {t(
          "Read this before the compatibility score. If a chart carries a serious affliction of its own, that tendency travels into any marriage — no guna total overrides it. These are structural tendencies, not verdicts.",
          "అనుకూలత స్కోరు కంటే ముందు దీన్ని చదవండి. ఒక జాతకంలోనే తీవ్రమైన దోషం ఉంటే, అది ఏ వివాహంలోనైనా కనిపిస్తుంది — గుణ సంఖ్య దాన్ని అధిగమించదు."
        )}
      </div>

      <div className="match-section-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <PersonGateCard
          name={p1Name}
          color="var(--accent)"
          papa={papaP1}
          promise={props.p1Promise}
          noDesire={props.p1NoDesire}
          separation={props.p1Separation}
          spouseLongevity={props.p1SpouseLongevity}
          multiMarriage={props.p1MultiMarriage}
        />
        <PersonGateCard
          name={p2Name}
          color="#93c5fd"
          papa={papaP2}
          promise={props.p2Promise}
          noDesire={props.p2NoDesire}
          separation={props.p2Separation}
          spouseLongevity={props.p2SpouseLongevity}
          multiMarriage={props.p2MultiMarriage}
        />
      </div>

      {/* ── Papa Samyam comparison — the cross-chart balance rule ── */}
      {cmp && (
        <div
          style={{
            marginTop: 14, padding: "12px 14px", borderRadius: 10,
            background: "rgba(255,255,255,0.015)",
            border: `0.5px solid ${cmp.classical_rule_satisfied ? `${GREEN}44` : `${RED}55`}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t("Papa Samyam · balance between the charts", "పాప సామ్యం · రెండు జాతకాల మధ్య సమతుల్యత")}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: cmp.classical_rule_satisfied ? GREEN : RED }}>
              {cmp.balance}
            </span>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12, color: "var(--text)" }}>
            <span>{t("Boy", "వరుడు")} <b>{cmp.boy_total}</b>/15</span>
            <span style={{ color: MUTED }}>vs</span>
            <span>{t("Girl", "వధువు")} <b>{cmp.girl_total}</b>/15</span>
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
            <b style={{ color: cmp.classical_rule_satisfied ? GREEN : RED }}>
              {t("Classical rule", "సాంప్రదాయ నియమం")}:
            </b>{" "}
            {cmp.classical_note}
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 5, lineHeight: 1.6 }}>
            <b style={{ color: "var(--text)" }}>{t("Balance reading", "సమతుల్య పఠనం")}:</b>{" "}
            {cmp.symmetric_note}
          </div>
          <div style={{ fontSize: 10, color: MUTED, marginTop: 8, fontStyle: "italic", lineHeight: 1.5 }}>
            {t(
              "Papa = Sun, Mars, Saturn, Rahu, Ketu in houses 1/2/4/7/8/12, counted from Lagna, Moon and Venus. The classical rule (girl's load must not exceed the boy's) is reported as tradition records it; the balance reading is the gender-neutral equivalent. Judgment is yours.",
              "పాప = సూర్య, కుజ, శని, రాహు, కేతు 1/2/4/7/8/12 స్థానాల్లో — లగ్నం, చంద్రుడు, శుక్రుడు నుండి లెక్కిస్తారు."
            )}
          </div>
        </div>
      )}
    </div>
  );
}
