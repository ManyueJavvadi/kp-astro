"use client";

/**
 * UserModeUI/index.tsx
 *
 * Premium chat shell for general-user mode (PR A1.3-fix-15 — UI revamp).
 *
 * Two-column on desktop (≥820px):
 *   ┌─────────────────────────────────────────┬───────────────────┐
 *   │ Hero band (name · birth · current dasha)│   YOUR CHART      │
 *   ├─────────────────────────────────────────┤   ChartSnapshot   │
 *   │ Empty state OR chat thread              │                   │
 *   │   - User msg right (gold pill)          │   TIMING HORIZON  │
 *   │   - AI msg = HeroVerdictCard            │   TimingStrip     │
 *   │ Input bar at bottom                     │                   │
 *   │                                         │   ACTIVE QUESTION │
 *   │                                         │   ActiveAnalysis  │
 *   │                                         │                   │
 *   │                                         │   ENGINE          │
 *   │                                         │   TrustBand       │
 *   └─────────────────────────────────────────┴───────────────────┘
 *
 * Single column on mobile (<820px):
 *   - Hero band condenses to compact bar
 *   - Right panel becomes a swipe-up bottom sheet (button to open)
 *   - Chat fills the viewport
 *
 * Receives all state from the parent page.tsx as props — no internal
 * state management, just presentation.
 */

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, MessageCircle, Send, X, ChevronUp } from "lucide-react";
import { theme } from "@/lib/theme";

import { HeroVerdictCard } from "./HeroVerdictCard";
import { ChartSnapshot } from "./ChartSnapshot";
import { TimingStrip } from "./TimingStrip";
import { ActiveAnalysisPanel } from "./ActiveAnalysisPanel";
import { EmptyStateHero } from "./EmptyStateHero";
import { TrustBand } from "./TrustBand";

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
  birthDetails: { name: string; date: string; time: string; ampm: string; place: string; gender?: string };
  chartData: any;
  messages: Message[];
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
}

export default function UserModeUI(props: Props) {
  const {
    birthDetails, chartData, messages, question, setQuestion,
    loading, handleAsk, activeNote, setActiveNote, noteInput, setNoteInput,
    handleFeedback, handleNoteSubmit, isMobile,
  } = props;

  const [chartPanelOpen, setChartPanelOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  // Latest analysis powers the right panel's Active Question card
  const latestAnalysis = messages.length > 0 ? messages[messages.length - 1].analysis : null;
  const currentDashaSrc = latestAnalysis?.current_dasha || chartData?.dashas;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (question.trim() && !loading) handleAsk();
    }
  };

  // ── Right side panel (chart context) ──────────────────────────
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
      />
      <ActiveAnalysisPanel
        analysis={latestAnalysis}
        question={messages.length > 0 ? messages[messages.length - 1].question : null}
      />
      <TrustBand />
    </aside>
  );

  return (
    <main className="user-mode-shell">
      {/* ── Hero band ── */}
      <header className="user-hero-band">
        <div className="user-hero-left">
          <div className="user-hero-avatar">{birthDetails.name[0]?.toUpperCase()}</div>
          <div className="user-hero-meta">
            <div className="user-hero-name">{birthDetails.name}</div>
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
            <span className="user-hero-dasha-label">In</span>
            <span className="user-hero-dasha-value">
              {currentDashaSrc.mahadasha.lord}
              {currentDashaSrc.antardasha && (
                <>
                  <span className="user-hero-dash">→</span>
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
            Chart
          </button>
        )}
      </header>

      {/* ── Body: chat (left) + side panel (right, desktop only) ── */}
      <div className="user-mode-body">
        {/* Chat column */}
        <section className="user-chat-col">
          <div className="user-chat-thread" role="log" aria-live="polite">
            {messages.length === 0 ? (
              <EmptyStateHero
                birthDetails={birthDetails}
                currentDasha={currentDashaSrc}
                onPickQuestion={(q) => setQuestion(q)}
              />
            ) : (
              messages.map((msg, idx) => (
                <div key={msg.id} className="user-msg-pair">
                  {/* User question (right-aligned gold pill) */}
                  <div className="user-q-row">
                    <div className="user-q-bubble">{msg.question}</div>
                  </div>

                  {/* AI response — Hero Verdict Card */}
                  <HeroVerdictCard
                    analysis={msg.analysis}
                    answer={msg.answer}
                    timestamp={msg.timestamp}
                    isLatest={idx === messages.length - 1}
                  >
                    {/* Feedback row */}
                    <div className="user-feedback-row">
                      <span className="user-feedback-label">Did this match what you expected?</span>
                      <button
                        type="button"
                        className={`user-feedback-btn ${msg.feedback === "correct" ? "is-correct" : ""}`}
                        onClick={() => handleFeedback(msg.id, "correct")}
                      >
                        ✓ Yes
                      </button>
                      <button
                        type="button"
                        className={`user-feedback-btn ${msg.feedback === "incorrect" ? "is-incorrect" : ""}`}
                        onClick={() => handleFeedback(msg.id, "incorrect")}
                      >
                        ✗ Off
                      </button>
                      <button
                        type="button"
                        className="user-feedback-note-btn"
                        onClick={() => { setActiveNote(msg.id); setNoteInput(msg.note || ""); }}
                      >
                        <MessageCircle size={11} /> {msg.note ? "Edit note" : "Add note"}
                      </button>
                    </div>
                    {activeNote === msg.id && (
                      <div className="user-note-editor">
                        <textarea
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          rows={3}
                          placeholder="Note for yourself or for calibrating accuracy..."
                        />
                        <div className="user-note-actions">
                          <button type="button" onClick={() => handleNoteSubmit(msg.id)} className="user-btn-primary">Save</button>
                          <button type="button" onClick={() => setActiveNote(null)} className="user-btn-ghost">Cancel</button>
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
                  <span className="user-loading-text">Reading your chart...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <form
            className="user-input-bar"
            onSubmit={(e) => { e.preventDefault(); if (question.trim() && !loading) handleAsk(); }}
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything — past, present, or curious..."
              disabled={loading}
              aria-label="Ask a question"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="user-input-send"
              aria-label="Send"
            >
              {loading ? <Loader2 size={16} className="user-spin" /> : <Send size={16} />}
            </button>
          </form>
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
