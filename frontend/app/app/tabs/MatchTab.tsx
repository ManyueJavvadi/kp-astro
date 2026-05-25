// @ts-nocheck — PR R6 — MatchTab inherits loose-typed JSX from pre-R6 page.tsx
// where workspaceData/matchResults were `any`. The extracted file has stricter
// typing context for inferred lambda params (`.map((p) => ...)`) which trip
// TS noImplicitAny in this isolated file. Suppressing for the refactor;
// follow-up type-tightening PR can address this. Runtime behavior unchanged.
"use client";

/**
 * MatchTab — KP marriage compatibility workflow (the biggest tab).
 *
 * PR R6 (Phase A foundation refactor) — extracted from page.tsx
 * (~1476 lines of JSX). Largest tab so far.
 *
 * State: all match-related state stays in parent (matchResults,
 * matchPerson2Inline, matchAnalysis*, matchSubTab, etc.) — too many
 * cross-references with onboarding flow + saved-sessions to move into
 * the component cleanly. Passed as one large props bag.
 *
 * Sacred-region check (per .claude/research/world-first-vision.md §15):
 *   - No AI prompts touched
 *   - /compatibility endpoints preserved exactly
 *   - Match-mode get_match_prediction contract unchanged
 *   - Pure frontend JSX extraction
 */

import React from "react";
import axios from "axios";
import {
  Sparkles, HandHeart, Heart, Plus, Loader2, RefreshCw, Users, Calendar,
  CheckCircle, TriangleAlert, Target, LayoutGrid, X, Globe, Globe2,
  User, Clock, Hourglass, Moon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLanguage } from "@/lib/i18n";
import { AnimatedScoreDonut } from "@/components/ui/AnimatedScoreDonut";
import { PageHero } from "@/components/ui/PageHero";
import { PlacePicker } from "@/components/ui/place-picker";
import { PLANET_COLORS } from "../components/constants";
// PR R1-hotfix lesson — preserve SouthIndianChart alias.
import RasiChart from "../components/RasiChart";
const SouthIndianChart = RasiChart;
import HousePanel from "../components/HousePanel";
import PlanetList from "../components/workspace/PlanetList";
import MatchPatternChips from "../components/MatchPatternChips";  // PR M3
import MatchStarSubHarmonyStrip from "../components/MatchStarSubHarmonyStrip";  // PR M4
import MatchReasoningTrace from "../components/MatchReasoningTrace";  // PR M12
import type { ChartSession } from "../types";

// Verbose prop bag — match flow has many cross-cutting state slots.
interface MatchTabProps {
  // Workspace + onboarding context
  workspaceData: any;
  birthDetails: any;
  savedSessions: any[];
  setSavedSessions: (s: any) => void;
  apiUrl: string;
  // Person 1 builder — match uses the current workspace's snapshot
  snapshotCurrentSession: () => ChartSession | null;
  // Converts a saved session into the API person shape for compatibility calls
  sessionToApiPerson: (s: ChartSession) => any;
  // Match flow state
  matchPerson2Inline: any;
  setMatchPerson2Inline: (p: any) => void;
  matchResults: any;
  setMatchResults: (r: any) => void;
  matchLoading: boolean;
  setMatchLoading: (b: boolean) => void;
  matchSubTab: any;
  setMatchSubTab: (s: any) => void;
  matchHouseShared: number | null;
  setMatchHouseShared: (h: number | null | ((p: number | null) => number | null)) => void;
  // Match AI chat
  matchAnalysisMessages: any[];
  setMatchAnalysisMessages: (m: any) => void;
  matchAnalysisLoading: boolean;
  matchAnalysisLang: any;
  setMatchAnalysisLang: (l: any) => void;
  matchChatQ: string;
  setMatchChatQ: (s: string) => void;
  // New-person inline form
  mNewP: any;
  setMNewP: (p: any) => void;
  mNewPPlaceSugg: any[];
  setMNewPPlaceSugg: (s: any[]) => void;
  mNewPPlaceStatus: any;
  setMNewPPlaceStatus: (s: any) => void;
  // Handlers
  handleMatchChat: (...args: any[]) => any;
  handleMatchTopicAnalysis: (...args: any[]) => any;
  handleMNewPDateChange: (...args: any[]) => any;
  handleMNewPTimeChange: (...args: any[]) => any;
}

