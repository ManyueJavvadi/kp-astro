"use client";
import React, { useState, useEffect } from "react";
import { PLANET_COLORS } from "./constants";
import { useLanguage } from "@/lib/i18n";
// PR Phase 9.3 — global SelectionContext for cross-component brushing.
// Tap a planet glyph here → SelectionContext updates → PlanetList +
// future drawer + future glow all react. Tap a house cell continues
// to fire the existing onHouseClick prop (parent decides what to do)
// because the parent ALSO calls setSelectedHouse which goes through
// SelectionContext via the Phase 9.1 adapter.
import { useSelection } from "../lib/selection";

export default function SouthIndianChart({ planets, cusps, onHouseClick, selectedHouse }: { planets: any[]; cusps: any[]; onHouseClick?: (h: number) => void; selectedHouse?: number | null }) {
  const { lang } = useLanguage();
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const { selected, select } = useSelection();
  const selectedPlanet = selected?.type === "planet" ? selected.value : null;

  useEffect(() => {
    const handlePlanetHover = (e: Event) => {
      const customEvent = e as CustomEvent;
      setHoveredPlanet(customEvent.detail?.planet ?? null);
    };
    window.addEventListener("planet-hover", handlePlanetHover);
    return () => {
      window.removeEventListener("planet-hover", handlePlanetHover);
    };
  }, []);

  const houseOrder = [12, 1, 2, 3, 11, 0, 0, 4, 10, 0, 0, 5, 9, 8, 7, 6];
  const planetsByHouse: Record<number, any[]> = {};
  planets.forEach(p => {
    const h = parseInt(p.house) || 0;
    if (!planetsByHouse[h]) planetsByHouse[h] = [];
    planetsByHouse[h].push(p);
  });
  return (
    <div className="celestial-glass celestial-serif" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, width: "100%", maxWidth: 380, border: "0.5px solid rgba(212,175,55,0.25)", borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
      {houseOrder.map((house, idx) => {
        const isCenter = [5, 6, 9, 10].includes(idx);
        if (house === 0) return (
          <div key={idx} style={{ background: "rgba(212,175,55,0.01)", minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center", border: "0.5px solid rgba(212,175,55,0.04)" }}>
            {isCenter && idx === 5 && <span style={{ color: "rgba(212,175,55,0.15)", fontSize: 20 }}>✦</span>}
          </div>
        );
        const hp = planetsByHouse[house] || [];
        const cusp = cusps[house - 1];
        const isLagna = house === 1;
        const isSelected = selectedHouse === house;
        return (
          <div key={idx}
            onClick={() => onHouseClick?.(house)}
            style={{ 
              background: isSelected ? "rgba(212,175,55,0.18)" : isLagna ? "rgba(212,175,55,0.07)" : "rgba(212,175,55,0.015)", 
              border: `0.5px solid ${isSelected ? "rgba(212,175,55,0.7)" : isLagna ? "rgba(212,175,55,0.3)" : "rgba(212,175,55,0.1)"}`, 
              padding: "4px 5px", 
              minHeight: 90, 
              display: "flex", 
              flexDirection: "column", 
              transition: "background 0.15s, border-color 0.15s", 
              cursor: onHouseClick ? "pointer" : "default" 
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(212,175,55,0.1)"; }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isLagna ? "rgba(212,175,55,0.07)" : "rgba(212,175,55,0.015)"; }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: isLagna ? "var(--accent)" : "rgba(212,175,55,0.5)", fontWeight: isLagna ? 700 : 400 }}>{house}{isLagna ? "↑" : ""}</span>
              <span className="celestial-mono" style={{ fontSize: 7, color: "rgba(212,175,55,0.35)" }}>{cusp?.degree_in_sign?.toFixed(0)}°</span>
            </div>
            <div style={{ fontSize: 7.5, color: "rgba(212,175,55,0.4)", marginBottom: 3 }}>
              {(lang === "en" ? cusp?.sign_en : (cusp?.sign_te ?? cusp?.sign_en ?? ""))?.slice(0, 4) || ""}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              {hp.map((p: any) => {
                const deg = typeof p.degree_in_sign === "number" ? p.degree_in_sign : 0;
                const isHovered = hoveredPlanet === p.planet_en;
                const isSelected = selectedPlanet === p.planet_en;
                return (
                  <div key={p.planet_en}
                    title={`${p.planet_en} | ${p.nakshatra_en ?? ""} | ${deg.toFixed(1)}° | Star: ${p.star_lord_en ?? ""} | Sub: ${p.sub_lord_en ?? ""}`}
                    onClick={(e) => {
                      // Stop propagation so the house cell's onClick
                      // doesn't also fire (would select the house too).
                      e.stopPropagation();
                      if (isSelected) select(null);
                      else            select({ type: "planet", value: p.planet_en });
                    }}
                    onMouseEnter={() => {
                      window.dispatchEvent(new CustomEvent("planet-hover", { detail: { planet: p.planet_en } }));
                    }}
                    onMouseLeave={() => {
                      window.dispatchEvent(new CustomEvent("planet-hover", { detail: { planet: null } }));
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      cursor: "pointer",
                      transition: "transform 0.15s, filter 0.15s",
                      transform: isSelected ? "scale(1.18)" : isHovered ? "scale(1.12)" : "scale(1)",
                      filter:
                        isSelected
                          ? "drop-shadow(0 0 6px rgba(212,175,55,1))"
                          : isHovered
                            ? "drop-shadow(0 0 4px rgba(212,175,55,0.8))"
                            : "none",
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: PLANET_COLORS[p.planet_en] || "#888" }}>{p.planet_short}{p.retrograde ? "℞" : ""}</span>
                    <span className="celestial-mono" style={{ fontSize: 7.5, color: (isSelected || isHovered) ? "rgba(212,175,55,0.95)" : `${PLANET_COLORS[p.planet_en]}80` }}>{deg.toFixed(0)}°</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
