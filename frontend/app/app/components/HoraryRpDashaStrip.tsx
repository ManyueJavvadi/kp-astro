"use client";
/**
 * PR A1.1e — RP × Dasha timing strip.
 *
 * Joins the horary verdict with the native's Vimshottari dasha tree to
 * tell the astrologer *when* each Ruling Planet becomes active. If a RP
 * is also signifying the topic (engine's rp_signifying_yes), we show
 * the upcoming MD/AD/PAD windows it governs — and mark the one that's
 * currently running.
 *
 * Data sources:
 *   - horary response: ruling_planets, rp_signifying_yes
 *   - workspace:       dashas[], antardashas[], pratyantardashas[]
 *
 * Why this matters: PARTIAL verdicts often resolve when an RP becomes
 * dasha/bhukti lord. KSK: watch the dasha of a planet that is both
 * a significator AND an RP for timing.
 */
import { PLANET_COLORS } from "./constants";

type Period = {
  lord?: string;
  lord_en?: string;
  lord_te?: string;
  start?: string;
  end?: string;
  is_current?: boolean;
};

type Props = {
  rulingPlanets: string[];
  rpSignifyingYes?: string[];
  dashas?: Period[];         // MD list
  antardashas?: Period[];    // AD within current MD
  pratyantardashas?: Period[]; // PAD within current AD
};

function lord(p?: Period): string {
  return p?.lord ?? p?.lord_en ?? p?.lord_te ?? "";
}

function fmtDate(s?: string): string {
  if (!s) return "—";
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export default function HoraryRpDashaStrip({
  rulingPlanets,
  rpSignifyingYes,
  dashas,
  antardashas,
  pratyantardashas,
}: Props) {
  if (!rulingPlanets || rulingPlanets.length === 0) return null;
  if (!dashas && !antardashas) return null;

  const today = new Date();
  const yesSet = new Set(rpSignifyingYes ?? []);

  // For each RP, find the NEXT occurrence in each level.
  type RpTiming = {
    planet: string;
    signifiesTopic: boolean;
    md?: Period;
    mdRunning?: boolean;
    ad?: Period;
    adRunning?: boolean;
    pad?: Period;
    padRunning?: boolean;
  };

  const rows: RpTiming[] = rulingPlanets.map(planet => {
    const md = (dashas ?? []).find(d => lord(d) === planet && new Date(d.end ?? "").getTime() >= today.getTime());
    const ad = (antardashas ?? []).find(a => lord(a) === planet && new Date(a.end ?? "").getTime() >= today.getTime());
    const pad = (pratyantardashas ?? []).find(p => lord(p) === planet && new Date(p.end ?? "").getTime() >= today.getTime());
    return {
      planet,
      signifiesTopic: yesSet.has(planet),
      md,
      mdRunning: md?.is_current ?? false,
      ad,
      adRunning: ad?.is_current ?? false,
      pad,
      padRunning: pad?.is_current ?? false,
    };
  });

  // Only render if at least one RP has SOME timing data.
  if (!rows.some(r => r.md || r.ad || r.pad)) return null;

  return (
    <div className="horary-rp-dasha-card">
      <div className="horary-rp-dasha-head">
        <div className="horary-rp-dasha-eyebrow">Ruling Planets × Vimshottari timing</div>
        <div className="horary-rp-dasha-sub">
          When each Ruling Planet next governs a dasha period in your chart.
          Planets that <strong>both</strong> signify the topic <strong>and</strong> become MD/AD/PAD
          are the strongest timing candidates.
        </div>
      </div>
      <div className="horary-rp-dasha-rows">
        {rows.map(row => {
          const topicPlus = row.signifiesTopic;
          return (
            <div key={row.planet} className={`horary-rp-dasha-row${topicPlus ? " signifies-topic" : ""}`}>
              <span
                className="horary-rp-dasha-planet"
                style={{ color: PLANET_COLORS[row.planet] ?? "var(--accent)" }}
              >
                {row.planet}
                {topicPlus && <span className="horary-rp-dasha-star" title="Signifies the topic yes-houses">★</span>}
              </span>
              <span className="horary-rp-dasha-cells">
                <span className={`horary-rp-dasha-cell${row.mdRunning ? " is-current" : ""}${!row.md ? " is-empty" : ""}`}>
                  <span className="horary-rp-dasha-tag">MD</span>
                  {row.md ? (
                    <span>
                      {fmtDate(row.md.start)} <span className="horary-rp-dasha-arrow">→</span> {fmtDate(row.md.end)}
                    </span>
                  ) : <span className="horary-rp-dasha-none">—</span>}
                  {row.mdRunning && <span className="horary-rp-dasha-now">NOW</span>}
                </span>
                <span className={`horary-rp-dasha-cell${row.adRunning ? " is-current" : ""}${!row.ad ? " is-empty" : ""}`}>
                  <span className="horary-rp-dasha-tag">AD</span>
                  {row.ad ? (
                    <span>
                      {fmtDate(row.ad.start)} <span className="horary-rp-dasha-arrow">→</span> {fmtDate(row.ad.end)}
                    </span>
                  ) : <span className="horary-rp-dasha-none">—</span>}
                  {row.adRunning && <span className="horary-rp-dasha-now">NOW</span>}
                </span>
                <span className={`horary-rp-dasha-cell${row.padRunning ? " is-current" : ""}${!row.pad ? " is-empty" : ""}`}>
                  <span className="horary-rp-dasha-tag">PAD</span>
                  {row.pad ? (
                    <span>
                      {fmtDate(row.pad.start)} <span className="horary-rp-dasha-arrow">→</span> {fmtDate(row.pad.end)}
                    </span>
                  ) : <span className="horary-rp-dasha-none">—</span>}
                  {row.padRunning && <span className="horary-rp-dasha-now">NOW</span>}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
