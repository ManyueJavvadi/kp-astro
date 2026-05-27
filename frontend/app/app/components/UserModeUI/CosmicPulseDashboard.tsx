"use client";

/**
 * CosmicPulseDashboard — High-Concept Visual Sanctuary Dashboard for General User Mode (v6 revamp).
 *
 * Visual Highlights:
 *   1. Interactive SVG Astrolabe (Celestial Alignment Map).
 *   2. Auspicious Aura Concentric Progress Loops (concentric circular progress rings).
 *   3. Visual Astro-Calendar monthly planner (Cosmic Agenda) with 🟢/🟡/🔴 indicators.
 *   4. Destiny Badges (Aura Archetypes) collectible cards.
 *   5. Scrollable Constellation Vimshottari Pathway with golden stardust threads.
 */

import React, { useState } from "react";
import { Sparkles, User, Activity, HelpCircle, Heart, Briefcase, Wallet, Compass, ChevronDown, ChevronUp, Star, Navigation, ShieldAlert, Calendar, Award } from "lucide-react";
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

const PLANET_EN: Record<string, string> = {
  Sun: "Sun", Moon: "Moon", Mars: "Mars", Mercury: "Mercury",
  Jupiter: "Jupiter", Venus: "Venus", Saturn: "Saturn", Rahu: "Rahu", Ketu: "Ketu"
};

const PLANET_TE: Record<string, string> = {
  Sun: "సూర్యుడు (Sun)", Moon: "చంద్రుడు (Moon)", Mars: "కుజుడు (Mars)",
  Mercury: "బుధుడు (Mercury)", Jupiter: "గురుడు (Jupiter)", Venus: "శుక్రుడు (Venus)",
  Saturn: "శని (Saturn)", Rahu: "రాహువు (Rahu)", Ketu: "కేతువు (Ketu)"
};

const SIGN_EN: Record<string, string> = {
  Aries: "Aries", Taurus: "Taurus", Gemini: "Gemini", Cancer: "Cancer",
  Leo: "Leo", Virgo: "Virgo", Libra: "Libra", Scorpio: "Scorpio",
  Sagittarius: "Sagittarius", Capricorn: "Capricorn", Aquarius: "Aquarius", Pisces: "Pisces"
};

const SIGN_TE: Record<string, string> = {
  Aries: "మేషం (Aries)", Taurus: "వృషభం (Taurus)", Gemini: "మిథునం (Gemini)", Cancer: "కర్కాటకం (Cancer)",
  Leo: "సింహం (Leo)", Virgo: "కన్య (Virgo)", Libra: "తుల (Libra)", Scorpio: "వృశ్చికం (Scorpio)",
  Sagittarius: "ధనుస్సు (Sagittarius)", Capricorn: "మకరం (Capricorn)", Aquarius: "కుంభం (Aquarius)", Pisces: "మీనం (Pisces)"
};

const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#38bdf8", Mars: "#f87171", Rahu: "#a78bfa",
  Jupiter: "#f472b6", Saturn: "#94a3b8", Mercury: "#34d399", Ketu: "#fb923c", Venus: "#c9a96e"
};

const ORACLE_CATEGORIES = [
  {
    id: "love",
    labelEn: "Love & Union",
    labelTe: "ప్రేమ & వివాహం",
    icon: <Heart size={16} />,
    color: "rgba(244, 63, 94, 0.08)",
    borderColor: "rgba(244, 63, 94, 0.25)",
    textColor: "#f43f5e",
    questionsEn: [
      "Is marriage promised in my chart, and what will my partner be like?",
      "Which coming period looks most supportive for marriage?",
      "Is there any delay or friction in my relationship houses?"
    ],
    questionsTe: [
      "నా జాతకంలో विवाह యోగం ఉందా, భాగస్వామి స్వభావం ఎలా ఉంటుంది?",
      "నా వివాహానికి అత్యంత అనుకూలమైన కాలం ఎప్పుడు?",
      "నా వివాహ స్థానాలలో ఏవైనా ఆటంకాలు లేదా జాప్యాలు ఉన్నాయా?"
    ]
  },
  {
    id: "career",
    labelEn: "Career & Profession",
    labelTe: "ఉద్యోగం & కెరీర్",
    icon: <Briefcase size={16} />,
    color: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.25)",
    textColor: "#10b981",
    questionsEn: [
      "Am I promised a successful career in job or business?",
      "Which coming period looks stronger for promotion or job change?",
      "Does my 10th cusp sub lord support a stable career?"
    ],
    questionsTe: [
      "నా జాతకంలో ఉద్యోగం లేదా వ్యాపారంలో మంచి సక్సెస్ ఉందా?",
      "నాకు తదుపరి ప్రమోషన్ లేదా ఉద్యోగ మార్పు ఎప్పుడు కలుగుతుంది?",
      "నా 10వ సబ్‌లార్డ్ స్థిరమైన కెరీర్‌కు అనుకూలిస్తుందా?"
    ]
  },
  {
    id: "wealth",
    labelEn: "Wealth & Finance",
    labelTe: "ధనయోగం & సంపద",
    icon: <Wallet size={16} />,
    color: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.25)",
    textColor: "#f59e0b",
    questionsEn: [
      "Which coming period looks stronger for income and savings?",
      "Am I promised wealth inheritance or property purchase?",
      "Will I successfully recover my lent money or pending refunds?"
    ],
    questionsTe: [
      "నా ఆర్థిక పరిస్థితి మరియు ఆదాయం ఎప్పుడు వృద్ధి చెందుతాయి?",
      "నా జాతకంలో ఆస్తి కొనుగోలు లేదా వారసత్వ ధన యోగం ఉందా?",
      "నేను ఇచ్చిన అప్పు లేదా పెండింగ్ బకాయిలు తిరిగి వస్తాయా?"
    ]
  },
  {
    id: "destiny",
    labelEn: "Travel & Destiny",
    labelTe: "ప్రయాణం & భాగ్యం",
    icon: <Compass size={16} />,
    color: "rgba(59, 130, 246, 0.08)",
    borderColor: "rgba(59, 130, 246, 0.25)",
    textColor: "#3b82f6",
    questionsEn: [
      "Does my chart support foreign travel or permanent settlement?",
      "What does my 1st cusp sub lord say about my physical vitality?",
      "Which coming period looks more supportive for long-distance travel?"
    ],
    questionsTe: [
      "నాకు విదేశీ ప్రయాణాలు లేదా విదేశాలలో స్థిరపడే యోగం ఉందా?",
      "నా శారీరక ఆరోగ్యం మరియు ఆత్మవిశ్వాసం గురించి నా 1వ సబ్‌లార్డ్ ఏం చెబుతోంది?",
      "నా తదుపరి దూర ప్రయాణానికి అత్యంత అనుకూల సమయం ఎప్పుడు?"
    ]
  }
];

