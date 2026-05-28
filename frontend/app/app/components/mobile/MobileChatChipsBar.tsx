"use client";

/**
 * MobileChatChipsBar — multi-chart "+ Add chart" pill row for the
 * mobile chat input.
 *
 * Phase 9.10d — desktop has this same UI rendered inside the AI
 * Companion sidebar (page.tsx ~L2575). The sidebar is hidden on
 * mobile, so mobile users had no way to:
 *   - see which additional charts are in the current chat context
 *   - add a saved chart to the chat (+ Add chart)
 *   - remove an additional chart (× chip)
 * This component brings that parity to mobile, mounted just above
 * the persistent "Ask a deeper question" input that already exists
 * on Chart / Houses / Dasha / Analysis / Match tabs.
 *
 * Behavior is identical to desktop:
 *   - Primary chart is always-on (gold pill, non-removable).
 *   - Up to 3 additional charts can be pinned (so 4 total per chat).
 *   - + Add chart → opens a popover with all OTHER saved sessions
 *     (filters out the primary + already-pinned). Tap to add.
 *   - × on any additional pill removes it from the chat.
 *   - When 3 additional pinned, replaces + with "max 4 charts"
 *     placeholder.
 *   - Hidden entirely when there are no savedSessions to add AND
 *     no charts in context yet — saves vertical space on a fresh
 *     single-chart session.
 *
 * Maintainability:
 *   - State (chartsInContext, mentionPopoverOpen) is owned by
 *     page.tsx and passed in — single source of truth shared with
 *     the desktop sidebar's inline copy.
 *   - When handleWorkspaceChat fires, it already auto-routes to the
 *     multi-chart endpoint if chartsInContext is non-empty, so no
 *     extra wiring needed.
 */

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { WorkspaceData } from "../../types/workspace";
import type { BirthDetails, ChartSession } from "../../types";

