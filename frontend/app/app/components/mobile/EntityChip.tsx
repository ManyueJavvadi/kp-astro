"use client";

/**
 * EntityChip — inline tappable entity reference (Phase 9.5).
 *
 * Part of Phase 9 mobile cross-reference design language.
 * See `.claude/research/mobile-cross-reference-design.md` §1.⑥.
 *
 * Wraps an entity mention in AI answer text (or any narrative content)
 * with a subtle pill that:
 *   - Tap → sets the global selection to this entity → drawer opens
 *     on mobile, glow lights up everywhere (desktop + mobile)
 *   - Looks like styled inline text (a thin gold underline + slight
 *     background pill) — distinguishable but not heavy
 *
 * Per-entity-type subtle color cues:
 *   - house      → gold (matches accent)
 *   - planet     → planet's PLANET_COLORS color
 *   - dasha_lord → planet's color + small superscript layer badge
 *   - nakshatra  → muted gold
 *   - sub_lord   → muted text + "sub" superscript
 *
 * Used on BOTH desktop and mobile. The chip is platform-neutral —
 * the bottom drawer reaction is mobile-only (BottomDrawer self-gates),
 * but the glow reaction is everywhere.
 *
 * Maintainability: when a new SelectedEntity type ships, add a case
 * in `chipColor()` below. TypeScript will guide you (exhaustive switch).
 */

import React from "react";
import { useSelection, type SelectedEntity, entitiesEqual } from "../../lib/selection";
import { PLANET_COLORS } from "../constants";

interface EntityChipProps {
  /** The entity this chip represents. */
  entity: NonNullable<SelectedEntity>;
  /** Visible text content of the chip (typically matches entity name). */
  children: React.ReactNode;
}

export default function EntityChip({ entity, children }: EntityChipProps) {
  const { selected, select } = useSelection();
  const isSelected = entitiesEqual(selected, entity);
  const color = chipColor(entity);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        // Toggle: tapping the already-selected entity deselects.
        if (isSelected) select(null);
        else            select(entity);
      }}
      aria-label={`Focus ${entity.type} ${entity.value}`}
      aria-pressed={isSelected}
      style={{
        display: "inline",
        padding: "1px 6px",
        margin: "0 1px",
        borderRadius: 6,
        background: isSelected ? "rgba(212, 175, 55, 0.18)" : "rgba(212, 175, 55, 0.05)",
        border: `0.5px solid ${isSelected ? "rgba(212, 175, 55, 0.55)" : "rgba(212, 175, 55, 0.18)"}`,
        color: color,
        fontFamily: "inherit",
        fontSize: "inherit",
        fontWeight: 600,
        cursor: "pointer",
        textDecoration: isSelected ? "none" : "underline dotted rgba(212, 175, 55, 0.4)",
        textUnderlineOffset: 2,
        whiteSpace: "nowrap",
        transition: "background 140ms, border-color 140ms, color 140ms",
        verticalAlign: "baseline",
        lineHeight: "inherit",
      }}
    >
      {children}
    </button>
  );
}

/** Color cue per entity type. */
function chipColor(e: NonNullable<SelectedEntity>): string {
  switch (e.type) {
    case "house":      return "var(--accent)";
    case "planet":     return PLANET_COLORS[e.value] ?? "var(--accent)";
    case "dasha_lord": return PLANET_COLORS[e.value] ?? "var(--accent)";
    case "nakshatra":  return "var(--accent)";
    case "sub_lord":   return "var(--accent)";
  }
}
