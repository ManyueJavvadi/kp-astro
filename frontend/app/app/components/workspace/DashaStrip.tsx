"use client";
import React, { useState } from "react";
import { PLANET_COLORS } from "../constants";

// Backend may use lord_en instead of lord; support both
interface DashaLike {
  lord?: string;
  lord_en?: string;
  lord_te?: string;
  start?: string;
  end?: string;
  years?: number;
  is_current?: boolean;
  [key: string]: unknown;
}

interface DashaStripProps {
  dashas: DashaLike[];
  currentDasha: DashaLike;
  antardashas: DashaLike[];
  currentAntardasha: DashaLike;
  pratyantardashas: DashaLike[];
  currentPratyantardasha: DashaLike;
}

function getLord(d: DashaLike): string {
  return d.lord ?? d.lord_en ?? "?";
}

function parseYear(dateStr?: string): number {
  if (!dateStr) return 2000;
  if (dateStr.includes("-")) return parseInt(dateStr.split("-")[0]);
  if (dateStr.includes("/")) return parseInt(dateStr.split("/")[2] ?? dateStr.split("/")[0]);
  return parseInt(dateStr);
}

function formatDateShort(dateStr?: string): string {
  if (!dateStr) return "?";
  try {
    if (dateStr.includes("-")) return dateStr.split("-")[0];
    if (dateStr.includes("/")) return dateStr.split("/")[2] ?? dateStr.split("/")[0];
    return dateStr.slice(0, 4);
  } catch { return dateStr; }
}

