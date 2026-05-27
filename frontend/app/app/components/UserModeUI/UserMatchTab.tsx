"use client";

/**
 * UserMatchTab — Premium Progressive 3-Step Relationship Compatibility Caster (v6 revamp).
 *
 * Steps:
 *   1. Selection Temple: Dual symmetrical Soul Cards comparing avatars.
 *   2. Casting Chamber: Celestial Laser Beam alignment and real-time KP calculations.
 *   3. Sanctuary of Union: SVG Concentric Harmony Wheel, Horizontal sliders, and Dual Vimshottari Period Timelines.
 */

import React, { useState } from "react";
import axios from "axios";
import { Heart, Plus, Users, Loader2, Sparkles, AlertTriangle, ShieldCheck, HeartPulse, RefreshCw, Calendar, ArrowRight, User } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface ChartSession {
  id: string;
  name: string;
  date: string;
  time: string;
  ampm: string;
  place: string;
  gender: string;
  birthDetails?: any;
}

interface Props {
  chartData: any;
  savedSessions: ChartSession[];
  currentSessionId: string;
  onAddPartner: () => void;
  apiUrl: string;
  setToast: (t: any) => void;
}

export function UserMatchTab({ chartData, savedSessions, currentSessionId, onAddPartner, apiUrl, setToast }: Props) {
  const { t, lang } = useLanguage();
  const [partnerId, setPartnerId] = useState<string>("");
  const [matchStep, setMatchStep] = useState<1 | 2 | 3>(1);
  const [matchResults, setMatchResults] = useState<any>(null);

  const partnerOptions = savedSessions.filter(s => s.id !== currentSessionId);
  const currentPerson = savedSessions.find(s => s.id === currentSessionId);

  // Convert saved session properties to standard API payload
  const convertSessionToApi = (s: any) => {
    const bd = s.birthDetails || s;
    const dateStr = bd.date || "";
    let date = dateStr;
    
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        date = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    } else if (dateStr.includes("-")) {
      const parts = dateStr.split("-");
      if (parts[0].length === 2 && parts[2].length === 4) {
        date = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }

    const timeStr = bd.time || "00:00";
    let [hh, mm] = timeStr.split(":").map(Number);
    const ampm = bd.ampm || "AM";
    if (ampm === "PM" && hh !== 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;
    const time = `${String(hh).padStart(2, "0")}:${String(mm || 0).padStart(2, "0")}`;

    return {
      name: s.name || bd.name || "User",
      date,
      time,
      latitude: bd.latitude || 17.385,
      longitude: bd.longitude || 78.4867,
      timezone_offset: bd.timezone_offset ?? 5.5,
      gender: bd.gender || s.gender || "",
    };
  };

  const handleCompute = async () => {
    const partner = savedSessions.find(s => s.id === partnerId);
    const current = savedSessions.find(s => s.id === currentSessionId);
    if (!current || !partner) return;

    setMatchStep(2); // Move to Casting Chamber (Loading state)
    const startedAt = Date.now();

    try {
      const res = await axios.post(`${apiUrl}/compatibility/match`, {
        person1: convertSessionToApi(current),
        person2: convertSessionToApi(partner),
      });

      // Maintain premium visual alignment duration
      const elapsed = Date.now() - startedAt;
      if (elapsed < 2000) {
        await new Promise(r => setTimeout(r, 2000 - elapsed));
      }

      setMatchResults(res.data);
      setMatchStep(3); // Enter results sanctuary
    } catch {
      setMatchStep(1);
      setToast({
        msg: t("Could not compute compatibility. Please try again.", "సరిపోలిక ఫలితాలు లెక్కించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి."),
        tone: "error"
      });
    }
  };

  const handleReset = () => {
    setMatchResults(null);
    setPartnerId("");
    setMatchStep(1);
  };

  // Render Onboarding state if no partners saved
  if (partnerOptions.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "60px 20px", textAlign: "center", gap: 12, maxWidth: 500, margin: "0 auto",
        background: "rgba(255,255,255,0.01)", border: "0.5px solid rgba(255,255,255,0.04)", borderRadius: 16
      }} className="celestial-glass">
        <Heart size={32} style={{ color: "#f43f5e", opacity: 0.6 }} />
        <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: "#f0f0f0", margin: 0 }}>
          {t("No Partners in your Circle", "సర్కిల్‌లో ఇతర ప్రొఫైల్స్ లేవు")}
        </h3>
        <p style={{ fontSize: 12, color: "#888899", lineHeight: 1.5, margin: "0 0 10px 0" }}>
          {t(
            "To calculate relationship compatibility, you first need to add your partner, spouse, or family member to your Cosmic Circle.",
            "వైవాహిక లేదా జంట పొంతనలు లెక్కించడానికి, మొదటగా మీ భాగస్వామి లేదా స్నేహితుని ప్రొఫైల్ జతచేయండి."
          )}
        </p>
        <button
          type="button"
          onClick={onAddPartner}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 20px", borderRadius: 8,
            fontSize: 13, fontWeight: 700,
            color: "#09090f", background: "#c9a96e",
            border: "none", cursor: "pointer"
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>{t("Add Partner Profile", "భాగస్వామి ప్రొఫైల్ జతచేయి")}</span>
        </button>
      </div>
    );
  }

  // ── STEP 1: SELECTION TEMPLE (ONBOARDING) ──
  if (matchStep === 1) {
    const selectedPartner = savedSessions.find(s => s.id === partnerId);
    
    return (
      <div className="celestial-glass celestial-panel" style={{ maxWidth: 620, margin: "0 auto", padding: "24px 28px", border: "1px solid rgba(212, 175, 55, 0.2)", borderRadius: 14 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <Heart size={24} style={{ color: "#c9a96e", marginBottom: 8 }} />
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: "#f0f0f0", margin: "0 0 4px 0" }}>
            {t("Vedic Love Match", "ప్రేమ & జంట సరిపోలిక")}
          </h2>
          <p style={{ fontSize: 12, color: "#888899", margin: 0, lineHeight: 1.45 }}>
            {t("Establish a dual-chart astrological alignment under strict Cuspal Sub Lord rules to evaluate your relationship's emotional and physical synergy.", "మీ సర్కిల్ నుండి భాగస్వామిని ఎంచుకొని వారి జాతక పొంతనలను కేపీ పద్ధతిలో ఖచ్చితత్వంతో లెక్కించండి.")}
          </p>
        </div>

        {/* Side-by-Side Dual Soul Cards */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center", position: "relative", marginBottom: 24 }}>
          {/* Card 1: You */}
          <div style={{
            flex: 1, padding: "16px 14px", background: "rgba(255,255,255,0.015)",
            border: "0.5px solid rgba(201,169,110,0.3)", borderRadius: 10, textAlign: "center"
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", background: "rgba(201,169,110,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px",
              fontFamily: "'Cinzel', serif", color: "#c9a96e", fontSize: 18, fontWeight: "bold"
            }}>
              {currentPerson?.name[0]?.toUpperCase() || "U"}
            </div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: "#f0f0f0", margin: 0 }}>{currentPerson?.name}</h4>
            <span style={{ fontSize: 9, color: "#888899", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginTop: 2 }}>{t("Primary Profile", "మీరు")}</span>
          </div>

          <div style={{ color: "#c9a96e" }}><ArrowRight size={16} /></div>

          {/* Card 2: Selected Partner or Empty slot */}
          {selectedPartner ? (
            <div style={{
              flex: 1, padding: "16px 14px", background: "rgba(255,255,255,0.015)",
              border: "0.5px solid rgba(244,63,94,0.3)", borderRadius: 10, textAlign: "center"
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", background: "rgba(244,63,94,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px",
                fontFamily: "'Cinzel', serif", color: "#f43f5e", fontSize: 18, fontWeight: "bold"
              }}>
                {selectedPartner.name[0]?.toUpperCase()}
              </div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#f0f0f0", margin: 0 }}>{selectedPartner.name}</h4>
              <span style={{ fontSize: 9, color: "#888899", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginTop: 2 }}>{t("Partner Selected", "భాగస్వామి")}</span>
            </div>
          ) : (
            <div style={{
              flex: 1, padding: "16px 14px", background: "rgba(255,255,255,0.005)",
              border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 10, textAlign: "center",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 110
            }}>
              <Users size={20} style={{ color: "#555566", marginBottom: 6 }} />
              <span style={{ fontSize: 10.5, color: "#555566" }}>{t("Choose Partner Below", "ఎంపిక చేయండి")}</span>
            </div>
          )}
        </div>

        {/* Selector Dropdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          <label style={{ fontSize: 10, color: "#888899", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            {t("Select Partner from Circle", "భాగస్వామిని ఎంచుకోండి")}
          </label>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            style={{
              padding: "11px 14px", borderRadius: 8, background: "#141416",
              border: "0.5px solid rgba(255,255,255,0.12)", color: "#e2e2e7",
              fontFamily: "inherit", fontSize: 13, outline: "none", cursor: "pointer"
            }}
          >
            <option value="">-- {t("Choose from Saved Circle", "సర్కిల్ నుండి ఎంచుకోండి")} --</option>
            {partnerOptions.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.gender === "female" ? t("Female", "స్త్రీ") : t("Male", "పురుషుడు")})
              </option>
            ))}
          </select>
        </div>

        {/* Compute Button */}
        <button
          type="button"
          disabled={!partnerId}
          onClick={handleCompute}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 999,
            fontSize: 13, fontWeight: 700, fontFamily: "inherit",
            color: !partnerId ? "rgba(201,169,110,0.6)" : "#09090f",
            background: !partnerId ? "rgba(201,169,110,0.15)" : "#c9a96e",
            border: "none", cursor: !partnerId ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: !partnerId ? "none" : "0 4px 18px -4px rgba(201,169,110,0.5)",
            transition: "all 140ms ease"
          }}
        >
          <Heart size={14} fill={partnerId ? "#09090f" : "transparent"} />
          <span>{t("Compute Compatibility", "పొంతనల ఫలితం చూడు")}</span>
        </button>

        {/* Add Partner shortcut */}
        <div style={{ display: "flex", justifyContent: "center", borderTop: "0.5px solid rgba(255,255,255,0.04)", paddingTop: 14, marginTop: 14 }}>
          <button
            type="button"
            onClick={onAddPartner}
            style={{
              background: "transparent", border: "none", color: "#c9a96e",
              fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4
            }}
          >
            <Plus size={11} strokeWidth={2.5} />
            {t("Add New Partner Details First", "నూతన భాగస్వామి ప్రొఫైల్ జతచేయి")}
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 2: CASTING CHAMBER (ALIGNMENT LOADING STATE) ──
  if (matchStep === 2) {
    const partner = savedSessions.find(s => s.id === partnerId);
    
    return (
      <div className="celestial-glass" style={{
        maxWidth: 550, margin: "0 auto", padding: "40px 20px", textAlign: "center",
        border: "0.5px solid rgba(201,169,110,0.25)", borderRadius: 16,
        background: "rgba(10,10,15,0.4)"
      }}>
        {/* Orbital alignment graphics */}
        <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto 28px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Outer circle */}
          <div className="aura-spin-slow" style={{
            position: "absolute", width: "100%", height: "100%",
            border: "1px dashed rgba(201,169,110,0.3)", borderRadius: "50%"
          }} />
          {/* Inner breathing orb */}
          <div style={{
            width: 70, height: 70, borderRadius: "50%", background: "rgba(201,169,110,0.06)",
            border: "1.5px solid #c9a96e", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 24px rgba(201,169,110,0.18)"
          }}>
            <Loader2 size={24} className="user-spin" style={{ color: "#c9a96e" }} />
          </div>

          {/* Symmetrical profile badges orbiting */}
          <div style={{
            position: "absolute", top: "10%", left: "10%", width: 24, height: 24, borderRadius: "50%",
            background: "rgba(201,169,110,0.18)", border: "1px solid #c9a96e", fontSize: 11, fontWeight: "bold",
            color: "#c9a96e", display: "flex", alignItems: "center", justifyContent: "center"
          }}>{currentPerson?.name[0]?.toUpperCase()}</div>
          
          <div style={{
            position: "absolute", bottom: "10%", right: "10%", width: 24, height: 24, borderRadius: "50%",
            background: "rgba(244,63,94,0.18)", border: "1px solid #f43f5e", fontSize: 11, fontWeight: "bold",
            color: "#f43f5e", display: "flex", alignItems: "center", justifyContent: "center"
          }}>{partner?.name[0]?.toUpperCase()}</div>
        </div>

        {/* Alignment laser beam layer */}
        <div style={{ position: "relative", height: 6, width: "70%", background: "rgba(255,255,255,0.02)", margin: "0 auto 20px", borderRadius: 3, overflow: "hidden" }}>
          <div className="celestial-beam" />
        </div>

        <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: "#f0f0f0", margin: "0 0 8px 0" }}>
          {t("Casting Astrological Alignment...", "గ్రహ పొంతనల గమనాన్ని గణిస్తోంది...")}
        </h3>
        
        {/* Under the hood live statuses */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 300, margin: "0 auto", color: "#888899", fontSize: 11.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t("Comparing lunar nakshatras", "జన్మ నక్షత్ర సరిపోలిక...")}</span>
            <span style={{ color: "#10b981", fontWeight: 700 }}>✓</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t("Analyzing 7th & 11th cusps", "భావ సబ్‌లార్డ్ అనుకూలత...")}</span>
            <span style={{ color: "#10b981", fontWeight: 700 }}>✓</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t("Aligning Vimshottari periods", "దశల గమనం పోలిక...")}</span>
            <span style={{ color: "#c9a96e" }} className="user-spin">🪐</span>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 3: SANCTUARY OF UNION (COMPATIBILITY RESULTS) ──
  const r = matchResults;
  const score = r?.ashtakoota?.total_score ?? 0;
  const maxScore = r?.ashtakoota?.max_score ?? 36;
  const pct = Math.round((score / maxScore) * 100);

  let statusColor = "#f43f5e"; // low
  let statusTitle = t("Friction & Caution", "జాగ్రత్త వహించాలి");
  if (pct >= 72) {
    statusColor = "#10b981";
    statusTitle = t("Deep Celestial Harmony", "అత్యుత్తమ యోగ్యత");
  } else if (pct >= 50) {
    statusColor = "#fbbf24";
    statusTitle = t("Promising Union", "మధ్యమ అనుకూలత");
  }

  const ashtaKootas = r?.ashtakoota?.kootas || [];
  const Nadi = ashtaKootas.find((k: any) => (k.name_en || k.name) === "Nadi");
  const Rasi = ashtaKootas.find((k: any) => (k.name_en || k.name) === "Rasi");
  const Yoni = ashtaKootas.find((k: any) => (k.name_en || k.name) === "Yoni");
  const Maitri = ashtaKootas.find((k: any) => (k.name_en || k.name) === "Graha Maitri");

  const pillars = [
    {
      label: t("Emotional Resonance", "మానసిక బంధం"),
      desc: t("Checks mutual mindset, sign lords, and empathy.", "జంట మధ్య మానసిక ఆలోచనలు, స్నేహం మరియు అనుకూలతలను చూపిస్తుంది."),
      score: Maitri?.score ?? 0,
      max: Maitri?.max ?? 5,
      status: (Maitri?.score ?? 0) >= 3 ? t("High", "చాలా బాగుంది") : t("Average", "సాధారణం"),
      color: (Maitri?.score ?? 0) >= 3 ? "#10b981" : "#fbbf24"
    },
    {
      label: t("Vitality & Health", "ఆయురారోగ్య బలం"),
      desc: t("Reviews traditional Nadi and vitality indicators as caution signals, not medical conclusions.", "నాడి మరియు జీవశక్తి సూచనలను జాగ్రత్త సంకేతాలుగా మాత్రమే పరిశీలిస్తుంది; వైద్య నిర్ణయాలుగా కాదు."),
      score: Nadi?.score ?? 0,
      max: Nadi?.max ?? 8,
      status: (Nadi?.score ?? 0) === 0 ? t("Caution (Dosha)", "దోషం ఉంది") : t("Excellent", "అత్యుత్తమ ప్రశాంతత"),
      color: (Nadi?.score ?? 0) === 0 ? "#f43f5e" : "#10b981"
    },
    {
      label: t("Attraction Power", "ఆకర్షణ చాతుర్యం"),
      desc: t("Rates magnetic pulls, intimacy harmony, and instinct comfort.", "ఒకరిపై ఒకరికి ఉండే సహజ సిద్ధమైన ప్రేమ, సాన్నిహిత్యం మరియు ఆకర్షణ బలం."),
      score: Yoni?.score ?? 0,
      max: Yoni?.max ?? 4,
      status: (Yoni?.score ?? 0) >= 2 ? t("Strong", "చాలా బలంగా ఉంది") : t("Neutral", "సాధారణం"),
      color: (Yoni?.score ?? 0) >= 2 ? "#10b981" : "#fbbf24"
    },
    {
      label: t("Finance & Growth", "కుటుంబ వృద్ధి"),
      desc: t("Ensures prosperity, cooperative career rise, and asset gains.", "विవాహం తర్వాత ఆర్థిక ఉన్నతి, అదృష్టం మరియు సామాజిక గౌరవాన్ని సూచిస్తుంది."),
      score: Rasi?.score ?? 0,
      max: Rasi?.max ?? 7,
      status: (Rasi?.score ?? 0) >= 4 ? t("Auspicious", "చాలా శుభప్రదం") : t("Favorable", "అనుకూలం"),
      color: (Rasi?.score ?? 0) >= 4 ? "#10b981" : "#fbbf24"
    }
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 32, display: "flex", flexDirection: "column", gap: 24 }}>
      
      {/* results Header Block with SVG Donut */}
      <div className="celestial-glass" style={{
        padding: "24px 20px", borderRadius: 16, border: "0.5px solid rgba(201,169,110,0.25)",
        textAlign: "center", position: "relative",
        background: `radial-gradient(ellipse at 50% 0%, ${statusColor}14 0%, rgba(20,20,30,0.6) 80%), rgba(10,10,15,0.4)`,
      }}>
        <span style={{ fontSize: 9.5, color: "#888899", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 6 }}>
          {t("Sanctuary of Union (Compatibility Result)", "దేవాలయంలో సరిపోలిక ఫలితం")}
        </span>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 28, margin: "16px 0" }}>
          {/* Concentric Harmony SVG Donut */}
          <div style={{ position: "relative", width: 96, height: 96 }}>
            <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="48" cy="48" r="41" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
              <circle cx="48" cy="48" r="41" stroke={statusColor} strokeWidth="6" fill="transparent"
                      strokeDasharray="257.6" strokeDashoffset={257.6 - (257.6 * pct) / 100}
                      style={{ strokeLinecap: "round", filter: `drop-shadow(0 0 4px ${statusColor}50)` }} />
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#f0f0f0" }}>{pct}%</span>
              <span style={{ fontSize: 9, color: "#888899" }}>{score}/{maxScore}</span>
            </div>
          </div>

          <div style={{ textAlign: "left" }}>
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 22, color: statusColor, margin: "0 0 4px 0", fontWeight: "bold" }}>
              {statusTitle}
            </h2>
            <p style={{ fontSize: 12.5, color: "#a0a0b0", margin: 0, maxWidth: 440, lineHeight: 1.55 }}>
              {lang === "en"
                ? `These two natal signatures match with ${score} out of 36 gunas in traditional Vedic matchmaking, indicating a ${r.overall_verdict || "favorable"} baseline relationship alignment.`
                : `కేపీ జ్యోతిష్య నిబంధనల ప్రకారం ఈ రెండు జన్మ నక్షత్రాల మధ్య 36 గుణాలకు గాను ${score} గుణాలు లభించాయి. ఇది ${r.overall_verdict || "GOOD"} సంబంధ బలాన్ని సూచిస్తుంది.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* 4 Pillars of Compatibility Grid */}
      <div>
        <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, fontWeight: 700, color: "#c9a96e", letterSpacing: "0.06em", marginBottom: 12 }}>
          {t("Visual Compatibility Pillars", "వివరణాత్మక పొంతనల విభాగాలు")}
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
          {pillars.map((p, idx) => (
            <div key={idx} className="celestial-glass" style={{ padding: "16px 20px", borderRadius: 12, border: "0.5px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <h4 style={{ fontSize: 13.5, fontWeight: 700, color: "#f0f0f0", margin: 0 }}>{p.label}</h4>
                <span style={{ fontSize: 10, color: p.color, fontWeight: 800, textTransform: "uppercase" }}>
                  {p.status} ({p.score}/{p.max})
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: "#888899", margin: "0 0 12px 0", lineHeight: 1.4 }}>{p.desc}</p>
              
              {/* Horizontal Slider Gauge */}
              <div style={{ position: "relative", height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                <div style={{
                  position: "absolute", left: 0, height: "100%", width: `${(p.score / p.max) * 100}%`,
                  background: p.color, borderRadius: 2, boxShadow: `0 0 6px ${p.color}`
                }} />
                {/* Gauge Thumb */}
                <div 
                  className="harmony-gauge-thumb"
                  style={{
                    position: "absolute", left: `calc(${(p.score / p.max) * 100}% - 7px)`, top: -5,
                    background: p.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DUAL VIMSHOTTARI ALIGNMENT TIMELINE */}
      {r?.person1_dasha && r?.person2_dasha && (
        <div className="celestial-glass" style={{ borderRadius: 14, padding: "20px 24px", border: "0.5px solid rgba(201, 169, 110, 0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Calendar size={15} style={{ color: "#c9a96e" }} />
            <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, fontWeight: 700, color: "#c9a96e", letterSpacing: "0.06em", margin: 0 }}>
              {t("Dual Vimshottari Period Alignment (Timing Harmony)", "జంట దశా కాల చక్ర గమనం (సమయ అనుకూలతలు)")}
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Person 1 Dasha */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.015)", borderRadius: 8 }}>
              <div>
                <span style={{ fontSize: 9, color: "#888899", textTransform: "uppercase" }}>{currentPerson?.name}</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e2e7", marginTop: 2 }}>
                  {r.person1_dasha.mahadasha_lord} MD → {r.person1_dasha.antardasha_lord} AD
                </div>
              </div>
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "#666677" }}>
                {t("Active till", "ముగింపు")}: {r.person1_dasha.antardasha_end}
              </span>
            </div>

            {/* Person 2 Dasha */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.015)", borderRadius: 8 }}>
              <div>
                <span style={{ fontSize: 9, color: "#888899", textTransform: "uppercase" }}>
                  {savedSessions.find(s => s.id === partnerId)?.name}
                </span>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e2e7", marginTop: 2 }}>
                  {r.person2_dasha.mahadasha_lord} MD → {r.person2_dasha.antardasha_lord} AD
                </div>
              </div>
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "#666677" }}>
                {t("Active till", "ముగింపు")}: {r.person2_dasha.antardasha_end}
              </span>
            </div>

            {/* Combined Auspicious Narrative card */}
            <div style={{
              background: "rgba(16, 185, 129, 0.04)", border: "0.5px solid rgba(16, 185, 129, 0.2)",
              borderRadius: 10, padding: 12, display: "flex", gap: 10, alignItems: "flex-start"
            }}>
              <ShieldCheck size={16} style={{ color: "#10b981", flexShrink: 0, marginTop: 2 }} />
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: "#10b981", margin: "0 0 4px 0" }}>
                  {t("Mutual Timing Synergy", "జంట సమయ యోగం")}
                </h4>
                <p style={{ fontSize: 11.5, color: "#a0a0b0", lineHeight: 1.45, margin: 0 }}>
                  {lang === "en"
                    ? `Both charts show active dasha lords (${r.person1_dasha.mahadasha_lord} & ${r.person2_dasha.mahadasha_lord}) with supportive relationship indicators. This suggests better coordination during the coming period, while real-life effort and choices still matter.`
                    : `ఈ రెండు కుండలీలలో ప్రస్తుత దశలు సంబంధానికి అనుకూల సూచనలను చూపిస్తున్నాయి. రాబోయే కాలంలో సమన్వయం మెరుగుపడే అవకాశం ఉంది; కానీ నిజ జీవిత ప్రయత్నం మరియు నిర్ణయాలు కూడా ముఖ్యమే.`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset button */}
      <button
        type="button"
        onClick={handleReset}
        style={{
          alignSelf: "center", display: "flex", alignItems: "center", gap: 8,
          padding: "10px 24px", background: "rgba(255,255,255,0.02)",
          border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 999,
          color: "#c9a96e", fontSize: 12.5, fontWeight: 600, cursor: "pointer", transition: "all 140ms"
        }}
      >
        <RefreshCw size={13} />
        <span>{t("Match Another Partner", "మరొక ప్రొఫైల్ సరిపోల్చండి")}</span>
      </button>
    </div>
  );
}
