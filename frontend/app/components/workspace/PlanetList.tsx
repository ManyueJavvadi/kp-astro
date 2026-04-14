"use client";
import React from "react";
import { PLANET_COLORS } from "../constants";
import { Planet, PLANET_SYMBOLS } from "../../types/workspace";

interface PlanetListProps {
  planets: Planet[];
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function PlanetList({ planets }: PlanetListProps) {
  if (!planets || planets.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {planets.map((p, i) => {
        const color = PLANET_COLORS[p.planet_en] ?? "#888899";
        const sym   = PLANET_SYMBOLS[p.planet_en] ?? p.planet_en[0];
        const isLast = i === planets.length - 1;
        return (
          <div
            key={p.planet_en}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderBottom: isLast ? "none" : "0.5px solid rgba(255,255,255,0.05)",
              transition: "background 0.12s",
              borderRadius: i === 0 ? "12px 12px 0 0" : isLast ? "0 0 12px 12px" : 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = hexToRgba(color, 0.05))}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {/* Planet icon circle */}
            <div
              className="planet-icon"
              style={{
                width: 34,
                height: 34,
                background: hexToRgba(color, 0.15),
                border: `1px solid ${hexToRgba(color, 0.4)}`,
                color: color,
                fontSize: 15,
                flexShrink: 0,
              }}
            >
              {sym}
            </div>

            {/* Name + sign + house */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f0" }}>
                  {p.planet_en}
                </span>
                {p.retrograde && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: "#f87171",
                    background: "rgba(248,113,113,0.15)", border: "0.5px solid rgba(248,113,113,0.3)",
                    borderRadius: 4, padding: "1px 4px", lineHeight: 1.4,
                  }}>
                    ℞
                  </span>
                )}
                <span style={{ fontSize: 11, color: "#b0b0c0" }}>
                  {p.sign_en} {p.degree_in_sign.toFixed(1)}°
                </span>
                <span style={{
                  fontSize: 10, padding: "1px 6px", borderRadius: 8,
                  background: "rgba(255,255,255,0.06)", color: "#888899",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                }}>
                  H{p.house}
                </span>
              </div>
              <div style={{ fontSize: 10, color: "#666677", marginTop: 2 }}>
                {p.nakshatra_en}
              </div>
            </div>

            {/* Star Lord → Sub Lord */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: "#c9a96e", fontWeight: 500 }}>
                <span style={{ color: PLANET_COLORS[p.star_lord_en] ?? "#c9a96e" }}>
                  {p.star_lord_en}
                </span>
                <span style={{ color: "#555566", margin: "0 4px" }}>→</span>
                <span style={{ color: PLANET_COLORS[p.sub_lord_en] ?? "#c9a96e" }}>
                  {p.sub_lord_en}
                </span>
              </div>
              <div style={{ fontSize: 9, color: "#555566", marginTop: 1 }}>
                Star · Sub
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
