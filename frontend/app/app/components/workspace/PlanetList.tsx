"use client";
import React, { useState, useEffect, useMemo } from "react";
import { PLANET_COLORS } from "../constants";
import { Planet, PLANET_SYMBOLS } from "../../types/workspace";
import { useLanguage } from "@/lib/i18n";
// Phase 15.3 — planet rows now cascade in (tight 30ms gap for a snappy
// data-table feel rather than the bigger 60ms for cards).
import { StaggerChildren, StaggerItem } from "@/components/motion";
// PR Phase 9.3 — click any planet → updates global SelectionContext.
// Hover continues to fire the existing planet-hover window event for
// per-component synchronized hover highlight (back-compat).
import { useSelection } from "../../lib/selection";
// PR Phase 9.8 — KP-doctrinal relation tier (direct / related / distant
// / none) drives a 3-tier glow hierarchy so non-selected planets that
// are doctrinally connected to the focused entity (e.g. star-lord,
// same-house occupant, sign lord of the focused house cusp) also light
// up at progressively lower visual intensity.
import { computeRelation, relationClass, type RelationWorkspace } from "../../lib/selection/relation";

interface PlanetListProps {
  planets: Planet[];
  /**
   * Optional cusps array — when provided, enables house↔planet relation
   * glow (focused house lights up the planets occupying it, sign-lord
   * of its cusp, sub-lord, etc.). Without cusps, only planet↔planet and
   * dasha↔planet relations resolve.
   */
  cusps?: Array<{
    house?: number;
    sign_en?: string;
    sub_lord_en?: string;
    star_lord_en?: string;
  }>;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function PlanetList({ planets, cusps }: PlanetListProps) {
  const { lang } = useLanguage();
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  // PR Phase 9.3 — read global selection for tap-driven highlight.
  // Tap a planet anywhere (here, in chart, in dasha tree) → glow here.
  const { selected, select } = useSelection();
  const selectedPlanet =
    selected?.type === "planet" ? selected.value : null;

  // PR Phase 9.8 — assemble a minimal RelationWorkspace from props.
  // Memoized so we don't churn relation lookups on every parent render.
  const relationWorkspace = useMemo<RelationWorkspace>(
    () => ({
      planets: planets.map(p => ({
        planet_en: p.planet_en,
        house: p.house,
        star_lord_en: p.star_lord_en,
        sub_lord_en: p.sub_lord_en,
      })),
      cusps: cusps,
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

  if (!planets || planets.length === 0) return null;
  // Pick English by default; switch to Telugu for te/te_en.
  const pick = (p: any, base: string): string =>
    lang === "en" ? (p[`${base}_en`] ?? "") : (p[`${base}_te`] ?? p[`${base}_en`] ?? "");

  return (
    <StaggerChildren
      gap="tight"
      immediate
      style={{ display: "flex", flexDirection: "column", gap: 0 }}
    >
      {planets.map((p, i) => {
        const color = PLANET_COLORS[p.planet_en] ?? "#888899";
        const sym   = PLANET_SYMBOLS[p.planet_en] ?? p.planet_en[0];
        const isLast = i === planets.length - 1;
        const isHovered = hoveredPlanet === p.planet_en;
        // PR Phase 9.3 — tap-driven persistent highlight via SelectionContext.
        // .glow-direct (the gold-bordered, glowing tier) outranks the
        // transient .synced-hover-highlight when both are active.
        const isSelected = selectedPlanet === p.planet_en;
        // PR Phase 9.8 — KP-doctrinal relation tier. When the user has
        // focused some OTHER entity (a house, another planet, a dasha
        // lord), this planet may still light up at .glow-related or
        // .glow-distant intensity if the doctrine connects them.
        const relation = selected
          ? computeRelation(
              selected,
              { type: "planet", value: p.planet_en },
              relationWorkspace,
            )
          : "none";
        const relGlow = relationClass(relation);
        const glowClass = isSelected
          ? "glow-direct"
          : relGlow
            ? relGlow
            : isHovered
              ? "synced-hover-highlight"
              : "";
        return (
          <StaggerItem key={p.planet_en}>
            <div
              className={glowClass}
              onClick={() => {
                // Toggle: tapping the already-selected planet clears selection
                // (drawer dismisses). Otherwise this planet becomes the focus.
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
                gap: 10,
                padding: "9px 12px",
                borderBottom: isLast ? "none" : "0.5px solid rgba(255,255,255,0.05)",
                transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s",
                borderRadius: i === 0 ? "12px 12px 0 0" : isLast ? "0 0 12px 12px" : 0,
                cursor: "pointer",
                width: "100%",
              }}
            >
              {/* Planet icon circle */}
              <div
                className="planet-icon"
                style={{
                  width: 34,
                  height: 34,
                  background: hexToRgba(color, isHovered ? 0.25 : 0.15),
                  border: `1px solid ${hexToRgba(color, isHovered ? 0.75 : 0.4)}`,
                  color: color,
                  fontSize: 15,
                  flexShrink: 0,
                  transition: "all 0.2s",
                  transform: isHovered ? "scale(1.08)" : "scale(1)",
                }}
              >
                {sym}
              </div>

              {/* Name + sign + house */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span className="celestial-serif" style={{ fontSize: 13, fontWeight: 700, color: isHovered ? "var(--accent)" : "#f0f0f0" }}>
                    {pick(p, "planet") || p.planet_en}
                  </span>
                  {p.retrograde && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: "#ef4444",
                      background: "rgba(239,68,68,0.15)", border: "0.5px solid rgba(239,68,68,0.3)",
                      borderRadius: 4, padding: "1px 4px", lineHeight: 1.4,
                    }}>
                      ℞
                    </span>
                  )}
                  <span className="celestial-mono" style={{ fontSize: 11.5, color: isHovered ? "#e2e2e9" : "#b0b0c0" }}>
                    {pick(p, "sign") || p.sign_en} {p.degree_in_sign.toFixed(1)}°
                  </span>
                  <span className="celestial-mono" style={{
                    fontSize: 10, padding: "1px 6px", borderRadius: 8,
                    background: isHovered ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.06)", 
                    color: isHovered ? "var(--accent)" : "#888899",
                    border: isHovered ? "0.5px solid rgba(212,175,55,0.3)" : "0.5px solid rgba(255,255,255,0.08)",
                  }}>
                    H{p.house}
                  </span>
                </div>
                <div className="celestial-sub-serif" style={{ fontSize: 11, color: isHovered ? "#9e9eb0" : "#666677", marginTop: 2 }}>
                  {pick(p, "nakshatra") || p.nakshatra_en}
                </div>
              </div>

              {/* Star Lord → Sub Lord */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className="celestial-serif" style={{ fontSize: 11, color: "#c9a96e", fontWeight: 600 }}>
                  <span style={{ color: PLANET_COLORS[p.star_lord_en] ?? "#c9a96e", textShadow: isHovered ? `0 0 2px ${PLANET_COLORS[p.star_lord_en]}` : "none" }}>
                    {pick(p, "star_lord") || p.star_lord_en}
                  </span>
                  <span style={{ color: "#555566", margin: "0 4px" }}>→</span>
                  <span style={{ color: PLANET_COLORS[p.sub_lord_en] ?? "#c9a96e", textShadow: isHovered ? `0 0 2px ${PLANET_COLORS[p.sub_lord_en]}` : "none" }}>
                    {pick(p, "sub_lord") || p.sub_lord_en}
                  </span>
                </div>
                <div style={{ fontSize: 9, color: "#555566", marginTop: 1 }}>
                  Star · Sub
                </div>
              </div>
            </div>
          </StaggerItem>
        );
      })}
    </StaggerChildren>
  );
}
