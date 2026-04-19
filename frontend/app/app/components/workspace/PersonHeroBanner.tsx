"use client";
import React, { useState } from "react";
import { PLANET_COLORS } from "../constants";
import { WorkspaceData, PLANET_SYMBOLS } from "../../types/workspace";
import { BirthDetails, ChartSession } from "../../types";
import { useLanguage } from "@/lib/i18n";

interface PersonHeroBannerProps {
  workspaceData: WorkspaceData;
  birthDetails: BirthDetails;
  onNewChart: () => void;
  onPdf: () => void;
  pdfLoading: boolean;
  savedSessions: ChartSession[];
  onSwitchSession: (s: ChartSession) => void;
  astrologerMode?: boolean;
}

function PlanetChip({ label, planet, small }: { label?: string; planet: string; small?: boolean }) {
  const color = PLANET_COLORS[planet] ?? "#c9a96e";
  const sym   = PLANET_SYMBOLS[planet] ?? planet[0];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: small ? "2px 7px" : "3px 9px",
      borderRadius: 20,
      background: `${color}18`,
      border: `0.5px solid ${color}50`,
      fontSize: small ? 10 : 11,
      fontWeight: 600,
      color: color,
      whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: small ? 9 : 11 }}>{sym}</span>
      {label ?? planet.slice(0, 2)}
    </span>
  );
}

function DashaChip({ label, planet, end }: { label: string; planet: string; end?: string }) {
  const color = PLANET_COLORS[planet] ?? "#c9a96e";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 20,
      background: `${color}18`, border: `0.5px solid ${color}50`,
      fontSize: 11, fontWeight: 600,
    }}>
      <span style={{ color: "#888899", fontSize: 9 }}>{label}</span>
      <span style={{ color }}>{planet}</span>
      {end && <span style={{ color: "#555566", fontSize: 9 }}>· {end}</span>}
    </span>
  );
}