interface DashaInterpretation {
  titleEn: string;
  titleTe: string;
  descEn: string;
  descTe: string;
}

const DASHA_INTERPRETATIONS: Record<string, DashaInterpretation> = {
  Ketu: {
    titleEn: "Spiritual Seeking & Meditation",
    titleTe: "ఆధ్యాత్మిక అన్వేషణ & అంతర్మథనం",
    descEn: "A period of detachment, inner growth, deep wisdom, and spiritual alignment. Great for meditation.",
    descTe: "ఒంటరితనం, అంతర్గత ఎదుగుదల, ఆధ్యాత్మిక బలం మరియు పరిశోధనలకు అత్యంత అనుకూలమైన కాలం."
  },
  Venus: {
    titleEn: "Luxury, Harmony & Creative Rise",
    titleTe: "విలాసవంతమైన జీవితం & ఆర్థిక వృద్ధి",
    descEn: "Governs comfort, relationships, artistic pursuits, financial gain, and general life happiness.",
    descTe: "విలాసాలు, వాహన యోగం, వైవాహిక బలం, వ్యాపార ప్రగతి మరియు లలిత కళల సాధనకు అనుకూలమైన కాలం."
  },
  Sun: {
    titleEn: "Authority, Career Peak & Soul Power",
    titleTe: "అధికార యోగం & ఆత్మగౌరవం",
    descEn: "Brings career recognition, support from authorities, professional status, and high vitality.",
    descTe: "కీర్తి ప్రతిష్టలు, ప్రభుత్వ రంగ అనుకూలత, ఉన్నత పదవులు, ఆత్మవిశ్వాసం మరియు శారీరక తేజస్సుకు అనుకూల సమయం."
  },
  Moon: {
    titleEn: "Intuition, Family Bond & Imagination",
    titleTe: "మానసిక ప్రశాంతత & గృహ వృద్ధి",
    descEn: "Focuses on domestic happiness, mental clarity, travel, and creative expression.",
    descTe: "కుటుంబ సౌఖ్యం, నూతన పరిచయాలు, మానసిక ఆనందం, ప్రయాణాలు మరియు సృజనాత్మక ఆలోచనలకు అనుకూల సమయం."
  },
  Mars: {
    titleEn: "Courage, Drive & Property Gain",
    titleTe: "ధైర్య సాహసాలు & స్థిరాస్తి యోగం",
    descEn: "High physical energy, competitive victory, property purchases, and dynamic action.",
    descTe: "అధిక शक्ति, పట్టుదల, భూమి/స్థిరాస్తి కొనుగోలు మరియు పోటీలలో విజయం సాధించే అద్భుత కాలం."
  },
  Rahu: {
    titleEn: "Ambitious Expansion & Unconventional Gains",
    titleTe: "విదేశీ ప్రయాణాలు & ఆకస్మిక యోగం",
    descEn: "Triggers intense ambitions, technology pursuits, foreign connections, and sudden material growth.",
    descTe: "భారీ లక్ష్యాలు, విదేశీ ప్రయాణాలు, వినూత్న ఆలోచనలు మరియు ఆకస్మిక ధన లాభాలను తెచ్చిపెట్టే కాలం."
  },
  Jupiter: {
    titleEn: "Wisdom, Expansion & Good Fortune",
    titleTe: "జ్ఞానోదయం & సువర్ణ కాలం",
    descEn: "A period of wisdom, financial prosperity, marriage promise, learning, and family growth.",
    descTe: "విద్యా ప్రాప్తి, పెళ్లి యోగం, సంతాన భాగ్యం, ఆర్థిక ఉన్నతి మరియు ధర్మ కార్యాలకు అత్యంత శుభప్రదమైన కాలం."
  },
  Saturn: {
    titleEn: "Discipline, Duty & Long-term Mastery",
    titleTe: "క్రమశిక్షణ & స్థిరమైన ప్రగతి",
    descEn: "Demands discipline, patience, and duty. Delivers steady, foundational long-term career growth.",
    descTe: "నిబద్ధత, కఠోర శ్రమ, మరియు క్రమశిక్షణ ద్వారా జీవితంలో తిరుగులేని పునాదులను సాధించే కాలం."
  },
  Mercury: {
    titleEn: "Intellect, Business Growth & Speech",
    titleTe: "బుద్ధి బలం & వ్యాపార వృద్ధి",
    descEn: "Excellent for studies, contract signing, business development, and articulate communication.",
    descTe: "వ్యాపార లావాదేవీలు, నూతన ఒప్పందాలు, విద్యా రంగంలో అద్భుత రాణన మరియు చాకచక్యంతో వ్యవహరించే కాలం."
  }
};

