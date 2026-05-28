"use client";

/**
 * MobileChartPillStrip — multi-chart switcher for mobile.
 *
 * Phase 9.10c — desktop has a left-rail workspace sidebar listing all
 * saved chart sessions (Manyue / Ramya / Vineetha…). On mobile that
 * sidebar is hidden by the responsive shell, leaving no way to see
 * which charts you have or jump between them without opening the
 * "More" sheet. This pill strip restores the at-a-glance multi-chart
 * affordance.
 *
 * Pattern: a single horizontal scrollable strip mounted just under
 * PersonHeroBanner. Each chart is a pill showing the first name +
 * gender glyph; the active chart is gold-highlighted. Tap any pill
 * → switch chart (calls onSwitchSession). The active pill is
 * non-interactive (you're already there).
 *
 * Hidden when only one chart exists OR savedSessions is empty —
 * no point showing a chooser of one.
 *
 * Why a horizontal strip (not a dropdown):
 *   - Multi-chart comparison is a primary KP-astrologer workflow
 *     (cross-chart analysis, parent/child compatibility, etc.).
 *     Pills keep all charts visible at all times — one tap to swap.
 *   - Dropdowns hide options behind another tap.
 *   - Matches the desktop sidebar list semantics directly.
 *
 * Maintainability:
 *   - Pill rendering follows the same "first name + ♂/♀ + dasha
 *     label" shape that the desktop workspace-sidebar uses (see
 *     page.tsx around line 4171).
 *   - When a new chart is added (+ New Chart), the strip grows
 *     automatically — no extra wiring needed.
 */

import React from "react";
import type { ChartSession } from "../../types";

interface MobileChartPillStripProps {
  /** All saved sessions (does NOT include the active workspace). */
  savedSessions: ChartSession[];
  /** Id of the currently-active workspace chart. */
  currentSessionId: string;
  /** Live name from workspaceData so the active pill shows the
   *  freshest name (before the active chart is snapshotted). */
  activeName?: string;
  /** Live gender for the active pill glyph. */
  activeGender?: string;
  onSwitchSession: (s: ChartSession) => void;
}

const genderGlyph = (g?: string) =>
  g === "male" ? "♂" : g === "female" ? "♀" : "◈";

export default function MobileChartPillStrip({
  savedSessions, currentSessionId, activeName, activeGender, onSwitchSession,
}: MobileChartPillStripProps) {
  // Hidden when there's only one chart in play.
  const total = savedSessions.length + (activeName ? 1 : 0);
  if (total < 2) return null;

  // Active chart pill comes first, then all other saved sessions
  // (excluding the active one — page.tsx snapshots it into savedSessions
  // on switch, so it sometimes appears in both; de-dupe by id).
  const others = savedSessions.filter(s => s.id !== currentSessionId);

  return (
    <div
      role="navigation"
      aria-label="Switch chart"
      className="mobile-chart-pill-strip"
      style={{
        display: "flex",
        gap: 6,
        padding: "8px 14px",
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        background: "rgba(255,255,255,0.015)",
        borderBottom: "0.5px solid rgba(255,255,255,0.04)",
        flexShrink: 0,
      }}
    >
      {/* Active chart — first, highlighted, non-interactive */}
      {activeName && (
        <PillButton
          name={activeName.split(" ")[0]}
          glyph={genderGlyph(activeGender)}
          active
          ariaCurrent
        />
      )}

      {/* Other saved sessions — tap to switch */}
      {others.map(s => {
        const name = (s.name || "—").split(" ")[0];
        const gender = s.birthDetails?.gender;
        const dasha = s.workspaceData?.mahadasha?.lord_en || "";
        return (
          <PillButton
            key={s.id}
            name={name}
            glyph={genderGlyph(gender)}
            subtitle={dasha ? `MD ${dasha}` : undefined}
            onClick={() => onSwitchSession(s)}
          />
        );
      })}
    </div>
  );
}

// ── Single pill ─────────────────────────────────────────────────────
function PillButton({
  name, glyph, subtitle, active, onClick, ariaCurrent,
}: {
  name: string;
  glyph: string;
  subtitle?: string;
  active?: boolean;
  onClick?: () => void;
  ariaCurrent?: boolean;
}) {
  const interactive = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      aria-current={ariaCurrent ? "page" : undefined}
      style={{
        flexShrink: 0,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 1,
        padding: subtitle ? "5px 11px 6px" : "7px 12px",
        borderRadius: 999,
        background: active ? "rgba(201,169,110,0.12)" : "rgba(255,255,255,0.03)",
        border: `0.5px solid ${active ? "rgba(201,169,110,0.55)" : "rgba(255,255,255,0.08)"}`,
        color: active ? "var(--accent)" : "var(--text)",
        fontFamily: "inherit",
        cursor: interactive ? "pointer" : "default",
        transition: "background 140ms, border-color 140ms",
        minHeight: 30,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: active ? 700 : 600 }}>
        <span style={{ opacity: 0.7 }}>{glyph}</span>
        {name}
      </span>
      {subtitle && (
        <span style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.02em" }}>
          {subtitle}
        </span>
      )}
    </button>
  );
}
