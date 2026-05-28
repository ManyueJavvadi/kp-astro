"use client";

/**
 * EntityPeek — wraps any tappable entity with long-press peek tooltip.
 *
 * Part of Phase 9.4 mobile cross-reference design language.
 * See `.claude/research/mobile-cross-reference-design.md` §1.③.
 *
 * Behavior:
 *   - Quick tap → calls onTap (parent's existing click handler);
 *     typical use: tap = open drawer for this entity.
 *   - Long-press (≥ 400ms) → shows a small floating tooltip with key
 *     facts about the entity, anchored above the touch point.
 *     Release finger → tooltip dismisses. Drag finger > 6 px → cancels
 *     both long-press and tap (drag fall-through).
 *
 * Validated in production by Cosmic Insights (App Store) which uses
 * long-press on any house to show popup info. Pattern is familiar
 * to existing astrology mobile users — no education cost.
 *
 * Usage:
 *   <EntityPeek entity={{ type: "planet", value: "Venus" }} peek={
 *     <PlanetPeekCard planetName="Venus" />
 *   }>
 *     <YourClickableContent />
 *   </EntityPeek>
 *
 * The wrapper renders a `<span>` (or `<div>` via `as` prop) around
 * children — be aware this adds one extra DOM node. For most use
 * cases that's fine.
 *
 * Currently mobile-only (peek tooltip is overkill on desktop where
 * users have hover; future enhancement could make this conditional).
 */

import React, { useState, useRef, useEffect } from "react";
import { useLongPress } from "@/hooks/useLongPress";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSelection, type SelectedEntity } from "../../lib/selection";

interface EntityPeekProps {
  /** The entity this wrapper represents — pinned/selected via long-press. */
  entity: NonNullable<SelectedEntity>;
  /** Content shown in the peek tooltip while holding. */
  peek: React.ReactNode;
  /** Children rendered inside the wrapper (the visible cell/glyph/text). */
  children: React.ReactNode;
  /** Element tag — defaults to "span" (inline). Use "div" for block-level. */
  as?: "span" | "div";
  /**
   * Optional override for the quick-tap action. Defaults to selecting
   * the entity (which opens the BottomDrawer on mobile).
   */
  onTap?: () => void;
  /** Pass-through className to the wrapper. */
  className?: string;
  /** Pass-through inline style to the wrapper. */
  style?: React.CSSProperties;
}

export default function EntityPeek({
  entity, peek, children, as = "span", onTap, className, style,
}: EntityPeekProps) {
  const isMobile = useIsMobile();
  const { select } = useSelection();
  const [peekOpen, setPeekOpen] = useState(false);
  const [peekPos, setPeekPos]   = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const tooltipRef              = useRef<HTMLDivElement | null>(null);

  const { bind } = useLongPress({
    delayMs: 400,
    moveThreshold: 6,
    onLongPress: (e) => {
      // Anchor tooltip above the touch point.
      setPeekPos({ x: e.clientX, y: e.clientY });
      setPeekOpen(true);
    },
    onTap: () => {
      if (onTap) onTap();
      else       select(entity);
    },
  });

  // Auto-dismiss tooltip on global pointerup (catches finger-release
  // outside the wrapper, e.g., user drags off the cell after long-press).
  useEffect(() => {
    if (!peekOpen) return;
    const handler = () => setPeekOpen(false);
    // Use pointerup on window with a short timeout so the long-press
    // gesture's own pointerup doesn't immediately fire this listener.
    const id = setTimeout(() => {
      window.addEventListener("pointerup", handler, { once: true });
    }, 50);
    return () => {
      clearTimeout(id);
      window.removeEventListener("pointerup", handler);
    };
  }, [peekOpen]);

  // Desktop fall-through: long-press is awkward on a mouse, so on
  // desktop we just render children with onClick → select. Peek tooltip
  // never shows on desktop.
  if (!isMobile) {
    const Tag = as as "span";
    return (
      <Tag
        className={className}
        style={style}
        onClick={onTap ?? (() => select(entity))}
      >
        {children}
      </Tag>
    );
  }

  const Tag = as as "span";
  return (
    <>
      <Tag
        {...bind}
        className={className}
        style={{ ...style, ...bind.style, display: "inline-block" }}
      >
        {children}
      </Tag>
      {peekOpen && (
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: "fixed",
            left: clampLeft(peekPos.x),
            top: Math.max(8, peekPos.y - 80),  /* above touch point */
            zIndex: 70,
            background: "rgba(13, 13, 22, 0.97)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "0.5px solid rgba(201, 169, 110, 0.5)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            color: "var(--text)",
            lineHeight: 1.5,
            maxWidth: 240,
            minWidth: 140,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5), 0 0 24px rgba(201, 169, 110, 0.15)",
            pointerEvents: "none",
            transform: "translateX(-50%)",
            animation: "entity-peek-fade-in 140ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {peek}
        </div>
      )}
    </>
  );
}

/** Keep tooltip inside the viewport horizontally (8 px margin). */
function clampLeft(x: number): number {
  if (typeof window === "undefined") return x;
  const w = window.innerWidth;
  return Math.min(Math.max(x, 120), w - 8);
}
