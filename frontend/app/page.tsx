"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import remarkGfm from "remark-gfm";
import axios from "axios";
import { ArrowRight, Loader2, CheckCircle, XCircle, MessageCircle, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { PLANET_COLORS } from "./components/constants";
import SouthIndianChart from "./components/SouthIndianChart";
import DashaTimeline from "./components/DashaTimeline";
import PanchangamCard from "./components/PanchangamCard";
import PromiseBadge from "./components/PromiseBadge";
import HousePanel from "./components/HousePanel";
import type { PlaceSuggestion, BirthDetails, Message, ChartSession } from "./types";

const API_URL = "https://devastroai.up.railway.app";

// ── Main Component ────────────────────────────────────────────
export default function Home() {
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
  // Muhurtha wizard state
  const [mStep, setMStep] = useState<1 | 2 | 3>(1);
  const [mEventType, setMEventType] = useState("");
  const [mDateStart, setMDateStart] = useState("");
  const [mDateEnd, setMDateEnd] = useState("");
  const [mLoading, setMLoading] = useState(false);
  const [mResults, setMResults] = useState<any>(null);
  const [mParticipants, setMParticipants] = useState<ChartSession[]>([]);
  const [mShowAddParticipant, setMShowAddParticipant] = useState(false);
  // Inline participant mini-form (shared between muhurtha and match)
  const [mNewP, setMNewP] = useState({ name: "", date: "", time: "", ampm: "AM" as "AM"|"PM", place: "", latitude: 17.385, longitude: 78.4867, gender: "" as "male"|"female"|"" });
  const [mNewPPlaceSugg, setMNewPPlaceSugg] = useState<PlaceSuggestion[]>([]);
  const [mNewPPlaceStatus, setMNewPPlaceStatus] = useState<"idle"|"searching"|"done">("idle");
  const mNewPSearchRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  // Marriage match state
  const [matchPerson2Inline, setMatchPerson2Inline] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResults, setMatchResults] = useState<any>(null);
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
  const [horaryQuestion, setHoraryQuestion] = useState("");
  const [horaryTopic, setHoraryTopic] = useState("general");
  const [horaryResult, setHoraryResult] = useState<any>(null);
  const [horaryLoading, setHoraryLoading] = useState(false);
  // New UI state vars
  const [housesSubTab, setHousesSubTab] = useState<"cusps"|"sigs"|"ruling"|"panchang">("cusps");
  const [chartView, setChartView] = useState<"chart"|"planets">("chart");
  const [showTransitInDasha, setShowTransitInDasha] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const placeSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [analysisMessages]);
  // Clear shared inline form state when switching tabs to prevent cross-tab data leakage
  useEffect(() => {
    setMNewP({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: 17.385, longitude: 78.4867, gender: "" });
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
      const res = await axios.get("https://nominatim.openstreetmap.org/search", { params: { q: query, format: "json", limit: 5, addressdetails: 1, countrycodes: "in", "accept-language": "en" }, headers: { "User-Agent": "DevAstroAI/1.0" } });
      let features = res.data;
      if (features.length === 0) {
        const g = await axios.get("https://nominatim.openstreetmap.org/search", { params: { q: query, format: "json", limit: 5, addressdetails: 1, "accept-language": "en" }, headers: { "User-Agent": "DevAstroAI/1.0" } });
        features = g.data;
      }
      const results: PlaceSuggestion[] = features.map((f: any) => {
        const addr = f.address || {};
        const parts = [addr.city || addr.town || addr.village || addr.county || f.display_name.split(",")[0], addr.state, addr.country].filter(Boolean);
        return { name: parts[0] || query, display: parts.join(", "), lat: parseFloat(f.lat), lon: parseFloat(f.lon) };
      });
      setSuggestions(results); setShowSuggestions(results.length > 0); setPlaceStatus(results.length > 0 ? "idle" : "error");
    } catch { setPlaceStatus("error"); }
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
  };

  const handleMNewPPlaceChange = (val: string) => {
    setMNewP(p => ({ ...p, place: val, latitude: 17.385, longitude: 78.4867 }));
    setMNewPPlaceStatus("idle"); setMNewPPlaceSugg([]);
    if (mNewPSearchRef.current) clearTimeout(mNewPSearchRef.current);
    if (val.length < 3) return;
    mNewPSearchRef.current = setTimeout(async () => {
      setMNewPPlaceStatus("searching");
      try {
        const res = await axios.get("https://nominatim.openstreetmap.org/search", { params: { q: val, format: "json", limit: 5, addressdetails: 1, countrycodes: "in", "accept-language": "en" }, headers: { "User-Agent": "DevAstroAI/1.0" } });
        let features = res.data;
        if (!features.length) {
          const g = await axios.get("https://nominatim.openstreetmap.org/search", { params: { q: val, format: "json", limit: 5, addressdetails: 1, "accept-language": "en" }, headers: { "User-Agent": "DevAstroAI/1.0" } });
          features = g.data;
        }
        const results: PlaceSuggestion[] = features.map((f: any) => {
          const addr = f.address || {};
          const parts = [addr.city || addr.town || addr.village || addr.county || f.display_name.split(",")[0], addr.state, addr.country].filter(Boolean);
          return { name: parts[0] || val, display: parts.join(", "), lat: parseFloat(f.lat), lon: parseFloat(f.lon) };
        });
        setMNewPPlaceSugg(results); setMNewPPlaceStatus("done");
      } catch { setMNewPPlaceStatus("idle"); }
    }, 400);
  };

  const handleManualCoords = () => {
    const lat = parseFloat(manualLat), lon = parseFloat(manualLon);
    if (isNaN(lat) || isNaN(lon)) return;
    setBirthDetails(prev => ({ ...prev, latitude: lat, longitude: lon }));
    setPlaceStatus("found"); setManualCoords(false);
  };

  const handleDateChange = (val: string) => {
    let v = val.replace(/\D/g, "");
    if (v.length >= 2) v = v.slice(0, 2) + "/" + v.slice(2);
    if (v.length >= 5) v = v.slice(0, 5) + "/" + v.slice(5);
    setBirthDetails(prev => ({ ...prev, date: v.slice(0, 10) }));
  };

  const handleTimeChange = (val: string) => {
    let v = val.replace(/\D/g, "");
    if (v.length >= 2) v = v.slice(0, 2) + ":" + v.slice(2);
    setBirthDetails(prev => ({ ...prev, time: v.slice(0, 5) }));
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
      timezone_offset: 5.5,
      gender: bd.gender || "",
    };
  };

  const handleSetup = async () => {
    if (!birthDetails.name || !birthDetails.date || !birthDetails.time) { alert("Please fill in name, date, and time of birth."); return; }
    if (!birthDetails.latitude || !birthDetails.longitude) { alert("Please select a place from the dropdown or enter coordinates manually."); return; }
    const formattedDate = getFormattedDate();
    if (!formattedDate) { alert("Please enter date as DD/MM/YYYY"); return; }

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
        const res = await axios.post(`${API_URL}/astrologer/workspace`, { name: birthDetails.name, date: formattedDate, time: getTime24(), latitude: birthDetails.latitude, longitude: birthDetails.longitude, timezone_offset: 5.5 });
        setWorkspaceData(res.data);
      } else {
        const res = await axios.post(`${API_URL}/chart/generate`, { name: birthDetails.name, date: formattedDate, time: getTime24(), latitude: birthDetails.latitude, longitude: birthDetails.longitude, timezone_offset: 5.5 });
        setChartData(res.data);
      }
      setSetupDone(true);
      setCurrentSessionId(prev => prev || Date.now().toString());
      if (mode === "astrologer") setShowLangModal(true);
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
    try {
      const res = await axios.post(`${API_URL}/prediction/ask`, {
        name: birthDetails.name, date: formattedDate, time: getTime24(),
        latitude: birthDetails.latitude, longitude: birthDetails.longitude,
        timezone_offset: 5.5, topic: "auto", question: currentQuestion, mode: "user",
        history: messages.slice(-4).map(m => ({ question: m.question, answer: m.answer }))
      });
      setMessages(prev => [...prev, { id: Date.now().toString(), question: currentQuestion, answer: res.data.answer, analysis: res.data.analysis, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } catch {
      setMessages(prev => [...prev, { id: Date.now().toString(), question: currentQuestion, answer: "Something went wrong. Please try again.", analysis: null, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } finally { setLoading(false); }
  };

  const handleTopicAnalysis = async (topic: string) => {
    if (!workspaceData) return;
    setActiveTopic(topic); setAnalysisLoading(true); setActiveTab("analysis");
    const formattedDate = getFormattedDate();
    const topicLabel = TOPICS.find(t => t.id === topic)?.te || topic;
    try {
      // Topic analysis always starts fresh — no prior history for the first message
      const res = await axios.post(`${API_URL}/astrologer/analyze`, { name: birthDetails.name, date: formattedDate, time: getTime24(), latitude: birthDetails.latitude, longitude: birthDetails.longitude, timezone_offset: 5.5, topic, question: `Complete KP analysis for ${topic}`, history: [], language: analysisLang });
      setAnalysisMessages(prev => [...prev, { q: `${topicLabel} — Full Analysis`, a: res.data.answer, isTopic: true }]);
    } catch {
      setAnalysisMessages(prev => [...prev, { q: topicLabel, a: "Analysis failed. Please try again.", isTopic: true }]);
    } finally { setAnalysisLoading(false); }
  };

  const handleWorkspaceChat = async () => {
    if (!chatQ.trim()) return;
    const q = chatQ; setChatQ(""); setAnalysisLoading(true); setActiveTab("analysis");
    const formattedDate = getFormattedDate();
    try {
      // CRITICAL FIX: pass ALL prior messages (including topic analysis) as history
      // This prevents the AI from repeating reasoning already given
      const history = analysisMessages.slice(-6).map(m => ({ question: m.q, answer: m.a }));
      const res = await axios.post(`${API_URL}/astrologer/analyze`, { name: birthDetails.name, date: formattedDate, time: getTime24(), latitude: birthDetails.latitude, longitude: birthDetails.longitude, timezone_offset: 5.5, topic: activeTopic || "general", question: q, history, language: analysisLang });
      setAnalysisMessages(prev => [...prev, { q, a: res.data.answer }]);
    } catch { } finally { setAnalysisLoading(false); }
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
    return { id: currentSessionId || Date.now().toString(), name: workspaceData.name, birthDetails: { ...birthDetails }, workspaceData, analysisMessages: [...analysisMessages], activeTopic, selectedHouse, chatQ, analysisLang, activeTab };
  };

  const handleNewChart = () => {
    const snap = snapshotCurrentSession();
    if (snap) {
      setSavedSessions(prev => {
        const idx = prev.findIndex(s => s.id === snap.id);
        return idx >= 0 ? prev.map((s, i) => i === idx ? snap : s) : [...prev, snap];
      });
    }
    setSetupDone(false); setWorkspaceData(null); setMessages([]); setChartData(null);
    setAnalysisMessages([]); setActiveTopic(""); setActiveTab("chart"); setSidebarOpen(true);
    setSelectedHouse(null); setChatQ(""); setCurrentSessionId("");
    setBirthDetails({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: null, longitude: null, gender: "" });
    setPlaceStatus("idle");
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

  const TABS = [
    { id: "chart", label: "చార్ట్", en: "Chart" },
    { id: "houses", label: "భావాలు", en: "Houses" },
    { id: "dasha", label: "దశ", en: "Dasha" },
    { id: "analysis", label: "విశ్లేషణ", en: "Analysis" },
    { id: "muhurtha", label: "ముహూర్త", en: "Muhurtha" },
    { id: "match", label: "సరిపోలన", en: "Match" },
    { id: "horary", label: "ప్రశ్న", en: "Horary" },
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
          .logo-subtitle { display: none !important; }
          .logo-title { font-size: 14px !important; }
        }
      `}</style>

      {/* Stars bg */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        {[...Array(80)].map((_, i) => (
          <div key={i} style={{ position: "absolute", width: "1px", height: "1px", background: "white", borderRadius: "50%", left: `${(i * 137.5) % 100}%`, top: `${(i * 97.3) % 100}%`, opacity: 0.06 + (i % 5) * 0.06 }} />
        ))}
      </div>

      {/* Nav */}
      <nav style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 2.5rem", borderBottom: "0.5px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: 14 }}>✦</div>
          <div>
            <div className="logo-title" style={{ fontFamily: "'DM Serif Display',serif", fontSize: 17, letterSpacing: "0.02em" }}>DevAstro<span style={{ color: "var(--accent)" }}>AI</span></div>
            <div className="logo-subtitle" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>KP Astrology Intelligence</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {setupDone && mode === "astrologer" && <span style={{ fontSize: 10, background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid rgba(201,169,110,0.35)", borderRadius: 20, padding: "3px 12px" }}>★ జ్యోతిష్కుడు మోడ్</span>}
          {setupDone && <button onClick={handleNewChart} style={{ background: "transparent", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "6px 16px", fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>New Chart</button>}
          {setupDone && savedSessions.length > 0 && (
            <button onClick={() => { if (window.confirm("All saved charts will be cleared. Continue?")) resetAll(); }} style={{ background: "transparent", border: "none", fontSize: 11, color: "var(--muted)", cursor: "pointer", opacity: 0.5 }}>🗑 Clear</button>
          )}
        </div>
      </nav>

      {/* ── SETUP SCREEN ── */}
      {!setupDone && (
        <main style={{ flex: 1, position: "relative", zIndex: 5, maxWidth: 760, margin: "0 auto", width: "100%", padding: "2rem 1.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ width: 30, height: "0.5px", background: "var(--accent)", display: "inline-block", opacity: 0.5 }} />Krishnamurti Paddhati System<span style={{ width: 30, height: "0.5px", background: "var(--accent)", display: "inline-block", opacity: 0.5 }} />
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(2rem,5vw,3.2rem)", lineHeight: 1.15, marginBottom: "1rem", background: "linear-gradient(135deg,#fff 0%,var(--accent2) 60%,var(--accent) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Ancient wisdom,<br /><em>precise answers</em>
            </h1>
            <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.7, maxWidth: 420, margin: "0 auto" }}>Enter your birth details. Our KP engine calculates your chart with Swiss Ephemeris precision.</p>
          </div>

          <div style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.75rem", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
              <span style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Birth Details</span>
            </div>
            <div style={{ padding: "1.75rem" }}>
              <div className="setup-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input type="text" placeholder="Your name" value={birthDetails.name} onChange={e => setBirthDetails(prev => ({ ...prev, name: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date of Birth</label>
                  <input type="text" placeholder="DD / MM / YYYY" value={birthDetails.date} onChange={e => handleDateChange(e.target.value)} maxLength={10} style={inputStyle} />
                </div>
              </div>
              <div className="setup-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={labelStyle}>Time of Birth</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="text" placeholder="HH : MM" value={birthDetails.time} onChange={e => handleTimeChange(e.target.value)} maxLength={5} style={{ ...inputStyle, flex: 1 }} />
                    <select value={birthDetails.ampm} onChange={e => setBirthDetails(prev => ({ ...prev, ampm: e.target.value }))} style={{ background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "var(--text)", outline: "none", cursor: "pointer" }}>
                      <option value="AM">AM</option><option value="PM">PM</option>
                    </select>
                  </div>
                </div>
                <div ref={suggestionsRef} style={{ position: "relative" }}>
                  <label style={labelStyle}>Place of Birth</label>
                  <div style={{ position: "relative" }}>
                    <input type="text" placeholder="Start typing your city..." value={birthDetails.place} onChange={e => handlePlaceChange(e.target.value)} onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      style={{ ...inputStyle, paddingRight: 36, border: `0.5px solid ${placeStatus === "found" ? "rgba(52,211,153,0.4)" : placeStatus === "error" ? "rgba(248,113,113,0.4)" : "var(--border2)"}` }} />
                    <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
                      {placeStatus === "loading" && <Loader2 size={14} style={{ color: "var(--muted)", animation: "spin 1s linear infinite" }} />}
                      {placeStatus === "found" && <CheckCircle size={14} style={{ color: "var(--green)" }} />}
                      {placeStatus === "error" && <XCircle size={14} style={{ color: "var(--red)" }} />}
                    </div>
                  </div>
                  {showSuggestions && suggestions.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 8, marginTop: 4, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                      {suggestions.map((s, i) => (
                        <div key={i} onClick={() => handleSelectPlace(s)} style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", color: "var(--text)", borderBottom: i < suggestions.length - 1 ? "0.5px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: 8 }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <MapPin size={12} style={{ color: "var(--accent)", flexShrink: 0 }} /><span>{s.display}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {placeStatus === "found" && birthDetails.latitude && <div style={{ fontSize: 10, color: "var(--green)", marginTop: 4 }}>✓ {birthDetails.latitude.toFixed(4)}°N, {birthDetails.longitude?.toFixed(4)}°E</div>}
                  {placeStatus === "error" && !manualCoords && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: "var(--red)" }}>Place not found.</span>
                      <button onClick={() => setManualCoords(true)} style={{ fontSize: 10, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Enter coordinates manually</button>
                    </div>
                  )}
                  {manualCoords && (
                    <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="text" placeholder="Lat" value={manualLat} onChange={e => setManualLat(e.target.value)} style={{ ...inputStyle, padding: "7px 10px", fontSize: 12, flex: 1 }} />
                      <input type="text" placeholder="Lon" value={manualLon} onChange={e => setManualLon(e.target.value)} style={{ ...inputStyle, padding: "7px 10px", fontSize: 12, flex: 1 }} />
                      <button onClick={handleManualCoords} style={{ background: "var(--accent)", color: "#09090f", border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Set</button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={labelStyle}>Gender</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["male", "female"] as const).map(g => (
                    <button key={g} onClick={() => setBirthDetails(prev => ({ ...prev, gender: g }))}
                      style={{ flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", border: `0.5px solid ${birthDetails.gender === g ? "var(--accent)" : "var(--border2)"}`, background: birthDetails.gender === g ? "rgba(201,169,110,0.1)" : "var(--surface2)", color: birthDetails.gender === g ? "var(--accent)" : "var(--muted)", fontSize: 13, fontFamily: "inherit", transition: "all 0.2s" }}>
                      {g === "male" ? "♂ Male" : "♀ Female"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={labelStyle}>I am a</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["user", "astrologer"] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", border: `0.5px solid ${mode === m ? "var(--accent)" : "var(--border2)"}`, background: mode === m ? "rgba(201,169,110,0.1)" : "var(--surface2)", color: mode === m ? "var(--accent)" : "var(--muted)", fontSize: 13, fontFamily: "inherit" }}>
                      {m === "user" ? "General User" : "KP Astrologer"}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleSetup} disabled={chartLoading} style={{ width: "100%", background: "var(--accent)", color: "#09090f", border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 500, cursor: chartLoading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: chartLoading ? 0.7 : 1, fontFamily: "inherit" }}>
                {chartLoading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />Calculating chart...</> : <>Generate My Chart <ArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ── ASTROLOGER WORKSPACE ── */}
      {/* Language preference modal */}
      {showLangModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(9,9,15,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 14, padding: "2rem", maxWidth: 360, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 22, color: "var(--accent)", marginBottom: "0.5rem" }}>◈</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, marginBottom: "0.5rem" }}>Analysis Language</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: "1.5rem", lineHeight: 1.6 }}>Choose how you want the AI analysis text to appear. Chart data (planet names, house labels) will always show in Telugu + English.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => { setAnalysisLang("english"); setShowLangModal(false); }} style={{ padding: "12px 20px", borderRadius: 8, border: "0.5px solid var(--border2)", background: "var(--surface2)", color: "var(--text)", cursor: "pointer", fontSize: 14, fontFamily: "inherit", textAlign: "left" }}>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>English only</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Best for analysis quality — AI reasoning stays focused</div>
              </button>
              <button onClick={() => { setAnalysisLang("telugu_english"); setShowLangModal(false); }} style={{ padding: "12px 20px", borderRadius: 8, border: "0.5px solid var(--border2)", background: "var(--surface2)", color: "var(--text)", cursor: "pointer", fontSize: 14, fontFamily: "inherit", textAlign: "left" }}>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>Telugu + English</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Mixed — technical terms in Telugu, explanations in English</div>
              </button>
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: "1rem" }}>You can change this anytime from the Analysis tab.</div>
          </div>
        </div>
      )}

      {setupDone && mode === "astrologer" && workspaceData && (
        <div className="workspace-layout" style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", zIndex: 5 }}>

          {/* Sidebar toggle — fixed to top-left on mobile, side on desktop */}
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            style={{
              position: "absolute",
              left: sidebarOpen ? 202 : 0,
              top: 12,
              zIndex: 30,
              background: "var(--surface)",
              border: "0.5px solid var(--border2)",
              borderLeft: sidebarOpen ? "none" : "0.5px solid var(--border2)",
              borderRadius: "0 6px 6px 0",
              padding: "6px 4px",
              cursor: "pointer",
              color: "var(--accent)",
              transition: "left 0.2s",
              display: "flex",
              alignItems: "center",
            }}
          >
            {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Sidebar */}
          {sidebarOpen && (
            <div className="workspace-sidebar" style={{ width: 210, borderRight: "0.5px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", overflow: "auto", flexShrink: 0, transition: "width 0.2s" }}>
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
                <button
                  disabled={pdfLoading}
                  onClick={async () => {
                    if (!workspaceData || pdfLoading) return;
                    setPdfLoading(true); setPdfError("");
                    try {
                      const res = await axios.post(`${API_URL}/pdf/export`, { workspace: workspaceData }, { responseType: "blob", timeout: 30000 });
                      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${workspaceData.name || "kp_chart"}_report.pdf`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (e: any) {
                      setPdfError(e?.response?.status === 500 ? "Server error — try again" : "Download failed");
                    }
                    setPdfLoading(false);
                  }}
                  style={{ marginTop: 8, width: "100%", padding: "5px 0", background: pdfLoading ? "rgba(201,169,110,0.04)" : "rgba(201,169,110,0.08)", border: "0.5px solid var(--border2)", borderRadius: 5, color: pdfLoading ? "var(--muted)" : "var(--accent)", fontSize: 11, cursor: pdfLoading ? "default" : "pointer", fontFamily: "inherit" }}
                >
                  {pdfLoading ? "డౌన్‌లోడ్ అవుతోంది..." : "PDF డౌన్‌లోడ్ ↓"}
                </button>
                {pdfError && <div style={{ fontSize: 10, color: "#f87171", marginTop: 3, textAlign: "center" as const }}>{pdfError}</div>}
              </div>
              <div className="sidebar-section" style={{ padding: "0.75rem 1rem", borderBottom: "0.5px solid var(--border)" }}>
                <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>పంచాంగం · ఇప్పుడు</div>
                {[{ l: "వారం", v: workspaceData.panchangam_today.vara }, { l: "తిథి", v: workspaceData.panchangam_today.tithi }, { l: "నక్షత్రం", v: workspaceData.panchangam_today.nakshatra }].map(item => (
                  <div key={item.l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>{item.l}</span>
                    <span style={{ fontSize: 11, color: "var(--text)" }}>{item.v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4, padding: "3px 8px", background: "rgba(248,113,113,0.1)", border: "0.5px solid rgba(248,113,113,0.2)", borderRadius: 4, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "#f87171" }}>రాహుకాలం</span>
                  <span style={{ fontSize: 10, color: "#f87171" }}>{workspaceData.panchangam_today.rahu_kalam}</span>
                </div>
              </div>
              <div className="sidebar-section" style={{ padding: "0.75rem 1rem", borderBottom: "0.5px solid var(--border)" }}>
                <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>దశ</div>
                <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{workspaceData.mahadasha.lord_te} మహాదశ</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>{workspaceData.mahadasha.start} → {workspaceData.mahadasha.end}</div>
                <div style={{ background: "rgba(201,169,110,0.08)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "6px 8px" }}>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>అంతర్దశ</div>
                  <div style={{ fontSize: 13, color: PLANET_COLORS[workspaceData.current_antardasha.lord_en] || "var(--accent2)", fontWeight: 500 }}>{workspaceData.current_antardasha.lord_te}</div>
                  <div style={{ fontSize: 9, color: "var(--muted)" }}>{workspaceData.current_antardasha.start} → {workspaceData.current_antardasha.end}</div>
                  {workspaceData.current_pratyantardasha && (
                    <div style={{ marginTop: 4, paddingTop: 4, borderTop: "0.5px solid var(--border)" }}>
                      <div style={{ fontSize: 9, color: "var(--muted)" }}>ప్రత్యంతర్దశ</div>
                      <div style={{ fontSize: 12, color: PLANET_COLORS[workspaceData.current_pratyantardasha.lord_en] || "var(--text)", fontWeight: 500 }}>{workspaceData.current_pratyantardasha.lord_te}</div>
                      <div style={{ fontSize: 9, color: "var(--muted)" }}>{workspaceData.current_pratyantardasha.start} → {workspaceData.current_pratyantardasha.end}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="sidebar-section" style={{ padding: "0.75rem 1rem", flex: 1 }}>
                <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>రూలింగ్ గ్రహాలు</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {workspaceData.ruling_planets.all_te.map((p: string, i: number) => (
                    <span key={i} style={{ fontSize: 11, background: `${PLANET_COLORS[workspaceData.ruling_planets.all_en[i]] || "var(--accent)"}15`, color: PLANET_COLORS[workspaceData.ruling_planets.all_en[i]] || "var(--accent)", border: `0.5px solid ${PLANET_COLORS[workspaceData.ruling_planets.all_en[i]] || "var(--accent)"}30`, borderRadius: 4, padding: "2px 8px" }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="workspace-main" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
            {/* Tabs */}
            <div className="tab-bar" style={{ display: "flex", borderBottom: "0.5px solid var(--border)", background: "var(--surface)", overflowX: "auto", flexShrink: 0 }}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: "0.75rem 1rem", background: "transparent", border: "none", borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent", color: activeTab === tab.id ? "var(--accent)" : "var(--muted)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0 }}>
                  <div>{tab.label}</div><div style={{ fontSize: 9, opacity: 0.6 }}>{tab.en}</div>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>

              {/* CHART */}
              {activeTab === "chart" && (
                <div className="tab-content">
                  {/* Chart/Planets toggle */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    {[{v:"chart",l:"⊞ Chart"},{v:"planets",l:"≡ Planets"}].map(opt => (
                      <button key={opt.v} onClick={() => setChartView(opt.v as "chart"|"planets")}
                        style={{ padding: "5px 14px", borderRadius: 20, border: `0.5px solid ${chartView === opt.v ? "var(--accent)" : "var(--border2)"}`, background: chartView === opt.v ? "rgba(201,169,110,0.12)" : "transparent", color: chartView === opt.v ? "var(--accent)" : "var(--muted)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                  {chartView === "chart" && (
                    <div style={{ display: "flex", gap: "1.5rem", alignItems: "start", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.6rem" }}>దక్షిణ భారత చార్ట్</div>
                        <SouthIndianChart
                          planets={workspaceData.planets}
                          cusps={workspaceData.cusps}
                          onHouseClick={h => setSelectedHouse(prev => prev === h ? null : h)}
                          selectedHouse={selectedHouse}
                        />
                        <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 6, textAlign: "center" }}>Tap a house for details · ↑ = Lagna</div>
                      </div>
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
                      {!selectedHouse && <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.75rem" }}>గ్రహ స్థానాలు</div>
                        {workspaceData.planets.map((p: any) => (
                          <div key={p.planet_en} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: "var(--surface2)", borderRadius: 6, border: "0.5px solid var(--border)", marginBottom: 3 }}>
                            <span style={{ width: 60, fontSize: 12, fontWeight: 600, color: PLANET_COLORS[p.planet_en] }}>{p.planet_te}</span>
                            <span style={{ fontSize: 11, color: "var(--text)", flex: 1 }}>{p.sign_te}</span>
                            <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, minWidth: 28 }}>H{p.house}</span>
                            <span style={{ fontSize: 10, color: "var(--muted)" }}>{p.degree_in_sign.toFixed(1)}°</span>
                            {p.retrograde && <span style={{ fontSize: 9, color: "var(--red)" }}>℞</span>}
                          </div>
                        ))}
                      </div>}
                    </div>
                  )}
                  {chartView === "planets" && (
                    <div style={{ overflowX: "auto" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>గ్రహ స్థాన పట్టిక · KP పద్ధతి</div>
                        <div style={{ fontSize: 9, color: "var(--muted)" }}>Click H badge → jump to chart</div>
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
                        <thead><tr>{["గ్రహం", "భావం", "రాశి", "అంశం", "నక్షత్రం", "నక్షత్రాధిపతి", "సబ్ లార్డ్"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", borderBottom: "0.5px solid var(--border)", fontWeight: 400, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
                        <tbody>
                          {workspaceData.planets.map((p: any) => (
                            <tr key={p.planet_en} style={{ borderBottom: "0.5px solid rgba(201,169,110,.06)", cursor: "default" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,169,110,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <td style={{ padding: "9px 10px", color: PLANET_COLORS[p.planet_en], fontWeight: 600, whiteSpace: "nowrap" }}>{p.planet_te} {p.retrograde && <span style={{ fontSize: 9, color: "var(--red)" }}>℞</span>}</td>
                              <td style={{ padding: "9px 10px" }}>
                                <span onClick={() => { setSelectedHouse(parseInt(p.house)); setChartView("chart"); }} title="Click to open house panel in Chart tab" style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>H{p.house}</span>
                              </td>
                              <td style={{ padding: "9px 10px", color: "var(--text)" }}>{p.sign_te}</td>
                              <td style={{ padding: "9px 10px", color: "var(--muted)", fontSize: 11 }}>{p.degree_in_sign.toFixed(2)}°</td>
                              <td style={{ padding: "9px 10px", color: "var(--text)" }}>{p.nakshatra_te}</td>
                              <td style={{ padding: "9px 10px", color: PLANET_COLORS[p.star_lord_en] || "var(--text)" }}>{p.star_lord_te}</td>
                              <td style={{ padding: "9px 10px" }}>
                                <span onClick={() => { const houseOfSub = workspaceData.cusps.findIndex((c: any) => c.sub_lord_en === p.sub_lord_en || c.star_lord_en === p.sub_lord_en); if (houseOfSub >= 0) { setSelectedHouse(houseOfSub + 1); setChartView("chart"); } }} title="Click to explore sub lord's house" style={{ background: "rgba(201,169,110,.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>{p.sub_lord_te}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* HOUSES — consolidated tab with sub-tabs */}
              {activeTab === "houses" && (
                <div className="tab-content" style={{ padding: "1rem", height: "100%", overflowY: "auto" }}>
                  {!workspaceData ? (
                    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                      <div style={{ fontSize: 14, color: "var(--muted)" }}>పైన చార్ట్ లోడ్ చేయండి</div>
                    </div>
                  ) : (
                    <>
                      {/* Sub-tab pill switcher */}
                      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                        {[{id:"cusps",en:"Cusps"},{id:"sigs",en:"Significators"},{id:"ruling",en:"Ruling"},{id:"panchang",en:"Panchangam"}].map(st => (
                          <button key={st.id} onClick={() => setHousesSubTab(st.id as any)}
                            style={{ padding: "5px 14px", borderRadius: 20, border: `0.5px solid ${housesSubTab === st.id ? "var(--accent)" : "var(--border2)"}`, background: housesSubTab === st.id ? "rgba(201,169,110,0.12)" : "transparent", color: housesSubTab === st.id ? "var(--accent)" : "var(--muted)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                            {st.en}
                          </button>
                        ))}
                      </div>

              {/* CUSPS sub-tab */}
              {housesSubTab === "cusps" && (
                <div className="tab-content" style={{ display: "flex", gap: "1rem", alignItems: "start" }}>
                  <div style={{ flex: 1, overflowX: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>భావ కస్పాల పట్టిక · KP కీలకం</div>
                      <div style={{ fontSize: 9, color: "var(--muted)" }}>Click any row → house panel</div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
                      <thead><tr>{["భావం", "రాశి", "అంశం", "నక్షత్రం", "నక్షత్రాధిపతి", "సబ్ లార్డ్"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", borderBottom: "0.5px solid var(--border)", fontWeight: 400 }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {workspaceData.cusps.map((c: any) => (
                          <tr key={c.house_num} onClick={() => setSelectedHouse(selectedHouse === c.house_num ? null : c.house_num)} style={{ borderBottom: "0.5px solid rgba(201,169,110,.06)", cursor: "pointer", background: selectedHouse === c.house_num ? "rgba(201,169,110,0.08)" : "transparent" }} onMouseEnter={e => { if (selectedHouse !== c.house_num) e.currentTarget.style.background = "rgba(201,169,110,0.04)"; }} onMouseLeave={e => { if (selectedHouse !== c.house_num) e.currentTarget.style.background = "transparent"; }}>
                            <td style={{ padding: "9px 10px" }}><span style={{ color: selectedHouse === c.house_num ? "var(--accent2)" : "var(--accent)", fontWeight: 700 }}>H{c.house_num}</span> <span style={{ color: "var(--muted)", fontSize: 10 }}>{c.house_te}</span></td>
                            <td style={{ padding: "9px 10px", color: "var(--text)" }}>{c.sign_te}</td>
                            <td style={{ padding: "9px 10px", color: "var(--muted)", fontSize: 11 }}>{c.degree_in_sign.toFixed(2)}°</td>
                            <td style={{ padding: "9px 10px", color: "var(--text)" }}>{c.nakshatra_te}</td>
                            <td style={{ padding: "9px 10px", color: PLANET_COLORS[c.star_lord_en] || "var(--text)" }}>{c.star_lord_te}</td>
                            <td style={{ padding: "9px 10px" }}><span style={{ background: "rgba(201,169,110,.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{c.sub_lord_te}</span></td>
                          </tr>
                        ))}
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
                            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>కారక గ్రహాలు · అన్ని భావాలు</div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <div style={{ fontSize: 9, color: "var(--muted)" }}>Click any house → full details</div>
                              <button onClick={() => setShowSigGrid(g => !g)}
                                style={{ padding: "3px 10px", background: showSigGrid ? "rgba(201,169,110,0.2)" : "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 5, color: showSigGrid ? "var(--accent)" : "var(--muted)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                                {showSigGrid ? "గ్రిడ్ దాచు" : "బలం గ్రిడ్ చూడు"}
                              </button>
                            </div>
                          </div>
                          {showSigGrid && (
                            <div style={{ overflowX: "auto", marginBottom: 16 }}>
                              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>గ్రహ × భావ కారకత్వ మాతృక (Significator Strength Grid)</div>
                              <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
                                <thead>
                                  <tr>
                                    <th style={{ padding: "5px 8px", color: "var(--accent)", fontWeight: 600, textAlign: "left", minWidth: 70 }}>గ్రహం</th>
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
                      {Object.entries(workspaceData.significators).map(([key, sig]: [string, any]) => (
                        <div key={key} onClick={() => setSelectedHouse(selectedHouse === sig.house_num ? null : sig.house_num)} style={{ background: selectedHouse === sig.house_num ? "rgba(201,169,110,0.12)" : "var(--surface2)", borderRadius: 8, padding: "0.75rem", border: `0.5px solid ${selectedHouse === sig.house_num ? "rgba(201,169,110,0.5)" : "var(--border)"}`, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => { if (selectedHouse !== sig.house_num) (e.currentTarget as HTMLElement).style.background = "rgba(201,169,110,0.06)"; }} onMouseLeave={e => { if (selectedHouse !== sig.house_num) (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}>
                          <div style={{ fontSize: 11, color: selectedHouse === sig.house_num ? "var(--accent2)" : "var(--accent)", fontWeight: 700, marginBottom: 2 }}>H{sig.house_num}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>{sig.house_te}</div>
                          {sig.occupants_en.length > 0 && <div style={{ marginBottom: 3 }}><span style={{ fontSize: 9, color: "var(--muted)" }}>నివాసులు: </span>{sig.occupants_te.map((p: string, i: number) => <span key={i} style={{ fontSize: 11, color: PLANET_COLORS[sig.occupants_en[i]] || "var(--accent2)", marginRight: 3 }}>{p}</span>)}</div>}
                          <div style={{ marginBottom: 3 }}><span style={{ fontSize: 9, color: "var(--muted)" }}>అధిపతి: </span><span style={{ fontSize: 11, color: PLANET_COLORS[sig.house_lord_en] || "var(--green)" }}>{sig.house_lord_te}</span></div>
                          <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 4, marginTop: 2 }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>{sig.all_significators_te.map((p: string, i: number) => <span key={i} style={{ fontSize: 10, color: PLANET_COLORS[sig.all_significators_en[i]] || "var(--text)" }}>{p}</span>)}</div>
                          </div>
                        </div>
                      ))}
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
                  <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.75rem" }}>రూలింగ్ గ్రహాలు · {workspaceData.ruling_planets.query_time}</div>
                  <div className="setup-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 10, padding: "1rem" }}>
                      {[
                        { l: "వారాధిపతి", en: workspaceData.ruling_planets.day_lord_en, te: workspaceData.ruling_planets.day_lord_te },
                        { l: "లగ్న రాశ్యధిపతి", en: workspaceData.ruling_planets.lagna_sign_lord_en, te: workspaceData.ruling_planets.lagna_sign_lord_te },
                        { l: "లగ్న నక్షత్రాధిపతి", en: workspaceData.ruling_planets.lagna_star_lord_en, te: workspaceData.ruling_planets.lagna_star_lord_te },
                        { l: "చంద్ర రాశ్యధిపతి", en: workspaceData.ruling_planets.moon_sign_lord_en, te: workspaceData.ruling_planets.moon_sign_lord_te },
                        { l: "చంద్ర నక్షత్రాధిపతి", en: workspaceData.ruling_planets.moon_star_lord_en, te: workspaceData.ruling_planets.moon_star_lord_te },
                      ].map(item => (
                        <div key={item.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 10, borderBottom: "0.5px solid var(--border)" }}>
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>{item.l}</span>
                          <span style={{ fontSize: 15, fontWeight: 600, color: PLANET_COLORS[item.en] || "var(--accent)" }}>{item.te}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 10, padding: "1rem" }}>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: "0.75rem" }}>అన్ని రూలింగ్ గ్రహాలు</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {workspaceData.ruling_planets.all_te.map((p: string, i: number) => (
                          <div key={i} style={{ textAlign: "center", padding: "10px 14px", background: `${PLANET_COLORS[workspaceData.ruling_planets.all_en[i]] || "var(--accent)"}15`, border: `0.5px solid ${PLANET_COLORS[workspaceData.ruling_planets.all_en[i]] || "var(--accent)"}30`, borderRadius: 8 }}>
                            <div style={{ fontSize: 16, fontWeight: 600, color: PLANET_COLORS[workspaceData.ruling_planets.all_en[i]] || "var(--accent)" }}>{p}</div>
                            <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>{workspaceData.ruling_planets.all_en[i]}</div>
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
                    <PanchangamCard data={workspaceData.panchangam_birth} title="జన్మ పంచాంగం" />
                    <PanchangamCard data={workspaceData.panchangam_today} title="నేటి పంచాంగం" />
                  </div>
                </div>
              )}

                    </>
                  )}
                </div>
              )}

              {/* DASHA */}
              {activeTab === "dasha" && (
                <div className="tab-content">
                  <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "1rem" }}>దశ కాలరేఖ · {workspaceData.mahadasha.lord_te} మహాదశ</div>
                  <DashaTimeline mahadasha={workspaceData.mahadasha} antardashas={workspaceData.antardashas} />

                  {/* PAD section */}
                  {workspaceData.pratyantardashas && (
                    <div style={{ marginTop: "2rem" }}>
                      <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.5rem" }}>
                        ప్రత్యంతర్దశ · {workspaceData.current_antardasha.lord_te} అంతర్దశలో
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: "0.75rem" }}>
                        Pratyantardasha (sub-sub periods) within current {workspaceData.current_antardasha.lord_en} Antardasha
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {workspaceData.pratyantardashas.map((pad: any, i: number) => {
                          const today = new Date();
                          const isPast = new Date(pad.end) < today;
                          return (
                            <div key={i} style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "5px 10px", borderRadius: 6,
                              background: pad.is_current ? "rgba(201,169,110,0.1)" : isPast ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                              border: pad.is_current ? "0.5px solid rgba(201,169,110,0.35)" : "0.5px solid var(--border)",
                              opacity: isPast ? 0.45 : 1,
                            }}>
                              <div style={{
                                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                                background: pad.is_current ? PLANET_COLORS[pad.lord_en] || "var(--accent)" : "var(--border2)",
                                boxShadow: pad.is_current ? `0 0 6px ${PLANET_COLORS[pad.lord_en] || "var(--accent)"}` : "none",
                              }} />
                              <span style={{ fontSize: 12, fontWeight: pad.is_current ? 600 : 400, color: pad.is_current ? PLANET_COLORS[pad.lord_en] || "var(--accent)" : "var(--text)", minWidth: 70 }}>{pad.lord_te}</span>
                              <span style={{ fontSize: 10, color: "var(--muted)", flex: 1 }}>{pad.start} → {pad.end}</span>
                              {pad.is_current && <span style={{ fontSize: 9, background: "rgba(201,169,110,0.15)", color: "var(--accent)", padding: "1px 6px", borderRadius: 3 }}>ప్రస్తుతం</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Collapsible Transit Section */}
                  <div style={{ marginTop: 20, borderTop: "0.5px solid var(--border)", paddingTop: 16 }}>
                    <button onClick={() => {
                      const next = !showTransitInDasha;
                      setShowTransitInDasha(next);
                      if (next && workspaceData && !transitData && !transitLoading) {
                        setTransitLoading(true);
                        axios.post(`${API_URL}/transit/analyze`, {
                          natal: workspaceData, transit_date: undefined,
                          latitude: workspaceData.latitude || 17.385,
                          longitude: workspaceData.longitude || 78.4867,
                          timezone_offset: 5.5,
                        }).then(res => { setTransitData(res.data); setTransitLoading(false); })
                          .catch(() => setTransitLoading(false));
                      }
                    }}
                      style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: 0, marginBottom: showTransitInDasha ? 12 : 0 }}>
                      <span style={{ fontSize: 14 }}>🌍</span>
                      <span>ప్రస్తుత గోచారం</span>
                      <span style={{ marginLeft: 4, fontSize: 10 }}>{showTransitInDasha ? "▲" : "▼"}</span>
                    </button>
                    {showTransitInDasha && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 13, color: "var(--muted)", flex: 1 }}>
                            ప్రస్తుత దశ: <span style={{ color: "var(--accent)" }}>{workspaceData.mahadasha?.lord_te}</span> / <span style={{ color: "var(--text)" }}>{workspaceData.current_antardasha?.lord_te}</span>
                          </div>
                          <input type="date" value={transitDate} onChange={e => setTransitDate(e.target.value)}
                            style={{ padding: "5px 10px", background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--text)", fontSize: 12, fontFamily: "inherit" }} />
                          <button onClick={async () => {
                            if (!workspaceData) return;
                            setTransitLoading(true);
                            try {
                              const res = await axios.post(`${API_URL}/transit/analyze`, { natal: workspaceData, transit_date: transitDate || undefined, latitude: workspaceData.latitude || 17.385, longitude: workspaceData.longitude || 78.4867, timezone_offset: 5.5 });
                              setTransitData(res.data);
                            } catch { setTransitData(null); }
                            setTransitLoading(false);
                          }}
                            style={{ padding: "6px 16px", background: "var(--accent)", border: "none", borderRadius: 6, color: "#000", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                            {transitLoading ? "లోడ్..." : "రిఫ్రెష్"}
                          </button>
                        </div>
                        {transitLoading && <div style={{ textAlign: "center", padding: "1rem", color: "var(--muted)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />లోడ్ అవుతోంది...</div>}
                        {transitData?.sade_sati?.active && (
                          <div style={{ padding: "10px 14px", background: "rgba(251,191,36,0.08)", border: "0.5px solid rgba(251,191,36,0.3)", borderRadius: 8, fontSize: 12 }}>
                            <span style={{ color: "#fbbf24", fontWeight: 600 }}>⚠ సాడేసాతి అక్టివ్</span>
                            <span style={{ color: "var(--muted)", marginLeft: 8 }}>{transitData.sade_sati.phase}</span>
                          </div>
                        )}
                        {transitData?.transits && (
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead><tr style={{ borderBottom: "0.5px solid var(--border2)", color: "var(--muted)" }}>
                                {["గ్రహం","రాశి","నక్షత్రం","స్టార్‌లార్డ్","సబ్‌లార్డ్","భావం","వివరణ"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 500 }}>{h}</th>)}
                              </tr></thead>
                              <tbody>
                                {transitData.transits.map((t: any) => {
                                  const isDasha = t.is_dasha_lord; const isBhukti = t.is_bhukti_lord;
                                  return (
                                    <tr key={t.planet} style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)", background: isDasha ? "rgba(201,169,110,0.12)" : isBhukti ? "rgba(201,169,110,0.06)" : "transparent" }}>
                                      <td style={{ padding: "7px 8px", color: isDasha ? "var(--accent)" : isBhukti ? "var(--text)" : "var(--muted)", fontWeight: isDasha || isBhukti ? 600 : 400 }}>
                                        {t.symbol} {t.planet}{t.retrograde && <span style={{ color: "#f87171", fontSize: 10, marginLeft: 4 }}>℞</span>}
                                        {isDasha && <span style={{ marginLeft: 5, fontSize: 9, color: "var(--accent)", background: "rgba(201,169,110,0.2)", padding: "1px 5px", borderRadius: 4 }}>MD</span>}
                                        {isBhukti && !isDasha && <span style={{ marginLeft: 5, fontSize: 9, color: "var(--text)", background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>AD</span>}
                                      </td>
                                      <td style={{ padding: "7px 8px", color: "var(--text)" }}>{t.sign}</td>
                                      <td style={{ padding: "7px 8px", color: "var(--muted)" }}>{t.nakshatra}</td>
                                      <td style={{ padding: "7px 8px", color: "var(--text)" }}>{t.star_lord}</td>
                                      <td style={{ padding: "7px 8px", color: "var(--text)" }}>{t.sub_lord}</td>
                                      <td style={{ padding: "7px 8px", textAlign: "center" }}><span style={{ display: "inline-block", padding: "2px 8px", background: "rgba(201,169,110,0.15)", borderRadius: 10, color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>H{t.transit_house}</span></td>
                                      <td style={{ padding: "7px 8px", color: "var(--muted)", fontSize: 11, maxWidth: 180 }}>{t.note}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MUHURTHA */}
              {activeTab === "muhurtha" && (
                <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Step 1 — Event type + Participants */}
                  {mStep === 1 && (
                    <div>
                      <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.75rem" }}>ఏ సందర్భానికి ముహూర్తం?</div>
                      {/* Free-form event type input */}
                      <input
                        type="text"
                        placeholder="సందర్భం టైప్ చేయండి (e.g. vehicle delivery, marriage...)"
                        value={mEventType}
                        onChange={e => setMEventType(e.target.value)}
                        style={{ width: "100%", padding: "10px 14px", background: "var(--card)", border: `0.5px solid ${mEventType ? "var(--accent)" : "var(--border2)"}`, borderRadius: 8, color: "var(--fg)", fontSize: 13, fontFamily: "inherit", marginBottom: 10, outline: "none" }}
                      />
                      {/* Quick-pick chips */}
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: "1.25rem" }}>
                        {[
                          ["వివాహం", "Marriage"],
                          ["వాహన డెలివరీ", "Vehicle Delivery"],
                          ["వ్యాపారం", "Business Opening"],
                          ["గృహప్రవేశం", "House Warming"],
                          ["ప్రయాణం", "Travel"],
                          ["విద్య", "Education"],
                          ["వైద్యం / ఆపరేషన్", "Medical / Surgery"],
                          ["పెట్టుబడి", "Investment"],
                        ].map(([te, en]) => (
                          <button key={en} onClick={() => setMEventType(en)}
                            style={{ padding: "4px 12px", background: mEventType === en ? "rgba(201,169,110,0.15)" : "var(--surface2)", border: `0.5px solid ${mEventType === en ? "var(--accent)" : "var(--border)"}`, borderRadius: 20, cursor: "pointer", fontSize: 12, color: mEventType === en ? "var(--accent)" : "var(--muted)", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>
                            {te}
                          </button>
                        ))}
                      </div>

                      {/* Participants panel */}
                      <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "0.875rem 1rem", marginBottom: "1rem" }}>
                        <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "0.625rem" }}>
                          పాల్గొనేవారు — Participants <span style={{ color: "var(--border2)", fontStyle: "normal" }}>(ఐచ్ఛికం / Optional)</span>
                        </div>
                        {/* Participants chips */}
                        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: "0.625rem" }}>
                          {/* Main user — always included, locked */}
                          {workspaceData && (
                            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "rgba(201,169,110,0.15)", border: "0.5px solid var(--accent)", borderRadius: 20, fontSize: 12, color: "var(--accent)" }}>
                              <span>🔒 {workspaceData.name || birthDetails.name} (You)</span>
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
                                  <option value="" disabled>+ సేవ్ చేసిన చార్ట్ నుండి జోడించు</option>
                                  {savedSessions.filter(s => !mParticipants.find(p => p.id === s.id)).map(s => (
                                    <option key={s.id} value={s.id}>{s.name || s.birthDetails.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <button onClick={() => setMShowAddParticipant(true)}
                              style={{ padding: "7px 12px", background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>
                              + కొత్తగా
                            </button>
                          </div>
                        )}

                        {/* Inline mini-form for new participant */}
                        {mShowAddParticipant && (
                          <div style={{ display: "flex", flexDirection: "column" as const, gap: 7 }}>
                            <input placeholder="పేరు / Name" value={mNewP.name} onChange={e => setMNewP(p => ({ ...p, name: e.target.value }))}
                              style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "var(--text)", outline: "none" }} />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                              <input placeholder="DD/MM/YYYY" value={mNewP.date} onChange={e => setMNewP(p => ({ ...p, date: e.target.value }))}
                                style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "var(--text)", outline: "none" }} />
                              <div style={{ display: "flex", gap: 4 }}>
                                <input placeholder="HH:MM" value={mNewP.time} onChange={e => setMNewP(p => ({ ...p, time: e.target.value }))}
                                  style={{ flex: 1, background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "var(--text)", outline: "none" }} />
                                <button onClick={() => setMNewP(p => ({ ...p, ampm: p.ampm === "AM" ? "PM" : "AM" }))}
                                  style={{ padding: "7px 8px", background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--accent)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                                  {mNewP.ampm}
                                </button>
                              </div>
                            </div>
                            {/* Place search */}
                            <div style={{ position: "relative" as const }}>
                              <input placeholder="పుట్టిన ఊరు / Place of Birth" value={mNewP.place} onChange={e => handleMNewPPlaceChange(e.target.value)}
                                style={{ width: "100%", background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "var(--text)", outline: "none", boxSizing: "border-box" as const }} />
                              {mNewPPlaceStatus === "searching" && <div style={{ position: "absolute", right: 10, top: 8, fontSize: 10, color: "var(--muted)" }}>...</div>}
                              {mNewPPlaceSugg.length > 0 && (
                                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 6, overflow: "hidden", marginTop: 2 }}>
                                  {mNewPPlaceSugg.map((s, i) => (
                                    <button key={i} onClick={() => { setMNewP(p => ({ ...p, place: s.display, latitude: s.lat, longitude: s.lon })); setMNewPPlaceSugg([]); setMNewPPlaceStatus("idle"); }}
                                      style={{ width: "100%", padding: "7px 10px", background: "none", border: "none", borderBottom: "0.5px solid var(--border)", color: "var(--text)", fontSize: 11, textAlign: "left" as const, cursor: "pointer", fontFamily: "inherit" }}>
                                      {s.display}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Gender */}
                            <div style={{ display: "flex", gap: 6 }}>
                              {(["male","female"] as const).map(g => (
                                <button key={g} onClick={() => setMNewP(p => ({ ...p, gender: g }))}
                                  style={{ flex: 1, padding: "6px", borderRadius: 6, cursor: "pointer", border: `0.5px solid ${mNewP.gender === g ? "var(--accent)" : "var(--border2)"}`, background: mNewP.gender === g ? "rgba(201,169,110,0.1)" : "var(--surface)", color: mNewP.gender === g ? "var(--accent)" : "var(--muted)", fontSize: 12, fontFamily: "inherit" }}>
                                  {g === "male" ? "♂ Male" : "♀ Female"}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => {
                                if (!mNewP.name || !mNewP.date || !mNewP.time) return;
                                const newSession: ChartSession = {
                                  id: Date.now().toString(),
                                  name: mNewP.name,
                                  birthDetails: { name: mNewP.name, date: mNewP.date, time: mNewP.time, ampm: mNewP.ampm, place: mNewP.place, latitude: mNewP.latitude, longitude: mNewP.longitude, gender: mNewP.gender },
                                  workspaceData: null, analysisMessages: [], activeTopic: "", selectedHouse: null, chatQ: "", analysisLang: "english", activeTab: "chart"
                                };
                                setMParticipants(prev => [...prev, newSession]);
                                setSavedSessions(prev => [...prev, newSession]);
                                setMNewP({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: 17.385, longitude: 78.4867, gender: "" });
                                setMNewPPlaceSugg([]); setMNewPPlaceStatus("idle");
                                setMShowAddParticipant(false);
                              }} style={{ flex: 1, padding: "7px", background: "var(--accent)", border: "none", borderRadius: 6, color: "#09090f", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                                జోడించు
                              </button>
                              <button onClick={() => { setMShowAddParticipant(false); setMNewP({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: 17.385, longitude: 78.4867, gender: "" }); setMNewPPlaceSugg([]); }}
                                style={{ padding: "7px 12px", background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                                రద్దు
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <button onClick={() => setMStep(2)} disabled={!mEventType}
                        style={{ width: "100%", padding: "12px", background: mEventType ? "var(--accent)" : "var(--surface2)", color: mEventType ? "#09090f" : "var(--muted)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: mEventType ? "pointer" : "default", fontFamily: "inherit", transition: "all 0.2s" }}>
                        తేదీలు ఎంచుకోండి →
                      </button>
                    </div>
                  )}

                  {/* Step 2 — Date selection */}
                  {mStep === 2 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.75rem" }}>
                        <button onClick={() => setMStep(1)} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
                        <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>ఏ తేదీలు చూడాలి?</div>
                      </div>
                      {/* Participant summary if any */}
                      {mParticipants.length > 0 && (
                        <div style={{ padding: "6px 10px", background: "rgba(201,169,110,0.06)", border: "0.5px solid rgba(201,169,110,0.2)", borderRadius: 6, marginBottom: "0.875rem", fontSize: 11, color: "var(--muted)" }}>
                          పాల్గొనేవారు: {mParticipants.map(p => <span key={p.id} style={{ color: "var(--accent)", marginRight: 6 }}>{p.name || p.birthDetails.name}</span>)}
                        </div>
                      )}
                      {/* Quick picks */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "1rem" }}>
                        {[
                          { label: "ఈ వారం", en: "This week", days: 7 },
                          { label: "వచ్చే వారం", en: "Next week", days: 14 },
                          { label: "ఈ నెల", en: "This month", days: 30 },
                          { label: "వచ్చే నెల", en: "Next month", days: 60 },
                        ].map(q => {
                          const s = new Date(); s.setDate(s.getDate() + (q.days === 14 ? 7 : 0));
                          const e = new Date(); e.setDate(e.getDate() + q.days);
                          const fmt = (d: Date) => d.toISOString().split("T")[0];
                          return (
                            <button key={q.label} onClick={() => { setMDateStart(fmt(s)); setMDateEnd(fmt(e)); }}
                              style={{ padding: "0.75rem", background: "var(--surface2)", border: `0.5px solid ${mDateStart === fmt(s) ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer", color: mDateStart === fmt(s) ? "var(--accent)" : "var(--text)", fontSize: 13, fontFamily: "inherit", transition: "all 0.2s" }}>
                              <div>{q.label}</div>
                              <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>{q.en}</div>
                            </button>
                          );
                        })}
                      </div>
                      {/* Custom date range */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "1rem" }}>
                        <div>
                          <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 4 }}>నుండి (From)</div>
                          <input type="date" value={mDateStart} onChange={e => setMDateStart(e.target.value)}
                            style={{ width: "100%", background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "var(--text)", outline: "none" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 4 }}>వరకు (To)</div>
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
                            timezone_offset: 5.5, nearby_days: 3,
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
                        style={{ width: "100%", padding: "12px", background: mDateStart && mDateEnd ? "var(--accent)" : "var(--surface2)", color: mDateStart && mDateEnd ? "#09090f" : "var(--muted)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: mDateStart && mDateEnd ? "pointer" : "default", fontFamily: "inherit" }}>
                        ముహూర్తాలు వెతకండి →
                      </button>
                    </div>
                  )}

                  {/* Step 3 — Results */}
                  {mStep === 3 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
                        <button onClick={() => { setMStep(2); setMResults(null); }} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
                        <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                          {mEventType.replace("_", " ").toUpperCase()} ముహూర్తాలు · {mDateStart} → {mDateEnd}
                        </div>
                      </div>

                      {mLoading && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", padding: "2rem", justifyContent: "center" }}>
                          <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                          గ్రహ స్థితులు లెక్కిస్తున్నాం...
                        </div>
                      )}

                      {!mLoading && mResults && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          {/* Nearby better alert */}
                          {mResults.nearby_better && (
                            <div style={{ padding: "0.75rem 1rem", background: "rgba(251,191,36,0.08)", border: "0.5px solid rgba(251,191,36,0.3)", borderRadius: 8 }}>
                              <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 500, marginBottom: 4 }}>
                                ⚠ మీరు ఎంచుకున్న తేదీల దగ్గర మంచి ముహూర్తం ఉంది
                              </div>
                              <div style={{ fontSize: 12, color: "var(--text)" }}>
                                {mResults.nearby_better.date_display} — Score: {mResults.nearby_better.score} ({mResults.nearby_better.quality})
                              </div>
                              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                                {mResults.nearby_better.start_time}–{mResults.nearby_better.end_time} · Lagna: {mResults.nearby_better.lagna} · Sub Lord: {mResults.nearby_better.lagna_sublord}
                              </div>
                            </div>
                          )}

                          {/* Window list */}
                          {mResults.windows && mResults.windows.length === 0 && (
                            <div style={{ textAlign: "center" as const, padding: "2rem", color: "var(--muted)", fontSize: 13 }}>
                              ఈ తేదీల్లో మంచి ముహూర్తాలు కనపడలేదు. వేరే తేదీలు చూడండి.
                            </div>
                          )}

                          {(mResults.windows || []).map((w: any, i: number) => (
                            <div key={i} style={{ padding: "0.875rem 1rem", background: "var(--surface2)", border: `0.5px solid ${w.quality === "Excellent" ? "rgba(201,169,110,0.4)" : w.quality === "Good" ? "rgba(74,222,128,0.3)" : "var(--border)"}`, borderRadius: 10 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{w.date_display}</div>
                                  <div style={{ fontSize: 16, color: w.quality === "Excellent" ? "var(--accent)" : w.quality === "Good" ? "#4ade80" : "var(--muted)", fontWeight: 600, marginTop: 2 }}>
                                    {w.start_time} – {w.end_time}
                                  </div>
                                </div>
                                <div style={{ textAlign: "right" as const }}>
                                  <div style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: w.quality === "Excellent" ? "rgba(201,169,110,0.15)" : w.quality === "Good" ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.05)", color: w.quality === "Excellent" ? "var(--accent)" : w.quality === "Good" ? "#4ade80" : "var(--muted)", border: `0.5px solid ${w.quality === "Excellent" ? "rgba(201,169,110,0.3)" : w.quality === "Good" ? "rgba(74,222,128,0.2)" : "var(--border)"}` }}>
                                    {w.quality === "Excellent" ? "★★★" : w.quality === "Good" ? "★★" : "★"} {w.quality}
                                  </div>
                                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>Score: {w.score}</div>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: "var(--muted)" }}>Lagna: <span style={{ color: "var(--text)" }}>{w.lagna}</span></span>
                                <span style={{ color: "var(--muted)" }}>·</span>
                                <span style={{ color: "var(--muted)" }}>Sub Lord: <span style={{ color: "var(--accent2)" }}>{w.lagna_sublord}</span></span>
                                <span style={{ color: "var(--muted)" }}>·</span>
                                <span style={{ color: "var(--muted)" }}>H: <span style={{ color: "var(--text)" }}>{w.signified_houses.join(", ")}</span></span>
                              </div>
                              {/* Participant resonance badges */}
                              {w.resonating_with && w.resonating_with.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4, marginBottom: 4 }}>
                                  {w.resonating_with.map((name: string, j: number) => (
                                    <span key={j} style={{ fontSize: 10, padding: "2px 7px", background: "rgba(74,222,128,0.1)", border: "0.5px solid rgba(74,222,128,0.25)", borderRadius: 12, color: "#4ade80" }}>
                                      {name} ✓
                                    </span>
                                  ))}
                                  {mParticipants.length > 0 && w.participant_resonance < mParticipants.length && (
                                    <span style={{ fontSize: 10, color: "var(--muted)" }}>
                                      {w.participant_resonance}/{mParticipants.length} resonating
                                    </span>
                                  )}
                                </div>
                              )}
                              {(w.in_rahu_kalam || w.is_vishti) && (
                                <div style={{ marginTop: 4, fontSize: 10, color: "#f87171" }}>
                                  {w.in_rahu_kalam && "⚠ రాహుకాలం లో ఉంది  "}
                                  {w.is_vishti && "⚠ విష్టి కరణం"}
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Search different dates button */}
                          <button onClick={() => { setMStep(2); setMResults(null); }}
                            style={{ padding: "10px", background: "transparent", border: "0.5px solid var(--border2)", borderRadius: 8, color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                            వేరే తేదీలు వెతకండి →
                          </button>
                        </div>
                      )}

                      {!mLoading && !mResults && (
                        <div style={{ textAlign: "center" as const, padding: "2rem", color: "#f87171", fontSize: 13 }}>
                          ముహూర్తాలు లోడ్ చేయడంలో సమస్య. మళ్ళీ ప్రయత్నించండి.
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
                return (
                <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                  {/* Selection step */}
                  {!matchLoading && (!matchResults || !matchResults.overall_verdict) && !matchResults?.__error && (
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: "1rem" }}>
                      <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>వివాహ సరిపోలన — Marriage Compatibility</div>

                      {/* Person 1 — always current chart */}
                      <div style={{ background: "var(--surface2)", border: "0.5px solid rgba(201,169,110,0.4)", borderRadius: 10, padding: "0.875rem 1rem" }}>
                        <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "0.5rem" }}>వ్యక్తి 1 — Current Chart</div>
                        {matchPerson1 ? (
                          <div>
                            <div style={{ fontSize: 14, color: "var(--accent)", fontWeight: 500 }}>{matchPerson1.name || matchPerson1.birthDetails.name}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                              {matchPerson1.birthDetails.date} · {matchPerson1.birthDetails.gender === "male" ? "♂ Male" : matchPerson1.birthDetails.gender === "female" ? "♀ Female" : "Gender not set"}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>చార్ట్ లోడ్ చేయండి మొదట (Setup tab).</div>
                        )}
                      </div>

                      {/* Person 2 — select from saved or add inline */}
                      <div style={{ background: "var(--surface2)", border: `0.5px solid ${matchResults ? "rgba(201,169,110,0.4)" : "var(--border)"}`, borderRadius: 10, padding: "0.875rem 1rem" }}>
                        <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "0.625rem" }}>వ్యక్తి 2 — Second Person</div>
                        {/* Show saved sessions (excluding current) */}
                        {!matchPerson2Inline && (
                          <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                            {savedSessions.filter(s => s.id !== matchPerson1?.id).length > 0 && (
                              <select onChange={e => {
                                const found = savedSessions.find(s => s.id === e.target.value);
                                if (found) { setMatchResults({ __p2: found }); e.target.value = ""; }
                              }} value={matchResults?.__p2?.id || ""}
                                style={{ width: "100%", background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "9px 10px", fontSize: 13, color: "var(--muted)", outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
                                <option value="" disabled>సేవ్ చేసిన చార్ట్ ఎంచుకోండి...</option>
                                {savedSessions.filter(s => s.id !== matchPerson1?.id).map(s => (
                                  <option key={s.id} value={s.id}>{s.name || s.birthDetails.name} {s.birthDetails.gender === "male" ? "♂" : s.birthDetails.gender === "female" ? "♀" : ""}</option>
                                ))}
                              </select>
                            )}
                            <button onClick={() => setMatchPerson2Inline(true)}
                              style={{ padding: "8px", background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                              + కొత్త వ్యక్తి వివరాలు నమోదు చేయండి
                            </button>
                          </div>
                        )}
                        {/* Inline add form for person 2 */}
                        {matchPerson2Inline && (
                          <div style={{ display: "flex", flexDirection: "column" as const, gap: 7 }}>
                            <input placeholder="పేరు / Name" value={mNewP.name} onChange={e => setMNewP(p => ({ ...p, name: e.target.value }))}
                              style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "var(--text)", outline: "none" }} />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                              <input placeholder="DD/MM/YYYY" value={mNewP.date} onChange={e => setMNewP(p => ({ ...p, date: e.target.value }))}
                                style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "var(--text)", outline: "none" }} />
                              <div style={{ display: "flex", gap: 4 }}>
                                <input placeholder="HH:MM" value={mNewP.time} onChange={e => setMNewP(p => ({ ...p, time: e.target.value }))}
                                  style={{ flex: 1, background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "var(--text)", outline: "none" }} />
                                <button onClick={() => setMNewP(p => ({ ...p, ampm: p.ampm === "AM" ? "PM" : "AM" }))}
                                  style={{ padding: "7px 8px", background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--accent)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                                  {mNewP.ampm}
                                </button>
                              </div>
                            </div>
                            <div style={{ position: "relative" as const }}>
                              <input placeholder="పుట్టిన ఊరు / Place of Birth" value={mNewP.place} onChange={e => handleMNewPPlaceChange(e.target.value)}
                                style={{ width: "100%", background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "var(--text)", outline: "none", boxSizing: "border-box" as const }} />
                              {mNewPPlaceStatus === "searching" && <div style={{ position: "absolute", right: 10, top: 8, fontSize: 10, color: "var(--muted)" }}>...</div>}
                              {mNewPPlaceSugg.length > 0 && (
                                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 6, overflow: "hidden", marginTop: 2 }}>
                                  {mNewPPlaceSugg.map((s, i) => (
                                    <button key={i} onClick={() => { setMNewP(p => ({ ...p, place: s.display, latitude: s.lat, longitude: s.lon })); setMNewPPlaceSugg([]); setMNewPPlaceStatus("idle"); }}
                                      style={{ width: "100%", padding: "7px 10px", background: "none", border: "none", borderBottom: "0.5px solid var(--border)", color: "var(--text)", fontSize: 11, textAlign: "left" as const, cursor: "pointer", fontFamily: "inherit" }}>
                                      {s.display}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              {(["male","female"] as const).map(g => (
                                <button key={g} onClick={() => setMNewP(p => ({ ...p, gender: g }))}
                                  style={{ flex: 1, padding: "6px", borderRadius: 6, cursor: "pointer", border: `0.5px solid ${mNewP.gender === g ? "var(--accent)" : "var(--border2)"}`, background: mNewP.gender === g ? "rgba(201,169,110,0.1)" : "var(--surface)", color: mNewP.gender === g ? "var(--accent)" : "var(--muted)", fontSize: 12, fontFamily: "inherit" }}>
                                  {g === "male" ? "♂ Male" : "♀ Female"}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => {
                                if (!mNewP.name || !mNewP.date || !mNewP.time) return;
                                const newSession: ChartSession = {
                                  id: Date.now().toString(), name: mNewP.name,
                                  birthDetails: { name: mNewP.name, date: mNewP.date, time: mNewP.time, ampm: mNewP.ampm, place: mNewP.place, latitude: mNewP.latitude, longitude: mNewP.longitude, gender: mNewP.gender },
                                  workspaceData: null, analysisMessages: [], activeTopic: "", selectedHouse: null, chatQ: "", analysisLang: "english", activeTab: "chart"
                                };
                                setSavedSessions(prev => [...prev, newSession]);
                                setMatchResults({ __p2: newSession });
                                setMNewP({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: 17.385, longitude: 78.4867, gender: "" });
                                setMNewPPlaceSugg([]); setMNewPPlaceStatus("idle");
                                setMatchPerson2Inline(false);
                              }} style={{ flex: 1, padding: "7px", background: "var(--accent)", border: "none", borderRadius: 6, color: "#09090f", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                                జోడించు
                              </button>
                              <button onClick={() => { setMatchPerson2Inline(false); setMNewP({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: 17.385, longitude: 78.4867, gender: "" }); setMNewPPlaceSugg([]); }}
                                style={{ padding: "7px 12px", background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                                రద్దు
                              </button>
                            </div>
                          </div>
                        )}
                        {/* Show selected person 2 */}
                        {matchResults?.__p2 && !matchPerson2Inline && (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                            <div>
                              <div style={{ fontSize: 14, color: "var(--accent)", fontWeight: 500 }}>{matchResults.__p2.name || matchResults.__p2.birthDetails.name}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                                {matchResults.__p2.birthDetails.date} · {matchResults.__p2.birthDetails.gender === "male" ? "♂" : matchResults.__p2.birthDetails.gender === "female" ? "♀" : ""}
                              </div>
                            </div>
                            <button onClick={() => { setMatchResults(null); }} style={{ background: "none", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--muted)", cursor: "pointer", padding: "4px 10px", fontSize: 12, fontFamily: "inherit" }}>
                              మార్చు
                            </button>
                          </div>
                        )}
                      </div>

                      <button onClick={async () => {
                        const p2 = matchResults?.__p2;
                        if (!matchPerson1 || !p2) return;
                        setMatchLoading(true);
                        const prevP2 = p2;
                        setMatchResults(null);
                        try {
                          const res = await axios.post(`${API_URL}/compatibility/match`, {
                            person1: sessionToApiPerson(matchPerson1),
                            person2: sessionToApiPerson(prevP2),
                          });
                          setMatchResults({ ...res.data, __p2: prevP2 });
                        } catch { setMatchResults({ __p2: prevP2, __error: true }); }
                        setMatchLoading(false);
                      }} disabled={!matchPerson1 || !matchResults?.__p2}
                        style={{ width: "100%", padding: "12px", background: matchPerson1 && matchResults?.__p2 ? "var(--accent)" : "var(--surface2)", color: matchPerson1 && matchResults?.__p2 ? "#09090f" : "var(--muted)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: matchPerson1 && matchResults?.__p2 ? "pointer" : "default", fontFamily: "inherit", transition: "all 0.2s" }}>
                        సరిపోలన చూడు →
                      </button>
                    </div>
                  )}

                  {/* Loading */}
                  {matchLoading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", padding: "3rem", justifyContent: "center" }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                      గ్రహ స్థానాలు లెక్కిస్తున్నాం...
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
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.875rem" }}>
                        {/* Back button */}
                        <button onClick={() => setMatchResults({ __p2: r.__p2 })} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: 0 }}>
                          ← వేరే వ్యక్తి ఎంచుకోండి
                        </button>

                        {/* Gender warning if either person has no gender set */}
                        {(!r.person1?.gender || !r.person2?.gender) && (
                          <div style={{ padding: "6px 10px", background: "rgba(251,191,36,0.08)", border: "0.5px solid rgba(251,191,36,0.25)", borderRadius: 6, fontSize: 11, color: "#fbbf24" }}>
                            ⚠ {[!r.person1?.gender && r.person1?.name, !r.person2?.gender && r.person2?.name].filter(Boolean).join(", ")} — Gender not set. Ashtakoota assumes Person 1 = Boy. Set gender in Setup for accurate 36-gun score.
                          </div>
                        )}

                        {/* Overall verdict banner */}
                        <div style={{ padding: "1rem", background: "var(--surface2)", border: `0.5px solid ${verdictColor}`, borderRadius: 10, textAlign: "center" as const }}>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{r.person1?.name} & {r.person2?.name}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: verdictColor, marginBottom: 4 }}>{r.overall_verdict}</div>
                          <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 12, color: "var(--muted)" }}>
                            <span>KP: <span style={{ color: "var(--text)" }}>{kp?.kp_verdict}</span></span>
                            <span>·</span>
                            <span>36-Gun: <span style={{ color: "var(--text)" }}>{ast?.total_score}/{ast?.max_score}</span></span>
                          </div>
                        </div>

                        {/* KP Analysis */}
                        <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "0.875rem 1rem" }}>
                          <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "0.625rem" }}>KP విశ్లేషణ</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                            {[kp?.chart1_promise, kp?.chart2_promise].map((p: any, i: number) => p && (
                              <div key={i} style={{ padding: "8px 10px", background: "var(--surface)", borderRadius: 6, border: `0.5px solid ${p.has_promise && !p.has_denial ? "rgba(74,222,128,0.3)" : p.has_denial ? "rgba(248,113,113,0.3)" : "var(--border)"}` }}>
                                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>{i === 0 ? r.person1?.name : r.person2?.name}</div>
                                <div style={{ fontSize: 11, fontWeight: 500, color: p.has_promise && !p.has_denial ? "#4ade80" : p.has_denial ? "#f87171" : "var(--muted)" }}>
                                  H7 SL: {p.sub_lord} → {p.verdict}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>H{p.signified_houses?.join(", H")}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            Resonance: <span style={{ color: "#4ade80" }}>
                              {[...(kp?.resonance_1_to_2||[]), ...(kp?.resonance_2_to_1||[])].join(", ") || "None"}
                            </span> ({kp?.total_resonance_count || 0} planets)
                          </div>
                        </div>

                        {/* Ashtakoota */}
                        <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "0.875rem 1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
                            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>అష్టకూట — 36 Gun</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: ast?.total_score >= 25 ? "var(--accent)" : ast?.total_score >= 18 ? "#4ade80" : "#f87171" }}>
                              {ast?.total_score}/{ast?.max_score} · {ast?.verdict}
                            </div>
                          </div>
                          <div style={{ height: 6, background: "var(--surface)", borderRadius: 3, marginBottom: "0.75rem", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(ast?.total_score/ast?.max_score)*100}%`, background: ast?.total_score >= 25 ? "var(--accent)" : ast?.total_score >= 18 ? "#4ade80" : "#f87171", borderRadius: 3, transition: "width 0.5s ease" }} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                            {(ast?.kutas || []).map((k: any, i: number) => (
                              <div key={i} title={k.note} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "var(--surface)", borderRadius: 5, border: `0.5px solid ${k.has_dosha ? "rgba(248,113,113,0.3)" : "var(--border)"}`, cursor: "default" }}>
                                <span style={{ fontSize: 11, color: k.has_dosha ? "#f87171" : "var(--muted)" }}>{k.kuta}</span>
                                <span style={{ fontSize: 11, fontWeight: 600, color: k.score >= k.max * 0.6 ? "#4ade80" : k.score > 0 ? "var(--accent)" : "#f87171" }}>{k.score}/{k.max}</span>
                              </div>
                            ))}
                          </div>
                          {ast?.critical_doshas?.length > 0 && <div style={{ marginTop: 8, fontSize: 11, color: "#f87171" }}>⚠ Doshas: {ast.critical_doshas.join(", ")}</div>}
                        </div>

                        {/* Venus Karaka Panel */}
                        {(r.venus_chart1 || r.venus_chart2) && (
                          <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "0.875rem 1rem" }}>
                            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>♀ Venus Karaka Analysis</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              {[{v: r.venus_chart1, name: r.person1?.name || "Person 1"}, {v: r.venus_chart2, name: r.person2?.name || "Person 2"}].map((item, i) => item.v && (
                                <div key={i} style={{ background: "var(--surface)", borderRadius: 8, padding: "10px 12px" }}>
                                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>{item.name}</div>
                                  <div style={{ fontSize: 12, color: "var(--text)", marginBottom: 2 }}>H{item.v.house} · <span style={{ color: item.v.strength === "Strong" ? "var(--green)" : item.v.strength === "Afflicted" ? "var(--red)" : "var(--accent)" }}>{item.v.strength}</span></div>
                                  <div style={{ fontSize: 11, color: item.v.signifies_h7 ? "var(--green)" : "var(--muted)" }}>{item.v.signifies_h7 ? "✓ Signifies H7" : "○ Doesn't signify H7"}</div>
                                  {item.v.enhances_promise && <div style={{ fontSize: 10, color: "var(--green)", marginTop: 2 }}>✓ Enhances marriage promise</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Supporting Cusps */}
                        {(r.supporting_cusps_chart1 || r.supporting_cusps_chart2) && (
                          <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "0.875rem 1rem" }}>
                            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>Supporting Cusps (H2 & H11)</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              {[{sc: r.supporting_cusps_chart1, name: r.person1?.name || "Person 1"}, {sc: r.supporting_cusps_chart2, name: r.person2?.name || "Person 2"}].map((item, i) => item.sc && (
                                <div key={i} style={{ background: "var(--surface)", borderRadius: 8, padding: "10px 12px" }}>
                                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>{item.name}</div>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                    <span style={{ fontSize: 11, color: "var(--muted)" }}>H2 CSL: {item.sc.h2_csl}</span>
                                    <span style={{ fontSize: 11, color: item.sc.h2_supports ? "var(--green)" : "var(--muted)" }}>{item.sc.h2_supports ? "✓" : "✗"}</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: 11, color: "var(--muted)" }}>H11 CSL: {item.sc.h11_csl}</span>
                                    <span style={{ fontSize: 11, color: item.sc.h11_supports ? "var(--green)" : "var(--muted)" }}>{item.sc.h11_supports ? "✓" : "✗"}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timing & Dasha Overlap */}
                        {r.timing_verdict && (
                          <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "0.875rem 1rem" }}>
                            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>Dasha Timing Overlap</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: r.timing_verdict === "Aligned" ? "var(--green)" : r.timing_verdict === "Misaligned" ? "var(--red)" : "var(--accent)" }}>● {r.timing_verdict}</span>
                            </div>
                            {r.shared_significators?.length > 0 && (
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {r.shared_significators.map((p: string) => (
                                  <span key={p} style={{ fontSize: 10, background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 4, padding: "2px 6px" }}>{p}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* H7 Sub Lord Spouse Characteristics */}
                        {r.h7_lord_both?.marriage_type && (
                          <div style={{ border: "0.5px solid rgba(201,169,110,0.25)", borderRadius: 10, padding: "0.875rem 1rem" }}>
                            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>H7 Sub Lord Characteristics</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                              {([["Marriage Type", r.h7_lord_both.marriage_type], ["Spouse Nature", r.h7_lord_both.spouse_nature], ["Age Gap", r.h7_lord_both.age_gap], ["Note", r.h7_lord_both.caution]] as [string,string][]).filter(([,v]) => v).map(([k, v]) => (
                                <div key={k}>
                                  <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 2 }}>{k}</div>
                                  <div style={{ fontSize: 11, color: "var(--text)" }}>{v}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Kuja Dosha + Moon */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "0.75rem" }}>
                            <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "0.5rem" }}>కుజ దోష</div>
                            {[kuja?.person1, kuja?.person2].map((p: any, i: number) => p && (
                              <div key={i} style={{ marginBottom: 6 }}>
                                <div style={{ fontSize: 10, color: "var(--muted)" }}>{p.name}</div>
                                <div style={{ fontSize: 11, fontWeight: 500, color: p.has_dosha ? "#f87171" : "#4ade80" }}>{p.has_dosha ? "Manglik H" + p.mars_house : "No Dosha"}</div>
                                {p.cancellations?.[0] && <div style={{ fontSize: 9, color: "#4ade80" }}>{p.cancellations[0]}</div>}
                              </div>
                            ))}
                            {kuja?.mutual_cancellation && <div style={{ fontSize: 10, color: "#4ade80" }}>✓ ఇద్దరికీ — రద్దు</div>}
                          </div>
                          <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "0.75rem" }}>
                            <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "0.5rem" }}>చంద్ర వివరాలు</div>
                            {[r.person1, r.person2].map((p: any, i: number) => p && (
                              <div key={i} style={{ marginBottom: 6 }}>
                                <div style={{ fontSize: 10, color: "var(--muted)" }}>{p.name}</div>
                                <div style={{ fontSize: 11, color: "var(--text)" }}>{p.moon_sign} · {p.moon_nakshatra}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Error */}
                  {!matchLoading && matchResults?.__error && (
                    <div style={{ textAlign: "center" as const, padding: "2rem", color: "#f87171", fontSize: 13 }}>
                      సరిపోలన లోడ్ చేయడంలో సమస్య. మళ్ళీ ప్రయత్నించండి.
                      <br />
                      <button onClick={() => setMatchResults({ __p2: matchResults.__p2 })} style={{ marginTop: 12, padding: "6px 14px", background: "none", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← వెనక్కి</button>
                    </div>
                  )}
                </div>
                );
              })()}

              {/* TRANSIT — now inside Dasha tab, this block intentionally removed */}
              {false && (
                <div className="tab-content">
                  {!workspaceData ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)", fontSize: 13 }}>
                      పహ్లగా చార్ట్ లోడ్ చేయండి — సెటప్ కార్డ్‌లో వివరాలు నమోదు చేయండి.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* Header row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 13, color: "var(--muted)", flex: 1 }}>
                          ప్రస్తుత దశ: <span style={{ color: "var(--accent)" }}>{workspaceData.mahadasha?.lord_te || workspaceData.mahadasha?.lord_en || "—"}</span> / <span style={{ color: "var(--fg)" }}>{workspaceData.current_antardasha?.lord_te || workspaceData.current_antardasha?.lord_en || "—"}</span> / <span style={{ color: "var(--muted)" }}>{workspaceData.current_pratyantardasha?.lord_te || workspaceData.current_pratyantardasha?.lord_en || "—"}</span>
                        </div>
                        <input
                          type="date"
                          value={transitDate}
                          onChange={e => setTransitDate(e.target.value)}
                          style={{ padding: "5px 10px", background: "var(--card)", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--fg)", fontSize: 12, fontFamily: "inherit" }}
                        />
                        <button
                          onClick={async () => {
                            if (!workspaceData) return;
                            setTransitLoading(true);
                            try {
                              const res = await axios.post(`${API_URL}/transit/analyze`, {
                                natal: workspaceData,
                                transit_date: transitDate || undefined,
                                latitude: workspaceData.latitude || 17.385,
                                longitude: workspaceData.longitude || 78.4867,
                                timezone_offset: 5.5,
                              });
                              setTransitData(res.data);
                            } catch { setTransitData(null); }
                            setTransitLoading(false);
                          }}
                          style={{ padding: "6px 16px", background: "var(--accent)", border: "none", borderRadius: 6, color: "#000", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                        >
                          {transitLoading ? "లోడ్..." : "గోచారం చూడు"}
                        </button>
                      </div>

                      {/* Auto-load on first visit */}
                      {!transitData && !transitLoading && (
                        <div style={{ textAlign: "center", padding: "1rem", color: "var(--muted)", fontSize: 12 }}>
                          పై బటన్ నొక్కి నేటి గోచారం చూడండి.
                        </div>
                      )}

                      {/* Sade Sati Warning */}
                      {transitData?.sade_sati?.active && (
                        <div style={{ padding: "10px 14px", background: "rgba(251,191,36,0.08)", border: "0.5px solid rgba(251,191,36,0.3)", borderRadius: 8, fontSize: 12 }}>
                          <span style={{ color: "#fbbf24", fontWeight: 600 }}>⚠ సాడేసాతి అక్టివ్</span>
                          <span style={{ color: "var(--muted)", marginLeft: 8 }}>
                            {transitData.sade_sati.phase} — చంద్ర రాశి: {transitData.sade_sati.natal_moon_sign}, శని ప్రస్తుత రాశి: {transitData.sade_sati.saturn_in}
                          </span>
                        </div>
                      )}

                      {/* Transit table */}
                      {transitData?.transits && (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: "0.5px solid var(--border2)", color: "var(--muted)" }}>
                                <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 500 }}>గ్రహం</th>
                                <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 500 }}>రాశి</th>
                                <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 500 }}>నక్షత్రం</th>
                                <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 500 }}>స్టార్‌లార్డ్</th>
                                <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 500 }}>సబ్‌లార్డ్</th>
                                <th style={{ textAlign: "center", padding: "6px 8px", fontWeight: 500 }}>భావం</th>
                                <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 500 }}>వివరణ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transitData.transits.map((t: any) => {
                                const isDasha = t.is_dasha_lord;
                                const isBhukti = t.is_bhukti_lord;
                                const isAntara = t.is_antara_lord;
                                const rowBg = isDasha
                                  ? "rgba(201,169,110,0.12)"
                                  : isBhukti
                                  ? "rgba(201,169,110,0.06)"
                                  : "transparent";
                                const nameColor = isDasha
                                  ? "var(--accent)"
                                  : isBhukti
                                  ? "var(--fg)"
                                  : "var(--muted)";
                                return (
                                  <tr key={t.planet} style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)", background: rowBg }}>
                                    <td style={{ padding: "7px 8px", color: nameColor, fontWeight: isDasha || isBhukti ? 600 : 400 }}>
                                      {t.symbol} {t.planet}
                                      {t.retrograde && <span style={{ color: "#f87171", fontSize: 10, marginLeft: 4 }}>℞</span>}
                                      {isDasha && <span style={{ marginLeft: 5, fontSize: 9, color: "var(--accent)", background: "rgba(201,169,110,0.2)", padding: "1px 5px", borderRadius: 4 }}>MD</span>}
                                      {isBhukti && !isDasha && <span style={{ marginLeft: 5, fontSize: 9, color: "var(--fg)", background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>AD</span>}
                                      {isAntara && !isDasha && !isBhukti && <span style={{ marginLeft: 5, fontSize: 9, color: "var(--muted)", background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: 4 }}>PAD</span>}
                                    </td>
                                    <td style={{ padding: "7px 8px", color: "var(--fg)" }}>{t.sign}</td>
                                    <td style={{ padding: "7px 8px", color: "var(--muted)" }}>{t.nakshatra}</td>
                                    <td style={{ padding: "7px 8px", color: "var(--fg)" }}>{t.star_lord}</td>
                                    <td style={{ padding: "7px 8px", color: "var(--fg)" }}>{t.sub_lord}</td>
                                    <td style={{ padding: "7px 8px", textAlign: "center" }}>
                                      <span style={{ display: "inline-block", padding: "2px 8px", background: "rgba(201,169,110,0.15)", borderRadius: 10, color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>
                                        H{t.transit_house}
                                      </span>
                                      {t.over_natal_position && (
                                        <span style={{ marginLeft: 4, fontSize: 9, color: "#34d399" }} title="Transiting over natal position">●</span>
                                      )}
                                    </td>
                                    <td style={{ padding: "7px 8px", color: "var(--muted)", fontSize: 11, maxWidth: 200 }}>
                                      {t.note}
                                      {t.natal_houses_activated?.length > 0 && (
                                        <span style={{ color: "#34d399", marginLeft: 4 }}>
                                          (నాటల్ H{t.natal_houses_activated.join("/")})
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* KP interpretation summary */}
                      {transitData?.transits && (
                        <div style={{ padding: "10px 14px", background: "var(--card)", border: "0.5px solid var(--border2)", borderRadius: 8, fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
                          <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 6 }}>KP గోచార సూత్రం</div>
                          దశాధిపతి & అంతర్దశాధిపతి గ్రహాలు మాత్రమే ప్రస్తుతం ఎక్కువ ఫలితాన్నిస్తాయి.
                          ట్రాన్‌జిట్ సబ్‌లార్డ్ కూడా సంబంధిత భావాలను సూచిస్తే — ఆ ఫలితం నిర్ధారణ.
                          <br />
                          <span style={{ color: "var(--fg)", fontSize: 11 }}>
                            ప్రస్తుత తేదీ: {transitData.transit_date}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* KP HORARY / PRASHNA */}
              {activeTab === "horary" && (
                <div className="tab-content">
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>
                    {/* Intro */}
                    <div style={{ padding: "10px 14px", background: "rgba(201,169,110,0.06)", border: "0.5px solid var(--border2)", borderRadius: 8, fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
                      <span style={{ color: "var(--accent)", fontWeight: 600 }}>KP ప్రశ్న జ్యోతిష్యం</span> — మీ మనసులో ఒక ప్రశ్న పెట్టుకొని 1 నుండి 249 మధ్య ఒక సంఖ్య చెప్పండి. ఆ సంఖ్య మీ లగ్నం నిర్ణయిస్తుంది.
                    </div>

                    {/* Step 1: Question + Topic */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>మీ ప్రశ్న</label>
                      <input
                        type="text"
                        placeholder="ప్రశ్న టైప్ చేయండి... (e.g. Will I get the job?)"
                        value={horaryQuestion}
                        onChange={e => setHoraryQuestion(e.target.value)}
                        style={{ padding: "8px 12px", background: "var(--card)", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--fg)", fontSize: 13, fontFamily: "inherit" }}
                      />
                      <label style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginTop: 4 }}>విషయం (Topic)</label>
                      <select
                        value={horaryTopic}
                        onChange={e => setHoraryTopic(e.target.value)}
                        style={{ padding: "7px 12px", background: "var(--card)", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--fg)", fontSize: 12, fontFamily: "inherit" }}
                      >
                        {[["general","సాధారణ — General"],["marriage","వివాహం — Marriage"],["career","ఉద్యోగం — Career"],["health","ఆరోగ్యం — Health"],["property","ఆస్తి — Property"],["finance","ధనం — Finance"],["children","సంతానం — Children"],["travel","ప్రయాణం — Travel"],["education","విద్య — Education"],["legal","వ్యాజ్యం — Legal"]].map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>

                    {/* Step 2: Number picker */}
                    <div>
                      <label style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>సంఖ్య ఎంచుకోండి (1-249)</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
                          <input
                            type="number"
                            min={1} max={249}
                            value={horaryNumber}
                            onChange={e => setHoraryNumber(e.target.value === "" ? "" : Math.max(1, Math.min(249, parseInt(e.target.value) || 1)))}
                            placeholder="1 - 249"
                            style={{ padding: "8px 12px", background: "var(--card)", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--fg)", fontSize: 22, fontFamily: "inherit", fontWeight: 700, width: 110, textAlign: "center" as const }}
                          />
                          <button
                            onClick={() => {
                              let n = Math.floor(Math.random() * 249) + 1;
                              setHoraryNumber(n);
                            }}
                            style={{ padding: "4px 18px", background: "rgba(201,169,110,0.1)", border: "0.5px solid var(--border2)", borderRadius: 5, color: "var(--accent)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", width: "100%" }}
                          >🎲 రాండమ్</button>
                        </div>
                        <button
                          onClick={async () => {
                            if (!horaryNumber || !horaryQuestion.trim()) return;
                            setHoraryLoading(true);
                            try {
                              const res = await axios.post(`${API_URL}/horary/analyze`, {
                                number: horaryNumber,
                                question: horaryQuestion,
                                topic: horaryTopic,
                                latitude: workspaceData?.latitude || 17.385,
                                longitude: workspaceData?.longitude || 78.4867,
                                timezone_offset: 5.5,
                              });
                              setHoraryResult(res.data);
                            } catch { setHoraryResult(null); }
                            setHoraryLoading(false);
                          }}
                          disabled={!horaryNumber || !horaryQuestion.trim() || horaryLoading}
                          style={{ padding: "8px 20px", background: "var(--accent)", border: "none", borderRadius: 6, color: "#000", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, opacity: (!horaryNumber || !horaryQuestion.trim()) ? 0.5 : 1 }}
                        >
                          {horaryLoading ? "లోడ్..." : "ఫలితం చూడు"}
                        </button>
                      </div>
                    </div>

                    {/* Results */}
                    {horaryResult && (() => {
                      const r = horaryResult;
                      const v = r.verdict || {};
                      const verdictColor = v.verdict === "YES" ? "#34d399" : v.verdict === "NO" ? "#f87171" : "#fbbf24";
                      const confColor = v.confidence === "HIGH" ? "#34d399" : v.confidence === "MEDIUM" ? "#fbbf24" : "#888899";
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {/* Verdict banner — redesigned */}
                          <div style={{ textAlign: "center", padding: "1.5rem 1rem", background: "var(--surface2)", borderRadius: 10, marginBottom: 4 }}>
                            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 44, fontWeight: 400, color: verdictColor, marginBottom: 6, lineHeight: 1 }}>
                              {v.verdict || "MAYBE"}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}>
                              <span style={{ fontSize: 11, color: confColor }}>
                                {v.confidence === "HIGH" ? "●" : v.confidence === "MEDIUM" ? "◐" : "○"}
                              </span>
                              <span style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em" }}>{v.confidence || "LOW"} CONFIDENCE</span>
                              {v.rp_confirms_csl && <span style={{ fontSize: 10, background: "rgba(52,211,153,0.1)", color: "#34d399", border: "0.5px solid rgba(52,211,153,0.2)", borderRadius: 4, padding: "2px 6px" }}>RP ✓</span>}
                              {v.moon_supports && <span style={{ fontSize: 10, background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 4, padding: "2px 6px" }}>Moon ✓</span>}
                            </div>
                            {v.ruling_planets?.length > 0 && (
                              <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", marginBottom: 8 }}>
                                {v.ruling_planets.map((rp: string) => (
                                  <span key={rp} style={{ fontSize: 11, background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 20, padding: "3px 10px" }}>{rp}</span>
                                ))}
                              </div>
                            )}
                            {(v.verdict_reason || v.explanation) && (
                              <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.5, maxWidth: 360, margin: "0 auto" }}>{v.verdict_reason || v.explanation}</div>
                            )}
                          </div>

                          {/* 3-Layer Analysis */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>3-స్థాయి KP విశ్లేషణ</div>
                            {/* Layer 1: Lagna CSL */}
                            <div style={{ padding: "8px 12px", background: "var(--card)", border: "0.5px solid var(--border2)", borderRadius: 7 }}>
                              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>స్థాయి 1 — లగ్న CSL (ప్రశ్న ఫలప్రదమా?)</div>
                              <div style={{ fontSize: 12, color: "var(--fg)" }}>
                                <span style={{ color: "var(--accent)", fontWeight: 600 }}>{v.lagna_csl}</span>
                                {" → H"}{(v.lagna_csl_significations || []).join(", H")}
                                <span style={{ marginLeft: 8, color: v.lagna_fruitful ? "#34d399" : "#f87171", fontSize: 11 }}>
                                  {v.lagna_fruitful ? "✓ ఫలప్రదం" : "✗ నిరుపయోగం"}
                                </span>
                              </div>
                            </div>
                            {/* Layer 2: Query House CSL */}
                            <div style={{ padding: "8px 12px", background: "var(--card)", border: "0.5px solid var(--border2)", borderRadius: 7 }}>
                              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>స్థాయి 2 — H{v.query_house} CSL (నిజమైన నిర్ణయం)</div>
                              <div style={{ fontSize: 12, color: "var(--fg)" }}>
                                <span style={{ color: "var(--accent)", fontWeight: 600 }}>{v.query_csl}</span>
                                {" → H"}{(v.query_csl_significations || []).join(", H")}
                                {v.h2_supports && <span style={{ marginLeft: 6, fontSize: 10, color: "#34d399" }}>H2✓</span>}
                                {v.h11_supports && <span style={{ marginLeft: 4, fontSize: 10, color: "#34d399" }}>H11✓</span>}
                              </div>
                            </div>
                            {/* Layer 3: Ruling Planets */}
                            <div style={{ padding: "8px 12px", background: "var(--card)", border: "0.5px solid var(--border2)", borderRadius: 7 }}>
                              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>స్థాయి 3 — నియమిత గ్రహాలు (నిర్ధారణ)</div>
                              <div style={{ fontSize: 12, color: "var(--fg)", display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                                {(v.ruling_planets || []).map((rp: string) => (
                                  <span key={rp} style={{
                                    padding: "2px 8px", borderRadius: 10, fontSize: 11,
                                    background: (v.rp_signifying_yes || []).includes(rp) ? "rgba(52,211,153,0.12)" : "var(--surface2)",
                                    color: (v.rp_signifying_yes || []).includes(rp) ? "#34d399" : "var(--muted)",
                                    border: rp === v.query_csl ? "0.5px solid var(--accent)" : "0.5px solid var(--border2)"
                                  }}>{rp}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Lagna info grid */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {[
                              ["ప్రశ్న సంఖ్య", `#${r.prashna_number}`],
                              ["లగ్న రాశి", `${r.lagna?.sign} ${r.lagna?.longitude?.toFixed(2)}°`],
                              ["లగ్న నక్షత్రం", r.lagna?.nakshatra],
                              ["లగ్న స్టార్‌లార్డ్", r.lagna?.star_lord],
                              ["లగ్న సబ్‌లార్డ్", r.lagna?.sub_lord],
                              ["అనుకూల భావాలు", (v.yes_houses || []).map((h: number) => `H${h}`).join(", ")],
                            ].map(([label, val]) => (
                              <div key={label} style={{ padding: "7px 10px", background: "var(--card)", border: "0.5px solid var(--border2)", borderRadius: 6 }}>
                                <div style={{ fontSize: 9, color: "var(--accent)", marginBottom: 2 }}>{label}</div>
                                <div style={{ fontSize: 12, color: "var(--fg)", fontWeight: 500 }}>{val}</div>
                              </div>
                            ))}
                          </div>

                          {/* Planet table */}
                          <div style={{ overflowX: "auto" }}>
                            <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 6, fontWeight: 600 }}>ప్రశ్న కుండలి గ్రహాలు</div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                              <thead>
                                <tr style={{ borderBottom: "0.5px solid var(--border2)", color: "var(--muted)" }}>
                                  {["గ్రహం","రాశి","నక్షత్రం","సబ్‌లార్డ్","భావం","కారకత్వాలు"].map(h => (
                                    <th key={h} style={{ textAlign: "left", padding: "5px 7px", fontWeight: 500 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {(r.planets || []).map((p: any) => (
                                  <tr key={p.planet} style={{ borderBottom: "0.5px solid rgba(255,255,255,0.04)", background: p.is_ruling_planet ? "rgba(201,169,110,0.04)" : "transparent" }}>
                                    <td style={{ padding: "5px 7px", color: p.is_ruling_planet ? "var(--accent)" : "var(--fg)", fontWeight: p.is_ruling_planet ? 600 : 400 }}>
                                      {p.planet}{p.retrograde && <span style={{ color: "#f87171", fontSize: 9, marginLeft: 3 }}>℞</span>}
                                      {p.is_ruling_planet && <span style={{ color: "var(--accent)", fontSize: 8, marginLeft: 3 }}>RP</span>}
                                    </td>
                                    <td style={{ padding: "5px 7px", color: "var(--muted)" }}>{p.sign}</td>
                                    <td style={{ padding: "5px 7px", color: "var(--muted)" }}>{p.nakshatra}</td>
                                    <td style={{ padding: "5px 7px", color: "var(--fg)" }}>{p.sub_lord}</td>
                                    <td style={{ padding: "5px 7px", textAlign: "center" }}>
                                      <span style={{ background: "rgba(201,169,110,0.15)", color: "var(--accent)", padding: "1px 6px", borderRadius: 8, fontSize: 10 }}>H{p.house}</span>
                                    </td>
                                    <td style={{ padding: "5px 7px", color: "var(--muted)", fontSize: 10 }}>{(p.significations || []).map((h: number) => `H${h}`).join(", ")}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <button onClick={() => { setHoraryResult(null); setHoraryNumber(""); setHoraryQuestion(""); }}
                            style={{ alignSelf: "flex-start", padding: "6px 14px", background: "none", border: "0.5px solid var(--border2)", borderRadius: 6, color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                            ← కొత్త ప్రశ్న
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* ANALYSIS */}
              {activeTab === "analysis" && (
                <div className="tab-content" style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
                  {/* Topic quick-launch — emoji card grid */}
                  <div style={{ marginBottom: "0.75rem", flexShrink: 0 }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      {analysisMessages.length > 0 && (
                        <button onClick={() => { setAnalysisMessages([]); setActiveTopic(""); }} style={{ background: "transparent", border: "0.5px solid var(--border2)", borderRadius: 4, padding: "3px 10px", fontSize: 11, color: "var(--muted)", cursor: "pointer" }}>Clear</button>
                      )}
                      <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 6, border: "0.5px solid var(--border2)", overflow: "hidden" }}>
                        {([["english", "EN"], ["telugu_english", "తె+EN"]] as const).map(([val, label]) => (
                          <button key={val} onClick={() => setAnalysisLang(val)} style={{ padding: "4px 10px", background: analysisLang === val ? "rgba(201,169,110,0.15)" : "transparent", color: analysisLang === val ? "var(--accent)" : "var(--muted)", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                      {TOPICS.map(t => (
                        <button key={t.id} onClick={() => handleTopicAnalysis(t.id)} disabled={analysisLoading}
                          style={{ padding: "10px 6px", borderRadius: 10, border: `0.5px solid ${activeTopic === t.id ? "var(--accent)" : "var(--border2)"}`, background: activeTopic === t.id ? "rgba(201,169,110,0.15)" : "var(--surface2)", cursor: analysisLoading ? "default" : "pointer", fontFamily: "inherit", textAlign: "center", transition: "all 0.2s" }}
                          onMouseEnter={e => { if (activeTopic !== t.id) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,169,110,0.4)"; }}
                          onMouseLeave={e => { if (activeTopic !== t.id) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border2)"; }}>
                          <div style={{ fontSize: 22, marginBottom: 4 }}>{TOPIC_EMOJI[t.id]}</div>
                          <div style={{ fontSize: 11, color: activeTopic === t.id ? "var(--accent)" : "var(--text)", fontWeight: activeTopic === t.id ? 500 : 400 }}>{t.te}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat messages */}
                  <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                    {analysisMessages.length === 0 && !analysisLoading && (
                      <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>⬆</div>
                        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 4 }}>పై నుండి అంశాన్ని ఎంచుకోండి</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", opacity: 0.6 }}>or type your question below</div>
                      </div>
                    )}
                    {analysisMessages.map((msg, i) => (
                      <div key={i} style={{ marginBottom: "1.25rem" }}>
                        {/* Question label */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <div style={{ width: 18, height: 18, borderRadius: "50%", background: msg.isTopic ? "rgba(201,169,110,0.15)" : "rgba(255,255,255,0.06)", border: `0.5px solid ${msg.isTopic ? "rgba(201,169,110,0.4)" : "var(--border2)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: msg.isTopic ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}>
                            {msg.isTopic ? "◈" : "↳"}
                          </div>
                          <span style={{ fontSize: 11, color: msg.isTopic ? "var(--accent)" : "var(--text)", fontWeight: msg.isTopic ? 500 : 400 }}>{msg.q}</span>
                          {i > 0 && <span style={{ fontSize: 9, color: "var(--muted)", marginLeft: "auto" }}>follow-up</span>}
                        </div>
                        {/* Answer */}
                        <div className="md-body" style={{ background: i === analysisMessages.length - 1 ? "var(--surface)" : "rgba(201,169,110,0.02)", border: `0.5px solid ${i === analysisMessages.length - 1 ? "var(--border2)" : "var(--border)"}`, borderRadius: 10, padding: "1rem 1.25rem", marginLeft: 24 }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.a}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                    {analysisLoading && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 13, padding: "0.75rem 0", marginLeft: 24 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                        {activeTopic ? `Analyzing ${activeTopic}...` : "Thinking..."}
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>
              )}
            </div>

            {/* Chat input */}
            <div style={{ borderTop: "0.5px solid var(--border)", padding: "0.75rem 1.25rem", background: "var(--surface)", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              <input value={chatQ} onChange={e => setChatQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleWorkspaceChat(); }} placeholder="లోతైన విశ్లేషణ కోసం అడగండి..."
                style={{ flex: 1, background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit" }} />
              <button onClick={handleWorkspaceChat} disabled={analysisLoading || !chatQ.trim()}
                style={{ background: chatQ.trim() ? "var(--accent)" : "var(--surface2)", color: chatQ.trim() ? "#09090f" : "var(--muted)", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: chatQ.trim() ? "pointer" : "default", fontWeight: 500, fontFamily: "inherit" }}>అడగు</button>
            </div>
          </div>
        </div>
      )}

      {/* ── USER CHAT ── */}
      {setupDone && mode === "user" && (
        <main style={{ flex: 1, position: "relative", zIndex: 5, maxWidth: 760, margin: "0 auto", width: "100%", padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
            {/* Chart summary bar */}
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 10, padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", gap: 14, marginBottom: "0.75rem", flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface2)", border: "0.5px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>{birthDetails.name[0]?.toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{birthDetails.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{birthDetails.date} · {birthDetails.time} {birthDetails.ampm} · {birthDetails.place}</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <span style={{ fontSize: 10, background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid rgba(201,169,110,0.2)", borderRadius: 4, padding: "3px 8px" }}>KP New</span>
              </div>
            </div>

            {/* Collapsible chart details */}
            {chartData && (
              <div style={{ marginBottom: "0.75rem", flexShrink: 0 }}>
                <button onClick={() => setShowChartDetails(!showChartDetails)} style={{ width: "100%", background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: showChartDetails ? "8px 8px 0 0" : 8, padding: "0.75rem 1.25rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--muted)", fontSize: 12, letterSpacing: "0.04em" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "var(--accent)", fontSize: 14 }}>◈</span>Chart Details</span>
                  <span style={{ fontSize: 10 }}>{showChartDetails ? "▲ Hide" : "▼ Show"}</span>
                </button>
                {showChartDetails && (
                  <div style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "1.25rem", overflowX: "auto", maxHeight: "40vh", overflowY: "auto" }}>
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.75rem" }}>Planet Positions</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 400 }}>
                        <thead><tr>{["Planet", "Sign", "Degree", "Nakshatra", "Star Lord", "Sub Lord"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" as const, borderBottom: "0.5px solid var(--border)", fontWeight: 400 }}>{h}</th>)}</tr></thead>
                        <tbody>
                          {chartData.chart && Object.entries(chartData.chart.planets).map(([planet, data]: [string, any]) => (
                            <tr key={planet} style={{ borderBottom: "0.5px solid var(--border)" }}>
                              <td style={{ padding: "8px 10px", color: "var(--accent2)", fontWeight: 500 }}>{planet}</td>
                              <td style={{ padding: "8px 10px", color: "var(--text)" }}>{data.sign}</td>
                              <td style={{ padding: "8px 10px", color: "var(--muted)", fontSize: 11 }}>{data.longitude?.toFixed(2)}°</td>
                              <td style={{ padding: "8px 10px", color: "var(--text)" }}>{data.nakshatra}</td>
                              <td style={{ padding: "8px 10px", color: "var(--text)" }}>{data.star_lord}</td>
                              <td style={{ padding: "8px 10px" }}><span style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid rgba(201,169,110,0.2)", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{data.sub_lord}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {chartData.dashas?.current_mahadasha && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "0.5rem" }}>Current Dasha</div>
                        <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "0.875rem", border: "0.5px solid var(--border)", marginBottom: "0.5rem" }}>
                          <div style={{ fontSize: 10, color: "var(--muted)" }}>Mahadasha</div>
                          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--accent2)" }}>{chartData.dashas.current_mahadasha.lord}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)" }}>{chartData.dashas.current_mahadasha.start} → {chartData.dashas.current_mahadasha.end}</div>
                          {chartData.dashas.current_antardasha && (
                            <div style={{ paddingTop: "0.5rem", borderTop: "0.5px solid var(--border)", marginTop: "0.5rem" }}>
                              <div style={{ fontSize: 10, color: "var(--muted)" }}>Antardasha</div>
                              <div style={{ fontSize: 14, color: "var(--text)" }}>{chartData.dashas.current_antardasha.antardasha_lord}</div>
                              <div style={{ fontSize: 10, color: "var(--muted)" }}>{chartData.dashas.current_antardasha.start} → {chartData.dashas.current_antardasha.end}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, minHeight: 0 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                  <div style={{ fontSize: 24, marginBottom: "0.75rem", opacity: 0.3 }}>✦</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>Your chart is ready. Ask anything about your life.</div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: "1.25rem", flexWrap: "wrap" }}>
                    {["Will I get a good job soon?", "When will I get married?", "Should I travel abroad?", "How is my health this year?"].map(q => (
                      <button key={q} onClick={() => setQuestion(q)} style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 20, padding: "6px 14px", fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} style={{ marginBottom: "1.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
                    <div style={{ background: "var(--accent)", color: "#09090f", borderRadius: "12px 12px 2px 12px", padding: "10px 16px", fontSize: 14, maxWidth: "78%", lineHeight: 1.6 }}>{msg.question}</div>
                  </div>
                  <div style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: "2px 12px 12px 12px", padding: "1.25rem", maxWidth: "94%" }}>
                    {/* 3-state promise badge */}
                    {msg.analysis && (
                      <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
                        <PromiseBadge analysis={msg.analysis} />
                        {msg.analysis.current_dasha?.mahadasha && <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "rgba(201,169,110,0.08)", color: "var(--accent)", border: "0.5px solid rgba(201,169,110,0.15)" }}>{msg.analysis.current_dasha.mahadasha.lord}–{msg.analysis.current_dasha.antardasha?.antardasha_lord} Dasha</span>}
                        {msg.analysis.timing_analysis?.timing_favorable && <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "rgba(201,169,110,0.08)", color: "var(--accent2)", border: "0.5px solid rgba(201,169,110,0.15)" }}>⏱ Timing Active</span>}
                      </div>
                    )}
                    <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.answer}</ReactMarkdown></div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: "0.75rem" }}>{msg.timestamp}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "1rem", paddingTop: "1rem", borderTop: "0.5px solid var(--border)" }}>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>Accurate?</span>
                      <button onClick={() => handleFeedback(msg.id, "correct")} style={{ padding: "3px 12px", borderRadius: 4, border: "0.5px solid", fontSize: 11, cursor: "pointer", background: "transparent", borderColor: msg.feedback === "correct" ? "var(--green)" : "var(--border2)", color: msg.feedback === "correct" ? "var(--green)" : "var(--muted)" }}>✓ Correct</button>
                      <button onClick={() => handleFeedback(msg.id, "incorrect")} style={{ padding: "3px 12px", borderRadius: 4, border: "0.5px solid", fontSize: 11, cursor: "pointer", background: "transparent", borderColor: msg.feedback === "incorrect" ? "var(--red)" : "var(--border2)", color: msg.feedback === "incorrect" ? "var(--red)" : "var(--muted)" }}>✗ Incorrect</button>
                      <button onClick={() => { setActiveNote(msg.id); setNoteInput(msg.note || ""); }} style={{ padding: "3px 12px", borderRadius: 4, border: "0.5px solid var(--border2)", fontSize: 11, cursor: "pointer", background: "transparent", color: "var(--muted)", marginLeft: "auto" }}><MessageCircle size={11} style={{ display: "inline", marginRight: 4 }} />{msg.note ? "Edit note" : "Add note"}</button>
                    </div>
                    {activeNote === msg.id && (
                      <div style={{ marginTop: "0.75rem" }}>
                        <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} rows={3} style={{ width: "100%", background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--text)", outline: "none", resize: "none" }} />
                        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                          <button onClick={() => handleNoteSubmit(msg.id)} style={{ background: "var(--accent)", color: "#09090f", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>Save note</button>
                          <button onClick={() => setActiveNote(null)} style={{ background: "transparent", color: "var(--muted)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "1.5rem" }}>
                  <div style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: "2px 12px 12px 12px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 13 }}>
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />Analyzing your chart...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="chat-input-container" style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 12, padding: "0.875rem 1rem", display: "flex", alignItems: "flex-end", gap: 10, marginTop: "0.75rem", flexShrink: 0 }}>
              <textarea value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about career, marriage, travel, health... (Enter to send)" rows={2} style={{ flex: 1, background: "transparent", border: "none", color: "var(--text)", fontSize: 14, resize: "none", outline: "none", lineHeight: 1.6, fontFamily: "inherit" }} />
              <button onClick={handleAsk} disabled={loading || !question.trim()} style={{ background: question.trim() ? "var(--accent)" : "var(--surface2)", color: question.trim() ? "#09090f" : "var(--muted)", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 500, cursor: question.trim() ? "pointer" : "default", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s", flexShrink: 0 }}>
                {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowRight size={14} />}Ask
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