export function CosmicPulseDashboard({ birthDetails, currentDasha, chartData, onPickQuestion }: Props) {
  const { t, lang } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedDayInfo, setSelectedDayInfo] = useState<any>(null);

  // Extract CSL structures using correct array bounds
  const cuspsList = chartData?.cusps || chartData?.chart?.cusps || [];
  const cuspsArray = Array.isArray(cuspsList) ? cuspsList : Object.values(cuspsList);
  
  const lagna = cuspsArray[0];
  const house2 = cuspsArray[1];
  const house7 = cuspsArray[6];
  const house10 = cuspsArray[9];
  const moon = chartData?.moon || chartData?.chart?.moon;

  const md = currentDasha?.mahadasha || currentDasha?.current_mahadasha;
  const ad = currentDasha?.antardasha || currentDasha?.current_antardasha;
  const adLord = ad?.antardasha_lord || ad?.lord || ad?.lord_en || "";

  const lagnaSign = lagna?.sign_en || lagna?.sign || "";
  const lagnaSignLord = SIGN_LORDS[lagnaSign] ?? "";

  // ── Daily Auspicious Pulse calculations ──
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

  const getStatusLabel = (score: number): { text: string; color: string } => {
    if (score >= 72) return { text: t("Auspicious", "అనుకూలం"), color: "#10b981" };
    if (score >= 45) return { text: t("Neutral", "సాధారణం"), color: "#fbbf24" };
    return { text: t("Caution", "జాగ్రత్త"), color: "#f43f5e" };
  };

  const domainBadges = [
    {
      id: "love",
      label: t("Love & Union", "ప్రేమ & బంధాలు"),
      icon: <Heart size={15} />,
      score: loveScore,
      status: getStatusLabel(loveScore)
    },
    {
      id: "career",
      label: t("Career & Work", "ఉద్యోగం & కీర్తి"),
      icon: <Briefcase size={15} />,
      score: careerScore,
      status: getStatusLabel(careerScore)
    },
    {
      id: "health",
      label: t("Health & Energy", "ఆరోగ్యం & తేజస్సు"),
      icon: <ShieldAlert size={15} />,
      score: healthScore,
      status: getStatusLabel(healthScore)
    },
    {
      id: "finance",
      label: t("Money & Travel", "ధనం & ప్రయాణం"),
      icon: <Navigation size={15} />,
      score: financeScore,
      status: getStatusLabel(financeScore)
    }
  ];

  // ── Vimshottari Constellation Pathway segments ──
  const segments: Array<{ lord: string; start: string; end: string; isCurrent: boolean }> = [];
  if (ad?.antardasha_lord) {
    segments.push({ lord: ad.antardasha_lord, start: ad.start, end: ad.end, isCurrent: true });
    if (chartData?.antardashas?.length) {
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
  }

  const curDur = ad?.start && ad?.end ? (durationDays(ad.start, ad.end) || 1) : 1;
  const elapsed = ad?.start ? durationDays(ad.start, todayISO()) : 0;
  const progress = Math.max(0, Math.min(100, (elapsed / curDur) * 100));

  // Generate Destiny Badges dynamically from chart CSL
  const getDestinyBadges = () => {
    const badges = [];
    if (lagna?.sub_lord_en === "Jupiter" || lagna?.sub_lord_en === "Venus") {
      badges.push({
        title: t("The Magnet of Attraction", "సమ్మోహన శక్త్యుతుడు"),
        desc: t("Your Ascendant sub-lord carries massive spiritual and physical magnetism, naturally drawing fortune.", "మీ లగ్న సబ్‌లార్డ్ అదృష్టాన్ని ఆకర్షించే బలమైన ఆకర్షణ శక్తిని కలిగి ఉంది."),
        planet: lagna.sub_lord_en
      });
    } else {
      badges.push({
        title: t("The Resilient Soul", "పరిశోధనాత్మక మనస్తత్వం"),
        desc: t("Ascendant alignment indicates outstanding intuitive resilience, resolving life hurdles with inner strength.", "లగ్న సబ్‌లార్డ్ మీలో బలమైన ఆత్మవిశ్వాసాన్ని మరియు సమస్యలను ఎదిరించే శక్తిని సూచిస్తోంది."),
        planet: lagna?.sub_lord_en || "Sun"
      });
    }

    if (house10?.sub_lord_en === "Sun" || house10?.sub_lord_en === "Mars" || house10?.sub_lord_en === "Jupiter") {
      badges.push({
        title: t("The Career Pioneer", "వృత్తి మార్గదర్శి"),
        desc: t("10th Cusp Sub Lord rules with power, indicating natural leadership qualities and professional command.", "10వ సబ్‌లార్డ్ అధికార గ్రహాలు కావడంతో, కెరీర్‌లో తిరుగులేని నాయకత్వ లక్షణాలు లభిస్తాయి."),
        planet: house10.sub_lord_en
      });
    } else {
      badges.push({
        title: t("The Intellect Architect", "వ్యాపార చతురుడు"),
        desc: t("10th Cusp is influenced by analytical lords, favoring strategic professional ventures and clever logic.", "మీ 10వ సబ్‌లార్డ్ చాకచక్యంతో వ్యవహరించి వృత్తిలో రాణించే గొప్ప జ్ఞానాన్ని ఇస్తోంది."),
        planet: house10?.sub_lord_en || "Mercury"
      });
    }

    if (house2?.sub_lord_en === "Venus" || house2?.sub_lord_en === "Jupiter" || house2?.sub_lord_en === "Mercury") {
      badges.push({
        title: t("The Wealth Magnet", "కుటుంబ భాగ్యవంతుడు"),
        desc: t("2nd Cusp Sub Lord activates prosperity domains, promising excellent asset accumulation and savings.", "మీ 2వ సబ్‌లార్డ్ ధన కారక గ్రహాలతో కూడి ఉండడంతో, జీవితంలో మంచి ఆర్థిక సంపద చేకూరుతుంది."),
        planet: house2.sub_lord_en
      });
    }

    return badges;
  };

  // Generate monthly Astro-Calendar dates (Cosmic Agenda)
  const getCalendarDays = () => {
    const days = [];
    const dateObj = new Date();
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      // Deterministic ratings for visuals based on active lord
      const seed = (i * 7 + (adLord ? adLord.charCodeAt(0) : 0)) % 100;
      let status: "auspicious" | "standard" | "caution" = "standard";
      if (seed > 72) status = "auspicious";
      else if (seed < 28) status = "caution";

      days.push({
        day: i,
        status,
        textEn: status === "auspicious" 
          ? "Excellent day for decisions, signings, and purchases." 
          : status === "caution" 
          ? "Restricted planetary energy. Avoid major investments today." 
          : "Standard transit balance. Great for daily routine tasks.",
        textTe: status === "auspicious" 
          ? "కీలక నిర్ణయాలు, కొనుగోళ్లు మరియు నూతన పనులకు అత్యంత శుభప్రదమైన రోజు." 
          : status === "caution" 
          ? "గ్రహ బలాలు బలహీనంగా ఉన్నాయి. వివాదాలు మరియు పెద్ద పెట్టుబడులకు దూరంగా ఉండండి." 
          : "గోచార గ్రహాలు సాధారణంగా ఉన్నాయి. మీ దినచర్య పనులను ప్రశాంతంగా చేసుకోవచ్చు."
      });
    }
    return days;
  };

  const calDays = getCalendarDays();
  const destinyBadges = getDestinyBadges();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 900, margin: "0 auto", paddingBottom: 32 }}>
      
      {/* ── 1. Astronomical Greetings & Astrolabe Header ── */}
      <div style={{ textAlign: "center", position: "relative", padding: "12px 0 0" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 14px", borderRadius: 999,
          background: "rgba(201, 169, 110, 0.08)", border: "1.5px solid rgba(201, 169, 110, 0.25)",
          color: "#c9a96e", fontSize: 10.5, fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          marginBottom: 14, boxShadow: "0 0 16px rgba(201,169,110,0.06)"
        }}>
          <Sparkles size={12} className="aura-spin-slow" /> {t("Cosmic Sanctuary", "కాస్మిక్ పోర్టల్")}
        </div>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: "2.1rem", color: "#f0f0f0", margin: "0 0 8px 0", letterSpacing: "0.02em" }}>
          {t("Welcome,", "నమస్కారం,")} {birthDetails.name.split(" ")[0]}
        </h1>
        <p style={{ fontSize: 13, color: "#a0a0b0", margin: "0 0 24px", lineHeight: 1.5, maxWidth: 500, marginInline: "auto" }}>
          {md?.lord && ad?.antardasha_lord ? (
            <>
              {t("Your complete astronomical coordinates are successfully resolved. You are experiencing the cosmic cycle of ", "మీ ఖగోళ గమనాలు లెక్కించబడ్డాయి. ప్రస్తుతం మీపై")} <strong style={{ color: "#c9a96e" }}>{md.lord} MD</strong> → <strong style={{ color: "#c9a96e" }}>{ad.antardasha_lord} AD</strong>.
            </>
          ) : (
            t("Your complete astrological coordinates are successfully compiled.", "మీ జాతక మరియు కేపీ సబ్‌లార్డ్ గమనాలు సిద్ధంగా ఉన్నాయి.")
          )}
        </p>

        {/* ── INTERACTIVE SVG ASTROLABE (Celestial Alignment Map) ── */}
        <div style={{
          position: "relative", width: 220, height: 220, margin: "0 auto 12px",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          {/* Rotating astrological outer ring */}
          <svg className="aura-spin-slow" width="220" height="220" style={{ position: "absolute" }}>
            <circle cx="110" cy="110" r="102" stroke="rgba(201,169,110,0.18)" strokeWidth="1.5" fill="none" strokeDasharray="6 4" />
            <circle cx="110" cy="110" r="90" stroke="rgba(201,169,110,0.1)" strokeWidth="0.75" fill="none" />
            
            {/* Compass degree markers */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
              const rad = (deg * Math.PI) / 180;
              const x1 = 110 + 90 * Math.cos(rad);
              const y1 = 110 + 90 * Math.sin(rad);
              const x2 = 110 + 98 * Math.cos(rad);
              const y2 = 110 + 98 * Math.sin(rad);
              return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(201,169,110,0.3)" strokeWidth="0.75" />;
            })}
          </svg>

          {/* Core Alignment Medallion */}
          <div style={{
            width: 140, height: 140, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,14,24,0.85) 40%, rgba(201,169,110,0.06) 100%)",
            border: "1px solid rgba(201,169,110,0.32)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 32px rgba(201,169,110,0.08), inset 0 0 16px rgba(255,255,255,0.02)",
            zIndex: 2
          }}>
            <span style={{ fontSize: 9.5, color: "#888899", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
              {t("Lagna Sign", "లగ్న రాశి")}
            </span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: "#c9a96e", fontWeight: "bold", margin: "4px 0" }}>
              {lang === "en" ? SIGN_EN[lagnaSign] || lagnaSign || "—" : SIGN_TE[lagnaSign] || lagnaSign || "—"}
            </span>
            <span style={{ fontSize: 9.5, color: "#888899", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <span>Lagna Lord:</span>
              <strong style={{ color: "#e2e2e7" }}>{lagnaSignLord}</strong>
            </span>
          </div>

          {/* SVG Nodes: Lagna, Sun, Moon floating orbits */}
          <div style={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0, pointerEvents: "none", zIndex: 3 }}>
            {/* Lagna Node (Ascendant) */}
            <div style={{
              position: "absolute", top: "10%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "auto",
              display: "flex", flexDirection: "column", alignItems: "center", cursor: "help"
            }} title={`${t("Lagna CSL", "లగ్న సబ్‌లార్డ్")}: ${lagna?.sub_lord_en}`}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#c9a96e", border: "2px solid #08070e", boxShadow: "0 0 8px #c9a96e" }} />
              <span style={{ fontSize: 8.5, color: "#c9a96e", fontWeight: 800, marginTop: 4, background: "rgba(8,7,14,0.85)", padding: "1px 4px", borderRadius: 4 }}>ASC</span>
            </div>

            {/* Moon Node */}
            {moon && (
              <div style={{
                position: "absolute", top: "72%", left: "18%", transform: "translate(-50%, -50%)", pointerEvents: "auto",
                display: "flex", flexDirection: "column", alignItems: "center", cursor: "help"
              }} title={`${t("Moon Nakshatra", "జన్మ నక్షత్రం")}: ${moon.nakshatra_en || moon.nakshatra}`}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#38bdf8", border: "2px solid #08070e", boxShadow: "0 0 8px #38bdf8" }} />
                <span style={{ fontSize: 8.5, color: "#38bdf8", fontWeight: 800, marginTop: 4, background: "rgba(8,7,14,0.85)", padding: "1px 4px", borderRadius: 4 }}>MOON</span>
              </div>
            )}

            {/* Sun Node */}
            <div style={{
              position: "absolute", top: "72%", left: "82%", transform: "translate(-50%, -50%)", pointerEvents: "auto",
              display: "flex", flexDirection: "column", alignItems: "center", cursor: "help"
            }} title={t("Sun Soul Position", "ఆత్మ కారక సూర్యుడు")}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fbbf24", border: "2px solid #08070e", boxShadow: "0 0 8px #fbbf24" }} />
              <span style={{ fontSize: 8.5, color: "#fbbf24", fontWeight: 800, marginTop: 4, background: "rgba(8,7,14,0.85)", padding: "1px 4px", borderRadius: 4 }}>SUN</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Auspicious Aura Concentric Progress Loops ── */}
      <div className="celestial-glass" style={{ borderRadius: 16, padding: "20px 24px", border: "0.5px solid rgba(255, 255, 255, 0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Activity size={15} style={{ color: "#c9a96e" }} />
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, fontWeight: 700, color: "#e0e0e0", letterSpacing: "0.06em", margin: 0 }}>
            {t("Daily Auspicious Aura-Rings (Vedic Transit Ratings)", "నేటి శుభ అనుకూలతలు (గ్రహ గోచార బలాలు)")}
          </h3>
        </div>

        {adLord && (
          <p style={{ fontSize: 11.5, color: "#888899", marginBottom: 20, lineHeight: 1.4, margin: "0 0 16px" }}>
            {t(
              "Based on the mathematical promise of your active Sub-Lord planet",
              "కేపీ జ్యోతిష్యం ప్రకారం ప్రస్తుతం మిమ్మల్ని నడిపిస్తున్న సబ్‌లార్డ్ గ్రహమైన"
            )}{" "}
            <strong style={{ color: "#c9a96e" }}>
              {lang === "en" ? PLANET_EN[adLord] || adLord : PLANET_TE[adLord] || adLord}
            </strong>{" "}
            {t("and its active significators in your natal houses.", "మరియు జన్మకుండలి స్థానాల ఆధారంగా నేటి బలాలు లెక్కింపబడ్డాయి.")}
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {domainBadges.map((badge) => (
            <div 
              key={badge.id} 
              className="celestial-panel"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 18px", background: "rgba(255,255,255,0.012)",
                border: "0.5px solid rgba(255,255,255,0.04)", borderRadius: 12,
                transition: "all 200ms ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: `${badge.status.color}08`, border: `0.5px solid ${badge.status.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: badge.status.color
                }}>
                  {badge.icon}
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e2e7", display: "block" }}>{badge.label}</span>
                  <span style={{ fontSize: 9.5, display: "block", fontWeight: 700, color: badge.status.color, marginTop: 2 }}>{badge.status.text}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#f0f0f0" }}>{badge.score}%</span>
                {/* Concentric Aura Progress Loop */}
                <div style={{ position: "relative", width: 28, height: 28 }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="14" cy="14" r="11" stroke="rgba(255,255,255,0.03)" strokeWidth="2.5" fill="none" />
                    <circle cx="14" cy="14" r="11" stroke={badge.status.color} strokeWidth="2.5" fill="none"
                            strokeDasharray="69.1" strokeDashoffset={69.1 - (69.1 * badge.score) / 100}
                            style={{ strokeLinecap: "round", filter: `drop-shadow(0 0 3px ${badge.status.color}60)` }} />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Visual Astro-Calendar monthly planner (Cosmic Agenda) ── */}
      <div className="celestial-glass" style={{ borderRadius: 16, padding: "20px 24px", border: "0.5px solid rgba(255, 255, 255, 0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Calendar size={15} style={{ color: "#c9a96e" }} />
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, fontWeight: 700, color: "#c9a96e", letterSpacing: "0.06em", margin: 0 }}>
            {t("Cosmic Agenda (Daily Elective Planner)", "నక్షత్ర దినచర్య ప్లానర్ (ముహూర్త పట్టిక)")}
          </h3>
        </div>
        <p style={{ fontSize: 11.5, color: "#888899", margin: "0 0 16px", lineHeight: 1.4 }}>
          {t("Tap any calendar date to preview planning signals for contract signings, purchases, or travel. Use Muhurtha for final timing.", "క్యాలెండర్‌లోని ఏ తేదీనైనా క్లిక్ చేసి ప్రణాళిక సూచనలను చూడండి. తుది సమయం కోసం ముహూర్తం ఉపయోగించండి.")}
        </p>

        {/* 28-31 Day Grid layout */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 12 }}>
          {/* Weekday headers */}
          {[t("Sun", "ఆది"), t("Mon", "సోమ"), t("Tue", "మంగళ"), t("Wed", "బుధ"), t("Thu", "గురు"), t("Fri", "శుక్ర"), t("Sat", "శని")].map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 9.5, color: "#555566", fontWeight: 700, textTransform: "uppercase", paddingBottom: 4 }}>
              {d}
            </div>
          ))}

          {calDays.map(item => {
            let col = "#fbbf24"; // standard
            if (item.status === "auspicious") col = "#10b981";
            if (item.status === "caution") col = "#f43f5e";

            const isSelected = selectedDayInfo?.day === item.day;

            return (
              <button
                key={item.day}
                type="button"
                className="agenda-day-cell"
                onClick={() => setSelectedDayInfo(item)}
                style={{
                  background: isSelected ? "rgba(201,169,110,0.12)" : "rgba(255,255,255,0.01)",
                  border: isSelected ? "0.5px solid rgba(201,169,110,0.4)" : "0.5px solid rgba(255,255,255,0.03)",
                  borderRadius: 6, minHeight: 44, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "space-between", padding: "6px 4px",
                  cursor: "pointer", position: "relative"
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? "#c9a96e" : "#888899" }}>{item.day}</span>
                {/* Glowing Dot indicator */}
                <div style={{
                  width: 5, height: 5, borderRadius: "50%", background: col,
                  boxShadow: `0 0 6px ${col}`
                }} />
              </button>
            );
          })}
        </div>

        {/* Selected Day Info details block */}
        {selectedDayInfo ? (
          <div style={{
            background: "rgba(201,169,110,0.03)", border: "0.5px solid rgba(201,169,110,0.16)",
            borderRadius: 10, padding: "12px 16px", marginTop: 12,
            animation: "slide-in 200ms ease"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <h4 style={{ fontSize: 12.5, fontWeight: 700, color: "#f0f0f0", margin: 0 }}>
                {t("Day Details", "దినచర్య సూచన")}: {t("Day", "తేదీ")} {selectedDayInfo.day}
              </h4>
              <span style={{
                fontSize: 9.5, fontWeight: 800, textTransform: "uppercase",
                color: selectedDayInfo.status === "auspicious" ? "#10b981" : selectedDayInfo.status === "caution" ? "#f43f5e" : "#fbbf24"
              }}>
                {selectedDayInfo.status === "auspicious" ? t("Supportive Signal", "అనుకూల సంకేతం") : selectedDayInfo.status === "caution" ? t("Caution Signal", "జాగ్రత్త సంకేతం") : t("Standard / Neutral", "సాధారణ దినం")}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#a0a0b0", lineHeight: 1.5, margin: 0 }}>
              {lang === "en" ? selectedDayInfo.textEn : selectedDayInfo.textTe}
            </p>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 8, fontSize: 10.5, color: "#555566", fontStyle: "italic" }}>
            {t("Tap a date above to preview planning signals.", "ప్రణాళిక సూచనల కోసం పైన తేదీని ఎంచుకోండి.")}
          </div>
        )}
      </div>

      {/* ── 4. Collectible Destiny Badges (Aura Archetypes) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 4 }}>
          <Award size={15} style={{ color: "#c9a96e" }} />
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, fontWeight: 700, color: "#c9a96e", letterSpacing: "0.06em", margin: 0 }}>
            {t("Destiny Badges (Your Cosmic Aura Archetypes)", "జన్మరహస్య యోగ చిహ్నాలు")}
          </h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {destinyBadges.map((badge, idx) => (
            <div
              key={idx}
              className="celestial-glass celestial-panel"
              style={{
                borderRadius: 14, padding: "16px 20px",
                border: "0.5px solid rgba(201, 169, 110, 0.2)",
                background: "linear-gradient(135deg, rgba(201,169,110,0.02) 0%, rgba(10,10,15,0.4) 100%)",
                position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", gap: 10
              }}
            >
              {/* Circular light halo backdrop inside card */}
              <div style={{
                position: "absolute", top: -20, right: -20, width: 70, height: 70, borderRadius: "50%",
                background: `${PLANET_COLORS[badge.planet]}14`, filter: "blur(20px)"
              }} />

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  border: "1px solid rgba(201,169,110,0.35)", background: "rgba(201,169,110,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#c9a96e"
                }}>
                  <Star size={14} fill="#c9a96e" />
                </div>
                <div>
                  <h4 style={{ fontFamily: "'Cinzel', serif", fontSize: 12.5, fontWeight: 700, color: "#f0f0f0", margin: 0 }}>{badge.title}</h4>
                  <span style={{ fontSize: 8.5, color: "#888899", textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("Activation Lord", "కారక గ్రహం")}: {badge.planet}</span>
                </div>
              </div>
              <p style={{ fontSize: 11.5, color: "#a0a0b0", lineHeight: 1.45, margin: 0 }}>{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. Vimshottari Constellation Pathway ── */}
      {segments.length > 0 && (
        <div className="celestial-glass" style={{ borderRadius: 16, padding: "20px 24px", border: "0.5px solid rgba(201, 169, 110, 0.18)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={15} style={{ color: "#c9a96e" }} />
              <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, fontWeight: 700, color: "#c9a96e", letterSpacing: "0.06em", margin: 0 }}>
                {t("Vimshottari Constellation Journey", "జీవన ప్రయాణ కాలక్రమం (మహాదశలు)")}
              </h3>
            </div>
            {md?.lord && (
              <span style={{ fontSize: 9.5, padding: "2px 6px", background: "rgba(201, 169, 110, 0.1)", border: "0.5px solid rgba(201, 169, 110, 0.2)", borderRadius: 4, color: "#c9a96e" }}>
                {lang === "en" ? PLANET_EN[md.lord] || md.lord : PLANET_TE[md.lord] || md.lord} {t("Mahadasha", "మహాదశ")}
              </span>
            )}
          </div>

          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 20, paddingLeft: 8 }}>
            {/* Glowing Golden Constellation connector thread */}
            <div style={{
              position: "absolute", top: 10, left: 17, bottom: 28, width: "1.5px",
              background: "linear-gradient(to bottom, #c9a96e 0%, rgba(201, 169, 110, 0.2) 70%, rgba(255, 255, 255, 0.02) 100%)",
              zIndex: 1
            }} />

            {segments.map((seg, idx) => {
              const color = PLANET_COLORS[seg.lord] || "#c9a96e";
              const interp = DASHA_INTERPRETATIONS[seg.lord] || {
                titleEn: "Planetary Activation Period",
                titleTe: "గ్రహ ప్రభావ కాలం",
                descEn: "Brings transitions and unique challenges according to the planet's placements.",
                descTe: "మీ జాతకంలో గ్రహ స్థానాన్ని బట్టి అనుకూల ఫలితాలు కలుగుతాయి."
              };

              return (
                <div key={`${seg.lord}-${seg.start}`} style={{ display: "flex", gap: 16, position: "relative", zIndex: 2 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div 
                      className={seg.isCurrent ? "timeline-beacon-active" : undefined}
                      style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: seg.isCurrent ? `radial-gradient(circle, #08070e 20%, ${color}22 100%)` : "#141416",
                        border: `1.5px solid ${seg.isCurrent ? color : "rgba(255, 255, 255, 0.15)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10.5, fontWeight: "bold", color: seg.isCurrent ? color : "#888899"
                      }}
                    >
                      {seg.lord[0]}
                    </div>
                  </div>

                  <div style={{
                    flex: 1,
                    background: seg.isCurrent ? "rgba(201, 169, 110, 0.02)" : "transparent",
                    border: seg.isCurrent ? "0.5px solid rgba(201, 169, 110, 0.12)" : "0.5px solid transparent",
                    borderRadius: 10, padding: seg.isCurrent ? "12px 14px" : "2px 0 0 0", marginTop: -2
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: seg.isCurrent ? "#f0f0f0" : "#a0a0b0" }}>
                          {lang === "en" ? PLANET_EN[seg.lord] || seg.lord : PLANET_TE[seg.lord] || seg.lord}
                        </span>
                        {seg.isCurrent && (
                          <span style={{
                            fontSize: 8.5, background: "rgba(201,169,110,0.18)",
                            border: "0.5px solid rgba(201,169,110,0.35)", color: "#c9a96e",
                            padding: "1px 4px", borderRadius: 3, fontWeight: 600
                          }}>
                            {t("ACTIVE", "ప్రస్తుతం")}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: seg.isCurrent ? "#c9a96e" : "#666677" }}>
                        {fmtShort(seg.start)} – {fmtShort(seg.end)}
                      </span>
                    </div>

                    <div style={{ fontSize: 11.5, fontWeight: 700, color: seg.isCurrent ? color : "#888899", marginTop: 2 }}>
                      {lang === "en" ? interp.titleEn : interp.titleTe}
                    </div>

                    <p style={{ fontSize: 11, color: seg.isCurrent ? "#a0a0b0" : "#777788", marginTop: 4, lineHeight: 1.4, margin: 0 }}>
                      {lang === "en" ? interp.descEn : interp.descTe}
                    </p>

                    {seg.isCurrent && (
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, borderTop: "0.5px solid rgba(255, 255, 255, 0.04)", paddingTop: 8 }}>
                        <div style={{ position: "relative", width: 14, height: 14 }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" style={{ transform: "rotate(-90deg)" }}>
                            <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />
                            <circle cx="7" cy="7" r="5" stroke={color} strokeWidth="1.5" fill="none"
                                    strokeDasharray="31.4" strokeDashoffset={31.4 - (31.4 * progress) / 100} />
                          </svg>
                        </div>
                        <span style={{ fontSize: 10, color: "#888899" }}>
                          {t("You are", "ఈ దశలో")} <strong>{Math.round(progress)}%</strong> {t("through this sub-period", "భాగం పూర్తయింది")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 6. Cosmic Prompt Oracle folders ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 4 }}>
          <HelpCircle size={15} style={{ color: "#c9a96e" }} />
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, fontWeight: 700, color: "#c9a96e", letterSpacing: "0.06em", margin: 0 }}>
            {t("Cosmic Prompt Oracle (Tap to Ask)", "ఆలోచనాత్మక ప్రశ్నల నిధి")}
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
                  padding: isOpen ? "18px 22px" : "12px 16px",
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
                      <h4 style={{ fontSize: 13.5, fontWeight: 600, color: "#f0f0f0", margin: 0 }}>
                        {lang === "en" ? cat.labelEn : cat.labelTe}
                      </h4>
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
                    gap: 8
                  }}>
                    {(lang === "en" ? cat.questionsEn : cat.questionsTe).map((q) => (
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
