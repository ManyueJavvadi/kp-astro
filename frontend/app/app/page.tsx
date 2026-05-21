"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import remarkGfm from "remark-gfm";
import axios from "axios";
import { ArrowRight, Loader2, CheckCircle, XCircle, MessageCircle, MapPin, ChevronLeft, ChevronRight, Sparkles, User, Clock, Globe2, Target, LayoutGrid, Home as HomeIcon, Hourglass, MessageSquare, Calendar, Heart, HelpCircle, Moon, Star, Sunrise, Sunset, MoonStar, Crown, TriangleAlert, Ban, CircleDashed, Sun, Briefcase, Plane, BookOpen, Stethoscope, Wallet, Car, HandHeart, Lock, Wand2, Dices, CheckCircle2, HeartPulse, Baby, Scale, Globe, TrendingUp, ChevronDown, RefreshCw, Compass, Orbit } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { PLANET_COLORS } from "./components/constants";
import { ContentCard } from "@/components/ui/content-card";
import { PlacePicker } from "@/components/ui/place-picker";
import { theme, styles as uiStyles } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";
import CommandOrb from "./components/CommandOrb";
import UserModeUI from "./components/UserModeUI";
import LiveLocationPill from "./components/LiveLocationPill";
import RPContextStrip from "./components/RPContextStrip";
import ClinicalFlagsStrip from "./components/ClinicalFlagsStrip";
import HoraryMoonCard from "./components/HoraryMoonCard";
import HoraryCuspsAccordion from "./components/HoraryCuspsAccordion";
import HoraryFourLevelAccordion from "./components/HoraryFourLevelAccordion";
import HorarySubLordChains from "./components/HorarySubLordChains";
import HoraryRpDashaStrip from "./components/HoraryRpDashaStrip";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { formatMaskedDate, formatMaskedTime } from "./lib/maskedInput";
// Phase 3 — Today panchang strip + per-tab chart context strip.
// These pull data OUT of the slim header and the sidebar so each
// surface has one job (#A, #B, #F).
import { TodayStrip } from "./components/workspace/TodayStrip";
import { ChartContextStrip } from "./components/workspace/ChartContextStrip";
// Phase 7 / PR 18 — date formatter for the Dasha tab MD/AD/PAD cards.
// Wraps the same Phase 1 helper PersonHeroBanner uses.
import { formatDate, formatDashaPeriod, stripSeconds } from "@/lib/format";
// Phase 13.2 — frontend audit log for every Anthropic-billing fetch.
// Each billing call site below MUST recordAiCall(label) before fetching;
// the on-screen <AiCallBadge /> reads this log so the user can see in
// real time when an AI call fires (or doesn't).
import { recordAiCall } from "@/lib/aiAudit";
import { AiCallBadge } from "@/components/ui/AiCallBadge";
// Phase 15.2 — Track A serif hero. Every tab uses this single
// component for its top-of-screen eyebrow + title + subcopy.
// Replaces inline <header className="dasha-hero"> markup that was
// duplicated across 3 tabs and missing from 5 others.
import { PageHero } from "@/components/ui/PageHero";
import { AnimatedScoreDonut } from "@/components/ui/AnimatedScoreDonut";
// Phase 16 — Moment #1: 3.5-second cinematic chart reveal ceremony.
// Replaces the old 1.75s tiny bloom. THIS is the signature moment.
import { ChartRevealCeremony } from "@/components/ui/ChartRevealCeremony";
// Phase 16 — Moment #5: PDF export ceremony (parchment + wax seal +
// rotating subtitles). Shows whenever pdfLoading=true.
import { PdfCeremonyOverlay } from "@/components/ui/PdfCeremonyOverlay";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/motion";
// PR A1.3-fix-20 — RasiChart replaces SouthIndianChart with proper KP
// sign-fixed layout + North/South/East tabs. Drop-in replacement.
import RasiChart from "./components/RasiChart";
const SouthIndianChart = RasiChart;  // backwards-compat alias for existing call sites
import TaraChakraWidget from "./components/TaraChakraWidget";
import DashaTimeline from "./components/DashaTimeline";
import PanchangamCard from "./components/PanchangamCard";
import PromiseBadge from "./components/PromiseBadge";
import HousePanel from "./components/HousePanel";
import PlanetList from "./components/workspace/PlanetList";
import HouseOverviewGrid from "./components/workspace/HouseOverviewGrid";
import CSLChainView from "./components/workspace/CSLChainView";
import PersonHeroBanner from "./components/workspace/PersonHeroBanner";
import DashaStrip from "./components/workspace/DashaStrip";
import type { PlaceSuggestion, BirthDetails, Message, ChartSession } from "./types";
import type { WorkspaceData } from "./types/workspace";
// PR R1-R4 (Phase A foundation refactor) — extracted tab components live
// in tabs/, shared primitives in components/, shared data in lib/.
import { ChartTab } from "./tabs/ChartTab";
import { HousesTab } from "./tabs/HousesTab";
import { DashaTab } from "./tabs/DashaTab";
import { AnalysisTab } from "./tabs/AnalysisTab";
import { HoraryTab } from "./tabs/HoraryTab";
import { MatchTab } from "./tabs/MatchTab";
import { MuhurthaTab } from "./tabs/MuhurthaTab";
import { PanchangTab } from "./tabs/PanchangTab";
import { SectionEyebrow } from "./components/SectionEyebrow";
import { TOPICS, TOPIC_EMOJI } from "./lib/topics";

// PR A1.3-fix-24 — env-derived. NEXT_PUBLIC_API_URL overrides for staging
// or local dev; production fallback unchanged. Set in .env.local for dev.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://devastroai.up.railway.app";

