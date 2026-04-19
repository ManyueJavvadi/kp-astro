"use client";
import React from "react";
import { PLANET_COLORS } from "../constants";
import { Planet, Cusp, HOUSE_TOPICS, HOUSE_TOPICS_TE } from "../../types/workspace";
import { useLanguage } from "@/lib/i18n";

// Backend returns cusps as array with house_num field
interface CuspItem {
  house_num?: number;
  house?: number;
  sign_en: string;
  sign_te?: string;
  sub_lord_en: string;
  sub_lord_te?: string;
  star_lord_en?: string;
  nakshatra_en?: string;
  [key: string]: unknown;
}

interface HouseOverviewGridProps {
  cusps: CuspItem[] | Record<string, CuspItem>;
  planets: Planet[];
  selectedHouse: number | null;
  onHouseClick: (h: number) => void;
}

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋",
  Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏",
  Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

function getPlanetsInHouse(houseNum: number, planets: Planet[]): Planet[] {
  return planets.filter(p => String(p.house) === String(houseNum));
}

export default function HouseOverviewGrid({
  cusps, planets, selectedHouse, onHouseClick,
}: HouseOverviewGridProps) {
  const { lang } = useLanguage();
  if (!cusps || Object.keys(cusps).length === 0) return null;

  const houses = Array.from({ length: 12 }, (_, i) => i + 1);
  const signLabel = (cusp: CuspItem) =>
    lang === "en" ? cusp.sign_en : (cusp.sign_te ?? cusp.sign_en);
  const topicLabel = (h: number) =>
    lang === "en" ? HOUSE_TOPICS[h] : (HOUSE_TOPICS_TE[h] ?? HOUSE_TOPICS[h]);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 8,
    }}>
      {houses.map(h => {
        const cuspsArray = Array.isArray(cusps) ? cusps : Object.values(cusps);
        const cusp = cuspsArray.find((c: CuspItem) => (c.house_num ?? c.house) === h);
        if (!cusp) return null;

        const planetsHere = getPlanetsInHouse(h, planets);
        const isSelected  = selectedHouse === h;
        const topic       = topicLabel(h);
        const signSym     = SIGN_SYMBOLS[cusp.sign_en] ?? "";

        return (
          <div
            key={h}
            className="house-card"
            onClick={() => onHouseClick(h)}
            style={{
              background: isSelected ? "rgba(201,169,110,0.08)" : "var(--card)",
              border: isSelected
                ? "1px solid rgba(201,169,110,0.5)"
                : "0.5px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "10px 10px 8px",
              minHeight: 100,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              position: "relative",
              cursor: "pointer",
            }}
          >
            {/* House number + planet dot */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: isSelected ? "#c9a96e" : "#666677",
                letterSpacing: "0.04em",
              }}>
                H{h}
              </span>
              {planetsHere.length > 0 && (
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: PLANET_COLORS[planetsHere[0].planet_en] ?? "#c9a96e",
                  boxShadow: `0 0 4px ${PLANET_COLORS[planetsHere[0].planet_en] ?? "#c9a96e"}`,
                }} />
              )}
            </div>

            {/* Sign name */}
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f0", lineHeight: 1.2 }}>
              {signSym} {signLabel(cusp)}
            </div>

            {/* Topic */}
            <div style={{ fontSize: 10, color: "#666677", lineHeight: 1.3 }}>
              {topic}
            </div>

            {/* CSL badge — KP unique! */}
            {cusp.sub_lord_en && (
              <div style={{
                fontSize: 9, fontWeight: 600,
                color: PLANET_COLORS[cusp.sub_lord_en] ?? "#c9a96e",
                background: "rgba(201,169,110,0.06)",
                border: "0.5px solid rgba(201,169,110,0.15)",
                borderRadius: 6, padding: "2px 6px",
                alignSelf: "flex-start",
              }}>
                {lang === "en" ? cusp.sub_lord_en : (cusp.sub_lord_te ?? cusp.sub_lord_en)} CSL
              </div>
            )}

            {/* Planet chips */}
            {planetsHere.length > 0 && (
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 2 }}>
                {planetsHere.map(p => (
                  <span
                    key={p.planet_en}
                    style={{
                      fontSize: 9, fontWeight: 600,
                      color: PLANET_COLORS[p.planet_en] ?? "#888",
                      background: PLANET_COLORS[p.planet_en] ? `${PLANET_COLORS[p.planet_en]}18` : "rgba(255,255,255,0.06)",
                      border: `0.5px solid ${PLANET_COLORS[p.planet_en]}40`,
                      borderRadius: 4, padding: "1px 4px",
                    }}
                  >
                    {p.planet_short ?? p.planet_en.slice(0, 2)}
                    {p.retrograde ? "℞" : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
