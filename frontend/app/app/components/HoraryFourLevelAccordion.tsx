"use client";
/**
 * PR A1.1d — 4-level significator accordion.
 * Lets the astrologer pick any house (H1-H12) and see every planet that
 * signifies it at each KP level (L1=strongest -> L4=weakest). Reads from
 * each planet's `significations_by_level` in the horary response.
 *
 * Complements the existing "Who carries H{primary}?" card which shows
 * only the primary topic house. This one is for "what about H7?" questions.
 */
import { useMemo, useState } from "react";
import { PLANET_COLORS } from "./constants";

type PlanetRow = {
  planet: string;
  significations_by_level?: Record<string, number[]>;
  is_ruling_planet?: boolean;
};

export default function HoraryFourLevelAccordion({
  planets,
  rulingPlanets,
  defaultHouse = 1,
}: {
  planets: PlanetRow[];
  rulingPlanets: string[];
  defaultHouse?: number;
}) {
  const [house, setHouse] = useState(defaultHouse);
  const [open, setOpen] = useState(false);

  const rpSet = useMemo(() => new Set(rulingPlanets ?? []), [rulingPlanets]);

  // For each planet, find the strongest level reached for `house` plus any other levels hit.
  const rows = useMemo(() => {
    return (planets ?? [])
      .map(p => {
        const byLevel = p.significations_by_level ?? {};
        const levelsHit: number[] = [];
        for (const lvl of [1, 2, 3, 4]) {
          const arr = (byLevel[String(lvl)] as number[] | undefined) ?? [];
          if (arr.includes(house)) levelsHit.push(lvl);
        }
        if (levelsHit.length === 0) return null;
        return {
          planet: p.planet,
          levelsHit,
          strongest: levelsHit[0],
          isRP: rpSet.has(p.planet),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.strongest - b.strongest || (a.isRP ? -1 : 1));
  }, [planets, house, rpSet]);

  return (
    <div className="horary-fourlevel-card">
      <button
        type="button"
        className="horary-fourlevel-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="horary-fourlevel-eyebrow">Any-house significators · 4-level view</span>
        <span className="horary-fourlevel-chev" aria-hidden>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="horary-fourlevel-body">
          <div className="horary-fourlevel-sub">
            Pick any house to see every planet that signifies it, ranked by KP level
            (L1 strongest → L4 weakest). RP = currently a Ruling Planet.
          </div>
          <div className="horary-fourlevel-housebar">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
              <button
                key={h}
                type="button"
                className={`horary-fourlevel-house${h === house ? " is-active" : ""}`}
                onClick={() => setHouse(h)}
              >
                H{h}
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <div className="horary-fourlevel-empty">
              No planet in this chart signifies H{house} at any KP level.
            </div>
          ) : (
            <div className="horary-fourlevel-rows">
              {rows.map(row => (
                <div key={row.planet} className={`horary-fourlevel-row${row.isRP ? " is-rp" : ""}`}>
                  <span className="horary-fourlevel-planet" style={{ color: PLANET_COLORS[row.planet] ?? "var(--text)" }}>
                    {row.planet}
                  </span>
                  <span className="horary-fourlevel-levels">
                    {row.levelsHit.map(lvl => (
                      <span key={lvl} className={`horary-fourlevel-level L${lvl}`}>L{lvl}</span>
                    ))}
                  </span>
                  {row.isRP && <span className="horary-fourlevel-rp">RP</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
