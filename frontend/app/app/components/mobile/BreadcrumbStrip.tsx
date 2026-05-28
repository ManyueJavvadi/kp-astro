"use client";

/**
 * BreadcrumbStrip — drill-down history surfaced inside BottomDrawer.
 *
 * Part of Phase 9.7 mobile cross-reference design language.
 * See `.claude/research/mobile-cross-reference-design.md` §1.⑦.
 *
 * Reads SelectionContext.history (populated on every select()) and
 * renders the breadcrumb path as: H7 › Venus › MD Saturn › [current].
 * Tap any crumb → jumpToHistory(index) → that entity becomes the
 * current selection (drawer content swaps, anything newer in the
 * history pops off the stack).
 *
 * Hidden when history is empty (i.e., user has only selected one
 * thing this session). Appears as soon as they drill from one entity
 * to another.
 *
 * Designed to live inside the BottomDrawer's header area on mobile
 * (between the title row and the content body). Can also be used in
 * a sidebar context if desktop ever wants the drill-down trail.
 *
 * Layout: horizontal scrollable strip with `›` separators. Newest
 * crumb on the right (oldest on the left). Current selection is NOT
 * shown as a crumb (it's already in the drawer header) — the crumbs
 * are the breadcrumb PATH that led here.
 *
 * Maintainability: HISTORY_MAX cap is enforced by SelectionContext
 * (not here). To change the visual style, edit only this file.
 */

import React from "react";
import { ChevronRight, X } from "lucide-react";
import { useSelection, entityLabel } from "../../lib/selection";
import { PLANET_COLORS } from "../constants";

interface BreadcrumbStripProps {
  /** Pass-through className for positioning by parent. */
  className?: string;
  /** Pass-through inline style. */
  style?: React.CSSProperties;
}

export default function BreadcrumbStrip({ className, style }: BreadcrumbStripProps) {
  const { history, jumpToHistory, clearHistory } = useSelection();

  // Hidden when empty — saves vertical space when drawer is fresh.
  if (history.length === 0) return null;

  return (
    <div
      role="navigation"
      aria-label="Selection breadcrumb"
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "6px 8px",
        overflowX: "auto",
        fontSize: 11,
        color: "var(--muted)",
        borderBottom: "0.5px solid rgba(255, 255, 255, 0.04)",
        flexShrink: 0,
        ...style,
      }}
    >
      {history.map((entry, i) => {
        const color = chipColorForEntry(entry.entity);
        return (
          <React.Fragment key={`bc-${i}`}>
            <button
              type="button"
              onClick={() => jumpToHistory(i)}
              aria-label={`Jump back to ${entry.label}`}
              style={{
                background: "transparent",
                border: "none",
                color,
                fontWeight: 600,
                fontFamily: "inherit",
                fontSize: 11,
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: 4,
                whiteSpace: "nowrap",
                transition: "background 120ms",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.06)"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
            >
              {entry.label}
            </button>
            <ChevronRight
              size={10}
              style={{ color: "var(--muted)", opacity: 0.5, flexShrink: 0 }}
              aria-hidden="true"
            />
          </React.Fragment>
        );
      })}
      {/* Current entity marker — non-interactive (drawer header IS the
          current selection; this is just for visual continuity). */}
      <span
        style={{
          padding: "2px 6px",
          color: "var(--accent)",
          fontWeight: 700,
          whiteSpace: "nowrap",
          fontSize: 11,
        }}
      >
        now
      </span>
      {/* Clear breadcrumb button — small, only visible when there's
          a trail. Doesn't clear current selection, just the history. */}
      <button
        type="button"
        onClick={clearHistory}
        aria-label="Clear breadcrumb trail"
        title="Clear trail"
        style={{
          marginLeft: "auto",
          width: 22,
          height: 22,
          padding: 0,
          border: "none",
          background: "transparent",
          color: "var(--muted)",
          cursor: "pointer",
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"}
      >
        <X size={12} />
      </button>
    </div>
  );
}

/** Color cue per entity type — mirrors EntityChip/PinTray pattern. */
function chipColorForEntry(entity: ReturnType<typeof useSelection>["history"][number]["entity"]): string {
  if (!entity) return "var(--muted)";
  switch (entity.type) {
    case "house":      return "var(--accent)";
    case "planet":     return PLANET_COLORS[entity.value] ?? "var(--accent)";
    case "dasha_lord": return PLANET_COLORS[entity.value] ?? "var(--accent)";
    case "nakshatra":  return "var(--accent)";
    case "sub_lord":   return "var(--accent)";
  }
}

// Re-export for type-checkers — keep entityLabel surface stable.
export { entityLabel };
