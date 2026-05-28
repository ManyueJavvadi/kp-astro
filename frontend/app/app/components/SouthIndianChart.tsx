"use client";
import React, { useState, useEffect, useMemo } from "react";
import { PLANET_COLORS } from "./constants";
import { useLanguage } from "@/lib/i18n";
// PR Phase 9.3 — global SelectionContext for cross-component brushing.
// Tap a planet glyph here → SelectionContext updates → PlanetList +
// future drawer + future glow all react. Tap a house cell continues
// to fire the existing onHouseClick prop (parent decides what to do)
// because the parent ALSO calls setSelectedHouse which goes through
// SelectionContext via the Phase 9.1 adapter.
import { useSelection } from "../lib/selection";
// PR Phase 9.8 — KP-doctrinal relation tier drives a 3-tier glow on
// planet glyphs AND house cells. Selecting a planet lights up its
// star/sub-lord planets at .glow-related, occupied house cell at
// .glow-related, and two-hop kin at .glow-distant.
import { computeRelation, relationClass, type RelationWorkspace } from "../lib/selection/relation";

export default function SouthIndianChart({ planets, cusps, onHouseClick, selectedHouse }: { planets: any[]; cusps: any[]; onHouseClick?: (h: number) => void; selectedHouse?: number | null }) {
  const { lang } = useLanguage();
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const { selected, select } = useSelection();
  const selectedPlanet = selected?.type === "planet" ? selected.value : null;

  // PR Phase 9.8 — memoize the relation workspace so we don't re-pack
  // it on every render. Shapes the upstream `any[]` props into the
  // minimum surface the relation engine needs.
  const relationWorkspace = useMemo<RelationWorkspace>(
    () => ({
      planets: (planets ?? []).map(p => ({
        planet_en: p.planet_en,
        house: p.house,
        star_lord_en: p.star_lord_en,
        sub_lord_en: p.sub_lord_en,
      })),
      cusps: (cusps ?? []).map(c => ({
        house: c.house,
        sign_en: c.sign_en,
        sub_lord_en: c.sub_lord_en,
        star_lord_en: c.star_lord_en,
      })),
    }),
    [planets, cusps],
  );

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
        // PR Phase 9.8 — house cell relation to currently-focused entity.
        // E.g. selecting a planet lights up the house it occupies, the
        // house whose cusp sub-lord IS this planet, etc.
        const houseRelation = selected && !isSelected
          ? computeRelation(
              selected,
              { type: "house", value: house },
              relationWorkspace,
            )
          : "none";
        const houseRelClass = relationClass(houseRelation);
        return (
          <div key={idx}
            className={!isSelected ? houseRelClass : ""}
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
                // PR Phase 9.8 — relation tier from focused entity to
                // this planet glyph. Only applies when something else is
                // focused (not this same planet).
                const planetRelation = selected && !isSelected
                  ? computeRelation(
                      selected,
                      { type: "planet", value: p.planet_en },
                      relationWorkspace,
                    )
                  : "none";
                const planetRelClass = relationClass(planetRelation);
                // Layer the filter halo on top of the relation glow CSS
                // class so cross-component brushing stays subtle but
                // visible even on the small chart glyphs.
                const relationFilter =
                  planetRelation === "related"
                    ? "drop-shadow(0 0 3px rgba(212,175,55,0.55))"
                    : planetRelation === "distant"
                      ? "drop-shadow(0 0 2px rgba(212,175,55,0.3))"
                      : "none";
                return (
                  <div key={p.planet_en}
                    className={!isSelected ? planetRelClass : ""}
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
                            : relationFilter,
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
