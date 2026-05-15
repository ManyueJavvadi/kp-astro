"use client";

/**
 * RasiChart — proper KP-convention chart renderer (PR A1.3-fix-20 / fix-21).
 *
 * Three tabs:
 *   - South Indian (canonical KP — signs FIXED, Pisces top-left, planets-by-sign)
 *   - North Indian (diamond/kite — H1 always top, signs rotate by lagna)
 *   - East Indian / Bengali (3×3 grid with split-corner triangles, mirror of N-Indian)
 *
 * fix-21 changes:
 *   - East Indian rewritten to proper 3×3 split-corner Bengali layout
 *     (4 corners diagonally split into 8 triangles + 4 edge cells = 12 zones)
 *   - Telugu rendering FIXED — uses sign_te + planet_short from backend
 *     (was using hardcoded English-only abbreviation map)
 *   - North Indian sized to fill the chart frame properly
 *   - No internal hardcoded title — parent renders title dynamically
 *
 * Drop-in replacement — same prop interface as old SouthIndianChart.
 */

import React, { useEffect, useState } from "react";
import { PLANET_COLORS } from "./constants";
import { useLanguage } from "@/lib/i18n";

type Planet = {
  planet_en: string;
  planet_te?: string;
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
// English short abbreviations (for English-mode display)
const SIGN_ABBR_EN: Record<string, string> = {
  Aries: "Ar", Taurus: "Ta", Gemini: "Ge", Cancer: "Ca",
  Leo: "Le", Virgo: "Vi", Libra: "Li", Scorpio: "Sc",
  Sagittarius: "Sg", Capricorn: "Cp", Aquarius: "Aq", Pisces: "Pi",
};
// Telugu short abbreviations (for Telugu-mode display)
// Distinct first 2-3 chars per sign (avoiding ambiguity between Vrishaba/Vrishchika)
const SIGN_ABBR_TE: Record<string, string> = {
  Aries: "మే",       // మేషం
  Taurus: "వృష",     // వృషభం
  Gemini: "మిథు",    // మిథున
  Cancer: "కర్క",    // కర్కాటకం
  Leo: "సిం",        // సింహం
  Virgo: "కన్య",     // కన్య
  Libra: "తుల",      // తుల
  Scorpio: "వృశ్చి", // వృశ్చికం
  Sagittarius: "ధను", // ధనుస్సు
  Capricorn: "మక",   // మకరం
  Aquarius: "కుం",   // కుంభం
  Pisces: "మీన",     // మీనం
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

// North Indian — house positions on the diamond/kite (CSS percentage coords)
const NORTH_HOUSE_POS: Record<number, { x: number; y: number }> = {
  1:  { x: 50, y: 25 },  // top center (Asc)
  2:  { x: 25, y: 12 },  // top-left
  3:  { x: 12, y: 25 },  // left top
  4:  { x: 25, y: 50 },  // left center
  5:  { x: 12, y: 75 },  // left bottom
  6:  { x: 25, y: 88 },  // bottom-left
  7:  { x: 50, y: 75 },  // bottom center
  8:  { x: 75, y: 88 },  // bottom-right
  9:  { x: 88, y: 75 },  // right bottom
  10: { x: 75, y: 50 },  // right center
  11: { x: 88, y: 25 },  // right top
  12: { x: 75, y: 12 },  // top-right
};

// East Indian (Bengali) — 12 zones in 3×3 grid where corners are split
// diagonally into 2 triangles (8 corner-triangles + 4 edge cells = 12).
// Each entry: position (in 3×3 grid) + which-half-of-corner (or 'edge')
type EastZone = {
  gridCell: number;   // 0..8 in 3×3 (0=top-left, 8=bottom-right)
  triangle?: "tl" | "tr" | "bl" | "br";  // which triangle within corner cell, undefined = edge
  labelPos: { x: number; y: number };  // % offset within the zone for label
};
// Houses 1..12 mapped to East Indian zones.
// Counter-clockwise from H1 at bottom-right (lower-right triangle).
const EAST_HOUSE_ZONES: Record<number, EastZone> = {
  1:  { gridCell: 8, triangle: "br", labelPos: { x: 75, y: 75 } },  // BR corner, lower-right tri
  2:  { gridCell: 8, triangle: "tl", labelPos: { x: 25, y: 25 } },  // BR corner, upper-left tri
  3:  { gridCell: 5, labelPos: { x: 50, y: 50 } },                  // mid-right edge cell
  4:  { gridCell: 2, triangle: "bl", labelPos: { x: 25, y: 75 } },  // TR corner, lower-left tri
  5:  { gridCell: 2, triangle: "tr", labelPos: { x: 75, y: 25 } },  // TR corner, upper-right tri
  6:  { gridCell: 1, labelPos: { x: 50, y: 50 } },                  // top-mid edge cell
  7:  { gridCell: 0, triangle: "tl", labelPos: { x: 25, y: 25 } },  // TL corner, upper-left tri
  8:  { gridCell: 0, triangle: "br", labelPos: { x: 75, y: 75 } },  // TL corner, lower-right tri
  9:  { gridCell: 3, labelPos: { x: 50, y: 50 } },                  // mid-left edge cell
  10: { gridCell: 6, triangle: "tr", labelPos: { x: 75, y: 25 } },  // BL corner, upper-right tri
  11: { gridCell: 6, triangle: "bl", labelPos: { x: 25, y: 75 } },  // BL corner, lower-left tri
  12: { gridCell: 7, labelPos: { x: 50, y: 50 } },                  // bottom-mid edge cell
};

export default function RasiChart({ planets, cusps, onHouseClick, selectedHouse }: Props) {
  const { lang } = useLanguage();
  const [style, setStyle] = useState<ChartStyle>("south");
  const isTelugu = lang === "te" || lang === "te_en";

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

  // Sign abbreviation lookup — Telugu when toggle is te / te_en, English otherwise
  const signAbbr = (sign: string | undefined): string => {
    if (!sign) return "";
    if (isTelugu) {
      return SIGN_ABBR_TE[sign] || sign.slice(0, 3);
    }
    return SIGN_ABBR_EN[sign] || sign.slice(0, 2);
  };

  // Planet short label — backend's planet_short is always Telugu;
  // we derive English from planet_en when in English mode.
  const planetLabel = (p: Planet): string => {
    if (isTelugu) {
      return p.planet_short || p.planet_en?.slice(0, 2) || "?";
    }
    // English mode: 2-char abbreviation from planet_en
    const en = p.planet_en || "";
    const map: Record<string, string> = {
      Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me",
      Jupiter: "Ju", Venus: "Ve", Saturn: "Sa",
      Rahu: "Ra", Ketu: "Ke",
    };
    return map[en] || en.slice(0, 2);
  };

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

  // ── Build house → planets for North + East Indian ────────────────────
  const planetsByHouse: Record<number, Planet[]> = {};
  planets.forEach((p) => {
    const h = parseInt(String(p.house)) || 0;
    if (!h) return;
    if (!planetsByHouse[h]) planetsByHouse[h] = [];
    planetsByHouse[h].push(p);
  });

  // House sign for North + East Indian (which sign sits at H1 = lagna sign)
  const lagnaSignEn = cusps[0]?.sign_en ?? "Aries";
  const lagnaSignIdx = SIGNS_EN.indexOf(lagnaSignEn);
  const houseSign: Record<number, string> = {};
  for (let h = 1; h <= 12; h++) {
    houseSign[h] = SIGNS_EN[(lagnaSignIdx + h - 1) % 12];
  }

  // ── SOUTH INDIAN sign cell renderer ──────────────────────────────────
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
          <span className="rasi-sign-abbr">{signAbbr(sign)}</span>
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
                {planetLabel(p)}
                {p.retrograde ? "℞" : ""}
                <span className="rasi-planet-deg">{deg.toFixed(0)}°</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
        <svg viewBox="0 0 100 100" className="rasi-north-svg" preserveAspectRatio="none" aria-hidden="true">
          <rect x="1" y="1" width="98" height="98" fill="none" stroke="rgba(201,169,110,0.45)" strokeWidth="0.5" />
          <line x1="1" y1="1" x2="99" y2="99" stroke="rgba(201,169,110,0.45)" strokeWidth="0.4" />
          <line x1="99" y1="1" x2="1" y2="99" stroke="rgba(201,169,110,0.45)" strokeWidth="0.4" />
          <polygon points="50,1 99,50 50,99 1,50" fill="none" stroke="rgba(201,169,110,0.45)" strokeWidth="0.5" />
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
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onClick={() => onHouseClick?.(h)}
              role="button"
              tabIndex={0}
            >
              <div className="rasi-north-head">
                <span className="rasi-north-house">{h}{isLagna ? "↑" : ""}</span>
                <span className="rasi-north-sign">{signAbbr(sign)}</span>
              </div>
              {planetsHere.length > 0 && (
                <div className="rasi-north-planets">
                  {planetsHere.slice(0, 4).map((p) => (
                    <span
                      key={p.planet_en}
                      className="rasi-planet"
                      style={{ color: PLANET_COLORS[p.planet_en] || "#888" }}
                      title={`${p.planet_en} · ${(p.degree_in_sign ?? 0).toFixed(2)}°`}
                    >
                      {planetLabel(p)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── EAST INDIAN render (Bengali 3×3 split-corners) ───────────────────
  // Houses fixed (similar to North), signs rotate. Corner cells split
  // diagonally so each corner contains 2 triangles = 2 houses.
  const renderEast = () => {
    return (
      <div className="rasi-grid rasi-grid-east">
        <svg viewBox="0 0 300 300" className="rasi-east-svg" preserveAspectRatio="none" aria-hidden="true">
          <rect x="1" y="1" width="298" height="298" fill="none" stroke="rgba(201,169,110,0.5)" strokeWidth="1" />
          {/* Internal grid lines (3×3) */}
          <line x1="100" y1="0" x2="100" y2="300" stroke="rgba(201,169,110,0.5)" strokeWidth="1" />
          <line x1="200" y1="0" x2="200" y2="300" stroke="rgba(201,169,110,0.5)" strokeWidth="1" />
          <line x1="0" y1="100" x2="300" y2="100" stroke="rgba(201,169,110,0.5)" strokeWidth="1" />
          <line x1="0" y1="200" x2="300" y2="200" stroke="rgba(201,169,110,0.5)" strokeWidth="1" />
          {/* Corner diagonals */}
          <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(201,169,110,0.5)" strokeWidth="1" />
          <line x1="300" y1="0" x2="200" y2="100" stroke="rgba(201,169,110,0.5)" strokeWidth="1" />
          <line x1="0" y1="300" x2="100" y2="200" stroke="rgba(201,169,110,0.5)" strokeWidth="1" />
          <line x1="300" y1="300" x2="200" y2="200" stroke="rgba(201,169,110,0.5)" strokeWidth="1" />
        </svg>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
          const zone = EAST_HOUSE_ZONES[h];
          const sign = houseSign[h];
          const planetsHere = planetsByHouse[h] || [];
          const isLagna = h === 1;
          const isSelected = selectedHouse === h;
          // Compute zone's grid cell origin (each cell is ~33.33%)
          const cellRow = Math.floor(zone.gridCell / 3);
          const cellCol = zone.gridCell % 3;
          // Label percentage position within the chart (0-100%)
          const labelLeft = cellCol * 33.33 + (zone.labelPos.x * 33.33) / 100;
          const labelTop = cellRow * 33.33 + (zone.labelPos.y * 33.33) / 100;
          const isEdgeCell = !zone.triangle;
          return (
            <div
              key={`eh-${h}`}
              className={`rasi-east-zone${isLagna ? " rasi-lagna" : ""}${isSelected ? " rasi-selected" : ""}${isEdgeCell ? " rasi-east-edge" : " rasi-east-tri"}`}
              style={{ left: `${labelLeft}%`, top: `${labelTop}%` }}
              onClick={() => onHouseClick?.(h)}
              role="button"
              tabIndex={0}
            >
              <div className="rasi-east-head">
                {isEdgeCell && <span className="rasi-east-sign">{signAbbr(sign)}</span>}
                <span className="rasi-east-house">{h}{isLagna ? "↑" : ""}</span>
              </div>
              {planetsHere.length > 0 && (
                <div className="rasi-east-planets">
                  {planetsHere.slice(0, 3).map((p) => (
                    <span
                      key={p.planet_en}
                      className="rasi-planet"
                      style={{ color: PLANET_COLORS[p.planet_en] || "#888" }}
                      title={`${p.planet_en} · ${(p.degree_in_sign ?? 0).toFixed(2)}°`}
                    >
                      {planetLabel(p)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Title (dynamic per active style)
  const title =
    style === "south" ? (isTelugu ? "దక్షిణ భారత చార్ట్" : "South Indian Chart") :
    style === "north" ? (isTelugu ? "ఉత్తర భారత చార్ట్" : "North Indian Chart") :
                       (isTelugu ? "తూర్పు భారత చార్ట్" : "East Indian Chart");

  return (
    <div className="rasi-chart-wrapper">
      <div className="rasi-chart-header">
        <span className="rasi-chart-title">{title}</span>
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
      </div>
      <div className="rasi-chart-frame">
        {style === "south" && renderSouth()}
        {style === "north" && renderNorth()}
        {style === "east" && renderEast()}
      </div>
      <div className="rasi-legend">
        <span className="rasi-legend-item">
          <span className="rasi-legend-dot rasi-legend-asc" /> {isTelugu ? "లగ్నం" : "Ascendant"}
        </span>
        <span className="rasi-legend-item">
          <span className="rasi-legend-dot rasi-legend-planet" /> {isTelugu ? "గ్రహాలు" : "Planets"}
        </span>
      </div>
    </div>
  );
}
