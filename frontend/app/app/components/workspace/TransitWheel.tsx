"use client";
import React from "react";
import { PLANET_COLORS } from "../constants";

// Astrological Constants
const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓"
};

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mars: "♂", Mercury: "☿", Jupiter: "♃", Venus: "♀", Saturn: "♄", Rahu: "☊", Ketu: "☋"
};

interface TransitWheelProps {
  natalPlanets: any[];
  natalCusps: any[];
  transitPlanets: any[];
}

export default function TransitWheel({ natalPlanets, natalCusps, transitPlanets }: TransitWheelProps) {
  const cx = 200;
  const cy = 200;
  const rNatal = 90;
  const rZodiac = 130;
  const rTransit = 170;

  // Convert sign + degree to absolute 360-degree longitude
  const getAbsLong = (signName: string, degree: number): number => {
    // Handle backend returning signName with different casings
    const cleanSign = cleanSignName(signName);
    const idx = ZODIAC_SIGNS.indexOf(cleanSign);
    return idx === -1 ? 0 : idx * 30 + degree;
  };

  const cleanSignName = (name: string): string => {
    if (!name) return "Aries";
    const titleCase = name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase();
    return ZODIAC_SIGNS.includes(titleCase) ? titleCase : "Aries";
  };

  // Convert degree to SVG Cartesian coordinates
  const getCoords = (radius: number, degree: number) => {
    // 0 deg Aries starts at the top (270 deg mathematically) and goes counter-clockwise or clockwise.
    // Astrological charts usually go counter-clockwise starting from the East (left or top).
    // Let's make it start at 180 degrees (left side) and go counter-clockwise to match Indian chart style.
    const angleInRadians = (180 - degree) * Math.PI / 180.0;
    return {
      x: cx + radius * Math.cos(angleInRadians),
      y: cy + radius * Math.sin(angleInRadians)
    };
  };

  const cleanNatalPlanets = (natalPlanets || []).map(p => {
    const planetEn = p.planet_en || p.planet;
    // Lon is either longitude or degree_in_sign
    const deg = p.degree_in_sign || p.longitude || 0;
    const absLong = getAbsLong(p.sign_en || p.sign, deg);
    return {
      name: planetEn,
      glyph: PLANET_GLYPHS[planetEn] || planetEn[0],
      color: PLANET_COLORS[planetEn] || "#fff",
      absLong,
      coords: getCoords(rNatal, absLong)
    };
  });

  const cleanTransitPlanets = (transitPlanets || []).map(p => {
    const planetEn = p.planet || p.planet_en;
    const deg = p.degree_in_sign || p.longitude || 0;
    const absLong = getAbsLong(p.sign || p.sign_en, deg);
    return {
      name: planetEn,
      glyph: PLANET_GLYPHS[planetEn] || planetEn[0],
      color: PLANET_COLORS[planetEn] || "#fff",
      absLong,
      coords: getCoords(rTransit, absLong),
      isDasha: p.is_dasha_lord,
      isBhukti: p.is_bhukti_lord
    };
  });

  const cleanCusps = (natalCusps || []).map((c, i) => {
    const deg = c.degree_in_sign || 0;
    const absLong = getAbsLong(c.sign_en || c.sign, deg);
    return {
      num: c.house_num || (i + 1),
      absLong,
      coordsInner: getCoords(rNatal - 15, absLong),
      coordsOuter: getCoords(rZodiac, absLong)
    };
  });

  // Identify active conjunctions (within 3.33 degrees) between transit and natal planets
  const activeConjunctions: any[] = [];
  cleanTransitPlanets.forEach(tp => {
    cleanNatalPlanets.forEach(np => {
      let diff = Math.abs(tp.absLong - np.absLong);
      if (diff > 180) diff = 360 - diff;
      if (diff <= 3.33) {
        activeConjunctions.push({ tp, np, diff });
      }
    });
  });

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      background: "rgba(13, 13, 22, 0.4)",
      border: "0.5px solid rgba(201, 169, 110, 0.15)",
      borderRadius: 16,
      padding: "20px 14px",
      boxShadow: "inset 0 0 20px rgba(201, 169, 110, 0.05)",
      width: "100%",
      maxWidth: 440,
      margin: "0 auto"
    }}>
      <div style={{ position: "relative", width: 400, height: 400 }}>
        <svg viewBox="0 0 400 400" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="nebula" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e183a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#08060f" stopOpacity="0.9" />
            </radialGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComponentTransfer in="blur" result="glow1">
                <feFuncA type="linear" slope="0.8"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Deep space cosmic center circle */}
          <circle cx={cx} cy={cy} r={rTransit} fill="url(#nebula)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

          {/* Concentric rings */}
          <circle cx={cx} cy={cy} r={rTransit} fill="none" stroke="rgba(201, 169, 110, 0.12)" strokeWidth="2" />
          <circle cx={cx} cy={cy} r={rZodiac} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={rNatal} fill="none" stroke="rgba(201, 169, 110, 0.22)" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r={rNatal - 15} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

          {/* 12 Zodiac sign segments */}
          {ZODIAC_SIGNS.map((sign, idx) => {
            const startAngle = idx * 30;
            const endAngle = (idx + 1) * 30;
            const lineCoords = getCoords(rTransit, startAngle);
            const labelCoords = getCoords(rZodiac - 18, startAngle + 15);
            return (
              <g key={sign}>
                {/* Boundary line between signs */}
                <line
                  x1={getCoords(rNatal, startAngle).x}
                  y1={getCoords(rNatal, startAngle).y}
                  x2={getCoords(rTransit, startAngle).x}
                  y2={getCoords(rTransit, startAngle).y}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth="0.5"
                />
                {/* Zodiac Symbol Glyph in the ring */}
                <text
                  x={labelCoords.x}
                  y={labelCoords.y}
                  fill="rgba(201, 169, 110, 0.4)"
                  fontSize="12"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="'DM Sans', sans-serif"
                >
                  {SIGN_SYMBOLS[sign]}
                </text>
              </g>
            );
          })}

          {/* Natal House Cusps spokes */}
          {cleanCusps.map((cusp) => (
            <g key={cusp.num}>
              <line
                x1={cusp.coordsInner.x}
                y1={cusp.coordsInner.y}
                x2={cusp.coordsOuter.x}
                y2={cusp.coordsOuter.y}
                stroke="rgba(201, 169, 110, 0.25)"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              {/* House label on the cusp boundary */}
              <text
                x={getCoords(rNatal - 22, cusp.absLong).x}
                y={getCoords(rNatal - 22, cusp.absLong).y}
                fill="#c9a96e"
                fontSize="8"
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="central"
              >
                H{cusp.num}
              </text>
            </g>
          ))}

          {/* Conjunction connector glow lines */}
          {activeConjunctions.map((conj, idx) => (
            <g key={idx}>
              <line
                x1={conj.np.coords.x}
                y1={conj.np.coords.y}
                x2={conj.tp.coords.x}
                y2={conj.tp.coords.y}
                stroke="#c9a96e"
                strokeWidth="2.5"
                strokeOpacity="0.8"
                filter="url(#glow-gold)"
              />
              <line
                x1={conj.np.coords.x}
                y1={conj.np.coords.y}
                x2={conj.tp.coords.x}
                y2={conj.tp.coords.y}
                stroke="#fff"
                strokeWidth="0.75"
                strokeOpacity="0.9"
              />
            </g>
          ))}

          {/* Natal Planets (Inner Ring) */}
          {cleanNatalPlanets.map((np) => (
            <g key={np.name}>
              {/* Placement Dot */}
              <circle cx={np.coords.x} cy={np.coords.y} r="2" fill={np.color} />
              {/* Planet Icon glyph inside a small circular card */}
              <circle
                cx={getCoords(rNatal - 8, np.absLong).x}
                cy={getCoords(rNatal - 8, np.absLong).y}
                r="7"
                fill="rgba(8, 6, 15, 0.9)"
                stroke={`${np.color}40`}
                strokeWidth="0.5"
              />
              <text
                x={getCoords(rNatal - 8, np.absLong).x}
                y={getCoords(rNatal - 8, np.absLong).y}
                fill={np.color}
                fontSize="9"
                textAnchor="middle"
                dominantBaseline="central"
                style={{ cursor: "default" }}
              >
                {np.glyph}
                <title>{`${np.name} (Natal) at ${np.absLong.toFixed(1)}°`}</title>
              </text>
            </g>
          ))}

          {/* Transit Planets (Outer Ring) */}
          {cleanTransitPlanets.map((tp) => {
            const isSpotlight = tp.isDasha || tp.isBhukti;
            return (
              <g key={tp.name}>
                {/* Placement Dot */}
                <circle cx={tp.coords.x} cy={tp.coords.y} r="2.5" fill={tp.color} />
                
                {/* Planet Circle with dasha/bhukti gold glow */}
                <circle
                  cx={getCoords(rTransit + 10, tp.absLong).x}
                  cy={getCoords(rTransit + 10, tp.absLong).y}
                  r="9"
                  fill="rgba(18, 18, 28, 0.9)"
                  stroke={isSpotlight ? "#c9a96e" : `${tp.color}50`}
                  strokeWidth={isSpotlight ? "1.5" : "0.5"}
                  filter={isSpotlight ? "url(#glow)" : undefined}
                />
                
                <text
                  x={getCoords(rTransit + 10, tp.absLong).x}
                  y={getCoords(rTransit + 10, tp.absLong).y}
                  fill={isSpotlight ? "#c9a96e" : tp.color}
                  fontSize="11"
                  fontWeight={isSpotlight ? "bold" : "normal"}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ cursor: "default" }}
                >
                  {tp.glyph}
                  <title>{`${tp.name} (Transit) at ${tp.absLong.toFixed(1)}°${tp.isDasha ? ' [MD Lord]' : ''}${tp.isBhukti ? ' [AD Lord]' : ''}`}</title>
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend & Conjunction Info */}
      <div style={{ width: "100%", fontSize: 11, color: "var(--muted)" }}>
        {activeConjunctions.length > 0 ? (
          <div>
            <div style={{ color: "var(--accent)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#c9a96e", display: "inline-block", boxShadow: "0 0 6px #c9a96e" }}></span>
              Active Conjunctions (&lt; 3.33°)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {activeConjunctions.map((conj, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.02)", padding: "4px 8px", borderRadius: 4 }}>
                  <span>
                    Transit <span style={{ color: conj.tp.color, fontWeight: 600 }}>{conj.tp.name}</span> over natal <span style={{ color: conj.np.color, fontWeight: 600 }}>{conj.np.name}</span>
                  </span>
                  <span style={{ color: "var(--accent)" }}>Δ {conj.diff.toFixed(2)}°</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", fontStyle: "italic", opacity: 0.8, padding: "4px 0" }}>
            No planets within 3.33° natal conjunction today.
          </div>
        )}
      </div>
    </div>
  );
}