export default function DashaStrip({
  dashas, currentDasha, antardashas, currentAntardasha,
  pratyantardashas, currentPratyantardasha,
}: DashaStripProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (!dashas || dashas.length === 0) return null;

  const totalYears = dashas.reduce((s, d) => s + (d.years ?? 0), 0) || 120;
  const now = new Date().getFullYear();

  return (
    <div style={{ marginBottom: 20 }}>
      {/* MD Strip header */}
      <div style={{ fontSize: 11, color: "#888899", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        Mahadasha Timeline
      </div>

      {/* Visual strip */}
      <div style={{
        display: "flex",
        height: 36,
        borderRadius: 8,
        overflow: "hidden",
        border: "0.5px solid rgba(255,255,255,0.08)",
        position: "relative",
      }}>
        {dashas.map((d, idx) => {
          const lord  = getLord(d);
          const color = PLANET_COLORS[lord] ?? "#888";
          const width = ((d.years ?? 0) / totalYears) * 100;
          const startY = parseYear(d.start);
          const endY   = parseYear(d.end);
          const isCurr = lord === getLord(currentDasha ?? {}) && startY <= now && endY >= now;
          const hovKey = `md-${lord}-${d.start}`;
          const isHov  = hovered === hovKey;

          return (
            <div
              key={`${lord}-${d.start}-${idx}`}
              className={`dasha-seg${isCurr ? " current" : ""}`}
              style={{
                width: `${width}%`,
                background: isCurr ? `${color}35` : `${color}18`,
                color: isCurr ? color : `${color}cc`,
                borderRight: "1px solid rgba(0,0,0,0.3)",
                flexDirection: "column",
                gap: 1,
                position: "relative",
              }}
              onMouseEnter={() => setHovered(hovKey)}
              onMouseLeave={() => setHovered(null)}
            >
              {width > 6 ? (
                <>
                  <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>{lord.slice(0, 3)}</span>
                  {width > 10 && <span style={{ fontSize: 8, opacity: 0.7, lineHeight: 1 }}>{startY}</span>}
                </>
              ) : (
                <span style={{ fontSize: 8, fontWeight: 700 }}>{lord[0]}</span>
              )}

              {isCurr && (
                <div style={{
                  position: "absolute", top: -1, left: -1, right: -1, bottom: -1,
                  border: `2px solid ${color}`,
                  borderRadius: 4,
                  pointerEvents: "none",
                }} />
              )}

              {isHov && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--elevated)",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  borderRadius: 8, padding: "5px 10px", fontSize: 11,
                  color: "#d0d0d8", whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                  zIndex: 50,
                }}>
                  <span style={{ color, fontWeight: 600 }}>{lord}</span>
                  {" "}MD · {formatDateShort(d.start)} – {formatDateShort(d.end)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Period Tree */}
      {currentDasha && (
        <div style={{
          marginTop: 16,
          background: "var(--card)",
          border: "0.5px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: "12px 14px",
        }}>
          <div style={{ fontSize: 10, color: "#888899", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            Current Period
          </div>

          {/* MD row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#666677" }}>┌─</span>
            <span style={{ color: PLANET_COLORS[getLord(currentDasha)] ?? "#c9a96e", fontWeight: 600, fontSize: 13 }}>
              {getLord(currentDasha)}
            </span>
            <span style={{ fontSize: 11, color: "#555566" }}>Mahadasha</span>
            <span style={{ fontSize: 10, color: "#444455" }}>
              {formatDateShort(currentDasha.start)} – {formatDateShort(currentDasha.end)}
            </span>
          </div>

          {/* AD row */}
          {currentAntardasha && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingLeft: 14 }}>
              <span style={{ fontSize: 12, color: "#555566" }}>└─</span>
              <span style={{ color: PLANET_COLORS[getLord(currentAntardasha)] ?? "#c9a96e", fontWeight: 600, fontSize: 12 }}>
                {getLord(currentAntardasha)}
              </span>
              <span style={{ fontSize: 11, color: "#555566" }}>Antardasha</span>
              <span style={{ fontSize: 10, color: "#444455" }}>
                {formatDateShort(currentAntardasha.start)} – {formatDateShort(currentAntardasha.end)}
              </span>
            </div>
          )}

          {/* PAD rows */}
          {pratyantardashas && pratyantardashas.length > 0 && (
            <div style={{ paddingLeft: 28 }}>
              {pratyantardashas.map((pad, i) => {
                const padLord   = getLord(pad);
                const padStartY = parseYear(pad.start);
                const padEndY   = parseYear(pad.end);
                const isCurrPAD = pad.is_current ?? (padStartY <= now && padEndY >= now);
                const padColor  = PLANET_COLORS[padLord] ?? "#c9a96e";
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "3px 6px", marginBottom: 2, borderRadius: 6,
                      background: isCurrPAD ? `${padColor}18` : "transparent",
                      border: isCurrPAD ? `0.5px solid ${padColor}40` : "0.5px solid transparent",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "#444455" }}>└─</span>
                    <span style={{ color: isCurrPAD ? padColor : "#888899", fontWeight: isCurrPAD ? 600 : 400, fontSize: 11 }}>
                      {padLord}
                    </span>
                    <span style={{ fontSize: 10, color: "#444455" }}>PAD</span>
                    <span style={{ fontSize: 9, color: "#333344" }}>
                      {pad.start?.slice(0, 7)} – {pad.end?.slice(0, 7)}
                    </span>
                    {isCurrPAD && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: padColor, marginLeft: 4 }}>
                        ◀ NOW
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Antardashas */}
      {antardashas && antardashas.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, color: "#888899", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            All Antardashas in {currentDasha ? getLord(currentDasha) : "?"} MD
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {antardashas.map((ad, i) => {
              const adLord   = getLord(ad);
              const adStartY = parseYear(ad.start);
              const adEndY   = parseYear(ad.end);
              const isCurr   = ad.is_current ?? (adStartY <= now && adEndY >= now);
              const color    = PLANET_COLORS[adLord] ?? "#888";
              return (
                <div
                  key={i}
                  style={{
                    padding: "5px 10px", borderRadius: 8,
                    background: isCurr ? `${color}20` : "var(--card)",
                    border: isCurr ? `1px solid ${color}60` : "0.5px solid rgba(255,255,255,0.07)",
                    textAlign: "center",
                    minWidth: 60,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: isCurr ? color : "#b0b0c0" }}>
                    {adLord}
                  </div>
                  <div style={{ fontSize: 9, color: "#555566", marginTop: 1 }}>
                    {formatDateShort(ad.start)}–{formatDateShort(ad.end)}
                  </div>
                  {isCurr && <div style={{ fontSize: 8, color, fontWeight: 700, marginTop: 1 }}>NOW</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
