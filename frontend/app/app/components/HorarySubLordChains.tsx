"use client";
/**
 * PR A1.1e — Sub-lord chains for the three most load-bearing positions:
 *   • Lagna  (Prashna Ascendant)
 *   • Moon   (chief significator of the mind)
 *   • Primary-house CSL (the Layer-2 gate)
 *
 * Each chain shows: Planet → Star Lord → Sub Lord, visualised as a
 * horizontal cascade with arrows. A KP astrologer reads these at a
 * glance — "where does this position's energy actually flow to?"
 *
 * Data source: horary response fields
 *   - r.lagna.{star_lord, sub_lord}
 *   - r.moon_analysis.{star_lord, sub_lord}
 *   - r.verdict.query_csl + each planet's {star_lord, sub_lord}
 */
import { ArrowRight } from "lucide-react";
import { PLANET_COLORS } from "./constants";

type PlanetRow = {
  planet: string;
  sign?: string;
  nakshatra?: string;
  star_lord?: string;
  sub_lord?: string;
  house?: number;
};

type Props = {
  planets: PlanetRow[];
  lagna?: { sign?: string; nakshatra?: string; star_lord?: string; sub_lord?: string };
  moon?: { moon_sign?: string; moon_nakshatra?: string; star_lord?: string; sub_lord?: string };
  primaryCsl?: string;
  primaryHouse?: number;
};

function chainLink(name: string, color: string, note?: string) {
  return (
    <span className="horary-chain-node" title={note}>
      <span className="horary-chain-name" style={{ color }}>{name}</span>
      {note && <span className="horary-chain-note">{note}</span>}
    </span>
  );
}

export default function HorarySubLordChains({ planets, lagna, moon, primaryCsl, primaryHouse }: Props) {
  const chains: { title: string; node: string; color: string; star: string; sub: string; context: string }[] = [];

  // 1. Lagna chain
  if (lagna?.star_lord && lagna?.sub_lord) {
    chains.push({
      title: "Prashna Lagna",
      node: lagna.sign ?? "—",
      color: "var(--accent)",
      star: lagna.star_lord,
      sub: lagna.sub_lord,
      context: lagna.nakshatra ? `${lagna.nakshatra}` : "",
    });
  }

  // 2. Moon chain
  if (moon?.star_lord && moon?.sub_lord) {
    chains.push({
      title: "Moon",
      node: moon.moon_sign ?? "—",
      color: PLANET_COLORS["Moon"] ?? "#a0c4ff",
      star: moon.star_lord,
      sub: moon.sub_lord,
      context: moon.moon_nakshatra ? `${moon.moon_nakshatra}` : "",
    });
  }

  // 3. Primary-house CSL chain (only if distinct from Lagna/Moon sub)
  if (primaryCsl) {
    const cslPlanet = (planets ?? []).find(p => p.planet === primaryCsl);
    if (cslPlanet?.star_lord && cslPlanet?.sub_lord) {
      chains.push({
        title: `H${primaryHouse ?? ""} CSL`,
        node: primaryCsl,
        color: PLANET_COLORS[primaryCsl] ?? "var(--accent)",
        star: cslPlanet.star_lord,
        sub: cslPlanet.sub_lord,
        context: cslPlanet.nakshatra ?? "",
      });
    }
  }

  if (chains.length === 0) return null;

  return (
    <div className="horary-chains-card">
      <div className="horary-chains-head">
        <div className="horary-chains-eyebrow">Sub-lord chains</div>
        <div className="horary-chains-sub">
          Where each key position&apos;s energy flows. Planet → star lord → sub lord;
          the sub lord carries the verdict weight in KP.
        </div>
      </div>
      <div className="horary-chains-list">
        {chains.map(c => {
          // PR A1.1f — flag collapsed chain: when star lord == sub lord,
          // the entire cascade simplifies to a single planet's influence
          // at the given position. Astrologer's shorthand: "fully ruled
          // by X". Worth explicitly noting so the visual repetition
          // doesn't read as a rendering glitch.
          const isCollapsed = c.star && c.sub && c.star === c.sub;
          return (
            <div key={c.title} className={`horary-chain-row${isCollapsed ? " is-collapsed" : ""}`}>
              <span className="horary-chain-label">{c.title}</span>
              <span className="horary-chain-flow">
                {chainLink(c.node, c.color, c.context || undefined)}
                <ArrowRight size={11} className="horary-chain-arrow" />
                {chainLink(c.star, PLANET_COLORS[c.star] ?? "var(--text)", "Star Lord")}
                <ArrowRight size={11} className="horary-chain-arrow" />
                {chainLink(c.sub, PLANET_COLORS[c.sub] ?? "var(--accent)", "Sub Lord · carries the verdict")}
                {isCollapsed && (
                  <span className="horary-chain-collapsed" title="Star lord and sub lord are the same planet — the entire chain is governed by this one planet.">
                    fully ruled by {c.sub}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
