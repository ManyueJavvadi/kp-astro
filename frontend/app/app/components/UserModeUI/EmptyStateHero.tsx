"use client";

import React, { useState } from "react";
import { 
  Sparkles, Heart, Briefcase, Wallet, Compass, 
  ChevronDown, ChevronUp, User, Star, Activity, 
  BookOpen, HelpCircle 
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Props {
  birthDetails: { name: string; date: string; time: string; ampm: string; place: string };
  currentDasha: any;
  chartData: any;
  onPickQuestion: (q: string) => void;
}

const SIGN_LORDS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter"
};

const SIGN_TELUGU: Record<string, string> = {
  Aries: "మేషం (Aries)", Taurus: "వృషభం (Taurus)", Gemini: "మిథునం (Gemini)", Cancer: "కర్కాటకం (Cancer)",
  Leo: "సింహం (Leo)", Virgo: "కన్య (Virgo)", Libra: "తుల (Libra)", Scorpio: "వృశ్చికం (Scorpio)",
  Sagittarius: "ధనుస్సు (Sagittarius)", Capricorn: "మకరం (Capricorn)", Aquarius: "కుంభం (Aquarius)", Pisces: "మీనం (Pisces)"
};

const PLANET_TELUGU: Record<string, string> = {
  Sun: "సూర్యుడు (Sun)", Moon: "చంద్రుడు (Moon)", Mars: "కుజుడు (Mars)", 
  Mercury: "బుధుడు (Mercury)", Jupiter: "గురుడు (Jupiter)", Venus: "శుక్రుడు (Venus)", 
  Saturn: "శని (Saturn)", Rahu: "రాహువు (Rahu)", Ketu: "కేతువు (Ketu)"
};

const ORACLE_CATEGORIES = [
  {
    id: "love",
    label: "Love & Union",
    labelTe: "ప్రేమ & వివాహం",
    icon: <Heart size={16} />,
    color: "rgba(244, 63, 94, 0.08)",
    borderColor: "rgba(244, 63, 94, 0.25)",
    textColor: "#f43f5e",
    questions: [
      "Is marriage promised in my chart, and what will my partner be like?",
      "Which coming period looks most supportive for marriage?",
      "Is there any delay or friction in my relationship houses?"
    ]
  },
  {
    id: "career",
    label: "Career & Profession",
    labelTe: "ఉద్యోగం & కెరీర్",
    icon: <Briefcase size={16} />,
    color: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.25)",
    textColor: "#10b981",
    questions: [
      "Am I promised a successful career in job or business?",
      "Which coming period looks stronger for promotion or job change?",
      "Does my 10th cusp sub lord support a stable career?"
    ]
  },
  {
    id: "wealth",
    label: "Wealth & Finance",
    labelTe: "ధనయోగం & సంపద",
    icon: <Wallet size={16} />,
    color: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.25)",
    textColor: "#f59e0b",
    questions: [
      "Which coming period looks stronger for income and savings?",
      "Am I promised wealth inheritance or property purchase?",
      "Will I successfully recover my lent money or pending refunds?"
    ]
  },
  {
    id: "destiny",
    label: "Travel & Destiny",
    labelTe: "ప్రయాణం & ఆరోగ్యం",
    icon: <Compass size={16} />,
    color: "rgba(59, 130, 246, 0.08)",
    borderColor: "rgba(59, 130, 246, 0.25)",
    textColor: "#3b82f6",
    questions: [
      "Does my chart support foreign travel or permanent settlement?",
      "What does my 1st cusp sub lord say about my physical vitality?",
      "Which coming period looks more supportive for long-distance travel?"
    ]
  }
];