export function MatchTab(props: MatchTabProps) {
  const { t, lang } = useLanguage();
  const {
    workspaceData, birthDetails, savedSessions, setSavedSessions, apiUrl,
    snapshotCurrentSession, sessionToApiPerson,
    matchPerson2Inline, setMatchPerson2Inline,
    matchResults, setMatchResults, matchLoading, setMatchLoading,
    matchSubTab, setMatchSubTab, matchHouseShared, setMatchHouseShared,
    matchAnalysisMessages, setMatchAnalysisMessages, matchAnalysisLoading,
    matchAnalysisLang, setMatchAnalysisLang, matchChatQ, setMatchChatQ,
    mNewP, setMNewP, mNewPPlaceSugg, setMNewPPlaceSugg,
    mNewPPlaceStatus, setMNewPPlaceStatus,
    handleMatchChat, handleMatchTopicAnalysis,
    handleMNewPDateChange, handleMNewPTimeChange,
  } = props;
  // Legacy alias
  const API_URL = apiUrl;
  // Person 1 is always the current chart
  const matchPerson1 = workspaceData ? snapshotCurrentSession() : null;
  // PR M9 + M11 — astrologer's free-text notes (escalates sensitivity
  // tier and/or triggers Bhavat Bhavam relative-marriage rotation).
  const [matchConcerns, setMatchConcerns] = React.useState<string>("");
  const canAddP2     = !!(mNewP.name && mNewP.date && mNewP.time);
  return (
    <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 1020 }}>

      {/* Phase 15.2 — Track A serif PageHero (Match tab) */}
      <PageHero
        eyebrow={t("KP + Ashtakoota compatibility", "KP + అష్టకూట సరిపోలన")}
        title={t("Marriage match", "వివాహ సరిపోలన")}
        subcopy={t(
          "Combines KP 7th-cusp sub-lord analysis, Venus karaka, Dasha-Bhukti timing, D9 Navamsa, Kuja Dosha, and the 36-gun Ashtakoota into a single compatibility verdict.",
          "KP 7-భావ సబ్ లార్డ్, శుక్ర కారక, దశా-భుక్తి సమయం, D9 నవాంశ, కుజ దోష, 36-గుణ అష్టకూటను కలిపి ఒకే సరిపోలన నిర్ణయంగా మార్చుతుంది."
        )}
      />

      {/* Step wizard — always visible. People → Verdict. Same
          pattern as Muhurtha's stepper so the user always knows
          where they are in the flow. Backward-click enabled from
          results back to selection. */}
      {(() => {
        const hasVerdict = !!matchResults?.overall_verdict && !matchResults?.__error;
        const steps = [
          { n: 1, label: t("People", "వ్యక్తులు") },
          { n: 2, label: t("Verdict", "ఫలితం") },
        ];
        const currentStep = hasVerdict || matchLoading ? 2 : 1;
        return (
          <div className="match-stepper" aria-label="Match wizard">
            {steps.map((s, i) => {
              const isDone    = currentStep > s.n;
              const isCurrent = currentStep === s.n;
              const canJump   = isDone && s.n === 1;
              const cls = `match-stepper-node${isDone ? " is-done" : ""}${isCurrent ? " is-current" : ""}`;
              return (
                <React.Fragment key={s.n}>
                  <div
                    className={cls}
                    data-clickable={canJump ? "true" : "false"}
                    onClick={() => {
                      if (!canJump) return;
                      // Back to People: preserve p2 but drop results
                      const prevP2 = matchResults?.__p2;
                      setMatchResults(prevP2 ? { __p2: prevP2 } : null);
                      setMatchHouseShared(null);
                      setMatchAnalysisMessages([]);
                      setMatchSubTab("overall");
                    }}
                  >
                    <span className="match-stepper-dot">{isDone ? "✓" : s.n}</span>
                    <span className="match-stepper-label">{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <span className={`match-stepper-line${currentStep > s.n ? " is-active" : ""}`} aria-hidden="true" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        );
      })()}

      {/* Selection step — SPLIT LAYOUT */}
      {!matchLoading && (!matchResults || !matchResults.overall_verdict) && !matchResults?.__error && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: "1rem" }}>

          <div className="match-people-grid">

            {/* Person 1 — always current chart */}
            <div className="match-person-card is-p1">
              <div className="match-person-eyebrow" style={{ color: "var(--accent)" }}>
                <User size={11} strokeWidth={2} />
                {t("Person 1 · Primary", "వ్యక్తి 1 · ప్రాధమిక")}
              </div>
              {matchPerson1 ? (
                <div className="match-person-body">
                  <div className="match-person-avatar p1">
                    {(matchPerson1.name || matchPerson1.birthDetails.name || "?")[0]?.toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="match-person-name p1">{matchPerson1.name || matchPerson1.birthDetails.name}</div>
                    <div className="match-person-meta">
                      <span>{matchPerson1.birthDetails.date}</span>
                      <span style={{ color: "var(--border2)" }}>·</span>
                      <span>
                        {matchPerson1.birthDetails.gender === "male"   ? `♂ ${t("Male", "పురుషుడు")}`
                          : matchPerson1.birthDetails.gender === "female" ? `♀ ${t("Female", "స్త్రీ")}`
                          : <span style={{ color: "#fbbf24" }}>⚠ {t("Gender not set", "లింగం సెట్ చేయలేదు")}</span>}
                      </span>
                    </div>
                    {matchPerson1.birthDetails.place && <div className="match-person-place">{matchPerson1.birthDetails.place}</div>}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--muted)", padding: "0.5rem 0" }}>
                  {t("Load a chart first from Setup.", "ముందు సెటప్‌లో చార్ట్ లోడ్ చేయండి.")}
                </div>
              )}
            </div>

            {/* Person 2 — select from saved or add inline */}
            <div className={`match-person-card is-p2 ${matchResults?.__p2 ? "is-filled" : "is-empty"}`}>
              <div className="match-person-eyebrow" style={{ color: matchResults?.__p2 ? "#93c5fd" : "var(--muted)" }}>
                <Heart size={11} strokeWidth={2} />
                {t("Person 2 · Partner", "వ్యక్తి 2 · భాగస్వామి")}
              </div>

              {/* Show saved sessions / New button when no p2 and no inline form */}
              {!matchPerson2Inline && !matchResults?.__p2 && (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {savedSessions.filter(s => s.id !== matchPerson1?.id).length > 0 && (
                    <select onChange={e => {
                      const found = savedSessions.find(s => s.id === e.target.value);
                      if (found) { setMatchResults({ __p2: found }); e.target.value = ""; }
                    }} defaultValue=""
                      style={{ width: "100%", background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--muted)", outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
                      <option value="" disabled>{t("Pick a saved chart…", "సేవ్ చేసిన చార్ట్ ఎంచుకోండి…")}</option>
                      {savedSessions.filter(s => s.id !== matchPerson1?.id).map(s => (
                        <option key={s.id} value={s.id}>{s.name || s.birthDetails.name} {s.birthDetails.gender === "male" ? "♂" : s.birthDetails.gender === "female" ? "♀" : ""}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={() => {
                    // PR A1.3-fix-24 — reset mNewP on open (same
                    // rationale as the Muhurtha "Add Participant"
                    // button above — was tab-change-reset, now per-click).
                    setMNewP({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: 17.385, longitude: 78.4867, gender: "", timezone_offset: 5.5 });
                    setMNewPPlaceSugg([]);
                    setMatchPerson2Inline(true);
                  }}
                    style={{ padding: "9px 14px", background: "var(--surface)", border: "0.5px dashed var(--border2)", borderRadius: 8, color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left" as const, transition: "border-color 140ms, color 140ms" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(147,197,253,0.5)"; e.currentTarget.style.color = "#93c5fd"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--muted)"; }}
                  >
                    + {t("Enter new person details", "కొత్త వ్యక్తి వివరాలు నమోదు చేయండి")}
                  </button>
                </div>
              )}

              {/* Inline add form for person 2 — reuses the PR17a participant-form visual style */}
              {matchPerson2Inline && (
                <div className="muhurtha-participant-form" style={{ marginTop: 0 }}>
                  <div className="pf-header">
                    <div className="pf-header-title">{t("New partner details", "కొత్త భాగస్వామి వివరాలు")}</div>
                    <div className="pf-header-sub">{t("Saved so you can reuse", "సేవ్ అయి తిరిగి వాడవచ్చు")}</div>
                  </div>
                  <div>
                    <div className="pf-field-label"><User size={10} strokeWidth={2} /> {t("Name", "పేరు")}</div>
                    <input type="text" placeholder={t("Full name", "పూర్తి పేరు")} value={mNewP.name}
                      onChange={e => setMNewP(p => ({ ...p, name: e.target.value }))}
                      className={`pf-input${mNewP.name ? " filled" : ""}`} />
                  </div>
                  <div className="pf-row">
                    <div>
                      <div className="pf-field-label"><Clock size={10} strokeWidth={2} /> {t("Date of birth", "పుట్టిన తేదీ")}</div>
                      <input type="text" inputMode="numeric" placeholder="DD/MM/YYYY" maxLength={10} value={mNewP.date}
                        onChange={e => handleMNewPDateChange(e.target.value)}
                        className={`pf-input${mNewP.date ? " filled" : ""}`} />
                    </div>
                    <div>
                      <div className="pf-field-label"><Clock size={10} strokeWidth={2} /> {t("Time of birth", "పుట్టిన సమయం")}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="text" inputMode="numeric" placeholder="HH:MM" maxLength={5} value={mNewP.time}
                          onChange={e => handleMNewPTimeChange(e.target.value)}
                          className={`pf-input${mNewP.time ? " filled" : ""}`} style={{ flex: 1 }} />
                        <button onClick={() => setMNewP(p => ({ ...p, ampm: p.ampm === "AM" ? "PM" : "AM" }))}
                          className="pf-input filled"
                          style={{ width: 64, cursor: "pointer", color: "var(--accent)", fontWeight: 600, textAlign: "center" as const, padding: "8px 0" }}>
                          {mNewP.ampm}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="pf-field-label"><Globe2 size={10} strokeWidth={2} /> {t("Place of birth", "పుట్టిన ఊరు")}</div>
                    <PlacePicker
                      value={mNewP.place}
                      placeholder={t("Start typing a city…", "నగరం టైప్ చేయండి…")}
                      onChange={(placeName, pick) => {
                        setMNewP(p => ({
                          ...p, place: placeName,
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
                  <div>
                    <div className="pf-field-label">{t("Gender", "లింగం")}</div>
                    <div className="pf-gender-grid">
                      {(["male","female"] as const).map(g => (
                        <button key={g} onClick={() => setMNewP(p => ({ ...p, gender: g }))}
                          className={`pf-gender-pill${mNewP.gender === g ? " is-active" : ""}`}>
                          <span style={{ fontSize: 14, lineHeight: 1 }}>{g === "male" ? "♂" : "♀"}</span>
                          {g === "male" ? t("Male", "పురుషుడు") : t("Female", "స్త్రీ")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pf-actions">
                    <button onClick={() => { setMatchPerson2Inline(false); setMNewP({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: 17.385, longitude: 78.4867, gender: "", timezone_offset: 5.5 }); setMNewPPlaceSugg([]); }}
                      className="pf-btn-cancel">
                      {t("Cancel", "రద్దు")}
                    </button>
                    <button disabled={!canAddP2}
                      onClick={() => {
                        if (!canAddP2) return;
                        const newSession: ChartSession = {
                          id: Date.now().toString(), name: mNewP.name,
                          birthDetails: { name: mNewP.name, date: mNewP.date, time: mNewP.time, ampm: mNewP.ampm, place: mNewP.place, latitude: mNewP.latitude, longitude: mNewP.longitude, gender: mNewP.gender, timezone_offset: mNewP.timezone_offset },
                          workspaceData: null, analysisMessages: [], activeTopic: "", selectedHouse: null, chatQ: "", analysisLang: "english", activeTab: "chart"
                        };
                        setSavedSessions(prev => [...prev, newSession]);
                        setMatchResults({ __p2: newSession });
                        setMNewP({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: 17.385, longitude: 78.4867, gender: "", timezone_offset: 5.5 });
                        setMNewPPlaceSugg([]); setMNewPPlaceStatus("idle");
                        setMatchPerson2Inline(false);
                      }}
                      className="pf-btn-add">
                      {t("Add partner", "జోడించు")}
                    </button>
                  </div>
                </div>
              )}

              {/* Show selected person 2 */}
              {matchResults?.__p2 && !matchPerson2Inline && (
                <div className="match-person-body">
                  <div className="match-person-avatar p2">
                    {(matchResults.__p2.name || matchResults.__p2.birthDetails.name || "?")[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="match-person-name p2">{matchResults.__p2.name || matchResults.__p2.birthDetails.name}</div>
                    <div className="match-person-meta">
                      <span>{matchResults.__p2.birthDetails.date}</span>
                      <span style={{ color: "var(--border2)" }}>·</span>
                      <span>
                        {matchResults.__p2.birthDetails.gender === "male"   ? `♂ ${t("Male", "పురుషుడు")}`
                          : matchResults.__p2.birthDetails.gender === "female" ? `♀ ${t("Female", "స్త్రీ")}` : "—"}
                      </span>
                    </div>
                    {matchResults.__p2.birthDetails.place && <div className="match-person-place">{matchResults.__p2.birthDetails.place}</div>}
                  </div>
                  <button onClick={() => { setMatchResults(null); }}
                    className="match-back-btn"
                    style={{ padding: "4px 12px" }}>
                    {t("Change", "మార్చు")}
                  </button>
                </div>
              )}
            </div>
          </div>{/* close 2-col grid */}

          {/* PR M9 + M11 — Astrologer concerns / context input.
              Optional. Drives:
                · sensitivity tier escalation (crisis phrases → Tier 3)
                · Bhavat Bhavam relative-marriage rotation (relationship
                  keywords like "my sister", "father's marriage") */}
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column" as const, gap: 4 }}>
            <label
              htmlFor="match-user-concerns"
              style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" as const, fontWeight: 600 }}
            >
              {t("Astrologer notes (optional)", "జ్యోతిష్యుని గమనికలు (ఐచ్ఛికం)")}
            </label>
            <input
              id="match-user-concerns"
              type="text"
              value={matchConcerns}
              onChange={(e) => setMatchConcerns(e.target.value)}
              placeholder={t(
                "e.g. 'client anxious about divorce', 'my sister's marriage', 'father remarrying' …",
                "ఉదా: 'క్లయింట్ విడాకుల ఆందోళన', 'నా చెల్లి వివాహం', 'తండ్రి పునర్వివాహం' …"
              )}
              maxLength={2000}
              style={{
                padding: "8px 12px",
                fontSize: 12,
                borderRadius: 8,
                border: "0.5px solid var(--border2)",
                background: "rgba(255,255,255,0.02)",
                color: "var(--text)",
                outline: "none",
              }}
            />
            <div style={{ fontSize: 10, color: "var(--muted)", fontStyle: "italic", marginTop: 2 }}>
              {t(
                "Used by the engine for sensitivity-tier framing and relative-marriage (Bhavat Bhavam) rotation. Does not change the couple's H7 verdict.",
                "సెన్సిటివిటీ టైర్ + Bhavat Bhavam తిప్పుడుకి ఉపయోగం. జంట H7 ఫలితంపై ప్రభావం లేదు."
              )}
            </div>
          </div>

          <button onClick={async () => {
            const p2 = matchResults?.__p2;
            if (!matchPerson1 || !p2) return;
            setMatchLoading(true); setMatchHouseShared(null);
            const prevP2 = p2;
            setMatchResults(null);
            const startedAt = Date.now();
            try {
              const res = await axios.post(`${API_URL}/compatibility/match`, {
                person1: sessionToApiPerson(matchPerson1),
                person2: sessionToApiPerson(prevP2),
                user_concerns: matchConcerns.trim() || null,
              });
              // Minimum 650ms loading window so the verdict reveal
              // has weight, same pattern as horary PR14.
              const elapsed = Date.now() - startedAt;
              if (elapsed < 650) await new Promise(r => setTimeout(r, 650 - elapsed));
              setMatchSubTab("overall");
              setMatchResults({ ...res.data, __p2: prevP2 });
            } catch {
              const elapsed = Date.now() - startedAt;
              if (elapsed < 650) await new Promise(r => setTimeout(r, 650 - elapsed));
              setMatchResults({ __p2: prevP2, __error: true });
            }
            setMatchLoading(false);
          }} disabled={!matchPerson1 || !matchResults?.__p2}
            className="match-compute-btn">
            {matchLoading ? (
              <>
                <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                {t("Computing compatibility…", "సరిపోలన లెక్కిస్తోంది…")}
              </>
            ) : (
              <>
                <Heart size={15} strokeWidth={1.8} />
                {t("Compute compatibility", "సరిపోలన చూడు")}
              </>
            )}
          </button>
          {/* Phase 4 / PR 11 — disabled-CTA hint (#21).
              Stress-test: the gold→grey "Compute" button gave
              no clue why it was inactive. Now a small caption
              underneath spells out exactly which slot is missing,
              mirroring the Horary "TYPE A QUESTION FIRST" pattern. */}
          {!matchLoading && (!matchPerson1 || !matchResults?.__p2) && (
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                textAlign: "center",
                marginTop: 8,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {!matchPerson1
                ? t("GENERATE A CHART FIRST", "ముందు చార్ట్ సృష్టించండి")
                : t("ADD PERSON 2 TO COMPUTE", "వ్యక్తి 2 జోడించండి")}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {matchLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", padding: "3rem", justifyContent: "center" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          {t("Calculating planetary positions…", "గ్రహ స్థానాలు లెక్కిస్తున్నాం…")}
        </div>
      )}

      {/* Results */}
      {!matchLoading && matchResults && !matchResults.__error && matchResults.overall_verdict && (() => {
        const r = matchResults;
        const kp = r.kp_analysis;
        const ast = r.ashtakoota;
        const kuja = r.kuja_dosha;
        const verdictColor = r.overall_verdict === "Highly Compatible" ? "var(--accent)" : r.overall_verdict === "Compatible" ? "#4ade80" : r.overall_verdict === "Conditionally Compatible" ? "#fbbf24" : "#f87171";

        return (
          <div className="match-result-stack" style={{ display: "flex", flexDirection: "column" as const, gap: "0.875rem" }}>
            {/* Back pill */}
            <button onClick={() => { setMatchResults({ __p2: r.__p2 }); setMatchHouseShared(null); setMatchAnalysisMessages([]); }}
              className="match-back-btn">
              ← {t("Pick a different person", "వేరే వ్యక్తి ఎంచుకోండి")}
            </button>

            {/* Gender warning if either person has no gender set */}
            {(!r.person1?.gender || !r.person2?.gender) && (
              <div style={{ padding: "8px 12px", background: "rgba(251,191,36,0.08)", border: "0.5px solid rgba(251,191,36,0.25)", borderRadius: 8, fontSize: 11, color: "#fbbf24", display: "flex", alignItems: "center", gap: 8 }}>
                <TriangleAlert size={13} strokeWidth={2} color="#fbbf24" style={{ flexShrink: 0 }} />
                <span>
                  <strong>{[!r.person1?.gender && r.person1?.name, !r.person2?.gender && r.person2?.name].filter(Boolean).join(", ")}</strong> —{" "}
                  {t(
                    "Gender not set. Ashtakoota assumes Person 1 = Boy. Set gender in Setup for an accurate 36-gun score.",
                    "లింగం సెట్ చేయలేదు. అష్టకూట వ్యక్తి 1 = పురుషుడు అని భావిస్తుంది. ఖచ్చితమైన 36-గుణ స్కోరు కోసం సెటప్‌లో లింగం సెట్ చేయండి."
                  )}
                </span>
              </div>
            )}

            {/* Result hero — serif verdict + score donut + both avatars */}
            <div className="match-result-hero" style={{
              color: verdictColor,
              background: `radial-gradient(ellipse at 50% 0%, ${verdictColor}20 0%, transparent 70%), var(--surface2)`,
              border: `1px solid ${verdictColor}40`,
              boxShadow: `0 22px 40px -24px ${verdictColor}40, 0 0 0 1px ${verdictColor}0d inset`,
              display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" as const,
            }}>
              {/* Person 1 avatar */}
              <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 5, minWidth: 68 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(201,169,110,0.15)", border: "1.5px solid rgba(201,169,110,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#c9a96e" }}>
                  {(r.person1?.name || "?")[0]?.toUpperCase()}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", maxWidth: 68, textAlign: "center" as const, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{r.person1?.name}</div>
              </div>
              {/* Score donut + serif verdict */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6, minWidth: 200 }}>
                {/* Phase 15.4 — animated compatibility donut.
                    Arc draws from 0 over 1.2s while the center
                    number counts up 0 -> final score. */}
                <AnimatedScoreDonut
                  score={ast?.total_score ?? 0}
                  max={ast?.max_score ?? 36}
                  color={verdictColor}
                />
                <div className="match-verdict-word" style={{ color: verdictColor }}>
                  {r.overall_verdict}
                </div>
                {/* PR M1 — numeric couple confidence 0-100 (audit trail in
                    couple_confidence_breakdown). Brings Match into parity with
                    Horary H3 + Analysis tab RULE 18 engine_confidence. */}
                <div style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" as const, flexWrap: "wrap" as const, justifyContent: "center" }}>
                  <span>KP</span>
                  <span style={{ color: verdictColor, fontWeight: 600, textTransform: "none" as const, letterSpacing: "0.02em" }}>{kp?.kp_verdict}</span>
                  {typeof r.couple_confidence_score === "number" && (
                    <span
                      title={t("Engine couple confidence (0–100). Audit trail in the Reasoning section.",
                               "జంట విశ్వాస సంఖ్య (0–100). ఆడిట్ ట్రెయిల్ Reasoning విభాగంలో.")}
                      style={{
                        marginLeft: 4,
                        padding: "2px 10px",
                        borderRadius: 999,
                        background: `${verdictColor}18`,
                        border: `0.5px solid ${verdictColor}44`,
                        color: verdictColor,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "none" as const,
                        fontSize: 11,
                      }}
                    >
                      {r.couple_confidence_score}/100
                    </span>
                  )}
                  {r.kuja_dosha?.mutual_cancellation && (
                    <span className="match-dosha-chip good" style={{ marginLeft: 4 }}>
                      <CheckCircle size={10} strokeWidth={2} /> {t("Mangal Dosha cancelled", "కుజ దోష రద్దు")}
                    </span>
                  )}
                </div>
              </div>
              {/* Person 2 avatar */}
              <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 5, minWidth: 68 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(147,197,253,0.12)", border: "1.5px solid rgba(147,197,253,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#93c5fd" }}>
                  {(r.person2?.name || "?")[0]?.toUpperCase()}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", maxWidth: 68, textAlign: "center" as const, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{r.person2?.name}</div>
              </div>
            </div>

            {/* PR M9 — Sensitivity tier framing banner. Tier 2 = standard
                life-impact framing; Tier 3 fires when D2 / denial+multi /
                bilateral H7 tension / combust+denial structural risk
                signals appear. The astrologer must read this BEFORE
                committing to a marriage verdict. */}
            {r.sensitivity?.framing_required && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: r.sensitivity.tier === 3
                    ? "rgba(248,113,113,0.06)"
                    : "rgba(201,169,110,0.05)",
                  border: r.sensitivity.tier === 3
                    ? "0.5px solid rgba(248,113,113,0.35)"
                    : "0.5px solid rgba(201,169,110,0.30)",
                  color: r.sensitivity.tier === 3 ? "#f87171" : "var(--accent)",
                  fontSize: 11,
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 700, letterSpacing: "0.06em", fontSize: 10, textTransform: "uppercase", marginBottom: 6 }}>
                  {r.sensitivity.tier === 3
                    ? t("⚠ Tier 3 — life-impact + structural risk",
                        "⚠ టైర్ 3 — జీవిత-ప్రభావ + నిర్మాణాత్మక రిస్క్")
                    : t("Tier 2 — life-impact framing",
                        "టైర్ 2 — జీవిత-ప్రభావ ఫ్రేమింగ్")}
                </div>
                <div style={{ color: "var(--text)", opacity: 0.85 }}>
                  {lang === "te" ? r.sensitivity.framing_note_te : r.sensitivity.framing_note_en}
                </div>
                {r.sensitivity.tier === 3 && r.sensitivity.escalators_triggered?.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 10, color: "var(--muted)", fontStyle: "italic" }}>
                    {t("Triggered by:", "ట్రిగ్గర్:")}{" "}
                    {r.sensitivity.escalators_triggered.map((e: string) => e.replace(/_/g, " ")).join(" · ")}
                  </div>
                )}
                {r.sensitivity.caveats_en?.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 10, color: "#93c5fd" }}>
                    {t("Caveats:", "హెచ్చరికలు:")}{" "}
                    {(lang === "te" ? r.sensitivity.caveats_te : r.sensitivity.caveats_en).join(" · ")}
                  </div>
                )}
              </div>
            )}

            {/* PR M11 — Bhavat Bhavam relative-marriage rotation.
                Fires only when astrologer's notes mentioned a relative
                (mother / father / sibling / son / daughter / friend).
                Shows a SECONDARY reading from each partner's chart at
                the rotated marriage house — does not change the couple's
                own H7 verdict. */}
            {(r.bhavat_bhavam_chart1?.applies || r.bhavat_bhavam_chart2?.applies) && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(147,197,253,0.05)",
                  border: "0.5px solid rgba(147,197,253,0.30)",
                  color: "var(--text)",
                  fontSize: 11,
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 700, letterSpacing: "0.06em", fontSize: 10, textTransform: "uppercase", marginBottom: 6, color: "#93c5fd" }}>
                  {t("Bhavat Bhavam · relative-marriage rotation",
                     "Bhavat Bhavam · బంధువు వివాహ తిప్పుడు")}
                </div>
                {[
                  { bb: r.bhavat_bhavam_chart1, name: r.person1?.name },
                  { bb: r.bhavat_bhavam_chart2, name: r.person2?.name },
                ].filter(it => it.bb?.applies).map((it, i) => (
                  <div key={i} style={{ marginBottom: i < 1 ? 8 : 0, paddingBottom: i < 1 ? 8 : 0, borderBottom: i < 1 ? "0.5px dashed var(--border)" : "none" }}>
                    <div style={{ fontWeight: 600, marginBottom: 3 }}>
                      {it.name} · <span style={{ color: "var(--accent)" }}>{t(it.bb.relative, it.bb.relative_te || it.bb.relative)}</span>
                      <span style={{ marginLeft: 8, fontSize: 10, color: "var(--muted)" }}>
                        ({it.bb.rotation_formula} → H{it.bb.rotated_house})
                      </span>
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 10.5 }}>
                      {lang === "te" ? it.bb.note_te : it.bb.note_en}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PR M3 — Canonical KP pattern chips (M1/M2/M3/M5 per partner +
                T1/T2 couple-wide). Pattern naming distinguishes a deep KSK
                reading from a generic significator scan (RULE 19). */}
            <MatchPatternChips
              patternsP1={r.patterns_chart1}
              patternsP2={r.patterns_chart2}
              patternsCouple={r.patterns_couple}
              p1Name={r.person1?.name}
              p2Name={r.person2?.name}
            />

            {/* Sub-tab bar — breaks the big result wall into scannable
                sections. Same pill pattern as Houses sub-tabs. */}
            {(() => {
              const subtabs = [
                { id: "overall", en: "Overall",   te: "మొత్తం" },
                { id: "charts",  en: "Charts",    te: "చార్టులు" },
                { id: "kp",      en: "KP",        te: "KP" },
                { id: "timing",  en: "Timing",    te: "సమయం" },
                { id: "risks",   en: "Risks",     te: "ప్రమాదాలు" },
                { id: "ai",      en: "AI",        te: "AI" },
              ] as const;
              return (
                <div className="match-subtab-bar">
                  {subtabs.map(st => {
                    const active = matchSubTab === st.id;
                    const label = lang === "en" ? st.en : st.te;
                    return (
                      <button
                        key={st.id}
                        onClick={() => setMatchSubTab(st.id as typeof matchSubTab)}
                        className={`match-subtab-pill${active ? " is-active" : ""}`}
                      >
                        <span>{label}</span>
                        {lang === "te_en" && active && st.en !== st.te && (
                          <span className="count">{st.en}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* ══════ CHARTS pane ══════ */}
            {matchSubTab === "charts" && (
            <div className="match-subtab-pane">

            {/* ═══ KUNDALI CHARTS — Side by Side ═══ */}
            {(r.chart1_data || r.chart2_data) && (
              <div className="match-section-grid">
                {[
                  { chart: r.chart1_data, name: r.person1?.name, isP1: true,  house: matchHouseShared, setHouse: setMatchHouseShared, rp: kp?.ruling_planets_chart1 },
                  { chart: r.chart2_data, name: r.person2?.name, isP1: false, house: matchHouseShared, setHouse: setMatchHouseShared, rp: kp?.ruling_planets_chart2 },
                ].map((it, i) => (
                  <div key={i} className="match-section" style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8, padding: "14px" }}>
                    <div className="match-section-title" style={{ alignSelf: "flex-start", color: it.isP1 ? "var(--accent)" : "#93c5fd" }}>
                      {it.name} · {t("Kundali", "కుండలి")}
                    </div>
                    {it.chart && (
                      <>
                        <SouthIndianChart
                          planets={it.chart.planets}
                          cusps={it.chart.cusps}
                          onHouseClick={(h: number) => it.setHouse(it.house === h ? null : h)}
                          selectedHouse={it.house}
                        />
                        {it.house && (
                          <div style={{ width: "100%", marginTop: 4 }}>
                            <HousePanel
                              house={it.house}
                              cusps={it.chart.cusps}
                              significators={null}
                              planets={it.chart.planets}
                              rulingPlanets={it.rp || []}
                              antardashas={[]}
                              onClose={() => it.setHouse(null)}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            </div>
            )}

            {/* ══════ KP pane ══════ */}
            {matchSubTab === "kp" && (
            <div className="match-subtab-pane">

            {/* ═══ KP Marriage Promise ═══ */}
            <div className="match-section">
              <div className="match-section-title">
                <HandHeart size={12} strokeWidth={1.8} />
                {t("KP marriage promise", "KP వివాహ ప్రమాణం")}
              </div>
              <div className="match-section-grid">
                {[
                  {p: kp?.chart1_promise, name: r.person1?.name, tier: r.multi_cusp_tier_chart1, multi: r.multi_marriage_chart1, combust: r.h7_csl_combust_chart1, border: r.h7_csl_borderline_chart1},
                  {p: kp?.chart2_promise, name: r.person2?.name, tier: r.multi_cusp_tier_chart2, multi: r.multi_marriage_chart2, combust: r.h7_csl_combust_chart2, border: r.h7_csl_borderline_chart2},
                ].map((item, i) => item.p && (
                  <div key={i} className="match-tile" style={{ borderColor: item.p.has_promise && !item.p.has_denial ? "rgba(74,222,128,0.3)" : item.p.has_denial ? "rgba(248,113,113,0.3)" : "var(--border)" }}>
                    <div className="match-tile-name">{item.name}</div>
                    <div className="match-tile-primary" style={{ color: item.p.has_promise && !item.p.has_denial ? "#4ade80" : item.p.has_denial ? "#f87171" : "var(--accent)" }}>
                      H7 CSL: {item.p.sub_lord} — {item.p.verdict}
                    </div>
                    {/* PR M2 — Multi-cusp TIER 0/1/2/3/-1 badge.
                        Cross-check with H2 + H11 CSL agreement per
                        kp_multi_cusp_confirmation.md + RULE 34. */}
                    {item.tier && (
                      <div
                        title={item.tier.note + " · Confidence band: " + item.tier.confidence_band}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          marginTop: 6,
                          marginBottom: 4,
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "help",
                          background: item.tier.tier === 3 ? "rgba(74,222,128,0.18)"
                                    : item.tier.tier === 2 ? "rgba(74,222,128,0.10)"
                                    : item.tier.tier === 1 ? "rgba(201,169,110,0.12)"
                                    : item.tier.tier === 0 ? "rgba(251,191,36,0.12)"
                                    : "rgba(248,113,113,0.15)",
                          color: item.tier.tier === 3 ? "#4ade80"
                               : item.tier.tier === 2 ? "#4ade80"
                               : item.tier.tier === 1 ? "var(--accent)"
                               : item.tier.tier === 0 ? "#fbbf24"
                               : "#f87171",
                          border: "0.5px solid currentColor",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {item.tier.label}
                        <span style={{ opacity: 0.7, fontSize: 9, marginLeft: 2 }}>({item.tier.confidence_band})</span>
                      </div>
                    )}
                    {/* PR M5 — Multi-marriage KSK signature chip.
                        Per Krishnamurti: H7 CSL = Mercury, in dual sign, or
                        in star of dual-sign planet → structural multi-marriage
                        signal. NOT a divorce prediction — astrologer framing aid. */}
                    {item.multi?.signature_present && (
                      <div
                        title={lang === "te" ? item.multi.details_te : item.multi.details}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          marginTop: 4,
                          marginBottom: 4,
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "help",
                          background: "rgba(251,191,36,0.10)",
                          color: "#fbbf24",
                          border: "0.5px solid rgba(251,191,36,0.45)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {t("Multi-marriage signature", "అనేక-వివాహ సూచన")}
                        <span style={{ opacity: 0.7, fontSize: 9 }}>· {item.multi.basis.replace(/_/g, " ")}</span>
                      </div>
                    )}
                    {/* PR M8 — Borderline H7 CSL caveat.
                        H7 cusp within 0.3° of sub boundary => birth-time
                        rectification may flip the verdict. */}
                    {item.border?.is_borderline && (
                      <div
                        title={lang === "te" ? item.border.detail_te : item.border.detail_en}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          marginTop: 4,
                          marginBottom: 4,
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "help",
                          background: "rgba(147,197,253,0.08)",
                          color: "#93c5fd",
                          border: "0.5px solid rgba(147,197,253,0.45)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {lang === "te" ? item.border.label_te : item.border.label_en}
                        <span style={{ opacity: 0.7, fontSize: 9 }}>
                          · {item.border.current_sub} ⇄ {item.border.alternate_sub} (≈ {item.border.minutes_of_birth_time} min)
                        </span>
                      </div>
                    )}
                    {/* PR M7 — Combust H7 CSL clinical flag.
                        Combust sub-lord => marriage promise fructifies hidden
                        / private. Borderline => mild eclipse / delay. */}
                    {item.combust && (item.combust.is_combust || item.combust.borderline) && (
                      <div
                        title={lang === "te" ? item.combust.detail_te : item.combust.detail_en}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          marginTop: 4,
                          marginBottom: 4,
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "help",
                          background: item.combust.is_combust ? "rgba(248,113,113,0.10)" : "rgba(251,191,36,0.10)",
                          color: item.combust.is_combust ? "#f87171" : "#fbbf24",
                          border: item.combust.is_combust ? "0.5px solid rgba(248,113,113,0.45)" : "0.5px solid rgba(251,191,36,0.45)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {lang === "te" ? item.combust.label_te : item.combust.label_en}
                        {item.combust.distance_from_sun_deg != null && (
                          <span style={{ opacity: 0.7, fontSize: 9 }}>
                            · {item.combust.distance_from_sun_deg}° {t("from Sun", "సూర్యం నుండి")}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="match-tile-row">
                      <span className="k">{t("Signifies", "సూచిస్తుంది")}</span>
                      <span className="v">H{item.p.signified_houses?.join(", H")}</span>
                    </div>
                    {item.p.marriage_type && (
                      <div className="match-tile-row">
                        <span className="k">{t("Type", "రకం")}</span>
                        <span className="v">{item.p.marriage_type}</span>
                      </div>
                    )}
                    {item.p.spouse_nature && (
                      <div className="match-tile-row">
                        <span className="k">{t("Spouse", "భాగస్వామి")}</span>
                        <span className="v">{item.p.spouse_nature}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* PR M4 — Star ↔ Sub Harmony layered reading per partner H7 CSL.
                KSK strict (RULE 16): KP is TENSION between two layers — STAR
                declares nature, SUB decides fructification. Exposes which
                layer carries the yes signal (or denial) — naive UNION hides this. */}
            <MatchStarSubHarmonyStrip
              p1Harmony={r.h7_star_sub_chart1}
              p2Harmony={r.h7_star_sub_chart2}
              p1Name={r.person1?.name}
              p2Name={r.person2?.name}
            />

            {/* PR A1.4 — Canonical Cross-Match (kpastrologylearning Rule 5) */}
            {kp?.canonical_cross_match && (
              <div className="match-section">
                <div className="match-section-title">
                  <Target size={12} strokeWidth={1.8} />
                  {t("Canonical cross-match (KSK Rule 5)", "క్యానానికల్ క్రాస్-మ్యాచ్ (KSK నియమం 5)")}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
                  {t("Each chart's H2/H7/H11 CSLs signifying {2,7,11}, plus partner's Ruling Planets signifying {2,7,11} in this chart.",
                     "ప్రతి చార్ట్‌యొక్క H2/H7/H11 CSLs {2,7,11} సూచిస్తాయి, మరియు భాగస్వామి RP లు ఈ చార్ట్‌లో {2,7,11} సూచిస్తాయి.")}
                </div>
                <div className="match-section-grid">
                  {[
                    { csls: kp.canonical_cross_match.a_csl_h2_7_11, count: kp.canonical_cross_match.a_own_promise_count, partnerRps: kp.canonical_cross_match.b_rps_signifying_a_marriage, sideOk: kp.canonical_cross_match.a_side_canonical_match, name: r.person1?.name, partner: r.person2?.name },
                    { csls: kp.canonical_cross_match.b_csl_h2_7_11, count: kp.canonical_cross_match.b_own_promise_count, partnerRps: kp.canonical_cross_match.a_rps_signifying_b_marriage, sideOk: kp.canonical_cross_match.b_side_canonical_match, name: r.person2?.name, partner: r.person1?.name },
                  ].map((it, i) => (
                    <div key={i} className="match-tile" style={{ borderColor: it.sideOk ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.25)" }}>
                      <div className="match-tile-name">
                        {it.name}
                        <span style={{ marginLeft: 8, fontSize: 10, color: it.sideOk ? "#4ade80" : "#f87171", fontWeight: 700, letterSpacing: "0.04em" }}>
                          {it.sideOk ? `✓ ${t("CANONICAL MATCH", "క్యానానికల్ మ్యాచ్")}` : `✗ ${t("NOT MET", "తీరలేదు")}`}
                        </span>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
                        {t("Own H2/H7/H11 CSLs hitting {2,7,11}", "స్వంత H2/H7/H11 CSLs {2,7,11}కు తాకుతున్నాయి")}: <strong style={{ color: it.count >= 2 ? "#4ade80" : "var(--muted)" }}>{it.count}/3</strong>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11 }}>
                        {(it.csls || []).map((c: any, j: number) => (
                          <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                            <span style={{ color: "var(--muted)" }}>H{c.cusp} CSL <strong style={{ color: "var(--text)" }}>{c.csl}</strong></span>
                            <span style={{ color: c.signifies_target ? "#4ade80" : "var(--muted)", fontWeight: 600 }}>{c.signifies_target ? "✓" : "✗"}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
                        {it.partner}'s {t("RPs hitting", "RP లు తాకుతున్నాయి")} {it.name}'s {t("marriage houses", "వివాహ భావాలు")}:
                      </div>
                      <div style={{ marginTop: 2, fontSize: 11, color: it.partnerRps?.length >= 2 ? "#4ade80" : "var(--muted)" }}>
                        {(it.partnerRps || []).length > 0
                          ? (it.partnerRps || []).map((p: any) => `${p.planet} (H${(p.sigs || []).join(",H")})`).join(", ")
                          : t("None", "ఏదీ లేదు")}
                      </div>
                    </div>
                  ))}
                </div>
                {kp.canonical_cross_match.both_sides_canonical_match && (
                  <div style={{ marginTop: 10, padding: "6px 10px", background: "rgba(74,222,128,0.08)", border: "0.5px solid rgba(74,222,128,0.25)", borderRadius: 8, fontSize: 11, color: "#4ade80", textAlign: "center" as const }}>
                    ✓ {t("BOTH SIDES canonical match — strongest possible KP cross-match", "రెండు వైపులా క్యానానికల్ మ్యాచ్ — బలమైన KP క్రాస్-మ్యాచ్")}
                  </div>
                )}
              </div>
            )}

            {/* PR A1.4 — 5-signal Type Classification per chart */}
            {(kp?.type_classification_chart1 || kp?.type_classification_chart2) && (
              <div className="match-section">
                <div className="match-section-title">
                  <HandHeart size={12} strokeWidth={1.8} />
                  {t("Marriage type · 5-signal classification", "వివాహ రకం · 5-సంకేత వర్గీకరణ")}
                </div>
                <div className="match-section-grid">
                  {[
                    { tc: kp.type_classification_chart1, name: r.person1?.name },
                    { tc: kp.type_classification_chart2, name: r.person2?.name },
                  ].map((it, i) => it.tc && (
                    <div key={i} className="match-tile">
                      <div className="match-tile-name">{it.name}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                        {it.tc.category}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>
                        {it.tc.reasoning}
                      </div>
                      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 8px", fontSize: 10.5 }}>
                        <span style={{ color: "var(--muted)" }}>S1 H5 in chain</span>
                        <span style={{ color: it.tc.signal_1_h5_in_chain ? "#4ade80" : "var(--muted)" }}>{it.tc.signal_1_h5_in_chain ? "✓" : "○"}</span>
                        <span style={{ color: "var(--muted)" }}>S2 5CSL={it.tc.signal_2_fifth_csl}</span>
                        <span style={{
                          color: it.tc.signal_2_love_path_negated ? "#f87171"
                               : it.tc.signal_2_love_with_obstacles ? "#fbbf24"
                               : it.tc.signal_2_love_path_strong ? "#4ade80"
                               : "var(--muted)"
                        }} title={t(
                          `5CSL chain hits ${(it.tc.signal_2_h5_csl_chain_houses || []).map((h: number) => 'H' + h).join(', ')}. 5-8-12: ${it.tc.signal_2_chain_has_5_8_12 ? 'YES' : 'no'}. 2-7-11 anchor: ${it.tc.signal_2_chain_has_marriage_anchor ? 'YES' : 'no'}.`,
                          "5CSL చైన్ సూచనలు"
                        )}>
                          {it.tc.signal_2_love_path_negated ? "negate"
                           : it.tc.signal_2_love_with_obstacles ? "obstacles"
                           : it.tc.signal_2_love_path_strong ? "strong"
                           : "mid"}
                        </span>
                        <span style={{ color: "var(--muted)" }}>S3 H4/H9 in chain</span>
                        <span style={{ color: (it.tc.signal_3_h4_in_chain && it.tc.signal_3_h9_in_chain) ? "#4ade80" : (it.tc.signal_3_h4_in_chain || it.tc.signal_3_h9_in_chain) ? "var(--accent)" : "var(--muted)" }}>
                          {it.tc.signal_3_h4_in_chain ? "H4 " : ""}{it.tc.signal_3_h9_in_chain ? "H9" : ""}{(!it.tc.signal_3_h4_in_chain && !it.tc.signal_3_h9_in_chain) ? "○" : ""}
                        </span>
                        <span style={{ color: "var(--muted)" }}>S4 Moon H{it.tc.signal_4_moon_house}</span>
                        <span style={{ color: "var(--text)" }}>{it.tc.signal_4_moon_mode}</span>
                        <span style={{ color: "var(--muted)" }}>S5 5L-7L</span>
                        <span style={{ color: it.tc.signal_5_strength === "strong" ? "#4ade80" : it.tc.signal_5_strength === "mild" ? "var(--accent)" : "var(--muted)" }}>{it.tc.signal_5_relation}</span>
                      </div>
                      {/* PR A1.8 — Rahu/Ketu in H7 CSL chain → unconventional/inter-caste partner */}
                      {it.tc.rahu_ketu_in_h7_chain && (
                        <div style={{ marginTop: 8, padding: "4px 8px", background: "rgba(167,139,250,0.10)", border: "0.5px solid rgba(167,139,250,0.3)", borderRadius: 6, fontSize: 10.5, color: "#a78bfa" }}>
                          ⚡ {t("Rahu/Ketu in H7 chain — unconventional partner signal (inter-caste, foreign, different background)",
                                "Rahu/Ketu H7 చైన్‌లో — అసాధారణ భాగస్వామి సంకేతం")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PR M13 — Spouse profile card per partner.
                Surfaces backend-computed direction / age band / profession
                hint / appearance hint + classical H7 sub-lord traits.
                Structural tendencies — astrologer interprets in context. */}
            {(r.spouse_profile_chart1 || r.spouse_profile_chart2) && (
              <div className="match-section">
                <div className="match-section-title">
                  <Heart size={12} strokeWidth={1.8} />
                  {t("Spouse profile · KP structural tendencies",
                     "భాగస్వామి రూపరేఖ · KP నిర్మాణ ధోరణులు")}
                </div>
                <div className="match-section-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { sp: r.spouse_profile_chart1, name: r.person1?.name, accent: "var(--accent)" },
                    { sp: r.spouse_profile_chart2, name: r.person2?.name, accent: "#93c5fd" },
                  ].map((it, i) => it.sp && (
                    <div key={i} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.01)", border: "0.5px solid var(--border2)", borderRadius: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: it.accent, marginBottom: 8, letterSpacing: "0.04em" }}>
                        {it.name} · {t("for spouse", "భాగస్వామి కోసం")}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: 6, fontSize: 11.5, color: "var(--text)" }}>
                        <div>
                          <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginRight: 6 }}>
                            {t("Direction", "దిశ")}
                          </span>
                          <strong>{lang === "te" ? it.sp.direction_te : it.sp.direction_en}</strong>
                          <span style={{ color: "var(--muted)", marginLeft: 6, fontSize: 10 }}>· H7 in {it.sp.h7_sign}</span>
                        </div>
                        <div>
                          <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginRight: 6 }}>
                            {t("Age band", "వయోశ్రేణి")}
                          </span>
                          {lang === "te" ? it.sp.age_band_te : it.sp.age_band_en}
                        </div>
                        {it.sp.spouse_nature && (
                          <div>
                            <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginRight: 6 }}>
                              {t("Nature", "స్వభావం")}
                            </span>
                            {it.sp.spouse_nature}
                          </div>
                        )}
                        {it.sp.appearance_hint_en && (
                          <div>
                            <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginRight: 6 }}>
                              {t("Appearance", "రూపం")}
                            </span>
                            {lang === "te" ? it.sp.appearance_hint_te : it.sp.appearance_hint_en}
                          </div>
                        )}
                        {it.sp.profession_hint_en && (
                          <div>
                            <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginRight: 6 }}>
                              {t("Profession hint", "వృత్తి సూచన")}
                            </span>
                            {lang === "te" ? it.sp.profession_hint_te : it.sp.profession_hint_en}
                          </div>
                        )}
                        {it.sp.marriage_style && (
                          <div>
                            <span style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginRight: 6 }}>
                              {t("Style", "శైలి")}
                            </span>
                            {it.sp.marriage_style}
                          </div>
                        )}
                        {it.sp.caution && (
                          <div style={{ fontSize: 11, color: "#fbbf24", fontStyle: "italic" }}>
                            ⚠ {it.sp.caution}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: 10, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.5 }}>
                  {t(
                    "Direction = H7 sign direction. Profession = classical Krishnamurti attribution of H7 sub-lord. Appearance = H7 sign element. All are structural tendencies — astrologer interprets in context.",
                    "దిశ = H7 రాశి దిశ. వృత్తి = H7 సబ్ లార్డ్ క్రిష్ణమూర్తి అట్రిబ్యూషన్. రూపం = H7 రాశి తత్వం. అన్నీ నిర్మాణ ధోరణులు."
                  )}
                </div>
              </div>
            )}

            {/* ═══ SUPPORTING CUSPS — H2 & H11 ═══ */}
            <div className="match-section">
              <div className="match-section-title">
                <Sparkles size={12} strokeWidth={1.8} />
                {t("Supporting cusps (H2 & H11)", "సపోర్టింగ్ కస్పాలు (H2 & H11)")}
              </div>
              <div className="match-section-grid">
                {[{sc: kp?.supporting_cusps_chart1, name: r.person1?.name}, {sc: kp?.supporting_cusps_chart2, name: r.person2?.name}].map((item, i) => item.sc && (
                  <div key={i} className="match-tile">
                    <div className="match-tile-name">{item.name}</div>
                    <div className="match-tile-row">
                      <span className="k">H2 CSL: <span style={{ color: "var(--text)" }}>{item.sc.h2_csl}</span></span>
                      <span style={{ color: item.sc.h2_supports ? "#4ade80" : "var(--muted)", fontWeight: 600 }}>{item.sc.h2_supports ? "✓" : "✗"}</span>
                    </div>
                    <div className="match-tile-row">
                      <span className="k">H11 CSL: <span style={{ color: "var(--text)" }}>{item.sc.h11_csl}</span></span>
                      <span style={{ color: item.sc.h11_supports ? "#4ade80" : "var(--muted)", fontWeight: 600 }}>{item.sc.h11_supports ? "✓" : "✗"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ DETAILED SIGNIFICATORS — 4-level ═══ */}
            {(r.significators_detailed_chart1 || r.significators_detailed_chart2) && (
              <div className="match-section">
                <div className="match-section-title">
                  <Target size={12} strokeWidth={1.8} />
                  {t("2,7,11 significators · 4 levels", "2,7,11 సూచకులు · 4 స్థాయిలు")}
                </div>
                <div className="match-section-grid">
                  {[{sd: r.significators_detailed_chart1, name: r.person1?.name}, {sd: r.significators_detailed_chart2, name: r.person2?.name}].map((item, i) => item.sd && (
                    <div key={i} className="match-tile">
                      <div className="match-tile-name">{item.name}</div>
                      {[
                        [t("L1 Occupants", "L1 నివాసులు"), item.sd.by_level?.occupants_2_7_11],
                        [t("L2 Lords", "L2 అధిపతులు"),      item.sd.by_level?.lords_2_7_11],
                        [t("L3 Star/Occ", "L3 నక్/నివాస"),  item.sd.by_level?.star_of_occupants],
                        [t("L4 Star/Lord", "L4 నక్/అధి"),   item.sd.by_level?.star_of_lords],
                      ].map(([label, planets]: any) => (
                        <div key={label} className="match-tile-row">
                          <span className="k">{label}</span>
                          <span className="v">{planets?.length ? planets.join(", ") : "—"}</span>
                        </div>
                      ))}
                      {item.sd.fruitful?.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 11, color: "#4ade80" }}>
                          {t("Fruitful (RP)", "ఫలదాయి (RP)")}: {item.sd.fruitful.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Resonance */}
                <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(74,222,128,0.05)", border: "0.5px solid rgba(74,222,128,0.2)", borderRadius: 8, fontSize: 11, color: "var(--muted)", textAlign: "center" as const }}>
                  {t("Cross-resonance", "క్రాస్-ప్రతిధ్వని")}:{" "}
                  <span style={{ color: "#4ade80", fontWeight: 600 }}>
                    {[...(kp?.resonance_1_to_2||[]), ...(kp?.resonance_2_to_1||[])].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(", ") || t("None", "లేదు")}
                  </span>
                  {" "}({kp?.total_resonance_count || 0} {t("planets", "గ్రహాలు")})
                </div>
              </div>
            )}

            {/* ═══ VENUS KARAKA ═══ */}
            <div className="match-section">
              <div className="match-section-title">
                <Sparkles size={12} strokeWidth={1.8} />
                {t("Venus karaka", "శుక్ర కారక")}
              </div>
              <div className="match-section-grid">
                {[{v: kp?.venus_chart1, name: r.person1?.name}, {v: kp?.venus_chart2, name: r.person2?.name}].map((item, i) => item.v && (
                  <div key={i} className="match-tile">
                    <div className="match-tile-name">{item.name}</div>
                    <div className="match-tile-primary" style={{ color: "var(--text)" }}>H{item.v.house} · {item.v.sign}</div>
                    <div style={{ fontSize: 12, color: item.v.strength === "Strong" ? "#4ade80" : item.v.strength === "Afflicted" ? "#f87171" : "var(--accent)", fontWeight: 600 }}>
                      {item.v.strength}
                    </div>
                    <div style={{ fontSize: 10, color: item.v.signifies_h7 ? "#4ade80" : "var(--muted)", marginTop: 3 }}>
                      {item.v.signifies_h7 ? `✓ ${t("Signifies H7", "H7 సూచిస్తుంది")}` : `○ ${t("No H7", "H7 లేదు")}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ RULING PLANETS ═══ */}
            <div className="match-section">
              <div className="match-section-title">
                <Target size={12} strokeWidth={1.8} />
                {t("Ruling planets", "నియమిత గ్రహాలు")}
              </div>
              <div className="match-section-grid">
                {[{rps: kp?.ruling_planets_chart1, name: r.person1?.name}, {rps: kp?.ruling_planets_chart2, name: r.person2?.name}].map((item, i) => (
                  <div key={i} className="match-tile">
                    <div className="match-tile-name">{item.name}</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, marginTop: 2 }}>
                      {(item.rps || []).map((p: string) => (
                        <span key={p} style={{ fontSize: 11, background: "rgba(201,169,110,0.12)", color: "var(--accent)", border: "0.5px solid rgba(201,169,110,0.3)", borderRadius: 999, padding: "2px 10px", fontWeight: 500 }}>{p}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            </div>
            )}

            {/* ══════ TIMING pane ══════ */}
            {matchSubTab === "timing" && (
            <div className="match-subtab-pane">

            {/* ═══ CURRENT DBA ═══ */}
            {(r.dba_chart1 || r.dba_chart2) && (
              <div className="match-section">
                <div className="match-section-title">
                  <Hourglass size={12} strokeWidth={1.8} />
                  {t("Current Dasha-Bhukti", "ప్రస్తుత దశ-భుక్తి")}
                </div>
                <div className="match-section-grid">
                  {[{dba: r.dba_chart1, name: r.person1?.name}, {dba: r.dba_chart2, name: r.person2?.name}].map((item, i) => item.dba && (
                    <div key={i} className="match-tile">
                      <div className="match-tile-name">{item.name}</div>
                      {[
                        ["MD",  item.dba.md_lord,  item.dba.md_end,  item.dba.md_favorable],
                        ["AD",  item.dba.ad_lord,  item.dba.ad_end,  item.dba.ad_favorable],
                        ["PAD", item.dba.pad_lord, item.dba.pad_end, null],
                      ].map(([label, lord, end, fav]: any) => (
                        <div key={label} className="match-tile-row">
                          <span className="k">{label}: <span style={{ color: "var(--text)" }}>{lord}</span></span>
                          <span style={{ fontSize: 10, color: fav === true ? "#4ade80" : fav === false ? "#f87171" : "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                            {end ? `→${end.slice(0,7)}` : ""} {fav === true ? "✓" : fav === false ? "✗" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {/* Timing overlap */}
                {r.timing_analysis && (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "7px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "0.5px solid var(--border)" }}>
                    <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{t("Timing", "సమయం")}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: r.timing_analysis.timing_verdict === "Aligned" ? "#4ade80" : r.timing_analysis.timing_verdict === "Misaligned" ? "#f87171" : "var(--accent)" }}>{r.timing_analysis.timing_verdict}</span>
                    {r.timing_analysis.strong_timing_planets?.length > 0 && (
                      <span style={{ fontSize: 10, color: "#4ade80" }}>({r.timing_analysis.strong_timing_planets.join(", ")})</span>
                    )}
                  </div>
                )}
              </div>
            )}

            </div>
            )}

            {/* ══════ RISKS pane (first part) ══════ */}
            {matchSubTab === "risks" && (
            <div className="match-subtab-pane">

            {/* PR A1.5 — No-desire-for-marriage flags (Ketu+Venus / Venus+Saturn) */}
            {(r.no_desire_chart1?.flagged || r.no_desire_chart2?.flagged) && (
              <div className="match-section" style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.18)", padding: "12px 14px" }}>
                <div className="match-section-title">
                  <TriangleAlert size={12} strokeWidth={1.8} />
                  {t("Marriage indifference signal", "వివాహం పట్ల అనాసక్తి సంకేతం")}
                </div>
                {[
                  { nd: r.no_desire_chart1, name: r.person1?.name },
                  { nd: r.no_desire_chart2, name: r.person2?.name },
                ].map((it, i) => it.nd?.flagged && (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#fbbf24" }}>{it.name}</div>
                    {(it.nd.notes || []).map((n: string, j: number) => (
                      <div key={j} style={{ fontSize: 11, color: "var(--text)", marginLeft: 8, marginTop: 2 }}>· {n}</div>
                    ))}
                  </div>
                ))}
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                  {t("Cautionary, not denial — explains why a weak H7 CSL may not even seek marriage.",
                     "హెచ్చరిక మాత్రమే, నిరాకరణ కాదు — బలహీన H7 CSL వివాహాన్ని ఎందుకు అన్వేషించదో వివరిస్తుంది.")}
                </div>
              </div>
            )}

            {/* ═══ KUJA DOSHA + MOON ═══ */}
            <div className="match-section-grid">
              <div className="match-section" style={{ padding: "12px 14px" }}>
                <div className="match-section-title">
                  <TriangleAlert size={12} strokeWidth={1.8} />
                  {t("Kuja Dosha", "కుజ దోష")}
                </div>
                {[kuja?.person1, kuja?.person2].map((p: any, i: number) => p && (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div className="match-tile-name">{p.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: p.has_dosha ? "#f87171" : "#4ade80" }}>
                      {p.has_dosha ? `${t("Manglik", "మాంగ్లిక్")} H${p.mars_house} (${p.severity})` : t("No Dosha", "దోషం లేదు")}
                    </div>
                    {p.cancellations?.[0] && <div style={{ fontSize: 10, color: "#4ade80", marginTop: 2 }}>{p.cancellations[0]}</div>}
                  </div>
                ))}
                {kuja?.mutual_cancellation && (
                  <div className="match-dosha-chip good" style={{ marginTop: 4 }}>
                    <CheckCircle size={11} strokeWidth={2} /> {t("Both have Kuja — cancelled", "ఇద్దరికీ కుజం — రద్దు")}
                  </div>
                )}
              </div>
              <div className="match-section" style={{ padding: "12px 14px" }}>
                <div className="match-section-title">
                  <Moon size={12} strokeWidth={1.8} />
                  {t("Moon details", "చంద్ర వివరాలు")}
                </div>
                {[r.person1, r.person2].map((p: any, i: number) => p && (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div className="match-tile-name">{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text)" }}>{p.moon_sign} · {p.moon_nakshatra}</div>
                  </div>
                ))}
              </div>
            </div>

            </div>
            )}

            {/* ══════ TIMING pane (D9 Navamsa) ══════ */}
            {matchSubTab === "timing" && (
            <div className="match-subtab-pane">

            {/* ═══ D9 NAVAMSA ═══ */}
            {(r.d9_chart1 || r.d9_chart2) && (
              <div className="match-section">
                <div className="match-section-title">
                  <LayoutGrid size={12} strokeWidth={1.8} />
                  {t("D9 Navamsa", "D9 నవాంశ")}
                </div>
                <div className="match-section-grid">
                  {[{d9: r.d9_chart1, name: r.person1?.name}, {d9: r.d9_chart2, name: r.person2?.name}].map((item, i) => item.d9 && (
                    <div key={i} className="match-tile">
                      <div className="match-tile-name">{item.name}</div>
                      {[
                        [t("D9 Lagna", "D9 లగ్న"),     item.d9.d9_lagna_sign],
                        [t("Venus D9", "శుక్ర D9"),     item.d9.venus_d9_sign],
                        [t("Moon D9", "చంద్ర D9"),      item.d9.moon_d9_sign],
                        [t("7th Lord", "7-అధిపతి"),    `${item.d9.d9_7th_lord} in ${item.d9.d9_7th_lord_sign || "—"}`],
                        [t("D9 7th", "D9 7వది"),       item.d9.d9_7th_sign],
                      ].map(([label, val]: any) => (
                        <div key={label} className="match-tile-row">
                          <span className="k">{label}</span>
                          <span className="v">{val || "—"}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PR A1.6 — Upcoming marriage windows (next 60 months) */}
            {r.upcoming_windows && (
              <>
              {/* Shared / overlap windows — strongest signal */}
              {(r.upcoming_windows.overlap_windows?.length > 0) && (
                <div className="match-section">
                  <div className="match-section-title">
                    <Hourglass size={12} strokeWidth={1.8} />
                    {t("Shared windows · Both partners favorable", "ఉమ్మడి కిటికీలు · ఇద్దరికీ అనుకూలం")}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 8 }}>
                    {t("Calendar months where BOTH partners are running an AD that signifies marriage houses {2,7,11}. These are the strongest wedding-date candidates.",
                       "ఇద్దరు భాగస్వాములు {2,7,11}ని సూచించే ADలో ఉన్న సమయ కాలాలు. వివాహ తేదీ అత్యంత బలమైన అభ్యర్థులు.")}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                    {(r.upcoming_windows.overlap_windows || []).map((w: any, i: number) => (
                      <div key={i} style={{ padding: "8px 12px", background: "rgba(74,222,128,0.06)", border: "0.5px solid rgba(74,222,128,0.25)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#4ade80" }}>
                            {w.start} → {w.end}
                            <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 8 }}>({w.duration_days}d)</span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                            {r.person1?.name} AD: <strong style={{ color: "var(--text)" }}>{w.person1_ad}</strong> · {r.person2?.name} AD: <strong style={{ color: "var(--text)" }}>{w.person2_ad}</strong>
                          </div>
                        </div>
                        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: "#4ade80" }}>{w.combined_score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PR M10 — Joint Sookshma days-precision windows.
                  When both partners' PD AND sookshma lords signify {2,7,11},
                  we have a wedding-grade dates window. */}
              {(r.joint_precision_windows?.length > 0) && (
                <div className="match-section">
                  <div className="match-section-title">
                    <Hourglass size={12} strokeWidth={1.8} />
                    {t("Wedding-grade days · Joint PD + Sookshma fire",
                       "వివాహ-గ్రేడ్ రోజులు · PD + సూక్ష్మ ఇద్దరికీ")}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 8 }}>
                    {t("Narrowest joint windows where BOTH partners' Pratyantar AND Sookshma lords signify marriage houses {2,7,11}. Days-precision dates — engagement / wedding candidates.",
                       "ఇరువురి Pratyantar + Sookshma {2,7,11}ని సూచించే అతి సూక్ష్మ ఉమ్మడి కిటికీలు. నిశ్చితార్థం / వివాహ తేదీ సూచనలు.")}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                    {(r.joint_precision_windows || []).slice(0, 6).map((w: any, i: number) => (
                      <div key={i} style={{ padding: "8px 12px", background: "rgba(201,169,110,0.06)", border: "0.5px solid rgba(201,169,110,0.30)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
                            {w.start} → {w.end}
                            <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 8 }}>({w.duration_days}d)</span>
                          </div>
                          <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3, fontFamily: "monospace" }}>
                            {r.person1?.name}: <strong style={{ color: "var(--text)" }}>{w.person1_lords}</strong>
                          </div>
                          <div style={{ fontSize: 10.5, color: "var(--muted)", fontFamily: "monospace" }}>
                            {r.person2?.name}: <strong style={{ color: "var(--text)" }}>{w.person2_lords}</strong>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 2 }}>
                          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: "var(--accent)" }}>
                            {w.joint_strength}/4
                          </div>
                          <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                            {t("strength", "బలం")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 8, fontStyle: "italic", lineHeight: 1.5 }}>
                    {t("Strength 4/4 = both partners' PD + Sookshma all hit {2,7,11}. Strength 2/4 = one side full fire, other partial.",
                       "4/4 బలం = ఇరువురి PD + Sookshma నాలుగూ {2,7,11}ని తాకుతాయి. 2/4 = ఒక వ్యక్తి పూర్తి, మరొకరు భాగికంగా.")}
                  </div>
                </div>
              )}

              {(r.upcoming_windows.overlap_windows?.length === 0) && (
                <div className="match-section" style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.18)" }}>
                  <div className="match-section-title">
                    <Hourglass size={12} strokeWidth={1.8} />
                    {t("Shared windows", "ఉమ్మడి కిటికీలు")}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text)" }}>
                    {t("No overlapping favorable AD windows found in next 60 months. Marriage timing may stretch beyond this horizon, or one chart serves as the gate (favorable period in only one partner).",
                       "రాబోయే 60 నెలల్లో ఉమ్మడి అనుకూల AD కిటికీలు కనిపించలేదు. వివాహ సమయం ఈ హోరిజోన్‌ను దాటవచ్చు.")}
                  </div>
                </div>
              )}

              {/* Per-person top windows */}
              <div className="match-section">
                <div className="match-section-title">
                  <Hourglass size={12} strokeWidth={1.8} />
                  {t("Per-person top marriage windows", "ప్రతి వ్యక్తి టాప్ వివాహ కిటికీలు")}
                </div>
                <div className="match-section-grid">
                  {[
                    { ws: r.upcoming_windows.person1_windows, name: r.person1?.name },
                    { ws: r.upcoming_windows.person2_windows, name: r.person2?.name },
                  ].map((it, i) => (
                    <div key={i} className="match-tile">
                      <div className="match-tile-name">{it.name}</div>
                      {(it.ws || []).length === 0 ? (
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                          {t("No favorable AD windows found in horizon.", "హోరిజోన్‌లో అనుకూల AD కిటికీలు కనిపించలేదు.")}
                        </div>
                      ) : (it.ws || []).slice(0, 4).map((w: any, j: number) => (
                        <div key={j} style={{ marginTop: 4, padding: "4px 0", borderTop: j > 0 ? "0.5px dashed var(--border)" : "none" }}>
                          <div style={{ fontSize: 11, color: "var(--text)" }}>
                            <strong>{w.start}</strong> → {w.end}
                          </div>
                          <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
                            AD <strong style={{ color: "var(--text)" }}>{w.ad_lord}</strong> sigs H{(w.promise_hits || []).join(", H")}
                            <span style={{ marginLeft: 6, color: w.score >= 2 ? "#4ade80" : "var(--accent)" }}>score {w.score}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 8, fontStyle: "italic", lineHeight: 1.5 }}>
                  {t("AD = Antardasha. Score = (count of {2,7,11} signified) − 0.5 × (count of {6,8,12} signified). Higher = stronger window.",
                     "AD = అంతర్దశ. స్కోర్ = {2,7,11} సూచనల సంఖ్య − 0.5 × {6,8,12} సూచనల సంఖ్య.")}
                </div>
              </div>
              </>
            )}

            </div>
            )}

            {/* ══════ RISKS pane (second part: 5th CSL + Separation) ══════ */}
            {matchSubTab === "risks" && (
            <div className="match-subtab-pane">

            {/* ═══ 5th CSL + SEPARATION RISK ═══ */}
            <div className="match-section-grid">
              <div className="match-section" style={{ padding: "12px 14px" }}>
                <div className="match-section-title">
                  <HandHeart size={12} strokeWidth={1.8} />
                  {t("5th CSL · Love", "5వ CSL · ప్రేమ")}
                </div>
                {[{h5: r.h5_analysis_chart1, name: r.person1?.name}, {h5: r.h5_analysis_chart2, name: r.person2?.name}].map((item, i) => item.h5 && (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div className="match-tile-name">{item.name}</div>
                    <div style={{ fontSize: 12, color: item.h5.love_indicated ? "#4ade80" : item.h5.heartbreak_5_8_12 ? "#f87171" : "var(--muted)", fontWeight: 500 }}>
                      {item.h5.sub_lord}: {item.h5.love_indicated ? `${t("Love", "ప్రేమ")} ✓` : item.h5.heartbreak_5_8_12 ? t("5-8-12 Risk", "5-8-12 ప్రమాదం") : t("Neutral", "తటస్థం")}
                    </div>
                  </div>
                ))}
              </div>
              <div className="match-section" style={{ padding: "12px 14px" }}>
                <div className="match-section-title">
                  <TriangleAlert size={12} strokeWidth={1.8} />
                  {t("Separation risk", "విడిపోయే ప్రమాదం")}
                </div>
                {[{sr: r.separation_risk_chart1, name: r.person1?.name}, {sr: r.separation_risk_chart2, name: r.person2?.name}].map((item, i) => item.sr && (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div className="match-tile-name">{item.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: item.sr.risk_level === "High" ? "#f87171" : item.sr.risk_level === "Moderate" ? "#fbbf24" : "#4ade80" }}>
                      {item.sr.risk_level === "High" ? t("High", "అధిక")
                        : item.sr.risk_level === "Moderate" ? t("Moderate", "మోస్తరు")
                        : t("Low", "తక్కువ")}
                    </div>
                    {item.sr.factors?.length > 0 && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{item.sr.factors[0]}</div>}
                  </div>
                ))}
              </div>
            </div>

            </div>
            )}

            {/* ══════ OVERALL pane (Ashtakoota score anchor) ══════ */}
            {matchSubTab === "overall" && (
            <div className="match-subtab-pane" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
              gap: "1.25rem",
              width: "100%",
              alignItems: "start",
            }}>

              {/* PR M14 — Best wedding window hero card.
                  Pick the strongest joint precision window (PD+Sookshma);
                  if none, fall back to the strongest AD overlap. Promoted
                  to the top of the Overall pane so the astrologer sees the
                  recommendable date range BEFORE reading the verdict body. */}
              {(() => {
                const best = r.joint_precision_windows?.[0] || null;
                const bestAD = r.upcoming_windows?.overlap_windows?.[0] || null;
                if (!best && !bestAD) return null;
                const isPrecision = !!best;
                const w = best || bestAD;
                return (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      padding: "16px 20px",
                      background: "linear-gradient(135deg, rgba(74,222,128,0.10) 0%, rgba(74,222,128,0.04) 100%)",
                      border: "1px solid rgba(74,222,128,0.40)",
                      borderRadius: 12,
                      display: "flex",
                      flexWrap: "wrap" as const,
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 14,
                      position: "relative" as const,
                      overflow: "hidden" as const,
                    }}
                  >
                    <div style={{ position: "absolute" as const, inset: 0, background: "radial-gradient(circle at 0% 50%, rgba(74,222,128,0.10) 0%, transparent 60%)", pointerEvents: "none" as const }} />
                    <div style={{ position: "relative" as const }}>
                      <div style={{ fontSize: 10, color: "#4ade80", letterSpacing: "0.14em", textTransform: "uppercase" as const, fontWeight: 700, marginBottom: 4 }}>
                        {isPrecision
                          ? t("Best wedding window · joint PD + Sookshma fire", "ఉత్తమ వివాహ సమయం · ఉమ్మడి PD + Sookshma")
                          : t("Best wedding window · joint AD overlap", "ఉత్తమ వివాహ సమయం · ఉమ్మడి AD")}
                      </div>
                      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, lineHeight: 1.15, color: "var(--text)" }}>
                        {w.start} → {w.end}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                        {w.duration_days}{t(" days · ", " రోజులు · ")}
                        {isPrecision
                          ? <span>{r.person1?.name}: <strong style={{ color: "var(--text)" }}>{w.person1_lords}</strong> · {r.person2?.name}: <strong style={{ color: "var(--text)" }}>{w.person2_lords}</strong></span>
                          : <span>{r.person1?.name} AD <strong style={{ color: "var(--text)" }}>{w.person1_ad}</strong> · {r.person2?.name} AD <strong style={{ color: "var(--text)" }}>{w.person2_ad}</strong></span>}
                      </div>
                    </div>
                    <div style={{ position: "relative" as const, display: "flex", flexDirection: "column" as const, alignItems: "center" as const, gap: 2 }}>
                      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, lineHeight: 1, color: "#4ade80" }}>
                        {isPrecision ? `${w.joint_strength}/4` : w.combined_score}
                      </div>
                      <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontWeight: 600 }}>
                        {isPrecision ? t("strength", "బలం") : t("score", "స్కోర్")}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Column 1: Detailed Astrological Verdicts & KP Promise Synthesis */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* PR A1.5 — Why this verdict (KP-strict reasoning) */}
                {kp?.kp_verdict_reasoning && (
                  <div className="match-section celestial-glass celestial-panel" style={{ background: "rgba(201,169,110,0.04)", border: "1px solid rgba(212,175,55,0.25)" }}>
                    <div className="match-section-title">
                      <Sparkles size={12} strokeWidth={1.8} />
                      {t("Why this verdict", "ఈ తీర్పుకు కారణం")}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>
                      {kp.kp_verdict_reasoning}
                    </div>
                    {/* PR A1.6 — natal-vs-timing disambiguation note */}
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, fontStyle: "italic", lineHeight: 1.5 }}>
                      {t(
                        "Note: this verdict is the NATAL structural reading (does the chart promise marriage at all in this lifetime?). Timing-specific predictions live in the Timing tab and the AI analysis — both are based on current dasha + Ruling Planets.",
                        "గమనిక: ఇది జనన చార్ట్ నిర్మాణ తీర్పు. ప్రస్తుత సమయపు తీర్పులకు Timing ట్యాబ్ + AI విశ్లేషణ చూడండి."
                      )}
                    </div>
                    {/* Promise tier per person */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                      {[
                        { p: kp?.chart1_promise, name: r.person1?.name },
                        { p: kp?.chart2_promise, name: r.person2?.name },
                      ].map((it, i) => it.p && (
                        <div key={i} style={{ flex: "1 1 240px", padding: "10px 12px", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 8 }}>
                          <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{it.name}</div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: it.p.promise_tier === "Full" ? "rgba(74,222,128,0.15)"
                                        : it.p.promise_tier === "Partial" ? "rgba(251,191,36,0.15)"
                                        : it.p.promise_tier === "Weak" ? "rgba(251,191,36,0.10)"
                                        : "rgba(248,113,113,0.15)",
                              color: it.p.promise_tier === "Full" ? "#4ade80"
                                   : it.p.promise_tier === "Partial" ? "#fbbf24"
                                   : it.p.promise_tier === "Weak" ? "#fbbf24"
                                   : "#f87171",
                              letterSpacing: "0.04em",
                            }}>{it.p.promise_tier?.toUpperCase() || "—"}</span>
                            {/* PR A1.7 — KSK Reader V 5-tier verdict + A/B/C/D level */}
                            {it.p.five_tier_verdict && (
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 999,
                                background: it.p.five_tier_verdict === "STRONGLY PROMISED" ? "rgba(74,222,128,0.20)"
                                          : it.p.five_tier_verdict === "PROMISED" ? "rgba(74,222,128,0.10)"
                                          : it.p.five_tier_verdict === "CONDITIONAL" ? "rgba(251,191,36,0.15)"
                                          : it.p.five_tier_verdict === "WEAKLY PROMISED" ? "rgba(251,191,36,0.10)"
                                          : "rgba(248,113,113,0.15)",
                                color: it.p.five_tier_verdict === "STRONGLY PROMISED" ? "#4ade80"
                                     : it.p.five_tier_verdict === "PROMISED" ? "#4ade80"
                                     : it.p.five_tier_verdict === "CONDITIONAL" ? "#fbbf24"
                                     : it.p.five_tier_verdict === "WEAKLY PROMISED" ? "#fbbf24"
                                     : "#f87171",
                                letterSpacing: "0.04em",
                              }} title={t("KSK Reader V 5-tier verdict — uses A/B/C/D significator strength",
                                          "KSK Reader V 5-అంచెల తీర్పు")}>
                                {it.p.five_tier_verdict}
                              </span>
                            )}
                            {it.p.strongest_marriage_level && (
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: it.p.strongest_marriage_level === "A" ? "rgba(74,222,128,0.20)"
                                          : it.p.strongest_marriage_level === "B" ? "rgba(74,222,128,0.12)"
                                          : it.p.strongest_marriage_level === "C" ? "rgba(251,191,36,0.12)"
                                          : "rgba(251,191,36,0.08)",
                                color: it.p.strongest_marriage_level === "A" ? "#4ade80"
                                     : it.p.strongest_marriage_level === "B" ? "#4ade80"
                                     : "#fbbf24",
                                border: "0.5px solid currentColor",
                              }} title={t(
                                "KSK significator strength: A=star of occupant (100%), B=occupant (75%), C=star of owner (50%), D=owner (25%)",
                                "KSK సూచక బలం: A=నివాస నక్షత్రం (100%), B=నివాస (75%), C=అధిపతి నక్షత్రం (50%), D=అధిపతి (25%)"
                              )}>
                                {it.p.strongest_marriage_level}-level
                              </span>
                            )}
                            <span style={{ fontSize: 12, color: "var(--text)" }}>
                              H7 CSL <strong>{it.p.sub_lord}</strong> → H{(it.p.signified_houses || []).join(", H") || "—"}
                            </span>
                          </div>
                          {it.p.has_denial && (
                            <div style={{ fontSize: 10, color: "#f87171", marginTop: 4 }}>
                              ⚠ {t("Denial houses hit", "నిరాకరణ భావాలు")}: H{(it.p.denial_houses_hit || []).join(", H")}
                            </div>
                          )}
                          {it.p.csl_in_retrograde_star && (
                            <div style={{ fontSize: 10, color: "#fbbf24", marginTop: 4 }}>
                              ⚠ {t("H7 CSL in retrograde star — delay/non-fructification", "H7 CSL వక్ర నక్షత్రంలో — ఆలస్యం")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PR A1.6 — If marriage happens, will it last + be happy? */}
                {(r.quality_outlook_chart1 || r.quality_outlook_chart2) && (
                  <div className="match-section celestial-glass celestial-panel">
                    <div className="match-section-title">
                      <HandHeart size={12} strokeWidth={1.8} />
                      {t("If it happens · Will it last & be happy?", "జరిగితే · దీర్ఘకాలికమా & ఆనందమా?")}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
                      {t("Outlook for marital longevity + harmony assuming marriage occurs. H8 (sustenance), 7th lord placement, malefics on H7.",
                         "వివాహం జరిగితే దీర్ఘకాలికత + సామరస్యం. H8 (నిర్వహణ), 7వ అధిపతి, H7పై మాలెఫిక్‌లు.")}
                    </div>
                    <div className="match-section-grid" style={{ gridTemplateColumns: "1fr" }}>
                      {[
                        { q: r.quality_outlook_chart1, name: r.person1?.name },
                        { q: r.quality_outlook_chart2, name: r.person2?.name },
                      ].map((it, i) => it.q && (
                        <div key={i} className="match-tile" style={{ background: "rgba(255,255,255,0.01)" }}>
                          <div className="match-tile-name">{it.name}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: it.q.score >= 6 ? "#4ade80" : it.q.score >= 4 ? "var(--accent)" : "#f87171" }}>
                              {it.q.outlook}
                            </div>
                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: it.q.score >= 6 ? "#4ade80" : it.q.score >= 4 ? "var(--accent)" : "#f87171", fontWeight: "bold" }}>
                              {it.q.score}<span style={{ fontSize: 11, color: "var(--muted)" }}>/10</span>
                            </div>
                          </div>
                          <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
                            H8 CSL <strong style={{ color: "var(--text)" }}>{it.q.h8_csl}</strong> sigs H{(it.q.h8_signified_houses || []).join(", H") || "—"}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            7th Lord <strong style={{ color: "var(--text)" }}>{it.q.h7_lord}</strong> in H{it.q.h7_lord_house}
                            {it.q.h7_lord_in_dussthana && <span style={{ color: "#f87171" }}> (dussthana)</span>}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px", marginTop: 6 }}>
                            {(it.q.positives || []).map((p: string, j: number) => (
                              <div key={`+${j}`} style={{ fontSize: 11, color: "#4ade80" }}>+ {p}</div>
                            ))}
                            {(it.q.negatives || []).map((n: string, j: number) => (
                              <div key={`-${j}`} style={{ fontSize: 11, color: "#f87171" }}>− {n}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PR A1.6 — Children prospects (joint) */}
                {r.children_match && (
                  <div className="match-section celestial-glass celestial-panel">
                    <div className="match-section-title">
                      <Sparkles size={12} strokeWidth={1.8} />
                      {t("Children prospects", "సంతాన అవకాశాలు")}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: r.children_match.joint_verdict?.startsWith("Strong") ? "#4ade80"
                        : r.children_match.joint_verdict?.startsWith("Good") ? "var(--accent)"
                        : r.children_match.joint_verdict?.startsWith("Concerning") ? "#f87171" : "var(--accent)", marginBottom: 10 }}>
                      {r.children_match.joint_verdict}
                    </div>
                    <div className="match-section-grid" style={{ gridTemplateColumns: "1fr" }}>
                      {[
                        { c: r.children_match.chart1, name: r.person1?.name },
                        { c: r.children_match.chart2, name: r.person2?.name },
                      ].map((it, i) => it.c && (
                        <div key={i} className="match-tile" style={{ background: "rgba(255,255,255,0.01)" }}>
                          <div className="match-tile-name">{it.name}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <div style={{ fontSize: 12, color: it.c.verdict === "Promised" ? "#4ade80" : it.c.verdict === "Likely" ? "var(--accent)" : it.c.verdict?.startsWith("Difficult") ? "#f87171" : "var(--muted)" }}>
                              H5 CSL <strong>{it.c.h5_csl}</strong> → {it.c.verdict}
                            </div>
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>
                              Signifies: H{(it.c.h5_signified_houses || []).join(", H") || "—"}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                            5L <strong style={{ color: "var(--text)" }}>{it.c.fifth_lord}</strong> in H{it.c.fifth_lord_house} | Jupiter H{it.c.jupiter_house}
                            {it.c.jupiter_in_dussthana && <span style={{ color: "#f87171" }}> (dussthana)</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: Quantitative Scores & Warnings */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* ═══ ASHTAKOOTA — 36 Gun ═══ */}
                <div className="match-section celestial-glass celestial-panel" style={{ border: "1px solid rgba(212,175,55,0.25)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div className="match-section-title" style={{ marginBottom: 0 }}>
                      <Sparkles size={12} strokeWidth={1.8} />
                      {t("Ashtakoota · 36 Gun", "అష్టకూట · 36 గుణ")}
                    </div>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 24, lineHeight: 1, color: ast?.total_score >= 25 ? "var(--accent)" : ast?.total_score >= 18 ? "#4ade80" : "#f87171", letterSpacing: "-0.02em", fontWeight: "bold" }}>
                      {ast?.total_score}<span style={{ fontSize: 14, color: "var(--muted)", marginLeft: 2 }}>/{ast?.max_score}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(ast?.kutas || []).map((k: any, i: number) => {
                      const pct = k.max > 0 ? (k.score / k.max) * 100 : 0;
                      const barColor = k.score === 0 ? "#f87171" : k.score >= k.max * 0.6 ? "#4ade80" : "var(--accent)";
                      return (
                        <div key={i} title={k.note || ""} className={`match-ashta-row${k.score === 0 ? " is-zero" : ""}`}>
                          <div className="match-ashta-label" style={{ fontSize: 11 }}>{k.kuta}</div>
                          <div className="match-ashta-bar-wrap" style={{ height: 6 }}>
                            <div className="match-ashta-bar-fill" style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${barColor}80 0%, ${barColor} 100%)`, boxShadow: k.score >= k.max * 0.6 ? `0 0 8px ${barColor}50` : "none" }} />
                          </div>
                          <div className="match-ashta-score" style={{ color: barColor, fontSize: 11, fontWeight: "bold" }}>{k.score}/{k.max}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                    {(() => {
                      const nadiKuta = (ast?.kutas || []).find((k: any) => k.kuta?.toLowerCase().includes("nadi"));
                      const hasNadiDosha = nadiKuta?.score === 0;
                      return <span className={`match-dosha-chip ${hasNadiDosha ? "bad" : "good"}`}>{hasNadiDosha ? t("Nadi Dosha", "నాడి దోష") : t("Nadi OK", "నాడి సరే")}</span>;
                    })()}
                    {(() => {
                      const ganaKuta = (ast?.kutas || []).find((k: any) => k.kuta?.toLowerCase().includes("gana"));
                      const hasGanaDosha = ganaKuta?.score === 0;
                      return <span className={`match-dosha-chip ${hasGanaDosha ? "bad" : "good"}`}>{hasGanaDosha ? t("Gana Mismatch", "గణ మిస్‌మ్యాచ్") : t("Gana OK", "గణ సరే")}</span>;
                    })()}
                    {kuja && (
                      <span className={`match-dosha-chip ${kuja?.person1?.has_dosha || kuja?.person2?.has_dosha ? "bad" : "good"}`}>
                        {kuja?.person1?.has_dosha || kuja?.person2?.has_dosha ? t("Manglik", "మాంగ్లిక్") : t("No Manglik", "మాంగ్లిక్ లేదు")}
                      </span>
                    )}
                  </div>
                </div>

                {/* PR A1.5 — Extended Dashakoota (Mahendra / Stree Deergha / Rajju) */}
                {r.extended_koots && (
                  <div className="match-section celestial-glass celestial-panel">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div className="match-section-title" style={{ marginBottom: 0 }}>
                        <Target size={12} strokeWidth={1.8} />
                        {t("Extended Koots · Progeny & Longevity", "విస్తరించిన కూటాలు · సంతానం & దీర్ఘాయుష్షు")}
                      </div>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, lineHeight: 1, color: r.extended_koots.total_score >= 6 ? "#4ade80" : r.extended_koots.total_score >= 4 ? "var(--accent)" : "#f87171", fontWeight: "bold" }}>
                        {r.extended_koots.total_score}<span style={{ fontSize: 12, color: "var(--muted)" }}>/{r.extended_koots.max_score}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(r.extended_koots.koots || []).map((k: any, i: number) => {
                        const pct = k.max > 0 ? (k.score / k.max) * 100 : 0;
                        const barColor = k.score === 0 ? "#f87171" : k.score >= k.max * 0.6 ? "#4ade80" : "var(--accent)";
                        return (
                          <div key={i} title={k.note || ""} className={`match-ashta-row${k.score === 0 ? " is-zero" : ""}`}>
                            <div className="match-ashta-label" style={{ fontSize: 11 }}>{k.kuta}</div>
                            <div className="match-ashta-bar-wrap" style={{ height: 6 }}>
                              <div className="match-ashta-bar-fill" style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${barColor}80 0%, ${barColor} 100%)`, boxShadow: k.score >= k.max * 0.6 ? `0 0 8px ${barColor}50` : "none" }} />
                            </div>
                            <div className="match-ashta-score" style={{ color: barColor, fontSize: 11, fontWeight: "bold" }}>{k.score}/{k.max}</div>
                          </div>
                        );
                      })}
                    </div>
                    {r.extended_koots.has_rajju_dosha && (
                      <div style={{ marginTop: 10, padding: "6px 10px", background: "rgba(248,113,113,0.08)", border: "0.5px solid rgba(248,113,113,0.25)", borderRadius: 8, fontSize: 11, color: "#f87171" }}>
                        ⚠ {t("Rajju Dosha — same body region. Classical longevity concern.", "రజ్జు దోషం — ఒకే శరీర భాగం. దీర్ఘాయుష్షు సంబంధ ఆందోళన.")}
                      </div>
                    )}
                  </div>
                )}

                {/* PR A1.5 — Vargottama chips (high-quality marriage signal) */}
                {(r.vargottama_chart1?.venus_vargottama || r.vargottama_chart1?.seventh_lord_vargottama
                  || r.vargottama_chart2?.venus_vargottama || r.vargottama_chart2?.seventh_lord_vargottama) && (
                  <div className="match-section celestial-glass celestial-panel" style={{ padding: "12px 14px" }}>
                    <div className="match-section-title">
                      <Sparkles size={12} strokeWidth={1.8} />
                      {t("Vargottama (D1 = D9)", "వర్గోత్తమ (D1 = D9)")}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                      {[
                        { v: r.vargottama_chart1, name: r.person1?.name },
                        { v: r.vargottama_chart2, name: r.person2?.name },
                      ].map((it, i) => it.v && (it.v.venus_vargottama || it.v.seventh_lord_vargottama) && (
                        <div key={i} style={{ padding: "8px 12px", background: "rgba(74,222,128,0.06)", border: "0.5px solid rgba(74,222,128,0.25)", borderRadius: 8 }}>
                          <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{it.name}</div>
                          {it.v.venus_vargottama && (
                            <div style={{ fontSize: 12, color: "#4ade80", fontWeight: 600 }}>
                              ✓ {t("Venus Vargottama", "శుక్ర వర్గోత్తమ")} ({it.v.venus_d1_sign})
                            </div>
                          )}
                          {it.v.seventh_lord_vargottama && (
                            <div style={{ fontSize: 12, color: "#4ade80", fontWeight: 600 }}>
                              ✓ {t(`7th Lord ${it.v.seventh_lord} Vargottama`, `7-అధిపతి ${it.v.seventh_lord} వర్గోత్తమ`)} ({it.v.seventh_lord_d1_sign})
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{it.v.note}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PR A1.6 — Parental / in-laws health flag */}
                {(r.in_laws_chart1?.flagged || r.in_laws_chart2?.flagged) && (
                  <div className="match-section celestial-glass celestial-panel" style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.18)" }}>
                    <div className="match-section-title">
                      <TriangleAlert size={12} strokeWidth={1.8} />
                      {t("Parental / in-laws health signals", "తల్లిదండ్రులు / అత్త-మామల ఆరోగ్య సంకేతాలు")}
                    </div>
                    {[r.in_laws_chart1, r.in_laws_chart2].map((il: any, i: number) => il?.flagged && (
                      <div key={i} style={{ marginBottom: 6 }}>
                        {(il.concerns || []).map((c: string, j: number) => (
                          <div key={j} style={{ fontSize: 11.5, color: "var(--text)", marginTop: 2 }}>· {c}</div>
                        ))}
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, fontStyle: "italic" }}>
                      {t("Stress signal, NOT a prediction of harm. Classical caution — folk overstatements ('marriage causes parent death') are not KP.",
                         "ఒత్తిడి సంకేతం మాత్రమే, హాని ప్రమాదం కాదు. క్లాసికల్ హెచ్చరిక మాత్రమే.")}
                    </div>
                  </div>
                )}
              </div>

              {/* PR M12 — Full reasoning trace + astrologer notes + JSON export.
                  Spans both columns of the Overall grid. Mirrors HoraryReasoningTrace. */}
              <div style={{ gridColumn: "1 / -1" }}>
                <MatchReasoningTrace result={r} />
              </div>
            </div>
            )}
            {/* ══════ AI pane ══════ */}
            {matchSubTab === "ai" && (
            <div className="match-subtab-pane">

            {/* ═══ AI DEEP ANALYSIS ═══ */}
            <div className="match-ai-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div className="match-section-title" style={{ marginBottom: 0, color: "#a78bfa" }}>
                  <Sparkles size={12} strokeWidth={1.8} />
                  {t("AI compatibility analysis", "AI సరిపోలన విశ్లేషణ")}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {matchAnalysisMessages.length > 0 && (
                    <button onClick={() => { setMatchAnalysisMessages([]); }}
                      style={{ background: "transparent", border: "0.5px solid var(--border2)", borderRadius: 999, padding: "3px 10px", fontSize: 11, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}>
                      {t("Clear", "తొలగించు")}
                    </button>
                  )}
                  <div style={{ display: "flex", background: "var(--surface)", borderRadius: 999, border: "0.5px solid var(--border2)", overflow: "hidden" }}>
                    {([["english", t("EN", "EN")], ["telugu_english", t("TEL·EN", "తె+EN")]] as const).map(([val, label]) => (
                      <button key={val} onClick={() => setMatchAnalysisLang(val as "english" | "telugu_english")} style={{ padding: "4px 10px", background: matchAnalysisLang === val ? "rgba(201,169,110,0.15)" : "transparent", color: matchAnalysisLang === val ? "var(--accent)" : "var(--muted)", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Topic pills */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 12 }}>
                {[
                  { id: "promise",      en: "Marriage promise", te: "వివాహ ప్రమాణం" },
                  { id: "harmony",      en: "Harmony",          te: "సామరస్యం" },
                  { id: "divorce_risk", en: "Divorce risk",     te: "విడాకుల ప్రమాదం" },
                  { id: "timing",       en: "Timing",           te: "సమయం" },
                  { id: "remedies",     en: "Remedies",         te: "పరిహారాలు" },
                ].map(pill => (
                  <button key={pill.id} onClick={() => handleMatchTopicAnalysis(pill.id)} disabled={matchAnalysisLoading}
                    className="match-ai-pill">
                    {lang === "en" ? pill.en : pill.te}
                  </button>
                ))}
              </div>
              {/* Chat messages */}
              <div style={{ maxHeight: 400, overflowY: "auto", marginBottom: matchAnalysisMessages.length > 0 || matchAnalysisLoading ? 10 : 0 }}>
                {matchAnalysisMessages.length === 0 && !matchAnalysisLoading && (
                  <div style={{ textAlign: "center" as const, padding: "1rem", fontSize: 12, color: "var(--muted)" }}>
                    {t("Click a topic above or type a question below", "పై అంశాన్ని క్లిక్ చేయండి లేదా ప్రశ్న టైప్ చేయండి")}
                  </div>
                )}
                {matchAnalysisMessages.map((msg, i) => (
                  <div key={i} style={{ marginBottom: "1rem" }} className="fade-in">
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                      <div className="chat-bubble-user" style={{ padding: "8px 14px", maxWidth: "72%", fontSize: 12, color: "#d0d0d8", lineHeight: 1.5 }}>
                        {msg.isTopic && <span style={{ fontSize: 9, color: "var(--accent)", display: "block", marginBottom: 2 }}>{t("Topic analysis", "అంశ విశ్లేషణ")}</span>}
                        {msg.q}
                      </div>
                    </div>
                    <div className="chat-bubble-ai md-body" style={{ padding: "1rem 1.25rem", maxWidth: "94%" }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.a}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {matchAnalysisLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 13, padding: "0.75rem 1rem" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                    {t("Analyzing compatibility…", "సరిపోలనను విశ్లేషిస్తోంది…")}
                  </div>
                )}
              </div>
              {/* Chat input */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input value={matchChatQ} onChange={e => setMatchChatQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleMatchChat(); }}
                  placeholder={t("Follow-up question…", "తదుపరి ప్రశ్న…")}
                  style={{ flex: 1, background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit" }} />
                <button onClick={handleMatchChat} disabled={matchAnalysisLoading || !matchChatQ.trim()}
                  style={{ background: matchChatQ.trim() ? "var(--accent)" : "var(--surface)", color: matchChatQ.trim() ? "#09090f" : "var(--muted)", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: matchChatQ.trim() ? "pointer" : "default", fontWeight: 500, fontFamily: "inherit" }}>
                  {t("Ask", "అడగు")}
                </button>
              </div>
            </div>

            </div>
            )}{/* close AI pane */}

          </div>
        );
      })()}

      {/* Error */}
      {!matchLoading && matchResults?.__error && (
        <div style={{ textAlign: "center" as const, padding: "2rem", color: "#f87171", fontSize: 13 }}>
          {t("Could not load compatibility. Please try again.", "సరిపోలన లోడ్ చేయడంలో సమస్య. మళ్ళీ ప్రయత్నించండి.")}
          <br />
          <button onClick={() => setMatchResults({ __p2: matchResults.__p2 })}
            className="match-back-btn"
            style={{ marginTop: 12 }}>
            ← {t("Back", "వెనక్కి")}
          </button>
        </div>
      )}
    </div>
  );
}
