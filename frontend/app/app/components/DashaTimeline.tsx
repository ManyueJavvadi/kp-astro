"use client";
import React, { useState } from "react";
import { PLANET_COLORS } from "./constants";
import { useLanguage } from "@/lib/i18n";
import { ChevronDown, ChevronRight, Sparkles, Briefcase, Heart, Shield, Landmark } from "lucide-react";

// Vimshottari parameters for dynamically generating Pratyantardashas (sub-sub periods)
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

interface DashaTimelineProps {
  mahadasha: any;
  antardashas: any[];
  workspaceData?: any;
}

export default function DashaTimeline({ mahadasha, antardashas, workspaceData }: DashaTimelineProps) {
  const { lang, t } = useLanguage();
  // Auto-expand current Antardasha in timeline on initial render
  const currentAdIdx = antardashas.findIndex((ad: any) => ad.is_current);
  const [expandedAdIndex, setExpandedAdIndex] = useState<number | null>(
    currentAdIdx !== -1 ? currentAdIdx : null
  );

  const pick = (obj: any, base: string): string =>
    lang === "en" ? (obj[`${base}_en`] ?? "") : (obj[`${base}_te`] ?? obj[`${base}_en`] ?? "");

  const today = new Date();
  const mdStart = new Date(mahadasha.start);
  const mdEnd = new Date(mahadasha.end);
  const pct = Math.min(100, ((today.getTime() - mdStart.getTime()) / (mdEnd.getTime() - mdStart.getTime())) * 100);

  // Helper to derive planet significations for professional badges
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

  // Dynamically generate the 9 Pratyantardashas (PADs) for any given Antardasha
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

  // 2026-06-22 — Sookshma (4th level) generator. Mirrors generatePADsForAd
  // AND the backend `calculate_sookshma_dashas` EXACTLY (duration =
  // parent × lord-years/120, sequence from the PAD lord), so the dates
  // match what the AI receives. For the CURRENT AD we instead render the
  // backend's `sookshmas_current_ad` verbatim — it carries the very same
  // fire-scores the AI uses, so the UI and the AI are provably consistent.
  const generateSookshmasForPad = (padLordEn: string, padStart: string, padEnd: string) => {
    const startIndex = PLANETS_ORDER.indexOf(padLordEn);
    if (startIndex === -1) return [];
    const startMs = new Date(padStart).getTime();
    const endMs = new Date(padEnd).getTime();
    const total = endMs - startMs;
    if (total <= 0) return [];
    const ordered = [...PLANETS_ORDER.slice(startIndex), ...PLANETS_ORDER.slice(0, startIndex)];
    let cur = startMs;
    return ordered.map((lord) => {
      const dur = total * (VIMSHOTTARI_YEARS[lord] / 120);
      const s = new Date(cur);
      const e = new Date(cur + dur);
      cur += dur;
      const nowMs = today.getTime();
      return {
        sookshma_lord: lord, lord_en: lord, lord_te: lord,
        start: s.toISOString().split("T")[0],
        end: e.toISOString().split("T")[0],
        is_current: nowMs >= s.getTime() && nowMs <= e.getTime(),
      };
    });
  };
  // Backend sookshma for the current AD (keyed by PAD lord) — the exact
  // array the AI consumes, including pre-computed fire scores.
  const sookshmasCurrentAd =
    (workspaceData as { sookshmas_current_ad?: Record<string, any[]> } | undefined)
      ?.sookshmas_current_ad ?? {};
  const [expandedPadKey, setExpandedPadKey] = useState<string | null>(null);

  return (
    <div>
      {/* Mahadasha Header with visual gold-indigo gradient bar */}
      <div className="celestial-glass celestial-panel" style={{
        marginBottom: "1.25rem",
        borderRadius: 12,
        padding: "16px",
        border: "1px solid rgba(212, 175, 55, 0.25)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span className="celestial-serif" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={13} style={{ color: "#c9a96e" }} />
            {pick(mahadasha, "lord")} {t("Mahadasha", "మహాదశ")}
          </span>
          <span className="celestial-mono" style={{ fontSize: 11, color: "var(--muted)" }}>{mahadasha.start} → {mahadasha.end}</span>
        </div>
        <div style={{ background: "rgba(255, 255, 255, 0.04)", borderRadius: 6, height: 6, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            borderRadius: 6,
            background: `linear-gradient(90deg, ${PLANET_COLORS[mahadasha.lord_en] || "var(--accent)"} 0%, #1f1b3e 100%)`,
            width: `${pct}%`,
            transition: "width 0.5s"
          }} />
        </div>
        <div className="celestial-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--muted)", marginTop: 4 }}>
          <span>{pct}% Completed</span>
          <span>{Math.round((120 - pct) / 100 * (mahadasha.years ?? 0))}y remaining</span>
        </div>
      </div>

      {/* Accordion Tree of Antardashas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {antardashas.map((ad: any, idx: number) => {
          const adLordEn = ad.lord_en || ad.lord || "";
          const isPast = new Date(ad.end) < today;
          const isExpanded = expandedAdIndex === idx;
          const badges = getTopicBadges(adLordEn);

          return (
            <div key={idx} className="celestial-glass celestial-panel" style={{
              borderRadius: 10,
              background: ad.is_current ? "rgba(201,169,110,0.06)" : "rgba(255,255,255,0.01)",
              border: `1px solid ${ad.is_current ? "rgba(212, 175, 55, 0.3)" : "rgba(255,255,255,0.03)"}`,
              overflow: "hidden",
              opacity: isPast ? 0.5 : 1,
              transition: "all 200ms ease"
            }}>
              {/* Row Header */}
              <div
                onClick={() => setExpandedAdIndex(isExpanded ? null : idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 14px",
                  cursor: "pointer",
                  userSelect: "none"
                }}
              >
                {/* Expand Chevron */}
                <div style={{ color: "var(--muted)", marginRight: 8, display: "flex", alignItems: "center" }}>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>

                {/* Status Dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: PLANET_COLORS[adLordEn] || "var(--accent)",
                  boxShadow: ad.is_current ? `0 0 8px ${PLANET_COLORS[adLordEn] || "var(--accent)"}` : "none",
                  marginRight: 10,
                  flexShrink: 0
                }} />

                {/* Lord Name */}
                <span className="celestial-serif" style={{
                  fontSize: 13,
                  fontWeight: ad.is_current ? 700 : 500,
                  color: ad.is_current ? "var(--accent)" : "var(--text)",
                  minWidth: 80
                }}>
                  {pick(ad, "lord")}
                </span>

                {/* Dates */}
                <span className="celestial-mono" style={{ fontSize: 10.5, color: "var(--muted)", flex: 1 }}>
                  {ad.start} → {ad.end}
                </span>

                {/* Dynamic Badges */}
                <div style={{ display: "flex", gap: 4, alignItems: "center", marginRight: 8 }}>
                  {badges.map(b => (
                    <span key={b.id} style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 2,
                      fontSize: 8.5,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: b.bg,
                      color: b.color,
                      border: `0.5px solid ${b.color}25`
                    }} title={`${adLordEn} activates ${b.id} houses`}>
                      {b.icon}
                      {b.label}
                    </span>
                  ))}
                </div>

                {/* Current Badge */}
                {ad.is_current && (
                  <span style={{
                    fontSize: 9,
                    background: "rgba(201,169,110,0.18)",
                    border: "0.5px solid rgba(201,169,110,0.35)",
                    color: "var(--accent)",
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontWeight: 600,
                    letterSpacing: "0.02em"
                  }}>
                    {t("Now", "ప్రస్తుతం")}
                  </span>
                )}
              </div>

              {/* Collapsible Pratyantardasha (Sub-Sub Periods) Cascade */}
              {isExpanded && (
                <div style={{
                  background: "rgba(0,0,0,0.15)",
                  borderTop: "0.5px solid rgba(255,255,255,0.03)",
                  padding: "8px 12px 8px 32px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  animation: "fadeIn 150ms ease"
                }}>
                  <div style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.25)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 4
                  }}>
                    {t("Pratyantardasha (Sub-sub periods)", "प्रत्यంతర్దశలు")}
                  </div>
                  {generatePADsForAd(adLordEn, ad.start, ad.end).map((pad, pidx) => {
                    const padColor = PLANET_COLORS[pad.lord_en] ?? "#c9a96e";
                    const padBadges = getTopicBadges(pad.lord_en);
                    const padKey = `${idx}-${pidx}`;
                    const isPadOpen = expandedPadKey === padKey;
                    // Sookshma source: backend (AI-exact, fire scores) for the
                    // CURRENT AD; identical-method generation for other ADs.
                    const backendSooks = ad.is_current ? (sookshmasCurrentAd[pad.lord_en] ?? null) : null;
                    const sooks: any[] = backendSooks && backendSooks.length
                      ? [...backendSooks].sort((a, b) => String(a.start).localeCompare(String(b.start)))
                      : generateSookshmasForPad(pad.lord_en, pad.start, pad.end);
                    const hasSooks = sooks.length > 0;
                    return (
                      <div key={pidx}>
                        <div
                          onClick={hasSooks ? () => setExpandedPadKey(isPadOpen ? null : padKey) : undefined}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "5px 8px",
                            borderRadius: 6,
                            background: pad.is_current ? "rgba(255,255,255,0.03)" : "transparent",
                            border: pad.is_current ? `0.5px solid ${padColor}40` : "0.5px solid transparent",
                            cursor: hasSooks ? "pointer" : "default",
                          }}
                        >
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", marginRight: 6 }}>↳</span>
                          {hasSooks && (
                            <span style={{ fontSize: 8, color: padColor, marginRight: 4, width: 8, display: "inline-block", flexShrink: 0 }}>
                              {isPadOpen ? "▾" : "▸"}
                            </span>
                          )}

                          {/* PAD Color dot */}
                          <div style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: padColor,
                            marginRight: 8,
                            flexShrink: 0
                          }} />

                          <span style={{
                            fontSize: 12,
                            color: pad.is_current ? padColor : "#a0a0b0",
                            fontWeight: pad.is_current ? 600 : 400,
                            minWidth: 80
                          }}>
                            {pick(pad, "lord")}
                          </span>

                          <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.3)" }}>
                            {pad.start} → {pad.end}
                          </span>

                          {/* PAD level badges (only if active) */}
                          {pad.is_current && (
                            <div style={{ display: "flex", gap: 3, marginLeft: "auto", marginRight: 6 }}>
                              {padBadges.map(b => (
                                <span key={b.id} style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 1,
                                  fontSize: 7.5,
                                  padding: "1px 4px",
                                  borderRadius: 3,
                                  background: b.bg,
                                  color: b.color,
                                }}>
                                  {b.icon}
                                </span>
                              ))}
                            </div>
                          )}

                          {pad.is_current && (
                            <span style={{
                              fontSize: 8,
                              color: padColor,
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                              marginLeft: pad.is_current ? "0" : "auto"
                            }}>
                              ◀ {t("ACTIVE", "యాక్టివ్")}
                            </span>
                          )}
                        </div>

                        {/* Sookshma (4th level) — day-precision sub-windows */}
                        {isPadOpen && hasSooks && (
                          <div style={{ paddingLeft: 26, marginTop: 2, marginBottom: 4, display: "flex", flexDirection: "column", gap: 1 }}>
                            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                              {t("Sookshma (day-level)", "సూక్ష్మ (రోజు-స్థాయి)")}
                              {backendSooks ? ` · ${t("AI-synced", "AI-సమకాలీకృతం")}` : ""}
                            </div>
                            {sooks.map((sd: any, sidx: number) => {
                              const sdLord = sd.sookshma_lord ?? sd.lord_en ?? sd.lord ?? "?";
                              const sdColor = PLANET_COLORS[sdLord] ?? "#888899";
                              const fire = typeof sd.fire_score === "number" ? sd.fire_score : undefined;
                              const nowMs = today.getTime();
                              const sdCur = sd.is_current ?? (nowMs >= new Date(sd.start).getTime() && nowMs <= new Date(sd.end).getTime());
                              return (
                                <div key={sidx} style={{
                                  display: "flex", alignItems: "center", gap: 6,
                                  padding: "2px 6px", borderRadius: 5,
                                  background: sdCur ? `${sdColor}14` : "transparent",
                                }}>
                                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.12)" }}>·</span>
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: sdColor, flexShrink: 0 }} />
                                  <span style={{ fontSize: 10.5, color: sdCur ? sdColor : "#9090a0", fontWeight: sdCur ? 600 : 400, minWidth: 70 }}>{sdLord}</span>
                                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)" }}>{sd.start} → {sd.end}</span>
                                  {fire !== undefined && (
                                    <span title={t("Fire score — the exact value sent to the AI", "ఫైర్ స్కోర్ — AI కి పంపే విలువ")} style={{ fontSize: 8, fontWeight: 700, color: sdColor, marginLeft: 2, opacity: 0.85 }}>🔥{fire}</span>
                                  )}
                                  {sdCur && <span style={{ fontSize: 7.5, color: sdColor, fontWeight: 700, marginLeft: 2 }}>◀ {t("NOW", "ప్రస్తుతం")}</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
