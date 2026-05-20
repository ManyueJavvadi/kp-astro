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
              {activeTab === "panchang" && (() => {
                /* ── Panchangam auto-detect helpers ── */
                const pcFetchLocation = async (dateStr?: string) => {
                  if (pcLoading) return;
                  setPcLoading(true);
                  try {
                    let lat: number, lon: number, tz: number;
                    if (pcDetectedCoords) {
                      lat = pcDetectedCoords.lat; lon = pcDetectedCoords.lon; tz = pcDetectedCoords.tz;
                    } else if (liveLoc.location) {
                      // Phase 1 / PR 3 — reconcile Panchang to the shared
                      // useLiveLocation hook. Horary already uses it; before
                      // this change Panchang ran its OWN navigator.geolocation
                      // call which could resolve differently (the 2026-05-06
                      // stress test caught Panchang showing "Could not detect"
                      // while Horary showed "Toronto, Canada" in the same
                      // session). Now any tab that opens after the hook has
                      // a value seeds from the cached location.
                      lat = liveLoc.location.latitude;
                      lon = liveLoc.location.longitude;
                      tz = 0; // Backend auto-resolves timezone from lat/lon
                      setPcDetectedCoords({ lat, lon, tz });
                      setPcLocationName(liveLoc.location.display);
                    } else {
                      // No shared cache and no local state — try browser
                      // geolocation directly. Do NOT fall back to birth coords.
                      const pos = await new Promise<GeolocationPosition>((res, rej) =>
                        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
                      ).catch(() => null);

                      if (!pos) {
                        // Geolocation failed — open city selector instead of silent fallback
                        setPcGeoError(t("Could not detect location. Please select your city.", "ప్రదేశం గుర్తించలేకపోయాము. దయచేసి మీ నగరం ఎంచుకోండి."));
                        setPcShowCityModal(true);
                        setPcLoading(false);
                        return;
                      }

                      lat = pos.coords.latitude;
                      lon = pos.coords.longitude;
                      tz = 0; // Backend auto-resolves timezone from lat/lon
                      setPcDetectedCoords({ lat, lon, tz });
                      // Reverse geocode for display name
                      try {
                        const geo = await axios.get("https://nominatim.openstreetmap.org/reverse", {
                          params: { lat, lon, format: "json", addressdetails: 1, "accept-language": "en" },
                          headers: { "User-Agent": "DevAstroAI/1.0" }
                        });
                        const addr = geo.data?.address || {};
                        const city = addr.neighbourhood || addr.suburb || addr.city_district
                          || addr.city || addr.town || addr.village || "";
                        const country = addr.country || "";
                        const displayName = city && country ? `${city}, ${country}` : city || country || `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`;
                        setPcLocationName(displayName);
                        // PR 3 — push the freshly-resolved location into the
                        // shared hook so Horary / Muhurtha / Transit see it
                        // without re-querying.
                        liveLoc.override({ lat, lon, display: displayName });
                      } catch {
                        const fallback = `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`;
                        setPcLocationName(fallback);
                        liveLoc.override({ lat, lon, display: fallback });
                      }
                    }
                    const r = await axios.post(`${API_URL}/panchangam/location`, {
                      latitude: lat, longitude: lon, timezone_offset: tz, ...(dateStr ? { date: dateStr } : {}),
                    });
                    setPcData(r.data);
                    // Also load calendar if not loaded
                    if (!calData) {
                      setCalLoading(true);
                      const cm = dateStr ? { year: parseInt(dateStr.split("-")[0]), month: parseInt(dateStr.split("-")[1]) } : calMonth;
                      axios.post(`${API_URL}/panchangam/calendar`, { latitude: lat, longitude: lon, timezone_offset: tz, year: cm.year, month: cm.month })
                        .then(cr => setCalData(cr.data)).catch(() => setCalData(null)).finally(() => setCalLoading(false));
                    }
                  } catch { setPcData(null); }
                  setPcLoading(false);
                };
                const pcSelectCity = (s: PlaceSuggestion) => {
                  const tz = 0; // Backend auto-resolves timezone from lat/lon
                  setPcDetectedCoords({ lat: s.lat, lon: s.lon, tz });
                  setPcLocationName(s.display);
                  setPcShowCityModal(false);
                  setPcCityQuery(""); setPcCitySuggestions([]); setPcGeoError("");
                  setPcData(null); setCalData(null); // Clear old data → auto-load triggers refetch
                  // PR 3 — propagate the manual pick to the shared hook so
                  // every other tab (Horary, Muhurtha, Transit) reflects it.
                  liveLoc.override({ lat: s.lat, lon: s.lon, display: s.display });
                };
                const pcTryMyLocation = () => {
                  setPcGeoError("");
                  setPcDetectedCoords(null); // Force re-detect
                  setPcShowCityModal(false);
                  setPcData(null); // Clear → auto-load triggers pcFetchLocation
                };
                const pcFetchCalendar = (yr: number, mo: number) => {
                  if (!pcDetectedCoords) return;
                  setCalLoading(true); setCalData(null);
                  axios.post(`${API_URL}/panchangam/calendar`, { latitude: pcDetectedCoords.lat, longitude: pcDetectedCoords.lon, timezone_offset: pcDetectedCoords.tz, year: yr, month: mo })
                    .then(r => setCalData(r.data)).catch(() => setCalData(null)).finally(() => setCalLoading(false));
                };
                const handleDayClick = (dateStr: string) => {
                  if (calSelectedDay === dateStr) { setCalSelectedDay(null); return; }
                  setCalSelectedDay(dateStr);
                  if (!pcDetectedCoords) return;
                  setPcLoading(true);
                  axios.post(`${API_URL}/panchangam/location`, { latitude: pcDetectedCoords.lat, longitude: pcDetectedCoords.lon, timezone_offset: pcDetectedCoords.tz, date: dateStr })
                    .then(r => setPcData(r.data)).catch(() => {}).finally(() => setPcLoading(false));
                };
                const prevMonth = () => {
                  const prev = calMonth.month === 1 ? { year: calMonth.year - 1, month: 12 } : { year: calMonth.year, month: calMonth.month - 1 };
                  setCalMonth(prev); setCalSelectedDay(null); pcFetchCalendar(prev.year, prev.month);
                };
                const nextMonth = () => {
                  const next = calMonth.month === 12 ? { year: calMonth.year + 1, month: 1 } : { year: calMonth.year, month: calMonth.month + 1 };
                  setCalMonth(next); setCalSelectedDay(null); pcFetchCalendar(next.year, next.month);
                };
                // PR A1.3-fix-24 — auto-load moved to a top-level useEffect.
                // Expose the local fn via a ref so the effect can call it.
                // Writing to a ref during render is the canonical React
                // workaround for "I need an effect to call a closure-bound
                // function". The state-setter side-effect that used to live
                // here now happens cleanly post-commit.
                pcFetchLocationRef.current = pcFetchLocation;

                // Weekday headers — lang aware. EN shows Sun-Sat, te/te_en shows Telugu shorts.
                const weekdayHeadersEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const weekdayHeadersTe = ["ఆ", "సో", "మం", "బు", "గు", "శు", "శ"];
                const weekdayHeaders   = lang === "en" ? weekdayHeadersEn : weekdayHeadersTe;

                // Frontend mappers for values backend returns only in Telugu.
                const AYANA_EN: Record<string, string> = {
                  "ఉత్తరాయణం": "Uttarayana",
                  "దక్షిణాయనం": "Dakshinayana",
                };
                // 60-year Samvatsara cycle — must match backend
                // services/telugu_terms.py → TELUGU_YEARS (index 0 = "ప్రభవ").
                const SAMVATSARA_EN: Record<string, string> = {
                  "ప్రభవ": "Prabhava",         "విభవ": "Vibhava",            "శుక్ల": "Shukla",
                  "ప్రమోదూత": "Pramoda",        "ప్రజాపతి": "Prajapati",      "ఆంగీరస": "Angirasa",
                  "శ్రీముఖ": "Shrimukha",       "భావ": "Bhava",               "యువ": "Yuva",
                  "ధాత": "Dhata",               "ఈశ్వర": "Ishvara",           "వహుధాన్య": "Bahudhanya",
                  "ప్రమాది": "Pramadi",         "విక్రమ": "Vikrama",           "వృష": "Vrisha",
                  "చిత్రభాను": "Chitrabhanu",    "స్వభాను": "Svabhanu",        "తారణ": "Tarana",
                  "పార్థివ": "Parthiva",         "వ్యయ": "Vyaya",              "సర్వజిత్": "Sarvajit",
                  "సర్వధారి": "Sarvadhari",      "విరోధి": "Virodhi",          "వికృతి": "Vikriti",
                  "ఖర": "Khara",                "నందన": "Nandana",            "విజయ": "Vijaya",
                  "జయ": "Jaya",                 "మన్మథ": "Manmatha",           "దుర్ముఖి": "Durmukhi",
                  "హేవిళంబి": "Hevilambi",      "విళంబి": "Vilambi",          "వికారి": "Vikari",
                  "శార్వరి": "Sharvari",         "ప్లవ": "Plava",              "శుభకృత్": "Shubhakrit",
                  "శోభకృత్": "Shobhakrit",      "క్రోధి": "Krodhi",           "విశ్వావసు": "Vishvavasu",
                  "పరాభవ": "Parabhava",         "ప్లవంగ": "Plavanga",         "కీలక": "Kilaka",
                  "సౌమ్య": "Saumya",            "సాధారణ": "Sadharana",         "విరోధికృత్": "Virodhikrit",
                  "పరీధావి": "Paridhavi",       "ప్రమాదీచ": "Pramadicha",     "ఆనంద": "Ananda",
                  "రాక్షస": "Rakshasa",         "నల": "Nala",                 "పింగళ": "Pingala",
                  "కాళయుక్తి": "Kalayukti",     "సిద్ధార్థి": "Siddharthi",   "రౌద్ర": "Raudra",
                  "దుర్మతి": "Durmati",         "దుందుభి": "Dundubhi",         "రుధిరోద్గారి": "Rudhirodgari",
                  "రక్తాక్షి": "Raktakshi",     "క్రోధన": "Krodhana",          "అక్షయ": "Akshaya",
                };
                // PR A1.2a — backend now sends samvatsara_en directly; prefer
                // it over the frontend lookup. Falls back to the local map for
                // cached/older responses.
                const samvatsaraValue = (teName: string | null | undefined): string => {
                  if (!teName) return "";
                  if (lang === "en") {
                    return (pcData?.samvatsara_en as string | undefined)
                      ?? SAMVATSARA_EN[teName] ?? teName;
                  }
                  return teName;
                };
                // Returns "Parabhava · the defeat / reversal of established order" for tooltips.
                const samvatsaraSubtitle = (): string => {
                  const en = pcData?.samvatsara_en as string | undefined;
                  const meaning = pcData?.samvatsara_meaning as string | undefined;
                  const cycle = pcData?.samvatsara_cycle as number | undefined;
                  if (!en) return "";
                  const parts = [];
                  if (cycle != null) parts.push(`#${cycle}/60`);
                  if (meaning) parts.push(meaning);
                  return parts.join(" · ");
                };
                const RUTU_EN: Record<string, string> = {
                  "వసంత ఋతువు":   "Vasanta (Spring)",
                  "గ్రీష్మ ఋతువు": "Grishma (Summer)",
                  "వర్ష ఋతువు":   "Varsha (Monsoon)",
                  "శరద్ ఋతువు":   "Sharad (Autumn)",
                  "హేమంత ఋతువు":  "Hemanta (Pre-winter)",
                  "శిశిర ఋతువు":  "Shishira (Winter)",
                };
                const SPECIAL_EN: Record<string, string> = {
                  "పౌర్ణమి":    "Purnima",
                  "అమావాస్య":   "Amavasya",
                  "ఏకాదశి":    "Ekadashi",
                };
                const specialClassOf = (s: string | null | undefined): string => {
                  if (!s) return "";
                  if (s === "పౌర్ణమి" || s === "Purnima")  return "purnima";
                  if (s === "అమావాస్య" || s === "Amavasya") return "amavasya";
                  if (s === "ఏకాదశి"  || s === "Ekadashi") return "ekadashi";
                  return "";
                };

                // tithi_short comes back Telugu like "శు·3" / "కృ·12" / "పౌర్ణమి"
                // — make a small EN-mode equivalent so the calendar doesn't
                // show Telugu when the user is in EN.
                const tithiShortEn = (ts: string, tithiNum?: number) => {
                  if (!ts) return "";
                  if (ts === "పౌర్ణమి") return "Purnima";
                  if (ts === "అమావాస్య") return "Amavasya";
                  // శు·N → Shu·N, కృ·N → Kr·N
                  if (ts.startsWith("శు·")) return `Shu·${ts.slice(2)}`;
                  if (ts.startsWith("కృ·")) return `Kr·${ts.slice(2)}`;
                  // Fallback: if tithi_num provided, build it ourselves.
                  if (tithiNum) {
                    const idx = ((tithiNum - 1) % 15) + 1;
                    return tithiNum <= 15 ? `Shu·${idx}` : `Kr·${idx}`;
                  }
                  return ts;
                };

                const calDays = calData?.days ?? [];
                const firstWeekday = ((calDays[0]?.weekday ?? 0) + 1) % 7; // Convert Mon=0 → Sun=0
                const paddedDays: (any | null)[] = [...Array(firstWeekday).fill(null), ...calDays];
                while (paddedDays.length % 7 !== 0) paddedDays.push(null);

                // Formatted selected date subtitle ("Sunday, April 19, 2026")
                const selectedIso = calSelectedDay || new Date().toISOString().slice(0, 10);
                const selectedFmt = (() => {
                  try {
                    const d = new Date(selectedIso + "T00:00:00");
                    return d.toLocaleDateString(lang === "en" ? "en-US" : "en-IN", {
                      weekday: "long", year: "numeric", month: "long", day: "numeric",
                    });
                  } catch { return selectedIso; }
                })();
                // PR A1.2c — viewing future/past date logic. The current-hora
                // card and any "right now" choghadiya highlighting only make
                // sense when the selected date IS today; for any other date
                // we hide live-only displays and surface a "Back to today"
                // button so the astrologer can return in one click.
                const todayIso = new Date().toISOString().slice(0, 10);
                const isViewingToday = selectedIso === todayIso;
                const goToToday = () => {
                  setCalSelectedDay(null);
                  if (pcDetectedCoords) {
                    setPcLoading(true);
                    axios.post(`${API_URL}/panchangam/location`, {
                      latitude: pcDetectedCoords.lat,
                      longitude: pcDetectedCoords.lon,
                      timezone_offset: pcDetectedCoords.tz,
                    }).then(r => setPcData(r.data)).catch(() => {}).finally(() => setPcLoading(false));
                  }
                };
                // Quick-jump strip: today + next 6 days. Lets the astrologer
                // scrub a week ahead without scrolling the calendar grid.
                const next7Days = (() => {
                  const out: { iso: string; weekday: string; day: number }[] = [];
                  for (let i = 0; i < 7; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    out.push({
                      iso: d.toISOString().slice(0, 10),
                      weekday: d.toLocaleDateString(lang === "en" ? "en-US" : "en-IN", { weekday: "short" }),
                      day: d.getDate(),
                    });
                  }
                  return out;
                })();

                // Masa header secondary — only show in non-EN modes
                const masaHeaderSub = lang === "en"
                  ? (calData?.masa_en ?? "")
                  : (calData?.masa_te ?? calData?.masa_en ?? "");

                return (
                <div className="tab-content">
                  {/* Loading */}
                  {pcLoading && !pcData && (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                      {t("Detecting location…", "ప్రదేశం గుర్తిస్తోంది…")}
                    </div>
                  )}

                  {pcData && (
                    <>
                      {/* ── 1. Centred page hero ── */}
                      <header className="pc2-header">
                        <div className="pc2-loc-chip" onClick={() => setPcShowCityModal(true)}>
                          <MapPin size={12} strokeWidth={1.8} />
                          <span>{pcLocationName || t("Detected location", "గుర్తించిన ప్రదేశం")}</span>
                          {pcData.timezone_name && (
                            <span style={{ opacity: 0.6, fontSize: 10, letterSpacing: "0.04em", textTransform: "none" as const }}>
                              ({pcData.timezone_name})
                            </span>
                          )}
                          {/* PR A1.2b — show lat/lon for transparency. Astrologer can verify
                              the engine is computing for the right point. */}
                          {pcDetectedCoords && (
                            <span style={{ opacity: 0.55, fontSize: 10, fontFamily: "'JetBrains Mono', ui-monospace, monospace", letterSpacing: 0, textTransform: "none" as const }}>
                              {pcDetectedCoords.lat.toFixed(2)}°, {pcDetectedCoords.lon.toFixed(2)}°
                            </span>
                          )}
                        </div>
                        <h1 className="pc2-title">
                          {t("Panchang", "పంచాంగం")}
                        </h1>
                        <div className="pc2-subtitle">
                          <span>{selectedFmt}</span>
                          {pcData.samvatsara_te && (
                            <>
                              <span className="dot" />
                              <span title={samvatsaraSubtitle()}>
                                Samvat {samvatsaraValue(pcData.samvatsara_te)}
                                {pcData?.samvatsara_cycle != null && (
                                  <span style={{ color: "var(--muted)", marginLeft: 6, fontSize: 11 }}>
                                    #{pcData.samvatsara_cycle}/60
                                  </span>
                                )}
                              </span>
                            </>
                          )}
                        </div>
                        {/* PR A1.2a — show meaning underneath as muted explainer */}
                        {pcData?.samvatsara_meaning && (
                          <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", marginTop: 4 }}>
                            “{pcData.samvatsara_meaning}”
                          </div>
                        )}
                        {/* PR A1.2c — viewing-future banner + Back to today.
                            All values below (sunrise/sunset, kalams, choghadiya,
                            durmuhurtha, varjyam) are computed for the SELECTED
                            date, not "right now". Make that explicit so the
                            astrologer doesn't mistake them for live values. */}
                        {!isViewingToday && (
                          <div className="pc2-future-banner">
                            <span>
                              {t(
                                "All values below are computed for this selected date — not live now.",
                                "క్రింది అన్ని విలువలు ఎంచుకున్న తేదీ కోసం లెక్కించబడ్డాయి — ఇప్పటి ప్రత్యక్ష విలువలు కావు."
                              )}
                            </span>
                            <button onClick={goToToday} className="pc2-back-today-btn">
                              ← {t("Back to today", "నేటికి వెళ్ళండి")}
                            </button>
                          </div>
                        )}
                        {/* PR A1.2c — quick-jump strip: today + next 6 days. */}
                        <div className="pc2-quickjump-strip" role="tablist">
                          {next7Days.map((d) => {
                            const isActive = selectedIso === d.iso;
                            const isToday = d.iso === todayIso;
                            return (
                              <button
                                key={d.iso}
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => {
                                  if (isToday) {
                                    goToToday();
                                  } else {
                                    handleDayClick(d.iso);
                                  }
                                }}
                                className={`pc2-quickjump-day${isActive ? " is-active" : ""}${isToday ? " is-today" : ""}`}
                              >
                                <span className="pc2-quickjump-weekday">{d.weekday}</span>
                                <span className="pc2-quickjump-num">{d.day}</span>
                                {isToday && <span className="pc2-quickjump-marker">●</span>}
                              </button>
                            );
                          })}
                        </div>
                      </header>

                      {/* ── 2. Monthly calendar ── */}
                      <div className="pc-section">
                        <div className="pc-cal-nav">
                          <button onClick={prevMonth}><ChevronLeft size={16} /></button>
                          <div style={{ textAlign: "center" }}>
                            <span className="pc-cal-title">
                              {new Date(calMonth.year, calMonth.month - 1).toLocaleString(lang === "en" ? "en-US" : "en-IN", { month: "long", year: "numeric" })}
                            </span>
                            {masaHeaderSub && <span className="pc-cal-subtitle">{masaHeaderSub}</span>}
                          </div>
                          <button onClick={nextMonth}><ChevronRight size={16} /></button>
                        </div>
                        {calLoading ? (
                          <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--muted)", fontSize: 12 }}>
                            <Loader2 size={14} style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: 6 }} />
                            {t("Loading…", "లోడ్ అవుతోంది…")}
                          </div>
                        ) : calDays.length > 0 && (
                          <>
                            <div className="pc-cal-grid">
                              {weekdayHeaders.map((d, i) => (
                                <div key={`${d}-${i}`} className={`pc2-cal-weekday${i === 0 ? " sun" : ""}`}>{d}</div>
                              ))}
                              {paddedDays.map((day, idx) => {
                                if (!day) return <div key={idx} className="pc-cal-cell empty" />;
                                const specialEn   = day.special ? (SPECIAL_EN[day.special] ?? day.special) : null;
                                const specialText = lang === "en" ? specialEn : day.special;
                                const specialClass = specialClassOf(day.special);
                                const tithiText = lang === "en" ? tithiShortEn(day.tithi_short, day.tithi_num) : day.tithi_short;
                                const naksText  = lang === "en"
                                  ? (day.nakshatra_en ? day.nakshatra_en.slice(0, 4) : (day.nakshatra_short || ""))
                                  : (day.nakshatra_short || "");
                                const isToday    = !!day.is_today;
                                const isSelected = calSelectedDay === day.date;
                                return (
                                  <div key={day.date}
                                    className={`pc-cal-cell${isToday ? " pc2-cal-cell today" : ""}${isSelected ? " pc2-cal-cell selected" : ""}`}
                                    onClick={() => handleDayClick(day.date)}
                                  >
                                    <div className="pc-cal-date-row">
                                      <span className="pc-cal-day-num">{day.day}</span>
                                      <span className="pc-cal-moon">{day.moon_phase_icon}</span>
                                    </div>
                                    <div className="pc2-cal-tithi">{tithiText}</div>
                                    <div className="pc2-cal-nakshatra">{naksText}</div>
                                    {specialText && <div className={`pc2-cal-special ${specialClass}`}>{specialText}</div>}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="pc2-cal-legend">
                              <span><i style={{ background: "#fbbf24" }} /> {t("Purnima / Amavasya", "పౌర్ణమి / అమావాస్య")}</span>
                              <span><i style={{ background: "#34d399" }} /> {t("Ekadashi", "ఏకాదశి")}</span>
                              <span><i style={{ background: "rgba(201,169,110,0.7)" }} /> {t("Today", "నేడు")}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* ── 3. Era info strip: Samvatsara · Ayana · Rutu · Masa · Shaka · Vikram ──
                          Phase 4 / PR 9 — stress-test "card abuse" (C):
                          previously these 6 facts each got their own card,
                          eating two rows of vertical space for one line of
                          info each. Now rendered as a single horizontal
                          info strip with hover tooltips for the meanings.
                          One line on desktop, wraps gracefully on mobile. */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 14,
                          padding: "10px 14px",
                          marginTop: 8,
                          background: "rgba(201,169,110,0.04)",
                          border: "0.5px solid rgba(201,169,110,0.15)",
                          borderRadius: 10,
                          fontSize: 12,
                        }}
                      >
                        {(() => {
                          const ayanaEn = pcData.ayana_te ? (AYANA_EN[pcData.ayana_te] ?? pcData.ayana_te) : "";
                          const rutuEn  = pcData.rutu_te  ? (RUTU_EN[pcData.rutu_te]   ?? pcData.rutu_te)  : "";
                          const items = [
                            { label: "Samvatsara", value: samvatsaraValue(pcData.samvatsara_te), tip: lang === "en" ? "60-year cycle" : "60 సంవత్సరాల చక్రం" },
                            { label: "Ayana",      value: lang === "en" ? ayanaEn : (pcData.ayana_te ?? ayanaEn), tip: lang === "en" ? "Solar direction" : "సూర్య ప్రయాణం" },
                            { label: "Rutu",       value: lang === "en" ? rutuEn  : (pcData.rutu_te  ?? rutuEn),  tip: lang === "en" ? "Season" : "ఋతువు" },
                            { label: "Masa",       value: lang === "en" ? (pcData.masa_en ?? pcData.masa_te ?? "") : (pcData.masa_te ?? pcData.masa_en ?? ""), tip: lang === "en" ? "Lunar month" : "చాంద్ర మాసం" },
                            { label: "Shaka",      value: pcData.shaka_year ? String(pcData.shaka_year) : "", tip: lang === "en" ? "Shaka era" : "శక సంవత్సరం" },
                            { label: "Vikram",     value: pcData.vikram_samvat ? String(pcData.vikram_samvat) : "", tip: lang === "en" ? "Vikram Samvat" : "విక్రమ సంవత్" },
                          ].filter(x => x.value);
                          return items.map((it, idx) => (
                            <React.Fragment key={it.label}>
                              {idx > 0 && (
                                <span aria-hidden style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(201,169,110,0.35)" }} />
                              )}
                              <span title={it.tip} style={{ display: "inline-flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap" }}>
                                <span style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{it.label}</span>
                                <span style={{ color: "var(--text)", fontWeight: 600 }}>{it.value}</span>
                              </span>
                            </React.Fragment>
                          ));
                        })()}
                      </div>

                      {/* ── 4. Tithi / Nakshatra / Yoga / Karana element cards ── */}
                      {/* PR A1.2c-final: Choghadiya donut removed — the "now"
                          needle made it misleading on non-today dates and the
                          textual choghadiya list below carries the same data
                          more legibly. */}
                      <div className="pc2-elements-grid">
                          {/* Tithi — primary language-aware + moon illum */}
                          <div className="pc2-element-card el-tithi">
                            <div className="pc2-element-head">
                              <div className="pc2-element-icon-wrap"><Moon size={18} strokeWidth={1.6} /></div>
                              <div className="pc2-element-meta">
                                <div className="pc2-element-eyebrow">{t("Tithi", "తిథి")}</div>
                                {pcData.tithi_ends_at && (
                                  <div className="pc2-element-until-inline">{t("until", "వరకు")} {stripSeconds(pcData.tithi_ends_at)}</div>
                                )}
                              </div>
                            </div>
                            <div className="pc2-element-primary">
                              {lang === "en" ? (pcData.tithi_en ?? pcData.tithi_te) : (pcData.tithi_te ?? pcData.tithi_en)}
                            </div>
                            {lang !== "en" && pcData.tithi_en && (
                              <div className="pc2-element-secondary">{pcData.tithi_en}</div>
                            )}
                            {/* PR A1.2c — was showing moon_illum_pct labeled as
                                tithi-progress; corrected to actual tithi-elapsed
                                fraction. Moon illumination retained as smaller
                                muted line. */}
                            {pcData.tithi_progress_pct != null && (
                              <div className="pc2-moon-illum-row" title={`${pcData.tithi_progress_pct}% of current tithi elapsed`}>
                                <div className="pc2-moon-illum-bar">
                                  <div className="pc2-moon-illum-fill" style={{ width: `${pcData.tithi_progress_pct}%` }} />
                                </div>
                                <span className="pc2-moon-illum-pct">{pcData.tithi_progress_pct}%</span>
                              </div>
                            )}
                            {pcData.moon_illum_pct != null && (
                              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, opacity: 0.7 }}>
                                {t(`Moon ${pcData.moon_illum_pct}% illuminated`, `చంద్రుడు ${pcData.moon_illum_pct}% ప్రకాశవంతం`)}
                              </div>
                            )}
                          </div>

                          {/* Nakshatra */}
                          <div className="pc2-element-card el-nakshatra">
                            <div className="pc2-element-head">
                              <div className="pc2-element-icon-wrap"><Star size={18} strokeWidth={1.6} /></div>
                              <div className="pc2-element-meta">
                                <div className="pc2-element-eyebrow">{t("Nakshatra", "నక్షత్రం")}</div>
                                {pcData.nakshatra_ends_at && (
                                  <div className="pc2-element-until-inline">{t("until", "వరకు")} {pcData.nakshatra_ends_at}</div>
                                )}
                              </div>
                            </div>
                            <div className="pc2-element-primary">
                              {lang === "en" ? (pcData.nakshatra_en ?? pcData.nakshatra_te) : (pcData.nakshatra_te ?? pcData.nakshatra_en)}
                              {pcData.nakshatra_pada && <span style={{ fontSize: 14, color: "var(--muted)", marginLeft: 6, fontStyle: "italic" }}>· Pada {pcData.nakshatra_pada}</span>}
                            </div>
                            {lang !== "en" && pcData.nakshatra_en && (
                              <div className="pc2-element-secondary">{pcData.nakshatra_en}</div>
                            )}
                          </div>

                          {/* Yoga — PR A1.2b: tint based on yoga_quality
                              from backend so malefic yogas (Atiganda etc.) show
                              red instead of inheriting the generic green pill. */}
                          <div className={`pc2-element-card el-yoga${pcData.yoga_quality === "inauspicious" ? " is-malefic" : ""}`}>
                            <div className="pc2-element-head">
                              <div className="pc2-element-icon-wrap">
                                {pcData.yoga_quality === "inauspicious"
                                  ? <TriangleAlert size={18} strokeWidth={1.6} />
                                  : <Sparkles size={18} strokeWidth={1.6} />}
                              </div>
                              <div className="pc2-element-meta">
                                <div className="pc2-element-eyebrow">
                                  {t("Yoga", "యోగం")}
                                  {pcData.yoga_quality === "inauspicious" && (
                                    <span style={{ marginLeft: 6, fontSize: 9, color: "#f87171", letterSpacing: "0.08em" }}>
                                      · {t("INAUSPICIOUS", "అశుభ")}
                                    </span>
                                  )}
                                </div>
                                {pcData.yoga_ends_at && (
                                  <div className="pc2-element-until-inline">{t("until", "వరకు")} {pcData.yoga_ends_at}</div>
                                )}
                              </div>
                            </div>
                            <div className="pc2-element-primary">
                              {lang === "en" ? (pcData.yoga_en ?? pcData.yoga_te) : (pcData.yoga_te ?? pcData.yoga_en)}
                            </div>
                            {lang !== "en" && pcData.yoga_en && (
                              <div className="pc2-element-secondary">{pcData.yoga_en}</div>
                            )}
                          </div>

                          {/* Karana — note backend flips: `karana` = English, `karana_te` = Telugu */}
                          <div className="pc2-element-card el-karana">
                            <div className="pc2-element-head">
                              <div className="pc2-element-icon-wrap"><HandHeart size={18} strokeWidth={1.6} /></div>
                              <div className="pc2-element-meta">
                                <div className="pc2-element-eyebrow">{t("Karana", "కరణం")}</div>
                                {pcData.karana_ends_at && (
                                  <div className="pc2-element-until-inline">{t("until", "వరకు")} {pcData.karana_ends_at}</div>
                                )}
                              </div>
                            </div>
                            <div className="pc2-element-primary">
                              {lang === "en" ? (pcData.karana ?? pcData.karana_te) : (pcData.karana_te ?? pcData.karana)}
                            </div>
                            {lang !== "en" && pcData.karana && (
                              <div className="pc2-element-secondary">{pcData.karana}</div>
                            )}
                            {pcData.karana2 && (
                              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "0.5px solid rgba(255,255,255,0.06)", display: "flex", gap: 6, alignItems: "baseline" }}>
                                <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--muted)", fontWeight: 600 }}>then</span>
                                <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 15, color: "var(--text)", letterSpacing: "-0.01em" }}>
                                  {lang === "en" ? (pcData.karana2 ?? pcData.karana2_te) : (pcData.karana2_te ?? pcData.karana2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                      {/* ── 5. Current Hora hero ──
                          PR A1.2c: hora changes every ~1 hour and is intrinsically
                          a "right now" concept. Hide when viewing any non-today
                          date because the value is meaningless out of context. */}
                      {pcData.current_hora && isViewingToday && (() => {
                        const HORA_SYMBOLS: Record<string, string> = {
                          Sun: "\u2609", Moon: "\u263D", Mars: "\u2642", Mercury: "\u263F",
                          Jupiter: "\u2643", Venus: "\u2640", Saturn: "\u2644"
                        };
                        const lord = pcData.current_hora.lord;
                        const lordColor = PLANET_COLORS[lord] ?? "#c9a96e";
                        return (
                          <div className="pc2-hora-hero" style={{ color: lordColor }}>
                            <div className="pc2-hora-glyph">{HORA_SYMBOLS[lord] || "\u2609"}</div>
                            <div className="pc2-hora-body">
                              <div className="pc2-hora-label">
                                {t("Current Hora", "ప్రస్తుత హోర")}
                                {pcData.current_hora.is_auspicious && (
                                  <span className="pc2-hora-ausp" style={{ marginLeft: 8 }}>
                                    {t("Auspicious", "శుభ")}
                                  </span>
                                )}
                              </div>
                              <div className="pc2-hora-lord">{lord}</div>
                            </div>
                            <span className="pc2-hora-time">{stripSeconds(pcData.current_hora.start)} – {stripSeconds(pcData.current_hora.end)}</span>
                          </div>
                        );
                      })()}

                      {/* ── 6. Celestial 2×2 + Auspicious/Avoid panels ── */}
                      <div className="pc-half-grid">
                        {/* LEFT: Sun/Moon times */}
                        <div className="pc2-celestial-grid">
                          {[
                            // Phase 7 / PR 19 — strip backend seconds (`HH:MM:SS` → `HH:MM`).
                            // Seconds aren't actionable for sunrise/moon timings.
                            { Icon: Sunrise,  color: "#fbbf24", label: t("Sunrise", "సూర్యోదయం"),   time: stripSeconds(pcData.sunrise),  warm: true  },
                            { Icon: Sunset,   color: "#fbbf24", label: t("Sunset", "సూర్యాస్తమయం"), time: stripSeconds(pcData.sunset),   warm: true  },
                            { Icon: Moon,     color: "#93c5fd", label: t("Moonrise", "చంద్రోదయం"),  time: stripSeconds(pcData.moonrise), warm: false },
                            { Icon: MoonStar, color: "#93c5fd", label: t("Moonset", "చంద్రాస్తమయం"), time: stripSeconds(pcData.moonset),  warm: false },
                          ].map(c => (
                            <div key={c.label} className={`pc2-celestial-card ${c.warm ? "warm" : "cool"}`} style={{ color: c.color }}>
                              <div className="pc2-celestial-icon"><c.Icon size={16} strokeWidth={1.8} /></div>
                              <div className="pc2-celestial-body">
                                <span className="pc2-celestial-label">{c.label}</span>
                                <span className={`pc2-celestial-time${!c.time ? " dim" : ""}`}>
                                  {c.time || t("no rise today", "నేడు లేదు")}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* RIGHT: Auspicious / Avoid panels */}
                        <div className="pc2-times-wrap">
                          <div className="pc2-times-panel good">
                            <div className="pc2-times-panel-title">
                              <Sparkles size={12} strokeWidth={2} />
                              {t("Auspicious", "శుభ సమయాలు")}
                            </div>
                            {pcData.brahma_muhurta && (
                              <div className="pc2-time-row highlight">
                                <div className="pc2-time-row-icon" style={{ background: "rgba(201,169,110,0.15)", color: "#c9a96e" }}>
                                  <Sparkles size={14} strokeWidth={1.8} />
                                </div>
                                <div className="pc2-time-row-body">
                                  <div className="pc2-time-row-label">{t("Brahma Muhurta", "బ్రహ్మ ముహూర్తం")}</div>
                                  <div className="pc2-time-row-sub">{t("Best for meditation & study", "ధ్యానం & అధ్యయనానికి ఉత్తమం")}</div>
                                </div>
                                <span className="pc2-time-row-value">{stripSeconds(pcData.brahma_muhurta.start)} – {stripSeconds(pcData.brahma_muhurta.end)}</span>
                              </div>
                            )}
                            {pcData.abhijit_muhurtha?.valid && (
                              <div className="pc2-time-row">
                                <div className="pc2-time-row-icon" style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
                                  <Crown size={14} strokeWidth={1.8} />
                                </div>
                                <div className="pc2-time-row-body">
                                  <div className="pc2-time-row-label">{t("Abhijit Muhurtha", "అభిజిత్ ముహూర్తం")}</div>
                                  <div className="pc2-time-row-sub">{t("Universally auspicious", "సార్వత్రికంగా శుభ")}</div>
                                </div>
                                <span className="pc2-time-row-value">{stripSeconds(pcData.abhijit_muhurtha.start)} – {stripSeconds(pcData.abhijit_muhurtha.end)}</span>
                              </div>
                            )}
                            {/* PR A1.2c — Amrit Kala (auspicious 1h36m window from Moon's nakshatra). */}
                            {pcData.amrit_kala && (
                              <div className="pc2-time-row">
                                <div className="pc2-time-row-icon" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>
                                  <Sparkles size={14} strokeWidth={1.8} />
                                </div>
                                <div className="pc2-time-row-body">
                                  <div className="pc2-time-row-label">{t("Amrit Kala", "అమృత కాలం")}</div>
                                  <div className="pc2-time-row-sub">{t("Highly auspicious nakshatra-derived window", "నక్షత్రం నుండి అత్యంత శుభ సమయం")}</div>
                                </div>
                                <span className="pc2-time-row-value">{stripSeconds(pcData.amrit_kala)}</span>
                              </div>
                            )}
                          </div>

                          <div className="pc2-times-panel avoid">
                            <div className="pc2-times-panel-title">
                              <TriangleAlert size={12} strokeWidth={2} />
                              {t("Avoid", "నివారించండి")}
                            </div>
                            <div className="pc2-time-row">
                              <div className="pc2-time-row-icon" style={{ background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
                                <TriangleAlert size={14} strokeWidth={1.8} />
                              </div>
                              <div className="pc2-time-row-body">
                                <div className="pc2-time-row-label">Rahu Kalam</div>
                                <div className="pc2-time-row-sub">{t("Avoid new ventures", "కొత్త పనులు నివారించండి")}</div>
                              </div>
                              <span className="pc2-time-row-value">{stripSeconds(pcData.rahu_kalam)}</span>
                            </div>
                            <div className="pc2-time-row">
                              <div className="pc2-time-row-icon" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                                <Ban size={14} strokeWidth={1.8} />
                              </div>
                              <div className="pc2-time-row-body">
                                <div className="pc2-time-row-label">Yamagandam</div>
                              </div>
                              <span className="pc2-time-row-value">{stripSeconds(pcData.yamagandam)}</span>
                            </div>
                            <div className="pc2-time-row">
                              <div className="pc2-time-row-icon" style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>
                                <CircleDashed size={14} strokeWidth={1.8} />
                              </div>
                              <div className="pc2-time-row-body">
                                <div className="pc2-time-row-label">Gulika Kalam</div>
                              </div>
                              <span className="pc2-time-row-value">{stripSeconds(pcData.gulika_kalam)}</span>
                            </div>
                            {pcData.durmuhurtha?.map((dm: any, i: number) => (
                              <div key={i} className="pc2-time-row">
                                <div className="pc2-time-row-icon" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                                  <Hourglass size={14} strokeWidth={1.8} />
                                </div>
                                <div className="pc2-time-row-body">
                                  <div className="pc2-time-row-label">{t(`Durmuhurtha ${i + 1}`, `దుర్ముహూర్తం ${i + 1}`)}</div>
                                </div>
                                <span className="pc2-time-row-value">{stripSeconds(dm.start)} – {stripSeconds(dm.end)}</span>
                              </div>
                            ))}
                            {/* PR A1.2c — Varjyam (avoid 1h36m window from Moon's nakshatra). */}
                            {pcData.varjyam && (
                              <div className="pc2-time-row">
                                <div className="pc2-time-row-icon" style={{ background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
                                  <Ban size={14} strokeWidth={1.8} />
                                </div>
                                <div className="pc2-time-row-body">
                                  <div className="pc2-time-row-label">{t("Varjyam", "వర్జ్యం")}</div>
                                  <div className="pc2-time-row-sub">{t("Avoid important actions", "ముఖ్యమైన పనులు నివారించండి")}</div>
                                </div>
                                <span className="pc2-time-row-value">{stripSeconds(pcData.varjyam)}</span>
                              </div>
                            )}
                            {/* PR A1.2c — Night Rahu/Yama/Gulika (less commonly used but valuable). */}
                            {pcData.rahu_kalam_night && (
                              <details style={{ marginTop: 8 }}>
                                <summary style={{ cursor: "pointer", fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>
                                  {t("▸ Night kalam windows (sunset → next sunrise)", "▸ రాత్రి కాలం (సూర్యాస్తం → తదుపరి సూర్యోదయం)")}
                                </summary>
                                <div className="pc2-time-row" style={{ marginTop: 4 }}>
                                  <div className="pc2-time-row-icon" style={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}>
                                    <TriangleAlert size={14} strokeWidth={1.8} />
                                  </div>
                                  <div className="pc2-time-row-body">
                                    <div className="pc2-time-row-label">{t("Night Rahu Kalam", "రాత్రి రాహుకాలం")}</div>
                                  </div>
                                  <span className="pc2-time-row-value">{pcData.rahu_kalam_night}</span>
                                </div>
                                <div className="pc2-time-row">
                                  <div className="pc2-time-row-icon" style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24" }}>
                                    <Ban size={14} strokeWidth={1.8} />
                                  </div>
                                  <div className="pc2-time-row-body">
                                    <div className="pc2-time-row-label">{t("Night Yamagandam", "రాత్రి యమగండం")}</div>
                                  </div>
                                  <span className="pc2-time-row-value">{pcData.yamagandam_night}</span>
                                </div>
                                <div className="pc2-time-row">
                                  <div className="pc2-time-row-icon" style={{ background: "rgba(167,139,250,0.08)", color: "#a78bfa" }}>
                                    <CircleDashed size={14} strokeWidth={1.8} />
                                  </div>
                                  <div className="pc2-time-row-body">
                                    <div className="pc2-time-row-label">{t("Night Gulika", "రాత్రి గులిక")}</div>
                                  </div>
                                  <span className="pc2-time-row-value">{stripSeconds(pcData.gulika_kalam_night)}</span>
                                </div>
                              </details>
                            )}
                            {/* PR A1.2c — Panchaka + Tithi Shunya doshas (advisory tags). */}
                            {(pcData.panchaka_active || pcData.tithi_shunya_active) && (
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                                {pcData.panchaka_active && (
                                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: "rgba(248,113,113,0.12)", color: "#f87171", border: "0.5px solid rgba(248,113,113,0.3)", letterSpacing: "0.04em" }}
                                    title={t("Moon in one of the 5 Panchaka nakshatras (Dhanishtha 2nd half through Revati). Avoid travel, ceremonies.", "")}>
                                    {t("PANCHAKA DOSHA", "పంచక దోషం")}
                                  </span>
                                )}
                                {pcData.tithi_shunya_active && (
                                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "0.5px solid rgba(251,191,36,0.3)", letterSpacing: "0.04em" }}
                                    title={t("Tithi shunya (void) for this lunar month. Activities yield reduced or no result.", "")}>
                                    {t("TITHI SHUNYA", "తిథి శూన్యం")}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── 7. Day & Night Choghadiya ── */}
                      {pcData.choghadiya && pcData.choghadiya.length > 0 && (
                        <div className="pc-section">
                          <div className="pc2-section-title">{t("Choghadiya", "చోఘడియ")}</div>
                          {/* Phase 7 / PR 20 — colour-quality legend.
                              Dots inside each row had no visible legend
                              before this PR; live test confirmed users can't
                              decode green/red/purple at a glance. Kept tiny
                              and right-aligned so it doesn't compete with
                              the row content. */}
                          <div
                            style={{
                              display: "flex",
                              gap: 14,
                              alignItems: "center",
                              flexWrap: "wrap",
                              marginBottom: 8,
                              fontSize: 10,
                              color: "var(--muted)",
                            }}
                            aria-label={t("Choghadiya quality legend", "చోఘడియ నాణ్యత చిహ్నాలు")}
                          >
                            {[
                              { color: "#34d399", label: t("Auspicious", "శుభ") },
                              { color: "#f87171", label: t("Inauspicious", "అశుభ") },
                              { color: "#a78bfa", label: t("Neutral", "తటస్థ") },
                            ].map(item => (
                              <span key={item.label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                                {item.label}
                              </span>
                            ))}
                          </div>
                          <div className="pc-half-grid">
                            {([
                              { isDay: true,  color: "#fbbf24", title: t("Day", "పగలు"),  sub: t("Sunrise", "సూర్యోదయం"), subTime: stripSeconds(pcData.sunrise), Icon: Sun },
                              { isDay: false, color: "#93c5fd", title: t("Night", "రాత్రి"), sub: t("Sunset", "సూర్యాస్తమయం"), subTime: stripSeconds(pcData.sunset),  Icon: Moon },
                            ] as const).map(section => (
                              <div key={section.isDay ? "day" : "night"}>
                                <div className="pc2-chog-head">
                                  <span className="pc2-chog-head-title" style={{ color: section.color }}>
                                    <section.Icon size={13} strokeWidth={1.8} />
                                    {section.title}
                                  </span>
                                  <span className="pc2-chog-head-sub">{section.sub} {section.subTime}</span>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  {pcData.choghadiya.filter((c: any) => c.is_day === section.isDay).map((c: any, i: number) => {
                                    const qColor = c.quality === "auspicious" ? "#34d399" : c.quality === "inauspicious" ? "#f87171" : "#a78bfa";
                                    // Phase 4 / PR 9 — accessible legend for the
                                    // colored dot. Stress-test #11: dots had no
                                    // visible legend; #10: a malefic-active row
                                    // turned the whole row red so the dot lost
                                    // its meaning. Tooltip + always-on quality
                                    // label fixes both. ACTIVE pill now uses a
                                    // gold border + gold text so it never
                                    // collides with the red/green/purple dot.
                                    const qLabel = c.quality === "auspicious"
                                      ? t("Auspicious", "శుభ")
                                      : c.quality === "inauspicious"
                                        ? t("Inauspicious", "అశుభ")
                                        : t("Neutral", "తటస్థ");
                                    return (
                                      <div key={i}
                                        className={`pc2-chog-row${c.is_current ? " is-current" : ""}`}
                                        title={`${c.name} — ${qLabel}${c.is_current ? ` (${t("active now", "ప్రస్తుతం")})` : ""}`}
                                        style={{
                                          background: c.is_current ? `${qColor}14` : "transparent",
                                          borderColor: c.is_current ? `${qColor}55` : "transparent",
                                        }}>
                                        <span className="pc2-chog-dot" style={{ background: qColor }} aria-label={qLabel} />
                                        <span className="pc2-chog-name" style={{ color: c.is_current ? qColor : "var(--text)", fontWeight: c.is_current ? 700 : 500 }}>{c.name}</span>
                                        <span className="pc2-chog-time">{stripSeconds(c.start)}–{stripSeconds(c.end)}</span>
                                        {c.is_current && (
                                          <span
                                            className="pc2-chog-active-badge"
                                            style={{
                                              background: "rgba(201,169,110,0.18)",
                                              color: "#c9a96e",
                                              border: "0.5px solid rgba(201,169,110,0.55)",
                                            }}
                                          >
                                            ◷ {t("ACTIVE", "ఇప్పుడు")}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* City selector modal */}
                  {pcShowCityModal && (
                    <div className="pc-city-modal-overlay" onClick={() => setPcShowCityModal(false)}>
                      <div className="pc-city-modal" onClick={e => e.stopPropagation()}>
                        <div className="pc-city-header">
                          <span className="pc-city-title">{t("SELECT CITY", "నగరం ఎంచుకోండి")}</span>
                          <button onClick={() => setPcShowCityModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, fontFamily: "inherit" }}>&times;</button>
                        </div>
                        <input
                          className="pc-city-search"
                          type="text" value={pcCityQuery} autoFocus
                          placeholder={t("Search any city…", "ఏదైనా నగరం వెతకండి…")}
                          onChange={e => {
                            setPcCityQuery(e.target.value);
                            if (pcCitySearchRef.current) clearTimeout(pcCitySearchRef.current);
                            pcCitySearchRef.current = setTimeout(() => searchPcCities(e.target.value), 400);
                          }}
                        />
                        <button className="pc-city-myloc" onClick={pcTryMyLocation}>
                          <MapPin size={14} />
                          <span>{t("My Location", "నా ప్రదేశం")}</span>
                          <span style={{ marginLeft: "auto", fontSize: 9, background: "rgba(52,211,153,0.15)", color: "#34d399", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{t("CURRENT", "ప్రస్తుతం")}</span>
                        </button>
                        {pcGeoError && (
                          <div style={{ fontSize: 11, color: "#f87171", marginBottom: "0.5rem", padding: "6px 10px", background: "rgba(248,113,113,0.08)", borderRadius: 6 }}>{pcGeoError}</div>
                        )}
                        {pcCitySearching && <div style={{ fontSize: 11, color: "var(--muted)", padding: "8px 0" }}>{t("Searching…", "వెతుకుతోంది…")}</div>}
                        {pcCitySuggestions.length === 0 && !pcCitySearching && pcCityQuery.length < 2 && (
                          <div style={{ fontSize: 11, color: "var(--muted)", padding: "8px 0" }}>{t("Type at least 2 characters to search", "కనీసం 2 అక్షరాలు టైప్ చేయండి")}</div>
                        )}
                        {pcCitySuggestions.map((s, i) => (
                          <button key={i} className="pc-city-result" onClick={() => pcSelectCity(s)}>
                            <div style={{ fontWeight: 500 }}>{s.name}</div>
                            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{s.display}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                );
              })()}

              {/* MUHURTHA */}
              {activeTab === "muhurtha" && (
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
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: "1.5rem" }}>
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
                          const canAdd = !!(mNewP.name && mNewP.date && mNewP.time);
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
                                  <Globe2 size={10} strokeWidth={2} /> {t("Place of birth", "పుట్టిన ఊరు")}
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
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.75rem" }}>
                        <button onClick={() => setMStep(1)} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
                        <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                          {t("Which dates should we scan?", "ఏ తేదీలు చూడాలి?")}
                        </div>
                      </div>
                      {/* Event location section */}
                      <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "0.875rem 1rem", marginBottom: "1rem" }}>
                        <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "0.625rem", display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <MapPin size={11} strokeWidth={1.8} /> {t("Event location", "ఈవెంట్ ప్రదేశం")}
                        </div>
                        <div style={{ display: "flex", gap: 6, marginBottom: mEventLocMode === "different" ? 10 : 0 }}>
                          {(["same","different"] as const).map(mode => (
                            <button key={mode} onClick={() => { setMEventLocMode(mode); if(mode==="same") setMEventLoc(null); }}
                              style={{ flex: 1, padding: "8px 6px", background: mEventLocMode === mode ? "rgba(201,169,110,0.12)" : "var(--card)", border: `0.5px solid ${mEventLocMode === mode ? "rgba(201,169,110,0.55)" : "var(--border2)"}`, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 11, color: mEventLocMode === mode ? "var(--accent)" : "var(--muted)", fontWeight: mEventLocMode === mode ? 600 : 400, transition: "all 0.15s", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
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
                              style={{ width: "100%", background: "var(--card)", border: `0.5px solid ${mEventLoc ? "var(--accent)" : "var(--border2)"}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--text)", outline: "none", boxSizing: "border-box" as const }}
                            />
                            {mEventLocSearching && <div style={{ position: "absolute", right: 10, top: 9, fontSize: 10, color: "var(--muted)" }}>...</div>}
                            {mEventLoc && <div style={{ fontSize: 10, color: "#34d399", marginTop: 4 }}>✓ {mEventLoc.place}</div>}
                            {mEventLocSugg.length > 0 && (
                              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 6, overflow: "hidden", marginTop: 2 }}>
                                {mEventLocSugg.map((s, i) => (
                                  <button key={i} onClick={() => {
                                    axios.get("https://api.bigdatacloud.net/data/reverse-geocode-client", { params: { latitude: s.lat, longitude: s.lon, localityLanguage: "en" } })
                                      .then(r => { const tz = Math.round(((r.data?.timezone?.gmtOffset || 0) / 3600) * 2) / 2; setMEventLoc({ lat: s.lat, lon: s.lon, tz, place: s.display }); })
                                      .catch(() => setMEventLoc({ lat: s.lat, lon: s.lon, tz: 0, place: s.display }));
                                    setMEventLocSugg([]);
                                  }} style={{ width: "100%", padding: "7px 10px", background: "none", border: "none", borderBottom: "0.5px solid var(--border)", color: "var(--text)", fontSize: 11, textAlign: "left" as const, cursor: "pointer", fontFamily: "inherit" }}>
                                    {s.display}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Participant summary — PR A2.2d.1: always show the
                          primary chart holder explicitly. Previous version only
                          listed additional participants (mParticipants), making
                          it look like the client's own chart was excluded.
                          Now always shows "primary · others" so the astrologer
                          confirms their main chart is included in the scan. */}
                      <div style={{ padding: "6px 10px", background: "rgba(201,169,110,0.06)", border: "0.5px solid rgba(201,169,110,0.2)", borderRadius: 6, marginBottom: "0.875rem", fontSize: 11, color: "var(--muted)", display: "flex", flexWrap: "wrap" as const, gap: 4, alignItems: "center" }}>
                        <span>{t("For", "కోసం")}:</span>
                        <span style={{ color: "var(--accent)" }}>
                          {workspaceData?.name || birthDetails?.name || t("primary chart", "ప్రధాన చార్ట్")}
                        </span>
                        <span style={{ fontSize: 9, padding: "1px 6px", background: "rgba(201,169,110,0.14)", color: "var(--accent)", borderRadius: 4, letterSpacing: "0.04em", fontWeight: 600 }}>
                          {t("PRIMARY", "ప్రధాన")}
                        </span>
                        {mParticipants.length > 0 && (
                          <>
                            <span style={{ color: "var(--border2)", margin: "0 4px" }}>+</span>
                            {mParticipants.map((p, i) => (
                              <span key={p.id} style={{ color: "var(--accent)", marginRight: i < mParticipants.length - 1 ? 6 : 0 }}>
                                {p.name || p.birthDetails.name}
                              </span>
                            ))}
                          </>
                        )}
                      </div>
                      {/* Quick picks */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: "1rem" }}>
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
                              style={{ padding: "10px 8px", background: active ? "rgba(201,169,110,0.12)" : "var(--card)", border: `0.5px solid ${active ? "rgba(201,169,110,0.5)" : "var(--border2)"}`, borderRadius: 999, cursor: "pointer", color: active ? "var(--accent)" : "var(--text)", fontSize: 12, fontFamily: "inherit", fontWeight: active ? 600 : 400, transition: "all 160ms", textAlign: "center" as const }}
                              onMouseEnter={e2 => { if (!active) { e2.currentTarget.style.borderColor = "rgba(201,169,110,0.35)"; e2.currentTarget.style.background = "rgba(201,169,110,0.04)"; } }}
                              onMouseLeave={e2 => { if (!active) { e2.currentTarget.style.borderColor = "var(--border2)"; e2.currentTarget.style.background = "var(--card)"; } }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {/* Custom date range */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "1rem" }}>
                        <div>
                          <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
                            {t("From", "నుండి")}
                          </div>
                          <input type="date" value={mDateStart} onChange={e => setMDateStart(e.target.value)}
                            style={{ width: "100%", background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "var(--text)", outline: "none" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
                            {t("To", "వరకు")}
                          </div>
                          <input type="date" value={mDateEnd} onChange={e => setMDateEnd(e.target.value)}
                            style={{ width: "100%", background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "var(--text)", outline: "none" }} />
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
                            </div>
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
                                    <div style={{ fontSize: 13, padding: "4px 12px", borderRadius: 999, background: qualityBg(w.quality), color: qC, border: `0.5px solid ${qualityBorder(w.quality)}`, fontWeight: 600, letterSpacing: "0.03em" }}>
                                      {qualityStars(w.quality)} {w.score}
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
                                  return mResults.soft_flagged_windows.slice(0, 25).map((sw: any, i: number) => (
                                    <div
                                      key={i}
                                      style={{
                                        padding: "8px 10px",
                                        background: "rgba(0,0,0,0.2)",
                                        border: "0.5px solid rgba(255,255,255,0.04)",
                                        borderRadius: 6,
                                        display: "flex",
                                        gap: 12,
                                        alignItems: "flex-start",
                                      }}
                                    >
                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, marginBottom: 2 }}>
                                          {sw.date_display || sw.date} · {sw.start_time}–{sw.end_time}
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
                                        </div>
                                        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                                          {(sw.hard_rejected_for || []).map((r: string, ri: number) => (
                                            <span
                                              key={ri}
                                              title={reasonHelp(r)}
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
                                  ));
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
              )}

              {/* MARRIAGE MATCH */}
              {/* PR R6 (Phase A refactor) — MATCH tab extracted to tabs/MatchTab.tsx.
                  Largest tab (~1476 lines moved). Verbose prop bag (~30 props) due
                  to deep cross-references with onboarding + saved-sessions flow. */}
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