interface MobileChatChipsBarProps {
  workspaceData: WorkspaceData;
  birthDetails: BirthDetails;
  savedSessions: ChartSession[];
  currentSessionId: string;
  chartsInContext: ChartSession[];
  setChartsInContext: React.Dispatch<React.SetStateAction<ChartSession[]>>;
  mentionPopoverOpen: boolean;
  setMentionPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const genderGlyph = (g?: string) =>
  g === "male" ? "♂" : g === "female" ? "♀" : "·";

export default function MobileChatChipsBar({
  workspaceData, birthDetails,
  savedSessions, currentSessionId,
  chartsInContext, setChartsInContext,
  mentionPopoverOpen, setMentionPopoverOpen,
}: MobileChatChipsBarProps) {
  // Phase 9.10f — anchor ref for the popover. The bar itself has
  // overflow-x: auto for horizontal scrolling of chips, which would
  // CLIP an absolutely-positioned popover. So we measure the bar's
  // rect and render the popover via a portal at `position: fixed`
  // outside the overflow container.
  const barRef = useRef<HTMLDivElement | null>(null);
  const [popRect, setPopRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!mentionPopoverOpen || !barRef.current) {
      setPopRect(null);
      return;
    }
    const update = () => {
      if (barRef.current) setPopRect(barRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [mentionPopoverOpen]);

  // Hide the entire bar when there's nothing to show or add — no point
  // taking vertical real-estate on a fresh single-chart session that
  // has no other charts available to pin.
  if (!workspaceData) return null;
  if (chartsInContext.length === 0 && savedSessions.length === 0) return null;

  const addable = savedSessions.filter(
    s => s.id !== currentSessionId && !chartsInContext.some(c => c.id === s.id),
  );

  return (
    <>
    <div
      ref={barRef}
      data-mobile-multi-chart-chips
      style={{
        position: "relative",
        borderTop: "0.5px solid rgba(255,255,255,0.06)",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        padding: "6px 12px",
        background: "rgba(13, 13, 22, 0.4)",
        display: "flex",
        gap: 6,
        alignItems: "center",
        flexShrink: 0,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}
    >
      <span style={{
        fontSize: 9, color: "var(--muted)",
        textTransform: "uppercase" as const, letterSpacing: "0.06em",
        whiteSpace: "nowrap", flexShrink: 0, marginRight: 4,
      }}>
        Charts in chat:
      </span>

      {/* Primary chart — always implicit chart 1 */}
      <span
        title="Primary chart (the workspace you're in)"
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 10px", borderRadius: 999,
          border: "0.5px solid rgba(201,169,110,0.4)",
          background: "rgba(201,169,110,0.10)",
          color: "var(--accent)",
          fontSize: 11, fontWeight: 500,
          whiteSpace: "nowrap", flexShrink: 0,
        }}
      >
        <span style={{ opacity: 0.7 }}>{genderGlyph(birthDetails.gender)}</span>
        {(workspaceData as any).name}
        <span style={{ fontSize: 8, opacity: 0.55, marginLeft: 2 }}>PRIMARY</span>
      </span>

      {/* Pinned additional charts */}
      {chartsInContext.map((cs, idx) => (
        <span
          key={cs.id || idx}
          title={`${cs.name || cs.birthDetails?.name} — tap × to remove`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 4px 3px 10px", borderRadius: 999,
            border: "0.5px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text)",
            fontSize: 11, fontWeight: 500,
            whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          <span style={{ opacity: 0.7 }}>{genderGlyph(cs.birthDetails?.gender)}</span>
          {cs.name || cs.birthDetails?.name}
          <button
            type="button"
            aria-label={`Remove ${cs.name} from chat`}
            onClick={() => setChartsInContext(prev => prev.filter(c => c.id !== cs.id))}
            style={{
              marginLeft: 2, width: 18, height: 18, padding: 0,
              borderRadius: 999, border: "none", background: "transparent",
              color: "var(--muted)", cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, lineHeight: 1,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#f87171"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"}
          >
            ×
          </button>
        </span>
      ))}

      {/* + Add chart button — opens picker. Hidden when no charts can
          be added OR when the 3-additional cap is reached. */}
      {addable.length > 0 && chartsInContext.length < 3 && (
        <button
          type="button"
          onClick={() => setMentionPopoverOpen(v => !v)}
          title="Add another saved chart to this chat"
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 10px", borderRadius: 999,
            border: "0.5px dashed rgba(201,169,110,0.45)",
            background: "transparent", color: "var(--accent)",
            fontSize: 10.5, fontWeight: 500,
            cursor: "pointer", whiteSpace: "nowrap",
            fontFamily: "inherit", flexShrink: 0,
          }}
        >
          + Add chart
        </button>
      )}

      {chartsInContext.length >= 3 && (
        <span style={{ fontSize: 9.5, color: "var(--muted)", fontStyle: "italic", flexShrink: 0 }}>
          max 4 charts per chat
        </span>
      )}

    </div>

    {/* Phase 9.10f — popover rendered via portal so it escapes the
        bar's `overflow-x: auto` clipping context. Positioned via
        fixed coords from the bar's bounding rect. Anchored ABOVE
        the bar (i.e. its bottom edge sits 4px above the bar's top)
        so it never falls behind the bottom nav. Backdrop click
        anywhere outside closes the popover. */}
    {mentionPopoverOpen && popRect && typeof document !== "undefined" && createPortal(
      <>
        <div
          aria-hidden
          onClick={() => setMentionPopoverOpen(false)}
          style={{
            position: "fixed", inset: 0,
            zIndex: 71,
            background: "transparent",
          }}
        />
        <div
          role="dialog"
          aria-label="Pick a saved chart to add"
          style={{
            position: "fixed",
            left: Math.max(8, popRect.left + 8),
            right: Math.max(8, window.innerWidth - popRect.right + 8),
            bottom: window.innerHeight - popRect.top + 4,
            zIndex: 72,
            background: "rgba(13, 13, 22, 0.96)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "0.5px solid rgba(201,169,110,0.3)",
            borderRadius: 10,
            padding: 8,
            maxHeight: "min(320px, 50vh)",
            overflowY: "auto",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{
            fontSize: 9, color: "var(--muted)",
            textTransform: "uppercase" as const, letterSpacing: "0.08em",
            marginBottom: 6, padding: "0 4px",
          }}>
            Pick a saved chart to add
          </div>
          {addable.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setChartsInContext(prev => [...prev, s]);
                setMentionPopoverOpen(false);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "12px",
                borderRadius: 8, border: "none", background: "transparent",
                color: "var(--text)", fontSize: 13,
                textAlign: "left", cursor: "pointer",
                fontFamily: "inherit", minHeight: 44,
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,169,110,0.08)"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
            >
              <span style={{ opacity: 0.7 }}>{genderGlyph(s.birthDetails?.gender)}</span>
              <span style={{ fontWeight: 600 }}>{s.name || s.birthDetails?.name || "Unnamed"}</span>
              <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>
                {s.birthDetails?.date}
              </span>
            </button>
          ))}
          {addable.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--muted)", padding: 12, textAlign: "center" }}>
              No other saved charts to add — tap &quot;+ New Chart&quot; in the header.
            </div>
          )}
        </div>
      </>,
      document.body,
    )}
    </>
  );
}
