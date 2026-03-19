"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import remarkGfm from "remark-gfm";
import axios from "axios";
import { ArrowRight, Loader2, CheckCircle, XCircle, MessageCircle, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";

const API_URL = "https://devastroai.up.railway.app";

const PLANET_COLORS: Record<string, string> = {
  Sun: "#F59E0B", Moon: "#93C5FD", Mars: "#EF4444",
  Mercury: "#34D399", Jupiter: "#FBBF24", Venus: "#F472B6",
  Saturn: "#94A3B8", Rahu: "#A78BFA", Ketu: "#FB923C",
};

// ── South Indian Chart ────────────────────────────────────────
function SouthIndianChart({ planets, cusps }: { planets: any[]; cusps: any[] }) {
  const houseOrder = [12, 1, 2, 3, 11, 0, 0, 4, 10, 0, 0, 5, 9, 8, 7, 6];
  const planetsByHouse: Record<number, any[]> = {};
  planets.forEach(p => {
    const h = parseInt(p.house) || 0;
    if (!planetsByHouse[h]) planetsByHouse[h] = [];
    planetsByHouse[h].push(p);
  });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, width: "100%", maxWidth: 380, border: "0.5px solid rgba(201,169,110,0.3)", borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
      {houseOrder.map((house, idx) => {
        const isCenter = [5, 6, 9, 10].includes(idx);
        if (house === 0) return (
          <div key={idx} style={{ background: "rgba(201,169,110,0.02)", minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center", border: "0.5px solid rgba(201,169,110,0.06)" }}>
            {isCenter && idx === 5 && <span style={{ color: "rgba(201,169,110,0.15)", fontSize: 20 }}>✦</span>}
          </div>
        );
        const hp = planetsByHouse[house] || [];
        const cusp = cusps[house - 1];
        const isLagna = house === 1;
        return (
          <div key={idx} style={{ background: isLagna ? "rgba(201,169,110,0.07)" : "rgba(201,169,110,0.015)", border: `0.5px solid ${isLagna ? "rgba(201,169,110,0.3)" : "rgba(201,169,110,0.12)"}`, padding: "4px 5px", minHeight: 90, display: "flex", flexDirection: "column", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,169,110,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.background = isLagna ? "rgba(201,169,110,0.07)" : "rgba(201,169,110,0.015)")}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 8, color: isLagna ? "var(--accent)" : "rgba(201,169,110,0.45)", fontWeight: isLagna ? 700 : 400 }}>{house}{isLagna ? "↑" : ""}</span>
              <span style={{ fontSize: 7, color: "rgba(201,169,110,0.3)" }}>{cusp?.degree_in_sign?.toFixed(0)}°</span>
            </div>
            <div style={{ fontSize: 7, color: "rgba(201,169,110,0.35)", marginBottom: 3 }}>{cusp?.sign_te?.slice(0, 4) || ""}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              {hp.map((p: any) => (
                <div key={p.planet_en} title={`${p.planet_en} | ${p.nakshatra_en} | ${p.degree_in_sign.toFixed(1)}° | Star: ${p.star_lord_en} | Sub: ${p.sub_lord_en}`} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: PLANET_COLORS[p.planet_en] || "#888" }}>{p.planet_short}{p.retrograde ? "℞" : ""}</span>
                  <span style={{ fontSize: 7, color: `${PLANET_COLORS[p.planet_en]}80` }}>{p.degree_in_sign.toFixed(0)}°</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Dasha Timeline ────────────────────────────────────────────
function DashaTimeline({ mahadasha, antardashas }: { mahadasha: any; antardashas: any[] }) {
  const today = new Date();
  const mdStart = new Date(mahadasha.start);
  const mdEnd = new Date(mahadasha.end);
  const pct = Math.min(100, ((today.getTime() - mdStart.getTime()) / (mdEnd.getTime() - mdStart.getTime())) * 100);
  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{mahadasha.lord_te} మహాదశ</span>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>{mahadasha.start} → {mahadasha.end}</span>
        </div>
        <div style={{ background: "var(--surface2)", borderRadius: 4, height: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${PLANET_COLORS[mahadasha.lord_en] || "var(--accent)"}, transparent)`, width: `${pct}%`, transition: "width 0.5s" }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {antardashas.slice(0, 12).map((ad: any, i: number) => {
          const isPast = new Date(ad.end) < today;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: ad.is_current ? "rgba(201,169,110,0.12)" : isPast ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)", border: ad.is_current ? "0.5px solid rgba(201,169,110,0.4)" : "0.5px solid var(--border)", opacity: isPast ? 0.5 : 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: ad.is_current ? PLANET_COLORS[ad.lord_en] || "var(--accent)" : "var(--border2)", boxShadow: ad.is_current ? `0 0 8px ${PLANET_COLORS[ad.lord_en] || "var(--accent)"}` : "none", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: ad.is_current ? 600 : 400, color: ad.is_current ? PLANET_COLORS[ad.lord_en] || "var(--accent)" : "var(--text)", minWidth: 80 }}>{ad.lord_te}</span>
              <span style={{ fontSize: 10, color: "var(--muted)", flex: 1 }}>{ad.start} → {ad.end}</span>
              {ad.is_current && <span style={{ fontSize: 9, background: "rgba(201,169,110,0.2)", color: "var(--accent)", padding: "2px 6px", borderRadius: 3 }}>ప్రస్తుతం</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Panchangam Card ───────────────────────────────────────────
function PanchangamCard({ data, title }: { data: any; title: string }) {
  return (
    <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "1rem" }}>
      <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.75rem" }}>{title} · {data.date} · {data.time}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[{ l: "వారం", v: data.vara, sub: data.vara_en }, { l: "తిథి", v: data.tithi, sub: `#${data.tithi_num}` }, { l: "నక్షత్రం", v: data.nakshatra, sub: data.nakshatra_en }, { l: "యోగం", v: data.yoga, sub: data.yoga_en }].map(item => (
          <div key={item.l} style={{ background: "rgba(201,169,110,0.03)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "0.625rem" }}>
            <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 2 }}>{item.l}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{item.v}</div>
            <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 1 }}>{item.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(248,113,113,0.08)", border: "0.5px solid rgba(248,113,113,0.2)", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#f87171" }}>రాహుకాలం</span>
        <span style={{ fontSize: 12, color: "#f87171", fontWeight: 500 }}>{data.rahu_kalam}</span>
        <span style={{ fontSize: 9, color: "rgba(248,113,113,0.6)" }}>నివారించండి</span>
      </div>
    </div>
  );
}

// ── Promise Badge — 3 states ──────────────────────────────────
function PromiseBadge({ analysis }: { analysis: any }) {
  if (!analysis?.promise_analysis) return null;
  const p = analysis.promise_analysis;
  const strength = (p.promise_strength || "").toLowerCase();
  const isPromised = p.is_promised;
  const isConditional = !isPromised && (strength.includes("conditional") || strength.includes("partial") || strength.includes("weak"));

  if (isPromised) return (
    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "rgba(52,211,153,0.1)", color: "var(--green)", border: "0.5px solid rgba(52,211,153,0.2)" }}>✓ Promised</span>
  );
  if (isConditional) return (
    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "0.5px solid rgba(251,191,36,0.2)" }}>⚡ Conditional</span>
  );
  return (
    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "rgba(248,113,113,0.1)", color: "var(--red)", border: "0.5px solid rgba(248,113,113,0.2)" }}>✗ Not Promised</span>
  );
}

