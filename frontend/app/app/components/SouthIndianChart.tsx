"use client";
import { PLANET_COLORS } from "./constants";
import { useLanguage } from "@/lib/i18n";

export default function SouthIndianChart({ planets, cusps, onHouseClick, selectedHouse }: { planets: any[]; cusps: any[]; onHouseClick?: (h: number) => void; selectedHouse?: number | null }) {
  const { lang } = useLanguage();
  const houseOrder = [12, 1, 2, 3, 11, 0, 0, 4, 10, 0, 0, 5, 9, 8, 7, 6];
  const planetsByHouse: Record<number, any[]> = {};
  planets.forEach(p => {
    const h = parseInt(p.house) || 0;
    if (!planetsByHouse[h]) planetsByHouse[h] = [];
    planetsByHouse[h].push(p);
  });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, width: "100%", maxWidth: 380, border: "0.5px solid rgba(201,169,110,0.3)", borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
      {houseOrder.map((house, idx) => {
        const isCenter = [5, 6, 9, 10].includes(idx);
        if (house === 0) return (
          <div key={idx} style={{ background: "rgba(201,169,110,0.02)", minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center", border: "0.5px solid rgba(201,169,110,0.06)" }}>
            {isCenter && idx === 5 && <span style={{ color: "rgba(201,169,110,0.15)", fontSize: 20 }}>✦</span>}
          </div>
        );
        const hp = planetsByHouse[house] || [];
        const cusp = cusps[house - 1];
        const isLagna = house === 1;
        const isSelected = selectedHouse === house;
        return (
          <div key={idx}
            onClick={() => onHouseClick?.(house)}
            style={{ background: isSelected ? "rgba(201,169,110,0.18)" : isLagna ? "rgba(201,169,110,0.07)" : "rgba(201,169,110,0.015)", border: `0.5px solid ${isSelected ? "rgba(201,169,110,0.7)" : isLagna ? "rgba(201,169,110,0.3)" : "rgba(201,169,110,0.12)"}`, padding: "4px 5px", minHeight: 90, display: "flex", flexDirection: "column", transition: "background 0.15s", cursor: onHouseClick ? "pointer" : "default" }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(201,169,110,0.12)"; }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isLagna ? "rgba(201,169,110,0.07)" : "rgba(201,169,110,0.015)"; }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 8, color: isLagna ? "var(--accent)" : "rgba(201,169,110,0.45)", fontWeight: isLagna ? 700 : 400 }}>{house}{isLagna ? "↑" : ""}</span>
              <span style={{ fontSize: 7, color: "rgba(201,169,110,0.3)" }}>{cusp?.degree_in_sign?.toFixed(0)}°</span>
            </div>
            <div style={{ fontSize: 7, color: "rgba(201,169,110,0.35)", marginBottom: 3 }}>
              {(lang === "en" ? cusp?.sign_en : (cusp?.sign_te ?? cusp?.sign_en ?? ""))?.slice(0, 4) || ""}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              {hp.map((p: any) => (
                <div key={p.planet_en} title={`${p.planet_en} | ${p.nakshatra_en} | ${p.degree_in_sign.toFixed(1)}° | Star: ${p.star_lord_en} | Sub: ${p.sub_lord_en}`} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: PLANET_COLORS[p.planet_en] || "#888" }}>{p.planet_short}{p.retrograde ? "℞" : ""}</span>
                  <span style={{ fontSize: 7, color: `${PLANET_COLORS[p.planet_en]}80` }}>{p.degree_in_sign.toFixed(0)}°</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
