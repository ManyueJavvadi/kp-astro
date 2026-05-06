"use client";

/**
 * RasiChart — proper KP-convention chart renderer (PR A1.3-fix-20).
 *
 * Replaces the old house-cell SouthIndianChart with the canonical
 * sign-cell layout. Adds North/South/East tabs.
 *
 * KP CONVENTION (verified against KSK Reader and Tamil-Nadu KP lineage):
 *   - South Indian: 12 cells = 12 SIGNS (fixed positions). Pisces top-left,
 *     going clockwise. Planets placed in cells BY SIGN, not by house.
 *     Each cell shows: sign abbr, house number, cusp degree marker if a
 *     house cusp falls in that sign, planet abbreviations.
 *   - North Indian: 12 zones = 12 HOUSES (fixed positions, H1 top-center).
 *     Signs rotate based on lagna. Planets placed in zones BY HOUSE.
 *   - East Indian: Bengali-style square layout (Aries top-center, signs
 *     going clockwise). Less common; included for completeness.
 *
 * The previous SouthIndianChart was rendering a house-cell grid which is
 * structurally wrong for KP analysis — astrologers read sign cells first,
 * then map cusps to houses. See PR A1.3-fix-20 for diagnosis.
 *
 * Drop-in replacement — same prop interface as the old SouthIndianChart.
 */

import React, { useEffect, useState } from "react";
import { PLANET_COLORS } from "./constants";
import { useLanguage } from "@/lib/i18n";

type Planet = {
  planet_en: string;
  planet_short: string;
  house?: string | number;
  sign_en?: string;
  sign_te?: string;
  degree_in_sign?: number;
  nakshatra_en?: string;
  star_lord_en?: string;
  sub_lord_en?: string;
  retrograde?: boolean;
};

type Cusp = {
  house?: number;
  sign_en?: string;
  sign_te?: string;
  degree_in_sign?: number;
};

interface Props {
  planets: Planet[];
  cusps: Cusp[];
  onHouseClick?: (h: number) => void;
  selectedHouse?: number | null;
}

type ChartStyle = "south" | "north" | "east";

const SIGNS_EN = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];
const SIGN_ABBR_EN: Record<string, string> = {
  Aries: "Ar", Taurus: "Ta", Gemini: "Ge", Cancer: "Ca",
  Leo: "Le", Virgo: "Vi", Libra: "Li", Scorpio: "Sc",
  Sagittarius: "Sg", Capricorn: "Cp", Aquarius: "Aq", Pisces: "Pi",
};
const SIGN_ABBR_TE: Record<string, string> = {
  Aries: "మే", Taurus: "వృ", Gemini: "మి", Cancer: "క",
  Leo: "సిం", Virgo: "క్యా", Libra: "తు", Scorpio: "వృ",
  Sagittarius: "ధ", Capricorn: "మ", Aquarius: "కు", Pisces: "మీ",
};
const ROMAN: Record<number, string> = {
  1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
  7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII",
};

// South-Indian 4×4 grid positions for each sign (0=top-left, 15=bottom-right)
const SOUTH_GRID_POS: Record<string, number> = {
  Pisces: 0, Aries: 1, Taurus: 2, Gemini: 3,
  Aquarius: 4, /* center: 5,6 */ Cancer: 7,
  Capricorn: 8, /* center: 9,10 */ Leo: 11,
  Sagittarius: 12, Scorpio: 13, Libra: 14, Virgo: 15,
};

// House → grid-position for North Indian (12 zones around fixed kite)
const NORTH_HOUSE_POS: Record<number, { gridArea: string; label: { x: number; y: number } }> = {
  // gridArea applied via CSS named regions; defined in styles below
  1:  { gridArea: "h1",  label: { x: 50, y: 25 } },
  2:  { gridArea: "h2",  label: { x: 25, y: 12 } },
  3:  { gridArea: "h3",  label: { x: 12, y: 25 } },
  4:  { gridArea: "h4",  label: { x: 25, y: 50 } },
  5:  { gridArea: "h5",  label: { x: 12, y: 75 } },
  6:  { gridArea: "h6",  label: { x: 25, y: 88 } },
  7:  { gridArea: "h7",  label: { x: 50, y: 75 } },
  8:  { gridArea: "h8",  label: { x: 75, y: 88 } },
  9:  { gridArea: "h9",  label: { x: 88, y: 75 } },
  10: { gridArea: "h10", label: { x: 75, y: 50 } },
  11: { gridArea: "h11", label: { x: 88, y: 25 } },
  12: { gridArea: "h12", label: { x: 75, y: 12 } },
};

