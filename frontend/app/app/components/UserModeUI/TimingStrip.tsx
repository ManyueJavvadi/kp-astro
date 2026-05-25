"use client";

/**
 * TimingStrip — Premium vertical Vimshottari Timeline visualization (PR A1.3-revamp).
 *
 * Transforms the horizontal timing bar into a gorgeous vertical timeline
 * featuring circular planetary orbital nodes, golden connector threads,
 * and simplified, bilingual, non-technical period summaries.
 */

import React from "react";
import { Sparkles, Calendar, ArrowRight } from "lucide-react";

interface Props {
  currentDasha: any;
  upcomingAntardashas?: any[]; // optional
  chartData?: any; // optional fallback for antardashas list
}

const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#38bdf8", Mars: "#f87171", Rahu: "#a78bfa",
  Jupiter: "#f472b6", Saturn: "#94a3b8", Mercury: "#34d399", Ketu: "#fb923c", Venus: "#c9a96e"
};

const PLANET_TELUGU: Record<string, string> = {
  Sun: "సూర్యుడు (Sun)", Moon: "చంద్రుడు (Moon)", Mars: "కుజుడు (Mars)",
  Mercury: "బుధుడు (Mercury)", Jupiter: "గురుడు (Jupiter)", Venus: "శుక్రుడు (Venus)",
  Saturn: "శని (Saturn)", Rahu: "రాహువు (Rahu)", Ketu: "కేతువు (Ketu)"
};

interface Interpretation {
  title: string;
  titleTe: string;
  desc: string;
  descTe: string;
}

const DASHA_INTERPRETATIONS: Record<string, Interpretation> = {
  Ketu: {
    title: "Spiritual Seeking & Meditation",
    titleTe: "ఆధ్యాత్మిక అన్వేషణ & అంతర్మథనం",
    desc: "A period of detachment, inner growth, deep wisdom, and spiritual alignment. Great for meditation.",
    descTe: "ఒంటరితనం, అంతర్గత ఎదుగుదల, ఆధ్యాత్మిక బలం మరియు పరిశోధనలకు అత్యంత అనుకూలమైన కాలం."
  },
  Venus: {
    title: "Luxury, Harmony & Creative Rise",
    titleTe: "విలాసవంతమైన జీవితం & ఆర్థిక వృద్ధి",
    desc: "Governs comfort, relationships, artistic pursuits, financial gain, and general life happiness.",
    descTe: "విలాసాలు, వాహన యోగం, వైవాహిక బలం, వ్యాపార ప్రగతి మరియు లలిత కళల సాధనకు అనుకూలమైన కాలం."
  },
  Sun: {
    title: "Authority, Career Peak & Soul Power",
    titleTe: "అధికార యోగం & ఆత్మగౌరవం",
    desc: "Brings career recognition, support from authorities, professional status, and high vitality.",
    descTe: "కీర్తి ప్రతిష్టలు, ప్రభుత్వ రంగ అనుకూలత, ఉన్నత పదవులు, ఆత్మవిశ్వాసం మరియు శారీరక తేజస్సుకు అనుకూల సమయం."
  },
  Moon: {
    title: "Intuition, Family Bond & Imagination",
    titleTe: "మానసిక ప్రశాంతత & గృహ వృద్ధి",
    desc: "Focuses on domestic happiness, mental clarity, travel, and creative expression.",
    descTe: "కుటుంబ సౌఖ్యం, నూతన పరిచయాలు, మానసిక ఆనందం, ప్రయాణాలు మరియు సృజనాత్మక ఆలోచనలకు అనుకూల సమయం."
  },
  Mars: {
    title: "Courage, Drive & Property Gain",
    titleTe: "ధైర్య సాహసాలు & స్థిరాస్తి యోగం",
    desc: "High physical energy, competitive victory, property purchases, and dynamic action.",
    descTe: "అధిక శక్తి, పట్టుదల, భూమి/స్థిరాస్తి కొనుగోలు మరియు పోటీలలో విజయం సాధించే అద్భుత కాలం."
  },
  Rahu: {
    title: "Ambitious Expansion & Unconventional Gains",
    titleTe: "విదేశీ ప్రయాణాలు & ఆకస్మిక యోగం",
    desc: "Triggers intense ambitions, technology pursuits, foreign connections, and sudden material growth.",
    descTe: "భారీ లక్ష్యాలు, విదేశీ ప్రయాణాలు, వినూత్న ఆలోచనలు మరియు ఆకస్మిక ధన లాభాలను తెచ్చిపెట్టే కాలం."
  },
  Jupiter: {
    title: "Wisdom, Expansion & Good Fortune",
    titleTe: "జ్ఞానోదయం & సువర్ణ కాలం",
    desc: "A golden period of wisdom, financial prosperity, marriage promise, learning, and family growth.",
    descTe: "విద్యా ప్రాప్తి, పెళ్లి యోగం, సంతాన భాగ్యం, ఆర్థిక ఉన్నతి మరియు ధర్మ కార్యాలకు అత్యంత శుభప్రదమైన కాలం."
  },
  Saturn: {
    title: "Discipline, Duty & Long-term Mastery",
    titleTe: "క్రమశిక్షణ & స్థిరమైన ప్రగతి",
    desc: "Demands discipline, patience, and duty. Delivers steady, foundational long-term career growth.",
    descTe: "నిబద్ధత, కఠోర శ్రమ, మరియు క్రమశిక్షణ ద్వారా జీవితంలో తిరుగులేని పునాదులను సాధించే కాలం."
  },
  Mercury: {
    title: "Intellect, Business Growth & Speech",
    titleTe: "బుద్ధి బలం & వ్యాపార వృద్ధి",
    desc: "Excellent for studies, contract signing, business development, and articulate communication.",
    descTe: "వ్యాపార లావాదేవీలు, నూతన ఒప్పందాలు, విద్యా రంగంలో అద్భుత రాణన మరియు చాకచక్యంతో వ్యవహరించే కాలం."
  }
};

