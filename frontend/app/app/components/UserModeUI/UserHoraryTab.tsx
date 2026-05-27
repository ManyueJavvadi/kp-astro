"use client";

/**
 * UserHoraryTab — Premium Prashna Oracle Tab for General User Mode (v6 revamp).
 *
 * Implements:
 *   1. Interactive 249 Sub-Lord Division Casting Circle SVG.
 *   2. 3D Tumbling Dices rolling animation.
 *   3. 3D Flipping Gold-Embossed Verdict Cards (YES/NO/MAYBE).
 */

import React, { useState, useRef } from "react";
import axios from "axios";
import { HelpCircle, Sparkles, Globe, Briefcase, Heart, Plane, Wallet, HeartPulse, Wand2, Loader2, Dices, CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Props {
  apiUrl: string;
  liveLoc: any;
  setToast: (t: any) => void;
}

export function UserHoraryTab({ apiUrl, liveLoc, setToast }: Props) {
  const { t, lang } = useLanguage();
  const [horaryQuestion, setHoraryQuestion] = useState("");
  const [horaryTopic, setHoraryTopic] = useState("general");
  const [horaryNumber, setHoraryNumber] = useState<number | "">("");
  const [horaryDiceSpin, setHoraryDiceSpin] = useState(false);
  const [horaryLoading, setHoraryLoading] = useState(false);
  const [horaryResult, setHoraryResult] = useState<any>(null);
  const [cardFlipped, setCardFlipped] = useState(false);
  
  const rollIntervalRef = useRef<any>(null);

  const handleRoll = () => {
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    setHoraryDiceSpin(true);
    
    let ticks = 0;
    const maxTicks = 12;
    rollIntervalRef.current = setInterval(() => {
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
        setHoraryNumber(Math.floor(Math.random() * 249) + 1);
        setHoraryDiceSpin(false);
        return;
      }
      setHoraryNumber(Math.floor(Math.random() * 249) + 1);
    }, 50);
  };

  const handleCompute = async () => {
    if (!horaryNumber || !horaryQuestion.trim()) return;

    if (!liveLoc.location) {
      setToast({
        msg: t(
          "Current location is required for KP Ruling Planets calculation. Please enable GPS location.",
          "నియమ గ్రహాల కొరకు మీ ప్రస్తుత ప్రాంత సమాచారం అవసరం. దయచేసి లొకేషన్ ఆన్ చేయండి."
        ),
        tone: "error"
      });
      return;
    }

    setHoraryLoading(true);
    setHoraryResult(null);
    setCardFlipped(false);
    const startedAt = Date.now();

    try {
      const res = await axios.post(`${apiUrl}/horary/analyze`, {
        number: horaryNumber,
        question: horaryQuestion,
        topic: horaryTopic,
        latitude: liveLoc.location.latitude,
        longitude: liveLoc.location.longitude,
        timezone_offset: liveLoc.location.timezone_offset,
      });

      // Maintain premium visual transition duration
      const elapsed = Date.now() - startedAt;
      if (elapsed < 1200) {
        await new Promise(r => setTimeout(r, 1200 - elapsed));
      }

      setHoraryResult(res.data);
      // Flip the card on next tick for smooth 3D animation
      setTimeout(() => setCardFlipped(true), 250);
    } catch {
      setToast({
        msg: t("Could not cast question. Please try again.", "ప్రశ్న గమనం లెక్కించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి."),
        tone: "error"
      });
    } finally {
      setHoraryLoading(false);
    }
  };

  const handleNewQuestion = () => {
    setHoraryResult(null);
    setHoraryQuestion("");
    setHoraryNumber("");
    setCardFlipped(false);
  };

  // Result display panel using 3D Flip Card
  if (horaryResult) {
    const r = horaryResult;
    const v = r.verdict || {};
    const verdict = v.verdict || "MAYBE";
    
    let verdictColor = "#fbbf24"; // maybe
    let VerdictIcon = HelpCircle;
    let verdictLabel = t("Mixed signal", "మిశ్రమ సంకేతం");

    if (verdict === "YES") {
      verdictColor = "#10b981";
      VerdictIcon = CheckCircle2;
      verdictLabel = t("Leans yes from KP evidence", "కేపీ ఆధారాల ప్రకారం అవును వైపు మొగ్గు");
    } else if (verdict === "NO") {
      verdictColor = "#f43f5e";
      VerdictIcon = XCircle;
      verdictLabel = t("Leans no from KP evidence", "కేపీ ఆధారాల ప్రకారం కాదు వైపు మొగ్గు");
    }

    return (
      <div style={{ maxWidth: 500, margin: "0 auto", paddingBottom: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        <button
          type="button"
          onClick={handleNewQuestion}
          style={{ alignSelf: "flex-start", padding: "5px 12px", background: "none", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "#888899", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
        >
          ← {t("New Question", "కొత్త ప్రశ్న")}
        </button>

        {/* Question Recap banner */}
        <div style={{ padding: "10px 14px", background: "rgba(201,169,110,0.04)", border: "0.5px solid rgba(201,169,110,0.15)", borderRadius: 8, fontSize: 12, color: "#888899", fontStyle: "italic" }}>
          "{horaryQuestion}" <span style={{ color: "#c9a96e", fontStyle: "normal", fontWeight: "bold", marginLeft: 4 }}>#{r.prashna_number}</span>
        </div>

        {/* 3D Flip Card Container */}
        <div className="flip-card-container" style={{ minHeight: 280 }}>
          <div className={`flip-card-inner ${cardFlipped ? "is-flipped" : ""}`}>
            {/* FRONT OF THE CARD (Gold Foil Backing) */}
            <div className="flip-card-front celestial-glass" style={{
              height: 280, borderRadius: 16, border: "2px solid rgba(201,169,110,0.5)",
              background: "radial-gradient(circle, #1a1625 0%, #0d0a14 100%)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%", border: "1px solid rgba(201,169,110,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#c9a96e", marginBottom: 12
              }}>
                <Sparkles size={24} className="aura-spin-slow" />
              </div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: "#c9a96e", letterSpacing: "0.1em" }}>
                {t("Casting Destiny Card", "దైవిక కార్డ్ తిరగేస్తోంది")}
              </span>
            </div>

            {/* BACK OF THE CARD (Revealed Verdict) */}
            <div className="flip-card-back celestial-glass" style={{
              minHeight: 280, borderRadius: 16,
              background: `radial-gradient(ellipse at 50% 0%, ${verdictColor}18 0%, rgba(20,20,30,0.6) 80%), rgba(10,10,15,0.4)`,
              border: "0.5px solid rgba(201,169,110,0.25)", padding: "28px 20px 24px",
              boxShadow: `0 24px 48px -24px ${verdictColor}30`, textAlign: "center"
            }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <VerdictIcon size={40} color={verdictColor} />
                <span style={{
                  fontFamily: "'Cinzel', serif", fontSize: "2.8rem", fontWeight: "bold",
                  color: verdictColor, textShadow: `0 0 32px ${verdictColor}33`, letterSpacing: "0.04em"
                }}>
                  {verdict}
                </span>
              </div>

              <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#e2e2e7", margin: "0 0 16px 0" }}>
                {verdictLabel}
              </h3>

              {/* Explanation Text */}
              {(v.verdict_reason || v.explanation) && (
                <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", paddingTop: 14, maxWidth: 420, margin: "0 auto" }}>
                  <span style={{ fontSize: 9, color: "#888899", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 6 }}>
                    {t("Cosmic Reasoning", "ఆధ్యాత్మిక వివరణ")}
                  </span>
                  <p style={{ fontSize: 12, color: "#a0a0b0", lineHeight: 1.6, margin: 0 }}>
                    {v.verdict_reason || v.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeSegment = typeof horaryNumber === "number" ? horaryNumber : 125;

  return (
    <div className="celestial-glass celestial-panel" style={{ maxWidth: 500, margin: "0 auto", paddingBottom: 24, display: "flex", flexDirection: "column", gap: 18, border: "1px solid rgba(212, 175, 55, 0.2)", borderRadius: 14, padding: "24px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <HelpCircle size={24} style={{ color: "#c9a96e", marginBottom: 8 }} />
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: "#f0f0f0", margin: "0 0 4px 0" }}>
          {t("Cast Prashna (Horary)", "ప్రశ్నాస్త్రం (హోరరీ)")}
        </h2>
        <p style={{ fontSize: 11.5, color: "#888899", margin: 0, lineHeight: 1.45 }}>
          {t("Hold one clear question in mind, select the topic, choose a 1-249 KP number, and let the backend cast the Prashna chart with current-location Ruling Planets.", "ఒక స్పష్టమైన ప్రశ్నను మనసులో ఉంచుకుని, విషయం ఎంచుకుని, 1-249 కేపీ సంఖ్యను ఎంచుకోండి. ప్రస్తుత ప్రదేశ రూలింగ్ ప్లానెట్స్‌తో బ్యాకెండ్ ప్రశ్న చార్ట్‌ను గణిస్తుంది.")}
        </p>
      </div>

      {/* 1. Category selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 9.5, color: "#888899", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
          {t("Select Topic", "అంశమును ఎంచుకోండి")}
        </span>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {[
            { id: "general", Icon: Globe, en: "General", te: "సాధారణ" },
            { id: "marriage", Icon: Heart, en: "Marriage", te: "వివాహం" },
            { id: "career", Icon: Briefcase, en: "Career", te: "ఉద్యోగం" },
            { id: "finance", Icon: Wallet, en: "Finance", te: "ధనం" },
            { id: "health", Icon: HeartPulse, en: "Health", te: "ఆరోగ్యం" },
            { id: "travel", Icon: Plane, en: "Travel", te: "ప్రయాణం" }
          ].map(item => {
            const active = horaryTopic === item.id;
            const label = lang === "en" ? item.en : item.te;
            const ChipIcon = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setHoraryTopic(item.id)}
                style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 11, fontFamily: "inherit", cursor: "pointer",
                  background: active ? "rgba(201,169,110,0.14)" : "#141416",
                  color: active ? "#c9a96e" : "#888899",
                  border: active ? "0.5px solid rgba(201,169,110,0.4)" : "0.5px solid rgba(255,255,255,0.06)",
                  transition: "all 140ms", display: "inline-flex", alignItems: "center", gap: 4
                }}
              >
                <ChipIcon size={11} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Textarea */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 9.5, color: "#888899", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
          {t("Type Your Question", "మీ ప్రశ్న రాయండి")}
        </span>
        <textarea
          placeholder={t("Will I get my career promotion this year?\nWill my foreign travel visa get approved?", "నా విదేశీ వీసా త్వరలోనే అప్రూవ్ అవుతుందా?\nఈ సంవత్సరం ఉద్యోగ ప్రమోషన్ లభిస్తుందా?")}
          value={horaryQuestion}
          onChange={(e) => setHoraryQuestion(e.target.value)}
          rows={3}
          style={{
            width: "100%", padding: "10px 12px", background: "#141416",
            border: `0.5px solid ${horaryQuestion.trim() ? "rgba(201,169,110,0.4)" : "rgba(255,255,255,0.12)"}`,
            borderRadius: 8, color: "#e2e2e7", fontSize: 12.5, fontFamily: "inherit",
            resize: "none", outline: "none", lineHeight: 1.5, boxSizing: "border-box"
          }}
        />
      </div>

      {/* 3. Interactive SVG segment Wheel & range slider */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        padding: "16px 12px", background: "rgba(255,255,255,0.015)",
        border: "0.5px solid rgba(255,255,255,0.04)", borderRadius: 12
      }}>
        <span style={{ fontSize: 9.5, color: "#888899", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
          {t("Spin the casting wheel (1–249)", "దైవిక చక్రం తిప్పండి (1–249)")}
        </span>

        {/* Rotating SVG Segment Wheel */}
        <div style={{ position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg 
            width="120" height="120" 
            style={{ 
              position: "absolute",
              transform: `rotate(${activeSegment * 1.44}deg)`, 
              transition: horaryDiceSpin ? "none" : "transform 0.4s cubic-bezier(0.1, 0.8, 0.3, 1)"
            }}
          >
            <circle cx="60" cy="60" r="54" stroke="rgba(201,169,110,0.2)" strokeWidth="1.5" fill="none" />
            <circle cx="60" cy="60" r="46" stroke="rgba(255,255,255,0.02)" strokeWidth="8" fill="none" strokeDasharray="3 4" />
            
            {/* Segment pointer node */}
            <circle cx="60" cy="6" r="3" fill="#c9a96e" />
          </svg>

          {/* Central Number Display */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "rgba(16,14,24,0.9)", border: "1.5px solid rgba(201,169,110,0.45)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 16px rgba(201,169,110,0.12)", zIndex: 2
          }}>
            <span style={{ fontSize: 26, fontFamily: "'Cinzel', serif", fontWeight: "bold", color: "#c9a96e" }}>
              {horaryNumber === "" ? "?" : horaryNumber}
            </span>
          </div>
        </div>

        {/* Exact segment details are computed by the backend, not guessed in the UI. */}
        {horaryNumber !== "" && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", background: "rgba(255,255,255,0.02)", padding: "4px 10px", borderRadius: 4, border: "0.5px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 8.5, color: "#888899" }}>
              {t("Exact sign, star and sub-lord are calculated after casting.", "ఖచ్చితమైన రాశి, నక్షత్రం, సబ్ లార్డ్ గణన తర్వాత చూపిస్తాము.")}
            </span>
          </div>
        )}

        {/* Range Slider */}
        <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "#555566", fontFamily: "monospace" }}>1</span>
          <input
            type="range"
            min={1}
            max={249}
            step={1}
            value={typeof horaryNumber === "number" ? horaryNumber : 125}
            onChange={(e) => setHoraryNumber(parseInt(e.target.value, 10))}
            style={{
              flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2,
              outline: "none", cursor: "pointer", accentColor: "#c9a96e"
            }}
          />
          <span style={{ fontSize: 10, color: "#555566", fontFamily: "monospace" }}>249</span>
        </div>

        {/* 3D Tumbling Dices Trigger */}
        <button
          type="button"
          onClick={handleRoll}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 999, fontSize: 11,
            background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.08)",
            color: "#a0a0b0", cursor: "pointer", transition: "all 140ms"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(201,169,110,0.4)"; e.currentTarget.style.color = "#c9a96e"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#a0a0b0"; }}
        >
          <Dices size={12} className={horaryDiceSpin ? "horary-dice-spin" : undefined} />
          <span>{t("Roll Oracle Number", "చక్రం భ్రమణం చేయి")}</span>
        </button>
      </div>

      {/* 4. Action button */}
      <button
        type="button"
        disabled={horaryLoading || !horaryNumber || !horaryQuestion.trim()}
        onClick={handleCompute}
        style={{
          width: "100%", padding: "12px 0", borderRadius: 999,
          fontSize: 13, fontWeight: 700, fontFamily: "inherit",
          color: (!horaryNumber || !horaryQuestion.trim() || horaryLoading) ? "rgba(201,169,110,0.6)" : "#09090f",
          background: (!horaryNumber || !horaryQuestion.trim() || horaryLoading) ? "rgba(201,169,110,0.15)" : "#c9a96e",
          border: "none", cursor: (!horaryNumber || !horaryQuestion.trim() || horaryLoading) ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: (!horaryNumber || !horaryQuestion.trim() || horaryLoading) ? "none" : "0 4px 18px -4px rgba(201,169,110,0.5)",
          transition: "all 140ms ease"
        }}
      >
        {horaryLoading ? (
          <>
            <Loader2 size={14} className="user-spin" />
            <span>{t("Consulting Oracle...", "గణనలు జరుగుతున్నాయి...")}</span>
          </>
        ) : (
          <>
            <Wand2 size={14} />
            <span>{t("Consult Oracle", "నిర్ణయం చూడు")}</span>
          </>
        )}
      </button>

      {(!horaryNumber || !horaryQuestion.trim()) && !horaryLoading && (
        <span style={{ fontSize: 9, color: "#555566", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {!horaryQuestion.trim() ? t("Type a question first", "మొదట ప్రశ్న రాయండి") : t("Pick or Roll a Number", "సంఖ్య ఎంచుకోండి")}
        </span>
      )}
    </div>
  );
}
