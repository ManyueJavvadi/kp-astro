"use client";

/**
 * HoraryTab — KP horary (Prashna) workflow tab.
 *
 * PR R5 (Phase A foundation refactor) — extracted from page.tsx
 * (~842 lines of JSX). Self-contained workflow tab. State all tab-local
 * (horary number, question, topic, result, loading, dice animation refs).
 *
 * State decisions:
 *   - 8 horary state vars STAY in parent (page.tsx) because the parent
 *     also resets them on chart switch / mode toggle. Passed as props.
 *   - horaryRollRef stays in parent (cleanup tied to component lifecycle).
 *   - setToast and workspaceData are shared with other tabs, passed as props.
 *
 * Sacred-region check (per .claude/research/world-first-vision.md §15):
 *   - No AI prompts touched
 *   - Horary backend endpoint (/horary/analyze) preserved exactly
 *   - Pure frontend JSX extraction
 */

import React from "react";
import type { RefObject, Dispatch, SetStateAction } from "react";
import axios from "axios";
import {
  Sparkles, Globe, HandHeart, Briefcase, Heart, Plane, Baby,
  GraduationCap, Home, Wallet, Scale, ChevronDown, RefreshCw, Loader2,
  HeartPulse, BookOpen, Dices, Wand2, CheckCircle2, XCircle, HelpCircle, Target,
} from "lucide-react";
// HomeIcon was a separate import name in the original page.tsx — alias Home.
const HomeIcon = Home;
import { useLanguage } from "@/lib/i18n";
import { PageHero } from "@/components/ui/PageHero";
import { FadeIn } from "@/components/motion";
import LiveLocationPill from "../components/LiveLocationPill";
import HoraryMoonCard from "../components/HoraryMoonCard";
import HoraryRpDashaStrip from "../components/HoraryRpDashaStrip";
import HoraryCuspsAccordion from "../components/HoraryCuspsAccordion";
import HorarySubLordChains from "../components/HorarySubLordChains";
import HoraryFourLevelAccordion from "../components/HoraryFourLevelAccordion";
import ClinicalFlagsStrip from "../components/ClinicalFlagsStrip";
import RPContextStrip from "../components/RPContextStrip";
import HoraryValidityCard from "../components/HoraryValidityCard";  // PR H1
import HoraryPatternChips from "../components/HoraryPatternChips";  // PR H4
import HoraryBhavatBhavamCard from "../components/HoraryBhavatBhavamCard";  // PR H7
import HorarySensitivityCard from "../components/HorarySensitivityCard";  // PR H8
import HoraryTimingWindowCard from "../components/HoraryTimingWindowCard";  // PR H9
import HoraryReasoningTrace from "../components/HoraryReasoningTrace";  // PR H10
import { PLANET_COLORS } from "../components/constants";
// PR R1-hotfix lesson — SouthIndianChart in page.tsx is an alias for the
// modern RasiChart (not the legacy 56-line file). Reproduce the alias.
import RasiChart from "../components/RasiChart";
const SouthIndianChart = RasiChart;

interface ToastShape { msg: string; tone?: "error" | "info" }

interface HoraryTabProps {
  // Workspace + shared
  workspaceData: any;
  setToast: (t: ToastShape | null) => void;
  liveLoc: any;
  apiUrl: string;
  // Horary-specific state (all in parent)
  horaryNumber: number | "";
  setHoraryNumber: Dispatch<SetStateAction<number | "">>;
  horaryDiceSpin: boolean;
  setHoraryDiceSpin: Dispatch<SetStateAction<boolean>>;
  horaryDigitEditing: boolean;
  setHoraryDigitEditing: Dispatch<SetStateAction<boolean>>;
  horaryDigitDraft: string;
  setHoraryDigitDraft: Dispatch<SetStateAction<string>>;
  horaryRollRef: RefObject<ReturnType<typeof setInterval> | null>;
  horaryQuestion: string;
  setHoraryQuestion: Dispatch<SetStateAction<string>>;
  horaryTopic: string;
  setHoraryTopic: Dispatch<SetStateAction<string>>;
  horaryResult: any;
  setHoraryResult: Dispatch<SetStateAction<any>>;
  horaryLoading: boolean;
  setHoraryLoading: Dispatch<SetStateAction<boolean>>;
}