// ── Main Component ────────────────────────────────────────────
export default function Home() {
  const { lang, t, backendLang } = useLanguage();
  const isMobile = useIsMobile();
  // PR A1.1 — live location for Horary (and later: Muhurtha / Transit /
  // Panchang). KP RPs require the astrologer's CURRENT location, not
  // the natal location. No natal fallback.
  const liveLoc = useLiveLocation();
  const [mode, setMode] = useState<"user" | "astrologer">("user");
  const [birthDetails, setBirthDetails] = useState<BirthDetails>({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: null, longitude: null, gender: "" });
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placeStatus, setPlaceStatus] = useState<"idle" | "loading" | "found" | "error">("idle");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [showChartDetails, setShowChartDetails] = useState(false);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [manualCoords, setManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [activeTab, setActiveTab] = useState("chart");
  // Phase 8 / PR 23 — keyboard shortcut help overlay state. Toggled by
  // pressing `?`; closed by Escape or any tab-switch key.
  const [showKbHelp, setShowKbHelp] = useState(false);
  // Phase 9 / PR 25 — first-chart reveal animation. Plays once when
  // the chart finishes generating (transition false → true on
  // `setupDone`). Auto-clears after the CSS animation duration.
  const [showChartReveal, setShowChartReveal] = useState(false);
  // Phase 10 / PR 27 — live panchang for the Today strip.
  // `workspaceData.panchangam_today` is computed at chart-load time
  // using the BIRTH lat/lon — so Hora and Rahu Kalam are wrong for
  // any user not currently at their birth place. When `liveLoc` has
  // a value (browser geo or manual pick from any tab) we fetch a
  // fresh panchang at the current location and feed THAT into
  // TodayStrip. Stays consistent with the Panchang tab and the
  // Horary tab, which both already use live location.
  const [liveTodayPanchang, setLiveTodayPanchang] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  // PR A1.3-fix-24 — added optional `id` so SSE consumer can scope writes
  // to the specific message it owns. Without an id, two streams firing
  // back-to-back interleave their chunks into whichever message ends up
  // at `prev[prev.length - 1]`. Renderers still use index keys; this is
  // metadata for the streaming layer only.
  // Phase 11 / PR 28 — added optional `t` (created-at ms) so each AI bubble
  // can show a timestamp under it (#A16). Existing messages without `t`
  // fall back gracefully — no migration needed.
  const [analysisMessages, setAnalysisMessages] = useState<{ id?: string; q: string; a: string; isTopic?: boolean; t?: number }[]>([]);
  const [activeTopic, setActiveTopic] = useState("");
  const [chatQ, setChatQ] = useState("");
  const [analysisLang, setAnalysisLang] = useState<"english" | "telugu_english">("english");
  const [showLangModal, setShowLangModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [savedSessions, setSavedSessions] = useState<ChartSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  // New-chart floating modal: kept separate from the initial `!setupDone`
  // onboarding so the workspace stays mounted (and visibly blurred) behind.
  const [newChartModalOpen, setNewChartModalOpen] = useState(false);
  const [prevBirthDetailsStash, setPrevBirthDetailsStash] = useState<BirthDetails | null>(null);
  const [prevTimezoneStash, setPrevTimezoneStash] = useState<{ offset: number; label: string } | null>(null);
  // Muhurtha wizard state
  const [mStep, setMStep] = useState<1 | 2 | 3>(1);
  const [mEventType, setMEventType] = useState("");
  const [mDateStart, setMDateStart] = useState("");
  const [mDateEnd, setMDateEnd] = useState("");
  const [mLoading, setMLoading] = useState(false);
  const [mResults, setMResults] = useState<any>(null);
  const [mParticipants, setMParticipants] = useState<ChartSession[]>([]);
  const [mShowAddParticipant, setMShowAddParticipant] = useState(false);
  const [mEventLoc, setMEventLoc] = useState<{lat:number;lon:number;tz:number;place:string}|null>(null);
  const [mEventLocMode, setMEventLocMode] = useState<"same"|"different">("same");
  const [mEventLocSugg, setMEventLocSugg] = useState<PlaceSuggestion[]>([]);
  const [mEventLocSearching, setMEventLocSearching] = useState(false);
  const mEventLocSearchRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  // Inline participant mini-form (shared between muhurtha and match)
  const [mNewP, setMNewP] = useState({ name: "", date: "", time: "", ampm: "AM" as "AM"|"PM", place: "", latitude: 17.385, longitude: 78.4867, gender: "" as "male"|"female"|"", timezone_offset: 5.5 });
  const [mNewPPlaceSugg, setMNewPPlaceSugg] = useState<PlaceSuggestion[]>([]);
  const [mNewPPlaceStatus, setMNewPPlaceStatus] = useState<"idle"|"searching"|"done">("idle");
  const mNewPSearchRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  // Marriage match state
  const [matchPerson2Inline, setMatchPerson2Inline] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResults, setMatchResults] = useState<any>(null);
  // Match AI analysis state
  const [matchAnalysisMessages, setMatchAnalysisMessages] = useState<{q: string; a: string; isTopic?: boolean}[]>([]);
  const [matchAnalysisLoading, setMatchAnalysisLoading] = useState(false);
  const [matchChatQ, setMatchChatQ] = useState("");
  const [matchShowAI, setMatchShowAI] = useState(false);
  const [matchAnalysisLang, setMatchAnalysisLang] = useState<"english"|"telugu_english">("telugu_english");
  // Which sub-tab is visible in the Match Results stage. Defaults to
  // "overall" on every fresh result. Reset whenever matchResults clears.
  const [matchSubTab, setMatchSubTab] = useState<"overall"|"charts"|"kp"|"timing"|"risks"|"ai">("overall");
  // PR22 — single shared house selection across both match charts so tapping
  // a house on Person 1 also expands the same house on Person 2.
  const [matchHouseShared, setMatchHouseShared] = useState<number | null>(null);
  // showSigGrid state moved into tabs/HousesTab.tsx in PR R2 (tab-local).
  // PDF export state
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  // PR A1.3-fix-25 — generic transient toast for non-blocking errors.
  // Used for PDF failures, horary network errors, place-picker service errors.
  // Auto-dismisses after 5s; user can close manually. Replaces the prior
  // pattern where pdfError was set but never rendered (silent failure).
  const [toast, setToast] = useState<{ msg: string; tone?: "error" | "info" } | null>(null);
  // PR A1.3-fix-25 — inline form errors for the onboarding/new-chart form.
  // Replaces 6× window.alert() calls in handleSetup. The banner renders
  // above the submit button; toast also fires for visibility. Cleared on
  // successful submit AND on any input change touching the relevant field.
  const [setupError, setSetupError] = useState<string>("");
  // (quick insights removed)
  // Transit state
  const [transitData, setTransitData] = useState<any>(null);
  const [transitLoading, setTransitLoading] = useState(false);
  // PR A1.3-fix-25 — track when transit data was fetched so we can show
  // a "Last refreshed Xm ago" hint. Was missing — once loaded, the same
  // data sat there until manual refresh with no clue it was stale.
  const [transitFetchedAt, setTransitFetchedAt] = useState<number | null>(null);
  const [transitDate, setTransitDate] = useState("");
  // Horary / Prashna state
  const [horaryNumber, setHoraryNumber] = useState<number | "">("");
  // PR14 — horary wow pass: animated dice-spin flag on Random; counter roll
  // target so we can briefly animate the number up to the picked value.
  const [horaryDiceSpin, setHoraryDiceSpin] = useState(false);
  // PR A1.1b — click-to-type the big digit; Enter/blur commits, Esc cancels.
  const [horaryDigitEditing, setHoraryDigitEditing] = useState(false);
  const [horaryDigitDraft, setHoraryDigitDraft] = useState("");
  const horaryRollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [horaryQuestion, setHoraryQuestion] = useState("");
  const [horaryTopic, setHoraryTopic] = useState("general");
  const [horaryResult, setHoraryResult] = useState<any>(null);
  const [horaryLoading, setHoraryLoading] = useState(false);
  // New UI state vars
  // housesSubTab state moved into tabs/HousesTab.tsx in PR R2 (tab-local).
  // chartView state moved into tabs/ChartTab.tsx in PR R1 (tab-local).
  const [showTransitInDasha, setShowTransitInDasha] = useState(false);
  const [transitSubTab, setTransitSubTab] = useState<"overview" | "planets" | "kp">("overview");
  // Phase 13 / PR 31 — quickInsights state REMOVED.
  // The auto-fire on Analysis tab open was burning ~$0.30 of Sonnet
  // per visit (pre-loading 8 topic snippets the user usually never
  // read because they immediately clicked a specific topic). Per the
  // billing diagnosis, this single change drops daily LLM spend by
  // ~40% on its own. AI now only fires when the user explicitly
  // clicks a topic OR types a question.
  // Panchangam — auto-detect location, single page
  const [pcData, setPcData] = useState<any>(null);
  const [pcLoading, setPcLoading] = useState(false);
  const [pcLocationName, setPcLocationName] = useState<string>("");
  const [pcDetectedCoords, setPcDetectedCoords] = useState<{lat: number; lon: number; tz: number} | null>(null);
  const [calMonth, setCalMonth] = useState<{year: number; month: number}>({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [calData, setCalData] = useState<any>(null);
  const [calLoading, setCalLoading] = useState(false);
  const [calSelectedDay, setCalSelectedDay] = useState<string | null>(null);
  // Panchangam city selector
  const [pcShowCityModal, setPcShowCityModal] = useState(false);
  const [pcCityQuery, setPcCityQuery] = useState("");
  const [pcCitySuggestions, setPcCitySuggestions] = useState<PlaceSuggestion[]>([]);
  const [pcCitySearching, setPcCitySearching] = useState(false);
  const [pcGeoError, setPcGeoError] = useState("");
  const pcCitySearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // PR A1.3-fix-24 — fix render-time side-effect bug. The Panchang IIFE
  // used to call `pcFetchLocation()` directly during render whenever data
  // was missing — a React anti-pattern that would warn in StrictMode and
  // could double-fire under fast re-renders. The IIFE now writes its
  // local function into this ref, and a top-level useEffect (below)
  // triggers it cleanly when the tab becomes active.
  const pcFetchLocationRef = useRef<((d?: string) => void) | null>(null);

  // PR A1.3-fix-24 — Abort controllers for in-flight SSE streams.
  // Without these, switching topics mid-stream interleaves chunks from
  // two streams into the latest message bubble (because both stream
  // consumers update via `prev[prev.length - 1]` after both have appended
  // their own placeholder). Aborting + cancelling the reader on the
  // previous call before starting a new one prevents the race.
  const askStreamAbortRef = useRef<AbortController | null>(null);
  const analyzeStreamAbortRef = useRef<AbortController | null>(null);
  // cslSelectedHouse state moved into tabs/HousesTab.tsx in PR R2 (tab-local).
  // Timezone (auto-detected from place)
  const [timezoneOffset, setTimezoneOffset] = useState(5.5);
  const [timezoneLabel, setTimezoneLabel] = useState("IST");
  // Muhurtha Step 3 expanded state + AI
  const [mExpandedWindow, setMExpandedWindow] = useState<number | null>(null);
  const [mSelectedDate, setMSelectedDate] = useState<string | null>(null);
  const [mAiMessages, setMAiMessages] = useState<{q: string; a: string; isTopic?: boolean}[]>([]);
  const [mAiLoading, setMAiLoading] = useState(false);
  const [mAiQuestion, setMAiQuestion] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const placeSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [analysisMessages]);

  // Note: PR22's localStorage session auto-restore + PR24's reload-only
  // gate were reverted in PR25. Users want a fresh onboarding flow when
  // they intentionally return to /app, and the reload-type detection
  // wasn't reliable enough to distinguish intents on every browser.
  // We'll revisit a proper session-resume UX in Track B alongside auth,
  // where we can give the user an explicit "Resume?" prompt.
  // Masked-input helpers (formatMaskedDate / formatMaskedTime) from
  // PR22 + PR23 are KEPT — those are pure input UX fixes.
  //
  // One-shot cleanup of the stale keys we wrote in PR22/PR24 so returning
  // users don't have ghost data taking up their localStorage budget.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem("devastroai:lastSnapshot");
      window.localStorage.removeItem("devastroai:savedSessions");
      window.localStorage.removeItem("devastroai:mode");
    } catch { /* ignore */ }
  }, []);

  // Phase 13 / PR 31 — auto-firing quickInsights on Analysis tab open
  // was the single biggest preventable cost. Removed entirely.

  // PR A1.3-fix-24 — Panchang auto-load trigger.
  // Replaces the render-time side-effect call at the IIFE that was firing
  // pcFetchLocation() during render. Uses the ref the IIFE writes to so the
  // function definition can stay local (avoids hoisting a 50-line async fn).
  useEffect(() => {
    if (activeTab !== "panchang") return;
    if (pcData || pcLoading || pcShowCityModal) return;
    pcFetchLocationRef.current?.();
  }, [activeTab, pcData, pcLoading, pcShowCityModal]);

  // PR A1.3-fix-25 — auto-dismiss the toast after 5s. Manual close also
  // works (close button calls setToast(null) directly).
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);

  // PR A1.3-fix-24 — clear all pending timers / intervals on unmount.
  // Without this, debounced searches and the horary dice-roll interval can
  // fire setState after unmount, producing React warnings + potential
  // memory leaks. In current SPA shape the Home component basically never
  // unmounts, but StrictMode (dev double-render) and future route additions
  // make this defensive.
  useEffect(() => {
    return () => {
      if (placeSearchRef.current) clearTimeout(placeSearchRef.current);
      if (mNewPSearchRef.current) clearTimeout(mNewPSearchRef.current);
      if (mEventLocSearchRef.current) clearTimeout(mEventLocSearchRef.current);
      if (pcCitySearchRef.current) clearTimeout(pcCitySearchRef.current);
      if (horaryRollRef.current) clearInterval(horaryRollRef.current);
      // Also abort any in-flight SSE streams
      askStreamAbortRef.current?.abort();
      analyzeStreamAbortRef.current?.abort();
    };
  }, []);

  // Phase 8 / PR 23 — global keyboard shortcuts.
  //   1–8           switch active tab (Chart / Houses / Dasha / Analysis /
  //                                    Panchang / Muhurtha / Match / Horary)
  //   ? or shift+/  toggle the keyboard-shortcut help overlay
  //   Esc          close help overlay
  // Active inputs (textareas, inputs, contenteditable) are skipped so
  // typing "1" inside the question textarea doesn't switch tabs.
  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if ((node as HTMLElement).isContentEditable) return true;
      return false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;
      if (!setupDone) return;
      // Help toggle.
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowKbHelp(s => !s);
        return;
      }
      if (e.key === "Escape" && showKbHelp) {
        setShowKbHelp(false);
        return;
      }
      // Number keys 1-8 → tabs.
      const n = parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && n <= 8) {
        const target = ["chart","houses","dasha","analysis","panchang","muhurtha","match","horary"][n - 1];
        if (target) {
          e.preventDefault();
          setActiveTab(target);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setupDone, showKbHelp]);

  // Phase 10 / PR 27 — fetch live panchang for the Today strip whenever
  // useLiveLocation has a value. Reuses the same `/panchangam/location`
  // endpoint the Panchang tab uses, so the cosmos backing the Today
  // strip is identical to what the Panchang tab shows.
  // Caches the lat/lon we last fetched for so we don't re-call on
  // every render — only when the live location actually changes.
  useEffect(() => {
    if (!setupDone) return;
    if (!liveLoc.location) return;
    const lat = liveLoc.location.latitude;
    const lon = liveLoc.location.longitude;
    // Skip if the cached panchang is already for this lat/lon.
    if (
      liveTodayPanchang &&
      liveTodayPanchang._lat === lat &&
      liveTodayPanchang._lon === lon
    ) return;
    axios
      .post(`${API_URL}/panchangam/location`, {
        latitude: lat,
        longitude: lon,
        timezone_offset: 0, // backend auto-resolves from lat/lon
      })
      .then(r => {
        setLiveTodayPanchang({
          ...r.data,
          _lat: lat,
          _lon: lon,
          _city: liveLoc.location?.display ?? "",
        });
      })
      .catch(() => { /* fall back to chart-load snapshot — silent */ });
  }, [setupDone, liveLoc.location, liveTodayPanchang]);

  // PR A1.3-fix-15 — listen for follow-up chip clicks from HeroVerdictCard.
  // Component dispatches a `user-followup-click` CustomEvent with the
  // suggested follow-up question; we drop it into the input box.
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string>;
      if (ce?.detail) setQuestion(ce.detail);
    };
    window.addEventListener("user-followup-click", handler);
    return () => window.removeEventListener("user-followup-click", handler);
  }, []);

  // AI language modal — show on FIRST entry to Analysis tab only (once
  // per astrologer-mode user, persisted in localStorage). Before PR 9
  // this fired on chart generation which interrupted the chart viewing
  // flow. Now it fires at the moment the user actually needs the
  // decision — opening the tab that consumes Claude analysis.
  useEffect(() => {
    if (activeTab !== "analysis") return;
    if (mode !== "astrologer") return;
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem("devastroai:analysisLangModalSeen");
    if (seen === "1") return;
    setShowLangModal(true);
  }, [activeTab, mode]);
  // PR A1.3-fix-24 — was wiping mNewP/mShowAddParticipant/matchPerson2Inline
  // on EVERY tab change. That meant "user fills participant form → peeks
  // chart tab → returns to match → form data lost". Reset moved to the
  // form-open onClick handlers below (search for setMShowAddParticipant(true)
  // and setMatchPerson2Inline(true)) so each open is a clean slate without
  // wiping data when the user just glances at another tab.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Phase 4 / PR 8 — dedupe Nominatim suggestions.
  // Stress-test finding #1: typing "Tenali" returned two identical
  // "Tenali · Andhra Pradesh · India" rows in every place picker.
  // Phase 7 / PR 17 — Phase 4's dedup keyed by (display + lat-4dp +
  // lon-4dp) but live testing on production caught a case where OSM
  // returned two entries for Tenali with **different** lat/lon
  // (16.2378 vs 16.2516) and identical display strings — both
  // survived dedup. Tightened to dedup by `display` alone (case- and
  // whitespace-normalised). Display strings already include state +
  // country, so distant Springfields keep distinct displays
  // ("Springfield, Illinois, United States" vs "Springfield,
  // Massachusetts, United States") — only true duplicates collapse.
  const dedupePlaces = useCallback((rows: PlaceSuggestion[]): PlaceSuggestion[] => {
    const seen = new Set<string>();
    const out: PlaceSuggestion[] = [];
    for (const r of rows) {
      const key = (r.display ?? "").toLowerCase().replace(/\s+/g, " ").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
    return out;
  }, []);

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    setPlaceStatus("loading");
    try {
      const res = await axios.get("https://nominatim.openstreetmap.org/search", { params: { q: query, format: "json", limit: 5, addressdetails: 1, "accept-language": "en" }, headers: { "User-Agent": "DevAstroAI/1.0" } });
      const features = res.data;
      const mapped: PlaceSuggestion[] = features.map((f: any) => {
        const addr = f.address || {};
        const parts = [addr.suburb || addr.city_district || addr.city || addr.town || addr.village || addr.county || f.display_name.split(",")[0], addr.state, addr.country].filter(Boolean);
        return { name: parts[0] || query, display: parts.join(", "), lat: parseFloat(f.lat), lon: parseFloat(f.lon) };
      });
      const results = dedupePlaces(mapped);
      setSuggestions(results); setShowSuggestions(results.length > 0); setPlaceStatus(results.length > 0 ? "idle" : "error");
    } catch { setPlaceStatus("error"); }
  }, [dedupePlaces]);

  // Panchangam city search (reuses Nominatim pattern)
  const searchPcCities = useCallback(async (query: string) => {
    if (query.length < 2) { setPcCitySuggestions([]); return; }
    setPcCitySearching(true);
    try {
      const res = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q: query, format: "json", limit: 5, addressdetails: 1, "accept-language": "en" },
        headers: { "User-Agent": "DevAstroAI/1.0" }
      });
      const mapped: PlaceSuggestion[] = res.data.map((f: any) => {
        const addr = f.address || {};
        const parts = [addr.suburb || addr.city_district || addr.city || addr.town || addr.village || addr.county || f.display_name.split(",")[0], addr.state, addr.country].filter(Boolean);
        return { name: parts[0] || query, display: parts.join(", "), lat: parseFloat(f.lat), lon: parseFloat(f.lon) };
      });
      setPcCitySuggestions(dedupePlaces(mapped));
    } catch { /* silent */ }
    setPcCitySearching(false);
  }, [dedupePlaces]);

  const handlePlaceChange = (val: string) => {
    setBirthDetails(prev => ({ ...prev, place: val, latitude: null, longitude: null }));
    setPlaceStatus("idle");
    if (placeSearchRef.current) clearTimeout(placeSearchRef.current);
    placeSearchRef.current = setTimeout(() => searchPlaces(val), 400);
  };

  const handleSelectPlace = (s: PlaceSuggestion) => {
    setBirthDetails(prev => ({ ...prev, place: s.display, latitude: s.lat, longitude: s.lon }));
    setPlaceStatus("found"); setShowSuggestions(false); setSuggestions([]);
    // Auto-detect timezone from coordinates (silent fallback to IST)
    axios.get("https://api.bigdatacloud.net/data/reverse-geocode-client", {
      params: { latitude: s.lat, longitude: s.lon, localityLanguage: "en" }
    }).then(res => {
      const tz = res.data?.timezone;
      if (tz?.gmtOffset !== undefined) {
        const offset = Math.round((tz.gmtOffset / 3600) * 2) / 2;
        setTimezoneOffset(offset);
        setTimezoneLabel(tz.zoneAbbr || `UTC${offset >= 0 ? "+" : ""}${offset}`);
      }
    }).catch(() => {});
  };

  const handleMNewPPlaceChange = (val: string) => {
    setMNewP(p => ({ ...p, place: val, latitude: 17.385, longitude: 78.4867 }));
    setMNewPPlaceStatus("idle"); setMNewPPlaceSugg([]);
    if (mNewPSearchRef.current) clearTimeout(mNewPSearchRef.current);
    if (val.length < 3) return;
    mNewPSearchRef.current = setTimeout(async () => {
      setMNewPPlaceStatus("searching");
      try {
        const res = await axios.get("https://nominatim.openstreetmap.org/search", { params: { q: val, format: "json", limit: 5, addressdetails: 1, "accept-language": "en" }, headers: { "User-Agent": "DevAstroAI/1.0" } });
        const features = res.data;
        const mapped: PlaceSuggestion[] = features.map((f: any) => {
          const addr = f.address || {};
          const parts = [addr.suburb || addr.city_district || addr.city || addr.town || addr.village || addr.county || f.display_name.split(",")[0], addr.state, addr.country].filter(Boolean);
          return { name: parts[0] || val, display: parts.join(", "), lat: parseFloat(f.lat), lon: parseFloat(f.lon) };
        });
        setMNewPPlaceSugg(dedupePlaces(mapped)); setMNewPPlaceStatus("done");
      } catch { setMNewPPlaceStatus("idle"); }
    }, 400);
  };

  const handleMEventLocSearch = (val: string) => {
    setMEventLoc(null);
    setMEventLocSugg([]);
    if (mEventLocSearchRef.current) clearTimeout(mEventLocSearchRef.current);
    if (val.length < 3) return;
    mEventLocSearchRef.current = setTimeout(async () => {
      setMEventLocSearching(true);
      try {
        const res = await axios.get("https://nominatim.openstreetmap.org/search", { params: { q: val, format: "json", limit: 5, addressdetails: 1, "accept-language": "en" }, headers: { "User-Agent": "DevAstroAI/1.0" } });
        const mapped: PlaceSuggestion[] = res.data.map((f: any) => {
          const addr = f.address || {};
          const parts = [addr.suburb || addr.city_district || addr.city || addr.town || addr.village || addr.county || f.display_name.split(",")[0], addr.state, addr.country].filter(Boolean);
          return { name: parts[0] || val, display: parts.join(", "), lat: parseFloat(f.lat), lon: parseFloat(f.lon) };
        });
        setMEventLocSugg(dedupePlaces(mapped));
      } catch {} finally { setMEventLocSearching(false); }
    }, 400);
  };

  const handleManualCoords = () => {
    const lat = parseFloat(manualLat), lon = parseFloat(manualLon);
    if (isNaN(lat) || isNaN(lon)) return;
    setBirthDetails(prev => ({ ...prev, latitude: lat, longitude: lon }));
    setPlaceStatus("found"); setManualCoords(false);
  };

  // PR22 — masked date/time handlers now use shared helpers that respect
  // delete direction so Backspace works naturally across the separator.
  const handleDateChange = (val: string) => {
    setBirthDetails(prev => ({ ...prev, date: formatMaskedDate(val, prev.date || "") }));
  };
  const handleTimeChange = (val: string) => {
    setBirthDetails(prev => ({ ...prev, time: formatMaskedTime(val, prev.time || "") }));
  };
  const handleMNewPDateChange = (val: string) => {
    setMNewP(p => ({ ...p, date: formatMaskedDate(val, p.date || "") }));
  };
  const handleMNewPTimeChange = (val: string) => {
    setMNewP(p => ({ ...p, time: formatMaskedTime(val, p.time || "") }));
  };

  const getTime24 = () => {
    let [hh, mm] = birthDetails.time.split(":").map(Number);
    if (birthDetails.ampm === "PM" && hh !== 12) hh += 12;
    if (birthDetails.ampm === "AM" && hh === 12) hh = 0;
    return `${String(hh).padStart(2, "0")}:${String(mm || 0).padStart(2, "0")}`;
  };

  const getFormattedDate = () => {
    const parts = birthDetails.date.split("/");
    if (parts.length !== 3) return null;
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  };

  /** Convert a saved ChartSession to the API payload format (YYYY-MM-DD date, 24h time). */
  const sessionToApiPerson = (s: ChartSession) => {
    const bd = s.birthDetails;
    // date: stored as DD/MM/YYYY → convert to YYYY-MM-DD
    const dp = bd.date.includes("/") ? bd.date.split("/") : bd.date.split("-").reverse();
    const date = dp.length === 3 ? `${dp[2]}-${dp[1].padStart(2,"0")}-${dp[0].padStart(2,"0")}` : bd.date;
    // time: stored as HH:MM 12h + ampm → 24h
    let [hh, mm] = (bd.time || "00:00").split(":").map(Number);
    if (bd.ampm === "PM" && hh !== 12) hh += 12;
    if (bd.ampm === "AM" && hh === 12) hh = 0;
    const time = `${String(hh).padStart(2,"0")}:${String(mm||0).padStart(2,"0")}`;
    return {
      name: s.name || bd.name,
      date,
      time,
      latitude: bd.latitude || 17.385,
      longitude: bd.longitude || 78.4867,
      timezone_offset: bd.timezone_offset ?? 5.5,
      gender: bd.gender || "",
    };
  };

  // PR A1.3-fix-25 — helper that sets BOTH the inline banner AND a toast,
  // so the user gets visible feedback in two places (banner is sticky next
  // to the submit button; toast is high-contrast at top-right).
  const failSetup = (msg: string) => {
    setSetupError(msg);
    setToast({ msg, tone: "error" });
  };

  const handleSetup = async () => {
    setSetupError("");  // clear any prior error on retry
    // PR A1.3-fix-25 — replaced 6× window.alert() with inline error pattern.
    // alert() blocks UI, dismisses focus, can't be Esc'd, has no aria-live.
    if (!birthDetails.name || !birthDetails.date || !birthDetails.time) {
      failSetup("Please fill in name, date, and time of birth.");
      return;
    }
    if (!birthDetails.latitude || !birthDetails.longitude) {
      failSetup("Please pick your birth place from the dropdown so we can get the coordinates.");
      return;
    }
    const formattedDate = getFormattedDate();
    if (!formattedDate) {
      failSetup("Please enter date as DD/MM/YYYY.");
      return;
    }
    // Clamp birth date to a sensible range — the v1 masked input will
    // happily accept "200000-99-99" so we guard here.
    const todayISO = new Date().toISOString().slice(0, 10);
    if (formattedDate < "1900-01-01" || formattedDate > todayISO) {
      failSetup("Birth date must be between 1900-01-01 and today.");
      return;
    }
    const timeParts = birthDetails.time.split(":").map(Number);
    if (timeParts.length !== 2 || isNaN(timeParts[0]) || isNaN(timeParts[1]) || timeParts[0] < 1 || timeParts[0] > 12 || timeParts[1] < 0 || timeParts[1] > 59) {
      failSetup("Please enter a valid time (HH:MM, hours 01–12, minutes 00–59).");
      return;
    }

    // Duplicate detection — switch to existing session instead of re-generating
    if (mode === "astrologer" && savedSessions.length > 0) {
      const dupe = savedSessions.find(s =>
        s.birthDetails.name.trim().toLowerCase() === birthDetails.name.trim().toLowerCase() &&
        s.birthDetails.date === birthDetails.date &&
        s.birthDetails.time === birthDetails.time &&
        s.birthDetails.ampm === birthDetails.ampm
      );
      if (dupe) { handleSwitchSession(dupe); return; }
    }

    setChartLoading(true);
    try {
      if (mode === "astrologer") {
        const res = await axios.post(`${API_URL}/astrologer/workspace`, { name: birthDetails.name, date: formattedDate, time: getTime24(), latitude: birthDetails.latitude, longitude: birthDetails.longitude, timezone_offset: timezoneOffset, gender: birthDetails.gender || "" });
        setWorkspaceData(res.data);
      } else {
        const res = await axios.post(`${API_URL}/chart/generate`, { name: birthDetails.name, date: formattedDate, time: getTime24(), latitude: birthDetails.latitude, longitude: birthDetails.longitude, timezone_offset: timezoneOffset });
        setChartData(res.data);
      }
      setSetupDone(true);
      // Phase 16 — Moment #1: 3.5-second cinematic chart reveal ceremony.
      // The overlay self-dismisses via its own onComplete prop, so we
      // don't need a setTimeout here anymore. pointer-events:none
      // throughout so clicks fall through to the chart underneath.
      setShowChartReveal(true);
      setCurrentSessionId(prev => prev || Date.now().toString());
      // NOTE: we deliberately do NOT show the AI-language modal here
      // anymore. The modal's purpose is to let astrologers choose
      // EN vs Telugu+English output for Claude's analysis — a decision
      // only relevant the moment they click the Analysis tab. Firing
      // it right after chart generation interrupts the chart viewing
      // flow. See the useEffect below that shows it on first Analysis
      // tab entry instead.
    } catch (err: any) {
      // PR A1.3-fix-25 + PR F2 — differentiates common backend statuses.
      // PR F2: when network/CORS error fires (most common case when Railway
      // is down or sleeping), proactively check /health to distinguish
      // "backend down" from "user's connection problem." This prevents
      // the misleading "check your connection" message during outages.
      const status = err?.response?.status;
      const isNetworkOrCors = !err?.response && (
        err?.code === "ERR_NETWORK"
        || err?.message?.includes("Network Error")
        || err?.message?.includes("CORS")
        || err?.message?.includes("Failed to fetch")
      );

      let msg: string;
      if (status === 429) {
        msg = "Too many requests — please wait a moment.";
      } else if (status === 422) {
        msg = "The chart data couldn't be processed. Please double-check your inputs.";
      } else if (status === 413) {
        msg = "Your input is too large. Please shorten any free-text fields.";
      } else if (status === 503) {
        msg = "Backend service is temporarily unavailable. We're working on it — please try again in a few minutes.";
      } else if (status >= 500) {
        msg = "Our chart server is having trouble. Please try again in a moment.";
      } else if (isNetworkOrCors) {
        // PR F2 — proactive backend-health probe before blaming the user's network.
        // Don't await this (it's optional polish) — fire and forget, then
        // update the error message if we get a definitive "backend down" answer.
        msg = "Connecting to chart service... please wait a moment and retry.";
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
        if (API_BASE) {
          fetch(`${API_BASE}/health`, { method: "GET" })
            .then(r => r.json().catch(() => null))
            .then(h => {
              if (!h || h.status === "down") {
                failSetup(
                  "Our chart service is temporarily down (not your connection). " +
                  "We monitor this and it usually recovers within minutes. " +
                  "Try again shortly."
                );
              }
            })
            .catch(() => {
              // /health itself failed — backend is definitively down
              failSetup(
                "Our chart service is temporarily unreachable. " +
                "This is on our side, not your connection. Please try again in a few minutes."
              );
            });
        }
      } else {
        msg = "Could not generate chart. Please try again — if this persists, the service may be temporarily unavailable.";
      }
      failSetup(msg);
    }
    finally { setChartLoading(false); }
  };

  const handleAsk = async () => {
    if (!question.trim() || loading) return;
    const formattedDate = getFormattedDate();
    if (!formattedDate) return;
    setLoading(true);
    const currentQuestion = question;
    setQuestion("");

    // PR A1.3-fix-16 — streaming SSE flow.
    //   1. Insert empty AI message immediately (id = msgId).
    //   2. Hit /prediction/ask-stream and parse SSE events:
    //        event: analysis  → set msg.analysis (renders verdict
    //                            card shell while text streams)
    //        event: chunk     → append data.text to msg.answer
    //        event: done      → stream complete
    //        event: error     → fallback message
    //   3. HeroVerdictCard renders progressively as text arrives.
    //      TTFT goes from 60-120s to 1-2s.
    // PR A1.3-fix-24 — UUID instead of Date.now() (was ms-collision risk
    // when chip-click + Enter-key fired in the same millisecond, causing
    // the second message to overwrite the first via the m.id===msgId filter).
    const msgId = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setMessages(prev => [...prev, {
      id: msgId,
      question: currentQuestion,
      answer: "",
      analysis: null,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);

    // PR A1.3-fix-24 — abort any in-flight prior stream before starting a
    // new one. Prevents the previous reader from continuing to write chunks
    // into messages state after we've moved on.
    askStreamAbortRef.current?.abort();
    const ac = new AbortController();
    askStreamAbortRef.current = ac;

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      recordAiCall("user.ask-stream");
      const response = await fetch(`${API_URL}/prediction/ask-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: birthDetails.name, date: formattedDate, time: getTime24(),
          latitude: birthDetails.latitude, longitude: birthDetails.longitude,
          timezone_offset: timezoneOffset, gender: birthDetails.gender || "",
          topic: "auto", question: currentQuestion, mode: "user",
          history: messages.slice(-4).map(m => ({ question: m.question, answer: m.answer })),
        }),
        signal: ac.signal,
      });

      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames terminated by \n\n. Each frame may contain
        // an `event:` line and a `data:` line.
        let nlIdx;
        while ((nlIdx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 2);
          const lines = frame.split("\n");
          let evtName = "message";
          let dataStr = "";
          for (const ln of lines) {
            if (ln.startsWith("event:")) evtName = ln.slice(6).trim();
            else if (ln.startsWith("data:")) dataStr += ln.slice(5).trim();
          }
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (evtName === "analysis") {
              setMessages(prev => prev.map(m => m.id === msgId ? { ...m, analysis: data } : m));
            } else if (evtName === "chunk" && typeof data.text === "string") {
              setMessages(prev => prev.map(m => m.id === msgId ? { ...m, answer: m.answer + data.text } : m));
            } else if (evtName === "error") {
              setMessages(prev => prev.map(m => m.id === msgId
                ? { ...m, answer: m.answer || "Something went wrong. Please try again." }
                : m));
            }
          } catch { /* malformed SSE frame — skip */ }
        }
      }
    } catch (err) {
      // PR A1.3-fix-24 — silently swallow AbortError (intentional cancellation
      // when user fired a new question before this stream finished). Real
      // network errors still show the fallback.
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (!isAbort) {
        setMessages(prev => prev.map(m => m.id === msgId
          ? { ...m, answer: m.answer || "Something went wrong. Please try again." }
          : m));
      }
    } finally {
      // PR A1.3-fix-24 — release the reader and clear the abort ref if
      // it's still ours (don't clobber a newer in-flight request's ref).
      try { await reader?.cancel(); } catch { /* ignore */ }
      if (askStreamAbortRef.current === ac) askStreamAbortRef.current = null;
      setLoading(false);
    }
  };

  // PR A1.3-fix-22 — astrologer SSE consumer.
  // PR A1.3-fix-23 — added questionType param for Format A/B routing.
  // Streams from /astrologer/analyze-stream and appends chunks to the
  // last message in `analysisMessages`. Caller is responsible for
  // inserting the placeholder message before invoking this helper and
  // for setAnalysisLoading(false) in finally.
  //
  // questionType: "full_topic" → 7-section worksheet (Format A)
  //               "sub_question" → 5-section narrative (Format B)
  //               "auto" → backend heuristic decides
  //
  // PR A1.3-fix-24 — added `targetId` parameter so the consumer scopes
  // its writes to the specific message it owns (instead of "the last
  // message" which interleaves on rapid topic switches). Also added
  // AbortController plumbing so a new call cancels the previous stream
  // before starting; reader.cancel() releases the network reader.
  // Returns false if the stream errored (caller can show fallback).
  const streamAstrologerAnalysis = async (
    topic: string,
    question: string,
    history: { question: string; answer: string }[],
    questionType: "full_topic" | "sub_question" | "auto" = "auto",
    targetId?: string,
  ): Promise<boolean> => {
    const formattedDate = getFormattedDate();
    // Abort any in-flight prior stream before starting a new one
    analyzeStreamAbortRef.current?.abort();
    const ac = new AbortController();
    analyzeStreamAbortRef.current = ac;

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      recordAiCall(`astrologer.analyze-stream:${topic}:${questionType}`);
      const response = await fetch(`${API_URL}/astrologer/analyze-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: birthDetails.name, date: formattedDate, time: getTime24(),
          latitude: birthDetails.latitude, longitude: birthDetails.longitude,
          timezone_offset: timezoneOffset, gender: birthDetails.gender || "",
          topic, question, history, language: backendLang(),
          question_type: questionType,
        }),
        signal: ac.signal,
      });
      if (!response.ok || !response.body) return false;

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx;
        while ((nlIdx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 2);
          const lines = frame.split("\n");
          let evtName = "message";
          let dataStr = "";
          for (const ln of lines) {
            if (ln.startsWith("event:")) evtName = ln.slice(6).trim();
            else if (ln.startsWith("data:")) dataStr += ln.slice(5).trim();
          }
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (evtName === "chunk" && typeof data.text === "string") {
              // PR A1.3-fix-24 — scope writes by id when caller provided one,
              // else fall back to "last message" for back-compat with any
              // future caller that doesn't track ids.
              setAnalysisMessages(prev => prev.map((m, i) => {
                const isTarget = targetId
                  ? m.id === targetId
                  : i === prev.length - 1;
                return isTarget ? { ...m, a: m.a + data.text } : m;
              }));
            } else if (evtName === "error") {
              return false;
            }
            // "meta" and "done" events: no UI update needed for the
            // astrologer Analysis tab today (verdict scaffolding lives
            // in workspaceData, not in per-message state). Reserved for
            // future UI affordances.
          } catch { /* malformed SSE frame — skip */ }
        }
      }
      return true;
    } catch (err) {
      // Silently swallow AbortError — that's an intentional cancel
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      return isAbort ? true : false;  // treat abort as "no error to surface"
    } finally {
      try { await reader?.cancel(); } catch { /* ignore */ }
      if (analyzeStreamAbortRef.current === ac) analyzeStreamAbortRef.current = null;
    }
  };

  const handleTopicAnalysis = async (topic: string) => {
    if (!workspaceData) return;
    setActiveTopic(topic); setAnalysisLoading(true); setActiveTab("analysis");
    // Phase 6 / PR 15 — language-aware topic label (was hardcoded Telugu).
    const topicEntry = TOPICS.find(t => t.id === topic);
    const topicLabel = topicEntry ? (lang === "en" ? topicEntry.en : topicEntry.te) : topic;
    // PR A1.3-fix-24 — generate stable id so the SSE consumer scopes its
    // chunk writes to THIS message even if user fires another topic mid-stream.
    const targetId = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `topic-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setAnalysisMessages(prev => [...prev, { id: targetId, q: `${topicLabel} — Full Analysis`, a: "", isTopic: true, t: Date.now() }]);
    const ok = await streamAstrologerAnalysis(
      topic,
      `Complete KP analysis for ${topic}`,
      [],
      "full_topic",  // PR A1.3-fix-23 — topic analysis = Format A (7-section)
      targetId,
    );
    if (!ok) {
      // On failure: replace placeholder with error (scope by id)
      setAnalysisMessages(prev => prev.map(m =>
        m.id === targetId && !m.a ? { ...m, a: "Analysis failed. Please try again." } : m
      ));
    }
    setAnalysisLoading(false);
  };

  // Phase 13 / PR 31 — loadQuickInsights() removed. The function used
  // to auto-fire on every Analysis tab open and request 8 topic
  // previews in a single Sonnet call. Most users immediately clicked
  // a specific topic and never read the previews. The dedicated
  // /astrologer/quick-insights endpoint stays in the backend (no
  // longer hit by the frontend) — kept for any future opt-in surface.

  const handleWorkspaceChat = async () => {
    if (!chatQ.trim()) return;
    const q = chatQ; setChatQ(""); setAnalysisLoading(true); setActiveTab("analysis");
    // CRITICAL: pass ALL prior messages as history so the AI doesn't
    // repeat reasoning already given. Snapshot BEFORE we append the
    // placeholder so history doesn't include the empty new message.
    const history = analysisMessages.slice(-6).map(m => ({ question: m.q, answer: m.a }));
    // PR A1.3-fix-24 — stable id for SSE chunk scoping
    const targetId = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setAnalysisMessages(prev => [...prev, { id: targetId, q, a: "", t: Date.now() }]);
    const ok = await streamAstrologerAnalysis(
      activeTopic || "general",
      q,
      history,
      "sub_question",  // PR A1.3-fix-23 — chat = Format B (5-section narrative)
      targetId,
    );
    if (!ok) {
      setAnalysisMessages(prev => prev.map(m =>
        m.id === targetId && !m.a ? { ...m, a: "Sorry, the analysis failed. Please try again." } : m
      ));
    }
    setAnalysisLoading(false);
  };

  // Match AI analysis handlers
  const handleMatchTopicAnalysis = async (topic: string) => {
    if (!matchResults || !matchResults.overall_verdict) return;
    const matchPerson1 = workspaceData ? snapshotCurrentSession() : null;
    const p2 = matchResults.__p2;
    if (!matchPerson1 || !p2) return;
    setMatchAnalysisLoading(true); setMatchShowAI(true);
    const topicLabels: Record<string,string> = { promise: "వివాహ ప్రమాణం — Marriage Promise", harmony: "సామరస్యం — Harmony & Compatibility", divorce_risk: "విడాకులు ప్రమాదం — Divorce Risk", timing: "సమయం — Timing & DBA", remedies: "పరిహారాలు — Remedies" };
    try {
      recordAiCall(`match.analyze:topic:${topic}`);
      const res = await axios.post(`${API_URL}/compatibility/analyze`, {
        person1: sessionToApiPerson(matchPerson1),
        person2: sessionToApiPerson(p2),
        question: `Complete KP analysis for ${topic} between these two charts`,
        history: [],
        language: backendLang(),
      });
      setMatchAnalysisMessages(prev => [...prev, { q: topicLabels[topic] || topic, a: res.data.answer, isTopic: true }]);
    } catch {
      setMatchAnalysisMessages(prev => [...prev, { q: topicLabels[topic] || topic, a: "Analysis failed. Please try again.", isTopic: true }]);
    } finally { setMatchAnalysisLoading(false); }
  };

  const handleMatchChat = async () => {
    if (!matchChatQ.trim() || !matchResults?.overall_verdict) return;
    const matchPerson1 = workspaceData ? snapshotCurrentSession() : null;
    const p2 = matchResults.__p2;
    if (!matchPerson1 || !p2) return;
    const q = matchChatQ; setMatchChatQ(""); setMatchAnalysisLoading(true); setMatchShowAI(true);
    try {
      const history = matchAnalysisMessages.slice(-6).map(m => ({ question: m.q, answer: m.a }));
      recordAiCall("match.analyze:chat");
      const res = await axios.post(`${API_URL}/compatibility/analyze`, {
        person1: sessionToApiPerson(matchPerson1),
        person2: sessionToApiPerson(p2),
        question: q,
        history,
        language: backendLang(),
      });
      setMatchAnalysisMessages(prev => [...prev, { q, a: res.data.answer }]);
    } catch { } finally { setMatchAnalysisLoading(false); }
  };

  const handleFeedback = async (messageId: string, feedback: "correct" | "incorrect") => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback } : m));
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    try { await axios.post(`${API_URL}/feedback/submit`, { prediction_id: messageId, original_answer: msg.answer, correction: feedback, notes: msg.note || "" }); } catch { }
  };

  const handleNoteSubmit = (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, note: noteInput } : m));
    setActiveNote(null); setNoteInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } };

  const resetAll = () => {
    setSetupDone(false); setMessages([]); setChartData(null); setWorkspaceData(null);
    setShowChartDetails(false); setAnalysisMessages([]); setShowLangModal(false);
    setActiveTopic(""); setActiveTab("chart"); setSidebarOpen(true);
    setBirthDetails({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: null, longitude: null, gender: "" });
    setPlaceStatus("idle"); setSavedSessions([]); setCurrentSessionId("");
  };

  const snapshotCurrentSession = (): ChartSession | null => {
    if (!workspaceData) return null;
    return { id: currentSessionId || Date.now().toString(), name: workspaceData.name, birthDetails: { ...birthDetails, timezone_offset: timezoneOffset }, workspaceData, analysisMessages: [...analysisMessages], activeTopic, selectedHouse, chatQ, analysisLang, activeTab };
  };

  const handleNewChart = () => {
    // If there's no workspace yet (first-time user or already on onboarding),
    // fall through to the original full-page setup flow — no modal needed.
    if (!setupDone || !workspaceData) {
      setSetupDone(false); setWorkspaceData(null); setMessages([]); setChartData(null);
      setAnalysisMessages([]); setActiveTopic(""); setActiveTab("chart"); setSidebarOpen(true);
      setSelectedHouse(null); setChatQ(""); setCurrentSessionId("");
      setBirthDetails({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: null, longitude: null, gender: "" });
      setPlaceStatus("idle");
      return;
    }
    // Otherwise: snapshot the current chart into saved sessions so nothing is
    // lost, stash the current birth inputs so Cancel can restore them, clear
    // the form for the new chart, and open a centred modal on top of the
    // still-mounted (and now blurred) workspace.
    const snap = snapshotCurrentSession();
    if (snap) {
      setSavedSessions(prev => {
        const idx = prev.findIndex(s => s.id === snap.id);
        return idx >= 0 ? prev.map((s, i) => i === idx ? snap : s) : [...prev, snap];
      });
    }
    setPrevBirthDetailsStash(birthDetails);
    setPrevTimezoneStash({ offset: timezoneOffset, label: timezoneLabel });
    setBirthDetails({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: null, longitude: null, gender: "" });
    setPlaceStatus("idle");
    setNewChartModalOpen(true);
  };

  const handleCancelNewChartModal = () => {
    // Restore the previous form values so the workspace's source-of-truth
    // matches the chart that's still rendered behind the modal.
    if (prevBirthDetailsStash) setBirthDetails(prevBirthDetailsStash);
    if (prevTimezoneStash) {
      setTimezoneOffset(prevTimezoneStash.offset);
      setTimezoneLabel(prevTimezoneStash.label);
    }
    setPrevBirthDetailsStash(null);
    setPrevTimezoneStash(null);
    setNewChartModalOpen(false);
  };

  const handleSubmitNewChartModal = async () => {
    // `handleSetup` reads birthDetails/timezoneOffset, POSTs to the backend,
    // and updates workspaceData on success. Close the modal regardless; on
    // validation failure the user sees an alert and can reopen via + New.
    await handleSetup();
    setPrevBirthDetailsStash(null);
    setPrevTimezoneStash(null);
    setCurrentSessionId(Date.now().toString());
    setActiveTab("chart");
    setSelectedHouse(null);
    setAnalysisMessages([]);
    setActiveTopic("");
    setChatQ("");
    setNewChartModalOpen(false);
  };

  const handleRemoveSession = (id: string) => setSavedSessions(prev => prev.filter(s => s.id !== id));

  const handleSwitchSession = (target: ChartSession) => {
    const snap = snapshotCurrentSession();
    setSavedSessions(prev => {
      const withoutTarget = prev.filter(s => s.id !== target.id);
      if (!snap) return withoutTarget;
      const idx = withoutTarget.findIndex(s => s.id === snap.id);
      return idx >= 0 ? withoutTarget.map((s, i) => i === idx ? snap : s) : [...withoutTarget, snap];
    });
    setCurrentSessionId(target.id);
    setBirthDetails(target.birthDetails);
    setWorkspaceData(target.workspaceData);
    setAnalysisMessages(target.analysisMessages);
    setActiveTopic(target.activeTopic);
    setSelectedHouse(target.selectedHouse);
    setChatQ(target.chatQ);
    setAnalysisLang(target.analysisLang);
    setActiveTab(target.activeTab);
    setSetupDone(true);
    setMode("astrologer");
  };

  const inputStyle: React.CSSProperties = { width: "100%", background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "var(--text)", outline: "none" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 };

  // Tab labels — "primary" is the big line, "secondary" is the subtitle.
  // In EN mode the Telugu subtitle is hidden (secondary=empty).
  // In TE mode the English subtitle is hidden.
  // In TE+EN (default) both show — Telugu primary, English below.
  const TABS = [
    { id: "chart",    te: "చార్ట్",      en: "Chart",     Icon: LayoutGrid },
    { id: "houses",   te: "భావాలు",      en: "Houses",    Icon: HomeIcon },
    { id: "dasha",    te: "దశ",          en: "Dasha",     Icon: Hourglass },
    { id: "analysis", te: "విశ్లేషణ",   en: "Analysis",  Icon: MessageSquare },
    { id: "panchang", te: "పంచాంగం",    en: "Panchang",  Icon: Calendar },
    { id: "muhurtha", te: "ముహూర్త",    en: "Muhurtha",  Icon: Target },
    { id: "match",    te: "సరిపోలన",    en: "Match",     Icon: Heart },
    { id: "horary",   te: "ప్రశ్న",     en: "Horary",    Icon: HelpCircle },
  ];

  // TOPICS + TOPIC_EMOJI moved to ./lib/topics.ts in PR R4 (Phase A refactor).
  // Imported at top of file. Shared with tabs/AnalysisTab.tsx so they
  // can't drift.

  const HOUSE_TOPICS: Record<number, string> = {
    1: "Self & Vitality", 2: "Wealth & Family", 3: "Siblings & Short Travel",
    4: "Home & Mother", 5: "Children & Intelligence", 6: "Health & Enemies",
    7: "Marriage & Partnership", 8: "Longevity & Obstacles", 9: "Fortune & Father",
    10: "Career & Status", 11: "Gains & Fulfillment", 12: "Losses & Foreign",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Noto Sans Telugu','DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        /* Phase 15.4 — tab-content entrance upgraded from a 200ms snap-in
           to a 420ms decelerated lift. Pairs with the cosmic-craft motion
           grammar (cubic-bezier matches motion.ease.reveal token in theme.ts).
           Distance bumped 6px -> 12px so the entrance reads as intentional
           rather than incidental. */
        @keyframes slideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .tab-content{animation:slideIn 0.42s cubic-bezier(0.16,1,0.3,1)}
        .md-body h1,.md-body h2{font-size:15px;color:var(--accent2);margin:1rem 0 0.5rem;font-family:'DM Serif Display',serif}
        .md-body h3{font-size:13px;color:var(--accent);margin:0.75rem 0 0.4rem}
        .md-body p{font-size:13px;line-height:1.7;color:#c8c8d8;margin-bottom:0.5rem}
        .md-body table{width:100%;border-collapse:collapse;font-size:12px;margin:0.75rem 0}
        .md-body th{text-align:left;padding:6px 10px;color:var(--muted);font-size:10px;letter-spacing:.06em;text-transform:uppercase;border-bottom:0.5px solid var(--border);font-weight:400}
        .md-body td{padding:6px 10px;color:#c8c8d8;border-bottom:0.5px solid rgba(201,169,110,.06)}
        .md-body strong{color:var(--accent2);font-weight:500}
        .md-body hr{border:none;border-top:0.5px solid var(--border);margin:1rem 0}
        .md-body ul,.md-body ol{padding-left:1.2rem;font-size:13px;color:#c8c8d8}
        .md-body li{margin-bottom:.25rem;line-height:1.6}
        .markdown-body h1,.markdown-body h2,.markdown-body h3{color:var(--accent2);font-family:'DM Serif Display',serif;margin:1.2rem 0 0.6rem;line-height:1.3}
        .markdown-body h1{font-size:20px}.markdown-body h2{font-size:17px}.markdown-body h3{font-size:15px}
        .markdown-body p{margin-bottom:.85rem;font-size:14px;line-height:1.8;color:#d0d0d8}
        .markdown-body strong{color:var(--accent2);font-weight:500}
        .markdown-body table{width:100%;border-collapse:collapse;margin:1rem 0;font-size:13px}
        .markdown-body th{text-align:left;padding:8px 12px;color:var(--muted);font-size:10px;letter-spacing:.06em;text-transform:uppercase;border-bottom:0.5px solid var(--border);font-weight:400}
        .markdown-body td{padding:8px 12px;color:#d0d0d8;border-bottom:0.5px solid var(--border)}
        .markdown-body blockquote{border-left:2px solid var(--accent);padding-left:1rem;margin:1rem 0;color:var(--muted);font-style:italic}
        .markdown-body hr{border:none;border-top:0.5px solid var(--border);margin:1.2rem 0}
        .markdown-body ul,.markdown-body ol{padding-left:1.5rem;margin-bottom:.85rem}
        .markdown-body li{margin-bottom:.3rem;color:#d0d0d8;line-height:1.6}
        @media (max-width: 768px) {
          .workspace-layout { flex-direction: column !important; }
          .workspace-sidebar { width: 100% !important; max-height: 220px; overflow-y: auto; border-right: none !important; border-bottom: 0.5px solid var(--border) !important; flex-direction: row !important; flex-wrap: wrap; gap: 8px; padding: 10px !important; }
          .workspace-sidebar .sidebar-section { flex: 1; min-width: 140px; border-bottom: none !important; }
          .workspace-main { min-height: 0; flex: 1; }
          .tab-bar { overflow-x: auto !important; }
          .tab-bar button { padding: 10px 14px !important; font-size: 12px !important; min-width: 60px !important; }
          .south-indian-chart { max-width: 100% !important; }
          .grid-4col { grid-template-columns: repeat(2, 1fr) !important; }
          .setup-grid { grid-template-columns: 1fr !important; }
          .chat-input-container { position: sticky; bottom: 0; background: var(--bg); padding-bottom: env(safe-area-inset-bottom, 8px); z-index: 20; border-top: 0.5px solid var(--border); margin-top: 0 !important; }
          .house-panel-overlay { position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; top: auto !important; max-height: 65vh !important; border-radius: 16px 16px 0 0 !important; z-index: 50; }
        }
        @media (max-width: 480px) {
          .workspace-sidebar { max-height: 180px; }
          nav { padding: 0.6rem 1rem !important; }
        }
      `}</style>

      {/* Stars bg */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        {[...Array(80)].map((_, i) => (
          <div key={i} style={{ position: "absolute", width: "1px", height: "1px", background: "white", borderRadius: "50%", left: `${(i * 137.5) % 100}%`, top: `${(i * 97.3) % 100}%`, opacity: 0.06 + (i % 5) * 0.06 }} />
        ))}
      </div>

      {/* Astrologer-mode badge + Clear-saved-charts button.
          Rendered inline in PersonHeroBanner for astrologer mode.
          This tiny strip only shows for non-astrologer users who still
          have saved charts (gives them a way to clear stale localStorage). */}
      {setupDone && mode !== "astrologer" && savedSessions.length > 0 && (
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            justifyContent: "flex-end",
            padding: "8px 2rem 0",
          }}
        >
          <button
            onClick={() => {
              if (window.confirm("All saved charts will be cleared. Continue?")) resetAll();
            }}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 11,
              color: "var(--muted)",
              cursor: "pointer",
              opacity: 0.5,
            }}
          >
            🗑 Clear saved
          </button>
        </div>
      )}

      {/* ── SETUP SCREEN ── */}
      {!setupDone && (
        <main style={{ flex: 1, position: "relative", zIndex: 5, maxWidth: 720, margin: "0 auto", width: "100%", padding: "48px 20px 64px" }}>
          {/* Phase 15.2 — Onboarding hero with entrance cascade.
              Three sibling reveals (eyebrow / headline / subcopy), then
              the form card fades in below at 0.4s. Total ~700ms. */}
          <FadeIn distance="medium" duration="slow">
          {/* Intro (eyebrow + headline) */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 14px",
                borderRadius: 999,
                background: "rgba(0,200,255,0.08)",
                border: "1px solid rgba(0,200,255,0.2)",
                color: "#00C8FF",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              <Sparkles size={12} /> Krishnamurti Paddhati System
            </span>
            <h1
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(2rem, 5vw, 3rem)",
                lineHeight: 1.15,
                color: theme.text.primary,
                letterSpacing: "-0.01em",
                margin: "0 0 14px",
              }}
            >
              Decode the cosmos,
              <br />
              <span style={{ color: theme.gold, fontStyle: "italic" }}>reveal your destiny</span>
            </h1>
            <p
              style={{
                fontSize: 14,
                color: theme.text.muted,
                lineHeight: 1.65,
                maxWidth: 440,
                margin: "0 auto",
              }}
            >
              Precise KP analysis powered by Swiss Ephemeris — the gold standard
              in astronomical computation.
            </p>
          </div>
          </FadeIn>

          {/* Birth details card — slides up after the hero fades in */}
          <FadeIn distance="medium" duration="slow" delay={0.4}>
          <ContentCard style={{ padding: 28, boxShadow: theme.shadow.md }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
                paddingBottom: 14,
                borderBottom: theme.border.default,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: theme.gold,
                  boxShadow: `0 0 8px ${theme.gold}`,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: theme.text.muted,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                Birth details
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  color: theme.text.dim,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Sparkles size={10} /> Swiss Ephemeris precision
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Name */}
              <div>
                <Label icon={<User size={11} />}>Full name</Label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={birthDetails.name}
                  onChange={(e) =>
                    setBirthDetails((prev) => ({ ...prev, name: e.target.value }))
                  }
                  style={uiStyles.input}
                />
              </div>

              {/* Date + Time */}
              <div
                className="setup-grid"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
              >
                <div>
                  <Label icon={<Target size={11} />}>Date of birth</Label>
                  <input
                    type="text" inputMode="numeric"
                    placeholder="DD / MM / YYYY"
                    value={birthDetails.date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    maxLength={10}
                    style={uiStyles.input}
                  />
                </div>
                <div>
                  <Label icon={<Clock size={11} />}>Time of birth</Label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text" inputMode="numeric"
                      placeholder="HH : MM"
                      value={birthDetails.time}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      maxLength={5}
                      style={{ ...uiStyles.input, flex: 1 }}
                    />
                    <select
                      value={birthDetails.ampm}
                      onChange={(e) =>
                        setBirthDetails((prev) => ({
                          ...prev,
                          ampm: e.target.value,
                        }))
                      }
                      style={{
                        ...uiStyles.input,
                        width: 72,
                        cursor: "pointer",
                      }}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Place picker */}
              <div>
                <Label icon={<Globe2 size={11} />}>Place of birth</Label>
                <PlacePicker
                  value={birthDetails.place}
                  onChange={(placeName, pick) => {
                    setBirthDetails((prev) => ({
                      ...prev,
                      place: placeName,
                      latitude: pick ? pick.lat : null,
                      longitude: pick ? pick.lon : null,
                    }));
                    if (pick?.timezone) {
                      // Convert IANA tz to numeric offset if possible
                      try {
                        const now = new Date();
                        const fmt = new Intl.DateTimeFormat("en-US", {
                          timeZone: pick.timezone,
                          timeZoneName: "longOffset",
                        });
                        const parts = fmt.formatToParts(now);
                        const tzPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
                        const m = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
                        if (m) {
                          const sign = m[1] === "-" ? -1 : 1;
                          const h = parseInt(m[2], 10);
                          const mm = parseInt(m[3] ?? "0", 10);
                          const offset = sign * (h + mm / 60);
                          setTimezoneOffset(offset);
                          setTimezoneLabel(pick.timezone.split("/").pop() ?? `UTC${offset >= 0 ? "+" : ""}${offset}`);
                          return;
                        }
                      } catch {
                        /* silent */
                      }
                    }
                    // fallback: try bigdatacloud path if picker didn't resolve tz
                    if (pick) {
                      axios
                        .get("https://api.bigdatacloud.net/data/reverse-geocode-client", {
                          params: { latitude: pick.lat, longitude: pick.lon, localityLanguage: "en" },
                        })
                        .then((res) => {
                          const tz = res.data?.timezone;
                          if (tz?.gmtOffset !== undefined) {
                            const offset = Math.round((tz.gmtOffset / 3600) * 2) / 2;
                            setTimezoneOffset(offset);
                            setTimezoneLabel(
                              tz.zoneAbbr || `UTC${offset >= 0 ? "+" : ""}${offset}`
                            );
                          }
                        })
                        .catch(() => {});
                    }
                  }}
                  placeholder="Start typing your city…"
                />
                {birthDetails.latitude !== null && birthDetails.longitude !== null && (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      fontSize: 11,
                      color: theme.text.muted,
                    }}
                  >
                    <span>
                      <span style={{ color: theme.text.dim }}>lat</span>{" "}
                      <span style={{ color: theme.text.secondary }}>
                        {birthDetails.latitude.toFixed(4)}°
                      </span>
                    </span>
                    <span>
                      <span style={{ color: theme.text.dim }}>lon</span>{" "}
                      <span style={{ color: theme.text.secondary }}>
                        {birthDetails.longitude.toFixed(4)}°
                      </span>
                    </span>
                    <span>
                      <span style={{ color: theme.text.dim }}>tz</span>{" "}
                      <span style={{ color: theme.gold }}>{timezoneLabel}</span>{" "}
                      <span style={{ color: theme.text.dim }}>
                        (UTC{timezoneOffset >= 0 ? "+" : ""}{timezoneOffset})
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Gender */}
              <div>
                <Label>Gender</Label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["male", "female"] as const).map((g) => {
                    const active = birthDetails.gender === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() =>
                          setBirthDetails((prev) => ({ ...prev, gender: g }))
                        }
                        style={{
                          flex: 1,
                          height: 38,
                          borderRadius: theme.radius.sm,
                          cursor: "pointer",
                          border: active
                            ? `1px solid ${theme.gold}`
                            : theme.border.medium,
                          background: active ? "rgba(201,169,110,0.08)" : theme.bg.content,
                          color: active ? theme.gold : theme.text.secondary,
                          fontSize: 13,
                          fontWeight: 500,
                          fontFamily: "inherit",
                          transition: "all 120ms",
                        }}
                      >
                        {g === "male" ? "♂ Male" : "♀ Female"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Role */}
              <div>
                <Label>I am a</Label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["user", "astrologer"] as const).map((m) => {
                    const active = mode === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        style={{
                          flex: 1,
                          height: 38,
                          borderRadius: theme.radius.sm,
                          cursor: "pointer",
                          border: active
                            ? `1px solid ${theme.gold}`
                            : theme.border.medium,
                          background: active ? "rgba(201,169,110,0.08)" : theme.bg.content,
                          color: active ? theme.gold : theme.text.secondary,
                          fontSize: 13,
                          fontWeight: 500,
                          fontFamily: "inherit",
                        }}
                      >
                        {m === "user" ? "General user" : "KP astrologer"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PR A1.3-fix-25 — inline validation error (was alert() before).
                  role=alert auto-announces to screen readers; the toast in
                  the page shell also fires for high-contrast feedback. */}
              {setupError && (
                <div
                  role="alert"
                  style={{
                    background: "rgba(248,113,113,0.08)",
                    border: "0.5px solid rgba(248,113,113,0.4)",
                    color: "#fca5a5",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    lineHeight: 1.4,
                    marginTop: 4,
                  }}
                >
                  {setupError}
                </div>
              )}
              {/* Submit */}
              <button
                type="button"
                onClick={handleSetup}
                disabled={chartLoading}
                style={{
                  ...uiStyles.primaryButton,
                  width: "100%",
                  height: 44,
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  marginTop: 8,
                  opacity: chartLoading ? 0.6 : 1,
                  cursor: chartLoading ? "default" : "pointer",
                }}
              >
                {chartLoading ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    Calculating chart…
                  </>
                ) : (
                  <>
                    Generate my KP chart <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Trust footer */}
              <div
                style={{
                  fontSize: 11,
                  color: theme.text.dim,
                  textAlign: "center",
                  marginTop: 4,
                  lineHeight: 1.6,
                }}
              >
                Built by{" "}
                <a
                  href="https://www.linkedin.com/in/manyue-javvadi-datascientist/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: theme.gold,
                    textDecoration: "none",
                    borderBottom: `1px solid ${theme.gold}40`,
                  }}
                >
                  Manyue Javvadi
                </a>{" "}
                · trusted by practising KP astrologers
              </div>
            </div>
          </ContentCard>
          </FadeIn>
        </main>
      )}

      {/* Phase 9 / PR 25 — first-chart reveal animation. Renders ONCE
          immediately after a successful chart generation. The CSS
          animation auto-fades the overlay out; state cleared after
          1.75s. pointer-events: none everywhere so clicks fall through. */}
      {/* Phase 16 — Moment #1: Chart reveal CEREMONY.
          Replaces the old kp-chart-reveal CSS bloom with a 3.5s
          cinematic sequence (stars converge → planets orbit → wheel
          draws → name + nakshatra reveal). See components/ui/
          ChartRevealCeremony.tsx for the full choreography. */}
      {showChartReveal && (
        <ChartRevealCeremony
          name={birthDetails.name || workspaceData?.name}
          nakshatra={
            (workspaceData?.moon_nakshatra_en as string | undefined)
            ?? (workspaceData?.moon?.nakshatra_en as string | undefined)
            ?? (chartData?.moon?.nakshatra_en as string | undefined)
          }
          subLabel={
            workspaceData?.moon?.sign_en
              ? `${workspaceData.moon.sign_en} Moon`
              : undefined
          }
          onComplete={() => setShowChartReveal(false)}
        />
      )}

      {/* Phase 16 — Moment #5: PDF export ceremony. Always mounted;
          AnimatePresence controls show/hide via pdfLoading flag. */}
      <PdfCeremonyOverlay show={pdfLoading} />

      {/* Phase 8 / PR 23 — keyboard shortcut help overlay.
          Triggered by pressing `?` anywhere outside an editable field.
          Esc or pressing `?` again closes it. Click outside also closes. */}
      {showKbHelp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(7,11,20,0.78)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setShowKbHelp(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              border: "0.5px solid rgba(201,169,110,0.3)",
              borderRadius: 14,
              padding: "1.75rem 2rem",
              minWidth: 360,
              maxWidth: 460,
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "var(--text)" }}>
                {t("Keyboard shortcuts", "కీబోర్డ్ షార్ట్‌కట్‌లు")}
              </div>
              <button
                onClick={() => setShowKbHelp(false)}
                aria-label={t("Close", "మూసివేయండి")}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }}
              >×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 16px", alignItems: "center", fontSize: 12.5 }}>
              {[
                { keys: ["1"], label: t("Chart", "చార్ట్") },
                { keys: ["2"], label: t("Houses", "భావాలు") },
                { keys: ["3"], label: t("Dasha", "దశ") },
                { keys: ["4"], label: t("Analysis", "విశ్లేషణ") },
                { keys: ["5"], label: t("Panchang", "పంచాంగం") },
                { keys: ["6"], label: t("Muhurtha", "ముహూర్త") },
                { keys: ["7"], label: t("Match", "సరిపోలన") },
                { keys: ["8"], label: t("Horary", "ప్రశ్న") },
                { keys: ["?"], label: t("Show / hide this help", "ఈ సహాయాన్ని చూపించు / దాచు") },
                { keys: ["Esc"], label: t("Close help / modals", "మూసివేయి") },
              ].map(row => (
                <React.Fragment key={row.label}>
                  <span style={{ display: "inline-flex", gap: 4 }}>
                    {row.keys.map(k => (
                      <kbd
                        key={k}
                        style={{
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 5,
                          background: "rgba(201,169,110,0.10)",
                          border: "0.5px solid rgba(201,169,110,0.35)",
                          color: "var(--accent)",
                          minWidth: 24,
                          textAlign: "center",
                        }}
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                  <span style={{ color: "var(--text)" }}>{row.label}</span>
                </React.Fragment>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "0.5px solid var(--border)", fontSize: 11, color: "var(--muted)", lineHeight: 1.55 }}>
              {t(
                "Shortcuts work everywhere except inside text fields. Tip — press ? again to dismiss.",
                "టెక్స్ట్ ఫీల్డ్‌ల వెలుపల ఎక్కడైనా షార్ట్‌కట్‌లు పనిచేస్తాయి. చిట్కా — మూసివేయడానికి మళ్ళీ ? నొక్కండి."
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ASTROLOGER WORKSPACE ── */}
      {/* Language preference modal */}
      {showLangModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(9,9,15,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 14, padding: "2rem", maxWidth: 380, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 22, color: "var(--accent)", marginBottom: "0.5rem" }}>◈</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, marginBottom: "0.5rem" }}>
              {t("Analysis language", "విశ్లేషణ భాష")}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              {t(
                "Choose how Claude should write your KP analysis. You can change this later from the top-bar language toggle.",
                "Claude మీ KP విశ్లేషణను ఎలా రాయాలో ఎంచుకోండి. తర్వాత పై toolbar లోని language toggle నుండి మార్చవచ్చు."
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => {
                  setAnalysisLang("english");
                  setShowLangModal(false);
                  try { window.localStorage.setItem("devastroai:analysisLangModalSeen", "1"); } catch {}
                }}
                style={{ padding: "12px 20px", borderRadius: 8, border: "0.5px solid var(--border2)", background: "var(--surface2)", color: "var(--text)", cursor: "pointer", fontSize: 14, fontFamily: "inherit", textAlign: "left" }}
              >
                <div style={{ fontWeight: 500, marginBottom: 2 }}>{t("English only", "ఇంగ్లీష్ మాత్రమే")}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {t("Best for analysis quality — AI reasoning stays focused", "ఉత్తమ విశ్లేషణ నాణ్యత — AI reasoning focused")}
                </div>
              </button>
              <button
                onClick={() => {
                  setAnalysisLang("telugu_english");
                  setShowLangModal(false);
                  try { window.localStorage.setItem("devastroai:analysisLangModalSeen", "1"); } catch {}
                }}
                style={{ padding: "12px 20px", borderRadius: 8, border: "0.5px solid var(--border2)", background: "var(--surface2)", color: "var(--text)", cursor: "pointer", fontSize: 14, fontFamily: "inherit", textAlign: "left" }}
              >
                <div style={{ fontWeight: 500, marginBottom: 2 }}>{t("Telugu + English", "తెలుగు + ఇంగ్లీష్")}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {t("Mixed — KP terms in English, explanations in Telugu", "Mixed — KP terms English లో, explanations తెలుగులో")}
                </div>
              </button>
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: "1rem" }}>
              {t("Use the EN / TEL·EN / TEL toggle at the top to change anytime.", "పై EN / TEL·EN / TEL toggle తో ఎప్పుడైనా మార్చవచ్చు.")}
            </div>
          </div>
        </div>
      )}

      {/* ── NEW CHART FLOATING MODAL ── */}
      {/* Mounted over the astrologer workspace when the user clicks "+ New
          Chart" on the Person Hero Banner. The workspace behind is blurred
          via filter on its container. Reuses birthDetails/timezone state,
          stashing the previous values so Cancel can fully restore.
          PR A1.3-fix-25 — added role=dialog + aria-modal + aria-labelledby
          + Esc handler so keyboard / screen-reader users can close the
          modal without a mouse. (No focus trap helper yet — it's a future
          PR; for now, Tab cycles into the workspace background which is
          blurred but still visually present.) */}
      {newChartModalOpen && (
        <div
          onClick={handleCancelNewChartModal}
          onKeyDown={(e) => { if (e.key === "Escape") handleCancelNewChartModal(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-chart-modal-title"
          tabIndex={-1}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(9,9,15,0.55)",
            backdropFilter: "blur(8px) saturate(0.9)",
            WebkitBackdropFilter: "blur(8px) saturate(0.9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "2rem 1rem",
            animation: "fade-in 140ms ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 520, maxHeight: "calc(100vh - 4rem)",
              overflowY: "auto",
              background: theme.bg.content,
              border: `1px solid ${theme.gold}33`,
              borderRadius: theme.radius.lg,
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.65), 0 0 0 1px rgba(201,169,110,0.1)",
              padding: "1.5rem",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 999,
                  background: "rgba(0,200,255,0.08)", border: "1px solid rgba(0,200,255,0.2)",
                  color: "#00C8FF", fontSize: 10, fontWeight: 500,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  marginBottom: 10,
                }}>
                  <Sparkles size={11} /> {t("New KP chart", "కొత్త KP చార్ట్")}
                </div>
                <div id="new-chart-modal-title" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: theme.text.primary, lineHeight: 1.2 }}>
                  {t("Add a new chart", "కొత్త చార్ట్ జోడించండి")}
                </div>
                <div style={{ fontSize: 12, color: theme.text.muted, marginTop: 4 }}>
                  {t("Your current chart stays open in the background.", "మీ ప్రస్తుత చార్ట్ వెనుక తెరిచి ఉంటుంది.")}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelNewChartModal}
                aria-label="Close"
                style={{
                  background: "transparent", border: `1px solid ${theme.border.medium}`,
                  color: theme.text.secondary, width: 30, height: 30, borderRadius: 8,
                  cursor: "pointer", fontSize: 18, lineHeight: 1, display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Name */}
              <div>
                <Label icon={<User size={11} />}>{t("Name", "పేరు")}</Label>
                <input
                  type="text"
                  placeholder={t("Full name", "పూర్తి పేరు")}
                  value={birthDetails.name}
                  onChange={(e) => setBirthDetails((prev) => ({ ...prev, name: e.target.value }))}
                  style={uiStyles.input}
                />
              </div>

              {/* Date + Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <Label icon={<Clock size={11} />}>{t("Date of birth", "పుట్టిన తేదీ")}</Label>
                  <input
                    type="text" inputMode="numeric"
                    placeholder="DD/MM/YYYY"
                    maxLength={10}
                    value={birthDetails.date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    style={uiStyles.input}
                  />
                </div>
                <div>
                  <Label icon={<Clock size={11} />}>{t("Time of birth", "పుట్టిన సమయం")}</Label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text" inputMode="numeric"
                      placeholder="HH:MM"
                      maxLength={5}
                      value={birthDetails.time}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      style={{ ...uiStyles.input, flex: 1 }}
                    />
                    <select
                      value={birthDetails.ampm}
                      onChange={(e) => setBirthDetails((prev) => ({ ...prev, ampm: e.target.value }))}
                      style={{ ...uiStyles.input, width: 70, cursor: "pointer" }}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Place */}
              <div>
                <Label icon={<Globe2 size={11} />}>{t("Place of birth", "పుట్టిన ప్రదేశం")}</Label>
                <PlacePicker
                  value={birthDetails.place}
                  onChange={(placeName, pick) => {
                    setBirthDetails((prev) => ({
                      ...prev,
                      place: placeName,
                      latitude: pick ? pick.lat : null,
                      longitude: pick ? pick.lon : null,
                    }));
                    if (pick?.timezone) {
                      try {
                        const now = new Date();
                        const fmt = new Intl.DateTimeFormat("en-US", { timeZone: pick.timezone, timeZoneName: "longOffset" });
                        const parts = fmt.formatToParts(now);
                        const tzPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
                        const m = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
                        if (m) {
                          const sign = m[1] === "-" ? -1 : 1;
                          const h = parseInt(m[2], 10);
                          const mm = parseInt(m[3] ?? "0", 10);
                          const offset = sign * (h + mm / 60);
                          setTimezoneOffset(offset);
                          setTimezoneLabel(pick.timezone.split("/").pop() ?? `UTC${offset >= 0 ? "+" : ""}${offset}`);
                          return;
                        }
                      } catch { /* silent */ }
                    }
                    if (pick) {
                      axios.get("https://api.bigdatacloud.net/data/reverse-geocode-client", {
                        params: { latitude: pick.lat, longitude: pick.lon, localityLanguage: "en" },
                      }).then((res) => {
                        const tz = res.data?.timezone;
                        if (tz?.gmtOffset !== undefined) {
                          const offset = Math.round((tz.gmtOffset / 3600) * 2) / 2;
                          setTimezoneOffset(offset);
                          setTimezoneLabel(tz.zoneAbbr || `UTC${offset >= 0 ? "+" : ""}${offset}`);
                        }
                      }).catch(() => {});
                    }
                  }}
                  placeholder={t("Start typing a city…", "నగరం టైప్ చేయండి…")}
                />
              </div>

              {/* Gender */}
              <div>
                <Label>{t("Gender", "లింగం")}</Label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["male", "female"] as const).map((g) => {
                    const active = birthDetails.gender === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setBirthDetails((prev) => ({ ...prev, gender: g }))}
                        style={{
                          flex: 1, height: 38, borderRadius: theme.radius.sm, cursor: "pointer",
                          border: active ? `1px solid ${theme.gold}` : theme.border.medium,
                          background: active ? "rgba(201,169,110,0.08)" : theme.bg.content,
                          color: active ? theme.gold : theme.text.secondary,
                          fontSize: 13, fontWeight: 500, fontFamily: "inherit",
                          transition: "all 120ms",
                        }}
                      >
                        {g === "male" ? "♂ Male" : "♀ Female"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PR A1.3-fix-25 — same inline error pattern in NewChartModal */}
              {setupError && (
                <div
                  role="alert"
                  style={{
                    background: "rgba(248,113,113,0.08)",
                    border: "0.5px solid rgba(248,113,113,0.4)",
                    color: "#fca5a5",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    lineHeight: 1.4,
                    marginTop: 4,
                  }}
                >
                  {setupError}
                </div>
              )}
              {/* Submit + Cancel */}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleCancelNewChartModal}
                  style={{
                    flex: "0 0 auto", padding: "0 18px", height: 44,
                    borderRadius: theme.radius.sm, border: theme.border.medium,
                    background: "transparent", color: theme.text.secondary,
                    fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {t("Cancel", "రద్దు")}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitNewChartModal}
                  disabled={chartLoading}
                  style={{
                    ...uiStyles.primaryButton,
                    flex: 1, height: 44, justifyContent: "center",
                    fontSize: 14, fontWeight: 600,
                    opacity: chartLoading ? 0.6 : 1,
                    cursor: chartLoading ? "default" : "pointer",
                  }}
                >
                  {chartLoading ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      {t("Calculating…", "లెక్కిస్తోంది…")}
                    </>
                  ) : (
                    <>
                      {t("Generate chart", "చార్ట్ రూపొందించు")} <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {setupDone && mode === "astrologer" && workspaceData && (
        <div
          style={{
            display: "flex", flexDirection: "column", flex: 1, overflow: "hidden",
            position: "relative", zIndex: 5,
            filter: newChartModalOpen ? "blur(4px) saturate(0.85)" : "none",
            pointerEvents: newChartModalOpen ? "none" : "auto",
            transition: "filter 160ms ease",
          }}
          aria-hidden={newChartModalOpen ? "true" : undefined}
        >
        {/* Person Hero Banner — always visible above tabs */}
        <PersonHeroBanner
          workspaceData={workspaceData as WorkspaceData}
          birthDetails={birthDetails}
          onNewChart={handleNewChart}
          onPdf={async () => {
            if (!workspaceData || pdfLoading) return;
            setPdfLoading(true); setPdfError("");
            try {
              // Phase 14 PR A hotfix — inject `place` (which lives in
              // birthDetails, not the workspace return) so the PDF
              // cover and birth-details section render the proper
              // city name instead of falling back to lat/lon.
              const enrichedWorkspace = {
                ...workspaceData,
                place: birthDetails.place || (workspaceData as any).place,
              };
              const res = await axios.post(`${API_URL}/pdf/export`, { workspace: enrichedWorkspace }, { responseType: "blob", timeout: 30000 });
              const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
              const a = document.createElement("a"); a.href = url;
              a.download = `${workspaceData.name || "kp_chart"}_report.pdf`; a.click();
              // PR A1.3-fix-24 — defer revoke so slow browsers (Safari iOS,
              // some Android Chromes) get to start the download before the
              // blob URL is invalidated. 1s is conservative; PDFs typically
              // start streaming in <100ms.
              setTimeout(() => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } }, 1000);
            } catch (e: any) {
              // PR A1.3-fix-25 — surface as a visible toast (was silently
              // setting pdfError state that nothing rendered).
              const msg = e?.response?.status === 500
                ? "PDF server error — please try again"
                : e?.response?.status === 413
                ? "Workspace too large for PDF export"
                : "PDF download failed — please try again";
              setPdfError(msg);
              setToast({ msg, tone: "error" });
            }
            setPdfLoading(false);
          }}
          pdfLoading={pdfLoading}
          savedSessions={savedSessions}
          onSwitchSession={handleSwitchSession}
          astrologerMode={true}
        />
        {/* PR A1.3-fix-25 — global toast for transient errors (PDF, horary,
            place-picker service errors, etc.). Auto-dismisses after 5s.
            Replaces the prior pattern where errors silently set state nothing
            rendered. role=status + aria-live announces to screen readers. */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "fixed",
              top: 76,
              right: 16,
              zIndex: 200,
              background: toast.tone === "error" ? "rgba(248,113,113,0.12)" : "var(--surface2)",
              border: `0.5px solid ${toast.tone === "error" ? "rgba(248,113,113,0.4)" : "var(--border2)"}`,
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              color: toast.tone === "error" ? "#fca5a5" : "var(--text)",
              maxWidth: 360,
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            }}
          >
            <span style={{ flex: 1 }}>{toast.msg}</span>
            <button
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                opacity: 0.7,
                cursor: "pointer",
                padding: 2,
                fontSize: 14,
                lineHeight: 1,
                fontFamily: "inherit",
              }}
            >×</button>
          </div>
        )}
        {/* Phase 9 / PR 24 — constellation backdrop. The gold-flecked
            radial-gradient pattern lives behind the workspace at <4%
            opacity. Adds peripheral cosmos texture without competing
            with the chart canvas. Class-based + background-attachment
            fixed → static stars while the workspace scrolls. */}
        <div className="workspace-layout kp-constellation" style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Collapsed rail — shown when sidebar is closed, gives the user
              a Claude-style reopen affordance on the left edge. */}
          {!sidebarOpen && (
            <button
              type="button"
              aria-label="Open sidebar"
              onClick={() => setSidebarOpen(true)}
              style={{
                width: 36,
                flexShrink: 0,
                borderRight: "0.5px solid var(--border)",
                background: "var(--surface)",
                border: "none",
                borderTop: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "12px 0",
                color: "var(--muted)",
                transition: "color 120ms, background 120ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.background = "rgba(255,255,255,0.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted)";
                e.currentTarget.style.background = "var(--surface)";
              }}
            >
              <ChevronRight size={16} />
            </button>
          )}

          {/* Sidebar */}
          {sidebarOpen && (
            <div className="workspace-sidebar" style={{ width: 210, borderRight: "0.5px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", overflow: "auto", flexShrink: 0, transition: "width 0.2s" }}>
              {/* Sidebar header — collapse toggle on the right, Claude-style. */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 10px 8px",
                  borderBottom: "0.5px solid var(--border)",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: "var(--muted)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase" as const,
                    fontWeight: 500,
                  }}
                >
                  Workspace
                </span>
                <button
                  type="button"
                  aria-label="Collapse sidebar"
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    width: 24,
                    height: 24,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    border: "none",
                    borderRadius: 5,
                    color: "var(--muted)",
                    cursor: "pointer",
                    transition: "color 120ms, background 120ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--muted)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
              </div>

              {/* PR A1.3-fix-25 — sidebar Charts section now ALWAYS renders
                  when in astrologer mode + setupDone, so first-time users
                  see their current chart in the list (with the ★ Active
                  highlight) instead of an empty sidebar with no clue.
                  Was previously gated on `savedSessions.length > 0` which
                  hid the entire section before any chart was generated. */}
              {(savedSessions.length > 0 || (mode === "astrologer" && setupDone)) && (
                <div className="sidebar-section" style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--border)", flexShrink: 0 }}>
                  {/* Phase 5 / PR 13 — i18n holes (#14). The sidebar
                      eyebrow + active marker + the verbose help text
                      were hardcoded English even in pure TEL mode. Now
                      every chrome string flows through t(en, te). */}
                  <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 5 }}>{t("Charts", "చార్టులు")}</div>
                  {workspaceData?.name && (
                    <div style={{ padding: "8px", borderRadius: 8, background: "rgba(201,169,110,0.08)", border: "0.5px solid rgba(201,169,110,0.4)", marginBottom: 6 }}>
                      <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500, marginBottom: 1 }}>
                        {workspaceData.name.split(" ")[0]}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(201,169,110,0.6)" }}>★ {t("Active", "ప్రస్తుతం")}</div>
                    </div>
                  )}
                  {savedSessions.length === 0 && workspaceData?.name && (
                    <div style={{ fontSize: 10, color: "var(--muted)", padding: "4px 2px 6px", lineHeight: 1.45 }}>
                      {lang === "en" ? (
                        <>Use <strong style={{ color: "var(--accent)", fontWeight: 500 }}>+ New Chart</strong> in the header to add another. Saved charts appear here.</>
                      ) : (
                        <><strong style={{ color: "var(--accent)", fontWeight: 500 }}>+ కొత్త చార్ట్</strong> బటన్‌తో మరొకటి జోడించండి. సేవ్ చేసిన చార్టులు ఇక్కడ కనిపిస్తాయి.</>
                      )}
                    </div>
                  )}
                  {savedSessions.map(s => {
                    const dasha = s.workspaceData?.mahadasha?.lord_en || "";
                    const ad = s.workspaceData?.current_antardasha?.lord_en || "";
                    const gender = s.birthDetails?.gender;
                    const birthYear = s.birthDetails?.date?.split("/")?.[2] || s.birthDetails?.date?.split("-")?.[0] || "";
                    const dashaLabel = dasha && ad ? `${dasha}–${ad}` : dasha || "";
                    return (
                      <div key={s.id} style={{ position: "relative", marginBottom: 6 }}>
                        <button onClick={() => handleSwitchSession(s)}
                          style={{ width: "100%", padding: "8px 28px 8px 8px", borderRadius: 8, background: "var(--surface2)", border: "0.5px solid var(--border2)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "border-color 0.2s" }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(201,169,110,0.4)")}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border2)")}>
                          <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, marginBottom: 2 }}>
                            {gender === "male" ? "♂ " : gender === "female" ? "♀ " : "◈ "}{s.name?.split(" ")[0]}
                          </div>
                          {dashaLabel && <div style={{ fontSize: 10, color: "var(--accent)", marginBottom: 1 }}>{dashaLabel}</div>}
                          {birthYear && <div style={{ fontSize: 10, color: "var(--muted)" }}>{t(`Born ${birthYear}`, `${birthYear} జన్మ`)}</div>}
                        </button>
                        <button onClick={() => handleRemoveSession(s.id)}
                          style={{ position: "absolute", top: 6, right: 6, background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "2px 4px", opacity: 0.5 }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}>×</button>
                      </div>
                    );
                  })}
                  <button onClick={handleNewChart}
                    style={{ width: "100%", padding: "3px 8px", borderRadius: 6, background: "transparent", border: "0.5px dashed var(--border2)", fontSize: 10, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}>
                    + {t("New Chart", "కొత్త చార్ట్")}
                  </button>
                </div>
              )}
              {/* Phase 3 — sidebar restructure (#B).
                  REMOVED:
                    1. Avatar + name + birth-details + KP/Placidus badges
                       block. The persistent header (PersonHeroBanner)
                       already carries this; showing it again here was
                       pure duplication and the dead-air below it ate
                       half the rail.
                    2. The "PANCHANG · NOW" / "TODAY" sidebar widget. Its
                       content moved up to <TodayStrip>, which is sticky,
                       discoverable, and scoped to one job.
                  KEPT: the chart switcher (the only thing that earns a
                  permanent rail). */}
            </div>
          )}

          {/* Main content */}
          <div className="workspace-main" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
            {/* Phase 3 — Today panchang strip (#F). Phase 8 / PR 21 — pills
                are clickable shortcuts into the Panchang tab.
                Phase 10 / PR 27 — when liveLoc has resolved (browser geo
                or manual city pick), `liveTodayPanchang` carries today's
                panchang for the user's CURRENT location and we render
                that. Falls back to the chart-load `panchangam_today`
                snapshot (birth lat/lon) when live data isn't available
                yet — and the strip's eyebrow pill says so. */}
            {(liveTodayPanchang || workspaceData?.panchangam_today) && (
              <TodayStrip
                data={liveTodayPanchang ?? workspaceData.panchangam_today}
                isLive={!!liveTodayPanchang}
                cityLabel={liveTodayPanchang?._city}
                onJumpToPanchang={() => setActiveTab("panchang")}
              />
            )}

            {/* Tabs */}
            <div className="tab-bar" style={{ display: "flex", borderBottom: "0.5px solid var(--border)", background: "var(--surface)", overflowX: "auto", flexShrink: 0 }}>
              {TABS.map(tab => {
                const TabIcon = tab.Icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(201,169,110,0.04)"; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                    style={{
                      // Phase 5 / PR 14 — active tab now reads as a filled
                      // gold pill (subtle bg + same gold underline) instead
                      // of just a 2px line — much clearer at a glance.
                      // Inactive tabs get a hint of gold on hover so the
                      // tab bar feels alive (#M).
                      padding: "10px 16px",
                      background: active ? "rgba(201,169,110,0.07)" : "transparent",
                      border: "none",
                      borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                      color: active ? "var(--accent)" : "var(--muted)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                      transition: "color 0.15s, border-color 0.15s, background 0.15s",
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <TabIcon size={15} strokeWidth={1.8} />
                    {/* Primary + secondary lines — hidden based on lang */}
                    <span style={{ fontSize: 11 }}>
                      {lang === "en" ? tab.en : tab.te}
                    </span>
                    {lang === "te_en" && (
                      <span style={{ fontSize: 9, opacity: 0.55 }}>{tab.en}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Phase 3 — chart context strip (#A).
                Lagna / Moon / Sun + current dasha (MD/AD/PAD) + RPs at
                birth — moved here from the persistent header so they sit
                attached to the chart-related tabs where they're relevant.
                Skipped on Panchang / Muhurtha / Horary which have their
                own situational context (live RPs, event RPs, prashna
                RPs respectively) and don't need the natal chips on top. */}
            {workspaceData && ["chart", "houses", "dasha", "analysis", "match"].includes(activeTab) && (
              <ChartContextStrip workspaceData={workspaceData as WorkspaceData} />
            )}

            {/* Tab content */}
            <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>

              {/* CHART — two-column: chart left, PlanetList right */}
              {/* PR R1 (Phase A foundation refactor) — chart tab extracted to
                  tabs/ChartTab.tsx as proof-of-pattern. Same behavior, ~108
                  lines of JSX moved out of page.tsx. chartView state moved
                  into the component (tab-local); selectedHouse stays here
                  because HousesTab (next extraction) also reads it. */}
              {activeTab === "chart" && workspaceData && (
                <ChartTab
                  workspaceData={workspaceData as WorkspaceData}
                  selectedHouse={selectedHouse}
                  setSelectedHouse={setSelectedHouse}
                />
              )}

              {/* PR R2 (Phase A refactor) — HOUSES tab extracted to
                  tabs/HousesTab.tsx. Tab-local state (housesSubTab,
                  cslSelectedHouse, showSigGrid) moved into the component.
                  selectedHouse stays in parent (shared with ChartTab). */}
              {activeTab === "houses" && workspaceData && (
                <HousesTab
                  workspaceData={workspaceData as WorkspaceData}
                  selectedHouse={selectedHouse}
                  setSelectedHouse={setSelectedHouse}
                />
              )}

              {/* ────────────────────────────────────────────────
                   DASHA (Vimshottari) — PR19 wow pass.
                   Serif page hero, 3-card "Currently running" hero
                   with breathing MD card and progress bars, premium
                   section headers for AD timeline + PAD list,
                   polished PAD cards, Transit (PR18) at the bottom.
                   Full i18n — no hardcoded Telugu.
                   ──────────────────────────────────────────────── */}
              {/* PR R3 (Phase A refactor) — DASHA tab extracted to
                  tabs/DashaTab.tsx. Transit state (8 vars) bundled
                  into transitState prop to keep the interface clean. */}
              {activeTab === "dasha" && workspaceData && (
                <DashaTab
                  workspaceData={workspaceData as WorkspaceData}
                  transitState={{
                    data: transitData,
                    loading: transitLoading,
                    date: transitDate,
                    fetchedAt: transitFetchedAt,
                    subTab: transitSubTab,
                    show: showTransitInDasha,
                    setData: setTransitData,
                    setLoading: setTransitLoading,
                    setDate: setTransitDate,
                    setFetchedAt: setTransitFetchedAt,
                    setSubTab: setTransitSubTab,
                    setShow: setShowTransitInDasha,
                  }}
                  liveLoc={liveLoc}
                  timezoneOffset={timezoneOffset}
                  apiUrl={API_URL}
                />
              )}

              {/* PANCHANGAM TAB */}
              {/* PR R8 (Phase A refactor) — PANCHANG tab extracted. FINAL TAB. */}
              {activeTab === "panchang" && (
                <PanchangTab
                  workspaceData={workspaceData}
                  apiUrl={API_URL}
                  liveLoc={liveLoc}
                  pcData={pcData} setPcData={setPcData}
                  pcLoading={pcLoading} setPcLoading={setPcLoading}
                  pcLocationName={pcLocationName} setPcLocationName={setPcLocationName}
                  pcDetectedCoords={pcDetectedCoords} setPcDetectedCoords={setPcDetectedCoords}
                  pcGeoError={pcGeoError} setPcGeoError={setPcGeoError}
                  pcShowCityModal={pcShowCityModal} setPcShowCityModal={setPcShowCityModal}
                  pcCityQuery={pcCityQuery} setPcCityQuery={setPcCityQuery}
                  pcCitySuggestions={pcCitySuggestions} setPcCitySuggestions={setPcCitySuggestions}
                  pcCitySearching={pcCitySearching}
                  pcCitySearchRef={pcCitySearchRef}
                  pcFetchLocationRef={pcFetchLocationRef}
                  calMonth={calMonth} setCalMonth={setCalMonth}
                  calData={calData} setCalData={setCalData}
                  calLoading={calLoading} setCalLoading={setCalLoading}
                  calSelectedDay={calSelectedDay} setCalSelectedDay={setCalSelectedDay}
                />
              )}

              {/* PR R7 (Phase A refactor) — MUHURTHA tab extracted */}
              {activeTab === "muhurtha" && (
                <MuhurthaTab
                  workspaceData={workspaceData}
                  apiUrl={API_URL}
                  liveLoc={liveLoc}
                  birthDetails={birthDetails}
                  timezoneOffset={timezoneOffset}
                  savedSessions={savedSessions}
                  setSavedSessions={setSavedSessions}
                  mEventLocSearching={mEventLocSearching}
                  mStep={mStep} setMStep={setMStep}
                  mEventType={mEventType} setMEventType={setMEventType}
                  mDateStart={mDateStart} setMDateStart={setMDateStart}
                  mDateEnd={mDateEnd} setMDateEnd={setMDateEnd}
                  mEventLoc={mEventLoc} setMEventLoc={setMEventLoc}
                  mEventLocMode={mEventLocMode} setMEventLocMode={setMEventLocMode}
                  mEventLocSugg={mEventLocSugg} setMEventLocSugg={setMEventLocSugg}
                  mParticipants={mParticipants} setMParticipants={setMParticipants}
                  mShowAddParticipant={mShowAddParticipant} setMShowAddParticipant={setMShowAddParticipant}
                  mNewP={mNewP} setMNewP={setMNewP}
                  mNewPPlaceSugg={mNewPPlaceSugg} setMNewPPlaceSugg={setMNewPPlaceSugg}
                  mNewPPlaceStatus={mNewPPlaceStatus} setMNewPPlaceStatus={setMNewPPlaceStatus}
                  mLoading={mLoading} setMLoading={setMLoading}
                  mResults={mResults} setMResults={setMResults}
                  mSelectedDate={mSelectedDate} setMSelectedDate={setMSelectedDate}
                  mExpandedWindow={mExpandedWindow} setMExpandedWindow={setMExpandedWindow}
                  mAiQuestion={mAiQuestion} setMAiQuestion={setMAiQuestion}
                  mAiMessages={mAiMessages} setMAiMessages={setMAiMessages}
                  mAiLoading={mAiLoading} setMAiLoading={setMAiLoading}
                  handleMEventLocSearch={handleMEventLocSearch}
                  handleMNewPDateChange={handleMNewPDateChange}
                  handleMNewPTimeChange={handleMNewPTimeChange}
                />
              )}

              {activeTab === "match" && (
                <MatchTab
                  workspaceData={workspaceData}
                  birthDetails={birthDetails}
                  savedSessions={savedSessions}
                  setSavedSessions={setSavedSessions}
                  apiUrl={API_URL}
                  snapshotCurrentSession={snapshotCurrentSession}
                  sessionToApiPerson={sessionToApiPerson}
                  matchPerson2Inline={matchPerson2Inline}
                  setMatchPerson2Inline={setMatchPerson2Inline}
                  matchResults={matchResults}
                  setMatchResults={setMatchResults}
                  matchLoading={matchLoading}
                  setMatchLoading={setMatchLoading}
                  matchSubTab={matchSubTab}
                  setMatchSubTab={setMatchSubTab}
                  matchHouseShared={matchHouseShared}
                  setMatchHouseShared={setMatchHouseShared}
                  matchAnalysisMessages={matchAnalysisMessages}
                  setMatchAnalysisMessages={setMatchAnalysisMessages}
                  matchAnalysisLoading={matchAnalysisLoading}
                  matchAnalysisLang={matchAnalysisLang}
                  setMatchAnalysisLang={setMatchAnalysisLang}
                  matchChatQ={matchChatQ}
                  setMatchChatQ={setMatchChatQ}
                  mNewP={mNewP}
                  setMNewP={setMNewP}
                  mNewPPlaceSugg={mNewPPlaceSugg}
                  setMNewPPlaceSugg={setMNewPPlaceSugg}
                  mNewPPlaceStatus={mNewPPlaceStatus}
                  setMNewPPlaceStatus={setMNewPPlaceStatus}
                  handleMatchChat={handleMatchChat}
                  handleMatchTopicAnalysis={handleMatchTopicAnalysis}
                  handleMNewPDateChange={handleMNewPDateChange}
                  handleMNewPTimeChange={handleMNewPTimeChange}
                />
              )}

              {activeTab === "horary" && (
                <HoraryTab
                  workspaceData={workspaceData}
                  setToast={setToast}
                  liveLoc={liveLoc}
                  apiUrl={API_URL}
                  horaryNumber={horaryNumber}
                  setHoraryNumber={setHoraryNumber}
                  horaryDiceSpin={horaryDiceSpin}
                  setHoraryDiceSpin={setHoraryDiceSpin}
                  horaryDigitEditing={horaryDigitEditing}
                  setHoraryDigitEditing={setHoraryDigitEditing}
                  horaryDigitDraft={horaryDigitDraft}
                  setHoraryDigitDraft={setHoraryDigitDraft}
                  horaryRollRef={horaryRollRef}
                  horaryQuestion={horaryQuestion}
                  setHoraryQuestion={setHoraryQuestion}
                  horaryTopic={horaryTopic}
                  setHoraryTopic={setHoraryTopic}
                  horaryResult={horaryResult}
                  setHoraryResult={setHoraryResult}
                  horaryLoading={horaryLoading}
                  setHoraryLoading={setHoraryLoading}
                />
              )}

              {/* ANALYSIS — chat bubble design + quick insights.
                  Phase 11 / PR 28 — Analysis polish batch:
                    - Topic chip strip is now sticky so users can switch
                      topics without scrolling to top in long sessions (#A6)
                    - Clear button asks for confirmation before wiping
                      conversation history (#A8)
                    - Topic grid expanded to 10 to match Horary canon (#A9)
                    - AI bubbles capped to 80ch readable width (#A17)
                    - Timestamps under each AI bubble (#A16) */}
              {/* PR R4 (Phase A refactor) — ANALYSIS tab extracted to
                  tabs/AnalysisTab.tsx. SACRED-ADJACENT per the AI Quality
                  Preservation Protocol — all chat state stays in parent,
                  passed as props; the AnalysisTab is pure rendering. */}
              {activeTab === "analysis" && (
                <AnalysisTab
                  analysisMessages={analysisMessages as any}
                  setAnalysisMessages={setAnalysisMessages as any}
                  analysisLoading={analysisLoading}
                  setAnalysisLoading={setAnalysisLoading}
                  activeTopic={activeTopic}
                  setActiveTopic={setActiveTopic}
                  analysisLang={analysisLang}
                  setAnalysisLang={setAnalysisLang}
                  setChatQ={setChatQ}
                  handleTopicAnalysis={handleTopicAnalysis}
                  askStreamAbortRef={askStreamAbortRef}
                  analyzeStreamAbortRef={analyzeStreamAbortRef}
                  chatEndRef={chatEndRef}
                />
              )}
            </div>

            {/* Chat input (workspace-level — visible on every tab except
                Horary, Panchang, Muhurtha, where it would either route
                to Analysis AI which doesn't know about those tabs' data,
                or duplicate the tab's own dedicated Ask strip.
                PR A1.1b hid it on Horary, PR A1.2b extends to Panchang.
                Phase 4 / PR 10 (#22) extends to Muhurtha — the AI
                Muhurtha Analysis card has its own Ask + suggestion
                chips, so showing this strip below it was strict noise. */}
            {activeTab !== "horary" && activeTab !== "panchang" && activeTab !== "muhurtha" && (
            <div style={{ borderTop: "0.5px solid var(--border)", padding: "0.75rem 1.25rem", background: "var(--surface)", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              <input
                value={chatQ}
                onChange={e => setChatQ(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleWorkspaceChat(); }}
                placeholder={t("Ask a deeper question…", "లోతైన విశ్లేషణ కోసం అడగండి…")}
                style={{ flex: 1, background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit" }}
              />
              <button onClick={handleWorkspaceChat} disabled={analysisLoading || !chatQ.trim()}
                style={{ background: chatQ.trim() ? "var(--accent)" : "var(--surface2)", color: chatQ.trim() ? "#09090f" : "var(--muted)", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: chatQ.trim() ? "pointer" : "default", fontWeight: 500, fontFamily: "inherit" }}>
                {t("Ask", "అడగు")}
              </button>
            </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* ── USER CHAT ── */}
      {/* PR A1.3-fix-15 — User-mode UI revamp.
          The old 130-line inline JSX was replaced by the UserModeUI
          component which delivers a 2-column premium layout (chat +
          chart panel), HeroVerdictCard rendering, TimingStrip,
          ActiveAnalysisPanel, EmptyStateHero with categorized starter
          questions, and mobile bottom-sheet collapse. */}
      {setupDone && mode === "user" && (
        <UserModeUI
          birthDetails={birthDetails}
          chartData={chartData}
          messages={messages}
          question={question}
          setQuestion={setQuestion}
          loading={loading}
          handleAsk={handleAsk}
          activeNote={activeNote}
          setActiveNote={setActiveNote}
          noteInput={noteInput}
          setNoteInput={setNoteInput}
          handleFeedback={handleFeedback}
          handleNoteSubmit={handleNoteSubmit}
          isMobile={isMobile}
        />
      )}

      {/* PR20 — Mobile Command Orb. Renders only on mobile viewports,
          only after the chart is set up (no point showing nav during
          onboarding). Provides draggable tab access + power actions. */}
      {setupDone && isMobile && (
        <CommandOrb
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNewChart={handleNewChart}
          sessions={savedSessions}
          currentSessionId={currentSessionId}
          onSwitchSession={handleSwitchSession}
        />
      )}

      {/* Phase 13.2 — on-screen Anthropic call counter. Always visible
          so the user can verify that billing changes correlate with
          their actions. Click to expand the last-10 call log.
          Counts every Anthropic-billing fetch this browser session. */}
      <AiCallBadge />
    </div>
  );
}

/**
 * Bilingual section eyebrow — big Telugu line with a subtle English
 * subtitle underneath, gold tinted. Used at the top of every workspace
 * section so astrologers scanning the page always see the primary
 * Telugu label first with English as secondary support.
 */
// SectionEyebrow moved to ./components/SectionEyebrow.tsx in PR R1
// (Phase A foundation refactor). Imported at top of file.

/**
 * Small form-field label used in the onboarding card. Icon + uppercase text.
 */
function Label({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10,
        color: theme.text.dim,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontWeight: 500,
        marginBottom: 6,
      }}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}
