"use client";

/**
 * WorkspaceAskInput — perf-isolated AI question box.
 *
 * WHY THIS EXISTS (2026-06-22):
 *   The AI question input used to bind `value={chatQ}` directly to a
 *   useState living in the giant Home component (page.tsx, ~5,800 lines).
 *   Every keystroke called setChatQ → re-rendered the ENTIRE workspace
 *   (chart SVG, dasha tree, AI-answer markdown). On longer conversations
 *   that markdown re-render made typing visibly lag — characters appeared
 *   a beat after they were typed.
 *
 * THE FIX:
 *   Hold the live draft in LOCAL state here. Keystrokes only re-render
 *   this tiny component. The parent is touched only on:
 *     - submit  → onSubmit(text)   (fires the AI call)
 *     - blur    → onCommit(text)   (so chatQ stays in sync for the
 *                                    session snapshot / persistence)
 *   The parent can still push text IN (re-ask a past question, restore a
 *   session, clear after submit) via the `seed` prop — a change to `seed`
 *   re-seeds the local draft. Local typing never writes `seed`, so the
 *   seed→draft effect only fires on intentional external sets (no loop:
 *   setDraft to an equal value is a no-op).
 *
 *   The @-mention popover (pull another chart into the chat) is also kept
 *   fully local — its open/query state lived in page.tsx before and was a
 *   second source of per-keystroke parent re-renders.
 *
 * Component is memo()'d; its props are stable (setters + a rarely-changing
 * seed), so the parent re-rendering for OTHER reasons won't re-render it.
 */

import React, { useEffect, useState, memo } from "react";

interface SessionLite {
  id: string;
  name?: string;
  birthDetails?: { name?: string; gender?: string; date?: string };
}

interface WorkspaceAskInputProps {
  /** Parent's committed value (chatQ). Re-seeds the local draft when it changes. */
  seed: string;
  /** Fire the AI question. Receives the current draft text. */
  onSubmit: (text: string) => void;
  /** Sync draft back to the parent (called on blur) so snapshots persist it. */
  onCommit: (text: string) => void;
  disabled: boolean;
  t: (en: string, te: string) => string;
  variant: "sidebar" | "compact";
  /** sidebar only — maximized AI companion (bigger paddings/fonts). */
  isMax?: boolean;
  /** sidebar only — enable the @-mention chart picker. */
  enableMentions?: boolean;
  savedSessions?: SessionLite[];
  currentSessionId?: string;
  chartsInContext?: { id: string }[];
  onPinChart?: (s: SessionLite) => void;
}