// East Indian: Aries fixed top-center, signs going clockwise
// Less common; minimal implementation
const EAST_GRID_POS: Record<string, number> = {
  Aries: 1, Taurus: 2, Gemini: 3,
  Cancer: 7, /* center 5,6 */ Leo: 11,
  Virgo: 15, Libra: 14, Scorpio: 13,
  Sagittarius: 12, /* center 9,10 */ Capricorn: 8,
  Aquarius: 4, Pisces: 0,
};

export default function RasiChart({ planets, cusps, onHouseClick, selectedHouse }: Props) {
  const { lang } = useLanguage();
  const [style, setStyle] = useState<ChartStyle>("south");

  // Persist user preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("devastroai:chartStyle");
      if (saved === "south" || saved === "north" || saved === "east") {
        setStyle(saved);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("devastroai:chartStyle", style); } catch {}
  }, [style]);

  const SIGN_ABBR = lang === "en" ? SIGN_ABBR_EN : SIGN_ABBR_TE;

  // ── Build sign → planets and sign → cusps maps (for South + East) ────
  const planetsBySign: Record<string, Planet[]> = {};
  planets.forEach((p) => {
    const s = p.sign_en;
    if (!s) return;
    if (!planetsBySign[s]) planetsBySign[s] = [];
    planetsBySign[s].push(p);
  });

  const cuspsBySign: Record<string, { house: number; degree: number }[]> = {};
  cusps.forEach((c, i) => {
    const s = c.sign_en;
    if (!s) return;
    if (!cuspsBySign[s]) cuspsBySign[s] = [];
    cuspsBySign[s].push({ house: c.house ?? i + 1, degree: c.degree_in_sign ?? 0 });
  });

  // ── Build house → planets for North Indian ───────────────────────────
  const planetsByHouse: Record<number, Planet[]> = {};
  planets.forEach((p) => {
    const h = parseInt(String(p.house)) || 0;
    if (!h) return;
    if (!planetsByHouse[h]) planetsByHouse[h] = [];
    planetsByHouse[h].push(p);
  });

  // House sign for North Indian (which sign sits at H1 = lagna sign)
  const lagnaSignEn = cusps[0]?.sign_en ?? "Aries";
  const lagnaSignIdx = SIGNS_EN.indexOf(lagnaSignEn);

  // For each house number 1..12, what sign is in that house?
  const houseSign: Record<number, string> = {};
  for (let h = 1; h <= 12; h++) {
    houseSign[h] = SIGNS_EN[(lagnaSignIdx + h - 1) % 12];
  }

  // ── Renderer for a single SOUTH/EAST sign cell ───────────────────────
  const renderSignCell = (sign: string, gridPos: number) => {
    const cuspsHere = cuspsBySign[sign] || [];
    const planetsHere = planetsBySign[sign] || [];
    const lagnaHere = cuspsHere.some((c) => c.house === 1);
    const cuspsForClick = cuspsHere.length > 0 ? cuspsHere[0].house : null;
    const isSelected = cuspsForClick != null && selectedHouse === cuspsForClick;

    return (
      <div
        key={`${sign}-${gridPos}`}
        className={`rasi-cell rasi-cell-${gridPos}${lagnaHere ? " rasi-lagna" : ""}${isSelected ? " rasi-selected" : ""}`}
        onClick={() => cuspsForClick && onHouseClick?.(cuspsForClick)}
        role={cuspsForClick ? "button" : undefined}
        tabIndex={cuspsForClick ? 0 : undefined}
      >
        <div className="rasi-cell-head">
          <span className="rasi-sign-abbr">{SIGN_ABBR[sign] || sign.slice(0, 2)}</span>
          {cuspsHere.map((c, i) => (
            <span key={`${c.house}-${i}`} className={`rasi-cusp${c.house === 1 ? " rasi-cusp-lagna" : ""}`}>
              {ROMAN[c.house]} {Math.round(c.degree)}°
            </span>
          ))}
          {lagnaHere && <span className="rasi-lagna-mark" aria-label="Lagna">↑</span>}
        </div>
        <div className="rasi-planets">
          {planetsHere.map((p) => {
            const deg = typeof p.degree_in_sign === "number" ? p.degree_in_sign : 0;
            return (
              <div
                key={p.planet_en}
                title={`${p.planet_en} · ${deg.toFixed(2)}° · Star: ${p.star_lord_en ?? "?"} · Sub: ${p.sub_lord_en ?? "?"}`}
                className="rasi-planet"
                style={{ color: PLANET_COLORS[p.planet_en] || "#888" }}
              >
                {p.planet_short}
                {p.retrograde ? "℞" : ""}
                <span className="rasi-planet-deg">{deg.toFixed(0)}°</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── SOUTH INDIAN render ──────────────────────────────────────────────
  const renderSouth = () => {
    const cells: React.ReactElement[] = [];
    const signByPos: Record<number, string> = {};
    Object.entries(SOUTH_GRID_POS).forEach(([sign, pos]) => {
      signByPos[pos] = sign;
    });
    for (let i = 0; i < 16; i++) {
      const sign = signByPos[i];
      if (sign) {
        cells.push(renderSignCell(sign, i));
      } else {
        // Empty center cell
        const isCenterCorner = (i === 5 || i === 6 || i === 9 || i === 10);
        cells.push(
          <div key={`empty-${i}`} className="rasi-cell rasi-cell-empty">
            {i === 5 && <span className="rasi-center-mark">✦</span>}
          </div>
        );
      }
    }
    return <div className="rasi-grid rasi-grid-south">{cells}</div>;
  };

  // ── NORTH INDIAN render (kite/diamond) ───────────────────────────────
  const renderNorth = () => {
    return (
      <div className="rasi-grid rasi-grid-north">
        <svg viewBox="0 0 100 100" className="rasi-north-svg" aria-hidden="true">
          {/* Outer rectangle */}
          <rect x="2" y="2" width="96" height="96" fill="none" stroke="rgba(201,169,110,0.35)" strokeWidth="0.4" />
          {/* Outer diagonals */}
          <line x1="2" y1="2" x2="98" y2="98" stroke="rgba(201,169,110,0.35)" strokeWidth="0.3" />
          <line x1="98" y1="2" x2="2" y2="98" stroke="rgba(201,169,110,0.35)" strokeWidth="0.3" />
          {/* Inner diamond */}
          <polygon points="50,2 98,50 50,98 2,50" fill="none" stroke="rgba(201,169,110,0.35)" strokeWidth="0.4" />
        </svg>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
          const sign = houseSign[h];
          const planetsHere = planetsByHouse[h] || [];
          const isLagna = h === 1;
          const isSelected = selectedHouse === h;
          const pos = NORTH_HOUSE_POS[h];
          return (
            <div
              key={`nh-${h}`}
              className={`rasi-north-zone${isLagna ? " rasi-lagna" : ""}${isSelected ? " rasi-selected" : ""}`}
              style={{ left: `${pos.label.x}%`, top: `${pos.label.y}%` }}
              onClick={() => onHouseClick?.(h)}
              role="button"
              tabIndex={0}
            >
              <div className="rasi-north-head">
                <span className="rasi-north-house">{h}{isLagna ? "↑" : ""}</span>
                <span className="rasi-north-sign">{SIGN_ABBR[sign] || sign?.slice(0, 2)}</span>
              </div>
              <div className="rasi-north-planets">
                {planetsHere.slice(0, 4).map((p) => (
                  <span
                    key={p.planet_en}
                    className="rasi-planet"
                    style={{ color: PLANET_COLORS[p.planet_en] || "#888" }}
                    title={`${p.planet_en} · ${(p.degree_in_sign ?? 0).toFixed(2)}°`}
                  >
                    {p.planet_short}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── EAST INDIAN render (similar to South but with Aries top-center) ──
  const renderEast = () => {
    const cells: React.ReactElement[] = [];
    const signByPos: Record<number, string> = {};
    Object.entries(EAST_GRID_POS).forEach(([sign, pos]) => {
      signByPos[pos] = sign;
    });
    for (let i = 0; i < 16; i++) {
      const sign = signByPos[i];
      if (sign) {
        cells.push(renderSignCell(sign, i));
      } else {
        cells.push(
          <div key={`empty-${i}`} className="rasi-cell rasi-cell-empty">
            {i === 5 && <span className="rasi-center-mark">✦</span>}
          </div>
        );
      }
    }
    return <div className="rasi-grid rasi-grid-east">{cells}</div>;
  };

  return (
    <div className="rasi-chart-wrapper">
      <div className="rasi-tabs" role="tablist">
        {(["south", "north", "east"] as ChartStyle[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={style === s}
            className={`rasi-tab${style === s ? " is-active" : ""}`}
            onClick={() => setStyle(s)}
          >
            {s === "south" ? "South" : s === "north" ? "North" : "East"}
          </button>
        ))}
      </div>
      <div className="rasi-chart-frame">
        {style === "south" && renderSouth()}
        {style === "north" && renderNorth()}
        {style === "east" && renderEast()}
      </div>
      <div className="rasi-legend">
        <span className="rasi-legend-item">
          <span className="rasi-legend-dot rasi-legend-asc" /> Ascendant
        </span>
        <span className="rasi-legend-item">
          <span className="rasi-legend-dot rasi-legend-planet" /> Planets
        </span>
      </div>
    </div>
  );
}
