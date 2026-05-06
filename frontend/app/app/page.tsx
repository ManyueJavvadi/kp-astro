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

const API_URL = "https://devastroai.up.railway.app";

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
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisMessages, setAnalysisMessages] = useState<{ q: string; a: string; isTopic?: boolean }[]>([]);
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
  // Significators grid toggle
  const [showSigGrid, setShowSigGrid] = useState(false);
  // PDF export state
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  // (quick insights removed)
  // Transit state
  const [transitData, setTransitData] = useState<any>(null);
  const [transitLoading, setTransitLoading] = useState(false);
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
  const [housesSubTab, setHousesSubTab] = useState<"overview"|"cusps"|"sigs"|"ruling"|"panchang">("overview");
  const [chartView, setChartView] = useState<"chart"|"planets">("chart");
  const [showTransitInDasha, setShowTransitInDasha] = useState(false);
  const [transitSubTab, setTransitSubTab] = useState<"overview" | "planets" | "kp">("overview");
  // Quick insights
  const [quickInsights, setQuickInsights] = useState<Record<string, string>>({});
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
  // CSL chain view selected house (for houses overview)
  const [cslSelectedHouse, setCslSelectedHouse] = useState<number | null>(null);
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

  // Load quick insights when analysis tab opens
  useEffect(() => { if (activeTab === "analysis" && workspaceData) { loadQuickInsights(); } }, [activeTab, workspaceData]);

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
  // Clear shared inline form state when switching tabs to prevent cross-tab data leakage
  useEffect(() => {
    setMNewP({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: 17.385, longitude: 78.4867, gender: "", timezone_offset: 5.5 });
    setMNewPPlaceSugg([]);
    setMShowAddParticipant(false);
    setMatchPerson2Inline(false);
  }, [activeTab]);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    setPlaceStatus("loading");
    try {
      const res = await axios.get("https://nominatim.openstreetmap.org/search", { params: { q: query, format: "json", limit: 5, addressdetails: 1, "accept-language": "en" }, headers: { "User-Agent": "DevAstroAI/1.0" } });
      const features = res.data;
      const results: PlaceSuggestion[] = features.map((f: any) => {
        const addr = f.address || {};
        const parts = [addr.suburb || addr.city_district || addr.city || addr.town || addr.village || addr.county || f.display_name.split(",")[0], addr.state, addr.country].filter(Boolean);
        return { name: parts[0] || query, display: parts.join(", "), lat: parseFloat(f.lat), lon: parseFloat(f.lon) };
      });
      setSuggestions(results); setShowSuggestions(results.length > 0); setPlaceStatus(results.length > 0 ? "idle" : "error");
    } catch { setPlaceStatus("error"); }
  }, []);

  // Panchangam city search (reuses Nominatim pattern)
  const searchPcCities = useCallback(async (query: string) => {
    if (query.length < 2) { setPcCitySuggestions([]); return; }
    setPcCitySearching(true);
    try {
      const res = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q: query, format: "json", limit: 5, addressdetails: 1, "accept-language": "en" },
        headers: { "User-Agent": "DevAstroAI/1.0" }
      });
      setPcCitySuggestions(res.data.map((f: any) => {
        const addr = f.address || {};
        const parts = [addr.suburb || addr.city_district || addr.city || addr.town || addr.village || addr.county || f.display_name.split(",")[0], addr.state, addr.country].filter(Boolean);
        return { name: parts[0] || query, display: parts.join(", "), lat: parseFloat(f.lat), lon: parseFloat(f.lon) };
      }));
    } catch { /* silent */ }
    setPcCitySearching(false);
  }, []);

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
        const results: PlaceSuggestion[] = features.map((f: any) => {
          const addr = f.address || {};
          const parts = [addr.suburb || addr.city_district || addr.city || addr.town || addr.village || addr.county || f.display_name.split(",")[0], addr.state, addr.country].filter(Boolean);
          return { name: parts[0] || val, display: parts.join(", "), lat: parseFloat(f.lat), lon: parseFloat(f.lon) };
        });
        setMNewPPlaceSugg(results); setMNewPPlaceStatus("done");
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
        const results: PlaceSuggestion[] = res.data.map((f: any) => {
          const addr = f.address || {};
          const parts = [addr.suburb || addr.city_district || addr.city || addr.town || addr.village || addr.county || f.display_name.split(",")[0], addr.state, addr.country].filter(Boolean);
          return { name: parts[0] || val, display: parts.join(", "), lat: parseFloat(f.lat), lon: parseFloat(f.lon) };
        });
        setMEventLocSugg(results);
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

  const handleSetup = async () => {
    if (!birthDetails.name || !birthDetails.date || !birthDetails.time) { alert("Please fill in name, date, and time of birth."); return; }
    if (!birthDetails.latitude || !birthDetails.longitude) { alert("Please pick your birth place from the dropdown so we can get the coordinates."); return; }
    const formattedDate = getFormattedDate();
    if (!formattedDate) { alert("Please enter date as DD/MM/YYYY"); return; }
    // Clamp birth date to a sensible range — the v1 masked input will
    // happily accept "200000-99-99" so we guard here.
    const todayISO = new Date().toISOString().slice(0, 10);
    if (formattedDate < "1900-01-01" || formattedDate > todayISO) {
      alert("Birth date must be between 1900-01-01 and today."); return;
    }
    const timeParts = birthDetails.time.split(":").map(Number);
    if (timeParts.length !== 2 || isNaN(timeParts[0]) || isNaN(timeParts[1]) || timeParts[0] < 1 || timeParts[0] > 12 || timeParts[1] < 0 || timeParts[1] > 59) {
      alert("Please enter a valid time (HH:MM, hours 01–12, minutes 00–59)"); return;
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
      setCurrentSessionId(prev => prev || Date.now().toString());
      // NOTE: we deliberately do NOT show the AI-language modal here
      // anymore. The modal's purpose is to let astrologers choose
      // EN vs Telugu+English output for Claude's analysis — a decision
      // only relevant the moment they click the Analysis tab. Firing
      // it right after chart generation interrupts the chart viewing
      // flow. See the useEffect below that shows it on first Analysis
      // tab entry instead.
    } catch { alert("Could not generate chart. Please check if the backend is running."); }
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
    const msgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: msgId,
      question: currentQuestion,
      answer: "",
      analysis: null,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);

    try {
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
      });

      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
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
    } catch {
      setMessages(prev => prev.map(m => m.id === msgId
        ? { ...m, answer: m.answer || "Something went wrong. Please try again." }
        : m));
    } finally {
      setLoading(false);
    }
  };

  const handleTopicAnalysis = async (topic: string) => {
    if (!workspaceData) return;
    setActiveTopic(topic); setAnalysisLoading(true); setActiveTab("analysis");
    const formattedDate = getFormattedDate();
    const topicLabel = TOPICS.find(t => t.id === topic)?.te || topic;
    try {
      // Topic analysis always starts fresh — no prior history for the first message
      const res = await axios.post(`${API_URL}/astrologer/analyze`, { name: birthDetails.name, date: formattedDate, time: getTime24(), latitude: birthDetails.latitude, longitude: birthDetails.longitude, timezone_offset: timezoneOffset, gender: birthDetails.gender || "", topic, question: `Complete KP analysis for ${topic}`, history: [], language: backendLang() });
      setAnalysisMessages(prev => [...prev, { q: `${topicLabel} — Full Analysis`, a: res.data.answer, isTopic: true }]);
    } catch {
      setAnalysisMessages(prev => [...prev, { q: topicLabel, a: "Analysis failed. Please try again.", isTopic: true }]);
    } finally { setAnalysisLoading(false); }
  };

  const loadQuickInsights = async () => {
    if (!workspaceData || Object.keys(quickInsights).length > 0) return;
    const formattedDate = getFormattedDate();
    if (!formattedDate) return;
    try {
      const res = await axios.post(`${API_URL}/astrologer/quick-insights`, {
        name: birthDetails.name, date: formattedDate, time: getTime24(),
        latitude: birthDetails.latitude, longitude: birthDetails.longitude,
        timezone_offset: timezoneOffset,
        gender: birthDetails.gender || "",
        topics: ["marriage", "job", "health", "foreign_travel", "children", "education", "property", "wealth"],
        language: backendLang(),
      });
      // Response is { topic: insight_string } directly
      if (res.data && typeof res.data === "object") setQuickInsights(res.data);
    } catch { /* silent fail — quick insights are optional */ }
  };

  const handleWorkspaceChat = async () => {
    if (!chatQ.trim()) return;
    const q = chatQ; setChatQ(""); setAnalysisLoading(true); setActiveTab("analysis");
    const formattedDate = getFormattedDate();
    try {
      // CRITICAL FIX: pass ALL prior messages (including topic analysis) as history
      // This prevents the AI from repeating reasoning already given
      const history = analysisMessages.slice(-6).map(m => ({ question: m.q, answer: m.a }));
      const res = await axios.post(`${API_URL}/astrologer/analyze`, { name: birthDetails.name, date: formattedDate, time: getTime24(), latitude: birthDetails.latitude, longitude: birthDetails.longitude, timezone_offset: timezoneOffset, gender: birthDetails.gender || "", topic: activeTopic || "general", question: q, history, language: backendLang() });
      setAnalysisMessages(prev => [...prev, { q, a: res.data.answer }]);
    } catch { } finally { setAnalysisLoading(false); }
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

  const TOPICS = [
    { id: "marriage", te: "వివాహం" }, { id: "job", te: "ఉద్యోగం" }, { id: "health", te: "ఆరోగ్యం" },
    { id: "foreign_travel", te: "విదేశాలు" }, { id: "children", te: "సంతానం" }, { id: "education", te: "విద్య" },
    { id: "property", te: "ఆస్తి" }, { id: "wealth", te: "సంపద" },
  ];

  const TOPIC_EMOJI: Record<string, string> = {
    marriage: "💍", job: "💼", health: "🏥", foreign_travel: "✈️",
    children: "👶", education: "📚", property: "🏠", wealth: "💰",
  };

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
        @keyframes slideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .tab-content{animation:slideIn 0.2s ease}
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

          {/* Birth details card */}
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
                    type="text"
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
                      type="text"
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
        </main>
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
          stashing the previous values so Cancel can fully restore. */}
      {newChartModalOpen && (
        <div
          onClick={handleCancelNewChartModal}
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
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: theme.text.primary, lineHeight: 1.2 }}>
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
                    type="text"
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
                      type="text"
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
              const res = await axios.post(`${API_URL}/pdf/export`, { workspace: workspaceData }, { responseType: "blob", timeout: 30000 });
              const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
              const a = document.createElement("a"); a.href = url;
              a.download = `${workspaceData.name || "kp_chart"}_report.pdf`; a.click();
              URL.revokeObjectURL(url);
            } catch (e: any) {
              setPdfError(e?.response?.status === 500 ? "Server error — try again" : "Download failed");
            }
            setPdfLoading(false);
          }}
          pdfLoading={pdfLoading}
          savedSessions={savedSessions}
          onSwitchSession={handleSwitchSession}
          astrologerMode={true}
        />
        <div className="workspace-layout" style={{ flex: 1, display: "flex", overflow: "hidden" }}>

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

              {/* Session switcher */}
              {savedSessions.length > 0 && (
                <div className="sidebar-section" style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--border)", flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 5 }}>Charts</div>
                  <div style={{ padding: "8px", borderRadius: 8, background: "rgba(201,169,110,0.08)", border: "0.5px solid rgba(201,169,110,0.4)", marginBottom: 6 }}>
                    <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500, marginBottom: 1 }}>
                      {workspaceData?.name?.split(" ")[0]}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(201,169,110,0.6)" }}>★ Active</div>
                  </div>
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
                          {birthYear && <div style={{ fontSize: 10, color: "var(--muted)" }}>Born {birthYear}</div>}
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
                    + New Chart
                  </button>
                </div>
              )}
              <div className="sidebar-section" style={{ padding: "1rem", borderBottom: "0.5px solid var(--border)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,169,110,0.1)", border: "0.5px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "var(--accent)", fontWeight: 600, marginBottom: 8 }}>{workspaceData.name[0]?.toUpperCase()}</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{workspaceData.name}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.6 }}>{birthDetails.date}<br />{birthDetails.time} {birthDetails.ampm}<br />{birthDetails.place}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                  <span style={{ fontSize: 9, background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 3, padding: "2px 6px" }}>KP New</span>
                  <span style={{ fontSize: 9, background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 3, padding: "2px 6px" }}>Placidus</span>
                </div>
              </div>
              <div className="sidebar-section" style={{ padding: "0.75rem 1rem", borderBottom: "0.5px solid var(--border)" }}>
                <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>
                  {t("Panchang · now", "పంచాంగం · ఇప్పుడు")}
                </div>
                {[
                  { l: t("Weekday", "వారం"), v: lang === "en" ? (workspaceData.panchangam_today.vara_en ?? workspaceData.panchangam_today.vara) : workspaceData.panchangam_today.vara },
                  { l: t("Tithi", "తిథి"),   v: lang === "en" ? (workspaceData.panchangam_today.tithi_en ?? workspaceData.panchangam_today.tithi) : workspaceData.panchangam_today.tithi },
                  { l: t("Nakshatra", "నక్షత్రం"), v: lang === "en" ? (workspaceData.panchangam_today.nakshatra_en ?? workspaceData.panchangam_today.nakshatra) : workspaceData.panchangam_today.nakshatra },
                ].map(item => (
                  <div key={item.l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>{item.l}</span>
                    <span style={{ fontSize: 11, color: "var(--text)" }}>{item.v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4, padding: "3px 8px", background: "rgba(248,113,113,0.1)", border: "0.5px solid rgba(248,113,113,0.2)", borderRadius: 4, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "#f87171" }}>{t("Rahu Kalam", "రాహుకాలం")}</span>
                  <span style={{ fontSize: 10, color: "#f87171" }}>{workspaceData.panchangam_today.rahu_kalam}</span>
                </div>
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="workspace-main" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
            {/* Tabs */}
            <div className="tab-bar" style={{ display: "flex", borderBottom: "0.5px solid var(--border)", background: "var(--surface)", overflowX: "auto", flexShrink: 0 }}>
              {TABS.map(tab => {
                const TabIcon = tab.Icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: "10px 16px",
                      background: "transparent",
                      border: "none",
                      borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                      color: active ? "var(--accent)" : "var(--muted)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                      transition: "color 0.15s, border-color 0.15s",
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

            {/* Tab content */}
            <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>

              {/* CHART — two-column: chart left, PlanetList right */}
              {activeTab === "chart" && (
                <div className="tab-content">
                  {/* Chart / Planets view toggle */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    {[
                      { v: "chart",   l: "Chart",   Icon: LayoutGrid },
                      { v: "planets", l: "Planets", Icon: Target },
                    ].map(opt => {
                      const active = chartView === opt.v;
                      const OptIcon = opt.Icon;
                      return (
                        <button
                          key={opt.v}
                          onClick={() => setChartView(opt.v as "chart"|"planets")}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "6px 14px", borderRadius: 999,
                            border: active ? "1px solid rgba(201,169,110,0.45)" : "1px solid rgba(255,255,255,0.08)",
                            background: active ? "rgba(201,169,110,0.1)" : "transparent",
                            color: active ? "#c9a96e" : "var(--muted)",
                            fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                            transition: "color 120ms, border-color 120ms, background 120ms",
                          }}
                          onMouseEnter={e => { if (active) return; e.currentTarget.style.color = "#c9a96e"; e.currentTarget.style.borderColor = "rgba(201,169,110,0.3)"; }}
                          onMouseLeave={e => { if (active) return; e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                        >
                          <OptIcon size={13} strokeWidth={1.8} />
                          {opt.l}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", gap: "1.5rem", alignItems: "start", flexWrap: "wrap" }}>
                    {/* LEFT — Chart */}
                    {(chartView === "chart" || chartView === "planets") && (
                      <div style={{ flexShrink: 0 }}>
                        {chartView === "chart" && (
                          <>
                            {/* PR fix-21 — title is rendered inside RasiChart now (dynamic per active style) */}
                            <SouthIndianChart
                              planets={workspaceData.planets}
                              cusps={workspaceData.cusps}
                              onHouseClick={h => setSelectedHouse(prev => prev === h ? null : h)}
                              selectedHouse={selectedHouse}
                            />
                            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 8, textAlign: "center", letterSpacing: "0.02em" }}>Tap a house for details · <span style={{ color: "#c9a96e" }}>↑</span> = Lagna</div>
                          </>
                        )}
                      </div>
                    )}

                    {/* RIGHT — PlanetList (star lord → sub lord) */}
                    {chartView === "chart" && !selectedHouse && (
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <SectionEyebrow te="గ్రహ స్థానాలు" en="Planet Positions · KP" noMarginBottom />
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 10, padding: "3px 10px", borderRadius: 999,
                            background: "rgba(201,169,110,0.08)", color: "#c9a96e",
                            border: "0.5px solid rgba(201,169,110,0.3)",
                            fontWeight: 500,
                          }}>Star → Sub Lord</span>
                        </div>
                        <div style={{ background: "var(--card)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
                          <PlanetList planets={workspaceData.planets} />
                        </div>
                      </div>
                    )}

                    {/* House panel overlay */}
                    {selectedHouse && (
                      <HousePanel
                        house={selectedHouse}
                        cusps={workspaceData.cusps}
                        significators={workspaceData.significators}
                        planets={workspaceData.planets}
                        rulingPlanets={workspaceData.ruling_planets?.all_en || []}
                        antardashas={workspaceData.antardashas || []}
                        onClose={() => setSelectedHouse(null)}
                      />
                    )}

                    {/* Mobile: planets-only view (full table) */}
                    {chartView === "planets" && (
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <SectionEyebrow te="గ్రహ స్థాన పట్టిక" en="Planet Positions · KP" />
                        <div style={{ background: "var(--card)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
                          <PlanetList planets={workspaceData.planets} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* HOUSES — consolidated tab with sub-tabs */}
              {activeTab === "houses" && (
                <div className="tab-content" style={{ padding: "1rem", height: "100%", overflowY: "auto" }}>
                  {!workspaceData ? (
                    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                      <div style={{ fontSize: 14, color: "var(--muted)" }}>{t("Load a chart above", "పైన చార్ట్ లోడ్ చేయండి")}</div>
                    </div>
                  ) : (
                    <>
                      {/* Sub-tab pill switcher */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                        {[
                          { id: "overview", en: "Overview",     te: "సారాంశం" },
                          { id: "cusps",    en: "Cusps",        te: "కస్పాలు" },
                          { id: "sigs",     en: "Significators", te: "కారకులు" },
                          { id: "ruling",   en: "Ruling",       te: "రూలింగ్" },
                          { id: "panchang", en: "Panchangam",   te: "పంచాంగం" },
                        ].map(st => {
                          const active = housesSubTab === st.id;
                          const label = lang === "en" ? st.en : st.te;
                          return (
                            <button
                              key={st.id}
                              onClick={() => { setHousesSubTab(st.id as any); setCslSelectedHouse(null); }}
                              style={{
                                padding: "7px 16px",
                                borderRadius: 999,
                                border: active ? "1px solid rgba(201,169,110,0.55)" : "1px solid rgba(255,255,255,0.08)",
                                background: active ? "rgba(201,169,110,0.12)" : "transparent",
                                color: active ? "var(--accent)" : "var(--muted)",
                                fontSize: 12,
                                fontWeight: active ? 600 : 500,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                transition: "color 120ms, border-color 120ms, background 120ms",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "rgba(201,169,110,0.3)"; } }}
                              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; } }}
                            >
                              <span>{label}</span>
                              {lang === "te_en" && (
                                <span style={{ fontSize: 9, opacity: 0.55, fontWeight: 400 }}>{st.en}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* OVERVIEW sub-tab — HouseOverviewGrid */}
                      {housesSubTab === "overview" && (
                        <div className="tab-content">
                          {/* PR A1.3-fix-20 — Tara Chakra widget at top of Overview */}
                          {workspaceData?.tara_chakra && (
                            <TaraChakraWidget
                              taraData={workspaceData.tara_chakra}
                              todayMoonNakshatra={workspaceData?.panchangam_today?.nakshatra_en}
                            />
                          )}
                          <div style={{ display: "flex", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: 340 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                <span style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{t("House overview", "భావ సారాంశం")}</span>
                                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 6, background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid rgba(201,169,110,0.25)" }}>CSL · KP unique</span>
                              </div>
                              <HouseOverviewGrid
                                cusps={workspaceData.cusps}
                                planets={workspaceData.planets}
                                selectedHouse={cslSelectedHouse}
                                onHouseClick={h => setCslSelectedHouse(prev => prev === h ? null : h)}
                              />
                            </div>
                            {/* CSL Chain view panel */}
                            {cslSelectedHouse && workspaceData.csl_chains && workspaceData.csl_chains[String(cslSelectedHouse)] && (
                              <div style={{ width: 300, flexShrink: 0 }} className="fade-in">
                                <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 }}>{t("CSL chain analysis", "CSL చైన్ విశ్లేషణ")}</div>
                                <CSLChainView
                                  houseNum={cslSelectedHouse}
                                  chain={workspaceData.csl_chains[String(cslSelectedHouse)]}
                                />
                                <div style={{ marginTop: 8 }}>
                                  <HousePanel
                                    house={cslSelectedHouse}
                                    cusps={workspaceData.cusps}
                                    significators={workspaceData.significators}
                                    planets={workspaceData.planets}
                                    rulingPlanets={workspaceData.ruling_planets?.all_en || []}
                                    antardashas={workspaceData.antardashas || []}
                                    onClose={() => setCslSelectedHouse(null)}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

              {/* CUSPS sub-tab */}
              {housesSubTab === "cusps" && (
                <div className="tab-content" style={{ display: "flex", gap: "1rem", alignItems: "start" }}>
                  <div style={{ flex: 1, overflowX: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{t("House cusps · KP key", "భావ కస్పాల పట్టిక · KP కీలకం")}</div>
                      <div style={{ fontSize: 9, color: "var(--muted)" }}>{t("Click any row → house panel", "ఏదైనా అడ్డంగా నొక్కండి → భావ వివరాలు")}</div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
                      <thead>
                        <tr>
                          {[
                            t("House", "భావం"),
                            t("Sign", "రాశి"),
                            t("Degree", "అంశం"),
                            t("Nakshatra", "నక్షత్రం"),
                            t("Star lord", "నక్షత్రాధిపతి"),
                            t("Sub lord", "సబ్ లార్డ్"),
                          ].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", borderBottom: "0.5px solid var(--border)", fontWeight: 400 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {workspaceData.cusps.map((c: any) => {
                          const signV = lang === "en" ? c.sign_en : (c.sign_te ?? c.sign_en);
                          const nakV  = lang === "en" ? c.nakshatra_en : (c.nakshatra_te ?? c.nakshatra_en);
                          const starV = lang === "en" ? c.star_lord_en : (c.star_lord_te ?? c.star_lord_en);
                          const subV  = lang === "en" ? c.sub_lord_en : (c.sub_lord_te ?? c.sub_lord_en);
                          const houseSub = lang === "en" ? "" : (c.house_te ?? "");
                          return (
                            <tr key={c.house_num} onClick={() => setSelectedHouse(selectedHouse === c.house_num ? null : c.house_num)} style={{ borderBottom: "0.5px solid rgba(201,169,110,.06)", cursor: "pointer", background: selectedHouse === c.house_num ? "rgba(201,169,110,0.08)" : "transparent" }} onMouseEnter={e => { if (selectedHouse !== c.house_num) e.currentTarget.style.background = "rgba(201,169,110,0.04)"; }} onMouseLeave={e => { if (selectedHouse !== c.house_num) e.currentTarget.style.background = "transparent"; }}>
                              <td style={{ padding: "9px 10px" }}>
                                <span style={{ color: selectedHouse === c.house_num ? "var(--accent2)" : "var(--accent)", fontWeight: 700 }}>H{c.house_num}</span>
                                {houseSub && <span style={{ color: "var(--muted)", fontSize: 10, marginLeft: 4 }}>{houseSub}</span>}
                              </td>
                              <td style={{ padding: "9px 10px", color: "var(--text)" }}>{signV}</td>
                              <td style={{ padding: "9px 10px", color: "var(--muted)", fontSize: 11 }}>{c.degree_in_sign.toFixed(2)}°</td>
                              <td style={{ padding: "9px 10px", color: "var(--text)" }}>{nakV}</td>
                              <td style={{ padding: "9px 10px", color: PLANET_COLORS[c.star_lord_en] || "var(--text)" }}>{starV}</td>
                              <td style={{ padding: "9px 10px" }}><span style={{ background: "rgba(201,169,110,.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{subV}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {selectedHouse && (
                    <div style={{ width: 280, flexShrink: 0 }}>
                      <HousePanel
                        house={selectedHouse}
                        cusps={workspaceData.cusps}
                        significators={workspaceData.significators}
                        planets={workspaceData.planets}
                        rulingPlanets={workspaceData.ruling_planets?.all_en || []}
                        antardashas={workspaceData.antardashas || []}
                        onClose={() => setSelectedHouse(null)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* SIGNIFICATORS sub-tab */}
              {housesSubTab === "sigs" && (
                <div className="tab-content" style={{ display: "flex", gap: "1rem", alignItems: "start" }}>
                  <div style={{ flex: 1 }}>
                    {(() => {
                      // Build 9×12 strength grid from significators data
                      const PLANETS_EN = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
                      const sigGrid: Record<string, number[]> = {};
                      PLANETS_EN.forEach(p => { sigGrid[p] = []; });
                      Object.entries(workspaceData.significators).forEach(([, sig]: [string, any]) => {
                        const hNum: number = sig.house_num;
                        (sig.all_significators_en || []).forEach((p: string) => {
                          if (sigGrid[p] !== undefined && !sigGrid[p].includes(hNum)) sigGrid[p].push(hNum);
                        });
                      });
                      return (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{t("Significators · all houses", "కారక గ్రహాలు · అన్ని భావాలు")}</div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <div style={{ fontSize: 9, color: "var(--muted)" }}>{t("Click any house → full details", "ఏ భావాన్నయినా నొక్కండి → వివరాలు")}</div>
                              <button onClick={() => setShowSigGrid(g => !g)}
                                style={{ padding: "3px 10px", background: showSigGrid ? "rgba(201,169,110,0.2)" : "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 5, color: showSigGrid ? "var(--accent)" : "var(--muted)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                                {showSigGrid ? t("Hide grid", "గ్రిడ్ దాచు") : t("Show strength grid", "బలం గ్రిడ్ చూడు")}
                              </button>
                            </div>
                          </div>
                          {showSigGrid && (
                            <div style={{ overflowX: "auto", marginBottom: 16 }}>
                              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>{t("Planet × house significator matrix", "గ్రహ × భావ కారకత్వ మాతృక")}</div>
                              <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
                                <thead>
                                  <tr>
                                    <th style={{ padding: "5px 8px", color: "var(--accent)", fontWeight: 600, textAlign: "left", minWidth: 70 }}>{t("Planet", "గ్రహం")}</th>
                                    {Array.from({length:12},(_,i)=>(
                                      <th key={i} style={{ padding: "5px 6px", color: "var(--muted)", fontWeight: 500, textAlign: "center", minWidth: 28 }}>H{i+1}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {PLANETS_EN.map(p => (
                                    <tr key={p} style={{ borderBottom: "0.5px solid rgba(255,255,255,0.04)" }}>
                                      <td style={{ padding: "5px 8px", color: PLANET_COLORS[p] || "var(--fg)", fontWeight: 500 }}>{p}</td>
                                      {Array.from({length:12},(_,i)=>{
                                        const has = sigGrid[p]?.includes(i+1);
                                        return (
                                          <td key={i} style={{ padding: "5px 6px", textAlign: "center" }}>
                                            {has ? (
                                              <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: "50%", background: `${PLANET_COLORS[p] || "var(--accent)"}25`, border: `1px solid ${PLANET_COLORS[p] || "var(--accent)"}60`, color: PLANET_COLORS[p] || "var(--accent)", fontSize: 9, lineHeight: "18px", fontWeight: 700 }}>✓</span>
                                            ) : (
                                              <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 11 }}>·</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    <div className="grid-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                      {Object.entries(workspaceData.significators).map(([key, sig]: [string, any]) => {
                        const houseSub = lang === "en" ? "" : (sig.house_te ?? "");
                        const occNames = lang === "en" ? (sig.occupants_en ?? []) : (sig.occupants_te ?? sig.occupants_en ?? []);
                        const lordName = lang === "en" ? sig.house_lord_en : (sig.house_lord_te ?? sig.house_lord_en);
                        const allSigs = lang === "en" ? (sig.all_significators_en ?? []) : (sig.all_significators_te ?? sig.all_significators_en ?? []);
                        return (
                          <div key={key} onClick={() => setSelectedHouse(selectedHouse === sig.house_num ? null : sig.house_num)} style={{ background: selectedHouse === sig.house_num ? "rgba(201,169,110,0.12)" : "var(--surface2)", borderRadius: 8, padding: "0.75rem", border: `0.5px solid ${selectedHouse === sig.house_num ? "rgba(201,169,110,0.5)" : "var(--border)"}`, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => { if (selectedHouse !== sig.house_num) (e.currentTarget as HTMLElement).style.background = "rgba(201,169,110,0.06)"; }} onMouseLeave={e => { if (selectedHouse !== sig.house_num) (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}>
                            <div style={{ fontSize: 11, color: selectedHouse === sig.house_num ? "var(--accent2)" : "var(--accent)", fontWeight: 700, marginBottom: 2 }}>H{sig.house_num}</div>
                            {houseSub && <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>{houseSub}</div>}
                            {sig.occupants_en?.length > 0 && (
                              <div style={{ marginBottom: 3 }}>
                                <span style={{ fontSize: 9, color: "var(--muted)" }}>{t("Occupants", "నివాసులు")}: </span>
                                {occNames.map((p: string, i: number) => <span key={i} style={{ fontSize: 11, color: PLANET_COLORS[sig.occupants_en[i]] || "var(--accent2)", marginRight: 3 }}>{p}</span>)}
                              </div>
                            )}
                            <div style={{ marginBottom: 3 }}>
                              <span style={{ fontSize: 9, color: "var(--muted)" }}>{t("Lord", "అధిపతి")}: </span>
                              <span style={{ fontSize: 11, color: PLANET_COLORS[sig.house_lord_en] || "var(--green)" }}>{lordName}</span>
                            </div>
                            <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 4, marginTop: 2 }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                                {allSigs.map((p: string, i: number) => <span key={i} style={{ fontSize: 10, color: PLANET_COLORS[sig.all_significators_en[i]] || "var(--text)" }}>{p}</span>)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {selectedHouse && (
                    <div style={{ width: 280, flexShrink: 0 }}>
                      <HousePanel
                        house={selectedHouse}
                        cusps={workspaceData.cusps}
                        significators={workspaceData.significators}
                        planets={workspaceData.planets}
                        rulingPlanets={workspaceData.ruling_planets?.all_en || []}
                        antardashas={workspaceData.antardashas || []}
                        onClose={() => setSelectedHouse(null)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* RULING sub-tab (inline, no outer wrapper) */}
              {housesSubTab === "ruling" && (
                <div>
                  <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.75rem" }}>
                    {t("Ruling planets", "రూలింగ్ గ్రహాలు")} · {workspaceData.ruling_planets.query_time}
                  </div>
                  <div className="setup-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 10, padding: "1rem" }}>
                      {[
                        { l: t("Day lord",          "వారాధిపతి"),        en: workspaceData.ruling_planets.day_lord_en,        te: workspaceData.ruling_planets.day_lord_te },
                        { l: t("Lagna sign lord",   "లగ్న రాశ్యధిపతి"),  en: workspaceData.ruling_planets.lagna_sign_lord_en, te: workspaceData.ruling_planets.lagna_sign_lord_te },
                        { l: t("Lagna star lord",   "లగ్న నక్షత్రాధిపతి"), en: workspaceData.ruling_planets.lagna_star_lord_en, te: workspaceData.ruling_planets.lagna_star_lord_te },
                        { l: t("Moon sign lord",    "చంద్ర రాశ్యధిపతి"),  en: workspaceData.ruling_planets.moon_sign_lord_en,  te: workspaceData.ruling_planets.moon_sign_lord_te },
                        { l: t("Moon star lord",    "చంద్ర నక్షత్రాధిపతి"), en: workspaceData.ruling_planets.moon_star_lord_en, te: workspaceData.ruling_planets.moon_star_lord_te },
                      ].map(item => {
                        const val = lang === "en" ? item.en : (item.te ?? item.en);
                        return (
                          <div key={item.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 10, borderBottom: "0.5px solid var(--border)" }}>
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>{item.l}</span>
                            <span style={{ fontSize: 15, fontWeight: 600, color: PLANET_COLORS[item.en] || "var(--accent)" }}>{val}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 10, padding: "1rem" }}>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: "0.75rem" }}>{t("All ruling planets", "అన్ని రూలింగ్ గ్రహాలు")}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {(lang === "en" ? workspaceData.ruling_planets.all_en : workspaceData.ruling_planets.all_te).map((p: string, i: number) => (
                          <div key={i} style={{ textAlign: "center", padding: "10px 14px", background: `${PLANET_COLORS[workspaceData.ruling_planets.all_en[i]] || "var(--accent)"}15`, border: `0.5px solid ${PLANET_COLORS[workspaceData.ruling_planets.all_en[i]] || "var(--accent)"}30`, borderRadius: 8 }}>
                            <div style={{ fontSize: 16, fontWeight: 600, color: PLANET_COLORS[workspaceData.ruling_planets.all_en[i]] || "var(--accent)" }}>{p}</div>
                            {lang !== "en" && <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>{workspaceData.ruling_planets.all_en[i]}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PANCHANGAM sub-tab */}
              {housesSubTab === "panchang" && (
                <div>
                  <div className="setup-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                    <PanchangamCard data={workspaceData.panchangam_birth} title={t("Birth panchangam", "జన్మ పంచాంగం")} />
                    <PanchangamCard data={workspaceData.panchangam_today} title={t("Today's panchangam", "నేటి పంచాంగం")} />
                  </div>
                </div>
              )}

                    </>
                  )}
                </div>
              )}

              {/* ────────────────────────────────────────────────
                   DASHA (Vimshottari) — PR19 wow pass.
                   Serif page hero, 3-card "Currently running" hero
                   with breathing MD card and progress bars, premium
                   section headers for AD timeline + PAD list,
                   polished PAD cards, Transit (PR18) at the bottom.
                   Full i18n — no hardcoded Telugu.
                   ──────────────────────────────────────────────── */}
              {activeTab === "dasha" && (() => {
                // Period-elapsed helper: given YYYY-MM-DD strings,
                // returns { pct 0-100, elapsedYears, totalYears }.
                const periodProgress = (start?: string, end?: string) => {
                  if (!start || !end) return { pct: 0, elapsedY: 0, totalY: 0 };
                  const s = new Date(start).getTime();
                  const e = new Date(end).getTime();
                  const now = Date.now();
                  const total = e - s;
                  if (total <= 0) return { pct: 0, elapsedY: 0, totalY: 0 };
                  const elapsed = Math.max(0, Math.min(total, now - s));
                  const yr = (ms: number) => ms / (1000 * 60 * 60 * 24 * 365.25);
                  return {
                    pct: Math.round((elapsed / total) * 100),
                    elapsedY: +yr(elapsed).toFixed(1),
                    totalY: +yr(total).toFixed(1),
                  };
                };
                const md  = workspaceData.current_dasha ?? workspaceData.mahadasha;
                const ad  = workspaceData.current_antardasha;
                const pad = workspaceData.current_pratyantardasha;
                const mdLord  = md  ? (lang === "en" ? md.lord_en  : (md.lord_te  || md.lord_en))  : null;
                const adLord  = ad  ? (lang === "en" ? ad.lord_en  : (ad.lord_te  || ad.lord_en))  : null;
                const padLord = pad ? (lang === "en" ? pad.lord_en : (pad.lord_te || pad.lord_en)) : null;
                const mdProg  = periodProgress(md?.start,  md?.end);
                const adProg  = periodProgress(ad?.start,  ad?.end);
                const padProg = periodProgress(pad?.start, pad?.end);
                const fmt = (s?: string) => s?.slice(0, 10) ?? "—";

                return (
                <div className="tab-content">
                  {/* Page hero */}
                  <header className="dasha-hero">
                    <span className="dasha-hero-eyebrow">
                      <Sparkles size={12} strokeWidth={1.8} />
                      {t("Vimshottari · 120-year cycle", "విమ్శోత్తరి · 120 సంవత్సరాల చక్రం")}
                    </span>
                    <h1 className="dasha-hero-title">
                      {t("Your dasha journey", "మీ దశ ప్రయాణం")}
                    </h1>
                    <p className="dasha-hero-sub">
                      {t(
                        "Every planet rules a window of your life. See which Mahadasha, Antardasha, and Pratyantardasha you're living in — with transits layered on top.",
                        "ప్రతి గ్రహం మీ జీవితంలో ఒక కాలాన్ని శాసిస్తుంది. మీరు ఏ మహాదశ, అంతర్దశ, ప్రత్యంతర్దశలో ఉన్నారో చూడండి — గోచారాలతో కలిపి."
                      )}
                    </p>
                  </header>

                  {/* Currently running — 3-card hero with MD breathing */}
                  {md && (
                    <div className="dasha-now-grid">
                      <div
                        className="dasha-now-card is-md"
                        style={{ ["--planet-color" as any]: PLANET_COLORS[md.lord_en] ?? "var(--accent)" }}
                      >
                        <div className="dasha-now-stage">{t("Mahadasha", "మహాదశ")}</div>
                        <div className="dasha-now-planet">{mdLord ?? "—"}</div>
                        <div className="dasha-now-dates">{fmt(md.start)} → {fmt(md.end)}</div>
                        <div className="dasha-now-progress">
                          <div className="dasha-now-progress-fill" style={{ width: `${mdProg.pct}%` }} />
                        </div>
                        <div className="dasha-now-elapsed">
                          <b>{mdProg.elapsedY}y</b> / {mdProg.totalY}y · {mdProg.pct}% {t("elapsed", "పూర్తయింది")}
                        </div>
                      </div>

                      {ad && (
                        <div
                          className="dasha-now-card"
                          style={{ ["--planet-color" as any]: PLANET_COLORS[ad.lord_en] ?? "var(--accent)" }}
                        >
                          <div className="dasha-now-stage">{t("Antardasha", "అంతర్దశ")}</div>
                          <div className="dasha-now-planet">{adLord ?? "—"}</div>
                          <div className="dasha-now-dates">{fmt(ad.start)} → {fmt(ad.end)}</div>
                          <div className="dasha-now-progress">
                            <div className="dasha-now-progress-fill" style={{ width: `${adProg.pct}%` }} />
                          </div>
                          <div className="dasha-now-elapsed">
                            <b>{adProg.elapsedY}y</b> / {adProg.totalY}y · {adProg.pct}% {t("elapsed", "పూర్తయింది")}
                          </div>
                        </div>
                      )}

                      {pad && (
                        <div
                          className="dasha-now-card"
                          style={{ ["--planet-color" as any]: PLANET_COLORS[pad.lord_en] ?? "var(--accent)" }}
                        >
                          <div className="dasha-now-stage">{t("Pratyantardasha", "ప్రత్యంతర్దశ")}</div>
                          <div className="dasha-now-planet">{padLord ?? "—"}</div>
                          <div className="dasha-now-dates">{fmt(pad.start)} → {fmt(pad.end)}</div>
                          <div className="dasha-now-progress">
                            <div className="dasha-now-progress-fill" style={{ width: `${padProg.pct}%` }} />
                          </div>
                          <div className="dasha-now-elapsed">
                            <b>{padProg.pct}%</b> {t("elapsed", "పూర్తయింది")}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DashaStrip — the 120y bar + tree + AD chips */}
                  <div style={{ marginTop: 24 }}>
                    <DashaStrip
                      dashas={workspaceData.dashas ?? []}
                      currentDasha={workspaceData.current_dasha ?? workspaceData.mahadasha}
                      antardashas={workspaceData.antardashas ?? []}
                      currentAntardasha={workspaceData.current_antardasha}
                      pratyantardashas={workspaceData.pratyantardashas ?? []}
                      currentPratyantardasha={workspaceData.current_pratyantardasha}
                    />
                  </div>

                  {/* Antardasha timeline section */}
                  {workspaceData.antardashas && workspaceData.antardashas.length > 0 && (
                    <div className="dasha-section">
                      <div className="dasha-section-header">
                        <div className="dasha-section-eyebrow">
                          {t("Antardasha · sub-period", "అంతర్దశ · ఉప-కాలం")}
                        </div>
                        <div className="dasha-section-title">
                          {t(`Antardashas in ${mdLord ?? ""} Mahadasha`, `${mdLord ?? ""} మహాదశలో అంతర్దశలు`)}
                        </div>
                        <div className="dasha-section-sub">
                          {t(
                            "Each planet rules a smaller slice of the current Mahadasha. The highlighted row is where you are right now.",
                            "ప్రతి గ్రహం ప్రస్తుత మహాదశలో ఒక చిన్న భాగాన్ని పాలిస్తుంది. హైలైట్ అయిన వరుస మీరు ప్రస్తుతం ఉన్న స్థానం."
                          )}
                        </div>
                      </div>
                      <DashaTimeline mahadasha={workspaceData.mahadasha} antardashas={workspaceData.antardashas} />
                    </div>
                  )}

                  {/* Pratyantardasha section — polished cards */}
                  {workspaceData.pratyantardashas && workspaceData.pratyantardashas.length > 0 && workspaceData.current_antardasha && (
                    <div className="dasha-section">
                      <div className="dasha-section-header">
                        <div className="dasha-section-eyebrow">
                          {t("Pratyantardasha · fine timing", "ప్రత్యంతర్దశ · సూక్ష్మ సమయం")}
                        </div>
                        <div className="dasha-section-title">
                          {t(
                            `Pratyantardashas in ${adLord ?? ""} Antardasha`,
                            `${adLord ?? ""} అంతర్దశలో ప్రత్యంతర్దశలు`
                          )}
                        </div>
                        <div className="dasha-section-sub">
                          {t(
                            "Sub-sub periods that deliver day- and week-level timing within the current Antardasha.",
                            "ప్రస్తుత అంతర్దశలో రోజు మరియు వారపు స్థాయి సమయాన్ని అందించే ఉప-ఉప కాలాలు."
                          )}
                        </div>
                      </div>
                      <div className="dasha-pad-list">
                        {workspaceData.pratyantardashas.map((padItem: any, i: number) => {
                          const today = new Date();
                          const isPast = new Date(padItem.end) < today;
                          const lordLabel = lang === "en" ? padItem.lord_en : (padItem.lord_te || padItem.lord_en);
                          const cls = [
                            "dasha-pad-card",
                            padItem.is_current ? "is-current" : "",
                            (!padItem.is_current && isPast) ? "is-past" : "",
                          ].filter(Boolean).join(" ");
                          return (
                            <div
                              key={i}
                              className={cls}
                              style={{ ["--planet-color" as any]: PLANET_COLORS[padItem.lord_en] ?? "var(--accent)" }}
                            >
                              <span className="dasha-pad-dot" />
                              <span className="dasha-pad-lord">{lordLabel}</span>
                              <span className="dasha-pad-dates">{fmt(padItem.start)} → {fmt(padItem.end)}</span>
                              {padItem.is_current && (
                                <span className="dasha-pad-now">{t("Now", "ప్రస్తుతం")}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────
                       TRANSIT (Gochar) — PR18 wow-pass.
                       Collapsible section inside Dasha. Premium toggle
                       card, serif gochar hero, 3 MD/AD/PAD spotlight
                       cards, polished planets table with breathing
                       dasha-lord row, KP rule card. Full i18n.
                       ──────────────────────────────────────────────── */}
                  <div className="transit-section">
                    <button
                      className={`transit-toggle${showTransitInDasha ? " is-open" : ""}`}
                      onClick={() => {
                        const next = !showTransitInDasha;
                        setShowTransitInDasha(next);
                        if (next && workspaceData && !transitData && !transitLoading) {
                          setTransitLoading(true);
                          axios.post(`${API_URL}/transit/analyze`, {
                            natal: workspaceData, transit_date: undefined,
                            latitude: workspaceData.latitude || 17.385,
                            longitude: workspaceData.longitude || 78.4867,
                            timezone_offset: timezoneOffset,
                          }).then(res => { setTransitData(res.data); setTransitLoading(false); })
                            .catch(() => setTransitLoading(false));
                        }
                      }}
                    >
                      <span className="transit-toggle-icon"><Orbit size={20} strokeWidth={1.6} /></span>
                      <span className="transit-toggle-body">
                        <span className="transit-toggle-eyebrow">{t("Gochar · Current Sky", "గోచారం · ప్రస్తుత ఆకాశం")}</span>
                        <span className="transit-toggle-title">{t("Today's transits", "నేటి గోచారాలు")}</span>
                        <span className="transit-toggle-sub">
                          {t(
                            "Rank current-sky planets against your dasha — flag Sade Sati.",
                            "ప్రస్తుత గ్రహాలను మీ దశతో పోల్చి చూపుతుంది — సాడేసాతి హెచ్చరిక."
                          )}
                        </span>
                      </span>
                      <span className="transit-toggle-chevron"><ChevronDown size={16} strokeWidth={2} /></span>
                    </button>

                    {showTransitInDasha && (
                      <div className="transit-body">
                        {/* Controls row: current period chips + date input + refresh */}
                        <div className="transit-controls">
                          <div className="transit-controls-period">
                            <div className="transit-controls-eyebrow">{t("Your current period", "మీ ప్రస్తుత దశ")}</div>
                            <div className="transit-controls-period-row">
                              {workspaceData.mahadasha && (
                                <span className="transit-period-chip md">
                                  <span className="stage">MD</span>
                                  <span>{lang === "en" ? workspaceData.mahadasha.lord_en : (workspaceData.mahadasha.lord_te || workspaceData.mahadasha.lord_en)}</span>
                                </span>
                              )}
                              {workspaceData.current_antardasha && (
                                <span className="transit-period-chip ad">
                                  <span className="stage">AD</span>
                                  <span>{lang === "en" ? workspaceData.current_antardasha.lord_en : (workspaceData.current_antardasha.lord_te || workspaceData.current_antardasha.lord_en)}</span>
                                </span>
                              )}
                              {workspaceData.current_pratyantardasha && (
                                <span className="transit-period-chip pad">
                                  <span className="stage">PAD</span>
                                  <span>{lang === "en" ? workspaceData.current_pratyantardasha.lord_en : (workspaceData.current_pratyantardasha.lord_te || workspaceData.current_pratyantardasha.lord_en)}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <input
                            type="date"
                            className="transit-date-input"
                            value={transitDate}
                            onChange={e => setTransitDate(e.target.value)}
                            aria-label={t("Transit date", "గోచార తేదీ")}
                          />
                          <button
                            className="transit-refresh-btn"
                            disabled={transitLoading}
                            onClick={async () => {
                              if (!workspaceData) return;
                              setTransitLoading(true);
                              try {
                                const res = await axios.post(`${API_URL}/transit/analyze`, {
                                  natal: workspaceData,
                                  transit_date: transitDate || undefined,
                                  latitude: workspaceData.latitude || 17.385,
                                  longitude: workspaceData.longitude || 78.4867,
                                  timezone_offset: timezoneOffset,
                                });
                                setTransitData(res.data);
                              } catch { setTransitData(null); }
                              setTransitLoading(false);
                            }}
                          >
                            {transitLoading
                              ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                              : <RefreshCw size={13} strokeWidth={2} />}
                            {transitLoading ? t("Loading…", "లోడ్...") : t("Refresh", "రిఫ్రెష్")}
                          </button>
                        </div>

                        {/* Sade Sati hero (only when active) */}
                        {transitData?.sade_sati?.active && (
                          <div className="transit-sade-hero">
                            <span className="transit-sade-icon"><TriangleAlert size={22} strokeWidth={1.8} /></span>
                            <div className="transit-sade-body">
                              <div className="transit-sade-eyebrow">{t("Alert · Sade Sati active", "హెచ్చరిక · సాడేసాతి")}</div>
                              <div className="transit-sade-title">{transitData.sade_sati.phase}</div>
                              <div className="transit-sade-meta">
                                {t("Natal Moon sign", "చంద్ర రాశి")}: <b>{transitData.sade_sati.natal_moon_sign}</b>
                                {" · "}
                                {t("Saturn transiting", "శని ప్రస్తుతం")}: <b>{transitData.sade_sati.saturn_in}</b>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Loading state */}
                        {transitLoading && (
                          <div className="transit-loading">
                            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                            {t("Scanning the current sky…", "ప్రస్తుత ఆకాశం చదువుతోంది...")}
                          </div>
                        )}

                        {/* Empty state */}
                        {!transitLoading && !transitData && (
                          <div className="transit-empty">
                            <span className="transit-empty-icon"><Compass size={22} strokeWidth={1.6} /></span>
                            <div className="transit-empty-title">{t("No transit data yet", "గోచార డేటా ఇంకా లేదు")}</div>
                            <div className="transit-empty-sub">
                              {t(
                                "Pick a date and press Refresh to see today's sky against your chart.",
                                "తేదీ ఎంచుకుని రిఫ్రెష్ నొక్కండి — మీ చార్ట్‌తో పోల్చి చూపుతుంది."
                              )}
                            </div>
                          </div>
                        )}

                        {/* Sub-tabs + panes — only when we have data */}
                        {!transitLoading && transitData?.transits && (() => {
                          const mdLord = transitData.current_period?.dasha_lord;
                          const adLord = transitData.current_period?.bhukti_lord;
                          const padLord = transitData.current_period?.antara_lord;
                          const mdT = transitData.transits.find((x: any) => x.planet === mdLord);
                          const adT = transitData.transits.find((x: any) => x.planet === adLord);
                          const padT = transitData.transits.find((x: any) => x.planet === padLord);
                          const planetCount = transitData.transits.length;

                          return (
                            <>
                              <div className="transit-subtab-bar">
                                {(["overview", "planets", "kp"] as const).map(key => {
                                  const labels = {
                                    overview: { en: "Overview", te: "అవలోకనం" },
                                    planets:  { en: "Planets",  te: "గ్రహాలు"   },
                                    kp:       { en: "KP Rule",  te: "KP సూత్రం" },
                                  };
                                  const active = transitSubTab === key;
                                  return (
                                    <button
                                      key={key}
                                      className={`transit-subtab-pill${active ? " is-active" : ""}`}
                                      onClick={() => setTransitSubTab(key)}
                                    >
                                      <span>{lang === "en" ? labels[key].en : labels[key].te}</span>
                                      {key === "planets" && <span className="count">{planetCount}</span>}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* ── Overview pane ── */}
                              {transitSubTab === "overview" && (
                                <div className="transit-pane" key="overview">
                                  <div className="transit-hero">
                                    <div className="transit-hero-eyebrow">
                                      <Sparkles size={12} strokeWidth={1.8} />
                                      {t("Gochar · ", "గోచారం · ")}{transitData.transit_date}
                                    </div>
                                    <div className="transit-hero-title">
                                      {t("How the sky speaks to your chart today", "నేడు ఆకాశం మీ చార్ట్‌తో ఏమి చెబుతోంది")}
                                    </div>
                                    <div className="transit-hero-sub">
                                      {t(
                                        "KP Gochar rule: only the Dasha and Bhukti lords deliver strong results. A transit sub-lord aligned with the relevant houses confirms timing.",
                                        "KP గోచార సూత్రం: దశాధిపతి మరియు అంతర్దశాధిపతి గ్రహాలు మాత్రమే బలమైన ఫలితాన్ని ఇస్తాయి. ట్రాన్‌జిట్ సబ్‌లార్డ్ సంబంధిత భావాలను సూచిస్తే — ఆ సమయం నిర్ధారణ."
                                      )}
                                    </div>
                                  </div>

                                  {(mdT || adT || padT) && (
                                    <div className="transit-spotlight-grid">
                                      {mdT && (
                                        <div className="transit-spotlight is-md">
                                          <div className="transit-spot-stage">{t("Mahadasha lord", "మహాదశ నాథుడు")}</div>
                                          <div className="transit-spot-planet">
                                            <span className="sym">{mdT.symbol}</span>
                                            <span>{mdT.planet}</span>
                                            {mdT.retrograde && <span className="transit-spot-retro">℞</span>}
                                          </div>
                                          <div className="transit-spot-meta">
                                            <b>{mdT.sign}</b> · {mdT.nakshatra}
                                          </div>
                                          <div><span className="transit-spot-house">{t("House", "భావం")} {mdT.transit_house}</span></div>
                                        </div>
                                      )}
                                      {adT && (
                                        <div className="transit-spotlight">
                                          <div className="transit-spot-stage">{t("Antardasha lord", "అంతర్దశ నాథుడు")}</div>
                                          <div className="transit-spot-planet">
                                            <span className="sym">{adT.symbol}</span>
                                            <span>{adT.planet}</span>
                                            {adT.retrograde && <span className="transit-spot-retro">℞</span>}
                                          </div>
                                          <div className="transit-spot-meta">
                                            <b>{adT.sign}</b> · {adT.nakshatra}
                                          </div>
                                          <div><span className="transit-spot-house">{t("House", "భావం")} {adT.transit_house}</span></div>
                                        </div>
                                      )}
                                      {padT && (
                                        <div className="transit-spotlight">
                                          <div className="transit-spot-stage">{t("Pratyantardasha lord", "ప్రత్యంతర్దశ నాథుడు")}</div>
                                          <div className="transit-spot-planet">
                                            <span className="sym">{padT.symbol}</span>
                                            <span>{padT.planet}</span>
                                            {padT.retrograde && <span className="transit-spot-retro">℞</span>}
                                          </div>
                                          <div className="transit-spot-meta">
                                            <b>{padT.sign}</b> · {padT.nakshatra}
                                          </div>
                                          <div><span className="transit-spot-house">{t("House", "భావం")} {padT.transit_house}</span></div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* ── Planets pane ── */}
                              {transitSubTab === "planets" && (
                                <div className="transit-pane" key="planets">
                                  <div className="transit-table-wrap">
                                    <table className="transit-table">
                                      <thead>
                                        <tr>
                                          <th>{t("Planet", "గ్రహం")}</th>
                                          <th>{t("Sign", "రాశి")}</th>
                                          <th>{t("Nakshatra", "నక్షత్రం")}</th>
                                          <th>{t("Star lord", "స్టార్ లార్డ్")}</th>
                                          <th>{t("Sub lord", "సబ్ లార్డ్")}</th>
                                          <th className="center">{t("House", "భావం")}</th>
                                          <th>{t("Note", "వివరణ")}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {transitData.transits.map((tr: any) => {
                                          const isDasha  = tr.is_dasha_lord;
                                          const isBhukti = tr.is_bhukti_lord;
                                          const isAntara = tr.is_antara_lord;
                                          const rowClass = isDasha ? "row-md" : isBhukti ? "row-ad" : isAntara ? "row-pad" : "";
                                          const cellClass = isDasha ? "planet-cell strong" : isBhukti ? "planet-cell medium" : "planet-cell";
                                          return (
                                            <tr key={tr.planet} className={rowClass}>
                                              <td>
                                                <span className={cellClass}>
                                                  <span className="sym">{tr.symbol}</span>
                                                  <span>{tr.planet}</span>
                                                  {tr.retrograde && <span className="retro-mark">℞</span>}
                                                  {isDasha  && <span className="stage-badge md">MD</span>}
                                                  {isBhukti && !isDasha  && <span className="stage-badge ad">AD</span>}
                                                  {isAntara && !isDasha && !isBhukti && <span className="stage-badge pad">PAD</span>}
                                                </span>
                                              </td>
                                              <td>{tr.sign}</td>
                                              <td style={{ color: "var(--muted)" }}>{tr.nakshatra}</td>
                                              <td>{tr.star_lord}</td>
                                              <td>{tr.sub_lord}</td>
                                              <td style={{ textAlign: "center" }}>
                                                <span className="house-pill">H{tr.transit_house}</span>
                                                {tr.over_natal_position && (
                                                  <span className="over-natal" title={t("Transiting over natal position", "జన్మస్థానం మీద గోచారం")}>●</span>
                                                )}
                                              </td>
                                              <td className="note-cell">
                                                {tr.note}
                                                {tr.natal_houses_activated?.length > 0 && (
                                                  <span className="activated">
                                                    ({t("Natal H", "జన్మ H")}{tr.natal_houses_activated.join("/")})
                                                  </span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* ── KP Rule pane ── */}
                              {transitSubTab === "kp" && (
                                <div className="transit-pane" key="kp">
                                  <div className="transit-kp-stack">
                                    <div className="transit-kp-legend">
                                      <div className="transit-kp-legend-title">{t("Stage badges", "దశ బ్యాడ్జ్‌లు")}</div>
                                      <div className="transit-kp-legend-row">
                                        <span className="transit-kp-legend-badge md">MD</span>
                                        <span>
                                          <b>{t("Mahadasha lord", "మహాదశ నాథుడు")}</b> — {t(
                                            "The planet ruling the current major period. Transits of this planet are strong and primary.",
                                            "ప్రస్తుత ప్రధాన దశను శాసించే గ్రహం. దీని గోచారం బలమైనది మరియు ప్రధానమైనది."
                                          )}
                                        </span>
                                      </div>
                                      <div className="transit-kp-legend-row">
                                        <span className="transit-kp-legend-badge ad">AD</span>
                                        <span>
                                          <b>{t("Antardasha lord", "అంతర్దశ నాథుడు")}</b> — {t(
                                            "The sub-period lord. Transits of this planet confirm or trigger MD promises.",
                                            "ఉప-దశ నాథుడు. దీని గోచారం మహాదశ వాగ్దానాలను నిర్ధారిస్తుంది లేదా ప్రేరేపిస్తుంది."
                                          )}
                                        </span>
                                      </div>
                                      <div className="transit-kp-legend-row">
                                        <span className="transit-kp-legend-badge pad">PAD</span>
                                        <span>
                                          <b>{t("Pratyantardasha lord", "ప్రత్యంతర్దశ నాథుడు")}</b> — {t(
                                            "The fine-grained sub-sub-period lord. Supplies precise day-level timing.",
                                            "సూక్ష్మ ఉప-ఉప-దశ నాథుడు. ఖచ్చితమైన రోజు-స్థాయి సమయాన్ని ఇస్తుంది."
                                          )}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="transit-kp-sutra">
                                      <div className="transit-kp-sutra-title">
                                        {t("KP Gochar Sutra", "KP గోచార సూత్రం")}
                                      </div>
                                      <div className="transit-kp-sutra-body">
                                        {t(
                                          "Only the Dasha lord and Antardasha lord give prominent results. If the transit planet's sub-lord also signifies the matching natal houses — the event manifests.",
                                          "దశాధిపతి మరియు అంతర్దశాధిపతి గ్రహాలు మాత్రమే ప్రస్తుతం ఎక్కువ ఫలితాన్ని ఇస్తాయి. ట్రాన్‌జిట్ సబ్‌లార్డ్ కూడా సంబంధిత భావాలను సూచిస్తే — ఆ ఫలితం నిర్ధారణ."
                                        )}
                                      </div>
                                      <span className="transit-kp-sutra-date">
                                        <Calendar size={11} strokeWidth={2} />
                                        {t("Date", "తేదీ")}: {transitData.transit_date}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                );
              })()}

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
                    } else {
                      // Try browser geolocation — do NOT fall back to birth coords
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
                        setPcLocationName(city && country ? `${city}, ${country}` : city || country || `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`);
                      } catch { setPcLocationName(`${lat.toFixed(3)}°, ${lon.toFixed(3)}°`); }
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
                // Auto-load on first open (or after city selection clears pcData)
                if (!pcData && !pcLoading && !pcShowCityModal) { pcFetchLocation(); }

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

                      {/* ── 3. Identity grid: Samvatsara / Ayana / Rutu / Masa ── */}
                      <div className="pc2-identity-grid">
                        {(() => {
                          const ayanaEn = pcData.ayana_te ? (AYANA_EN[pcData.ayana_te] ?? pcData.ayana_te) : "";
                          const rutuEn  = pcData.rutu_te  ? (RUTU_EN[pcData.rutu_te]   ?? pcData.rutu_te)  : "";
                          const items = [
                            {
                              label: "Samvatsara",
                              // Backend only emits the Telugu name; SAMVATSARA_EN maps
                              // to the Sanskrit transliteration ("Vijaya", "Jaya", …).
                              value: samvatsaraValue(pcData.samvatsara_te),
                              sub:   lang === "en" ? "60-year cycle" : "60 సంవత్సరాల చక్రం",
                            },
                            {
                              label: "Ayana",
                              value: lang === "en" ? ayanaEn : (pcData.ayana_te ?? ayanaEn),
                              sub:   lang === "en" ? "Solar direction" : "సూర్య ప్రయాణం",
                            },
                            {
                              label: "Rutu",
                              value: lang === "en" ? rutuEn : (pcData.rutu_te ?? rutuEn),
                              sub:   lang === "en" ? "Season" : "ఋతువు",
                            },
                            {
                              label: "Masa",
                              value: lang === "en" ? (pcData.masa_en ?? pcData.masa_te ?? "") : (pcData.masa_te ?? pcData.masa_en ?? ""),
                              sub:   lang === "en" ? "Lunar month" : "చాంద్ర మాసం",
                            },
                            // PR A1.2c — Shaka year + Vikram Samvat era markers.
                            {
                              label: "Shaka",
                              value: pcData.shaka_year ? String(pcData.shaka_year) : "",
                              sub:   lang === "en" ? "Shaka era" : "శక సంవత్సరం",
                            },
                            {
                              label: "Vikram",
                              value: pcData.vikram_samvat ? String(pcData.vikram_samvat) : "",
                              sub:   lang === "en" ? "Vikram Samvat" : "విక్రమ సంవత్",
                            },
                          ].filter(x => x.value);
                          return items.map(it => (
                            <div key={it.label} className="pc2-identity-card">
                              <span className="pc2-identity-card-label">{it.label}</span>
                              <span className="pc2-identity-card-value">{it.value}</span>
                              <span className="pc2-identity-card-sub">{it.sub}</span>
                            </div>
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
                                  <div className="pc2-element-until-inline">{t("until", "వరకు")} {pcData.tithi_ends_at}</div>
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
                            <span className="pc2-hora-time">{pcData.current_hora.start} – {pcData.current_hora.end}</span>
                          </div>
                        );
                      })()}

                      {/* ── 6. Celestial 2×2 + Auspicious/Avoid panels ── */}
                      <div className="pc-half-grid">
                        {/* LEFT: Sun/Moon times */}
                        <div className="pc2-celestial-grid">
                          {[
                            { Icon: Sunrise,  color: "#fbbf24", label: t("Sunrise", "సూర్యోదయం"),   time: pcData.sunrise,             warm: true  },
                            { Icon: Sunset,   color: "#fbbf24", label: t("Sunset", "సూర్యాస్తమయం"), time: pcData.sunset,              warm: true  },
                            { Icon: Moon,     color: "#93c5fd", label: t("Moonrise", "చంద్రోదయం"),  time: pcData.moonrise,            warm: false },
                            { Icon: MoonStar, color: "#93c5fd", label: t("Moonset", "చంద్రాస్తమయం"), time: pcData.moonset,             warm: false },
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
                                <span className="pc2-time-row-value">{pcData.brahma_muhurta.start} – {pcData.brahma_muhurta.end}</span>
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
                                <span className="pc2-time-row-value">{pcData.abhijit_muhurtha.start} – {pcData.abhijit_muhurtha.end}</span>
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
                                <span className="pc2-time-row-value">{pcData.amrit_kala}</span>
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
                              <span className="pc2-time-row-value">{pcData.rahu_kalam}</span>
                            </div>
                            <div className="pc2-time-row">
                              <div className="pc2-time-row-icon" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                                <Ban size={14} strokeWidth={1.8} />
                              </div>
                              <div className="pc2-time-row-body">
                                <div className="pc2-time-row-label">Yamagandam</div>
                              </div>
                              <span className="pc2-time-row-value">{pcData.yamagandam}</span>
                            </div>
                            <div className="pc2-time-row">
                              <div className="pc2-time-row-icon" style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>
                                <CircleDashed size={14} strokeWidth={1.8} />
                              </div>
                              <div className="pc2-time-row-body">
                                <div className="pc2-time-row-label">Gulika Kalam</div>
                              </div>
                              <span className="pc2-time-row-value">{pcData.gulika_kalam}</span>
                            </div>
                            {pcData.durmuhurtha?.map((dm: any, i: number) => (
                              <div key={i} className="pc2-time-row">
                                <div className="pc2-time-row-icon" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                                  <Hourglass size={14} strokeWidth={1.8} />
                                </div>
                                <div className="pc2-time-row-body">
                                  <div className="pc2-time-row-label">{t(`Durmuhurtha ${i + 1}`, `దుర్ముహూర్తం ${i + 1}`)}</div>
                                </div>
                                <span className="pc2-time-row-value">{dm.start} – {dm.end}</span>
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
                                <span className="pc2-time-row-value">{pcData.varjyam}</span>
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
                                  <span className="pc2-time-row-value">{pcData.gulika_kalam_night}</span>
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
                          <div className="pc-half-grid">
                            {([
                              { isDay: true,  color: "#fbbf24", title: t("Day", "పగలు"),  sub: t("Sunrise", "సూర్యోదయం"), subTime: pcData.sunrise, Icon: Sun },
                              { isDay: false, color: "#93c5fd", title: t("Night", "రాత్రి"), sub: t("Sunset", "సూర్యాస్తమయం"), subTime: pcData.sunset, Icon: Moon },
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
                                    return (
                                      <div key={i}
                                        className={`pc2-chog-row${c.is_current ? " is-current" : ""}`}
                                        style={{
                                          background: c.is_current ? `${qColor}14` : "transparent",
                                          borderColor: c.is_current ? `${qColor}55` : "transparent",
                                        }}>
                                        <span className="pc2-chog-dot" style={{ background: qColor }} />
                                        <span className="pc2-chog-name" style={{ color: c.is_current ? qColor : "var(--text)", fontWeight: c.is_current ? 700 : 500 }}>{c.name}</span>
                                        <span className="pc2-chog-time">{c.start}–{c.end}</span>
                                        {c.is_current && (
                                          <span className="pc2-chog-active-badge" style={{ background: `${qColor}20`, color: qColor, border: `0.5px solid ${qColor}55` }}>
                                            {t("ACTIVE", "ఇప్పుడు")}
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
                  {/* Page hero — sets the "this is an oracle" tone consistent with
                      Horary (PR13/14) and Houses (PR11). Always visible above the
                      wizard regardless of step. */}
                  <header style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, fontWeight: 600 }}>
                      {t("Auspicious Timing", "శుభ ముహూర్తం")}
                    </div>
                    <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, margin: 0, lineHeight: 1.15, color: "var(--text)", letterSpacing: "-0.01em" }}>
                      {t("Muhurtha finder", "ముహూర్తం కనుగొను")}
                    </h1>
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 0", maxWidth: 620, lineHeight: 1.55 }}>
                      {t(
                        "Scans every 4 minutes of your date range. Scores each Lagna Sub-Lord against event-specific house requirements plus Badhaka, Moon SL, and Panchang.",
                        "మీ ఎంచుకున్న తేదీల పరిధిని ప్రతి 4 నిమిషాలకు స్కాన్ చేస్తుంది. ప్రతి లగ్న సబ్‌లార్డ్‌ని ఈవెంట్‌కి తగిన భావాలు + బాధక + చంద్ర SL + పంచాంగంతో స్కోర్ చేస్తుంది."
                      )}
                    </p>
                  </header>

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
                            <button onClick={() => setMShowAddParticipant(true)}
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
                                    type="text"
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
                                      type="text"
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
                                {mResults.soft_flagged_windows.slice(0, 25).map((sw: any, i: number) => (
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
                                        Lagna {sw.lagna} · SL {sw.lagna_sublord} · Score {sw.score}
                                      </div>
                                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                                        {(sw.hard_rejected_for || []).map((r: string, ri: number) => (
                                          <span
                                            key={ri}
                                            style={{
                                              fontSize: 10,
                                              padding: "2px 8px",
                                              borderRadius: 4,
                                              background: "rgba(248,113,113,0.12)",
                                              color: "#f87171",
                                              border: "0.5px solid rgba(248,113,113,0.25)",
                                            }}
                                          >
                                            {r}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ))}
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
              {activeTab === "match" && (() => {
                // Person 1 is always the current chart
                const matchPerson1 = workspaceData ? snapshotCurrentSession() : null;
                const canAddP2     = !!(mNewP.name && mNewP.date && mNewP.time);
                return (
                <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 1020 }}>

                  {/* Page hero — consistent with Horary / Muhurtha / Panchang (PR14-16). */}
                  <header className="match-header">
                    <div className="match-header-eyebrow">
                      <Heart size={12} strokeWidth={1.8} />
                      {t("KP + Ashtakoota compatibility", "KP + అష్టకూట సరిపోలన")}
                    </div>
                    <h1 className="match-header-title">{t("Marriage match", "వివాహ సరిపోలన")}</h1>
                    <p className="match-header-sub">
                      {t(
                        "Combines KP 7th-cusp sub-lord analysis, Venus karaka, Dasha-Bhukti timing, D9 Navamsa, Kuja Dosha, and the 36-gun Ashtakoota into a single compatibility verdict.",
                        "KP 7-భావ సబ్ లార్డ్, శుక్ర కారక, దశా-భుక్తి సమయం, D9 నవాంశ, కుజ దోష, 36-గుణ అష్టకూటను కలిపి ఒకే సరిపోలన నిర్ణయంగా మార్చుతుంది."
                      )}
                    </p>
                  </header>

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
                              <button onClick={() => setMatchPerson2Inline(true)}
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
                                  <input type="text" placeholder="DD/MM/YYYY" maxLength={10} value={mNewP.date}
                                    onChange={e => handleMNewPDateChange(e.target.value)}
                                    className={`pf-input${mNewP.date ? " filled" : ""}`} />
                                </div>
                                <div>
                                  <div className="pf-field-label"><Clock size={10} strokeWidth={2} /> {t("Time of birth", "పుట్టిన సమయం")}</div>
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <input type="text" placeholder="HH:MM" maxLength={5} value={mNewP.time}
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
                            <svg width={84} height={84} viewBox="0 0 84 84">
                              <circle cx={42} cy={42} r={34} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
                              <circle cx={42} cy={42} r={34} fill="none" stroke={verdictColor} strokeWidth={8}
                                strokeDasharray={`${((ast?.total_score ?? 0)/(ast?.max_score ?? 36)) * 213.6} 213.6`}
                                strokeLinecap="round" strokeDashoffset={53.4}
                                style={{ filter: `drop-shadow(0 0 8px ${verdictColor}60)` }} />
                              <text x={42} y={44} textAnchor="middle" className="match-score-donut-num" fontSize={18} fill={verdictColor}>{ast?.total_score ?? "?"}</text>
                              <text x={42} y={58} textAnchor="middle" fontSize={9} fill="var(--muted)">/{ast?.max_score ?? 36}</text>
                            </svg>
                            <div className="match-verdict-word" style={{ color: verdictColor }}>
                              {r.overall_verdict}
                            </div>
                            <div style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                              <span>KP</span>
                              <span style={{ color: verdictColor, fontWeight: 600, textTransform: "none" as const, letterSpacing: "0.02em" }}>{kp?.kp_verdict}</span>
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
                            {[{p: kp?.chart1_promise, name: r.person1?.name}, {p: kp?.chart2_promise, name: r.person2?.name}].map((item, i) => item.p && (
                              <div key={i} className="match-tile" style={{ borderColor: item.p.has_promise && !item.p.has_denial ? "rgba(74,222,128,0.3)" : item.p.has_denial ? "rgba(248,113,113,0.3)" : "var(--border)" }}>
                                <div className="match-tile-name">{item.name}</div>
                                <div className="match-tile-primary" style={{ color: item.p.has_promise && !item.p.has_denial ? "#4ade80" : item.p.has_denial ? "#f87171" : "var(--accent)" }}>
                                  H7 CSL: {item.p.sub_lord} — {item.p.verdict}
                                </div>
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
                        <div className="match-subtab-pane">

                        {/* ═══ ASHTAKOOTA — 36 Gun ═══ */}
                        <div className="match-section">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                            <div className="match-section-title" style={{ marginBottom: 0 }}>
                              <Sparkles size={12} strokeWidth={1.8} />
                              {t("Ashtakoota · 36 Gun", "అష్టకూట · 36 గుణ")}
                            </div>
                            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, lineHeight: 1, color: ast?.total_score >= 25 ? "var(--accent)" : ast?.total_score >= 18 ? "#4ade80" : "#f87171", letterSpacing: "-0.02em" }}>
                              {ast?.total_score}<span style={{ fontSize: 14, color: "var(--muted)", marginLeft: 2 }}>/{ast?.max_score}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                            {(ast?.kutas || []).map((k: any, i: number) => {
                              const pct = k.max > 0 ? (k.score / k.max) * 100 : 0;
                              const barColor = k.score === 0 ? "#f87171" : k.score >= k.max * 0.6 ? "#4ade80" : "var(--accent)";
                              return (
                                <div key={i} title={k.note || ""} className={`match-ashta-row${k.score === 0 ? " is-zero" : ""}`}>
                                  <div className="match-ashta-label">{k.kuta}</div>
                                  <div className="match-ashta-bar-wrap">
                                    <div className="match-ashta-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}80 0%, ${barColor} 100%)`, boxShadow: k.score >= k.max * 0.6 ? `0 0 8px ${barColor}50` : "none" }} />
                                  </div>
                                  <div className="match-ashta-score" style={{ color: barColor }}>{k.score}/{k.max}</div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginTop: 14 }}>
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
              })()}

              {/* KP HORARY / PRASHNA */}
              {activeTab === "horary" && (
                <div className="tab-content">
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>

                    {/* Page header (ported from developv2 — gives this tab a proper title) */}
                    {!horaryResult && (
                      <header style={{ marginBottom: 2 }}>
                        <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, fontWeight: 600 }}>
                          {t("Krishnamurti Paddhati · 1–249", "కృష్ణమూర్తి పద్ధతి · 1–249")}
                        </div>
                        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, margin: 0, lineHeight: 1.15, color: "var(--text)", letterSpacing: "-0.01em" }}>
                          {t("Horary · Prashna", "హోరరీ · ప్రశ్న")}
                        </h1>
                        <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 0", maxWidth: 600, lineHeight: 1.55 }}>
                          {t(
                            "Ask a question, pick a number between 1 and 249, get a YES/NO verdict based on Lagna Sub-Lord + topic cusp CSL + Ruling Planets confirmation.",
                            "ఒక ప్రశ్న అడగండి, 1–249 మధ్య సంఖ్య ఎంచుకోండి. లగ్న సబ్‌లార్డ్ + భావ CSL + నియమిత గ్రహాలతో YES/NO నిర్ణయం పొందండి."
                          )}
                        </p>
                        {/* PR A1.1 — live location pill; astrologer can override */}
                        <div style={{ marginTop: 10 }}>
                          <LiveLocationPill
                            location={liveLoc.location}
                            status={liveLoc.status}
                            error={liveLoc.error}
                            onOverride={liveLoc.override}
                            onRefresh={liveLoc.refresh}
                          />
                        </div>
                      </header>
                    )}

                    {!horaryResult ? (
                      <>
                        {/* Hero question card */}
                        <div style={{ background: "var(--surface2)", border: "0.5px solid rgba(201,169,110,0.25)", borderRadius: 14, padding: "20px 20px 16px", position: "relative" as const, overflow: "hidden" }}>
                          <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, rgba(201,169,110,0.4), transparent)" }} />
                          <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
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
                          {/* Topic chips — lucide icons + en/te labels */}
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginTop: 10 }}>
                            {[
                              { id: "general",   Icon: Globe,       en: "General",    te: "సాధారణ" },
                              { id: "marriage",  Icon: HandHeart,   en: "Marriage",   te: "వివాహం" },
                              { id: "career",    Icon: Briefcase,   en: "Career",     te: "ఉద్యోగం" },
                              { id: "health",    Icon: HeartPulse,  en: "Health",     te: "ఆరోగ్యం" },
                              { id: "property",  Icon: HomeIcon,    en: "Property",   te: "ఆస్తి" },
                              { id: "finance",   Icon: Wallet,      en: "Finance",    te: "ధనం" },
                              { id: "children",  Icon: Baby,        en: "Children",   te: "సంతానం" },
                              { id: "travel",    Icon: Plane,       en: "Travel",     te: "ప్రయాణం" },
                              { id: "education", Icon: BookOpen,    en: "Education",  te: "విద్య" },
                              { id: "legal",     Icon: Scale,       en: "Legal",      te: "న్యాయం" },
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
                        <div style={{ background: "var(--surface2)", border: "0.5px solid rgba(201,169,110,0.18)", borderRadius: 14, padding: "28px 24px", textAlign: "center" as const }}>
                          <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, fontWeight: 600 }}>
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

                          {/* PR A1.1b — real draggable slider (was decorative). */}
                          <div className="horary-slider-row">
                            <span className="horary-slider-end">1</span>
                            <input
                              type="range"
                              min={1}
                              max={249}
                              step={1}
                              value={typeof horaryNumber === "number" ? horaryNumber : 1}
                              onChange={e => setHoraryNumber(parseInt(e.target.value, 10))}
                              className="horary-slider"
                              aria-label={t("Prashna number slider", "ప్రశ్న సంఖ్య స్లైడర్")}
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
                                    setHoraryNumber(finalN);
                                    setTimeout(() => setHoraryDiceSpin(false), 200);
                                    return;
                                  }
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
                                  alert(t(
                                    "We need your current location for KP Ruling Planets. Please enable geolocation or pick your city in the Location pill above.",
                                    "KP నియమ గ్రహాల కోసం మీ ప్రస్తుత ప్రదేశం అవసరం. దయచేసి లొకేషన్ అనుమతించండి లేదా పైన మీ నగరం ఎంచుకోండి."
                                  ));
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
                                } catch { setHoraryResult(null); }
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
                        <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
                          <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8, fontWeight: 600 }}>
                            {t("How KP Horary works", "KP హోరరీ ఎలా పనిచేస్తుంది")}
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
                          <div style={{ padding: "10px 14px", background: "rgba(201,169,110,0.06)", border: "0.5px solid rgba(201,169,110,0.2)", borderRadius: 8, fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                            "{horaryQuestion}" <span style={{ color: "var(--accent)", fontStyle: "normal" }}>#{r.prashna_number}</span>
                          </div>

                          {/* Verdict hero — serif word, fade+scale entrance, radial glow.
                              This is the moment of the whole tab. */}
                          <div
                            className="horary-verdict-card"
                            style={{
                              textAlign: "center" as const,
                              padding: "36px 20px 28px",
                              background: `radial-gradient(ellipse at 50% 0%, ${verdictColor}22 0%, transparent 70%), var(--surface2)`,
                              border: `1px solid ${verdictColor}40`,
                              borderRadius: 16,
                              position: "relative" as const,
                              boxShadow: `0 30px 60px -30px ${verdictColor}40, 0 0 0 1px ${verdictColor}10 inset`,
                              overflow: "hidden" as const,
                            }}
                          >
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 20, lineHeight: 1 }}>
                              <VerdictIcon size={52} strokeWidth={1.6} color={verdictColor} />
                              <div
                                className="horary-verdict-word"
                                style={{
                                  color: verdictColor,
                                  textShadow: `0 0 48px ${verdictColor}60, 0 0 96px ${verdictColor}30`,
                                }}
                              >
                                {v.verdict || "MAYBE"}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, marginBottom: 12 }}>
                              <span style={{ fontSize: 13, color: confColor, fontWeight: 700, letterSpacing: "0.1em" }}>
                                {v.confidence === "HIGH" ? "●●●" : v.confidence === "MEDIUM" ? "●●○" : "●○○"}
                              </span>
                              <span style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, fontWeight: 500 }}>
                                {v.confidence || "LOW"} {t("CONFIDENCE", "విశ్వాసం")}
                              </span>
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
                                {/* PR A1.1 — muted strip showing WHICH location + moment produced these RPs. */}
                                {r.rp_context && (
                                  <div style={{ maxWidth: 560, margin: "8px auto 0" }}>
                                    <RPContextStrip ctx={r.rp_context} locationName={liveLoc.location?.display} />
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
                                <span style={{ textTransform: "capitalize" as const }}>{r.topic}</span>
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
                          </div>

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
              )}

              {/* ANALYSIS — chat bubble design + quick insights */}
              {activeTab === "analysis" && (
                <div className="tab-content" style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
                  {/* Topics — full grid before chat starts, compact horizontal strip after */}
                  <div style={{ marginBottom: "0.75rem", flexShrink: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
                        {analysisMessages.length > 0 ? `Topics · ${activeTopic ? TOPICS.find(t => t.id === activeTopic)?.te || activeTopic : "switch anytime"}` : "Topics"}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {analysisMessages.length > 0 && (
                          <button onClick={() => { setAnalysisMessages([]); setActiveTopic(""); }} style={{ background: "transparent", border: "0.5px solid var(--border2)", borderRadius: 4, padding: "3px 10px", fontSize: 11, color: "var(--muted)", cursor: "pointer" }}>{t("Clear", "క్లియర్")}</button>
                        )}
                        <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 6, border: "0.5px solid var(--border2)", overflow: "hidden" }}>
                          {([["english", "EN"], ["telugu_english", "తె+EN"]] as const).map(([val, label]) => (
                            <button key={val} onClick={() => setAnalysisLang(val)} style={{ padding: "4px 10px", background: analysisLang === val ? "rgba(201,169,110,0.15)" : "transparent", color: analysisLang === val ? "var(--accent)" : "var(--muted)", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>{label}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Before chat starts: full 4×2 grid */}
                    {analysisMessages.length === 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                        {TOPICS.map(tp => (
                          <button key={tp.id} onClick={() => handleTopicAnalysis(tp.id)} disabled={analysisLoading}
                            style={{ padding: "10px 6px", borderRadius: 10, border: `0.5px solid ${activeTopic === tp.id ? "var(--accent)" : "var(--border2)"}`, background: activeTopic === tp.id ? "rgba(201,169,110,0.15)" : "var(--card)", cursor: analysisLoading ? "default" : "pointer", fontFamily: "inherit", textAlign: "center", transition: "all 0.2s" }}
                            onMouseEnter={e => { if (activeTopic !== tp.id) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,169,110,0.4)"; }}
                            onMouseLeave={e => { if (activeTopic !== tp.id) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border2)"; }}>
                            <div style={{ fontSize: 22, marginBottom: 4 }}>{TOPIC_EMOJI[tp.id]}</div>
                            <div style={{ fontSize: 11, color: activeTopic === tp.id ? "var(--accent)" : "var(--text)", fontWeight: activeTopic === tp.id ? 500 : 400 }}>{tp.te}</div>
                            {quickInsights[tp.id] && (
                              <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 4, lineHeight: 1.4, textAlign: "left" }}>
                                {quickInsights[tp.id].split("\n")[0]?.slice(0, 60)}…
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      // Once chat is active: compact horizontal topic strip
                      <div className="topic-strip">
                        {TOPICS.map(tp => (
                          <button key={tp.id} onClick={() => handleTopicAnalysis(tp.id)} disabled={analysisLoading}
                            className={`topic-chip ${activeTopic === tp.id ? "active" : ""}`}>
                            <span style={{ fontSize: 14 }}>{TOPIC_EMOJI[tp.id]}</span>
                            <span>{tp.te}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Chat messages — bubble style */}
                  <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingRight: 2 }}>
                    {analysisMessages.length === 0 && !analysisLoading && (
                      <div style={{ textAlign: "center", padding: "2.25rem 1rem 1.25rem" }}>
                        <div style={{ fontSize: 32, marginBottom: 10, color: "var(--accent)", opacity: 0.7 }}>↑</div>
                        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 4 }}>{t("Pick a topic above", "పై నుండి అంశాన్ని ఎంచుకోండి")}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", opacity: 0.6, marginBottom: 18 }}>{t("or type your question below", "లేదా మీ ప్రశ్నను క్రింద టైప్ చేయండి")}</div>
                        {/* Suggested starter questions */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 520, margin: "0 auto" }}>
                          {[
                            { en: "When will I get married?", te: "నాకు వివాహం ఎప్పుడు?" },
                            { en: "What career suits my chart?", te: "నా చార్ట్‌కు ఏ కెరీర్ సరిపోతుంది?" },
                            { en: "Tell me about my personality", te: "నా వ్యక్తిత్వం గురించి చెప్పండి" },
                            { en: "Should I move abroad?", te: "నేను విదేశాలకు వెళ్లాలా?" },
                          ].map((q, i) => (
                            <button key={i}
                              onClick={() => { setChatQ(t(q.en, q.te)); }}
                              className="followup-chip">
                              {t(q.en, q.te)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysisMessages.map((msg, i) => (
                      <div key={i} style={{ marginBottom: "1.25rem" }} className="fade-in">
                        {/* User question bubble — right aligned */}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                          <div className="chat-bubble-user" style={{ padding: "8px 14px", maxWidth: "72%", fontSize: 12, color: "#d0d0d8", lineHeight: 1.5 }}>
                            {msg.isTopic && <span style={{ fontSize: 9, color: "var(--accent)", display: "block", marginBottom: 2 }}>◈ {t("Topic Analysis", "అంశ విశ్లేషణ")}</span>}
                            {msg.q}
                          </div>
                        </div>
                        {/* AI answer bubble — left aligned, with avatar dot + copy button */}
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div className="chat-ai-dot" title="DevAstroAI">D</div>
                          <div className="chat-bubble-ai md-body" style={{ padding: "1rem 1.25rem", maxWidth: "calc(94% - 34px)", flex: 1 }}>
                            <button
                              className="copy-btn"
                              data-copy-id={`copy-${i}`}
                              onClick={(e) => {
                                navigator.clipboard.writeText(msg.a);
                                const btn = e.currentTarget as HTMLButtonElement;
                                btn.textContent = "✓ Copied";
                                btn.classList.add("copied");
                                setTimeout(() => {
                                  btn.textContent = "Copy";
                                  btn.classList.remove("copied");
                                }, 1500);
                              }}
                            >Copy</button>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.a}</ReactMarkdown>
                            {/* Suggested follow-up chips on the LATEST AI message only */}
                            {i === analysisMessages.length - 1 && !analysisLoading && (
                              <div className="followup-chips">
                                {[
                                  { en: "When exactly within this window?", te: "ఈ విండోలో సరిగ్గా ఎప్పుడు?" },
                                  { en: "Show timing in plain English", te: "సాధారణ భాషలో సమయం చూపించండి" },
                                  { en: "What should I do now?", te: "ఇప్పుడు నేను ఏమి చేయాలి?" },
                                ].map((q, j) => (
                                  <button key={j}
                                    onClick={() => { setChatQ(t(q.en, q.te)); }}
                                    className="followup-chip">
                                    {t(q.en, q.te)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {analysisLoading && (
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "0.5rem 0" }}>
                        <div className="chat-ai-dot">D</div>
                        <div className="chat-bubble-ai" style={{ padding: "0.85rem 1.1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 12 }}>
                            <span className="typing-dots"><span /><span /><span /></span>
                            <span>{activeTopic ? t(`Analyzing ${TOPICS.find(tp => tp.id === activeTopic)?.te || activeTopic}…`, `${TOPICS.find(tp => tp.id === activeTopic)?.te || activeTopic} విశ్లేషిస్తున్నాను…`) : t("Thinking…", "ఆలోచిస్తున్నాను…")}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>
              )}
            </div>

            {/* Chat input (workspace-level — visible on every tab except
                Horary and Panchang, where it would misleadingly route to
                Analysis AI which doesn't know about those tabs' data.
                PR A1.1b hid it on Horary, PR A1.2b extends to Panchang.
                Per-tab Ask AI will replace it in a future PR. */}
            {activeTab !== "horary" && activeTab !== "panchang" && (
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
    </div>
  );
}

/**
 * Bilingual section eyebrow — big Telugu line with a subtle English
 * subtitle underneath, gold tinted. Used at the top of every workspace
 * section so astrologers scanning the page always see the primary
 * Telugu label first with English as secondary support.
 */
function SectionEyebrow({
  te,
  en,
  noMarginBottom,
}: {
  te: string;
  en?: string;
  noMarginBottom?: boolean;
}) {
  // Hook call is safe inside a component; this reads the shared language.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { lang } = useLanguage();
  // EN mode: English primary (drop Telugu entirely).
  // TE mode: Telugu primary (drop English subtitle).
  // TE+EN: Telugu primary + English subtitle (default).
  const primary = lang === "en" ? (en ?? te) : te;
  const showSubtitle = lang === "te_en" && en;
  return (
    <div style={{ marginBottom: noMarginBottom ? 0 : 10 }}>
      <div
        style={{
          fontSize: 11,
          color: "#c9a96e",
          letterSpacing: "0.08em",
          fontWeight: 600,
          lineHeight: 1.3,
        }}
      >
        {primary}
      </div>
      {showSubtitle && (
        <div
          style={{
            fontSize: 9,
            color: "var(--muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            fontWeight: 500,
            marginTop: 2,
          }}
        >
          {en}
        </div>
      )}
    </div>
  );
}

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
