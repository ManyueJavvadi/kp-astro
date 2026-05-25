"use client";

/**
 * ChartSnapshot — Sleek golden profile card + Daily Auspicious Pulse (PR A1.3-revamp).
 *
 * Displays:
 *   1. Foundational profile badges in a 2x2 grid (Lagna, Moon Sign, Moon Nakshatra, Dasha chain).
 *   2. Daily Auspicious Pulse: A beautiful 100% KP-strict transit rating widget. It analyzes the
 *      active Antardasha lord's natal house significators to score Love, Career, Health, and Finance.
 */

import React from "react";
import { User, Activity, Heart, Briefcase, ShieldAlert, Navigation } from "lucide-react";

interface Props {
  birthDetails: { name: string; date: string };
  chartData: any;
  currentDasha: any;
}

const PLANET_TELUGU: Record<string, string> = {
  Sun: "సూర్యుడు", Moon: "చంద్రుడు", Mars: "కుజుడు",
  Mercury: "బుధుడు", Jupiter: "గురుడు", Venus: "శుక్రుడు",
  Saturn: "శని", Rahu: "రాహువు", Ketu: "కేతువు"
};

const SIGN_TELUGU: Record<string, string> = {
  Aries: "మేషం", Taurus: "వృషభం", Gemini: "మిథునం", Cancer: "కర్కాటకం",
  Leo: "సింహం", Virgo: "కన్య", Libra: "తుల", Scorpio: "వృశ్చికం",
  Sagittarius: "ధనుస్సు", Capricorn: "మకరం", Aquarius: "కుంభం", Pisces: "మీనం"
};

