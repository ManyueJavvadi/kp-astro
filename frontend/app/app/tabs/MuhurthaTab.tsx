// @ts-nocheck — PR R7 — same inferred-lambda-param suppression as MatchTab.
"use client";

/**
 * MuhurthaTab — auspicious-time finder workflow.
 *
 * PR R7 (Phase A foundation refactor) — extracted from page.tsx
 * (~1231 lines of JSX). Workflow tab with multi-step form +
 * results display + AI chat.
 *
 * State: 18+ muhurtha-specific vars stay in parent (multi-step form,
 * participants, AI chat, location search). Passed as one large props bag.
 *
 * Sacred-region check (per .claude/research/world-first-vision.md §15):
 *   - No AI prompts touched
 *   - /muhurtha endpoints preserved exactly
 *   - Pure frontend JSX extraction
 */

import React from "react";
import axios from "axios";
import {
  Sparkles, Target, Plus, Loader2, RefreshCw, Calendar, Clock,
  CheckCircle, TriangleAlert, ChevronDown, X, Globe, MapPin,
  HandHeart, Heart, Briefcase, Home as HomeIcon, Wallet, GraduationCap,
  Users, User, Plane, Scale, BookOpen, HeartPulse,
  Stethoscope, Car, Lock,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLanguage } from "@/lib/i18n";
import { PageHero } from "@/components/ui/PageHero";
import { PlacePicker } from "@/components/ui/place-picker";
import { PLANET_COLORS } from "../components/constants";
import MuhurthaReasoningTrace from "../components/MuhurthaReasoningTrace";  // PR Mu15
import { recordAiCall } from "@/lib/aiAudit";

interface MuhurthaTabProps {
  workspaceData: any;
  apiUrl: string;
  liveLoc: any;
  birthDetails: any;
  timezoneOffset: any;
  savedSessions: any;
  setSavedSessions: any;
  mEventLocSearching: any;
  // Multi-step form state (mStep, mEventType, mDateStart/End, mEventLoc*)
  mStep: any; setMStep: any;
  mEventType: any; setMEventType: any;
  mDateStart: any; setMDateStart: any;
  mDateEnd: any; setMDateEnd: any;
  mEventLoc: any; setMEventLoc: any;
  mEventLocMode: any; setMEventLocMode: any;
  mEventLocSugg: any; setMEventLocSugg: any;
  // Participants
  mParticipants: any; setMParticipants: any;
  mShowAddParticipant: any; setMShowAddParticipant: any;
  mNewP: any; setMNewP: any;
  mNewPPlaceSugg: any; setMNewPPlaceSugg: any;
  mNewPPlaceStatus: any; setMNewPPlaceStatus: any;
  // Results
  mLoading: any; setMLoading: any;
  mResults: any; setMResults: any;
  mSelectedDate: any; setMSelectedDate: any;
  mExpandedWindow: any; setMExpandedWindow: any;
  // AI chat
  mAiQuestion: any; setMAiQuestion: any;
  mAiMessages: any; setMAiMessages: any;
  mAiLoading: any; setMAiLoading: any;
  // Handlers
  handleMEventLocSearch: any;
  handleMNewPDateChange: any;
  handleMNewPTimeChange: any;
  snapshotCurrentSession: any;
  sessionToApiPerson: any;
}

