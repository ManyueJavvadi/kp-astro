"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import remarkGfm from "remark-gfm";
import axios from "axios";
import { ArrowRight, Loader2, CheckCircle, XCircle, MessageCircle, MapPin } from "lucide-react";
import ReactMarkdown from "react-markdown";

const API_URL = "https://devastroai.up.railway.app";



interface PlaceSuggestion {
  name: string;
  display: string;
  lat: number;
  lon: number;
}

interface BirthDetails {
  name: string;
  date: string;
  time: string;
  ampm: string;
  place: string;
  latitude: number | null;
  longitude: number | null;
}

interface Message {
  id: string;
  question: string;
  answer: string;
  analysis: any;
  timestamp: string;
  feedback?: "correct" | "incorrect";
  note?: string;
}

export default function Home() {
  const [mode, setMode] = useState<"user" | "astrologer">("user");
  const [birthDetails, setBirthDetails] = useState<BirthDetails>({
    name: "", date: "", time: "", ampm: "AM", place: "",
    latitude: null, longitude: null,
  });
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placeStatus, setPlaceStatus] = useState<"idle" | "loading" | "found" | "error">("idle");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [showChartDetails, setShowChartDetails] = useState(false);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [manualCoords, setManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const placeSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    setPlaceStatus("loading");
    try {
      const res = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
          q: query, format: "json", limit: 5,
          addressdetails: 1, countrycodes: "in", "accept-language": "en",
        },
        headers: { "User-Agent": "DevAstroAI/1.0" }
      });
      let features = res.data;
      if (features.length === 0) {
        const globalRes = await axios.get("https://nominatim.openstreetmap.org/search", {
          params: { q: query, format: "json", limit: 5, addressdetails: 1, "accept-language": "en" },
          headers: { "User-Agent": "DevAstroAI/1.0" }
        });
        features = globalRes.data;
      }
      const results: PlaceSuggestion[] = features.map((f: any) => {
        const addr = f.address || {};
        const parts = [
          addr.city || addr.town || addr.village || addr.county || f.display_name.split(",")[0],
          addr.state, addr.country,
        ].filter(Boolean);
        return { name: parts[0] || query, display: parts.join(", "), lat: parseFloat(f.lat), lon: parseFloat(f.lon) };
      });
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setPlaceStatus(results.length > 0 ? "idle" : "error");
    } catch {
      setPlaceStatus("error");
    }
  }, []);

  const handlePlaceChange = (val: string) => {
    setBirthDetails(prev => ({ ...prev, place: val, latitude: null, longitude: null }));
    setPlaceStatus("idle");
    if (placeSearchRef.current) clearTimeout(placeSearchRef.current);
    placeSearchRef.current = setTimeout(() => searchPlaces(val), 400);
  };

  const handleSelectPlace = (suggestion: PlaceSuggestion) => {
    setBirthDetails(prev => ({ ...prev, place: suggestion.display, latitude: suggestion.lat, longitude: suggestion.lon }));
    setPlaceStatus("found");
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleManualCoords = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (isNaN(lat) || isNaN(lon)) return;
    setBirthDetails(prev => ({ ...prev, latitude: lat, longitude: lon }));
    setPlaceStatus("found");
    setManualCoords(false);
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
    if (!birthDetails.name || !birthDetails.date || !birthDetails.time) {
      alert("Please fill in name, date, and time of birth."); return;
    }
    if (!birthDetails.latitude || !birthDetails.longitude) {
      alert("Please select a place from the dropdown or enter coordinates manually."); return;
    }
    const formattedDate = getFormattedDate();
    if (!formattedDate) { alert("Please enter date as DD/MM/YYYY"); return; }

    setChartLoading(true);
    try {
      const res = await axios.post(`${API_URL}/chart/generate`, {
        name: birthDetails.name,
        date: formattedDate,
        time: getTime24(),
        latitude: birthDetails.latitude,
        longitude: birthDetails.longitude,
        timezone_offset: 5.5,
      });
      setChartData(res.data);
      setSetupDone(true);
    } catch {
      alert("Could not generate chart. Please check if the backend is running.");
    } finally {
      setChartLoading(false);
    }
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
        name: birthDetails.name,
        date: formattedDate,
        time: getTime24(),
        latitude: birthDetails.latitude,
        longitude: birthDetails.longitude,
        timezone_offset: 5.5,
        topic: "auto",
        question: currentQuestion,
        mode: mode,
        history: messages.slice(-4).map(m => ({  // send last 4 messages as history
          question: m.question,
          answer: m.answer
        }))
      });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        question: currentQuestion,
        answer: res.data.answer,
        analysis: res.data.analysis,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        question: currentQuestion,
        answer: "Something went wrong. Please check if the backend is running and try again.",
        analysis: null,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, feedback: "correct" | "incorrect") => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback } : m));
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    try {
      await axios.post(`${API_URL}/feedback/submit`, {
        prediction_id: messageId, original_answer: msg.answer,
        correction: feedback, notes: msg.note || "",
      });
    } catch {}
  };

  const handleNoteSubmit = (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, note: noteInput } : m));
    setActiveNote(null);
    setNoteInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--surface2)",
    border: "0.5px solid var(--border2)", borderRadius: 8,
    padding: "10px 14px", fontSize: 14, color: "var(--text)", outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10, color: "var(--muted)",
    letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6,
  };

  const houseNames: Record<number, string> = {
    1: "Self", 2: "Wealth", 3: "Siblings", 4: "Home", 5: "Children",
    6: "Health", 7: "Marriage", 8: "Longevity", 9: "Luck", 10: "Career",
    11: "Gains", 12: "Losses",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Stars */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        {[...Array(90)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: i % 15 === 0 ? "2px" : "1px", height: i % 15 === 0 ? "2px" : "1px",
            background: "white", borderRadius: "50%",
            left: `${(i * 137.5) % 100}%`, top: `${(i * 97.3) % 100}%`,
            opacity: 0.08 + (i % 5) * 0.07,
          }} />
        ))}
      </div>

      {/* Nav */}
      <nav style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.25rem 2.5rem", borderBottom: "0.5px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: 14 }}>✦</div>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, letterSpacing: "0.02em" }}>
              DevAstro<span style={{ color: "var(--accent)" }}>AI</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>KP Astrology Intelligence</div>
          </div>
        </div>
        {setupDone && (
          <button onClick={() => { setSetupDone(false); setMessages([]); setChartData(null); setShowChartDetails(false); setBirthDetails({ name: "", date: "", time: "", ampm: "AM", place: "", latitude: null, longitude: null }); setPlaceStatus("idle"); }}
            style={{ background: "transparent", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "6px 16px", fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>
            New Chart
          </button>
        )}
      </nav>

      <main style={{ flex: 1, position: "relative", zIndex: 5, maxWidth: 760, margin: "0 auto", width: "100%", padding: "2rem 1.5rem" }}>

        {!setupDone ? (
          /* ── SETUP SCREEN ── */
          <div>
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ width: 30, height: "0.5px", background: "var(--accent)", display: "inline-block", opacity: 0.5 }} />
                Krishnamurti Paddhati System
                <span style={{ width: 30, height: "0.5px", background: "var(--accent)", display: "inline-block", opacity: 0.5 }} />
              </div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(2rem,5vw,3.2rem)", lineHeight: 1.15, marginBottom: "1rem", background: "linear-gradient(135deg,#fff 0%,var(--accent2) 60%,var(--accent) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Ancient wisdom,<br /><em>precise answers</em>
              </h1>
              <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.7, maxWidth: 420, margin: "0 auto" }}>
                Enter your birth details. Our KP engine calculates your chart with Swiss Ephemeris precision.
              </p>
            </div>

            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "1.25rem 1.75rem", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
                <span style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Birth Details</span>
              </div>

              <div style={{ padding: "1.75rem" }}>
                {/* Row 1: Name + Date */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input type="text" placeholder="Your name" value={birthDetails.name}
                      onChange={e => setBirthDetails(prev => ({ ...prev, name: e.target.value }))}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Date of Birth</label>
                    <input type="text" placeholder="DD / MM / YYYY" value={birthDetails.date}
                      onChange={e => handleDateChange(e.target.value)} maxLength={10} style={inputStyle} />
                  </div>
                </div>

                {/* Row 2: Time + Place */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                  <div>
                    <label style={labelStyle}>Time of Birth</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="text" placeholder="HH : MM" value={birthDetails.time}
                        onChange={e => handleTimeChange(e.target.value)} maxLength={5}
                        style={{ ...inputStyle, flex: 1 }} />
                      <select value={birthDetails.ampm}
                        onChange={e => setBirthDetails(prev => ({ ...prev, ampm: e.target.value }))}
                        style={{ background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "var(--text)", outline: "none", cursor: "pointer" }}>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>

                  <div ref={suggestionsRef} style={{ position: "relative" }}>
                    <label style={labelStyle}>Place of Birth</label>
                    <div style={{ position: "relative" }}>
                      <input type="text" placeholder="Start typing your city..."
                        value={birthDetails.place}
                        onChange={e => handlePlaceChange(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        style={{
                          ...inputStyle, paddingRight: 36,
                          border: `0.5px solid ${placeStatus === "found" ? "rgba(52,211,153,0.4)" : placeStatus === "error" ? "rgba(248,113,113,0.4)" : "var(--border2)"}`,
                        }} />
                      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
                        {placeStatus === "loading" && <Loader2 size={14} style={{ color: "var(--muted)", animation: "spin 1s linear infinite" }} />}
                        {placeStatus === "found" && <CheckCircle size={14} style={{ color: "var(--green)" }} />}
                        {placeStatus === "error" && <XCircle size={14} style={{ color: "var(--red)" }} />}
                        {placeStatus === "idle" && birthDetails.place.length > 0 && <MapPin size={14} style={{ color: "var(--muted)" }} />}
                      </div>
                    </div>

                    {/* Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 8, marginTop: 4, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                        {suggestions.map((s, i) => (
                          <div key={i} onClick={() => handleSelectPlace(s)}
                            style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", color: "var(--text)", borderBottom: i < suggestions.length - 1 ? "0.5px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: 8 }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <MapPin size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                            <span>{s.display}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {placeStatus === "found" && birthDetails.latitude && (
                      <div style={{ fontSize: 10, color: "var(--green)", marginTop: 4 }}>
                        ✓ {birthDetails.latitude.toFixed(4)}°N, {birthDetails.longitude?.toFixed(4)}°E
                      </div>
                    )}
                    {placeStatus === "error" && !manualCoords && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: "var(--red)" }}>Place not found.</span>
                        <button onClick={() => setManualCoords(true)} style={{ fontSize: 10, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                          Enter coordinates manually
                        </button>
                      </div>
                    )}
                    {manualCoords && (
                      <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="text" placeholder="Lat e.g. 16.23" value={manualLat} onChange={e => setManualLat(e.target.value)} style={{ ...inputStyle, padding: "7px 10px", fontSize: 12, flex: 1 }} />
                        <input type="text" placeholder="Lon e.g. 80.64" value={manualLon} onChange={e => setManualLon(e.target.value)} style={{ ...inputStyle, padding: "7px 10px", fontSize: 12, flex: 1 }} />
                        <button onClick={handleManualCoords} style={{ background: "var(--accent)", color: "#09090f", border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Set</button>
                      </div>
                    )}
                  </div>
                </div>
                {/* Mode Toggle */}
                <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center" }}>
                  <label style={labelStyle}>I am a </label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {["user", "astrologer"].map(m => (
                  <button key={m} onClick={() => setMode(m as "user" | "astrologer")}
                  style={{
                  flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer",
                  border: `0.5px solid ${mode === m ? "var(--accent)" : "var(--border2)"}`,
                  background: mode === m ? "rgba(201,169,110,0.1)" : "var(--surface2)",
                  color: mode === m ? "var(--accent)" : "var(--muted)", fontSize: 13,
                }}>
                {m === "user" ? "General User" : "KP Astrologer"}
                </button>
              ))}
            </div>
          </div>

                <button onClick={handleSetup} disabled={chartLoading} style={{
                  width: "100%", background: "var(--accent)", color: "#09090f", border: "none", borderRadius: 8,
                  padding: "12px", fontSize: 14, fontWeight: 500, cursor: chartLoading ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: chartLoading ? 0.7 : 1,
                }}>
                  {chartLoading
                    ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Calculating chart...</>
                    : <>Generate My Chart <ArrowRight size={16} /></>}
                </button>
              </div>
            </div>
          </div>

        ) : (
          /* ── CHAT SCREEN ── */
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>

            {/* Chart Summary Bar */}
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 10, padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", gap: 14, marginBottom: "0.75rem", flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface2)", border: "0.5px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>
                {birthDetails.name[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{birthDetails.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{birthDetails.date} · {birthDetails.time} {birthDetails.ampm} · {birthDetails.place}</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <span style={{ fontSize: 10, background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid rgba(201,169,110,0.2)", borderRadius: 4, padding: "3px 8px" }}>KP New</span>
                <span style={{ fontSize: 10, background: "var(--surface2)", color: "var(--muted)", border: "0.5px solid var(--border)", borderRadius: 4, padding: "3px 8px" }}>Placidus</span>
              </div>
            </div>

            {/* Chart Details Panel */}
            {chartData && (
              <div style={{ marginBottom: "0.75rem", flexShrink: 0 }}>
                <button onClick={() => setShowChartDetails(!showChartDetails)} style={{
                  width: "100%", background: "var(--surface)", border: "0.5px solid var(--border2)",
                  borderRadius: showChartDetails ? "8px 8px 0 0" : 8,
                  padding: "0.75rem 1.25rem", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  color: "var(--muted)", fontSize: 12, letterSpacing: "0.04em",
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "var(--accent)", fontSize: 14 }}>◈</span>
                    Chart Details — Planets · Cusps · Dasha · Significators
                  </span>
                  <span style={{ fontSize: 10 }}>{showChartDetails ? "▲ Hide" : "▼ Show"}</span>
                </button>

                {showChartDetails && (
                  <div style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "1.25rem", overflowX: "auto", maxHeight: "50vh", overflowY: "auto" }}>

                    {/* Planet Table */}
                    <div style={{ marginBottom: "1.5rem" }}>
                      <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Planet Positions</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr>
                            {["Planet", "Sign", "Degree", "Nakshatra", "Star Lord", "Sub Lord"].map(h => (
                              <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "0.5px solid var(--border)", fontWeight: 400 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.chart && Object.entries(chartData.chart.planets).map(([planet, data]: [string, any]) => (
                            <tr key={planet} style={{ borderBottom: "0.5px solid var(--border)" }}>
                              <td style={{ padding: "8px 10px", color: "var(--accent2)", fontWeight: 500 }}>{planet}</td>
                              <td style={{ padding: "8px 10px", color: "var(--text)" }}>{data.sign}</td>
                              <td style={{ padding: "8px 10px", color: "var(--muted)", fontSize: 11 }}>{data.longitude?.toFixed(2)}°</td>
                              <td style={{ padding: "8px 10px", color: "var(--text)" }}>{data.nakshatra}</td>
                              <td style={{ padding: "8px 10px", color: "var(--text)" }}>{data.star_lord}</td>
                              <td style={{ padding: "8px 10px" }}>
                                <span style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid rgba(201,169,110,0.2)", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>
                                  {data.sub_lord}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Cusps Table */}
                    <div style={{ marginBottom: "1.5rem" }}>
                      <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>House Cusps (Placidus · KP New)</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr>
                            {["House", "Sign", "Degree", "Nakshatra", "Star Lord", "Sub Lord"].map(h => (
                              <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "0.5px solid var(--border)", fontWeight: 400 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.chart && Object.entries(chartData.chart.cusps).map(([house, data]: [string, any], idx) => (
                            <tr key={house} style={{ borderBottom: "0.5px solid var(--border)" }}>
                              <td style={{ padding: "8px 10px", color: "var(--accent2)", fontWeight: 500 }}>
                                H{idx + 1} · <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 10 }}>{houseNames[idx + 1]}</span>
                              </td>
                              <td style={{ padding: "8px 10px", color: "var(--text)" }}>{data.sign}</td>
                              <td style={{ padding: "8px 10px", color: "var(--muted)", fontSize: 11 }}>{data.cusp_longitude?.toFixed(2)}°</td>
                              <td style={{ padding: "8px 10px", color: "var(--text)" }}>{data.nakshatra}</td>
                              <td style={{ padding: "8px 10px", color: "var(--text)" }}>{data.star_lord}</td>
                              <td style={{ padding: "8px 10px" }}>
                                <span style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid rgba(201,169,110,0.2)", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>
                                  {data.sub_lord}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Dasha + Ruling Planets */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Current Dasha</div>
                        {chartData.dashas?.current_mahadasha && (
                          <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "0.875rem", border: "0.5px solid var(--border)" }}>
                            <div style={{ marginBottom: "0.5rem" }}>
                              <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Mahadasha</div>
                              <div style={{ fontSize: 16, fontWeight: 500, color: "var(--accent2)", marginTop: 2 }}>{chartData.dashas.current_mahadasha.lord}</div>
                              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{chartData.dashas.current_mahadasha.start} → {chartData.dashas.current_mahadasha.end}</div>
                            </div>
                            {chartData.dashas.current_antardasha && (
                              <div style={{ paddingTop: "0.5rem", borderTop: "0.5px solid var(--border)" }}>
                                <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Antardasha</div>
                                <div style={{ fontSize: 14, color: "var(--text)", marginTop: 2 }}>{chartData.dashas.current_antardasha.antardasha_lord}</div>
                                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{chartData.dashas.current_antardasha.start} → {chartData.dashas.current_antardasha.end}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Ruling Planets (Now)</div>
                        {chartData.ruling_planets && (
                          <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "0.875rem", border: "0.5px solid var(--border)" }}>
                            {[
                              { label: "Day Lord", value: chartData.ruling_planets.day_lord },
                              { label: "Lagna Lord", value: chartData.ruling_planets.lagna_sign_lord },
                              { label: "Lagna Star Lord", value: chartData.ruling_planets.lagna_star_lord },
                              { label: "Moon Sign Lord", value: chartData.ruling_planets.moon_sign_lord },
                              { label: "Moon Star Lord", value: chartData.ruling_planets.moon_star_lord },
                            ].map(item => (
                              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                <span style={{ fontSize: 11, color: "var(--muted)" }}>{item.label}</span>
                                <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>{item.value}</span>
                              </div>
                            ))}
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "0.5px solid var(--border)" }}>
                              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>All Ruling Planets</div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {chartData.ruling_planets.ruling_planets?.map((p: string) => (
                                  <span key={p} style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid rgba(201,169,110,0.2)", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{p}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Key House Significators */}
                    {chartData.significators && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                          Significators for Key Houses
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
                          {[1, 2, 7, 10, 11, 6].map(h => {
                            const sig = chartData.significators[`House_${h}`];
                            if (!sig) return null;
                            return (
                              <div key={h} style={{ background: "var(--surface2)", borderRadius: 8, padding: "0.75rem", border: "0.5px solid var(--border)" }}>
                                <div style={{ fontSize: 10, color: "var(--accent)", marginBottom: 6, fontWeight: 500 }}>H{h}</div>
                                <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{houseNames[h]}</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                  {sig.all_significators?.map((p: string) => (
                                    <span key={p} style={{ fontSize: 11, color: sig.occupants?.includes(p) ? "var(--accent2)" : p === sig.house_lord ? "var(--green)" : "var(--muted)" }}>
                                      {p}
                                      {sig.occupants?.includes(p) && <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.6 }}>occ</span>}
                                      {p === sig.house_lord && !sig.occupants?.includes(p) && <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.6 }}>lord</span>}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, minHeight: 0 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                  <div style={{ fontSize: 24, marginBottom: "0.75rem", opacity: 0.3 }}>✦</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
                    Your chart is ready. Ask anything about your life.
                  </div>
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
                    <div style={{ background: "var(--accent)", color: "#09090f", borderRadius: "12px 12px 2px 12px", padding: "10px 16px", fontSize: 14, maxWidth: "78%", lineHeight: 1.6 }}>
                      {msg.question}
                    </div>
                  </div>

                  <div style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: "2px 12px 12px 12px", padding: "1.25rem", maxWidth: "94%" }}>
                    {msg.analysis?.promise_analysis && (
                      <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: msg.analysis.promise_analysis.is_promised ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", color: msg.analysis.promise_analysis.is_promised ? "var(--green)" : "var(--red)", border: `0.5px solid ${msg.analysis.promise_analysis.is_promised ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}` }}>
                          {msg.analysis.promise_analysis.is_promised ? "✓ Promised" : "✗ Not Promised"}
                        </span>
                        {msg.analysis.current_dasha?.mahadasha && (
                          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "rgba(201,169,110,0.08)", color: "var(--accent)", border: "0.5px solid rgba(201,169,110,0.15)" }}>
                            {msg.analysis.current_dasha.mahadasha.lord}–{msg.analysis.current_dasha.antardasha?.antardasha_lord} Dasha
                          </span>
                        )}
                        {msg.analysis.timing_analysis?.timing_favorable && (
                          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "rgba(201,169,110,0.08)", color: "var(--accent2)", border: "0.5px solid rgba(201,169,110,0.15)" }}>⏱ Timing Active</span>
                        )}
                      </div>
                    )}

                    <div style={{ fontSize: 14, lineHeight: 1.85, color: "#d0d0d8" }} className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.answer}</ReactMarkdown>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: "0.75rem" }}>{msg.timestamp}</div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "1rem", paddingTop: "1rem", borderTop: "0.5px solid var(--border)" }}>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>Accurate?</span>
                      <button onClick={() => handleFeedback(msg.id, "correct")} style={{ padding: "3px 12px", borderRadius: 4, border: "0.5px solid", fontSize: 11, cursor: "pointer", background: "transparent", borderColor: msg.feedback === "correct" ? "var(--green)" : "var(--border2)", color: msg.feedback === "correct" ? "var(--green)" : "var(--muted)" }}>✓ Correct</button>
                      <button onClick={() => handleFeedback(msg.id, "incorrect")} style={{ padding: "3px 12px", borderRadius: 4, border: "0.5px solid", fontSize: 11, cursor: "pointer", background: "transparent", borderColor: msg.feedback === "incorrect" ? "var(--red)" : "var(--border2)", color: msg.feedback === "incorrect" ? "var(--red)" : "var(--muted)" }}>✗ Incorrect</button>
                      <button onClick={() => { setActiveNote(msg.id); setNoteInput(msg.note || ""); }} style={{ padding: "3px 12px", borderRadius: 4, border: "0.5px solid var(--border2)", fontSize: 11, cursor: "pointer", background: "transparent", color: "var(--muted)", marginLeft: "auto" }}>
                        <MessageCircle size={11} style={{ display: "inline", marginRight: 4 }} />
                        {msg.note ? "Edit note" : "Add note"}
                      </button>
                    </div>

                    {activeNote === msg.id && (
                      <div style={{ marginTop: "0.75rem" }}>
                        <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)}
                          placeholder="What was wrong or what should the correct answer be?"
                          rows={3} style={{ width: "100%", background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--text)", outline: "none", resize: "none" }} />
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
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                    Analyzing your chart...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Question Input */}
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 12, padding: "0.875rem 1rem", display: "flex", alignItems: "flex-end", gap: 10, marginTop: "0.75rem", flexShrink: 0 }}>
              <textarea value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Ask about career, marriage, travel, health... (Enter to send)"
                rows={2} style={{ flex: 1, background: "transparent", border: "none", color: "var(--text)", fontSize: 14, resize: "none", outline: "none", lineHeight: 1.6 }} />
              <button onClick={handleAsk} disabled={loading || !question.trim()} style={{
                background: question.trim() ? "var(--accent)" : "var(--surface2)",
                color: question.trim() ? "#09090f" : "var(--muted)",
                border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 500,
                cursor: question.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s", flexShrink: 0,
              }}>
                {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowRight size={14} />}
                Ask
              </button>
            </div>
          </div>
        )}
      </main>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}