export function HoraryTab({
  workspaceData,
  setToast,
  liveLoc,
  apiUrl,
  horaryNumber,
  setHoraryNumber,
  horaryDiceSpin,
  setHoraryDiceSpin,
  horaryDigitEditing,
  setHoraryDigitEditing,
  horaryDigitDraft,
  setHoraryDigitDraft,
  horaryRollRef,
  horaryQuestion,
  setHoraryQuestion,
  horaryTopic,
  setHoraryTopic,
  horaryResult,
  setHoraryResult,
  horaryLoading,
  setHoraryLoading,
}: HoraryTabProps) {
  const { t, lang } = useLanguage();
  // Legacy alias for the API_URL constant (called `API_URL` in pre-R5 page.tsx)
  const API_URL = apiUrl;
  return (
      <div className="tab-content">
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>

          {/* Phase 15.2 — Track A serif PageHero (Horary tab) */}
          {!horaryResult && (
            <>
            <PageHero
              eyebrow={t("Krishnamurti Paddhati · 1–249", "కృష్ణమూర్తి పద్ధతి · 1–249")}
              title={t("Horary · Prashna", "హోరరీ · ప్రశ్న")}
              subcopy={t(
                "Ask a question, pick a number between 1 and 249, get a YES/NO verdict based on Lagna Sub-Lord + topic cusp CSL + Ruling Planets confirmation.",
                "ఒక ప్రశ్న అడగండి, 1–249 మధ్య సంఖ్య ఎంచుకోండి. లగ్న సబ్‌లార్డ్ + భావ CSL + నియమిత గ్రహాలతో YES/NO నిర్ణయం పొందండి."
              )}
              bottomGap={12}
            />
            <FadeIn delay={0.5} distance="small" duration="base">
              <div style={{ marginTop: 0, marginBottom: 16 }}>
                <LiveLocationPill
                  location={liveLoc.location}
                  status={liveLoc.status}
                  error={liveLoc.error}
                  onOverride={liveLoc.override}
                  onRefresh={liveLoc.refresh}
                />
              </div>
            </FadeIn>
            </>
          )}

          {!horaryResult ? (
            <>
              {/* Hero question card */}
              <div className="celestial-glass celestial-panel" style={{ border: "1px solid rgba(212, 175, 55, 0.25)", borderRadius: 14, padding: "20px 20px 16px", position: "relative" as const, overflow: "hidden" }}>
                <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, rgba(201,169,110,0.4), transparent)" }} />
                <div className="celestial-serif" style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={12} strokeWidth={1.8} />
                  {t("Your question", "మీ ప్రశ్న")}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, lineHeight: 1.6 }}>
                  {t(
                    "Hold a question in mind — job, marriage, property, health — anything. Then say the number between 1–249 that comes to you.",
                    "మనసులో ఒక ప్రశ్న పెట్టుకొండి — ఉద్యోగం, వివాహం, ఆస్తి, ఆరోగ్యం — ఏదైనా. తర్వాత 1-249 మధ్య మెదిలిన సంఖ్య చెప్పండి."
                  )}
                </div>
                <textarea
                  placeholder={t(
                    "Will I get this job?\nWhen will I get married?\nShould I start this business?\nWill my health improve?",
                    "ఈ ఉద్యోగం దొరుకుతుందా?\nవివాహం ఎప్పుడు అవుతుంది?\nఈ వ్యాపారం ప్రారంభించాలా?\nఆరోగ్యం మెరుగుపడుతుందా?"
                  )}
                  value={horaryQuestion}
                  onChange={e => setHoraryQuestion(e.target.value)}
                  rows={5}
                  style={{ width: "100%", padding: "12px 14px", background: "var(--card)", border: `1px solid ${horaryQuestion.trim() ? "rgba(201,169,110,0.4)" : "var(--border2)"}`, borderRadius: 8, color: "var(--fg)", fontSize: 13, fontFamily: "inherit", resize: "none" as const, outline: "none", lineHeight: 1.55, boxSizing: "border-box" as const, transition: "border-color 0.2s" }}
                />
                {/* Topic chips — lucide icons + en/te labels.
                    PR H6 — expanded from 10 to 20 with high-frequency additions
                    (business, divorce, second_marriage, vehicle, foreign_settle,
                    visa, mental_health, longevity, addiction, missing_person).
                    Backend resolves all 48 canonical topics + 245 aliases — these
                    are the curated common-use shortcuts. */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginTop: 10 }}>
                  {[
                    { id: "general",        Icon: Globe,        en: "General",        te: "సాధారణ" },
                    { id: "marriage",       Icon: HandHeart,    en: "Marriage",       te: "వివాహం" },
                    { id: "second_marriage",Icon: HandHeart,    en: "2nd marriage",   te: "రెండవ వివాహం" },
                    { id: "divorce",        Icon: XCircle,      en: "Divorce",        te: "విడాకులు" },
                    { id: "children",       Icon: Baby,         en: "Children",       te: "సంతానం" },
                    { id: "career",         Icon: Briefcase,    en: "Career",         te: "ఉద్యోగం" },
                    { id: "business",       Icon: Sparkles,     en: "Business",       te: "వ్యాపారం" },
                    { id: "finance",        Icon: Wallet,       en: "Finance",        te: "ధనం" },
                    { id: "health",         Icon: HeartPulse,   en: "Health",         te: "ఆరోగ్యం" },
                    { id: "mental_health",  Icon: HeartPulse,   en: "Mental health",  te: "మానసిక ఆరోగ్యం" },
                    { id: "longevity",      Icon: HeartPulse,   en: "Longevity",      te: "ఆయుర్దాయం" },
                    { id: "property",       Icon: HomeIcon,     en: "Property",       te: "ఆస్తి" },
                    { id: "vehicle",        Icon: HomeIcon,     en: "Vehicle",        te: "వాహనం" },
                    { id: "travel",         Icon: Plane,        en: "Travel",         te: "ప్రయాణం" },
                    { id: "foreign_settle", Icon: Plane,        en: "Foreign settle", te: "విదేశ నివాసం" },
                    { id: "visa",           Icon: Plane,        en: "Visa",           te: "వీసా" },
                    { id: "education",      Icon: BookOpen,     en: "Education",      te: "విద్య" },
                    { id: "legal",          Icon: Scale,        en: "Legal",          te: "న్యాయం" },
                    { id: "missing_person", Icon: HelpCircle,   en: "Missing person", te: "కనిపించడం లేదు" },
                    { id: "spirituality",   Icon: Sparkles,     en: "Spirituality",   te: "ఆధ్యాత్మికత" },
                  ].map(item => {
                    const active = horaryTopic === item.id;
                    const label = lang === "en" ? item.en : item.te;
                    const ChipIcon = item.Icon;
                    return (
                      <button key={item.id} onClick={() => setHoraryTopic(item.id)}
                        style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontFamily: "inherit", cursor: "pointer", background: active ? "rgba(201,169,110,0.15)" : "var(--card)", color: active ? "var(--accent)" : "var(--muted)", border: active ? "0.5px solid rgba(201,169,110,0.4)" : "0.5px solid var(--border2)", transition: "all 0.15s", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <ChipIcon size={12} strokeWidth={1.8} />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Number picker card — the ritual moment.
                  Big serif digit with breathing gold glow, radial halo
                  behind it, Random rolls an animated counter, steppers
                  are circular and feel tactile. */}
              <div className="celestial-glass celestial-panel" style={{ border: "1px solid rgba(212, 175, 55, 0.2)", borderRadius: 14, padding: "28px 24px", textAlign: "center" as const }}>
                <div className="celestial-serif" style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, fontWeight: 600 }}>
                  {t("Pick a number", "సంఖ్య ఎంచుకోండి")}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 24, maxWidth: 380, margin: "0 auto 24px" }}>
                  {t("Close your eyes and let the first number between 1 and 249 come.", "కళ్ళు మూసుకొని మనసులో మెదిలిన సంఖ్య — 1 నుండి 249")}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 20, justifyContent: "center", marginBottom: 22 }}>
                  <button
                    aria-label="Decrement"
                    className="horary-step-btn"
                    onClick={() => setHoraryNumber(n => typeof n === "number" ? Math.max(1, n - 1) : 1)}
                  >−</button>

                  {/* PR A1.1b — click to type a specific number. Digit,
                      input, and slider all edit the same horaryNumber. */}
                  <div
                    style={{ position: "relative" as const, display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 180, padding: "8px 24px", cursor: "text" }}
                    onClick={() => {
                      if (horaryDigitEditing) return;
                      setHoraryDigitDraft(typeof horaryNumber === "number" ? String(horaryNumber) : "");
                      setHoraryDigitEditing(true);
                    }}
                    title={t("Click to type a number (1–249)", "సంఖ్య టైప్ చేయడానికి క్లిక్ చేయండి")}
                  >
                    <span className="horary-digit-halo" />
                    {horaryDigitEditing ? (
                      <input
                        autoFocus
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={horaryDigitDraft}
                        maxLength={3}
                        onChange={e => setHoraryDigitDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
                        onBlur={() => {
                          const n = parseInt(horaryDigitDraft, 10);
                          if (!isNaN(n) && n >= 1 && n <= 249) setHoraryNumber(n);
                          setHoraryDigitEditing(false);
                          setHoraryDigitDraft("");
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          if (e.key === "Escape") { setHoraryDigitEditing(false); setHoraryDigitDraft(""); }
                        }}
                        className="horary-digit"
                        style={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          textAlign: "center",
                          width: "100%",
                          minWidth: 140,
                          fontFamily: "inherit",
                          caretColor: "var(--accent)",
                        }}
                      />
                    ) : (
                      <span className="horary-digit">
                        {horaryNumber === "" ? "?" : horaryNumber}
                      </span>
                    )}
                  </div>

                  <button
                    aria-label="Increment"
                    className="horary-step-btn"
                    onClick={() => setHoraryNumber(n => typeof n === "number" ? Math.min(249, n + 1) : 1)}
                  >+</button>
                </div>

                {/* PR A1.1b — real draggable slider (was decorative).
                    Phase 4 / PR 12 (#23) — when no number is picked
                    the digit shows "?" but the slider used to park
                    at 1, which read as "1 selected". Park the thumb
                    at the midpoint (125) and dim it so the un-set
                    state is visually consistent with the "?" digit. */}
                <div className="horary-slider-row">
                  <span className="horary-slider-end">1</span>
                  <input
                    type="range"
                    min={1}
                    max={249}
                    step={1}
                    value={typeof horaryNumber === "number" ? horaryNumber : 125}
                    onChange={e => setHoraryNumber(parseInt(e.target.value, 10))}
                    className="horary-slider"
                    aria-label={t("Prashna number slider", "ప్రశ్న సంఖ్య స్లైడర్")}
                    style={{ opacity: typeof horaryNumber === "number" ? 1 : 0.45 }}
                  />
                  <span className="horary-slider-end">249</span>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" as const }}>
                  <button
                    onClick={() => {
                      // Animated counter roll — sweeps through ~8
                      // intermediate values over ~520ms, landing on
                      // the final random pick. Feels like a dignified
                      // tumbler, not a slot machine.
                      if (horaryRollRef.current) clearInterval(horaryRollRef.current);
                      setHoraryDiceSpin(true);
                      const finalN = Math.floor(Math.random() * 249) + 1;
                      let tick = 0;
                      const steps = 8;
                      horaryRollRef.current = setInterval(() => {
                        tick += 1;
                        if (tick >= steps) {
                          if (horaryRollRef.current) clearInterval(horaryRollRef.current);
                          horaryRollRef.current = null;
                          try {
                            if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
                              navigator.vibrate([12, 35, 12]);
                            }
                          } catch { /* ignore */ }
                          setHoraryNumber(finalN);
                          setTimeout(() => setHoraryDiceSpin(false), 200);
                          return;
                        }
                        try {
                          if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
                            navigator.vibrate(8);
                          }
                        } catch { /* ignore */ }
                        setHoraryNumber(Math.floor(Math.random() * 249) + 1);
                      }, 65);
                    }}
                    style={{ padding: "8px 18px", background: "var(--card)", border: "0.5px solid var(--border2)", borderRadius: 999, color: "var(--text)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, transition: "border-color 140ms, background 140ms" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,169,110,0.45)"; e.currentTarget.style.background = "rgba(201,169,110,0.06)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.background = "var(--card)"; }}
                  >
                    <Dices size={14} strokeWidth={1.8} className={horaryDiceSpin ? "horary-dice-spin" : undefined} />
                    {t("Random", "యాదృచ్ఛిక")}
                  </button>

                  <button
                    onClick={async () => {
                      if (!horaryNumber || !horaryQuestion.trim()) return;
                      // PR A1.1 — Horary RPs use the astrologer's
                      // LIVE location, not natal. Refuse to submit
                      // if we don't yet have one.
                      if (!liveLoc.location) {
                        // PR A1.3-fix-25 — was alert(), now toast
                        setToast({
                          msg: t(
                            "Need your current location for KP Ruling Planets. Enable geolocation or pick a city in the Location pill above.",
                            "KP నియమ గ్రహాల కోసం మీ ప్రస్తుత ప్రదేశం అవసరం. దయచేసి లొకేషన్ అనుమతించండి లేదా పైన మీ నగరం ఎంచుకోండి."
                          ),
                          tone: "error",
                        });
                        return;
                      }
                      setHoraryLoading(true);
                      // Enforce a minimum 650ms loading state so the
                      // reveal has a moment — an instant flip from
                      // form to verdict feels like a page refresh,
                      // not an oracle.
                      const startedAt = Date.now();
                      try {
                        const res = await axios.post(`${API_URL}/horary/analyze`, {
                          number: horaryNumber,
                          question: horaryQuestion,
                          topic: horaryTopic,
                          latitude: liveLoc.location.latitude,
                          longitude: liveLoc.location.longitude,
                          timezone_offset: liveLoc.location.timezone_offset,
                        });
                        const elapsed = Date.now() - startedAt;
                        if (elapsed < 650) {
                          await new Promise(r => setTimeout(r, 650 - elapsed));
                        }
                        setHoraryResult(res.data);
                      } catch (err: any) {
                        // PR A1.3-fix-25 — was silently swallowing
                        // errors with setHoraryResult(null), leaving
                        // the user staring at a re-enabled button
                        // with no message. Now surfaces a toast.
                        setHoraryResult(null);
                        const status = err?.response?.status;
                        setToast({
                          msg: status === 429
                            ? t("Too many requests — please wait a moment.", "చాలా అభ్యర్థనలు — దయచేసి కొంచెం వేచి ఉండండి.")
                            : status === 422
                            ? t("Input couldn't be processed. Please check your question.", "ఇన్‌పుట్ ప్రాసెస్ చేయలేకపోయాము. మీ ప్రశ్నను తనిఖీ చేయండి.")
                            : t("Could not compute the horary verdict. Please try again.", "హోరారీ వెర్డిక్ట్ లెక్కించలేకపోయాము. మళ్లీ ప్రయత్నించండి."),
                          tone: "error",
                        });
                      }
                      setHoraryLoading(false);
                    }}
                    disabled={!horaryNumber || !horaryQuestion.trim() || horaryLoading}
                    style={{
                      padding: "10px 26px",
                      background: (!horaryNumber || !horaryQuestion.trim())
                        ? "rgba(201,169,110,0.15)"
                        : "var(--accent)",
                      border: (!horaryNumber || !horaryQuestion.trim())
                        ? "0.5px solid rgba(201,169,110,0.3)"
                        : "0.5px solid var(--accent)",
                      borderRadius: 999,
                      color: (!horaryNumber || !horaryQuestion.trim()) ? "rgba(201,169,110,0.6)" : "#09090f",
                      fontSize: 13,
                      cursor: (!horaryNumber || !horaryQuestion.trim() || horaryLoading) ? "default" : "pointer",
                      fontFamily: "inherit",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      display: "inline-flex", alignItems: "center", gap: 8,
                      transition: "background 140ms, color 140ms",
                      boxShadow: (!horaryNumber || !horaryQuestion.trim())
                        ? "none"
                        : "0 4px 20px -6px rgba(201,169,110,0.5)",
                    }}
                  >
                    {horaryLoading ? (
                      <>
                        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                        {t("Computing…", "లెక్కిస్తోంది…")}
                      </>
                    ) : (
                      <>
                        <Wand2 size={14} strokeWidth={1.8} />
                        {t("Compute verdict", "ఫలితం చూడు")}
                      </>
                    )}
                  </button>
                </div>

                {(!horaryNumber || !horaryQuestion.trim()) && !horaryLoading && (
                  <div style={{ marginTop: 14, fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                    {!horaryQuestion.trim()
                      ? t("Type a question first", "మొదట ప్రశ్న టైప్ చేయండి")
                      : t("Pick or roll a number", "సంఖ్య ఎంచుకోండి లేదా రోల్ చేయండి")}
                  </div>
                )}
              </div>

              {/* How KP Horary works — explainer card (ported from developv2) */}
              <div className="celestial-glass celestial-panel" style={{ border: "1px solid rgba(212, 175, 55, 0.15)", borderRadius: 14, padding: "18px 20px" }}>
                <div className="celestial-serif" style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8, fontWeight: 600 }}>
                  {t("How KP Horary works", "KP హోరరీ ఎలా㴌నిచేస్తుంది")}
                </div>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, opacity: 0.88 }}>
                  {t(
                    "The chosen number (1–249) maps to a Lagna Sub-Lord. Layer 1 checks whether the Lagna CSL is fruitful. Layer 2 checks whether the topic cusp CSL (e.g. H7 for marriage) signifies favorable houses. Layer 3 confirms with Ruling Planets at query time. All three aligning = a strong YES.",
                    "ఎంచుకున్న సంఖ్య (1–249) ఒక లగ్న సబ్‌లార్డ్‌కి మ్యాప్ అవుతుంది. Layer 1 లగ్న CSL ఫలప్రదమా అని తనిఖీ చేస్తుంది. Layer 2 భావ CSL (ఉదా. వివాహం కోసం H7) అనుకూల భావాలను సూచిస్తుందా చూస్తుంది. Layer 3 ప్రశ్న సమయంలో నియమిత గ్రహాలతో నిర్ధారిస్తుంది. మూడూ అనుకూలంగా ఉంటే బలమైన YES."
                  )}
                </div>
              </div>
            </>
          ) : (() => {
            const r = horaryResult;
            const v = r.verdict || {};
            const verdictColor = v.verdict === "YES" ? "#34d399" : v.verdict === "NO" ? "#f87171" : "#fbbf24";
            const VerdictIcon = v.verdict === "YES" ? CheckCircle2 : v.verdict === "NO" ? XCircle : HelpCircle;
            const confColor = v.confidence === "HIGH" ? "#34d399" : v.confidence === "MEDIUM" ? "#fbbf24" : "#888899";
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Back */}
                <button onClick={() => { setHoraryResult(null); setHoraryNumber(""); setHoraryQuestion(""); }}
                  style={{ alignSelf: "flex-start", padding: "5px 12px", background: "none", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  ← {t("New question", "కొత్త ప్రశ్న")}
                </button>

                {/* Question recap */}
                <div className="celestial-mono" style={{ padding: "10px 14px", background: "rgba(201,169,110,0.06)", border: "0.5px solid rgba(201,169,110,0.2)", borderRadius: 8, fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                  "{horaryQuestion}" <span className="celestial-serif" style={{ color: "var(--accent)", fontStyle: "normal" }}>#{r.prashna_number}</span>
                </div>

                {/* PR H1 — Query validity (KSK 5°–25° lagna degree rule). Surfaces
                    the structural-readiness caveat BEFORE the verdict hero so the
                    astrologer weighs ripened/premature/expired status first. */}
                <HoraryValidityCard validity={r.lagna_validity} />

                {/* PR H7 — Bhavat Bhavam relative-detection. When question is
                    about a relative (mother/father/spouse/child/sibling/in-law/
                    boss), engine rotates topic houses via house-from-house.
                    This card tells the astrologer the translation happened. */}
                <HoraryBhavatBhavamCard ctx={r.bhavat_bhavam} />

                {/* PR H8 — Sensitivity tier protective framing. Renders for
                    Tier 2 (life-impact) and Tier 3 (life-or-death) topics —
                    or auto-escalates to Tier 3 when question contains keywords
                    like 'cancer', 'suicide', 'jail', etc. Includes crisis
                    resources for mental-health Tier 3 cases. */}
                <HorarySensitivityCard sensitivity={r.sensitivity} />

                {/* Verdict hero — serif word, fade+scale entrance, radial glow.
                    This is the moment of the whole tab. */}
                <div
                  className="horary-verdict-card celestial-glass celestial-panel"
                  style={{
                    textAlign: "center" as const,
                    padding: "36px 20px 28px",
                    background: `radial-gradient(ellipse at 50% 0%, ${verdictColor}18 0%, rgba(20,20,30,0.6) 80%), rgba(10,10,15,0.4)`,
                    border: `1px solid rgba(212, 175, 55, 0.35)`,
                    borderRadius: 16,
                    position: "relative" as const,
                    boxShadow: `0 30px 60px -30px ${verdictColor}30, 0 0 12px 2px rgba(212,175,55,0.08)`,
                    overflow: "hidden" as const,
                  }}
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 20, lineHeight: 1 }}>
                    <VerdictIcon size={52} strokeWidth={1.6} color={verdictColor} />
                    <div
                      className="horary-verdict-word celestial-serif"
                      style={{
                        color: verdictColor,
                        textShadow: `0 0 48px ${verdictColor}60, 0 0 96px ${verdictColor}30`,
                        fontSize: "3.5rem",
                        fontWeight: "bold",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {v.verdict || "MAYBE"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16, marginBottom: 12, flexWrap: "wrap" as const }}>
                    <span style={{ fontSize: 13, color: confColor, fontWeight: 700, letterSpacing: "0.1em" }}>
                      {v.confidence === "HIGH" ? "●●●" : v.confidence === "MEDIUM" ? "●●○" : "●○○"}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, fontWeight: 500 }}>
                      {v.confidence || "LOW"} {t("CONFIDENCE", "విశ్వాసం")}
                    </span>
                    {/* PR H3 — numeric confidence 0–100 (engine-computed, audit trail
                        available in verdict.confidence_breakdown). Brings horary
                        into parity with Analysis tab's engine_confidence. */}
                    {typeof v.confidence_score === "number" && (
                      <span
                        title={t("Engine confidence (0–100) — open the reasoning panel for the breakdown",
                                 "ఇంజిన్ విశ్వాసం (0–100)")}
                        style={{
                          fontSize: 12,
                          color: confColor,
                          fontWeight: 700,
                          padding: "2px 10px",
                          borderRadius: 999,
                          background: `${confColor}18`,
                          border: `0.5px solid ${confColor}44`,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {v.confidence_score}/100
                      </span>
                    )}
                  </div>
                  {/* Confidence → separator → Ruling Planets (with subhead) →
                      flags → Reasoning. Each block gets its own visual tier so
                      the hierarchy reads at a glance. */}
                  {v.ruling_planets?.length > 0 && (
                    <div style={{ marginTop: 6, marginBottom: 10, paddingTop: 12, borderTop: `0.5px solid ${verdictColor}20` }}>
                      <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.14em", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 8 }}>
                        {t("Ruling planets · supporting the query", "నియమిత గ్రహాలు · ప్రశ్నకు అనుకూలం")}
                      </div>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" as const }}>
                        {v.ruling_planets.map((rp: string) => {
                          // PR A1.1c — strongest planets (2+ of 7 slots) get star + bold.
                          const strongest: string[] = r.rp_context?.strongest ?? [];
                          const freq = r.rp_context?.planet_slots?.[rp]?.length ?? 1;
                          const isStrong = strongest.includes(rp);
                          return (
                            <span
                              key={rp}
                              title={isStrong
                                ? `${rp} — ${freq}/7 slots · strongest RP for this moment`
                                : `${rp} — ${freq}/7 slots`}
                              style={{
                                fontSize: 11,
                                background: isStrong ? "rgba(201,169,110,0.22)" : "rgba(201,169,110,0.12)",
                                color: "var(--accent)",
                                border: isStrong
                                  ? "0.5px solid rgba(201,169,110,0.55)"
                                  : "0.5px solid rgba(201,169,110,0.3)",
                                borderRadius: 999,
                                padding: "4px 12px",
                                fontWeight: isStrong ? 700 : 500,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              {isStrong && <span style={{ color: "var(--accent)" }}>★</span>}
                              {rp}
                              <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}>{freq}/7</span>
                            </span>
                          );
                        })}
                      </div>
                      {/* PR A1.1 — muted strip showing WHICH location + moment produced these RPs.
                          PR A1.13 — mode prop tells the astrologer at a glance which RP-frame these are.
                          Live = astrologer's geolocation resolved successfully.
                          Fallback = live request failed/denied → using natal-loc as fallback. */}
                      {r.rp_context && (
                        <div style={{ maxWidth: 560, margin: "8px auto 0" }}>
                          <RPContextStrip
                            ctx={r.rp_context}
                            locationName={liveLoc.location?.display}
                            mode={liveLoc.status === "ready" ? "live" : "fallback"}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {(v.rp_confirms_csl || v.moon_supports) && (
                    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" as const, marginBottom: 6 }}>
                      {v.rp_confirms_csl && <span style={{ fontSize: 10, background: "rgba(52,211,153,0.15)", color: "#34d399", border: "0.5px solid rgba(52,211,153,0.3)", borderRadius: 4, padding: "3px 10px", letterSpacing: "0.04em" }}>RP ✓ CSL</span>}
                      {v.moon_supports && <span style={{ fontSize: 10, background: "rgba(52,211,153,0.15)", color: "#34d399", border: "0.5px solid rgba(52,211,153,0.3)", borderRadius: 4, padding: "3px 10px", letterSpacing: "0.04em" }}>Moon ✓</span>}
                    </div>
                  )}

                  {/* PR A1.1b — Topic chip + favorable/denial house
                      pills. Astrologer sees exactly which topic was
                      judged and which of its houses actually got hit
                      by the Layer-2 CSL's significations. */}
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `0.5px solid ${verdictColor}20`, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                    <span className="horary-topic-chip">
                      <span className="chip-label">{t("Topic", "విషయం")}</span>
                      <span style={{ textTransform: "capitalize" as const }}>
                        {(r.resolved_topic ?? r.topic ?? "general").replace(/_/g, " ")}
                      </span>
                      {/* PR H6 — show alias resolution if topic was remapped */}
                      {r.topic_was_aliased && (
                        <span className="chip-label" style={{ opacity: 0.7, fontStyle: "italic" }}>
                          ({t("from", "నుండి")} "{r.topic}")
                        </span>
                      )}
                      <span className="chip-label">· H{r.primary_house}</span>
                    </span>
                    {(v.yes_houses && v.yes_houses.length > 0) && (() => {
                      const hitYes = new Set<number>(v.yes_houses_activated || []);
                      const hitNo  = new Set<number>(v.no_houses_activated || []);
                      return (
                        <>
                          <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.14em", textTransform: "uppercase" as const, fontWeight: 600 }}>
                            {t("Favorable houses · hit / missed", "అనుకూల భావాలు · సాధించినవి / మిస్ అయినవి")}
                          </div>
                          <div className="horary-house-strip">
                            {v.yes_houses.map((h: number) => (
                              <span key={`yh-${h}`} className={`horary-house-pill ${hitYes.has(h) ? "is-hit" : "is-missed"}`}>
                                H{h} {hitYes.has(h) ? "✓" : "·"}
                              </span>
                            ))}
                          </div>
                          {hitNo.size > 0 && (
                            <>
                              <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.14em", textTransform: "uppercase" as const, fontWeight: 600, marginTop: 4 }}>
                                {t("Denial houses · activated", "నిరాకరణ భావాలు · క్రియాశీలం")}
                              </div>
                              <div className="horary-house-strip">
                                {Array.from(hitNo).sort((a, b) => a - b).map(h => (
                                  <span key={`nh-${h}`} className="horary-house-pill is-denial-hit">H{h}</span>
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  {(v.verdict_reason || v.explanation) && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `0.5px solid ${verdictColor}20`, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
                      <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.14em", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 6 }}>
                        {t("Reasoning", "తర్కం")}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.65 }}>
                        {v.verdict_reason || v.explanation}
                      </div>
                    </div>
                  )}

                  {/* PR H4 — Canonical KP patterns (T1/T2/T3/D2 from
                      pattern_library.md). Gold chips for positive timing
                      patterns; amber for D2 friction. Tooltip on each chip
                      shows the full evidence trail. */}
                  <HoraryPatternChips patterns={r.patterns_fired} />

                  {/* PR H5 — Star-Sub Harmony layered reading (KSK strict).
                      Splits primary CSL signification into STAR vs SUB layer.
                      HARMONY/ALIGNED/CONTRA/TENSION/DENIED verdict tells the
                      astrologer WHICH layer carries the yes signal (vs the
                      naive UNION reading that hides layer attribution). */}
                  {v.star_sub_harmony && v.star_sub_harmony.harmony !== "NEUTRAL" && (() => {
                    const ssh = v.star_sub_harmony;
                    const harmony = ssh.harmony as string;
                    const harmonyColor =
                      harmony === "HARMONY" ? "#34d399" :
                      harmony === "ALIGNED" ? "#34d399" :
                      harmony === "CONTRA"  ? "#fbbf24" :
                      harmony === "TENSION" ? "#f87171" :
                      harmony === "DENIED"  ? "#f87171" :
                      "var(--muted)";
                    const harmonySymbol =
                      harmony === "HARMONY" ? "++" :
                      harmony === "ALIGNED" ? "+"  :
                      harmony === "CONTRA"  ? "±"  :
                      harmony === "TENSION" ? "−"  :
                      harmony === "DENIED"  ? "−−" : "·";
                    return (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${verdictColor}20`, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
                        <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.14em", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 8, textAlign: "center" as const }}>
                          {t("Star ↔ Sub harmony (KSK strict)", "నక్షత్రం ↔ సబ్ సమన్వయం")}
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <span style={{
                            padding: "3px 12px",
                            background: `${harmonyColor}18`,
                            border: `0.5px solid ${harmonyColor}55`,
                            borderRadius: 999,
                            color: harmonyColor,
                            fontWeight: 700,
                            fontSize: 12,
                            letterSpacing: "0.06em",
                          }}>
                            {harmonySymbol} {harmony}
                          </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8, fontSize: 11 }}>
                          <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "0.5px solid var(--border2)" }}>
                            <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 3 }}>
                              {t("STAR layer", "నక్షత్ర స్థాయి")} · {ssh.star_lord}
                            </div>
                            <div style={{ color: "var(--text)" }}>
                              {(ssh.star_relevant || []).length > 0 && (
                                <span style={{ color: "#34d399" }}>{(ssh.star_relevant || []).map((h: number) => `H${h}`).join(", ")} ✓ </span>
                              )}
                              {(ssh.star_denial || []).length > 0 && (
                                <span style={{ color: "#f87171" }}>{(ssh.star_denial || []).map((h: number) => `H${h}`).join(", ")} ✗</span>
                              )}
                              {(ssh.star_relevant || []).length === 0 && (ssh.star_denial || []).length === 0 && (
                                <span style={{ color: "var(--muted)" }}>{t("no topic hit", "టాపిక్ హిట్ లేదు")}</span>
                              )}
                            </div>
                          </div>
                          <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "0.5px solid var(--border2)" }}>
                            <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 3 }}>
                              {t("SUB layer · deciding", "సబ్ స్థాయి · నిర్ణయం")} · {ssh.sub_lord}
                            </div>
                            <div style={{ color: "var(--text)" }}>
                              {(ssh.sub_relevant || []).length > 0 && (
                                <span style={{ color: "#34d399" }}>{(ssh.sub_relevant || []).map((h: number) => `H${h}`).join(", ")} ✓ </span>
                              )}
                              {(ssh.sub_denial || []).length > 0 && (
                                <span style={{ color: "#f87171" }}>{(ssh.sub_denial || []).map((h: number) => `H${h}`).join(", ")} ✗</span>
                              )}
                              {(ssh.sub_relevant || []).length === 0 && (ssh.sub_denial || []).length === 0 && (
                                <span style={{ color: "var(--muted)" }}>{t("no topic hit", "టాపిక్ హిట్ లేదు")}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {ssh.note && (
                          <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", fontStyle: "italic", textAlign: "center" as const, lineHeight: 1.5 }}>
                            {ssh.note}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* PR H9 — Fires-between-X-and-Y timing window card.
                    Crosses horary RPs with native dashas to synthesize a single
                    date range. Appears right after the verdict so the astrologer
                    immediately sees WHEN (the natural follow-up to YES/NO). */}
                <HoraryTimingWindowCard
                  rulingPlanets={r.ruling_planets ?? []}
                  rpSignifyingYes={v.rp_signifying_yes ?? []}
                  antardashas={workspaceData?.antardashas ?? []}
                  pratyantardashas={workspaceData?.pratyantardashas ?? []}
                />

                {/* 3-Layer Analysis — visual journey.
                    Three cards laid out horizontally (stack on mobile via CSS),
                    linked by animated connector lines. Each card has a pass/fail
                    border tint so the logical flow is visible at a glance. */}
                <div>
                  <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10, fontWeight: 600, textAlign: "center" as const }}>
                    {t("3-layer KP journey", "3-స్థాయి KP ప్రయాణం")}
                  </div>
                  {/* PR A1.1e — when the Prashna Lagna CSL equals the primary-house CSL,
                      Layer 1 and Layer 2 necessarily show identical data. Flag this so the
                      astrologer doesn't mistake the visual repeat for a display glitch. */}
                  {v.lagna_csl && v.query_csl && v.lagna_csl === v.query_csl && (
                    <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" as const, marginBottom: 10, fontStyle: "italic" as const, maxWidth: 520, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
                      {t(
                        `Note: the Lagna CSL and the H${r.primary_house} CSL are the same planet (${v.lagna_csl}). Layers 1 and 2 display identical data for this chart.`,
                        `గమనిక: లగ్న CSL మరియు H${r.primary_house} CSL ఒకే గ్రహం (${v.lagna_csl}). ఈ చార్ట్‌లో లేయర్ 1 మరియు 2 ఒకే డేటాను చూపిస్తాయి.`
                      )}
                    </div>
                  )}
                  {(() => {
                    const layer1Pass = !!v.lagna_fruitful;
                    const layer2Pass = (v.h2_supports || v.h11_supports) || (v.query_csl_significations || []).length > 0;
                    const layer3Pass = (v.rp_signifying_yes || []).length > 0 || v.rp_confirms_csl;
                    const stepColor = (pass: boolean) => pass ? "#34d399" : "#f87171";
                    const stepBg    = (pass: boolean) => pass ? "rgba(52,211,153,0.05)" : "rgba(248,113,113,0.04)";
                    const stepBorder = (pass: boolean) => pass ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.25)";

                    const steps = [
                      {
                        num: "1",
                        Icon: Sparkles,
                        pass: layer1Pass,
                        label: t("Lagna CSL", "లగ్న CSL"),
                        sub:   t("Is the question fruitful?", "ప్రశ్న ఫలప్రదమా?"),
                        body: (
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: "var(--accent)", fontWeight: 600 }}>{v.lagna_csl}</span>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                              {"→ H"}{(v.lagna_csl_significations || []).join(", H")}
                            </div>
                            <div style={{ marginTop: 6, color: stepColor(layer1Pass), fontSize: 11, fontWeight: 600 }}>
                              {layer1Pass ? `✓ ${t("Fruitful", "ఫలప్రదం")}` : `✗ ${t("Barren", "నిష్ఫలం")}`}
                            </div>
                          </div>
                        ),
                      },
                      {
                        num: "2",
                        Icon: HomeIcon,
                        pass: layer2Pass,
                        label: `H${v.query_house} CSL`,
                        sub:   t("The real decision", "నిజమైన నిర్ణయం"),
                        body: (
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: "var(--accent)", fontWeight: 600 }}>{v.query_csl}</span>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                              {"→ H"}{(v.query_csl_significations || []).join(", H")}
                            </div>
                            {/* PR A1.1b — H2/H11 "supporting gates".
                                Show BOTH states: supported (green) and
                                non-supporting (muted grey). A red cross
                                reads like an engine error; "gate" +
                                muted state clarifies it's informational. */}
                            <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                              <span
                                title={v.h2_supports
                                  ? t("H2 gate supports fulfillment", "H2 ద్వారం నెరవేర్పుకు మద్దతు")
                                  : t("H2 gate doesn't signify topic houses this time", "H2 ద్వారం ఈసారి లక్ష్య భావాలను సూచించదు")
                                }
                                style={{
                                  fontSize: 10,
                                  color: v.h2_supports ? "#34d399" : "var(--muted)",
                                  background: v.h2_supports ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.02)",
                                  border: v.h2_supports
                                    ? "0.5px solid rgba(52,211,153,0.25)"
                                    : "0.5px solid var(--border)",
                                  borderRadius: 4,
                                  padding: "1px 6px",
                                  opacity: v.h2_supports ? 1 : 0.65,
                                }}
                              >
                                H2 {t("gate", "ద్వారం")} {v.h2_supports ? "✓" : "·"}
                              </span>
                              <span
                                title={v.h11_supports
                                  ? t("H11 gate supports fulfillment", "H11 ద్వారం నెరవేర్పుకు మద్దతు")
                                  : t("H11 gate doesn't signify topic houses this time", "H11 ద్వారం ఈసారి లక్ష్య భావాలను సూచించదు")
                                }
                                style={{
                                  fontSize: 10,
                                  color: v.h11_supports ? "#34d399" : "var(--muted)",
                                  background: v.h11_supports ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.02)",
                                  border: v.h11_supports
                                    ? "0.5px solid rgba(52,211,153,0.25)"
                                    : "0.5px solid var(--border)",
                                  borderRadius: 4,
                                  padding: "1px 6px",
                                  opacity: v.h11_supports ? 1 : 0.65,
                                }}
                              >
                                H11 {t("gate", "ద్వారం")} {v.h11_supports ? "✓" : "·"}
                              </span>
                            </div>
                          </div>
                        ),
                      },
                      {
                        num: "3",
                        Icon: Target,
                        pass: layer3Pass,
                        label: t("Ruling planets", "నియమిత గ్రహాలు"),
                        sub:   t("Confirmation", "నిర్ధారణ"),
                        body: (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, marginTop: 2 }}>
                            {(v.ruling_planets || []).map((rp: string) => {
                              const ok = (v.rp_signifying_yes || []).includes(rp);
                              const isCsl = rp === v.query_csl;
                              return (
                                <span key={rp} style={{
                                  padding: "2px 8px", borderRadius: 999, fontSize: 11,
                                  background: ok ? "rgba(52,211,153,0.12)" : "var(--card)",
                                  color: ok ? "#34d399" : "var(--muted)",
                                  border: isCsl ? "0.5px solid var(--accent)" : "0.5px solid var(--border2)",
                                  fontWeight: ok ? 600 : 400,
                                }}>{rp}</span>
                              );
                            })}
                          </div>
                        ),
                      },
                    ];

                    return (
                      <div className="horary-journey" style={{ display: "flex", alignItems: "stretch", gap: 0, flexWrap: "nowrap" as const }}>
                        {steps.map((step, i) => {
                          const StepIcon = step.Icon;
                          return (
                            <React.Fragment key={step.num}>
                              <div
                                className="horary-layer"
                                data-step={step.num}
                                style={{
                                  flex: 1, minWidth: 0,
                                  padding: "14px 14px 16px",
                                  background: stepBg(step.pass),
                                  border: `1px solid ${stepBorder(step.pass)}`,
                                  borderRadius: 12,
                                  display: "flex", flexDirection: "column" as const,
                                  position: "relative" as const,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                  <div style={{
                                    width: 32, height: 32, borderRadius: "50%",
                                    background: `${stepColor(step.pass)}18`,
                                    border: `1px solid ${stepColor(step.pass)}50`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0,
                                    color: stepColor(step.pass),
                                  }}>
                                    <StepIcon size={15} strokeWidth={1.8} />
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, fontWeight: 600 }}>
                                      {t("Layer", "స్థాయి")} {step.num}
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)", marginTop: 1 }}>{step.label}</div>
                                  </div>
                                </div>
                                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8, fontStyle: "italic" }}>{step.sub}</div>
                                <div>{step.body}</div>
                              </div>
                              {i < steps.length - 1 && <div className="horary-connector" aria-hidden="true" />}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* PR A1.1e — compact chart identity strip.
                    Replaces the 6-cell fields grid (which duplicated info already
                    visible in the topic chip, "Who carries" accordion, and clinical
                    flags). One line, mono font, tuck under 3-layer journey. */}
                <div className="horary-identity-strip">
                  <span className="horary-identity-cell">
                    <span className="horary-identity-k">#</span>
                    <span className="horary-identity-v">{r.prashna_number}</span>
                  </span>
                  <span className="horary-identity-dot">·</span>
                  <span className="horary-identity-cell">
                    <span className="horary-identity-k">Lagna</span>
                    <span className="horary-identity-v">{r.lagna?.sign} {r.lagna?.longitude?.toFixed(2)}°</span>
                  </span>
                  <span className="horary-identity-dot">·</span>
                  <span className="horary-identity-cell">
                    <span className="horary-identity-k">Nak</span>
                    <span className="horary-identity-v">{r.lagna?.nakshatra}</span>
                  </span>
                  <span className="horary-identity-dot">·</span>
                  <span className="horary-identity-cell">
                    <span className="horary-identity-k">Star</span>
                    <span className="horary-identity-v" style={{ color: PLANET_COLORS[r.lagna?.star_lord] ?? "var(--accent)" }}>{r.lagna?.star_lord}</span>
                  </span>
                  <span className="horary-identity-dot">·</span>
                  <span className="horary-identity-cell">
                    <span className="horary-identity-k">Sub</span>
                    <span className="horary-identity-v" style={{ color: PLANET_COLORS[r.lagna?.sub_lord] ?? "var(--accent)", fontWeight: 600 }}>{r.lagna?.sub_lord}</span>
                  </span>
                </div>

                {/* PR A1.1e — removed the standalone "Who carries H{primary}?"
                    card. The 4-level accordion (below) defaults to the primary
                    house and shows the same information plus the ability to
                    check any other house. Eliminates duplicate display. */}

                {/* PR A1.1d — Clinical indicators strip (astrologer's 5-second scan) */}
                {Array.isArray(r.clinical_flags) && r.clinical_flags.length > 0 && (
                  <ClinicalFlagsStrip flags={r.clinical_flags} />
                )}

                {/* PR A1.1e — South Indian Prashna chart (visual).
                    Hotfix after the first A1.1e ship: SouthIndianChart reads
                    `p.degree_in_sign.toFixed(1)` / `p.planet_en` / `p.planet_short`
                    without optional chaining. Horary response uses a shorter shape
                    (planet / longitude / sign) so we adapt every field the chart
                    touches. Without this adapter the page throws
                    "Cannot read properties of undefined (reading 'toFixed')". */}
                {Array.isArray(r.planets) && Array.isArray(r.cusps) && r.cusps.length === 12 && (() => {
                  const adaptPlanet = (p: Record<string, unknown>) => {
                    const planetEn = String(p.planet ?? "");
                    const lon = typeof p.longitude === "number" ? p.longitude : 0;
                    return {
                      ...p,
                      planet_en: planetEn,
                      planet_short: planetEn.slice(0, 2),
                      degree_in_sign: lon % 30,
                      sign_en: p.sign,
                      nakshatra_en: p.nakshatra,
                      star_lord_en: p.star_lord,
                      sub_lord_en: p.sub_lord,
                      house: String(p.house ?? ""),
                    };
                  };
                  const adaptCusp = (c: Record<string, unknown>) => {
                    const lon = typeof c.longitude === "number" ? c.longitude : 0;
                    return {
                      ...c,
                      cusp_longitude: lon,
                      house_num: c.house,
                      sign_en: c.sign,
                      degree_in_sign: lon % 30,
                    };
                  };
                  return (
                    <div className="horary-chart-card">
                      <div className="horary-chart-head">
                        <div className="horary-chart-eyebrow">Prashna chart · South Indian</div>
                        <div className="horary-chart-sub">
                          Lagna at the chosen prashna number; houses laid out with the astrologer&apos;s lat/lon via Placidus.
                        </div>
                      </div>
                      <div className="horary-chart-wrap">
                        <SouthIndianChart
                          planets={r.planets.map(adaptPlanet)}
                          cusps={r.cusps.map(adaptCusp)}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* PR A1.1e — Sub-lord chains for Lagna / Moon / primary CSL */}
                <HorarySubLordChains
                  planets={r.planets ?? []}
                  lagna={r.lagna}
                  moon={r.moon_analysis}
                  primaryCsl={v.query_csl}
                  primaryHouse={r.primary_house}
                />

                {/* PR A1.1e — RP × Vimshottari dasha timing strip.
                    Joins the horary RPs with the native's dasha tree to surface
                    WHEN each RP is active in the querent's life. */}
                <HoraryRpDashaStrip
                  rulingPlanets={r.ruling_planets ?? []}
                  rpSignifyingYes={v.rp_signifying_yes ?? []}
                  dashas={workspaceData?.dashas ?? []}
                  antardashas={workspaceData?.antardashas ?? []}
                  pratyantardashas={workspaceData?.pratyantardashas ?? []}
                />

                {/* PR A1.1d — Moon analysis (chief significator of the mind) */}
                {r.moon_analysis && <HoraryMoonCard moon={r.moon_analysis} />}

                {/* PR A1.1d — 4-level significator accordion (any house lookup) */}
                {Array.isArray(r.planets) && (
                  <HoraryFourLevelAccordion
                    planets={r.planets}
                    rulingPlanets={r.ruling_planets ?? []}
                    defaultHouse={r.primary_house ?? 1}
                  />
                )}

                {/* PR A1.1d — Full 12-cusps CSL chain (collapsed by default) */}
                {Array.isArray(r.cusps) && r.cusps.length > 0 && (
                  <HoraryCuspsAccordion cusps={r.cusps} />
                )}

                {/* PR H10 — Full reasoning trace + astrologer notes + export.
                    Collapsible audit trail of every signal that produced the
                    verdict, plus a copy-paste-ready notes block and JSON
                    export so the astrologer can verify or archive the chart. */}
                <HoraryReasoningTrace result={r} />

                {/* Planet table — alternating rows + left accent for ruling planets */}
                <div style={{ overflowX: "auto" as const }}>
                  <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 6, fontWeight: 600 }}>
                    {t("Prashna chart planets", "ప్రశ్న కుండలి గ్రహాలు")}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: "var(--surface2)" }}>
                        {[
                          t("Planet", "గ్రహం"),
                          t("Sign", "రాశి"),
                          t("Nakshatra", "నక్షత్రం"),
                          t("Sub lord", "సబ్‌లార్డ్"),
                          t("House", "భావం"),
                          "H→",
                        ].map(h => (
                          <th key={h} style={{ textAlign: "left" as const, padding: "6px 8px", fontWeight: 600, fontSize: 10, color: "var(--accent)", letterSpacing: "0.06em", borderBottom: "0.5px solid var(--border2)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(r.planets || []).map((p: any, idx: number) => (
                        <tr key={p.planet} style={{ borderBottom: "0.5px solid rgba(255,255,255,0.04)", background: p.is_ruling_planet ? "rgba(201,169,110,0.05)" : idx % 2 === 0 ? "var(--card)" : "transparent", borderLeft: p.is_ruling_planet ? "2px solid rgba(201,169,110,0.6)" : "2px solid transparent" }}>
                          <td style={{ padding: "5px 8px", color: p.is_ruling_planet ? "var(--accent)" : "var(--fg)", fontWeight: p.is_ruling_planet ? 700 : 400 }}>
                            {p.planet}{p.retrograde && <span style={{ color: "#f87171", fontSize: 9, marginLeft: 3 }}>℞</span>}
                            {p.is_ruling_planet && <span style={{ background: "rgba(201,169,110,0.2)", color: "var(--accent)", fontSize: 8, marginLeft: 4, padding: "1px 4px", borderRadius: 3 }}>RP</span>}
                          </td>
                          <td style={{ padding: "5px 8px", color: "var(--muted)" }}>{p.sign}</td>
                          <td style={{ padding: "5px 8px", color: "var(--muted)" }}>{p.nakshatra}</td>
                          <td style={{ padding: "5px 8px", color: "var(--fg)" }}>{p.sub_lord}</td>
                          <td style={{ padding: "5px 8px", textAlign: "center" as const }}>
                            <span style={{ background: "rgba(201,169,110,0.15)", color: "var(--accent)", padding: "1px 6px", borderRadius: 8, fontSize: 10 }}>H{p.house}</span>
                          </td>
                          <td style={{ padding: "5px 8px", color: "var(--muted)", fontSize: 10 }}>{(p.significations || []).map((h: number) => `H${h}`).join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
  );
}