export function EmptyStateHero({ birthDetails, currentDasha, chartData, onPickQuestion }: Props) {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Extract CSL structure from raw chart data
  const cuspsList = chartData?.cusps || chartData?.chart?.cusps || [];
  const cuspsArray = Array.isArray(cuspsList) ? cuspsList : Object.values(cuspsList);
  const lagna = cuspsArray[0];
  const house2 = cuspsArray[1];
  const house7 = cuspsArray[6];
  const house10 = cuspsArray[9];

  const md = currentDasha?.mahadasha || currentDasha?.current_mahadasha;
  const ad = currentDasha?.antardasha || currentDasha?.current_antardasha;

  const lagnaSign = lagna?.sign_en || lagna?.sign || "";
  const lagnaSignLord = SIGN_LORDS[lagnaSign] ?? "";

  return (
    <div style={{ padding: "8px 4px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 900, margin: "0 auto" }}>
      {/* 1. Header Banner */}
      <div style={{ textAlign: "center", position: "relative", padding: "12px 0 0" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 12px", borderRadius: 999,
          background: "rgba(201, 169, 110, 0.08)", border: "1px solid rgba(201, 169, 110, 0.2)",
          color: "#c9a96e", fontSize: 10.5, fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase",
          marginBottom: 12
        }}>
          <Sparkles size={12} /> {t("DevAstroAI Cosmic Portal", "దేవాస్ట్రో ఏఐ కాస్మిక్ పోర్టల్")}
        </div>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 26, color: "#f0f0f0", margin: "0 0 6px 0", letterSpacing: "0.02em" }}>
          {t("Welcome,", "నమస్కారం,")} {birthDetails.name.split(" ")[0]}
        </h1>
        <p style={{ fontSize: 12.5, color: "#a0a0b0", margin: 0, lineHeight: 1.5 }}>
          {md?.lord && ad?.antardasha_lord ? (
            <>
              {t("Your KP chart is calculated.", "మీ కేపీ చార్ట్ సిద్ధంగా ఉంది.")} {t("You are running", "ప్రస్తుతం")} <strong style={{ color: "#c9a96e" }}>{md.lord} MD</strong> → <strong style={{ color: "#c9a96e" }}>{ad.antardasha_lord} AD</strong>.
            </>
          ) : (
            t("Your complete astronomical coordinates are successfully resolved.", "మీ ఖగోళ గమనాలు మరియు కేపీ గణనలు విజయవంతంగా లెక్కించబడ్డాయి.")
          )}
        </p>
      </div>

      {/* 2. KP Cuspal Archetype Card */}
      {lagna && (
        <div className="celestial-glass" style={{ borderRadius: 14, padding: "16px 20px", border: "0.5px solid rgba(201, 169, 110, 0.18)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <User size={15} style={{ color: "#c9a96e" }} />
            <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700, color: "#c9a96e", letterSpacing: "0.06em", margin: 0 }}>
              {t("Your Lagna CSL Archetype (లగ్న నిరూపణ)", "మీ లగ్న సబ్‌లార్డ్ ప్రొఫైల్")}
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.015)", border: "0.5px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 9.5, color: "#888899", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {t("Lagna Sign Lord", "లగ్న రాశ్యధిపతి")}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e0e0e0" }}>
                {SIGN_TELUGU[lagnaSign] || lagnaSign}
              </div>
              <div style={{ fontSize: 11, color: "#a0a0b0", marginTop: 4, lineHeight: 1.4 }}>
                {t("Governed by", "అధిపతి:")} <strong style={{ color: "#c9a96e" }}>{PLANET_TELUGU[lagnaSignLord] || lagnaSignLord}</strong>. {t("Shapes your outer gateway, physical vitality, and general body framework.", "మీ బాహ్య రూపం, శారీరక నిర్మాణం మరియు ప్రాథమిక ప్రవర్తనను సూచిస్తుంది.")}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.015)", border: "0.5px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 9.5, color: "#888899", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {t("Lagna Star Lord", "లగ్న నక్షత్రాధిపతి")}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e0e0e0" }}>
                {lagna.nakshatra}
              </div>
              <div style={{ fontSize: 11, color: "#a0a0b0", marginTop: 4, lineHeight: 1.4 }}>
                {t("Governed by", "అధిపతి:")} <strong style={{ color: "#c9a96e" }}>{PLANET_TELUGU[lagna.star_lord] || lagna.star_lord}</strong>. {t("Determines your life path, destiny triggers, and sub-conscious motivations.", "మీ జీవిత గమనం, అంతర్గత ఆలోచనలు మరియు ప్రయాణ మార్గాన్ని నిర్దేశిస్తుంది.")}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.015)", border: "0.5px solid rgba(201, 169, 110, 0.2)", borderRadius: 10, padding: 12, boxShadow: "0 0 12px rgba(201,169,110,0.04)" }}>
              <div style={{ fontSize: 9.5, color: "#c9a96e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {t("Lagna Sub Lord (CSL)", "లగ్న సబ్‌లార్డ్")}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f5e4c3", display: "flex", alignItems: "center", gap: 6 }}>
                {PLANET_TELUGU[lagna.sub_lord] || lagna.sub_lord} <span style={{ fontSize: 10, padding: "1px 6px", background: "rgba(201, 169, 110, 0.16)", borderRadius: 4, color: "#c9a96e" }}>KP Key</span>
              </div>
              <div style={{ fontSize: 11, color: "#a0a0b0", marginTop: 4, lineHeight: 1.4 }}>
                {t("The ultimate KP decision planet that dictates your health, temperament, and self-expression.", "కేపీ జ్యోతిష్యం ప్రకారం మీ స్వభావం, ఆలోచనా తీరును మరియు ఆరోగ్యాన్ని శాసించే అత్యంత కీలకమైన గ్రహం.")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Natal House CSL Indicators */}
      <div className="celestial-glass" style={{ borderRadius: 14, padding: "16px 20px", border: "0.5px solid rgba(255, 255, 255, 0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Activity size={15} style={{ color: "#3b82f6" }} />
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700, color: "#e0e0e0", letterSpacing: "0.06em", margin: 0 }}>
            {t("Your Major Life Indicators (కేపీ అనుకూలతలు)", "మీ జీవిత ప్రధాన భావాల సబ్‌లార్డ్‌లు")}
          </h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {/* Career */}
          <div style={{ padding: 12, background: "rgba(255,255,255,0.01)", border: "0.5px solid rgba(255,255,255,0.03)", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#a0a0b0" }}>💼 {t("Career & Job", "కెరీర్ & ఉద్యోగం")}</span>
              {house10 && <span style={{ fontSize: 9.5, padding: "2px 6px", borderRadius: 4, background: "rgba(16,185,129,0.1)", color: "#10b981", fontWeight: 700 }}>H10 CSL</span>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f0" }}>
              {house10 ? `${PLANET_TELUGU[house10.sub_lord] || house10.sub_lord}` : "—"}
            </div>
            <div style={{ fontSize: 10.5, color: "#888899", marginTop: 4, lineHeight: 1.35 }}>
              {t("Decides professional success, authority, and company status.", "మీ ఉద్యోగ యోగం, పదవీ బలం మరియు ప్రమోషన్లను నిర్దేశిస్తుంది.")}
            </div>
          </div>

          {/* Relationships */}
          <div style={{ padding: 12, background: "rgba(255,255,255,0.01)", border: "0.5px solid rgba(255,255,255,0.03)", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#a0a0b0" }}>❤️ {t("Union & Marriage", "ప్రేమ & పెళ్లి")}</span>
              {house7 && <span style={{ fontSize: 9.5, padding: "2px 6px", borderRadius: 4, background: "rgba(244,63,94,0.1)", color: "#f43f5e", fontWeight: 700 }}>H7 CSL</span>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f0" }}>
              {house7 ? `${PLANET_TELUGU[house7.sub_lord] || house7.sub_lord}` : "—"}
            </div>
            <div style={{ fontSize: 10.5, color: "#888899", marginTop: 4, lineHeight: 1.35 }}>
              {t("Determines partner harmony, marriage promise, and timing.", "మీ వైవాహిక జీవిత యోగం, భాగస్వామ్యాల అనుకూలతను శాసిస్తుంది.")}
            </div>
          </div>

          {/* Wealth */}
          <div style={{ padding: 12, background: "rgba(255,255,255,0.01)", border: "0.5px solid rgba(255,255,255,0.03)", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#a0a0b0" }}>💰 {t("Wealth & Cash", "ఆర్థిక బలం")}</span>
              {house2 && <span style={{ fontSize: 9.5, padding: "2px 6px", borderRadius: 4, background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontWeight: 700 }}>H2 CSL</span>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f0" }}>
              {house2 ? `${PLANET_TELUGU[house2.sub_lord] || house2.sub_lord}` : "—"}
            </div>
            <div style={{ fontSize: 10.5, color: "#888899", marginTop: 4, lineHeight: 1.35 }}>
              {t("Rules savings, bank balance, assets, and speech power.", "మీ నిల్వ ధనం, ఆదాయ మార్గాలు మరియు కుటుంబ వృద్ధిని చూపిస్తుంది.")}
            </div>
          </div>

          {/* Health */}
          <div style={{ padding: 12, background: "rgba(255,255,255,0.01)", border: "0.5px solid rgba(255,255,255,0.03)", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#a0a0b0" }}>🏥 {t("Vitality & Self", "ఆరోగ్యం & శరీరం")}</span>
              {lagna && <span style={{ fontSize: 9.5, padding: "2px 6px", borderRadius: 4, background: "rgba(59,130,246,0.1)", color: "#3b82f6", fontWeight: 700 }}>H1 CSL</span>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f0" }}>
              {lagna ? `${PLANET_TELUGU[lagna.sub_lord] || lagna.sub_lord}` : "—"}
            </div>
            <div style={{ fontSize: 10.5, color: "#888899", marginTop: 4, lineHeight: 1.35 }}>
              {t("Controls core constitution, recovery rate, and self-confidence.", "మీ శారీరక దృఢత్వం, రోగ నిరోధక శక్తి మరియు ఆత్మవిశ్వాసాన్ని సూచిస్తుంది.")}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Expandable Cosmic Prompt Oracle */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 4 }}>
          <HelpCircle size={15} style={{ color: "#c9a96e" }} />
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700, color: "#c9a96e", letterSpacing: "0.06em", margin: 0 }}>
            {t("Cosmic Prompt Oracle (ప్రశ్నల నిధి)", "ఆలోచనాత్మక ప్రశ్నలు ఎంచుకోండి")}
          </h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {ORACLE_CATEGORIES.map((cat) => {
            const isOpen = activeCategory === cat.id;
            return (
              <div 
                key={cat.id}
                className="celestial-glass"
                style={{
                  gridColumn: isOpen ? "1 / -1" : "span 1",
                  borderRadius: 12,
                  padding: isOpen ? "16px 20px" : "12px 16px",
                  border: `0.5px solid ${isOpen ? cat.borderColor : "rgba(255,255,255,0.06)"}`,
                  background: isOpen ? cat.color : "rgba(255,255,255,0.01)",
                  cursor: isOpen ? "default" : "pointer",
                  transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: isOpen ? `0 6px 20px -8px ${cat.textColor}24` : "none"
                }}
                onClick={() => { if (!isOpen) setActiveCategory(cat.id); }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: cat.textColor }}>{cat.icon}</span>
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f0", margin: 0 }}>{cat.label}</h4>
                      <span style={{ fontSize: 10, color: "#888899", marginTop: 1, display: "block" }}>{cat.labelTe}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{ background: "transparent", border: "none", color: "#666677", cursor: "pointer" }}
                    onClick={(e) => {
                      if (isOpen) {
                        e.stopPropagation();
                        setActiveCategory(null);
                      }
                    }}
                  >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {isOpen && (
                  <div style={{
                    marginTop: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    animation: "fade-in 180ms ease"
                  }}>
                    {cat.questions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => onPickQuestion(q)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: "rgba(255,255,255,0.02)",
                          border: "0.5px solid rgba(255,255,255,0.06)",
                          borderRadius: 8,
                          padding: "10px 14px",
                          fontSize: 12.5,
                          color: "#d0d0d8",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "all 140ms ease"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                          e.currentTarget.style.borderColor = cat.textColor;
                          e.currentTarget.style.color = "#f0f0f0";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                          e.currentTarget.style.color = "#d0d0d8";
                        }}
                      >
                        ✦ {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