function WorkspaceAskInputImpl({
  seed,
  onSubmit,
  onCommit,
  disabled,
  t,
  variant,
  isMax = false,
  enableMentions = false,
  savedSessions = [],
  currentSessionId,
  chartsInContext = [],
  onPinChart,
}: WorkspaceAskInputProps) {
  const [draft, setDraft] = useState(seed);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  // Re-seed when the parent pushes a new committed value (re-ask a past
  // question / restore a session / clear after submit). Local typing never
  // touches `seed`, so this only fires on intentional external sets.
  useEffect(() => {
    setDraft(seed);
  }, [seed]);

  const submit = () => {
    if (disabled || !draft.trim()) return;
    onSubmit(draft);
    setDraft("");
    setMentionOpen(false);
    setMentionQuery("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDraft(v);
    if (!enableMentions) return;
    // @-mention detection (mirrors the old inline logic). If the most
    // recent token starts with "@" at a word boundary, open the picker.
    const cursor = e.target.selectionStart ?? v.length;
    const beforeCursor = v.slice(0, cursor);
    const atIdx = beforeCursor.lastIndexOf("@");
    if (atIdx >= 0) {
      const charBefore = atIdx === 0 ? " " : beforeCursor[atIdx - 1];
      if (/\s/.test(charBefore)) {
        const token = beforeCursor.slice(atIdx + 1);
        if (!/\s/.test(token)) {
          setMentionQuery(token);
          setMentionOpen(true);
          return;
        }
      }
    }
    setMentionOpen(false);
    setMentionQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setMentionOpen(false);
      setMentionQuery("");
      return;
    }
    if (e.key === "Enter" && !mentionOpen) submit();
  };

  // ─── Compact variant (center bottom strip + mobile ask bar) ───
  if (variant === "compact") {
    return (
      <>
        <input
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => onCommit(draft)}
          placeholder={t("Ask a deeper question…", "లోతైన విశ్లేషణ కోసం అడగండి…")}
          style={{ flex: 1, background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit" }}
        />
        <button
          onClick={submit}
          disabled={disabled || !draft.trim()}
          style={{ background: draft.trim() ? "var(--accent)" : "var(--surface2)", color: draft.trim() ? "#09090f" : "var(--muted)", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: draft.trim() ? "pointer" : "default", fontWeight: 500, fontFamily: "inherit" }}
        >
          {t("Ask", "అడగు")}
        </button>
      </>
    );
  }

  // ─── Sidebar variant (AI Companion strip, with @-mention) ───
  return (
    <>
      <input
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={isMax ? t("Ask AI Companion a deeper question — type @ to pull in another chart", "జన్మ కుండలి గురించి లోతైన విశ్లేషణ కోసం తోడు AI ని అడగండి…") : t("Ask AI Companion… (type @ to add a chart)", "తోడు AI ని అడగండి…")}
        style={{
          flex: 1,
          background: "rgba(255, 255, 255, 0.03)",
          border: "0.5px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 10,
          padding: isMax ? "12px 18px" : "8px 12px",
          fontSize: isMax ? 14 : 12,
          color: "var(--text)",
          outline: "none",
          fontFamily: "inherit",
          transition: "all 0.15s",
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = "var(--accent)";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
          onCommit(draft);
          // Slight delay so a click on a dropdown item registers first.
          setTimeout(() => setMentionOpen(false), 150);
        }}
      />
      {/* @-mention autocomplete dropdown */}
      {enableMentions && mentionOpen && savedSessions.length > 0 && (() => {
        const q = mentionQuery.toLowerCase();
        const matches = savedSessions
          .filter(s =>
            s.id !== currentSessionId &&
            !chartsInContext.some(c => c.id === s.id) &&
            (q === "" || (s.name || s.birthDetails?.name || "").toLowerCase().includes(q))
          )
          .slice(0, 6);
        if (matches.length === 0) return null;
        return (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: 0,
              right: 80,
              zIndex: 30,
              background: "rgba(13, 13, 22, 0.98)",
              backdropFilter: "blur(8px)",
              border: "0.5px solid rgba(201,169,110,0.4)",
              borderRadius: 8,
              padding: 6,
              boxShadow: "0 -8px 24px rgba(0,0,0,0.5)",
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 6px" }}>
              Add a chart to this chat
            </div>
            {matches.map(s => {
              const g = s.birthDetails?.gender;
              const gsym = g === "male" ? "♂" : g === "female" ? "♀" : "·";
              const sName = s.name || s.birthDetails?.name || "Unnamed";
              return (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={e => e.preventDefault()}  // prevent input blur
                  onClick={() => {
                    onPinChart?.(s);
                    // Replace the "@xxx" token in the local draft with the name.
                    setDraft(prev => {
                      const atIdx = prev.lastIndexOf("@");
                      if (atIdx < 0) return prev;
                      return prev.slice(0, atIdx) + sName + " ";
                    });
                    setMentionOpen(false);
                    setMentionQuery("");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    color: "var(--text)",
                    fontSize: 12,
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,169,110,0.10)"}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
                >
                  <span style={{ opacity: 0.7 }}>{gsym}</span>
                  <span style={{ fontWeight: 600 }}>{sName}</span>
                  <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>
                    {s.birthDetails?.date}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })()}
      <button
        onClick={submit}
        disabled={disabled || !draft.trim()}
        style={{
          background: draft.trim() ? "var(--accent)" : "rgba(255,255,255,0.03)",
          color: draft.trim() ? "#09090f" : "var(--muted)",
          border: "none",
          borderRadius: 10,
          padding: isMax ? "12px 24px" : "8px 14px",
          fontSize: isMax ? 14 : 12,
          cursor: draft.trim() ? "pointer" : "default",
          fontWeight: 600,
          fontFamily: "inherit",
          transition: "all 0.15s",
        }}
      >
        {t("Ask", "అడగు")}
      </button>
    </>
  );
}

export const WorkspaceAskInput = memo(WorkspaceAskInputImpl);
export default WorkspaceAskInput;