// ── Interfaces ────────────────────────────────────────────────
interface PlaceSuggestion { name: string; display: string; lat: number; lon: number; }
interface BirthDetails { name: string; date: string; time: string; ampm: string; place: string; latitude: number | null; longitude: number | null; }
interface Message { id: string; question: string; answer: string; analysis: any; timestamp: string; feedback?: "correct" | "incorrect"; note?: string; }

// ── Main Component ────────────────────────────────────────────
export default function Home() {
  const [mode, setMode] = useState<"user" | "astrologer">("user");
  const [birthDetails, setBirthDetails] = useState<BirthDetails>({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: null, longitude: null });
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
  const [analysisResult, setAnalysisResult] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [chatQ, setChatQ] = useState("");
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string }[]>([]);
  const [analysisLang, setAnalysisLang] = useState<"english" | "telugu_english">("telugu_english");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const placeSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);
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

  const handleSetup = async () => {
    if (!birthDetails.name || !birthDetails.date || !birthDetails.time) { alert("Please fill in name, date, and time of birth."); return; }
    if (!birthDetails.latitude || !birthDetails.longitude) { alert("Please select a place from the dropdown or enter coordinates manually."); return; }
    const formattedDate = getFormattedDate();
    if (!formattedDate) { alert("Please enter date as DD/MM/YYYY"); return; }
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
    try {
      const res = await axios.post(`${API_URL}/astrologer/analyze`, { name: birthDetails.name, date: formattedDate, time: getTime24(), latitude: birthDetails.latitude, longitude: birthDetails.longitude, timezone_offset: 5.5, topic, question: `${topic} గురించి పూర్తి KP విశ్లేషణ`, history: [], language: analysisLang });
      setAnalysisResult(res.data.answer);
    } catch { setAnalysisResult("విశ్లేషణ విఫలమైంది."); }
    finally { setAnalysisLoading(false); }
  };

  const handleWorkspaceChat = async () => {
    if (!chatQ.trim()) return;
    const q = chatQ; setChatQ(""); setAnalysisLoading(true); setActiveTab("analysis");
    const formattedDate = getFormattedDate();
    try {
      const res = await axios.post(`${API_URL}/astrologer/analyze`, { name: birthDetails.name, date: formattedDate, time: getTime24(), latitude: birthDetails.latitude, longitude: birthDetails.longitude, timezone_offset: 5.5, topic: "general", question: q, history: chatHistory.slice(-4).map(h => ({ question: h.q, answer: h.a })), language: analysisLang });
      setChatHistory(prev => [...prev, { q, a: res.data.answer }]);
      setAnalysisResult(res.data.answer);
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
    setShowChartDetails(false); setAnalysisResult(""); setChatHistory([]);
    setActiveTopic(""); setActiveTab("chart"); setSidebarOpen(true);
    setBirthDetails({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: null, longitude: null });
    setPlaceStatus("idle");
  };

  const inputStyle: React.CSSProperties = { width: "100%", background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "var(--text)", outline: "none" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 };

  const TABS = [
    { id: "chart", label: "చార్ట్", en: "Chart" }, { id: "planets", label: "గ్రహాలు", en: "Planets" },
    { id: "cusps", label: "భావాలు", en: "Cusps" }, { id: "significators", label: "కారకాలు", en: "Significators" },
    { id: "dasha", label: "దశ", en: "Dasha" }, { id: "ruling", label: "రూలింగ్", en: "Ruling" },
    { id: "panchangam", label: "పంచాంగం", en: "Panchangam" }, { id: "analysis", label: "విశ్లేషణ", en: "Analysis" },
  ];

  const TOPICS = [
    { id: "marriage", te: "వివాహం" }, { id: "job", te: "ఉద్యోగం" }, { id: "health", te: "ఆరోగ్యం" },
    { id: "foreign_travel", te: "విదేశాలు" }, { id: "children", te: "సంతానం" }, { id: "education", te: "విద్య" },
    { id: "property", te: "ఆస్తి" }, { id: "wealth", te: "సంపద" },
  ];

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
          .tab-bar button { padding: 8px 10px !important; font-size: 11px !important; }
          .south-indian-chart { max-width: 100% !important; }
          .grid-4col { grid-template-columns: repeat(2, 1fr) !important; }
          .setup-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .workspace-sidebar { max-height: 180px; }
          nav { padding: 1rem !important; }
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
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 17, letterSpacing: "0.02em" }}>DevAstro<span style={{ color: "var(--accent)" }}>AI</span></div>
            <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>KP Astrology Intelligence</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {setupDone && mode === "astrologer" && <span style={{ fontSize: 10, background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 4, padding: "3px 10px" }}>జ్యోతిష్కుడు మోడ్</span>}
          {setupDone && <button onClick={resetAll} style={{ background: "transparent", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "6px 16px", fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>New Chart</button>}
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
              <div className="sidebar-section" style={{ padding: "1rem", borderBottom: "0.5px solid var(--border)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,169,110,0.1)", border: "0.5px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "var(--accent)", fontWeight: 600, marginBottom: 8 }}>{workspaceData.name[0]?.toUpperCase()}</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{workspaceData.name}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.6 }}>{birthDetails.date}<br />{birthDetails.time} {birthDetails.ampm}<br />{birthDetails.place}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                  <span style={{ fontSize: 9, background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 3, padding: "2px 6px" }}>KP New</span>
                  <span style={{ fontSize: 9, background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 3, padding: "2px 6px" }}>Placidus</span>
                </div>
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
                <div className="tab-content" style={{ display: "flex", gap: "1.5rem", alignItems: "start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.6rem" }}>దక్షిణ భారత చార్ట్</div>
                    <SouthIndianChart planets={workspaceData.planets} cusps={workspaceData.cusps} />
                    <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 6, textAlign: "center" }}>Hover for details · ↑ = Lagna</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
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
                  </div>
                </div>
              )}

              {/* PLANETS */}
              {activeTab === "planets" && (
                <div className="tab-content" style={{ overflowX: "auto" }}>
                  <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.75rem" }}>గ్రహ స్థాన పట్టిక · KP పద్ధతి</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
                    <thead><tr>{["గ్రహం", "భావం", "రాశి", "అంశం", "నక్షత్రం", "నక్షత్రాధిపతి", "సబ్ లార్డ్"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", borderBottom: "0.5px solid var(--border)", fontWeight: 400, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {workspaceData.planets.map((p: any) => (
                        <tr key={p.planet_en} style={{ borderBottom: "0.5px solid rgba(201,169,110,.06)" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td style={{ padding: "9px 10px", color: PLANET_COLORS[p.planet_en], fontWeight: 600, whiteSpace: "nowrap" }}>{p.planet_te} {p.retrograde && <span style={{ fontSize: 9, color: "var(--red)" }}>℞</span>}</td>
                          <td style={{ padding: "9px 10px" }}><span style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>H{p.house}</span></td>
                          <td style={{ padding: "9px 10px", color: "var(--text)" }}>{p.sign_te}</td>
                          <td style={{ padding: "9px 10px", color: "var(--muted)", fontSize: 11 }}>{p.degree_in_sign.toFixed(2)}°</td>
                          <td style={{ padding: "9px 10px", color: "var(--text)" }}>{p.nakshatra_te}</td>
                          <td style={{ padding: "9px 10px", color: PLANET_COLORS[p.star_lord_en] || "var(--text)" }}>{p.star_lord_te}</td>
                          <td style={{ padding: "9px 10px" }}><span style={{ background: "rgba(201,169,110,.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{p.sub_lord_te}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* CUSPS */}
              {activeTab === "cusps" && (
                <div className="tab-content" style={{ overflowX: "auto" }}>
                  <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.75rem" }}>భావ కస్పాల పట్టిక · KP కీలకం</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
                    <thead><tr>{["భావం", "రాశి", "అంశం", "నక్షత్రం", "నక్షత్రాధిపతి", "సబ్ లార్డ్"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", borderBottom: "0.5px solid var(--border)", fontWeight: 400 }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {workspaceData.cusps.map((c: any) => (
                        <tr key={c.house_num} style={{ borderBottom: "0.5px solid rgba(201,169,110,.06)" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td style={{ padding: "9px 10px" }}><span style={{ color: "var(--accent)", fontWeight: 600 }}>H{c.house_num}</span> <span style={{ color: "var(--muted)", fontSize: 10 }}>{c.house_te}</span></td>
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
              )}

              {/* SIGNIFICATORS */}
              {activeTab === "significators" && (
                <div className="tab-content">
                  <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.75rem" }}>కారక గ్రహాలు · అన్ని భావాలు</div>
                  <div className="grid-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                    {Object.entries(workspaceData.significators).map(([key, sig]: [string, any]) => (
                      <div key={key} style={{ background: "var(--surface2)", borderRadius: 8, padding: "0.75rem", border: "0.5px solid var(--border)" }}>
                        <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 2 }}>H{sig.house_num}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>{sig.house_te}</div>
                        {sig.occupants_en.length > 0 && <div style={{ marginBottom: 3 }}><span style={{ fontSize: 9, color: "var(--muted)" }}>నివాసులు: </span>{sig.occupants_te.map((p: string, i: number) => <span key={i} style={{ fontSize: 11, color: PLANET_COLORS[sig.occupants_en[i]] || "var(--accent2)", marginRight: 3 }}>{p}</span>)}</div>}
                        <div style={{ marginBottom: 3 }}><span style={{ fontSize: 9, color: "var(--muted)" }}>అధిపతి: </span><span style={{ fontSize: 11, color: PLANET_COLORS[sig.house_lord_en] || "var(--green)" }}>{sig.house_lord_te}</span></div>
                        <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 4, marginTop: 2 }}>
                          <span style={{ fontSize: 9, color: "var(--muted)", display: "block", marginBottom: 2 }}>అన్నీ:</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>{sig.all_significators_te.map((p: string, i: number) => <span key={i} style={{ fontSize: 10, color: PLANET_COLORS[sig.all_significators_en[i]] || "var(--text)" }}>{p}</span>)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                </div>
              )}

              {/* RULING */}
              {activeTab === "ruling" && (
                <div className="tab-content">
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

              {/* PANCHANGAM */}
              {activeTab === "panchangam" && (
                <div className="tab-content">
                  <div className="setup-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                    <PanchangamCard data={workspaceData.panchangam_birth} title="జన్మ పంచాంగం" />
                    <PanchangamCard data={workspaceData.panchangam_today} title="నేటి పంచాంగం" />
                  </div>
                </div>
              )}

              {/* ANALYSIS */}
              {activeTab === "analysis" && (
                <div className="tab-content">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {TOPICS.map(t => (
                        <button key={t.id} onClick={() => handleTopicAnalysis(t.id)} disabled={analysisLoading}
                          style={{ padding: "7px 14px", borderRadius: 6, cursor: "pointer", border: `0.5px solid ${activeTopic === t.id ? "var(--accent)" : "var(--border2)"}`, background: activeTopic === t.id ? "rgba(201,169,110,.12)" : "var(--surface2)", color: activeTopic === t.id ? "var(--accent)" : "var(--muted)", fontSize: 12, fontFamily: "inherit", transition: "all 0.2s" }}>{t.te}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 6, border: "0.5px solid var(--border2)", overflow: "hidden" }}>
                      {([["telugu_english", "తె+EN"], ["english", "EN"]] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setAnalysisLang(val)} style={{ padding: "5px 12px", background: analysisLang === val ? "rgba(201,169,110,0.15)" : "transparent", color: analysisLang === val ? "var(--accent)" : "var(--muted)", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>{label}</button>
                      ))}
                    </div>
                  </div>

                  {analysisLoading && <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 13, padding: "1rem" }}><div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />KP విశ్లేషణ రూపొందిస్తున్నారు...</div>}
                  {analysisResult && !analysisLoading && (
                    <div className="md-body" style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 10, padding: "1.25rem", marginBottom: "1rem" }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisResult}</ReactMarkdown>
                    </div>
                  )}
                  {chatHistory.map((h, i) => (
                    <div key={i} style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: 12, color: "var(--accent)", marginBottom: 4 }}>↳ {h.q}</div>
                      <div className="md-body" style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "1rem" }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{h.a}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
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
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 12, padding: "0.875rem 1rem", display: "flex", alignItems: "flex-end", gap: 10, marginTop: "0.75rem", flexShrink: 0 }}>
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