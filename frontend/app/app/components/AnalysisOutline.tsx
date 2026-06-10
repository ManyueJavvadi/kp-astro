"use client";

/**
 * AnalysisOutline — the conversation navigator for the Analysis tab.
 *
 * 2026-06-10 UX overhaul. Replaces the old always-220px-wide TOC list
 * (which was also hidden below 1100px, i.e. invisible on the phones most
 * astrologers use). Inspired by the Claude-desktop message scrubber the
 * owner referenced:
 *
 *   Desktop — a SLIM vertical tick-rail pinned to the right. One tick per
 *     message (gold = topic answer, grey = follow-up). The tick of the
 *     message currently in view is highlighted (scroll-spy via
 *     IntersectionObserver). Hovering the rail expands it into the full
 *     labelled list; clicking any item smooth-scrolls to that message.
 *
 *   Mobile — a floating "Jump to" pill opens a bottom sheet (drag-to-
 *     dismiss) listing every question; tap jumps + closes. Hover doesn't
 *     exist on touch, so the rail pattern is replaced entirely here.
 *
 * Pure navigation/render layer — it only reads message metadata and calls
 * scrollIntoView. Touches NO AI streaming logic.
 */

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { List, X } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSheetDrag } from "@/hooks/useSheetDrag";

export interface OutlineItem {
  /** Stable key, also used to build the anchor id `analysis-msg-${key}`. */
  key: string;
  /** Short label shown in the expanded rail / sheet. */
  label: string;
  /** Topic answers render bolder/gold; follow-ups are muted + indented. */
  isTopic: boolean;
  /** Optional leading icon (topic glyph). */
  icon?: ReactNode;
}

function scrollToItem(key: string) {
  const el = document.getElementById(`analysis-msg-${key}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Scroll-spy: returns the key of the message nearest the top of the
 * viewport. Observes every `#analysis-msg-${key}` element.
 */
function useActiveItem(items: OutlineItem[]): string | null {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  // Re-run when the set of keys changes.
  const keySig = items.map((i) => i.key).join("|");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const els = items
      .map((i) => document.getElementById(`analysis-msg-${i.key}`))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;

    // Track intersection ratios; the topmost sufficiently-visible element
    // wins. rootMargin biases toward "near the top of the screen".
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = entry.target.id.replace("analysis-msg-", "");
          if (entry.isIntersecting) visible.set(key, entry.intersectionRatio);
          else visible.delete(key);
        }
        // Pick the first item (in document order) that is currently visible.
        const firstVisible = items.find((i) => visible.has(i.key));
        if (firstVisible) setActiveKey(firstVisible.key);
      },
      { root: null, rootMargin: "-10% 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keySig]);

  return activeKey;
}

export function AnalysisOutline({
  items,
  outlineLabel,
  jumpLabel,
}: {
  items: OutlineItem[];
  /** "Outline" / localized. */
  outlineLabel: string;
  /** "Jump to" / localized. */
  jumpLabel: string;
}) {
  const isMobile = useIsMobile();
  const activeKey = useActiveItem(items);
  const [sheetOpen, setSheetOpen] = useState(false);

  // useSheetDrag for the mobile bottom sheet (must be called unconditionally
  // to keep hook order stable).
  const { dragProps, sheetStyle } = useSheetDrag({
    onClose: () => setSheetOpen(false),
  });

  if (items.length < 2) return null;

  // ─── Mobile: floating "Jump to" pill + bottom sheet ────────────────
  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className="analysis-outline-fab"
          onClick={() => setSheetOpen(true)}
          aria-label={jumpLabel}
        >
          <List size={16} />
          <span>{jumpLabel}</span>
        </button>

        {sheetOpen && (
          <div
            className="analysis-outline-sheet-backdrop"
            onClick={() => setSheetOpen(false)}
          >
            <div
              className="analysis-outline-sheet"
              style={sheetStyle}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="analysis-outline-sheet-handle" {...dragProps}>
                <div className="analysis-outline-sheet-grip" />
              </div>
              <div className="analysis-outline-sheet-head">
                <span>{outlineLabel}</span>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close"
                  className="analysis-outline-sheet-close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="analysis-outline-sheet-list">
                {items.map((it) => (
                  <button
                    key={it.key}
                    type="button"
                    className={`analysis-outline-sheet-item ${it.isTopic ? "is-topic" : "is-followup"} ${activeKey === it.key ? "is-active" : ""}`}
                    onClick={() => {
                      scrollToItem(it.key);
                      setSheetOpen(false);
                    }}
                  >
                    {it.icon && <span className="analysis-outline-icon">{it.icon}</span>}
                    <span className="analysis-outline-label">{it.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ─── Desktop: slim tick-rail that expands into a flyout on hover ───
  // The rail reserves only a narrow gutter in flow; the expanded panel is
  // absolutely positioned so hovering NEVER shifts the chat content.
  return (
    <nav className="analysis-outline-rail" aria-label={outlineLabel}>
      <div className="analysis-outline-rail-panel">
        <div className="analysis-outline-rail-eyebrow">{outlineLabel}</div>
        <div className="analysis-outline-rail-items">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              className={`analysis-outline-tick ${it.isTopic ? "is-topic" : "is-followup"} ${activeKey === it.key ? "is-active" : ""}`}
              onClick={() => scrollToItem(it.key)}
              title={it.label}
            >
              <span className="analysis-outline-tick-mark" />
              <span className="analysis-outline-tick-label">
                {it.icon && <span className="analysis-outline-icon">{it.icon}</span>}
                {it.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