export function TimingStrip({ currentDasha, upcomingAntardashas, chartData }: Props) {
  const md = currentDasha?.mahadasha || currentDasha?.current_mahadasha;
  const ad = currentDasha?.antardasha || currentDasha?.current_antardasha;

  if (!ad?.antardasha_lord) {
    return null;
  }

  // Build list of segments (current + next 3)
  const segments: Array<{ lord: string; start: string; end: string; isCurrent: boolean }> = [];
  segments.push({
    lord: ad.antardasha_lord,
    start: ad.start,
    end: ad.end,
    isCurrent: true,
  });

  // Extract from upcomingAntardashas if available
  if (upcomingAntardashas?.length) {
    const curIdx = upcomingAntardashas.findIndex(
      (a: any) => (a.antardasha_lord || a.lord || a.lord_en) === ad.antardasha_lord && a.start === ad.start
    );
    if (curIdx >= 0) {
      for (let i = 1; i <= 3; i++) {
        const nx = upcomingAntardashas[curIdx + i];
        if (nx) {
          segments.push({
            lord: nx.antardasha_lord || nx.lord || nx.lord_en,
            start: nx.start,
            end: nx.end,
            isCurrent: false
          });
        }
      }
    }
  } 
  // Fall back to chartData.antardashas if available
  else if (chartData?.antardashas?.length) {
    const activeAdIdx = chartData.antardashas.findIndex((a: any) => a.is_current || a.isCurrent);
    if (activeAdIdx >= 0) {
      for (let i = 1; i <= 3; i++) {
        const nx = chartData.antardashas[activeAdIdx + i];
        if (nx) {
          segments.push({
            lord: nx.lord_en || nx.lord || nx.antardasha_lord,
            start: nx.start,
            end: nx.end,
            isCurrent: false
          });
        }
      }
    }
  }

  // Compute progress through current segment
  const curDur = durationDays(ad.start, ad.end) || 1;
  const elapsed = durationDays(ad.start, todayISO());
  const progress = Math.max(0, Math.min(100, (elapsed / curDur) * 100));

  return (
    <section className="user-card celestial-glass" style={{ borderRadius: 14, padding: "16px 18px", border: "0.5px solid rgba(201, 169, 110, 0.18)" }}>
      {/* Header title */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={15} style={{ color: "#c9a96e" }} />
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700, color: "#c9a96e", letterSpacing: "0.06em", margin: 0 }}>
            Vimshottari Timeline (జీవన కాలక్రమం)
          </h3>
        </div>
        {md?.lord && (
          <span style={{ fontSize: 9.5, padding: "2px 6px", background: "rgba(201, 169, 110, 0.1)", border: "0.5px solid rgba(201, 169, 110, 0.2)", borderRadius: 4, color: "#c9a96e", marginLeft: "auto" }}>
            {md.lord} MD
          </span>
        )}
      </div>

      {/* Vertical Timeline container */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 18, paddingLeft: 8 }}>
        {/* Golden connecting thread line */}
        <div style={{
          position: "absolute",
          top: 8,
          left: 17,
          bottom: 24,
          width: "1.5px",
          background: "linear-gradient(to bottom, #c9a96e 0%, rgba(201, 169, 110, 0.2) 70%, rgba(255, 255, 255, 0.02) 100%)",
          zIndex: 1
        }} />

        {segments.map((seg, idx) => {
          const color = PLANET_COLORS[seg.lord] || "#c9a96e";
          const interp = DASHA_INTERPRETATIONS[seg.lord] || {
            title: "Planetary Activation Period",
            titleTe: "గ్రహ ప్రభావ కాలం",
            desc: "Brings transitions and unique challenges according to the planet's custom placements.",
            descTe: "మీ జాతకంలో గ్రహ స్థానాన్ని బట్టి అనుకూల ఫలితాలు కలుగుతాయి."
          };

          return (
            <div key={`${seg.lord}-${seg.start}`} style={{ display: "flex", gap: 14, position: "relative", zIndex: 2 }}>
              {/* Vertical node circle */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: seg.isCurrent ? `radial-gradient(circle, #1c1917 20%, ${color}22 100%)` : "#141416",
                  border: `1.5px solid ${seg.isCurrent ? color : "rgba(255, 255, 255, 0.15)"}`,
                  boxShadow: seg.isCurrent ? `0 0 10px ${color}55` : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: "bold",
                  color: seg.isCurrent ? color : "#888899",
                  transition: "all 300ms ease"
                }}>
                  {seg.lord[0]}
                </div>
                
                {seg.isCurrent && (
                  <div style={{
                    position: "absolute",
                    top: -4,
                    left: -4,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: `1px solid ${color}33`,
                    animation: "user-blink 2s ease-in-out infinite",
                    pointerEvents: "none"
                  }} />
                )}
              </div>

              {/* Timing details bubble */}
              <div style={{
                flex: 1,
                background: seg.isCurrent ? "rgba(201, 169, 110, 0.03)" : "transparent",
                border: seg.isCurrent ? "0.5px solid rgba(201, 169, 110, 0.12)" : "0.5px solid transparent",
                borderRadius: 10,
                padding: seg.isCurrent ? "8px 12px" : "2px 0 0 0",
                marginTop: -2
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: seg.isCurrent ? "#f0f0f0" : "#a0a0b0" }}>
                      {PLANET_TELUGU[seg.lord]?.split(" ")[0] || seg.lord}
                    </span>
                    <span style={{ fontSize: 10, color: "#777788" }}>
                      ({seg.lord})
                    </span>
                    {seg.isCurrent && (
                      <span style={{
                        fontSize: 8.5,
                        background: "rgba(201,169,110,0.18)",
                        border: "0.5px solid rgba(201,169,110,0.35)",
                        color: "#c9a96e",
                        padding: "1px 4px",
                        borderRadius: 3,
                        fontWeight: 600,
                        letterSpacing: "0.02em"
                      }}>
                        NOW
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: seg.isCurrent ? "#c9a96e" : "#666677" }}>
                    {fmtShort(seg.start)} – {fmtShort(seg.end)}
                  </span>
                </div>

                {/* Subtitle */}
                <div style={{ fontSize: 11, fontWeight: 600, color: seg.isCurrent ? color : "#888899", marginTop: 2 }}>
                  {interp.title}
                </div>

                {/* Evocative interpretation text */}
                <div style={{ fontSize: 10.5, color: seg.isCurrent ? "#a0a0b0" : "#777788", marginTop: 4, lineHeight: 1.4 }}>
                  {seg.isCurrent ? interp.desc : interp.descTe.slice(0, 50) + "..."}
                </div>

                {/* Micro circular progress ring for current active dasha */}
                {seg.isCurrent && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, borderTop: "0.5px solid rgba(255, 255, 255, 0.04)", paddingTop: 6 }}>
                    <div style={{ position: "relative", width: 14, height: 14 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="transparent" />
                        <circle cx="7" cy="7" r="5" stroke={color} strokeWidth="1.5" fill="transparent"
                                strokeDasharray="31.4" strokeDashoffset={31.4 - (31.4 * progress) / 100} />
                      </svg>
                    </div>
                    <span style={{ fontSize: 10, color: "#888899" }}>
                      You are <strong>{Math.round(progress)}%</strong> through this sub-period
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function durationDays(startISO: string, endISO: string): number {
  if (!startISO || !endISO) return 0;
  const a = new Date(startISO).getTime();
  const b = new Date(endISO).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(0, (b - a) / (1000 * 60 * 60 * 24));
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtShort(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
}
