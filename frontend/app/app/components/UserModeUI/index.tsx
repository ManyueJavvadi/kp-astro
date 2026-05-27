"use client";

/**
 * UserModeUI/index.tsx
 *
 * Premium consumer shell for general-user mode (v6 revamp).
 * Tab Routing:
 *   1. Cosmic Pulse (Visual Dashboard, Astro-Calendar, Destiny Badges)
 *   2. AI Oracle (Chat sanctuary with Conversational Drawer and inline profile switches)
 *   3. Love Match (3-Step Relationship Temple wizard)
 *   4. Prashna Oracle (249 Segment Casting Circle)
 *   5. Saved Circle (Orbital Profiles Hub)
 */

import React, { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, X, ChevronUp, Sparkles, Heart, HelpCircle, Users, Activity, Menu, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

import { HeroVerdictCard } from "./HeroVerdictCard";
import { ChartSnapshot } from "./ChartSnapshot";
import { TimingStrip } from "./TimingStrip";
import { ActiveAnalysisPanel } from "./ActiveAnalysisPanel";
import { TrustBand } from "./TrustBand";

// Sub-tabs
import { CosmicPulseDashboard } from "./CosmicPulseDashboard";
import { UserProfilesTab } from "./UserProfilesTab";
import { UserMatchTab } from "./UserMatchTab";
import { UserHoraryTab } from "./UserHoraryTab";

interface Message {
  id: string;
  question: string;
  answer: string;
  analysis: any;
  timestamp: string;
  feedback?: "correct" | "incorrect";
  note?: string;
}

interface Props {
  birthDetails: { name: string; date: string; time: string; ampm: string; place: string; gender?: string; latitude?: number | null; longitude?: number | null; timezone_offset?: number | null };
  chartData: any;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  question: string;
  setQuestion: (q: string) => void;
  loading: boolean;
  handleAsk: () => void;
  activeNote: string | null;
  setActiveNote: (id: string | null) => void;
  noteInput: string;
  setNoteInput: (v: string) => void;
  handleFeedback: (id: string, fb: "correct" | "incorrect") => void;
  handleNoteSubmit: (id: string) => void;
  isMobile: boolean;

  // Circle saved sessions props
  savedSessions: any[];
  currentSessionId: string;
  onSwitchSession: (s: any) => Promise<void> | void;
  onRemoveSession: (id: string) => void;
  onAddSession: () => void;
  onEditChart: () => void;
  liveLoc: any;
  apiUrl: string;
  setToast: (t: any) => void;
}

type TabType = "pulse" | "chat" | "match" | "horary" | "profiles";

export default function UserModeUI(props: Props) {
  const {
    birthDetails, chartData, messages, setMessages, question, setQuestion,
    loading, handleAsk, activeNote, setActiveNote, noteInput, setNoteInput,
    handleFeedback, handleNoteSubmit, isMobile,
    savedSessions, currentSessionId, onSwitchSession, onRemoveSession, onAddSession, onEditChart,
    liveLoc, apiUrl, setToast
  } = props;

  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>("pulse");
  const [chartPanelOpen, setChartPanelOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const partnerOptions = savedSessions.filter((s: any) => s.id !== currentSessionId);

  // Conversational History Session mock
  const [conversations, setConversations] = useState<Array<{ id: string; title: string; msgs: Message[] }>>([
    { id: "c1", title: t("💼 Career Promotion Path", "ఉద్యోగ ప్రమోషన్ యోగం"), msgs: [] },
    { id: "c2", title: t("❤️ Marriage & Compatibility", "వివాహ బలం & పొంతన"), msgs: [] }
  ]);

  // Dual Chart Mode states
  const [dualChartMode, setDualChartMode] = useState(false);
  const [dualPartnerId, setDualPartnerId] = useState<string>("");

  // Context Switch transition feedback
  const [contextGlow, setContextGlow] = useState(false);

  // Auto-scroll on new messages
  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, loading, activeTab]);

  // Handle follow-up custom click events
  useEffect(() => {
    const handleFollowUpClick = (e: Event) => {
      const q = (e as CustomEvent).detail;
      setQuestion(q);
      setActiveTab("chat");
    };

    window.addEventListener("user-followup-click", handleFollowUpClick);
    return () => window.removeEventListener("user-followup-click", handleFollowUpClick);
  }, [setQuestion]);

  const latestAnalysis = messages.length > 0 ? messages[messages.length - 1].analysis : null;
  const currentDashaSrc = latestAnalysis?.current_dasha || chartData?.dashas;

  const triggerInlineSwitch = async (session: any) => {
    setContextGlow(true);
    await onSwitchSession(session);
    setTimeout(() => setContextGlow(false), 800);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    if (dualChartMode && dualPartnerId) {
      const partner = savedSessions.find(s => s.id === dualPartnerId);
      const current = savedSessions.find(s => s.id === currentSessionId);
      if (current && partner) {
        // Pre-format combined query with explicit astronomical details for synastry
        const formatted = `[Combined Synastry Query: Person 1=${current.name} (born ${current.birthDetails.date} ${current.birthDetails.time} ${current.birthDetails.ampm} at ${current.birthDetails.place}), Person 2=${partner.name} (born ${partner.birthDetails.date} ${partner.birthDetails.time} ${partner.birthDetails.ampm} at ${partner.birthDetails.place})]: ${question}`;
        setQuestion(formatted);
        setTimeout(() => {
          handleAsk();
        }, 50);
        return;
      }
    } else {
      const current = savedSessions.find(s => s.id === currentSessionId);
      if (current && !question.startsWith("[For ") && !question.startsWith("[Combined ")) {
        const formatted = `[For ${current.name}]: ${question}`;
        setQuestion(formatted);
        setTimeout(() => {
          handleAsk();
        }, 50);
        return;
      }
    }

    handleAsk();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (question.trim() && !loading) {
        const mockEvent = { preventDefault: () => {} } as React.FormEvent;
        handleCustomSubmit(mockEvent);
      }
    }
  };

  const handlePromptTrigger = (q: string) => {
    setQuestion(q);
    setActiveTab("chat");
    setTimeout(() => {
      const sendBtn = document.getElementById("general-user-send-btn");
      if (sendBtn) sendBtn.click();
    }, 100);
  };

  const handleNewConversation = () => {
    // Shimmer stardust clear thread simulation
    setMessages([]);
    setQuestion("");
    setDualChartMode(false);
    setDualPartnerId("");
    setToast({
      msg: t("Started a new pristine conversation.", "నూతన కాస్మిక్ సంభాషణ ప్రారంభించబడింది."),
      tone: "success"
    });
  };

  // ── Collapsible Conversational History Drawer ──
  const HistoryDrawer = (
    <aside style={{
      width: drawerOpen ? 240 : 0, opacity: drawerOpen ? 1 : 0,
      background: "rgba(10, 10, 15, 0.95)", borderRight: drawerOpen ? "0.5px solid rgba(255,255,255,0.06)" : "none",
      transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)", overflow: "hidden",
      display: "flex", flexDirection: "column", height: "100%", flexShrink: 0
    }}>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        <button
          type="button"
          onClick={handleNewConversation}
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 8,
            border: "0.5px solid rgba(201,169,110,0.4)", background: "rgba(201,169,110,0.05)",
            color: "#c9a96e", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6, justifyContent: "center"
          }}
        >
          <Plus size={12} />
          {t("New Conversation", "కొత్త చాట్")}
        </button>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 9.5, color: "#555566", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", paddingLeft: 4 }}>
            {t("Recent Inquiries", "ఇటీవలి ప్రశ్నలు")}
          </span>
          {conversations.map(c => (
            <button
              key={c.id}
              type="button"
              style={{
                textAlign: "left", padding: "8px 10px", borderRadius: 6,
                background: "transparent", border: "none", color: "#888899",
                fontSize: 11.5, cursor: "pointer", transition: "all 140ms",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.color = "#f0f0f0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#888899"; }}
            >
              ✦ {c.title}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );

  // ── Right side panel (desktop only) ──
  const SidePanel = (
    <aside className="user-side-panel">
      <ChartSnapshot
        birthDetails={birthDetails}
        chartData={chartData}
        currentDasha={currentDashaSrc}
      />
      <TimingStrip
        currentDasha={currentDashaSrc}
        upcomingAntardashas={latestAnalysis?.upcoming_antardashas}
        chartData={chartData}
      />
      <ActiveAnalysisPanel
        analysis={latestAnalysis}
        question={messages.length > 0 ? messages[messages.length - 1].question : null}
      />
      <TrustBand />
    </aside>
  );

  return (
    <main className="user-mode-shell" style={{
      background: "radial-gradient(circle at 50% 0%, #12101e 0%, #08070e 100%)",
      color: "#e2e2e7", position: "relative"
    }}>
      {/* ── Header details band ── */}
      <header className="user-hero-band" style={{ padding: "10px 16px", borderBottom: "0.5px solid rgba(255,255,255,0.06)", background: "rgba(9,9,15,0.4)" }}>
        <div className="user-hero-left">
          <div className="user-hero-avatar" style={{
            background: contextGlow ? "rgba(201,169,110,0.4)" : "rgba(201,169,110,0.18)",
            boxShadow: contextGlow ? "0 0 14px #c9a96e" : "none",
            transition: "all 400ms ease"
          }}>{birthDetails.name[0]?.toUpperCase()}</div>
          <div className="user-hero-meta">
            <div className="user-hero-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {birthDetails.name}
              <button 
                type="button" 
                onClick={onEditChart}
                style={{
                  background: "transparent", color: "#c9a96e",
                  fontSize: 10, cursor: "pointer", display: "inline-flex", alignItems: "center",
                  padding: "2px 6px", borderRadius: 4, border: "0.5px solid rgba(201,169,110,0.3)"
                }}
              >
                ✏️ {t("Edit", "సవరించు")}
              </button>
            </div>
            <div className="user-hero-sub">
              <span>{birthDetails.date}</span>
              <span className="user-hero-dot" />
              <span>{birthDetails.time} {birthDetails.ampm}</span>
              <span className="user-hero-dot" />
              <span className="user-hero-place">{birthDetails.place}</span>
            </div>
          </div>
        </div>

        {currentDashaSrc?.mahadasha && (
          <div className="user-hero-dasha">
            <span className="user-hero-dasha-label">{t("Dasha", "ప్రస్తుత దశ")}</span>
            <span className="user-hero-dasha-value" style={{ color: "#c9a96e" }}>
              {currentDashaSrc.mahadasha.lord}
              {currentDashaSrc.antardasha && (
                <>
                  <span className="user-hero-dash" style={{ color: "rgba(255,255,255,0.3)" }}>→</span>
                  {currentDashaSrc.antardasha.antardasha_lord}
                </>
              )}
            </span>
          </div>
        )}

        {isMobile && (
          <button
            type="button"
            className="user-hero-panel-btn"
            onClick={() => setChartPanelOpen(true)}
            aria-label="Open chart panel"
          >
            <ChevronUp size={14} />
            {t("Chart", "చార్ట్")}
          </button>
        )}
      </header>

      {/* ── Gorgeous tab switcher navigation ── */}
      <nav style={{
        display: "flex", justifyContent: "center", padding: "8px 16px",
        background: "rgba(9, 9, 15, 0.6)", borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)", gap: isMobile ? 4 : 16, overflowX: "auto"
      }}>
        {[
          { id: "pulse", label: t("Cosmic Pulse", "కాస్మిక్ పల్స్"), icon: <Activity size={14} /> },
          { id: "chat", label: t("AI Oracle", "కాస్మిక్ చాట్"), icon: <MessageCircle size={14} /> },
          { id: "match", label: t("Love Match", "పొంతనలు"), icon: <Heart size={14} /> },
          { id: "horary", label: t("Prashna Oracle", "ప్రశ్న అడగండి"), icon: <HelpCircle size={14} /> },
          { id: "profiles", label: t("Cosmic Circle", "నా సర్కిల్"), icon: <Users size={14} /> }
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                if (tab.id === "chat") setDrawerOpen(true);
                else setDrawerOpen(false);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8,
                fontSize: 12.5, fontWeight: active ? 700 : 500,
                color: active ? "#c9a96e" : "#888899",
                background: active ? "rgba(201, 169, 110, 0.08)" : "transparent",
                border: active ? "0.5px solid rgba(201, 169, 110, 0.25)" : "0.5px solid transparent",
                cursor: "pointer", transition: "all 200ms ease",
                whiteSpace: "nowrap"
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Body Layout ── */}
      <div className="user-mode-body" style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        
        {/* Slide-out history drawer */}
        {activeTab === "chat" && HistoryDrawer}

        {/* Main interactive Tab column */}
        <section className="user-chat-col" style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", flex: 1 }}>
          
          {/* Conversational Drawer open toggle button (only in Chat tab) */}
          {activeTab === "chat" && (
            <button
              type="button"
              onClick={() => setDrawerOpen(!drawerOpen)}
              style={{
                alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 4,
                margin: "12px 12px 0", padding: "4px 10px", borderRadius: 6,
                background: "rgba(255,255,255,0.01)", border: "0.5px solid rgba(255,255,255,0.08)",
                fontSize: 10.5, color: "#888899", cursor: "pointer"
              }}
            >
              <Menu size={11} />
              <span>{drawerOpen ? t("Hide Drawer", "హిస్టరీ దాచు") : t("Show History", "హిస్టరీ చూడు")}</span>
            </button>
          )}

          <div style={{ flex: 1, padding: "16px 12px" }}>
            
            {activeTab === "pulse" && (
              <CosmicPulseDashboard
                birthDetails={birthDetails}
                currentDasha={currentDashaSrc}
                chartData={chartData}
                onPickQuestion={handlePromptTrigger}
              />
            )}

            {activeTab === "chat" && (
              <div className="user-chat-thread" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {messages.length === 0 ? (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: "60px 20px", textAlign: "center", gap: 12, color: "#888899"
                  }}>
                    <MessageCircle size={32} style={{ color: "#c9a96e", opacity: 0.6 }} />
                    <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: "#f0f0f0" }}>
                      {t("Consult the Cosmic Oracle", "కాస్మిక్ చాట్ ప్రారంభించండి")}
                    </h3>
                    <p style={{ fontSize: 12, maxWidth: 360, lineHeight: 1.5 }}>
                      {t(
                        "Ask any specific question about your career, love, health, or wealth. Or check the Cosmic Pulse tab for evocative prompt ideas!",
                        "మీ ఉద్యోగం, పెళ్లి, ఆరోగ్యం లేదా విదేశీ ప్రయాణాల గురించి ప్రశ్న అడగండి. కాస్మిక్ పల్స్ ట్యాబ్‌లో స్టార్టర్ ప్రశ్నలు అందుబాటులో ఉన్నాయి."
                      )}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={msg.id} className="user-msg-pair">
                      {/* User question bubble */}
                      <div className="user-q-row" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        {(() => {
                          const rawQ = msg.question;
                          if (rawQ.startsWith("[Combined Synastry Query:")) {
                            const match = rawQ.match(/\[Combined Synastry Query:\s*Person 1=([^(\]]+)(?:\(([^)]+)\))?,\s*Person 2=([^(\]]+)(?:\(([^)]+)\))?\]:\s*(.*)/i);
                            const p1Name = match ? match[1]?.trim() : "";
                            const p2Name = match ? match[3]?.trim() : "";
                            const actualQuestion = match ? match[5]?.trim() : rawQ.split("]: ")[1] || rawQ;
                            
                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: "80%" }}>
                                <div style={{
                                  display: "inline-flex", alignSelf: "flex-end", alignItems: "center", gap: 6,
                                  background: "linear-gradient(90deg, rgba(201,169,110,0.15), rgba(251,113,133,0.15))",
                                  border: "0.5px solid rgba(201,169,110,0.3)", borderRadius: "12px 12px 0 0",
                                  padding: "4px 10px", fontSize: 9.5, fontWeight: 700, color: "#e2e2e7"
                                }}>
                                  <Heart size={10} style={{ color: "#fb7185", fill: "#fb7185" }} />
                                  <span>{p1Name || "Person 1"}</span>
                                  <span style={{ color: "rgba(255,255,255,0.4)" }}>⚭</span>
                                  <span>{p2Name || "Person 2"}</span>
                                  <span style={{
                                    fontSize: 8.5, padding: "1px 5px", background: "rgba(255,255,255,0.08)",
                                    borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em", color: "#c9a96e"
                                  }}>{t("Synastry Query", "జంట జాతక ప్రశ్న")}</span>
                                </div>
                                <div className="user-q-bubble" style={{
                                  borderRadius: "12px 0 12px 12px",
                                  background: "linear-gradient(135deg, #1b1625 0%, #15101a 100%)",
                                  border: "0.5px solid rgba(201,169,110,0.25)"
                                }}>
                                  {actualQuestion}
                                </div>
                              </div>
                            );
                          } else if (rawQ.startsWith("[For ")) {
                            const match = rawQ.match(/\[For ([^\]]+)\]:\s*(.*)/);
                            const name = match ? match[1]?.trim() : "";
                            const actualQuestion = match ? match[2]?.trim() : rawQ.split("]: ")[1] || rawQ;
                            
                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: "80%" }}>
                                <div style={{
                                  display: "inline-flex", alignSelf: "flex-end", alignItems: "center", gap: 5,
                                  background: "rgba(201,169,110,0.12)", border: "0.5px solid rgba(201,169,110,0.25)",
                                  borderRadius: "12px 12px 0 0", padding: "3px 8px", fontSize: 9.5, fontWeight: 700, color: "#c9a96e"
                                }}>
                                  <span style={{
                                    width: 10, height: 10, borderRadius: "50%", background: "#c9a96e",
                                    color: "#09090f", fontSize: 7, fontWeight: "bold",
                                    display: "inline-flex", alignItems: "center", justifyContent: "center"
                                  }}>{name[0]?.toUpperCase()}</span>
                                  <span>{t("For", "కోసం")} {name}</span>
                                </div>
                                <div className="user-q-bubble" style={{ borderRadius: "12px 0 12px 12px" }}>
                                  {actualQuestion}
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="user-q-bubble" style={{ maxWidth: "80%" }}>
                              {rawQ}
                            </div>
                          );
                        })()}
                      </div>

                      {/* AI Response Card */}
                      <HeroVerdictCard
                        analysis={msg.analysis}
                        answer={msg.answer}
                        timestamp={msg.timestamp}
                        isLatest={idx === messages.length - 1}
                      >
                        {/* Feedback Module */}
                        <div className="user-feedback-row">
                          <span className="user-feedback-label">{t("Does this resonate?", "మీకు ఉపయోగపడిందా?")}</span>
                          <button
                            type="button"
                            className={`user-feedback-btn ${msg.feedback === "correct" ? "is-correct" : ""}`}
                            onClick={() => handleFeedback(msg.id, "correct")}
                          >
                            ✓ {t("Yes", "అవును")}
                          </button>
                          <button
                            type="button"
                            className={`user-feedback-btn ${msg.feedback === "incorrect" ? "is-incorrect" : ""}`}
                            onClick={() => handleFeedback(msg.id, "incorrect")}
                          >
                            ✗ {t("Off", "లేదు")}
                          </button>
                          <button
                            type="button"
                            className="user-feedback-note-btn"
                            onClick={() => { setActiveNote(msg.id); setNoteInput(msg.note || ""); }}
                          >
                            <MessageCircle size={11} /> {msg.note ? t("Edit note", "నోట్ సవరించు") : t("Add note", "నోట్ రాయండి")}
                          </button>
                        </div>

                        {activeNote === msg.id && (
                          <div className="user-note-editor">
                            <textarea
                              value={noteInput}
                              onChange={(e) => setNoteInput(e.target.value)}
                              rows={3}
                              placeholder={t("Write notes or details for calibration...", "నోట్స్ రాయండి...")}
                            />
                            <div className="user-note-actions">
                              <button type="button" onClick={() => handleNoteSubmit(msg.id)} className="user-btn-primary">{t("Save", "సేవ్")}</button>
                              <button type="button" onClick={() => setActiveNote(null)} className="user-btn-ghost">{t("Cancel", "రద్దు")}</button>
                            </div>
                          </div>
                        )}
                      </HeroVerdictCard>
                    </div>
                  ))
                )}

                {loading && (
                  <div className="user-loading-row">
                    <div className="user-ai-dot" />
                    <div className="user-loading-bubble">
                      <span className="user-typing-dots"><span></span><span></span><span></span></span>
                      <span className="user-loading-text">{t("Reading the cosmos...", "జాతక గమనాలను చదువుతోంది...")}</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {activeTab === "match" && (
              <UserMatchTab
                chartData={chartData}
                savedSessions={savedSessions}
                currentSessionId={currentSessionId}
                onAddPartner={onAddSession}
                apiUrl={apiUrl}
                setToast={setToast}
              />
            )}

            {activeTab === "horary" && (
              <UserHoraryTab
                apiUrl={apiUrl}
                liveLoc={liveLoc}
                setToast={setToast}
              />
            )}

            {activeTab === "profiles" && (
              <UserProfilesTab
                savedSessions={savedSessions}
                currentSessionId={currentSessionId}
                onSwitchSession={onSwitchSession}
                onRemoveSession={onRemoveSession}
                onAddSession={onAddSession}
              />
            )}

          </div>

          {/* ── Glowing bottom input bar with Target bar (chat tab only!) ── */}
          {activeTab === "chat" && (
            <div style={{ margin: "8px 12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              
              {/* Cosmic Target Bar (inline profile switcher) */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "6px 12px", background: "rgba(255,255,255,0.015)",
                border: "0.5px solid rgba(255,255,255,0.04)", borderRadius: 8,
                flexWrap: "wrap", gap: 8
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 9.5, color: "#888899", fontWeight: 700, textTransform: "uppercase" }}>
                    {t("Asking For:", "ప్రశ్న అడుగుతోంది:")}
                  </span>
                  
                  {savedSessions.map(s => {
                    const isTarget = s.id === currentSessionId;
                    const initials = s.name[0]?.toUpperCase() || "?";
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => triggerInlineSwitch(s)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "3px 8px", borderRadius: 12, fontSize: 10.5,
                          background: isTarget ? "rgba(201,169,110,0.15)" : "transparent",
                          border: `0.5px solid ${isTarget ? "rgba(201,169,110,0.4)" : "rgba(255,255,255,0.06)"}`,
                          color: isTarget ? "#c9a96e" : "#888899", cursor: "pointer",
                          transition: "all 150ms ease"
                        }}
                      >
                        <span style={{
                          width: 14, height: 14, borderRadius: "50%", background: isTarget ? "#c9a96e" : "rgba(255,255,255,0.1)",
                          color: isTarget ? "#09090f" : "#888899", fontSize: 8.5, fontWeight: "bold",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>{initials}</span>
                        <span>{s.name.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Dual Chart Toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 9.5, color: "#888899", fontWeight: 700, textTransform: "uppercase" }}>{t("Dual Chart", "జంట జాతకం")}</span>
                  <input
                    type="checkbox"
                    checked={dualChartMode}
                    onChange={(e) => setDualChartMode(e.target.checked)}
                    style={{ cursor: "pointer", accentColor: "#c9a96e" }}
                  />
                  {dualChartMode && (
                    <select
                      value={dualPartnerId}
                      onChange={(e) => setDualPartnerId(e.target.value)}
                      style={{
                        padding: "2px 6px", borderRadius: 4, background: "#141416",
                        border: "0.5px solid rgba(255,255,255,0.1)", color: "#e2e2e7",
                        fontSize: 10.5, outline: "none", cursor: "pointer"
                      }}
                    >
                      <option value="">-- {t("Compare with", "పోల్చు") || "Compare with"} --</option>
                      {partnerOptions.map(p => (
                        <option key={p.id} value={p.id}>{p.name.split(" ")[0]}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Chat Input Field */}
              <form
                className="user-input-bar"
                onSubmit={handleCustomSubmit}
                style={{ width: "100%" }}
              >
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    dualChartMode 
                      ? t("Ask about your relationship dynamics or matching chemistry...", "మీ జంట సంబంధాల బలం లేదా భవిష్యత్తు గురించి అడగండి...")
                      : t("Ask the Oracle anything — past, present, or curious...", "ఏదైనా అడగండి — ఉద్యోగం, పెళ్లి, ప్రయాణాలు...")
                  }
                  disabled={loading}
                  aria-label="Ask a question"
                />
                <button
                  id="general-user-send-btn"
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="user-input-send"
                  aria-label="Send"
                >
                  {loading ? <Loader2 size={16} className="user-spin" /> : <Send size={16} />}
                </button>
              </form>
            </div>
          )}

        </section>

        {/* Side panel: desktop only */}
        {!isMobile && SidePanel}
      </div>

      {/* Mobile bottom sheet for chart panel */}
      {isMobile && chartPanelOpen && (
        <>
          <div className="user-sheet-backdrop" onClick={() => setChartPanelOpen(false)} />
          <div className="user-sheet">
            <button
              type="button"
              className="user-sheet-close"
              onClick={() => setChartPanelOpen(false)}
              aria-label="Close chart panel"
            >
              <X size={16} />
            </button>
            <div className="user-sheet-handle" />
            {SidePanel}
          </div>
        </>
      )}
    </main>
  );
}