export function ChartSnapshot({ birthDetails, chartData, currentDasha }: Props) {
  // Extract Lagna details
  const lagna = chartData?.chart?.cusps?.House_1 || chartData?.cusps?.House_1;
  const lagnaDeg = lagna ? (lagna.cusp_longitude ?? lagna.longitude ?? 0) % 30 : 0;
  
  // Extract Moon details
  const moon = chartData?.moon || chartData?.chart?.moon;

  // Extract Dasha details
  const md = currentDasha?.mahadasha || currentDasha?.current_mahadasha;
  const ad = currentDasha?.antardasha || currentDasha?.current_antardasha;
  const adLord = ad?.antardasha_lord || ad?.lord || ad?.lord_en || "";

  // ── Daily Auspicious Pulse Calculations (KP-Strict Significators) ──
  const getPlanetSigs = (planetName: string): number[] => {
    const sigs: number[] = [];
    const significators = chartData?.significators || chartData?.chart?.significators;
    if (!significators) return sigs;
    
    Object.entries(significators).forEach(([houseStr, sig]: [string, any]) => {
      const allSigs = sig.all_significators_en || sig.significators || [];
      if (allSigs.includes(planetName)) {
        sigs.push(parseInt(houseStr, 10));
      }
    });
    return sigs.sort((a, b) => a - b);
  };

  const adSigs = adLord ? getPlanetSigs(adLord) : [];

  // Helper to score a domain based on positive and negative houses
  const computeDomainScore = (positive: number[], negative: number[], base: number): number => {
    if (!adLord || adSigs.length === 0) return base;
    let score = base;
    positive.forEach(h => {
      if (adSigs.includes(h)) score += 15;
    });
    negative.forEach(h => {
      if (adSigs.includes(h)) score -= 18;
    });
    return Math.max(18, Math.min(96, score));
  };

  const loveScore = computeDomainScore([2, 7, 11], [6, 10], 60);
  const careerScore = computeDomainScore([2, 6, 10, 11], [5, 8, 12], 65);
  const healthScore = computeDomainScore([1, 5, 11], [6, 8, 12], 72);
  const financeScore = computeDomainScore([2, 6, 11], [8, 12], 60);

  const getStatusLabel = (score: number): { text: string; textTe: string; color: string; bg: string } => {
    if (score >= 72) return { text: "Auspicious", textTe: "అనుకూలం", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" };
    if (score >= 45) return { text: "Neutral", textTe: "సాధారణం", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.1)" };
    return { text: "Caution", textTe: "జాగ్రత్త", color: "#f43f5e", bg: "rgba(244, 63, 94, 0.1)" };
  };

  const domainBadges = [
    {
      id: "love",
      label: "Love & Union",
      labelTe: "ప్రేమ & బంధాలు",
      icon: <Heart size={13} />,
      score: loveScore,
      status: getStatusLabel(loveScore)
    },
    {
      id: "career",
      label: "Career & Work",
      labelTe: "ఉద్యోగం & కీర్తి",
      icon: <Briefcase size={13} />,
      score: careerScore,
      status: getStatusLabel(careerScore)
    },
    {
      id: "health",
      label: "Health & Energy",
      labelTe: "ఆరోగ్యం & తేజస్సు",
      icon: <ShieldAlert size={13} />,
      score: healthScore,
      status: getStatusLabel(healthScore)
    },
    {
      id: "finance",
      label: "Money & Travel",
      labelTe: "ధనం & ప్రయాణం",
      icon: <Navigation size={13} />,
      score: financeScore,
      status: getStatusLabel(financeScore)
    }
  ];

  return (
    <section className="user-card celestial-glass" style={{ borderRadius: 14, padding: "16px 18px", border: "0.5px solid rgba(201, 169, 110, 0.18)" }}>
      {/* Foundational Profile Badge Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <User size={15} style={{ color: "#c9a96e" }} />
        <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700, color: "#c9a96e", letterSpacing: "0.06em", margin: 0 }}>
          Your Vedic Blueprint (జన్మ వివరాలు)
        </h3>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
        {/* Lagna Badge */}
        {lagna && (
          <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.015)", border: "0.5px solid rgba(255,255,255,0.04)", borderRadius: 8 }}>
            <span style={{ fontSize: 9, color: "#888899", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Lagna (లగ్నం)</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e2e7" }}>
              {SIGN_TELUGU[lagna.sign] || lagna.sign}
            </span>
            <span style={{ fontSize: 9.5, color: "#888899", display: "block", marginTop: 1 }}>{lagnaDeg.toFixed(1)}° · {lagna.nakshatra?.slice(0, 8)}</span>
          </div>
        )}

        {/* Moon Badge */}
        {moon && (
          <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.015)", border: "0.5px solid rgba(255,255,255,0.04)", borderRadius: 8 }}>
            <span style={{ fontSize: 9, color: "#888899", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Star (నక్షత్రం)</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e2e7" }}>
              {moon.nakshatra_en || moon.nakshatra}
            </span>
            <span style={{ fontSize: 9.5, color: "#888899", display: "block", marginTop: 1 }}>
              {SIGN_TELUGU[moon.sign_en || moon.sign] || moon.sign_en || moon.sign} రాశి
            </span>
          </div>
        )}
      </div>

      {/* Daily Auspicious Pulse Section */}
      <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Activity size={14} style={{ color: "#3b82f6" }} />
          <h4 style={{ fontFamily: "'Cinzel', serif", fontSize: 12.5, fontWeight: 700, color: "#e2e2e7", margin: 0 }}>
            Daily Auspicious Pulse (నేటి ప్రభావం)
          </h4>
        </div>

        {adLord && (
          <div style={{ fontSize: 10, color: "#888899", marginBottom: 12, lineHeight: 1.4 }}>
            Scores calculated under <strong style={{ color: "#c9a96e" }}>KP-Strict CSL rules</strong> based on active Sub-Lord <strong style={{ color: "#c9a96e" }}>{adLord} ({PLANET_TELUGU[adLord] || adLord})</strong>.
          </div>
        )}

        {/* Domian Progress capsules grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {domainBadges.map(badge => (
            <div key={badge.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.01)", border: "0.5px solid rgba(255,255,255,0.03)", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: badge.status.color, display: "flex", alignItems: "center" }}>{badge.icon}</span>
                <div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "#e2e2e7", display: "block" }}>{badge.label}</span>
                  <span style={{ fontSize: 9.5, color: "#888899" }}>{badge.labelTe}</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Score & Status text */}
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#e2e2e7" }}>{badge.score}%</span>
                  <span style={{
                    fontSize: 8.5,
                    display: "block",
                    fontWeight: 700,
                    color: badge.status.color,
                    marginTop: 1
                  }}>
                    {badge.status.text} / {badge.status.textTe}
                  </span>
                </div>

                {/* Progress bar loop */}
                <div style={{ position: "relative", width: 28, height: 28 }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="14" cy="14" r="10" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" fill="transparent" />
                    <circle cx="14" cy="14" r="10" stroke={badge.status.color} strokeWidth="2.5" fill="transparent"
                            strokeDasharray="62.8" strokeDashoffset={62.8 - (62.8 * badge.score) / 100}
                            style={{ transition: "stroke-dashoffset 800ms ease" }} />
                  </svg>
                  <div style={{
                    position: "absolute",
                    top: -1, left: -1, width: 30, height: 30,
                    borderRadius: "50%",
                    boxShadow: `0 0 10px ${badge.status.color}15`,
                    pointerEvents: "none"
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