export default function PersonHeroBanner({
  workspaceData, birthDetails, onNewChart, onPdf, pdfLoading,
  savedSessions, onSwitchSession, astrologerMode,
}: PersonHeroBannerProps) {
  const { lang, t } = useLanguage();
  const [showSwitch, setShowSwitch] = useState(false);

  // Backend returns cusps as array; lagna = H1's sign
  const cuspsArray = Array.isArray(workspaceData.cusps) ? workspaceData.cusps : Object.values(workspaceData.cusps ?? {});
  const lagnaCusp = cuspsArray[0] as any;
  const lagna = lang === "en"
    ? (lagnaCusp?.sign_en ?? (workspaceData as any).lagna_en ?? "—")
    : (lagnaCusp?.sign_te ?? lagnaCusp?.sign_en ?? (workspaceData as any).lagna_en ?? "—");

  const moonPlanet = workspaceData.planets?.find((p: any) => p.planet_en === "Moon");
  const moonSign = lang === "en"
    ? (moonPlanet?.sign_en ?? "—")
    : ((moonPlanet as any)?.sign_te ?? moonPlanet?.sign_en ?? "—");

  // Backend uses lord_en; fallback to lord
  const currentMD  = workspaceData.current_dasha ?? (workspaceData as any).mahadasha;
  const currentAD  = workspaceData.current_antardasha;
  const currentPAD = workspaceData.current_pratyantardasha;

  // Ruling planets — backend returns { all_en: [], all_te: [] }
  const rpData = (workspaceData as any).ruling_planets;
  const rulingPlanets: Array<{planet: string; role: string}> = Array.isArray(rpData)
    ? rpData
    : (rpData?.all_en ?? []).map((p: string) => ({ planet: p, role: "" }));

  // Derive Sun placement for subtitle
  const sunPlanet = workspaceData.planets?.find((p: any) => p.planet_en === "Sun");
  const sunInfo   = sunPlanet ? `H${sunPlanet.house} Sun` : "";

  const initial = (birthDetails.name ?? "?")[0]?.toUpperCase() ?? "?";
  const genderSym = birthDetails.gender === "male" ? "♂" : birthDetails.gender === "female" ? "♀" : "";

  // Format birth info line
  const birthLine = [
    birthDetails.date,
    birthDetails.time ? `${birthDetails.time} ${birthDetails.ampm}` : "",
    birthDetails.place ? `· ${birthDetails.place}` : "",
  ].filter(Boolean).join(" · ");

  return (
    <div style={{
      background: "var(--hero-gradient)",
      borderBottom: "0.5px solid rgba(201,169,110,0.15)",
      padding: "14px 24px 12px",
      position: "relative",
    }}>
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        flexWrap: "wrap",
      }}>
        {/* Avatar */}
        <div className="glow-gold" style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(201,169,110,0.12)",
          border: "1.5px solid rgba(201,169,110,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 700, color: "#c9a96e",
          flexShrink: 0,
        }}>
          {initial}
        </div>

        {/* Identity block */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0", letterSpacing: "0.02em" }}>
              {birthDetails.name?.toUpperCase() ?? "—"}
            </span>
            {genderSym && (
              <span style={{ fontSize: 12, color: "#888899" }}>{genderSym}</span>
            )}
            {astrologerMode && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 10px",
                  borderRadius: 999,
                  background: "rgba(201,169,110,0.12)",
                  border: "0.5px solid rgba(201,169,110,0.35)",
                  color: "#c9a96e",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                }}
              >
                ★ {t("Astrologer mode", "జ్యోతిష్కుడు మోడ్")}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#666677", marginTop: 2 }}>
            {birthLine}
          </div>
          {/* Lagna + Moon + Sun */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 8,
              background: "rgba(201,169,110,0.08)", border: "0.5px solid rgba(201,169,110,0.2)",
              color: "#c9a96e", fontWeight: 500,
            }}>
              ♏ Lagna: {lagna}
            </span>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 8,
              background: "rgba(147,197,253,0.08)", border: "0.5px solid rgba(147,197,253,0.2)",
              color: "#93c5fd", fontWeight: 500,
            }}>
              ☽ Moon: {moonSign}
            </span>
            {sunInfo && (
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 8,
                background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.2)",
                color: "#f59e0b", fontWeight: 500,
              }}>
                ☉ {sunInfo}
              </span>
            )}
          </div>
        </div>

        {/* Dasha + Ruling Planets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
          {/* MD / AD / PAD */}
          {currentMD && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <DashaChip label="MD" planet={(currentMD as any).lord ?? (currentMD as any).lord_en ?? "?"} end={currentMD.end?.slice(0, 7)} />
              {currentAD && <DashaChip label="AD" planet={(currentAD as any).lord ?? (currentAD as any).lord_en ?? "?"} end={currentAD.end?.slice(0, 7)} />}
              {currentPAD && <DashaChip label="PAD" planet={(currentPAD as any).lord ?? (currentPAD as any).lord_en ?? "?"} end={currentPAD.end?.slice(0, 7)} />}
            </div>
          )}

          {/* Ruling planets */}
          {rulingPlanets.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 9, color: "#555566", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                RPs:
              </span>
              {rulingPlanets.slice(0, 5).map((rp, i) => (
                <PlanetChip key={i} planet={rp.planet} small />
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={onPdf}
            disabled={pdfLoading}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              height: 30, padding: "0 12px", borderRadius: 7,
              background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
              color: pdfLoading ? "#555566" : "#b0b0c0",
              fontSize: 12, fontWeight: 500,
              cursor: pdfLoading ? "not-allowed" : "pointer",
              transition: "border-color 0.15s, color 0.15s, background 0.15s",
            }}
            onMouseEnter={e => { if (pdfLoading) return; e.currentTarget.style.color = "#c9a96e"; e.currentTarget.style.borderColor = "rgba(201,169,110,0.35)"; e.currentTarget.style.background = "rgba(201,169,110,0.04)"; }}
            onMouseLeave={e => { if (pdfLoading) return; e.currentTarget.style.color = "#b0b0c0"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "transparent"; }}
          >
            {pdfLoading ? "…" : "PDF ↓"}
          </button>

          {/* Session switch */}
          {astrologerMode && savedSessions.length > 0 && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowSwitch(s => !s)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  height: 30, padding: "0 12px", borderRadius: 7,
                  background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#b0b0c0", fontSize: 12, fontWeight: 500, cursor: "pointer",
                  transition: "border-color 0.15s, color 0.15s, background 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#E8EDF5"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#b0b0c0"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              >
                Switch ▾
              </button>
              {showSwitch && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
                  background: "var(--elevated)", border: "0.5px solid rgba(255,255,255,0.12)",
                  borderRadius: 10, padding: 6, minWidth: 180,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}>
                  {savedSessions.map(s => (
                    <div
                      key={s.id}
                      onClick={() => { onSwitchSession(s); setShowSwitch(false); }}
                      style={{
                        padding: "7px 10px", borderRadius: 7, cursor: "pointer",
                        fontSize: 12, color: "#d0d0d8",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,169,110,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {s.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={onNewChart}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              height: 30, padding: "0 14px", borderRadius: 7,
              background: "#c9a96e", border: "none",
              color: "#1a130a", fontSize: 12, fontWeight: 700, cursor: "pointer",
              // 3-layer premium glow (ring + shadow + wide halo)
              boxShadow: "0 0 0 1px rgba(201,169,110,0.55), 0 2px 6px rgba(201,169,110,0.18), 0 0 18px rgba(231,201,138,0.28)",
              transition: "background 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#e7c98a"; e.currentTarget.style.boxShadow = "0 0 0 1px rgba(231,201,138,0.7), 0 2px 8px rgba(201,169,110,0.25), 0 0 26px rgba(231,201,138,0.42)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#c9a96e"; e.currentTarget.style.boxShadow = "0 0 0 1px rgba(201,169,110,0.55), 0 2px 6px rgba(201,169,110,0.18), 0 0 18px rgba(231,201,138,0.28)"; }}
          >
            + New Chart
          </button>
        </div>
      </div>
    </div>
  );
}
