"use client";

import React, { useState, useEffect } from "react";
import { PLANET_COLORS } from "../constants";
import { useLanguage } from "@/lib/i18n";
import { Sparkles, Briefcase, Heart, Clock, ChevronDown } from "lucide-react";

const PLANETS_ORDER = ["Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", "Ketu", "Venus"];
const VIMSHOTTARI_YEARS: Record<string, number> = {
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
  Ketu: 7,
  Venus: 20
};

interface MobileDashaStoriesProps {
  mahadasha: any;
  antardashas: any[];
  workspaceData?: any;
}

export default function MobileDashaStories({ mahadasha, antardashas, workspaceData }: MobileDashaStoriesProps) {
  const { lang, t } = useLanguage();
  const [selectedAdIndex, setSelectedAdIndex] = useState<number>(0);

  const pick = (obj: any, base: string): string =>
    lang === "en" ? (obj[`${base}_en`] ?? "") : (obj[`${base}_te`] ?? obj[`${base}_en`] ?? "");

  const today = new Date();

  // Find currently active Antardasha index on load
  useEffect(() => {
    const activeIdx = antardashas.findIndex(ad => ad.is_current);
    if (activeIdx !== -1) {
      setSelectedAdIndex(activeIdx);
    }
  }, [antardashas]);

  // Helper to derive planet significations
  const getPlanetSigs = (planetName: string): number[] => {
    const sigs: number[] = [];
    if (!workspaceData?.significators) return sigs;
    Object.entries(workspaceData.significators).forEach(([houseStr, sig]: [string, any]) => {
      const allSigs = sig.all_significators_en || [];
      if (allSigs.includes(planetName)) {
        sigs.push(parseInt(houseStr));
      }
    });
    return sigs.sort((a, b) => a - b);
  };

  // Generate topic relevance badges based on planet significations
  const getTopicBadges = (planetName: string) => {
    const sigs = getPlanetSigs(planetName);
    const badges = [];

    // Career Promise: H2, H6, H10
    if (sigs.includes(2) || sigs.includes(6) || sigs.includes(10)) {
      badges.push({
        id: "career",
        label: t("Career", "ఉద్యోగం"),
        icon: <Briefcase size={10} />,
        color: "#34d399",
        bg: "rgba(52, 211, 153, 0.1)"
      });
    }

    // Marriage Promise: H2, H7, H11
    if (sigs.includes(7) || (sigs.includes(2) && sigs.includes(11))) {
      badges.push({
        id: "marriage",
        label: t("Marriage", "వివాహం"),
        icon: <Heart size={10} />,
        color: "#f472b6",
        bg: "rgba(244, 114, 182, 0.1)"
      });
    }

    // Occult/KP Astrology: H8, H12
    if (sigs.includes(8) || sigs.includes(12)) {
      badges.push({
        id: "occult",
        label: t("Occult", "ఆధ్యాత్మికం"),
        icon: <Sparkles size={10} />,
        color: "#fbbf24",
        bg: "rgba(251, 191, 36, 0.1)"
      });
    }

    return badges;
  };

  // Dynamically generate the 9 Pratyantardashas (PADs)
  const generatePADsForAd = (adLord: string, adStart: string, adEnd: string) => {
    const startIndex = PLANETS_ORDER.indexOf(adLord);
    if (startIndex === -1) return [];

    const startMs = new Date(adStart).getTime();
    const endMs = new Date(adEnd).getTime();
    const totalDuration = endMs - startMs;
    if (totalDuration <= 0) return [];

    const orderedPlanets = [
      ...PLANETS_ORDER.slice(startIndex),
      ...PLANETS_ORDER.slice(0, startIndex)
    ];

    let currentStart = startMs;
    return orderedPlanets.map((lord) => {
      const fraction = VIMSHOTTARI_YEARS[lord] / 120;
      const duration = totalDuration * fraction;
      const padStart = new Date(currentStart);
      const padEnd = new Date(currentStart + duration);
      currentStart += duration;

      const nowTime = today.getTime();
      const isCurrent = nowTime >= padStart.getTime() && nowTime <= padEnd.getTime();

      return {
        lord_en: lord,
        lord_te: lord,
        start: padStart.toISOString().split("T")[0],
        end: padEnd.toISOString().split("T")[0],
        is_current: isCurrent
      };
    });
  };

  const selectedAd = antardashas[selectedAdIndex];
  const selectedAdLordEn = selectedAd?.lord_en || selectedAd?.lord || "";
  const selectedAdBadges = getTopicBadges(selectedAdLordEn);
  const selectedAdColor = PLANET_COLORS[selectedAdLordEn] || "var(--accent)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 1. Overall Mahadasha Context Banner */}
      <div style={{
        background: "rgba(255,255,255,0.01)",
        border: "0.5px solid rgba(255,255,255,0.04)",
        borderRadius: 12,
        padding: "10px 12px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <Sparkles size={12} style={{ color: "#c9a96e" }} />
            {pick(mahadasha, "lord")} {t("Mahadasha", "మహాదశ")}
          </span>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>{mahadasha.start} → {mahadasha.end}</span>
        </div>
      </div>

      {/* 2. Horizontal Scrollable row of Antardasha "Story Cards" */}
      <div style={{ margin: "0 -4px" }}>
        <div className="mobile-dasha-stories-carousel" style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "4px 4px 10px",
          scrollSnapType: "x proximity",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}>
          {antardashas.map((ad: any, idx: number) => {
            const adLordEn = ad.lord_en || ad.lord || "";
            const isCurrent = ad.is_current;
            const isSelected = selectedAdIndex === idx;
            const isPast = new Date(ad.end) < today;
            const planetColor = PLANET_COLORS[adLordEn] || "var(--accent)";

            return (
              <div
                key={idx}
                onClick={() => setSelectedAdIndex(idx)}
                style={{
                  flexShrink: 0,
                  width: 72,
                  height: 78,
                  scrollSnapAlign: "center",
                  borderRadius: 14,
                  background: isSelected ? "rgba(201,169,110,0.12)" : "rgba(255,255,255,0.02)",
                  border: isSelected 
                    ? `1px solid var(--accent)` 
                    : isCurrent 
                    ? `1px dashed rgba(201,169,110,0.4)`
                    : `0.5px solid rgba(255,255,255,0.06)`,
                  opacity: isPast && !isSelected ? 0.45 : 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  cursor: "pointer",
                  transition: "all 180ms ease",
                  boxShadow: isSelected ? "0 4px 12px rgba(201,169,110,0.1)" : "none",
                }}
              >
                {/* Visual glyph circle */}
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: isSelected ? planetColor : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${planetColor}`,
                  boxShadow: isCurrent ? `0 0 6px ${planetColor}` : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 800,
                  color: isSelected ? "#000" : planetColor,
                  transition: "all 180ms",
                }}>
                  {adLordEn.slice(0, 2)}
                </div>

                <span style={{
                  fontSize: 10,
                  fontWeight: isSelected || isCurrent ? 700 : 400,
                  color: isSelected ? "var(--accent)" : "var(--text)",
                }}>
                  {pick(ad, "lord")}
                </span>

                {isCurrent && (
                  <span style={{
                    fontSize: 7.5,
                    color: "var(--accent)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                  }}>
                    {t("Now", "యాక్టివ్")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Detailed Card Panel for Selected Antardasha */}
      {selectedAd && (
        <div style={{
          background: "rgba(18, 18, 28, 0.4)",
          border: "0.5px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          animation: "mobile-fade-in 180ms ease-out",
        }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: selectedAdColor }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                {pick(selectedAd, "lord")} {t("Antardasha", "అంతర్దశ")}
              </span>
            </div>
            {selectedAd.is_current && (
              <span style={{ fontSize: 8.5, background: "rgba(201,169,110,0.18)", border: "0.5px solid var(--accent)", color: "var(--accent)", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>
                {t("Currently Active", "ప్రస్తుతం యాక్టివ్")}
              </span>
            )}
          </div>

          {/* Date range strip */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--muted)" }}>
            <Clock size={11} style={{ opacity: 0.6 }} />
            <span>{selectedAd.start} → {selectedAd.end}</span>
          </div>

          {/* Topic relevance badges grid */}
          {selectedAdBadges.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "2px 0" }}>
              {selectedAdBadges.map(b => (
                <span key={b.id} style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 9,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: b.bg,
                  color: b.color,
                  border: `0.5px solid ${b.color}25`
                }}>
                  {b.icon}
                  {b.label}
                </span>
              ))}
            </div>
          )}

          {/* Vertical Step Ladder of Pratyantardashas (Sub-sub periods) */}
          <div style={{
            background: "rgba(0,0,0,0.12)",
            borderRadius: 12,
            border: "0.5px solid rgba(255,255,255,0.03)",
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            <div style={{
              fontSize: 8.5,
              color: "rgba(255,255,255,0.25)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 4
            }}>
              <ChevronDown size={10} />
              {t("Pratyantardasha (Sub-sub periods)", "ప్రత్యంతర్దశలు")}
            </div>

            {generatePADsForAd(selectedAdLordEn, selectedAd.start, selectedAd.end).map((pad, pidx) => {
              const padColor = PLANET_COLORS[pad.lord_en] ?? "#c9a96e";
              return (
                <div key={pidx} style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 8px",
                  borderRadius: 8,
                  background: pad.is_current ? "rgba(255,255,255,0.04)" : "transparent",
                  border: pad.is_current ? `0.5px solid ${padColor}40` : "0.5px solid transparent",
                  transition: "all 140ms",
                }}>
                  {/* Step dot connector */}
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.12)", marginRight: 5 }}>↳</span>

                  {/* Planet dot */}
                  <div style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: padColor,
                    marginRight: 8,
                  }} />

                  <span style={{
                    fontSize: 11.5,
                    color: pad.is_current ? padColor : "#a0a0b0",
                    fontWeight: pad.is_current ? 700 : 400,
                    minWidth: 70
                  }}>
                    {pick(pad, "lord")}
                  </span>

                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>
                    {pad.start} → {pad.end}
                  </span>

                  {pad.is_current && (
                    <span style={{
                      fontSize: 8,
                      color: padColor,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      marginLeft: "auto"
                    }}>
                      ◀ {t("ACTIVE", "యాక్టివ్")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
