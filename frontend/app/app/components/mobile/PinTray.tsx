"use client";

/**
 * PinTray — small horizontal tray of pinned entity chips.
 *
 * Part of Phase 9.6 mobile cross-reference design language.
 * See `.claude/research/mobile-cross-reference-design.md` §1.⑤.
 *
 * Behavior:
 *   - Renders nothing if pinned[] is empty.
 *   - Renders as a sticky horizontal strip just above the bottom
 *     tab bar (or wherever the layout slots it). Each pin is a small
 *     pill: tap to re-select that entity (drawer reopens + glow);
 *     × button removes the pin.
 *   - Cap of 3 pins (PIN_TRAY_MAX in lib/selection/types.ts). Oldest
 *     drops when a 4th is added.
 *   - Persisted per chart via localStorage scoped by chartScopeKey.
 *     This commit also adds a tiny <ChartScopeBridge> component that
 *     pushes the workspaceData chart identity into SelectionContext
 *     so pins survive page reload (but don't leak across charts).
 *
 * Used: BOTH desktop and mobile. The tray is small enough that desktop
 * users benefit too — useful when comparing entities across tabs.
 *
 * Maintainability: PinTray reads `pinned` + dispatches via the global
 * SelectionContext. To add a "pin from chip" or "pin from drawer"
 * affordance later, just call `pin()` from those places — tray will
 * auto-update.
 */

import React from "react";
import { X } from "lucide-react";
import {
  useSelection, entityLabel, entitiesEqual, type SelectedEntity,
} from "../../lib/selection";
import { PLANET_COLORS } from "../constants";

interface PinTrayProps {
  /**
   * Optional layout hint. Default: "default" (block, full-width strip).
   * Future: could add "compact" / "vertical" variants if needed.
   */
  variant?: "default";
  /** Pass-through className for layout positioning by parent. */
  className?: string;
  /** Pass-through inline style. */
  style?: React.CSSProperties;
}

export default function PinTray({ className, style }: PinTrayProps) {
  const { selected, pinned, select, unpin, pin } = useSelection();

  // Render nothing when tray is empty (saves vertical space).
  if (pinned.length === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Pinned entities"
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: "rgba(13, 13, 22, 0.6)",
        borderTop: "0.5px solid rgba(255, 255, 255, 0.04)",
        borderBottom: "0.5px solid rgba(255, 255, 255, 0.04)",
        overflowX: "auto",
        flexShrink: 0,
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--muted)",
          fontWeight: 600,
          flexShrink: 0,
          marginRight: 2,
          whiteSpace: "nowrap",
        }}
      >
        Pinned:
      </span>
      {pinned.map((p, i) => (
        <PinChip
          key={`${entityLabel(p)}-${i}`}
          entity={p}
          isActive={entitiesEqual(selected, p)}
          onTap={() => select(p)}
          onRemove={() => unpin(i)}
        />
      ))}
      {/* "Pin current" CTA — visible only when there's a current
          selection that isn't already pinned. Makes it discoverable
          to long-press users that pinning exists. */}
      {selected != null && !pinned.some(p => entitiesEqual(p, selected)) && (
        <button
          type="button"
          onClick={() => pin(selected)}
          title="Pin current selection"
          aria-label="Pin current selection"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "3px 8px",
            borderRadius: 999,
            border: "0.5px dashed rgba(201, 169, 110, 0.5)",
            background: "transparent",
            color: "var(--accent)",
            fontSize: 10,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          + Pin {entityLabel(selected)}
        </button>
      )}
    </div>
  );
}

// ── Pin chip subcomponent ─────────────────────────────────────────
function PinChip({
  entity, isActive, onTap, onRemove,
}: {
  entity: SelectedEntity;
  isActive: boolean;
  onTap: () => void;
  onRemove: () => void;
}) {
  if (!entity) return null;
  const color = chipColor(entity);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "3px 3px 3px 9px",
        borderRadius: 999,
        background: isActive ? "rgba(212, 175, 55, 0.20)" : "rgba(255, 255, 255, 0.03)",
        border: `0.5px solid ${isActive ? "rgba(212, 175, 55, 0.55)" : "rgba(255, 255, 255, 0.12)"}`,
        flexShrink: 0,
        whiteSpace: "nowrap",
        transition: "background 140ms, border-color 140ms",
      }}
    >
      <button
        type="button"
        onClick={onTap}
        aria-label={`Focus ${entityLabel(entity)}`}
        aria-pressed={isActive}
        style={{
          background: "transparent",
          border: "none",
          color,
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
          fontFamily: "inherit",
        }}
      >
        {entityLabel(entity)}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${entityLabel(entity)} from pinned`}
        style={{
          width: 18,
          height: 18,
          padding: 0,
          borderRadius: 999,
          border: "none",
          background: "transparent",
          color: "var(--muted)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#f87171"}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"}
      >
        <X size={11} />
      </button>
    </span>
  );
}

/** Same color-cue logic as EntityChip. */
function chipColor(e: NonNullable<SelectedEntity>): string {
  switch (e.type) {
    case "house":      return "var(--accent)";
    case "planet":     return PLANET_COLORS[e.value] ?? "var(--accent)";
    case "dasha_lord": return PLANET_COLORS[e.value] ?? "var(--accent)";
    case "nakshatra":  return "var(--accent)";
    case "sub_lord":   return "var(--accent)";
  }
}