export function MuhurthaTab(props: MuhurthaTabProps) {
  const { t, lang } = useLanguage();
  const {
    workspaceData, apiUrl, liveLoc, birthDetails, timezoneOffset,
    savedSessions, setSavedSessions, mEventLocSearching,
    mStep, setMStep, mEventType, setMEventType,
    mDateStart, setMDateStart, mDateEnd, setMDateEnd,
    mEventLoc, setMEventLoc, mEventLocMode, setMEventLocMode,
    mEventLocSugg, setMEventLocSugg,
    mParticipants, setMParticipants,
    mShowAddParticipant, setMShowAddParticipant,
    mNewP, setMNewP, mNewPPlaceSugg, setMNewPPlaceSugg,
    mNewPPlaceStatus, setMNewPPlaceStatus,
    mLoading, setMLoading, mResults, setMResults,
    mSelectedDate, setMSelectedDate,
    mExpandedWindow, setMExpandedWindow,
    mAiQuestion, setMAiQuestion, mAiMessages, setMAiMessages,
    mAiLoading, setMAiLoading,
    handleMEventLocSearch, handleMNewPDateChange,
    handleMNewPTimeChange,
    snapshotCurrentSession,
    sessionToApiPerson,
  } = props;
  const API_URL = apiUrl;

  // PR R3-PR2 — index of the currently-expanded soft-flagged window
  // (null = none). User-reported gap: BELOW THRESHOLD cards were
  // non-interactive; clicking did nothing. Now each card toggles
  // an inline detail panel showing the full confidence ledger +
  // evidence_payload + advanced doshas for transparency.
  const [softExpandedIdx, setSoftExpandedIdx] = React.useState<number | null>(null);
  return (
    <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 960 }}>
      {/* Phase 15.2 — Track A serif PageHero (Muhurtha tab) */}
      <PageHero
        eyebrow={t("Auspicious Timing", "శుభ ముహూర్తం")}
        title={t("Muhurtha finder", "ముహూర్తం కనుగొను")}
        subcopy={t(
          "Scans every 4 minutes of your date range. Scores each Lagna Sub-Lord against event-specific house requirements plus Badhaka, Moon SL, and Panchang.",
          "మీ ఎంచుకున్న తేదీల పరిధిని ప్రతి 4 నిమిషాలకు స్కాన్ చేస్తుంది. ప్రతి లగ్న సబ్‌లార్డ్‌ని ఈవెంట్‌కి తగిన భావాలు + బాధక + చంద్ర SL + పంచాంగంతో స్కోర్ చేస్తుంది."
        )}
      />

      {/* Step wizard — always visible so the user knows which step
          they're on and which are complete. Going back is
          click-enabled on completed steps (no jumping forward). */}
      {(() => {
        const wizardSteps = [
          { n: 1, label: t("Event", "ఈవెంట్") },
          { n: 2, label: t("Dates", "తేదీలు") },
          { n: 3, label: t("Results", "ఫలితాలు") },
        ];
        return (
          <div className="muhurtha-stepper" aria-label="Muhurtha wizard">
            {wizardSteps.map((s, i) => {
              const isDone    = mStep > s.n;
              const isCurrent = mStep === s.n;
              const canJump   = isDone && s.n < mStep; // backwards only
              const cls = `muhurtha-stepper-node${isDone ? " is-done" : ""}${isCurrent ? " is-current" : ""}`;
              return (
                <React.Fragment key={s.n}>
                  <div
                    className={cls}
                    data-clickable={canJump ? "true" : "false"}
                    onClick={() => { if (canJump) { setMStep(s.n as 1 | 2 | 3); if (s.n < 3) { setMResults(null); setMExpandedWindow(null); setMSelectedDate(null); setMAiMessages([]); } } }}
                  >
                    <span className="muhurtha-stepper-dot">{isDone ? "✓" : s.n}</span>
                    <span className="muhurtha-stepper-label">{s.label}</span>
                  </div>
                  {i < wizardSteps.length - 1 && (
                    <span className={`muhurtha-stepper-line${mStep > s.n ? " is-active" : ""}`} aria-hidden="true" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        );
      })()}

      {/* Step 1 — Event type + Participants */}
      {mStep === 1 && (
        <div>
          <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.75rem" }}>
            {t("What occasion is this for?", "ఏ సందర్భానికి ముహూర్తం?")}
          </div>
          {/* Free-form event type input */}
          <input
            type="text"
            placeholder={t(
              "Type an occasion (e.g. vehicle delivery, marriage…)",
              "సందర్భం టైప్ చేయండి (e.g. vehicle delivery, marriage…)"
            )}
            value={mEventType}
            onChange={e => setMEventType(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", background: "var(--card)", border: `0.5px solid ${mEventType ? "var(--accent)" : "var(--border2)"}`, borderRadius: 8, color: "var(--fg)", fontSize: 13, fontFamily: "inherit", marginBottom: 10, outline: "none" }}
          />
          <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8, marginTop: 4 }}>
            {t("Or pick from KP canon", "లేదా KP గ్రంధం నుండి ఎంచుకోండి")}
          </div>
          {/* Event type icon card grid — hover reveal shows KP meaning */}
          <div className="muhurtha-event-grid">
            {[
              { Icon: HandHeart,   te: "వివాహం",     en: "Marriage",         meaning: t("H7 cusp · Venus karaka · Jupiter aspect",   "H7 కస్ప్ · శుక్ర కారక · గురు దృష్టి") },
              { Icon: Briefcase,   te: "వ్యాపారం",   en: "Business Opening", meaning: t("H10 · H11 gains · Mercury or Jupiter SL",    "H10 · H11 లాభ · బుధ/గురు SL") },
              { Icon: HomeIcon,    te: "గృహప్రవేశం", en: "House Warming",    meaning: t("H4 cusp · Moon sign · Taurus/Cancer favor", "H4 కస్ప్ · చంద్ర రాశి · వృషభ/కర్కాటక") },
              { Icon: Plane,       te: "ప్రయాణం",    en: "Travel",           meaning: t("H3 short / H9 long · Mercury SL",           "H3 చిన్నది · H9 దూరం · బుధ SL") },
              { Icon: BookOpen,    te: "విద్య",      en: "Education",        meaning: t("H4 schooling · H5 intellect · Jupiter SL",  "H4 విద్య · H5 బుద్ధి · గురు SL") },
              { Icon: Stethoscope, te: "వైద్యం",     en: "Medical / Surgery", meaning: t("Avoid H8/H12 CSL · Moon strong · no vishti","H8/H12 CSL నివారించండి · చంద్ర బలం · విష్టి లేకుండా") },
              { Icon: Wallet,      te: "పెట్టుబడి",  en: "Investment",       meaning: t("H11 gains · Jupiter or Venus SL · shukla",  "H11 లాభ · గురు/శుక్ర SL · శుక్లపక్ష") },
              { Icon: Car,         te: "వాహనం",      en: "Vehicle Delivery", meaning: t("H4 vehicles · Venus karaka · sthira lagna", "H4 వాహనం · శుక్ర కారక · స్థిర లగ్న") },
            ].map(item => {
              const active = mEventType === item.en;
              const ItemIcon = item.Icon;
              return (
                <button
                  key={item.en}
                  onClick={() => setMEventType(item.en)}
                  className={`muhurtha-event-card${active ? " is-active" : ""}`}
                >
                  <ItemIcon size={22} strokeWidth={1.6} color={active ? "var(--accent)" : "currentColor"} />
                  <span style={{ fontSize: 11, fontWeight: active ? 600 : 500, textAlign: "center" as const, lineHeight: 1.25 }}>
                    {lang === "en" ? item.en : item.te}
                  </span>
                  <span className="muhurtha-event-meaning">{item.meaning}</span>
                </button>
              );
            })}
          </div>

          {/* Participants panel */}
          <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "0.875rem 1rem", marginBottom: "1rem" }}>
            <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "0.625rem" }}>
              {t("Participants", "పాల్గొనేవారు")} <span style={{ color: "var(--border2)", fontStyle: "normal" }}>({t("optional", "ఐచ్ఛికం")})</span>
            </div>
            {/* Participants chips */}
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: "0.625rem" }}>
              {/* Main user — always included, locked */}
              {workspaceData && (
                <div className="muhurtha-you-chip" title={t("Your chart is always included as the primary participant for RP resonance scoring.", "మీ చార్ట్ ఎల్లప్పుడూ ప్రాధమిక పాల్గొనేవారిగా చేర్చబడుతుంది.")}>
                  <Lock size={10} strokeWidth={2} style={{ opacity: 0.75 }} />
                  <span className="muhurtha-you-chip-label">{t("Primary", "ప్రాధమిక")}</span>
                  <span className="muhurtha-you-chip-sep" />
                  <span className="muhurtha-you-chip-name">{workspaceData.name || birthDetails.name}</span>
                </div>
              )}
              {mParticipants.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "rgba(201,169,110,0.08)", border: "0.5px solid rgba(201,169,110,0.3)", borderRadius: 20, fontSize: 12, color: "var(--accent)" }}>
                  <span>{p.name || p.birthDetails.name}</span>
                  <button onClick={() => setMParticipants(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, fontSize: 13, lineHeight: 1, display: "flex", alignItems: "center" }}>×</button>
                </div>
              ))}
            </div>

            {/* Add from saved sessions dropdown */}
            {!mShowAddParticipant && (
              <div style={{ display: "flex", gap: 6 }}>
                {savedSessions.filter(s => !mParticipants.find(p => p.id === s.id)).length > 0 && (
                  <div style={{ position: "relative" as const, flex: 1 }}>
                    <select onChange={e => {
                      const found = savedSessions.find(s => s.id === e.target.value);
                      if (found) { setMParticipants(prev => [...prev, found]); e.target.value = ""; }
                    }} defaultValue=""
                      style={{ width: "100%", background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "var(--muted)", outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
                      <option value="" disabled>+ {t("Add from saved charts", "సేవ్ చేసిన చార్ట్ నుండి జోడించు")}</option>
                      {savedSessions.filter(s => !mParticipants.find(p => p.id === s.id)).map(s => (
                        <option key={s.id} value={s.id}>{s.name || s.birthDetails.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button onClick={() => {
                  // PR A1.3-fix-24 — reset mNewP on open so each
                  // "Add Participant" click is a clean slate.
                  // (Was previously reset on every tab change,
                  // which destroyed user data on tab peeks.)
                  setMNewP({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: 17.385, longitude: 78.4867, gender: "", timezone_offset: 5.5 });
                  setMNewPPlaceSugg([]);
                  setMShowAddParticipant(true);
                }}
                  style={{ padding: "7px 12px", background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>
                  + {t("New", "కొత్తగా")}
                </button>
              </div>
            )}

            {/* Inline mini-form for new participant (PR17a redesign):
                now a contained sub-card with labeled field eyebrows,
                gender pills, PlacePicker, and pill action buttons. */}
            {mShowAddParticipant && (() => {
              const canAdd = !!(mNewP.name && mNewP.date && mNewP.date.length === 10 && mNewP.time && mNewP.time.length === 5);
              return (
                <div className="muhurtha-participant-form">
                  <div className="pf-header">
                    <div className="pf-header-title">{t("Add new participant", "కొత్త పాల్గొనేవారిని జోడించండి")}</div>
                    <div className="pf-header-sub">{t("Optional — improves RP resonance scoring", "ఐచ్ఛికం — RP ప్రతిధ్వని స్కోరింగ్ మెరుగుపరుస్తుంది")}</div>
                  </div>

                  {/* Name */}
                  <div>
                    <div className="pf-field-label">
                      <User size={10} strokeWidth={2} /> {t("Name", "పేరు")}
                    </div>
                    <input
                      type="text"
                      placeholder={t("Full name", "పూర్తి పేరు")}
                      value={mNewP.name}
                      onChange={e => setMNewP(p => ({ ...p, name: e.target.value }))}
                      className={`pf-input${mNewP.name ? " filled" : ""}`}
                    />
                  </div>

                  {/* Date + Time */}
                  <div className="pf-row">
                    <div>
                      <div className="pf-field-label">
                        <Clock size={10} strokeWidth={2} /> {t("Date of birth", "పుట్టిన తేదీ")}
                      </div>
                      <input
                        type="text" inputMode="numeric"
                        placeholder="DD/MM/YYYY"
                        maxLength={10}
                        value={mNewP.date}
                        onChange={e => handleMNewPDateChange(e.target.value)}
                        className={`pf-input${mNewP.date ? " filled" : ""}`}
                      />
                    </div>
                    <div>
                      <div className="pf-field-label">
                        <Clock size={10} strokeWidth={2} /> {t("Time of birth", "పుట్టిన సమయం")}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          type="text" inputMode="numeric"
                          placeholder="HH:MM"
                          maxLength={5}
                          value={mNewP.time}
                          onChange={e => handleMNewPTimeChange(e.target.value)}
                          className={`pf-input${mNewP.time ? " filled" : ""}`}
                          style={{ flex: 1 }}
                        />
                        <button
                          onClick={() => setMNewP(p => ({ ...p, ampm: p.ampm === "AM" ? "PM" : "AM" }))}
                          className="pf-input filled"
                          style={{ width: 64, cursor: "pointer", color: "var(--accent)", fontWeight: 600, textAlign: "center" as const, padding: "8px 0" }}
                        >
                          {mNewP.ampm}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Place — now using the shared PlacePicker for consistency */}
                  <div>
                    <div className="pf-field-label">
                      <Globe size={10} strokeWidth={2} /> {t("Place of birth", "పుట్టిన ఊరు")}
                    </div>
                    <PlacePicker
                      value={mNewP.place}
                      placeholder={t("Start typing a city…", "నగరం టైప్ చేయండి…")}
                      onChange={(placeName, pick) => {
                        setMNewP(p => ({
                          ...p,
                          place: placeName,
                          latitude: pick ? pick.lat : p.latitude,
                          longitude: pick ? pick.lon : p.longitude,
                        }));
                        if (pick?.timezone) {
                          try {
                            const now = new Date();
                            const fmt = new Intl.DateTimeFormat("en-US", { timeZone: pick.timezone, timeZoneName: "longOffset" });
                            const parts = fmt.formatToParts(now);
                            const tzPart = parts.find(part => part.type === "timeZoneName")?.value ?? "";
                            const m = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
                            if (m) {
                              const sign = m[1] === "-" ? -1 : 1;
                              const h = parseInt(m[2], 10);
                              const mm = parseInt(m[3] ?? "0", 10);
                              const offset = sign * (h + mm / 60);
                              setMNewP(p => ({ ...p, timezone_offset: offset }));
                              return;
                            }
                          } catch { /* silent */ }
                        }
                        if (pick) {
                          axios.get("https://api.bigdatacloud.net/data/reverse-geocode-client", {
                            params: { latitude: pick.lat, longitude: pick.lon, localityLanguage: "en" },
                          }).then(r => {
                            const tz = r.data?.timezone;
                            if (tz?.gmtOffset !== undefined) {
                              const offset = Math.round((tz.gmtOffset / 3600) * 2) / 2;
                              setMNewP(p => ({ ...p, timezone_offset: offset }));
                            }
                          }).catch(() => {});
                        }
                      }}
                    />
                  </div>

                  {/* Gender — now pill-with-glyph to match event-type cards */}
                  <div>
                    <div className="pf-field-label">{t("Gender", "లింగం")}</div>
                    <div className="pf-gender-grid">
                      {(["male","female"] as const).map(g => (
                        <button
                          key={g}
                          onClick={() => setMNewP(p => ({ ...p, gender: g }))}
                          className={`pf-gender-pill${mNewP.gender === g ? " is-active" : ""}`}
                        >
                          <span style={{ fontSize: 14, lineHeight: 1 }}>{g === "male" ? "♂" : "♀"}</span>
                          {g === "male" ? t("Male", "పురుషుడు") : t("Female", "స్త్రీ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions — equal-weight Cancel text-only; Add accent-pill */}
                  <div className="pf-actions">
                    <button
                      onClick={() => {
                        setMShowAddParticipant(false);
                        setMNewP({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: 17.385, longitude: 78.4867, gender: "", timezone_offset: 5.5 });
                        setMNewPPlaceSugg([]);
                      }}
                      className="pf-btn-cancel"
                    >
                      {t("Cancel", "రద్దు")}
                    </button>
                    <button
                      disabled={!canAdd}
                      onClick={() => {
                        if (!canAdd) return;
                        const newSession: ChartSession = {
                          id: Date.now().toString(),
                          name: mNewP.name,
                          birthDetails: { name: mNewP.name, date: mNewP.date, time: mNewP.time, ampm: mNewP.ampm, place: mNewP.place, latitude: mNewP.latitude, longitude: mNewP.longitude, gender: mNewP.gender, timezone_offset: mNewP.timezone_offset },
                          workspaceData: null, analysisMessages: [], activeTopic: "", selectedHouse: null, chatQ: "", analysisLang: "english", activeTab: "chart"
                        };
                        setMParticipants(prev => [...prev, newSession]);
                        setSavedSessions(prev => [...prev, newSession]);
                        setMNewP({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: 17.385, longitude: 78.4867, gender: "", timezone_offset: 5.5 });
                        setMNewPPlaceSugg([]); setMNewPPlaceStatus("idle");
                        setMShowAddParticipant(false);
                      }}
                      className="pf-btn-add"
                    >
                      {t("Add participant", "జోడించు")}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          <button onClick={() => setMStep(2)} disabled={!mEventType}
            style={{ width: "100%", padding: "12px", background: mEventType ? "var(--accent)" : "rgba(201,169,110,0.15)", color: mEventType ? "#09090f" : "rgba(201,169,110,0.6)", border: mEventType ? "0.5px solid var(--accent)" : "0.5px solid rgba(201,169,110,0.3)", borderRadius: 999, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", cursor: mEventType ? "pointer" : "default", fontFamily: "inherit", transition: "all 0.2s", boxShadow: mEventType ? "0 4px 20px -6px rgba(201,169,110,0.5)" : "none" }}>
            {t("Pick dates", "తేదీలు ఎంచుకోండి")} →
          </button>
        </div>
      )}

      {/* Step 2 — Date selection */}
      {mStep === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setMStep(1)} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
            <div className="celestial-serif" style={{ fontSize: "11px", color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, fontWeight: "bold" }}>
              {t("Which dates should we scan?", "ఏ తేదీలు చూడాలి?")}
            </div>
          </div>
          
          {/* Event location section */}
          <div className="celestial-glass celestial-panel" style={{ border: "1px solid rgba(212, 175, 55, 0.2)", borderRadius: 12, padding: "16px" }}>
            <div className="celestial-serif" style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "0.75rem", display: "inline-flex", alignItems: "center", gap: 5, fontWeight: "bold" }}>
              <MapPin size={12} strokeWidth={1.8} /> {t("Event location", "ఈవెంట్ ప్రదేశం")}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: mEventLocMode === "different" ? 12 : 0 }}>
              {(["same","different"] as const).map(mode => (
                <button key={mode} onClick={() => { setMEventLocMode(mode); if(mode==="same") setMEventLoc(null); }}
                  className="celestial-glass celestial-panel"
                  style={{ flex: 1, padding: "9px 12px", background: mEventLocMode === mode ? "rgba(201,169,110,0.12)" : "rgba(255,255,255,0.02)", border: `1px solid ${mEventLocMode === mode ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.05)"}`, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 11, color: mEventLocMode === mode ? "var(--accent)" : "var(--muted)", fontWeight: mEventLocMode === mode ? 600 : 400, transition: "all 0.15s", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  {mode === "same" ? (<><HomeIcon size={12} strokeWidth={1.8} /> {t("Same as birth", "పుట్టినచోట")}</>) : (<><MapPin size={12} strokeWidth={1.8} /> {t("Different location", "వేరే ప్రదేశం")}</>)}
                </button>
              ))}
            </div>
            {mEventLocMode === "different" && (
              <div style={{ position: "relative" as const }}>
                <input
                  placeholder={t("Search event location…", "ఈవెంట్ ప్రదేశం వెతకండి…")}
                  defaultValue={mEventLoc?.place || ""}
                  onChange={e => handleMEventLocSearch(e.target.value)}
                  style={{ width: "100%", background: "var(--card)", border: `1px solid ${mEventLoc ? "var(--accent)" : "var(--border2)"}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--text)", outline: "none", boxSizing: "border-box" as const }}
                />
                {mEventLocSearching && <div style={{ position: "absolute", right: 12, top: 11, fontSize: 10, color: "var(--muted)" }}>...</div>}
                {mEventLoc && <div style={{ fontSize: 10, color: "#34d399", marginTop: 4 }}>✓ {mEventLoc.place}</div>}
                {mEventLocSugg.length > 0 && (
                  <div className="celestial-glass" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, overflow: "hidden", marginTop: 4 }}>
                    {mEventLocSugg.map((s, i) => (
                      <button key={i} onClick={() => {
                        axios.get("https://api.bigdatacloud.net/data/reverse-geocode-client", { params: { latitude: s.lat, longitude: s.lon, localityLanguage: "en" } })
                          .then(r => { const tz = Math.round(((r.data?.timezone?.gmtOffset || 0) / 3600) * 2) / 2; setMEventLoc({ lat: s.lat, lon: s.lon, tz, place: s.display }); })
                          .catch(() => setMEventLoc({ lat: s.lat, lon: s.lon, tz: 0, place: s.display }));
                        setMEventLocSugg([]);
                      }} style={{ width: "100%", padding: "8px 12px", background: "none", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text)", fontSize: 11, textAlign: "left" as const, cursor: "pointer", fontFamily: "inherit" }}>
                        {s.display}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Participant summary */}
          <div className="celestial-glass celestial-panel" style={{ padding: "10px 16px", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 8, fontSize: 11, color: "var(--muted)", display: "flex", flexWrap: "wrap" as const, gap: 6, alignItems: "center" }}>
            <span>{t("For", "కోసం")}:</span>
            <span className="celestial-serif" style={{ color: "var(--accent)", fontWeight: "bold" }}>
              {workspaceData?.name || birthDetails?.name || t("primary chart", "ప్రధాన చార్ట్")}
            </span>
            <span className="celestial-mono" style={{ fontSize: 9, padding: "2px 6px", background: "rgba(201,169,110,0.18)", color: "var(--accent)", borderRadius: 4, letterSpacing: "0.04em", fontWeight: 600 }}>
              {t("PRIMARY", "ప్రధాన")}
            </span>
            {mParticipants.length > 0 && (
              <>
                <span style={{ color: "var(--border2)", margin: "0 4px" }}>+</span>
                {mParticipants.map((p, i) => (
                  <span className="celestial-serif" key={p.id} style={{ color: "var(--accent)", marginRight: i < mParticipants.length - 1 ? 6 : 0, fontWeight: "bold" }}>
                    {p.name || p.birthDetails.name}
                  </span>
                ))}
              </>
            )}
          </div>

          {/* Quick picks */}
          <div>
            <div className="celestial-serif" style={{ fontSize: 9, color: "var(--accent)", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontWeight: "bold" }}>
              {t("Quick select range", "త్వరిత ఎంపిక పరిధి")}
            </div>
            <div className="muhurtha-quick-grid">
              {[
                { en: "This week",  te: "ఈ వారం",    days: 7 },
                { en: "Next week",  te: "వచ్చే వారం", days: 14 },
                { en: "This month", te: "ఈ నెల",     days: 30 },
                { en: "Next month", te: "వచ్చే నెల",  days: 60 },
              ].map(q => {
                const s = new Date(); s.setDate(s.getDate() + (q.days === 14 ? 7 : 0));
                const e = new Date(); e.setDate(e.getDate() + q.days);
                const fmt = (d: Date) => d.toISOString().split("T")[0];
                const active = mDateStart === fmt(s) && mDateEnd === fmt(e);
                const label = lang === "en" ? q.en : q.te;
                return (
                  <button key={q.en} onClick={() => { setMDateStart(fmt(s)); setMDateEnd(fmt(e)); }}
                    className="celestial-glass celestial-panel"
                    style={{
                      padding: "10px 8px",
                      background: active ? "rgba(212, 175, 55, 0.12)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${active ? "rgba(212,175,55,0.5)" : "rgba(255,255,255,0.05)"}`,
                      boxShadow: active ? "0 0 12px rgba(212, 175, 55, 0.2)" : "none",
                      borderRadius: 999,
                      cursor: "pointer",
                      color: active ? "var(--accent)" : "var(--muted)",
                      fontSize: 12,
                      fontFamily: "inherit",
                      fontWeight: active ? 600 : 400,
                      transition: "all 160ms ease",
                      textAlign: "center" as const,
                      transform: active ? "scale(1.03)" : "none",
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.borderColor = "rgba(212, 175, 55, 0.3)";
                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      }
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom date range */}
          <div className="celestial-glass celestial-panel muhurtha-date-grid" style={{ border: "1px solid rgba(212,175,55,0.15)", borderRadius: 12, padding: "18px" }}>
            <div>
              <div className="celestial-serif" style={{ fontSize: 9, color: "var(--accent)", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontWeight: "bold" }}>
                {t("From date", "ప్రారంభ తేదీ")}
              </div>
              <input
                type="date"
                value={mDateStart}
                onChange={e => setMDateStart(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(20, 18, 30, 0.45)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "var(--accent)",
                  outline: "none",
                  fontFamily: "var(--font-mono), monospace",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                  boxSizing: "border-box" as const,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212, 175, 55, 0.6)";
                  e.currentTarget.style.boxShadow = "0 0 10px rgba(212, 175, 55, 0.15)";
                  e.currentTarget.style.background = "rgba(20, 18, 30, 0.65)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = "rgba(20, 18, 30, 0.45)";
                }}
              />
            </div>
            <div>
              <div className="celestial-serif" style={{ fontSize: 9, color: "var(--accent)", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontWeight: "bold" }}>
                {t("To date", "ముగింపు తేదీ")}
              </div>
              <input
                type="date"
                value={mDateEnd}
                onChange={e => setMDateEnd(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(20, 18, 30, 0.45)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "var(--accent)",
                  outline: "none",
                  fontFamily: "var(--font-mono), monospace",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                  boxSizing: "border-box" as const,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212, 175, 55, 0.6)";
                  e.currentTarget.style.boxShadow = "0 0 10px rgba(212, 175, 55, 0.15)";
                  e.currentTarget.style.background = "rgba(20, 18, 30, 0.65)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = "rgba(20, 18, 30, 0.45)";
                }}
              />
            </div>
          </div>
          
          <button onClick={async () => {
            if (!mDateStart || !mDateEnd || !workspaceData) return;
            setMLoading(true); setMStep(3);
            try {
              const res = await axios.post(`${API_URL}/muhurtha/find`, {
                event_type: mEventType, date_start: mDateStart, date_end: mDateEnd,
                latitude: workspaceData.latitude || 17.385, longitude: workspaceData.longitude || 78.4867,
                timezone_offset: timezoneOffset, nearby_days: 3,
                ...(mEventLoc ? { event_lat: mEventLoc.lat, event_lon: mEventLoc.lon, event_tz: mEventLoc.tz } : {}),
                participants: [
                  // Main user always included as participant 0 for RP resonance
                  ...(snapshotCurrentSession() ? [sessionToApiPerson(snapshotCurrentSession()!)] : []),
                  ...mParticipants.map(sessionToApiPerson),
                ],
              });
              setMResults(res.data);
            } catch { setMResults(null); }
            setMLoading(false);
          }} disabled={!mDateStart || !mDateEnd || mLoading}
            style={{
              width: "100%", padding: "12px",
              background: mDateStart && mDateEnd ? "var(--accent)" : "rgba(201,169,110,0.15)",
              color:      mDateStart && mDateEnd ? "#09090f"     : "rgba(201,169,110,0.6)",
              border:     mDateStart && mDateEnd ? "0.5px solid var(--accent)" : "0.5px solid rgba(201,169,110,0.3)",
              borderRadius: 999, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em",
              cursor: mDateStart && mDateEnd ? "pointer" : "default", fontFamily: "inherit",
              boxShadow: mDateStart && mDateEnd ? "0 4px 20px -6px rgba(201,169,110,0.5)" : "none",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
            <Target size={14} strokeWidth={1.8} />
            {t("Find auspicious windows", "ముహూర్తాలు వెతకండి")}
          </button>
        </div>
      )}

      {/* Step 3 — Results */}
      {mStep === 3 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
            <button onClick={() => { setMStep(2); setMResults(null); }} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
              {mEventType.replace("_", " ").toUpperCase()} · {mDateStart} → {mDateEnd}
            </div>
          </div>

          {mLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", padding: "2rem", justifyContent: "center" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
              {t("Calculating planetary positions…", "గ్రహ స్థితులు లెక్కిస్తున్నాం…")}
            </div>
          )}

          {!mLoading && mResults && (() => {
            const allWindows = mResults.windows || [];
            const uniqueDates = [...new Set(allWindows.map((w: any) => w.date))] as string[];
            const filteredWindows = mSelectedDate ? allWindows.filter((w: any) => w.date === mSelectedDate) : allWindows;
            const bestWindow = mResults.best_window;
            const eventIcon: Record<string, any> = {
              marriage: HandHeart,
              business: Briefcase,
              house_warming: HomeIcon,
              travel: Plane,
              education: BookOpen,
            };
            const qualityColor = (q: string) => q === "Excellent" ? "var(--accent)" : q === "Good" ? "#4ade80" : q === "Fair" ? "#a78bfa" : "var(--muted)";
            const qualityBg = (q: string) => q === "Excellent" ? "rgba(201,169,110,0.12)" : q === "Good" ? "rgba(74,222,128,0.08)" : q === "Fair" ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.03)";
            const qualityBorder = (q: string) => q === "Excellent" ? "rgba(201,169,110,0.4)" : q === "Good" ? "rgba(74,222,128,0.3)" : q === "Fair" ? "rgba(167,139,250,0.3)" : "var(--border)";
            const qualityStars = (q: string) => q === "Excellent" ? "★★★" : q === "Good" ? "★★" : q === "Fair" ? "★" : "○";
            const qualityDot = (d: string) => { const dw = allWindows.filter((w: any) => w.date === d); const best = dw.reduce((a: any, b: any) => (a?.score || 0) > (b?.score || 0) ? a : b, dw[0]); return best?.quality === "Excellent" ? "#c9a96e" : best?.quality === "Good" ? "#4ade80" : "#a78bfa"; };

            const handleMuhurthaAiAsk = async (questionText: string, isTopic = false) => {
              if (!questionText.trim() || mAiLoading) return;
              setMAiLoading(true);
              setMAiQuestion("");
              try {
                recordAiCall(isTopic ? "muhurtha.analyze:topic" : "muhurtha.analyze:chat");
                const res = await axios.post(`${API_URL}/muhurtha/analyze`, {
                  muhurtha_data: mResults,
                  question: questionText,
                  history: mAiMessages.map(m => ({ question: m.q, answer: m.a })),
                });
                setMAiMessages(prev => [...prev, { q: questionText, a: res.data.answer, isTopic }]);
              } catch {
                setMAiMessages(prev => [...prev, { q: questionText, a: t("Could not load analysis. Please try again.", "విశ్లేషణ లోడ్ చేయడంలో సమస్య. మళ్ళీ ప్రయత్నించండి."), isTopic }]);
              }
              setMAiLoading(false);
            };

            const maxScore = allWindows.reduce((m: number, w: any) => Math.max(m, w.score || 0), 0) || 1;

            return (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* ── PR Mu16 — Sensitivity tier framing banner ──
                  Tier 2 (life-impact, default) = amber muted bar.
                  Tier 3 (structural risk: eclipse / combust / empty
                  horizon) = red prominent bar with escalator list. */}
              {mResults.sensitivity && mResults.sensitivity.framing_required && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: mResults.sensitivity.tier === 3
                      ? "rgba(248,113,113,0.08)"
                      : "rgba(201,169,110,0.05)",
                    border: mResults.sensitivity.tier === 3
                      ? "0.5px solid rgba(248,113,113,0.40)"
                      : "0.5px solid rgba(201,169,110,0.30)",
                    color: mResults.sensitivity.tier === 3 ? "#f87171" : "var(--accent)",
                    fontSize: 11,
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontWeight: 700, letterSpacing: "0.06em", fontSize: 10, textTransform: "uppercase", marginBottom: 6 }}>
                    {mResults.sensitivity.tier === 3
                      ? t("⚠ Tier 3 — structural risk in this range", "⚠ టైర్ 3 — ఈ పరిధిలో నిర్మాణ రిస్క్")
                      : t("Tier 2 — life-impact reading", "టైర్ 2 — జీవిత-ప్రభావ ఫలితం")}
                  </div>
                  <div style={{ color: "var(--text)", opacity: 0.85 }}>
                    {lang === "te" ? mResults.sensitivity.framing_note_te : mResults.sensitivity.framing_note_en}
                  </div>
                  {mResults.sensitivity.tier === 3 && mResults.sensitivity.escalators?.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 10, color: "var(--muted)", fontStyle: "italic" }}>
                      {t("Triggered by:", "ట్రిగ్గర్:")}{" "}
                      {mResults.sensitivity.escalators.map((e: string) => e.replace(/_/g, " ").replace(/:/g, " ")).join(" · ")}
                    </div>
                  )}
                </div>
              )}

              {/* ── BEST WINDOW — serif hero reveal ── */}
              {bestWindow && (
                <div className="muhurtha-best-hero">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <Sparkles size={12} strokeWidth={1.8} />
                        {t("Best window", "ఉత్తమ సమయం")}
                      </div>
                      <div className="muhurtha-best-date">{bestWindow.date_display}</div>
                      <div className="muhurtha-best-time" style={{ marginTop: 4 }}>
                        {bestWindow.start_time} – {bestWindow.end_time}
                      </div>
                      <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" as const, fontSize: 11 }}>
                        <span style={{ color: "var(--muted)" }}>Lagna: <span style={{ color: "var(--text)", fontWeight: 500 }}>{bestWindow.lagna}</span></span>
                        <span style={{ color: "var(--muted)" }}>SL: <span style={{ color: "var(--accent2)", fontWeight: 500 }}>{bestWindow.lagna_sublord}</span></span>
                        {bestWindow.moon_nakshatra && <span style={{ color: "var(--muted)" }}>Moon: <span style={{ color: "var(--text)" }}>{bestWindow.moon_nakshatra}</span></span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" as const, flexShrink: 0 }}>
                      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 48, fontWeight: 400, color: qualityColor(bestWindow.quality), lineHeight: 1, letterSpacing: "-0.02em", textShadow: `0 0 32px ${qualityColor(bestWindow.quality)}50` }}>
                        {bestWindow.score}
                      </div>
                      <div style={{ fontSize: 11, color: qualityColor(bestWindow.quality), letterSpacing: "0.1em", textTransform: "uppercase" as const, fontWeight: 600, marginTop: 4 }}>
                        {qualityStars(bestWindow.quality)} {bestWindow.quality}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 14, fontSize: 10, color: "var(--muted)", alignItems: "center" }}>
                    {(() => {
                      const BannerIcon = eventIcon[mEventType] || Sparkles;
                      return (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <BannerIcon size={14} strokeWidth={1.8} color="var(--accent)" />
                          <span style={{ textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--accent)", fontWeight: 500 }}>{mEventType.replace("_", " ")}</span>
                        </span>
                      );
                    })()}
                    <span>·</span>
                    <span>{mDateStart} → {mDateEnd}</span>
                    {mResults.participants_loaded?.length > 0 && <><span>·</span><span>{mResults.participants_loaded.length} {t("participants", "పాల్గొనేవారు")}</span></>}
                    <span>·</span>
                    <span>{allWindows.length} {t("windows", "సమయాలు")}</span>
                  </div>

                  {/* ── PR Mu17 — Dual-tz display (IST + event-local)
                      so an India-based astrologer with diaspora clients
                      sees BOTH clocks side-by-side. evidence_payload
                      already carries the event-local HH:MM; we compute
                      IST manually from the same JD. */}
                  {bestWindow.evidence_payload && (() => {
                    const ev = bestWindow.evidence_payload;
                    const isISTLocation = Math.abs((ev.day_event_tz || 0) - 5.5) < 0.01;
                    if (isISTLocation) return null;  // skip when both are the same
                    // Convert window's start JD → IST. The start_time is event-local;
                    // we just label them appropriately.
                    return (
                      <div style={{
                        marginTop: 12, padding: "8px 12px",
                        background: "rgba(147,197,253,0.05)",
                        border: "0.5px solid rgba(147,197,253,0.25)",
                        borderRadius: 8,
                        display: "flex", gap: 14, flexWrap: "wrap" as const,
                        alignItems: "center", fontSize: 11, color: "var(--text)",
                      }}>
                        <span style={{ color: "#93c5fd", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" as const, fontWeight: 700 }}>
                          {t("Dual time-zone", "రెండు సమయ మండలాలు")}
                        </span>
                        <span>
                          <span style={{ color: "var(--muted)", fontSize: 10 }}>{t("Event local", "ఈవెంట్ స్థానిక")} </span>
                          <strong>{bestWindow.start_time}</strong>
                          <span style={{ color: "var(--muted)", fontSize: 10 }}> (UTC{ev.day_event_tz >= 0 ? "+" : ""}{ev.day_event_tz})</span>
                        </span>
                        <span style={{ color: "var(--muted)" }}>·</span>
                        <span>
                          <span style={{ color: "var(--muted)", fontSize: 10 }}>IST </span>
                          {(() => {
                            try {
                              // start_time is "HH:MM" in event-local. Convert:
                              //   local_clock + (5.5 - event_tz) = IST_clock
                              const [h, m] = bestWindow.start_time.split(":").map(Number);
                              const ist_minutes = h * 60 + m + (5.5 - (ev.day_event_tz || 0)) * 60;
                              const day_offset = Math.floor(ist_minutes / 1440);
                              const wrapped = ((ist_minutes % 1440) + 1440) % 1440;
                              const ih = Math.floor(wrapped / 60), im = Math.floor(wrapped % 60);
                              const tag = day_offset === 1 ? " (+1 day)" : day_offset === -1 ? " (-1 day)" : "";
                              return <strong>{`${ih.toString().padStart(2, "0")}:${im.toString().padStart(2, "0")}${tag}`}</strong>;
                            } catch { return null; }
                          })()}
                        </span>
                      </div>
                    );
                  })()}

                  {/* ── PR Mu17 — Same-day alternatives strip ──
                      Backend Mu5 surfaced same_day_alternatives;
                      render here as a chip row so the astrologer can
                      pick by client logistics. Hidden when only 1
                      alternative (= the best window itself). */}
                  {Array.isArray(mResults.same_day_alternatives) && mResults.same_day_alternatives.length > 1 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 6 }}>
                        {t("Other windows on this day", "ఈ రోజు ఇతర సమయాలు")}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                        {mResults.same_day_alternatives.slice(1, 5).map((w: any, i: number) => (
                          <div key={i} style={{
                            padding: "5px 11px",
                            background: "rgba(255,255,255,0.02)",
                            border: "0.5px solid var(--border2)",
                            borderRadius: 999,
                            fontSize: 11,
                            color: "var(--text)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}>
                            <strong>{w.start_time}–{w.end_time}</strong>
                            <span style={{ color: qualityColor(w.quality), fontSize: 10, fontWeight: 600 }}>{w.score}</span>
                            <span style={{ color: "var(--muted)", fontSize: 9 }}>{w.lagna} · {w.lagna_sublord}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── PR Mu15 — MuhurthaReasoningTrace for the best window ──
                  Collapsible "Full reasoning trace + Copy notes +
                  Export JSON" panel mirroring MatchReasoningTrace
                  (M12) and HoraryReasoningTrace (H10). Closed by
                  default so the leaderboard stays clean; opens to
                  show every signal the engine used for the verdict
                  + a copy-paste-ready astrologer notes block. */}
              {bestWindow && (
                <MuhurthaReasoningTrace
                  window={bestWindow}
                  metadata={{
                    event_type: mResults.event_type,
                    event_label: mResults.event_label,
                    participants_loaded: mResults.participants_loaded,
                    eclipses_in_range: mResults.eclipses_in_range,
                    advanced_dosha_check_enabled: mResults.advanced_dosha_check_enabled,
                  }}
                />
              )}

              {/* ── Nearby Better Alert ── */}
              {mResults.nearby_better && (
                <div style={{ padding: "0.875rem 1rem", background: "rgba(251,191,36,0.08)", border: "0.5px solid rgba(251,191,36,0.3)", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  <TriangleAlert size={16} strokeWidth={1.8} color="#fbbf24" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 600, marginBottom: 3, letterSpacing: "0.04em" }}>
                      {t("Better window nearby", "మీరు ఎంచుకున్న తేదీల దగ్గర మంచి ముహూర్తం ఉంది")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text)" }}>
                      {mResults.nearby_better.date_display} · {mResults.nearby_better.start_time}–{mResults.nearby_better.end_time}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>
                      Score {mResults.nearby_better.score} ({mResults.nearby_better.quality}) · Lagna {mResults.nearby_better.lagna} · SL {mResults.nearby_better.lagna_sublord}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PR A2.2d — Extend Window Banner ──
                  Shown when passed_count == 0 (no window
                  in client range cleared hard filters).
                  Classical rule (KB §8.5): defer rather
                  than recommend a bad window. Dad's exact
                  practice. */}
              {mResults.extend_suggestion && (mResults.passed_count === 0 || !mResults.best_window) && (
                <div style={{
                  padding: "1rem 1.125rem",
                  background: "rgba(239,68,68,0.08)",
                  border: "0.5px solid rgba(239,68,68,0.35)",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}>
                  <TriangleAlert size={18} strokeWidth={1.8} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                      {t("No qualifying window in your range", "ఈ తేదీల్లో సరైన ముహూర్తం లేదు")}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 6, lineHeight: 1.5 }}>
                      {t("Next qualifying window:", "తరువాత సరైన ముహూర్తం:")}
                      {" "}
                      <strong style={{ color: "var(--accent)" }}>
                        {mResults.extend_suggestion.window?.date_display} · {mResults.extend_suggestion.window?.start_time}–{mResults.extend_suggestion.window?.end_time}
                      </strong>
                      {" "}
                      <span style={{ color: "var(--muted)", fontSize: 11 }}>
                        ({mResults.extend_suggestion.days_from_range_end} {t("days away", "రోజుల తర్వాత")} · Score {mResults.extend_suggestion.window?.score})
                      </span>
                    </div>
                    {mResults.extend_suggestion.blocking_reasons?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, marginTop: 6, marginBottom: 4 }}>
                          {t("Why your range fails", "ఎందుకు ఈ పరిధి విఫలం")}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" as const, gap: 3 }}>
                          {mResults.extend_suggestion.blocking_reasons.map((r: any, i: number) => (
                            <div key={i} style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 8, alignItems: "baseline" }}>
                              <span style={{ color: "#f87171", minWidth: 30, fontVariantNumeric: "tabular-nums" as const, fontWeight: 600 }}>×{r.count}</span>
                              <span>{r.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── B. CALENDAR DATE STRIP ── */}
              {uniqueDates.length > 1 && (
                <div className="muhurtha-calendar-strip">
                  <button onClick={() => setMSelectedDate(null)} className={`muhurtha-date-pill ${mSelectedDate === null ? "active" : ""}`}>
                    All
                  </button>
                  {uniqueDates.map(d => {
                    const dt = new Date(d + "T00:00:00");
                    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                    return (
                      <button key={d} onClick={() => setMSelectedDate(d === mSelectedDate ? null : d)} className={`muhurtha-date-pill ${mSelectedDate === d ? "active" : ""}`}>
                        <span style={{ fontSize: 9, color: "var(--muted)", display: "block" }}>{dayNames[dt.getDay()]}</span>
                        <span>{dt.getDate()}</span>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: qualityDot(d), display: "inline-block" }} />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── C. RANKED LEADERBOARD ── */}
              {filteredWindows.length > 0 && (
                <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginTop: 4, marginBottom: -4, fontWeight: 500 }}>
                  {filteredWindows.length} {t(filteredWindows.length === 1 ? "window · ranked by score" : "windows · ranked by score", filteredWindows.length === 1 ? "సమయం · స్కోర్ వరుసలో" : "సమయాలు · స్కోర్ వరుసలో")}
                </div>
              )}
              {filteredWindows.length === 0 && (
                <div style={{ textAlign: "center" as const, padding: "2.5rem 1rem", color: "var(--muted)", fontSize: 13, background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 12 }}>
                  {t("No strong muhurtha windows in this range. Try a longer range or different dates.", "ఈ తేదీల్లో మంచి ముహూర్తాలు కనపడలేదు. ఎక్కువ తేదీల పరిధి ప్రయత్నించండి.")}
                </div>
              )}

              {filteredWindows.map((w: any, i: number) => {
                const isExpanded = mExpandedWindow === i;
                const bc = w.badhaka_check || {};
                const pang = w.panchang || {};
                const rank = i + 1;
                const rankClass =
                  rank === 1 ? "muhurtha-rank-1" :
                  rank === 2 ? "muhurtha-rank-2" :
                  rank === 3 ? "muhurtha-rank-3" : "muhurtha-rank-other";
                const scorePct = Math.max(6, Math.min(100, Math.round(((w.score || 0) / maxScore) * 100)));
                const qC = qualityColor(w.quality);
                return (
                <div key={i} className={`muhurtha-card muhurtha-card-${(w.quality || "fair").toLowerCase()}`}
                  style={{ border: `0.5px solid ${qualityBorder(w.quality)}` }}>
                  {/* Collapsed header — always visible */}
                  <div onClick={() => setMExpandedWindow(isExpanded ? null : i)} style={{ cursor: "pointer", padding: "0.875rem 1rem" }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      {/* Rank medallion */}
                      <div className={`muhurtha-rank ${rankClass}`}>{rank}</div>

                      {/* Main info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>{w.date_display}</div>
                        <div style={{ fontSize: 18, fontWeight: 400, color: qC, fontFamily: "'DM Serif Display', serif", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                          {w.start_time} – {w.end_time}
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, flexWrap: "wrap" as const }}>
                          <span style={{ color: "var(--muted)" }}>Lagna: <span style={{ color: "var(--text)" }}>{w.lagna}</span></span>
                          <span style={{ color: "var(--muted)" }}>SL: <span style={{ color: "var(--accent2)" }}>{w.lagna_sublord}</span></span>
                          {w.moon_nakshatra && <span style={{ color: "var(--muted)" }}>Moon: <span style={{ color: "var(--text)" }}>{w.moon_nakshatra}</span></span>}
                        </div>
                        {/* Score bar — gold breathes for #1 */}
                        <div className="muhurtha-score-bar">
                          <div
                            className={`muhurtha-score-bar-fill${rank === 1 ? " is-top" : ""}`}
                            style={{
                              width: `${scorePct}%`,
                              background: `linear-gradient(90deg, ${qC}66 0%, ${qC} 100%)`,
                              boxShadow: rank === 1 ? `0 0 10px ${qC}60` : "none",
                            }}
                          />
                        </div>
                      </div>

                      {/* Right block */}
                      <div style={{ textAlign: "right" as const, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                        <div style={{ fontSize: 13, padding: "4px 12px", borderRadius: 999, background: qualityBg(w.quality), color: qC, border: `0.5px solid ${qualityBorder(w.quality)}`, fontWeight: 600, letterSpacing: "0.03em" }}
                             title={t(
                               typeof w.confidence_score === "number" && w.confidence_score !== w.raw_score
                                 ? `Confidence ${w.confidence_score}/100 (raw ${w.raw_score})`
                                 : `Confidence ${w.confidence_score ?? w.score}/100`,
                               typeof w.confidence_score === "number" && w.confidence_score !== w.raw_score
                                 ? `విశ్వాసం ${w.confidence_score}/100 (raw ${w.raw_score})`
                                 : `విశ్వాసం ${w.confidence_score ?? w.score}/100`
                             )}>
                          {qualityStars(w.quality)} {w.score}
                          {typeof w.confidence_score === "number" && w.raw_score !== undefined && w.raw_score > 100 && (
                            <span style={{ marginLeft: 6, fontSize: 10, color: "var(--muted)", fontWeight: 400 }}>
                              ({w.raw_score} raw)
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, justifyContent: "flex-end" }}>
                          {bc.passed !== undefined && <span className={`muhurtha-badge ${bc.passed ? "pass" : "fail"}`}>{bc.passed ? "✓" : "✗"} Badhaka</span>}
                          {w.event_cusp_confirms !== undefined && <span className={`muhurtha-badge ${w.event_cusp_confirms ? "pass" : "neutral"}`}>{w.event_cusp_confirms ? "✓" : "–"} Event CSL</span>}
                          {w.moon_sl_favorable !== undefined && <span className={`muhurtha-badge ${w.moon_sl_favorable ? "pass" : "neutral"}`}>{w.moon_sl_favorable ? "✓" : "–"} Moon SL</span>}
                          {/* PR A2.2d — Partners aggregate chip.
                              Green = all participants clean on Tarabala + Chandrabala.
                              Amber = at least one participant has a soft flag. */}
                          {w.per_participant && w.per_participant.length > 0 && (() => {
                            const ppl = w.per_participant;
                            const softFlags = ppl.filter((p: any) => !p.tara_bala_good || !p.chandrabala_good).length;
                            const allClean = softFlags === 0;
                            return (
                              <span className={`muhurtha-badge ${allClean ? "pass" : "neutral"}`}>
                                {allClean ? "✓" : "⚠"} {t("Partners", "పాల్గొనేవారు")} {ppl.length - softFlags}/{ppl.length}
                              </span>
                            );
                          })()}
                        </div>
                        {w.resonating_with && w.resonating_with.length > 0 && (
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const, justifyContent: "flex-end" }}>
                            {w.resonating_with.map((name: string, j: number) => (
                              <span key={j} style={{ fontSize: 9, padding: "1px 7px", background: "rgba(74,222,128,0.1)", border: "0.5px solid rgba(74,222,128,0.25)", borderRadius: 999, color: "#4ade80" }}>{name}</span>
                            ))}
                          </div>
                        )}
                        {(w.in_rahu_kalam || w.is_vishti) && (
                          <div style={{ fontSize: 9, color: "#f87171", letterSpacing: "0.04em", textTransform: "uppercase" as const, textDecoration: "line-through", textDecorationColor: "#f8717166" }}>
                            {w.in_rahu_kalam && "Rahu Kalam"}{w.in_rahu_kalam && w.is_vishti && " · "}{w.is_vishti && "Vishti"}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" as const, marginTop: 8, fontSize: 10, color: "var(--muted)", opacity: 0.55, letterSpacing: "0.06em" }}>
                      {isExpanded ? `▲ ${t("Collapse details", "వివరాలు దాచు")}` : `▼ ${t("Click for KP details", "KP వివరాల కోసం నొక్కండి")}`}
                    </div>
                  </div>

                  {/* Expanded KP details — 2x2 grid */}
                  <div className={`muhurtha-expand ${isExpanded ? "open" : ""}`}>
                    <div style={{ padding: "0 1rem 1rem" }}>
                      <div className="muhurtha-kp-grid">
                        {/* Panel 1: KP Analysis */}
                        <div className="muhurtha-detail-panel">
                          <div className="muhurtha-panel-title">{t("KP Analysis", "KP విశ్లేషణ")}</div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Lagna Sub Lord", "లగ్న సబ్ లార్డ్")}</span>
                            <span style={{ color: "var(--accent2)" }}>{w.lagna_sublord}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Lagna Star Lord", "లగ్న స్టార్ లార్డ్")}</span>
                            <span>{w.lagna_star_lord}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Signified houses", "సూచిత భావాలు")}</span>
                            <span style={{ color: "var(--accent)" }}>{(w.signified_houses || []).join(", ")}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Sign type", "రాశి రకం")}</span>
                            <span>{w.lagna_sign_type || "—"}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>Badhaka (H{bc.badhaka_house})</span>
                            <span className={bc.passed ? "muhurtha-pass" : "muhurtha-fail"}>
                              {bc.passed ? t("PASS", "సరే") : t("FAIL", "విఫలం")}
                              {bc.badhaka_hit ? ` (${t("Badhaka hit", "బాధక హిట్")})` : ""}
                              {bc.maraka_hit ? ` (${t("Maraka hit", "మారక హిట్")})` : ""}
                            </span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Event cusp CSL", "ఈవెంట్ కస్ప్ CSL")}</span>
                            <span>{w.event_cusp_csl || "—"} → H{(w.event_cusp_houses || []).join(",")}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Event cusp confirms", "ఈవెంట్ కస్ప్ నిర్ధారిస్తుంది")}</span>
                            <span className={w.event_cusp_confirms ? "muhurtha-pass" : "muhurtha-neutral"}>{w.event_cusp_confirms ? t("YES", "అవును") : t("NO", "కాదు")}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>H11 CSL</span>
                            <span>{w.h11_csl || "—"} → H{(w.h11_houses || []).join(",")}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("H11 confirms", "H11 నిర్ధారిస్తుంది")}</span>
                            <span className={w.h11_confirms ? "muhurtha-pass" : "muhurtha-neutral"}>{w.h11_confirms ? t("YES", "అవును") : t("NO", "కాదు")}</span>
                          </div>
                        </div>

                        {/* Panel 2: Panchang */}
                        <div className="muhurtha-detail-panel">
                          <div className="muhurtha-panel-title">{t("Panchang", "పంచాంగం")}</div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Tithi", "తిథి")}</span>
                            <span>{pang.tithi || "—"} ({pang.tithi_num || ""})</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Paksha", "పక్షం")}</span>
                            <span>{pang.paksha || "—"}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Nakshatra", "నక్షత్రం")}</span>
                            <span>{pang.nakshatra || "—"}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Yoga", "యోగం")}</span>
                            <span>{pang.yoga || "—"}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Weekday", "వారం")}</span>
                            <span>{pang.vara || "—"}</span>
                          </div>
                        </div>

                        {/* Panel 3: Moon & Timing */}
                        <div className="muhurtha-detail-panel">
                          <div className="muhurtha-panel-title">{t("Moon & timing", "చంద్ర & సమయం")}</div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Moon sign", "చంద్ర రాశి")}</span>
                            <span>{w.moon_sign || "—"}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Moon nakshatra", "చంద్ర నక్షత్రం")}</span>
                            <span>{w.moon_nakshatra || "—"}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Moon star lord", "చంద్ర స్టార్ లార్డ్")}</span>
                            <span style={{ color: "var(--accent2)" }}>{w.moon_star_lord || "—"}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Moon sub lord", "చంద్ర సబ్ లార్డ్")}</span>
                            <span>{w.moon_sub_lord || "—"}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Moon SL favorable", "చంద్ర SL అనుకూలం")}</span>
                            <span className={w.moon_sl_favorable ? "muhurtha-pass" : "muhurtha-neutral"}>{w.moon_sl_favorable ? t("YES", "అవును") : t("NO", "కాదు")}</span>
                          </div>
                        </div>

                        {/* Panel 4: Status */}
                        <div className="muhurtha-detail-panel">
                          <div className="muhurtha-panel-title">{t("Status", "స్థితి")}</div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Score", "స్కోర్")}</span>
                            <span style={{ color: qualityColor(w.quality), fontWeight: 600 }}>{w.score} ({w.quality})</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Base score", "ఆధార స్కోర్")}</span>
                            <span>{w.base_score}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>Rahu Kalam</span>
                            <span className={w.in_rahu_kalam ? "muhurtha-fail" : "muhurtha-pass"}>{w.in_rahu_kalam ? t("IN RAHU KALAM", "రాహు కాలంలో") : t("Clear", "లేదు")}</span>
                          </div>
                          <div className="muhurtha-detail-row">
                            <span>{t("Vishti karana", "విష్టి కరణం")}</span>
                            <span className={w.is_vishti ? "muhurtha-fail" : "muhurtha-pass"}>{w.is_vishti ? "VISHTI" : t("Clear", "లేదు")}</span>
                          </div>
                          {/* PR A2.2e — classical dosha flags */}
                          {w.venus_combust && (
                            <div className="muhurtha-detail-row">
                              <span>{t("Venus combust", "శుక్ర అస్త")}</span>
                              <span className="muhurtha-fail">{t("SHUKRA ASTA", "శుక్ర అస్త")}</span>
                            </div>
                          )}
                          {w.jupiter_combust && (
                            <div className="muhurtha-detail-row">
                              <span>{t("Jupiter combust", "గురు అస్త")}</span>
                              <span className="muhurtha-fail">{t("GURU ASTA", "గురు అస్త")}</span>
                            </div>
                          )}
                          {w.solar_month_blocked && (
                            <div className="muhurtha-detail-row">
                              <span>{t("Solar month", "సౌర మాసం")}</span>
                              <span className="muhurtha-fail">{t("BLOCKED (vivaha)", "నిషేధం (వివాహ)")}</span>
                            </div>
                          )}
                          {w.kartari_active && (
                            <div className="muhurtha-detail-row">
                              <span>{t("Kartari dosha", "కర్తరి దోషం")}</span>
                              <span className="muhurtha-fail">{t("ACTIVE", "చురుకు")}</span>
                            </div>
                          )}
                          {w.ekargala_active && (
                            <div className="muhurtha-detail-row">
                              <span>{t("Ekargala dosha", "ఏకార్గల దోషం")}</span>
                              <span className="muhurtha-fail">{t("ACTIVE", "చురుకు")}</span>
                            </div>
                          )}
                          {mParticipants.length > 0 && (
                            <>
                              <div className="muhurtha-detail-row">
                                <span>{t("Participant resonance", "పాల్గొనేవారి ప్రతిధ్వని")}</span>
                                <span>{w.participant_resonance}/{mParticipants.length}</span>
                              </div>
                              {(w.resonating_with || []).map((name: string, j: number) => (
                                <div key={j} className="muhurtha-detail-row">
                                  <span style={{ paddingLeft: 8 }}>{name}</span>
                                  <span style={{ color: "#4ade80", fontSize: 10 }}>{t("RP match", "RP సరిపోలిక")}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </div>

                        {/* PR Mu2 — Confidence breakdown ledger.
                            Every contributing factor + its delta + a
                            short note. Sum of deltas = raw_score;
                            confidence_score = clamp [0, 100]. Lets the
                            astrologer trace WHY a window scored what
                            it scored. */}
                        {Array.isArray(w.confidence_breakdown) && w.confidence_breakdown.length > 0 && (
                          <div className="muhurtha-detail-panel">
                            <div className="muhurtha-panel-title">
                              {t("Confidence breakdown", "విశ్వాస విభజన")}
                              <span style={{ marginLeft: 8, fontSize: 10, color: "var(--muted)", fontWeight: 400 }}>
                                {w.confidence_score}/100
                                {typeof w.raw_score === "number" && w.raw_score !== w.confidence_score && (
                                  <span> · raw {w.raw_score}</span>
                                )}
                              </span>
                            </div>
                            {w.confidence_breakdown.map((b: any, k: number) => {
                              const color =
                                b.delta > 0 ? "#4ade80"
                                  : b.delta < 0 ? "#f87171"
                                  : "var(--muted)";
                              return (
                                <div key={k} className="muhurtha-detail-row" title={b.note}>
                                  <span style={{ fontSize: 11 }}>{b.factor.replace(/_/g, " ")}</span>
                                  <span style={{ color, fontWeight: 600 }}>
                                    {b.delta > 0 ? "+" : ""}{b.delta}
                                  </span>
                                </div>
                              );
                            })}
                            <div style={{ fontSize: 10, color: "var(--muted)", fontStyle: "italic", marginTop: 6, lineHeight: 1.4 }}>
                              {t(
                                "Sum of deltas = raw_score. Confidence is clamped to [0, 100]; raw > 100 means strong base with headroom; raw < 0 means heavy penalties beyond what the floor can show.",
                                "డెల్టాల మొత్తం = raw_score. విశ్వాసం [0, 100]కి క్లాంప్ చేయబడింది; raw > 100 అంటే బలమైన పునాది; raw < 0 అంటే భారీ పెనాల్టీలు."
                              )}
                            </div>
                          </div>
                        )}

                        {/* PR A2.2d — Panel 5: Per-participant breakdown
                            (Tarabala / Chandrabala / Chandrashtamam /
                             Janma Tara from A2.2c's per_participant data) */}
                        {w.per_participant && w.per_participant.length > 0 && (
                          <div className="muhurtha-detail-panel" style={{ gridColumn: "1 / -1" }}>
                            <div className="muhurtha-panel-title">{t("Participants (KP §8.1, §8.2)", "పాల్గొనేవారు (KP §8.1, §8.2)")}</div>
                            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                              {w.per_participant.map((p: any, j: number) => {
                                // PR A2.2c.2 — DBA hard flags also contribute
                                const anyHardFail = p.chandrashtamam || p.janma_tara || p.badhakesh_active || p.marakesh_active;
                                return (
                                  <div
                                    key={j}
                                    style={{
                                      borderTop: j > 0 ? "0.5px solid rgba(255,255,255,0.06)" : "none",
                                      paddingTop: j > 0 ? 8 : 0,
                                    }}
                                  >
                                    <div style={{ fontSize: 11, fontWeight: 600, color: anyHardFail ? "#f87171" : "var(--accent2)", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                                      <span>{p.name || "—"}</span>
                                      {anyHardFail && (
                                        <span style={{ fontSize: 9, background: "rgba(248,113,113,0.18)", color: "#f87171", padding: "1px 7px", borderRadius: 4, fontWeight: 700, letterSpacing: "0.04em" }}>
                                          {t("HARD FLAG", "హార్డ్ ఫ్లాగ్")}
                                        </span>
                                      )}
                                    </div>
                                    <div className="muhurtha-detail-row">
                                      <span>{t("Tarabala", "తారాబల")}</span>
                                      <span className={p.tara_bala_good ? "muhurtha-pass" : "muhurtha-neutral"}>
                                        {p.tara_bala_name || "—"} ({p.tara_bala_num}/9){p.tara_bala_good ? " ✓" : ""}
                                      </span>
                                    </div>
                                    <div className="muhurtha-detail-row">
                                      <span>{t("Chandrabala", "చంద్రబల")}</span>
                                      <span className={p.chandrabala_good ? "muhurtha-pass" : "muhurtha-neutral"}>
                                        {p.chandrabala_num || "—"}/12{p.chandrabala_good ? " ✓" : ""}
                                      </span>
                                    </div>
                                    {p.chandrashtamam && (
                                      <div className="muhurtha-detail-row">
                                        <span style={{ color: "#f87171" }}>{t("Chandrashtamam", "చంద్రాష్టమం")}</span>
                                        <span className="muhurtha-fail">{t("ACTIVE — hard filter", "చురుకు — హార్డ్ ఫిల్టర్")}</span>
                                      </div>
                                    )}
                                    {p.janma_tara && (
                                      <div className="muhurtha-detail-row">
                                        <span style={{ color: "#f87171" }}>{t("Janma Tara", "జన్మ తార")}</span>
                                        <span className="muhurtha-fail">{t("ACTIVE — hard filter", "చురుకు — హార్డ్ ఫిల్టర్")}</span>
                                      </div>
                                    )}
                                    {/* PR A2.2c.2 — current DBA + Badhakesh/Marakesh */}
                                    {(p.current_md || p.current_ad) && (
                                      <div className="muhurtha-detail-row">
                                        <span>{t("Current DBA", "ప్రస్తుత దశ")}</span>
                                        <span style={{ color: "var(--accent2)" }}>
                                          MD: {p.current_md || "—"} · AD: {p.current_ad || "—"}
                                        </span>
                                      </div>
                                    )}
                                    {p.badhakesh_active && (
                                      <div className="muhurtha-detail-row">
                                        <span style={{ color: "#f87171" }}>{t("Badhakesh DBA", "బాధకేశ దశ")}</span>
                                        <span className="muhurtha-fail">{t("ACTIVE — hard filter", "చురుకు — హార్డ్ ఫిల్టర్")} ({p.badhakesh})</span>
                                      </div>
                                    )}
                                    {p.marakesh_active && (
                                      <div className="muhurtha-detail-row">
                                        <span style={{ color: "#f87171" }}>{t("Marakesh DBA", "మారకేశ దశ")}</span>
                                        <span className="muhurtha-fail">{t("ACTIVE — hard filter", "చురుకు — హార్డ్ ఫిల్టర్")}</span>
                                      </div>
                                    )}
                                    <div className="muhurtha-detail-row">
                                      <span>{t("Soft score contribution", "సాఫ్ట్ స్కోర్")}</span>
                                      <span style={{ color: p.soft_score >= 0 ? "#4ade80" : "#f87171", fontWeight: 600 }}>
                                        {p.soft_score >= 0 ? "+" : ""}{p.soft_score}
                                      </span>
                                    </div>
                                    {/* PR Mu3 — moment RPs × natal event significators
                                        (doctrine-correct multi-chart test). Shows
                                        which moment RPs ALSO signify the event
                                        houses in this person's natal chart. */}
                                    {Array.isArray(p.moment_rps) && p.moment_rps.length > 0 && (
                                      <>
                                        <div className="muhurtha-detail-row">
                                          <span>{t("Moment RPs", "మూమెంట్ RPs")}</span>
                                          <span style={{ color: "var(--muted)", fontSize: 10.5 }}>
                                            {p.moment_rps.join(", ")}
                                          </span>
                                        </div>
                                        <div className="muhurtha-detail-row">
                                          <span>{t("Natal event significators", "నేటల్ ఈవెంట్ సూచకులు")}</span>
                                          <span style={{ color: "var(--muted)", fontSize: 10.5 }}>
                                            {(p.natal_event_significators || []).join(", ") || "—"}
                                          </span>
                                        </div>
                                        <div className="muhurtha-detail-row" title={t(
                                            "Moment RPs ∩ natal event significators. KP-doctrine-correct multi-chart agreement signal.",
                                            "మూమెంట్ RPs ∩ నేటల్ ఈవెంట్ సూచకులు. KP సిద్ధాంత ప్రకారం బహుళ-చార్ట్ ఒప్పుదల.")}>
                                          <span style={{ fontWeight: 600 }}>{t("RP ∩ natal sigs", "RP ∩ నేటల్")}</span>
                                          <span className={p.rp_x_natal_count > 0 ? "muhurtha-pass" : "muhurtha-neutral"} style={{ fontWeight: 600 }}>
                                            {p.rp_x_natal_count || 0}/{p.moment_rps.length}
                                            {p.rp_x_natal_overlap && p.rp_x_natal_overlap.length > 0 && (
                                              <span style={{ marginLeft: 6, color: "var(--accent2)", fontWeight: 400, fontSize: 10 }}>
                                                ({p.rp_x_natal_overlap.join(", ")})
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}

              {/* ── PR A2.2d — Soft-Flagged Tier ──
                  Windows that hit a hard filter (participant
                  Chandrashtamam/Janma Tara, practical hours,
                  Lagna CSL denial, etc.) don't rank in the
                  main leaderboard — but the astrologer can
                  open this collapsed section to review them
                  and decide case-by-case. Matches the KB §8
                  three-tier result model. */}
              {mResults.soft_flagged_windows && mResults.soft_flagged_windows.length > 0 && (
                <details style={{
                  marginTop: 16,
                  padding: "0.75rem 1rem",
                  background: "rgba(251,191,36,0.04)",
                  border: "0.5px dashed rgba(251,191,36,0.25)",
                  borderRadius: 10,
                }}>
                  <summary style={{
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase" as const,
                    color: "#fbbf24",
                    listStyle: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}>
                    <TriangleAlert size={12} strokeWidth={2} color="#fbbf24" />
                    {t("Below threshold — astrologer review", "మీ సమీక్ష కోసం — థ్రెషోల్డ్ క్రింద")}
                    <span style={{ color: "var(--muted)", fontWeight: 500, letterSpacing: "normal", textTransform: "none" as const }}>
                      ({mResults.soft_flagged_windows.length})
                    </span>
                  </summary>
                  <div style={{ marginTop: 12, fontSize: 11, color: "var(--muted)", lineHeight: 1.5, marginBottom: 10 }}>
                    {t(
                      "These windows failed one or more hard filters (per KP §1/§2/§8). Shown for transparency; review each case before overriding.",
                      "ఈ సమయాలు హార్డ్ ఫిల్టర్లు విఫలమయ్యాయి (KP §1/§2/§8). పారదర్శకతకు చూపించబడ్డాయి; ఓవర్‌రైడ్ చేసే ముందు ప్రతిదాన్ని సమీక్షించండి."
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                    {/* Phase 4 / PR 10 — jargon tooltips on hard-filter
                        chips (#16) + Score tooltip (#17). The
                        reason strings come straight from the engine
                        and were opaque to non-power users; the lookup
                        below maps the most common patterns to a
                        one-line plain-English explanation, with a
                        sensible fallback for unknown reasons. */}
                    {(() => {
                      const reasonHelp = (raw: string): string => {
                        const s = (raw || "").toLowerCase();
                        if (s.includes("badhaka")) return t("The CSL or its star lord coincides with the Badhaka/Maraka house chain — Krishnamurti rejects this for any positive event.", "బాధక/మారక భావంతో అనుసంధానం — KP లో నిషిద్ధం");
                        if (s.includes("missing primary")) return t("The Lagna sub-lord does not signify the event's primary house. Without primary signification, no event can occur per KP §1.", "లగ్న ఉపనాథ ముఖ్య భావాన్ని సూచించడం లేదు — KP §1 ప్రకారం కుదరదు");
                        if (s.includes("missing h11"))     return t("Lagna sub-lord doesn't signify H11 (gain/fulfillment) — KP requires H11 confirmation for benefic events.", "H11 (లాభ) సూచన లేదు — KP §2 ప్రకారం అవసరం");
                        if (s.includes("retrograde"))      return t("A key signifying planet is retrograde — KP downgrades benefic results for the retrograde period.", "ముఖ్య గ్రహం వక్రం — ఫలితాలు తగ్గుతాయి");
                        if (s.includes("moon sl"))         return t("Moon's sub-lord opposes the event's KP requirements (moon represents the mind/promise).", "చంద్ర ఉపనాథ అనుకూలంగా లేదు");
                        if (s.includes("rahu kalam") || s.includes("yamaganda") || s.includes("gulika")) return t("Falls inside an inauspicious panchang window (Rahu Kalam / Yamaganda / Gulika).", "రాహుకాలం/యమగండం/గులిక లో పడుతుంది");
                        return t("KP hard filter — open the rule reference for this event before overriding.", "KP హార్డ్ ఫిల్టర్ — KP నియమావళి సంప్రదించి మాత్రమే ఓవర్‌రైడ్ చేయండి");
                      };
                      return mResults.soft_flagged_windows.slice(0, 25).map((sw: any, i: number) => {
                        const isOpen = softExpandedIdx === i;
                        const ev = sw.evidence_payload || {};
                        const adv = sw.advanced_doshas || {};
                        const po = sw.panchang_overlays || {};
                        const m13 = sw.mu13_overlays || {};
                        const breakdown = sw.confidence_breakdown || [];
                        return (
                        <div
                          key={i}
                          style={{
                            padding: "8px 10px",
                            background: isOpen ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.2)",
                            border: isOpen
                              ? "0.5px solid rgba(201,169,110,0.30)"
                              : "0.5px solid rgba(255,255,255,0.04)",
                            borderRadius: 6,
                            display: "flex",
                            flexDirection: "column" as const,
                            gap: 8,
                            cursor: "pointer",
                            transition: "background 140ms, border-color 140ms",
                          }}
                          onClick={() => setSoftExpandedIdx(isOpen ? null : i)}
                          title={t(
                            isOpen ? "Click to collapse" : "Click to view full ledger + evidence",
                            isOpen ? "క్లిక్ చేసి మూసివేయండి" : "క్లిక్ చేసి పూర్తి వివరాలు చూడండి"
                          )}
                        >
                          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, marginBottom: 2 }}>
                              {sw.date_display || sw.date} · {sw.start_time}–{sw.end_time}
                              <span style={{ marginLeft: 8, fontSize: 10, color: "var(--muted)" }}>
                                {isOpen ? "▾" : "▸"}
                              </span>
                            </div>
                            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>
                              Lagna {sw.lagna} · SL {sw.lagna_sublord} ·{" "}
                              <span
                                title={t(
                                  "Score 0–100. 80+ excellent · 60–80 acceptable · <60 typically hard-filtered out (shown here for transparency).",
                                  "స్కోర్ 0–100. 80+ అత్యుత్తమం · 60–80 ఆమోదయోగ్యం · <60 సాధారణంగా హార్డ్ ఫిల్టర్ చేయబడుతుంది."
                                )}
                                style={{ borderBottom: "1px dotted var(--muted)", cursor: "help" }}
                              >
                                Score {sw.score}
                              </span>
                              {typeof sw.confidence_score === "number" && (
                                <span style={{ marginLeft: 6, color: "var(--accent2)" }}>
                                  · Confidence {sw.confidence_score}/100
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                              {(sw.hard_rejected_for || []).map((r: string, ri: number) => (
                                <span
                                  key={ri}
                                  title={reasonHelp(r)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    fontSize: 10,
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    background: "rgba(248,113,113,0.12)",
                                    color: "#f87171",
                                    border: "0.5px solid rgba(248,113,113,0.25)",
                                    cursor: "help",
                                  }}
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                          </div>

                          {/* PR R3-PR2 — Expanded detail panel: full
                              ledger + Panchang + advanced doshas + Mu13
                              + evidence_payload. Click stops propagation
                              on inner elements so users can highlight
                              text without collapsing the panel. */}
                          {isOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                paddingTop: 8,
                                borderTop: "0.5px dashed rgba(201,169,110,0.20)",
                                display: "flex",
                                flexDirection: "column" as const,
                                gap: 10,
                                fontSize: 11,
                                color: "var(--muted)",
                                lineHeight: 1.55,
                                cursor: "default",
                              }}
                            >
                              {/* Confidence breakdown ledger */}
                              {breakdown.length > 0 && (
                                <div>
                                  <div style={{ color: "var(--accent)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 4 }}>
                                    {t("Confidence breakdown", "విశ్వాస విభజన")}
                                  </div>
                                  {breakdown.map((b: any, bi: number) => (
                                    <div key={bi} style={{ display: "flex", justifyContent: "space-between", paddingLeft: 6 }}>
                                      <span>{b.factor?.replace(/_/g, " ")}{b.note ? <span style={{ opacity: 0.6, fontStyle: "italic" as const }}> · {b.note}</span> : null}</span>
                                      <span style={{ color: b.delta > 0 ? "#4ade80" : b.delta < 0 ? "#f87171" : "var(--muted)", fontWeight: 600, marginLeft: 8, whiteSpace: "nowrap" as const }}>
                                        {b.delta > 0 ? "+" : ""}{b.delta}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Panchang overlays + Day muhurta */}
                              <div>
                                <div style={{ color: "var(--accent)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 4 }}>
                                  {t("Panchang context", "పంచాంగ సందర్భం")}
                                </div>
                                {sw.panchang?.tithi && <div>{t("Tithi", "తిథి")}: {sw.panchang.paksha} {sw.panchang.tithi} ({sw.panchang.tithi_num})</div>}
                                {sw.panchang?.nakshatra && <div>{t("Nakshatra", "నక్షత్రం")}: {sw.panchang.nakshatra} · {t("Yoga", "యోగం")}: {sw.panchang.yoga}</div>}
                                {m13.day_muhurta_name && <div>{t("Day muhurta", "దిన ముహూర్తం")}: {m13.day_muhurta_name} ({m13.day_muhurta_idx + 1}/15)</div>}
                                {po.amrit_active && <div style={{ color: "#4ade80" }}>✓ {t("Inside Amrit Kala (+20)", "అమృత కాలంలో (+20)")}</div>}
                                {po.varjyam_active && <div style={{ color: "#f87171" }}>✗ {t("Inside Varjyam (-25)", "వర్జ్యంలో (-25)")}</div>}
                                {po.panchaka_blocks_event && <div style={{ color: "#f87171" }}>✗ {t("Panchaka blocks this event", "పంచక ఈవెంట్‌ను నిషేధిస్తుంది")} ({po.panchaka_subtype || "?"})</div>}
                                {sw.in_sutak && <div style={{ color: "#f87171" }}>✗ {t("Inside Sutak (eclipse impurity)", "సుతక్‌లో")} — {sw.sutak_eclipse?.type} {sw.sutak_eclipse?.eclipse_kind}</div>}
                              </div>

                              {/* Advanced doshas */}
                              {(adv.bhadra_part || adv.in_sandhya || adv.mrityu_yoga_active || adv.dagdha_tithi_active) && (
                                <div>
                                  <div style={{ color: "var(--accent)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 4 }}>
                                    {t("Advanced doshas", "అడ్వాన్స్‌డ్ దోషాలు")}
                                  </div>
                                  {adv.bhadra_part === "face" && <div style={{ color: "#f87171" }}>Bhadra FACE (-60)</div>}
                                  {adv.bhadra_part === "middle" && <div>Bhadra middle (-30)</div>}
                                  {adv.bhadra_part === "tail" && <div style={{ color: "#fbbf24" }}>Bhadra TAIL (-10) — often acceptable</div>}
                                  {adv.in_sandhya && <div style={{ color: "#f87171" }}>Sandhya {adv.sandhya_kind} (-50)</div>}
                                  {adv.mrityu_yoga_active && <div style={{ color: "#f87171" }}>Mrityu Yoga active{adv.mrityu_yoga_hard ? " — hard reject for this event" : " (soft)"}</div>}
                                  {adv.dagdha_tithi_active && <div style={{ color: "#f87171" }}>Dagdha tithi for Sun-sign</div>}
                                </div>
                              )}

                              {/* Evidence payload — verify by hand */}
                              {ev.sunrise_hhmm && (
                                <div>
                                  <div style={{ color: "var(--accent)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 4 }}>
                                    {t("Verify by hand (evidence)", "స్వయంగా ధృవీకరించండి")}
                                  </div>
                                  <div>{t("Sunrise", "సూర్యోదయం")}: {ev.sunrise_hhmm} · {t("Sunset", "సూర్యాస్తమయం")}: {ev.sunset_hhmm}</div>
                                  <div>RK: {ev.rahu_kalam_hhmm} · YG: {ev.yamagandam_hhmm} · GL: {ev.gulika_hhmm}</div>
                                  {ev.abhijit_hhmm && <div>Abhijit: {ev.abhijit_hhmm}</div>}
                                  {Array.isArray(ev.cusp_longitudes_deg) && (
                                    <div style={{ marginTop: 2, fontSize: 10 }}>
                                      Cusps: H1={ev.cusp_longitudes_deg[0]?.toFixed(2)}° H7={ev.cusp_longitudes_deg[6]?.toFixed(2)}° H10={ev.cusp_longitudes_deg[9]?.toFixed(2)}° H11={ev.cusp_longitudes_deg[10]?.toFixed(2)}°
                                    </div>
                                  )}
                                  {ev.planet_positions?.Sun && ev.planet_positions?.Moon && (
                                    <div style={{ marginTop: 2, fontSize: 10 }}>
                                      Sun {ev.planet_positions.Sun.lon_deg?.toFixed(2)}° {ev.planet_positions.Sun.sign} · Moon {ev.planet_positions.Moon.lon_deg?.toFixed(2)}° {ev.planet_positions.Moon.sign} ({ev.planet_positions.Moon.nakshatra})
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        );
                      });
                    })()}
                    {mResults.soft_flagged_windows.length > 25 && (
                      <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "center" as const, paddingTop: 4, fontStyle: "italic" as const }}>
                        +{mResults.soft_flagged_windows.length - 25} {t("more soft-flagged windows not shown", "మరిన్ని సాఫ్ట్-ఫ్లాగ్ చేయబడిన సమయాలు చూపబడలేదు")}
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* ── D. AI ANALYSIS SECTION ── */}
              <div className="muhurtha-ai-section">
                <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "0.75rem", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <Sparkles size={12} strokeWidth={1.8} />
                  {t("AI muhurtha analysis", "AI ముహూర్తం విశ్లేషణ")}
                </div>

                {/* Topic pills */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: "1rem" }}>
                  {[
                    { labelEn: "Best muhurtha",  labelTe: "ఉత్తమ ముహూర్తం",  q: "Which is the single best muhurtha and why? Explain the KP reasoning in detail." },
                    { labelEn: "Why this time?", labelTe: "ఎందుకు ఈ సమయం?", q: "Explain why the top-scored window is the best choice, covering all KP factors — Lagna SL, Badhaka, Event Cusp CSL, H11, Moon, and Panchang." },
                    { labelEn: "Compare top 3",  labelTe: "మొదటి 3 పోల్చండి", q: "Compare the top 3 muhurtha windows side by side — pros and cons of each using KP analysis." },
                    { labelEn: "Alternatives",   labelTe: "ప్రత్యామ్నాయాలు",  q: "What if the top windows don't work schedule-wise? What alternatives exist and what compromises would be made?" },
                    { labelEn: "Remedies",       labelTe: "పరిహారాలు",        q: "What remedies or precautions should be taken if using a less-than-excellent muhurtha window?" },
                  ].map((pill, idx) => (
                    <button key={idx} onClick={() => handleMuhurthaAiAsk(pill.q, true)} disabled={mAiLoading}
                      className="muhurtha-ai-pill">
                      {lang === "en" ? pill.labelEn : pill.labelTe}
                    </button>
                  ))}
                </div>

                {/* Chat messages */}
                {mAiMessages.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem", maxHeight: 500, overflowY: "auto" as const }}>
                    {mAiMessages.map((msg, idx) => (
                      <div key={idx}>
                        <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 4, fontWeight: 500 }}>
                          {msg.isTopic ? msg.q : `${t("Q", "ప్ర")}: ${msg.q}`}
                        </div>
                        <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "1rem", border: "0.5px solid var(--border)" }}>
                          <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.a}</ReactMarkdown></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Loading */}
                {mAiLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 12, padding: "0.75rem 0" }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                    {t("Analyzing muhurtha…", "ముహూర్తం విశ్లేషిస్తున్నాం…")}
                  </div>
                )}

                {/* Chat input */}
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={mAiQuestion} onChange={e => setMAiQuestion(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleMuhurthaAiAsk(mAiQuestion)}
                    placeholder={t("Ask a question about the muhurtha…", "ముహూర్తం గురించి ప్రశ్న అడగండి…")}
                    style={{ flex: 1, background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit" }} />
                  <button onClick={() => handleMuhurthaAiAsk(mAiQuestion)} disabled={mAiLoading || !mAiQuestion.trim()}
                    style={{ background: mAiQuestion.trim() ? "var(--accent)" : "var(--surface2)", color: mAiQuestion.trim() ? "#09090f" : "var(--muted)", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 500, cursor: mAiQuestion.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
                    {t("Ask", "అడగు")}
                  </button>
                </div>
              </div>

              {/* Search different dates */}
              <button onClick={() => { setMStep(2); setMResults(null); setMExpandedWindow(null); setMSelectedDate(null); setMAiMessages([]); }}
                style={{ padding: "10px", background: "transparent", border: "0.5px solid var(--border2)", borderRadius: 8, color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {t("Search different dates", "వేరే తేదీలు వెతకండి")} →
              </button>
            </div>
            );
          })()}

          {!mLoading && !mResults && (
            <div style={{ textAlign: "center" as const, padding: "2rem", color: "#f87171", fontSize: 13 }}>
              {t("Could not load muhurthas. Please try again.", "ముహూర్తాలు లోడ్ చేయడంలో సమస్య. మళ్ళీ ప్రయత్నించండి.")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
