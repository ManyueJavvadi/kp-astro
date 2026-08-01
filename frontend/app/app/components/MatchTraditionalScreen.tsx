"use client";
/**
 * MatchTraditionalScreen — PR A1.13b (2026-08-01)
 *
 * The four traditional per-chart screens an astrologer runs on each
 * horoscope BEFORE compatibility:
 *
 *   1. Chart strength        — lagna & lagna lord, Venus condition
 *   2. Mental / emotional    — Moon, Mercury, Jupiter afflictions
 *   3. Progeny               — 5th house & lord, Jupiter (putra dosha)
 *   4. Longevity indicators  — plus the cross-chart balance
 *
 * METHODOLOGY LABEL (deliberate): these are Parashari techniques on
 * whole-sign houses, NOT KP. They are presented BESIDE the KP verdict and
 * explicitly labelled, never blended into it — the app's KP reading stays
 * primary. Mixing the two silently would be the thing a serious KP
 * astrologer would object to.
 *
 * Two hard framing rules carried from the engine:
 *   - the mental screen is classical affliction patterns, NEVER a clinical
 *     or psychological assessment;
 *   - the progeny screen is a tendency, NEVER a statement that someone
 *     cannot have children.
 */
import { useLanguage } from "@/lib/i18n";

type Screen = {
  level?: string;
  band?: string;
  concerns?: string[];
  supports?: string[];
  note?: string;
  disclaimer?: string;
  putra_dosha?: boolean;
};

type IndividualScreen = {
  chart_strength?: Screen;
  mental_stability?: Screen;
  progeny?: Screen;
  longevity_indicators?: Screen;
  methodology_note?: string;
};

type Props = {
  p1?: IndividualScreen | null;
  p2?: IndividualScreen | null;
  p1Name?: string;
  p2Name?: string;
  longevityBalance?: { balanced?: boolean; note?: string; disclaimer?: string } | null;
};

const GREEN = "#34d399";
const AMBER = "#fbbf24";
const RED = "#f87171";
const MUTED = "var(--muted)";

/** Colour by how many classical concerns fired — never by a raw verdict word. */
function levelColor(level?: string, concernCount = 0): string {
  const l = (level || "").toLowerCase();
  if (l.includes("no classical") || l === "sound" || l.includes("few")) return GREEN;
  if (l.includes("multiple") || l === "weak") return RED;
  if (concernCount >= 2) return AMBER;
  if (concernCount === 1) return AMBER;
  return GREEN;
}

function ScreenBlock({ title, screen }: { title: string; screen?: Screen }) {
  if (!screen) return null;
  const concerns = screen.concerns ?? [];
  const supports = screen.supports ?? [];
  const label = screen.level || screen.band || "—";
  const color = levelColor(label, concerns.length);

  return (
    <div style={{ padding: "9px 0", borderTop: "0.5px solid var(--border2)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11.5, color: "var(--text)" }}>{title}</span>
        <span
          style={{
            fontSize: 9.5, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
            background: `${color}18`, border: `0.5px solid ${color}55`, color,
            whiteSpace: "nowrap", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
      </div>
      {concerns.length > 0 && (
        <ul style={{ margin: "4px 0 0", paddingLeft: 14 }}>
          {concerns.slice(0, 4).map((c, i) => (
            <li key={i} style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.55 }}>{c}</li>
          ))}
        </ul>
      )}
      {supports.length > 0 && (
        <ul style={{ margin: "3px 0 0", paddingLeft: 14 }}>
          {supports.slice(0, 2).map((s, i) => (
            <li key={i} style={{ fontSize: 10.5, color: GREEN, lineHeight: 1.55, opacity: 0.85 }}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PersonColumn({
  name, color, screen,
}: { name: string; color: string; screen?: IndividualScreen | null }) {
  const { t } = useLanguage();
  if (!screen) return null;
  return (
    <div className="match-section" style={{ padding: "13px 14px" }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color, marginBottom: 2 }}>{name}</div>
      <ScreenBlock title={t("Chart strength", "జాతక బలం")} screen={screen.chart_strength} />
      <ScreenBlock title={t("Mind & emotional steadiness", "మనస్సు & స్థిరత్వం")} screen={screen.mental_stability} />
      <ScreenBlock title={t("Progeny (santana)", "సంతానం")} screen={screen.progeny} />
      <ScreenBlock title={t("Longevity indicators", "ఆయుష్షు సూచనలు")} screen={screen.longevity_indicators} />
    </div>
  );
}

export default function MatchTraditionalScreen({
  p1, p2, p1Name = "Person 1", p2Name = "Person 2", longevityBalance,
}: Props) {
  const { t } = useLanguage();
  if (!p1 && !p2) return null;

  return (
    <div className="match-section" style={{ padding: "16px" }}>
      <div className="match-section-title" style={{ marginBottom: 4 }}>
        {t("Traditional per-chart screen", "సాంప్రదాయ జాతక పరిశీలన")}
      </div>
      <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.6, marginBottom: 12 }}>
        {t(
          "Parashari layer on whole-sign houses — shown beside the KP verdict, never blended into it. Structural tendencies for your judgement, not conclusions.",
          "పరాశరీ పద్ధతి (రాశి ఆధారంగా) — KP తీర్పు పక్కన చూపిస్తున్నాం, కలపడం లేదు. ఇవి నిర్ధారణలు కావు."
        )}
      </div>

      <div className="match-section-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <PersonColumn name={p1Name} color="var(--accent)" screen={p1} />
        <PersonColumn name={p2Name} color="#93c5fd" screen={p2} />
      </div>

      {longevityBalance && (
        <div
          style={{
            marginTop: 12, padding: "10px 13px", borderRadius: 8,
            background: "rgba(255,255,255,0.015)",
            border: `0.5px solid ${longevityBalance.balanced ? `${GREEN}44` : `${AMBER}55`}`,
            fontSize: 11, color: "var(--text)", lineHeight: 1.6,
          }}
        >
          <b style={{ color: longevityBalance.balanced ? GREEN : AMBER }}>
            {t("Longevity balance", "ఆయుష్షు సమతుల్యత")}:
          </b>{" "}
          {longevityBalance.note}
          {longevityBalance.disclaimer && (
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4, fontStyle: "italic" }}>
              {longevityBalance.disclaimer}
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 10, color: MUTED, marginTop: 10, fontStyle: "italic", lineHeight: 1.55 }}>
        {t(
          "The mind screen reports classical affliction patterns only — it is not a clinical or psychological assessment. The progeny screen is a structural tendency, not a statement that a person cannot have children. Longevity shows indicators only; no Ayurdaya lifespan figure is computed.",
          "మనస్సు విభాగం సాంప్రదాయ సూచనలు మాత్రమే — వైద్య నిర్ధారణ కాదు. సంతాన విభాగం ధోరణి మాత్రమే."
        )}
      </div>
    </div>
  );
}
