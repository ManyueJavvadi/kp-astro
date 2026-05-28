"use client";

/**
 * BottomDrawer — the Google-Maps-style draggable bottom sheet for
 * showing focused-entity details on mobile.
 *
 * Part of Phase 9.2 mobile cross-reference design language.
 * See `.claude/research/mobile-cross-reference-design.md` §1.② for spec.
 *
 * What this component does:
 *   - Renders ONLY on mobile (≤819px) AND only when SelectionContext
 *     has a non-null `selected` entity.
 *   - Three snap states: peek (15vh) / default (50vh) / full (90vh).
 *     User drags handle to switch states or dismiss.
 *   - Content swaps based on `selected` entity type. For now (Phase 9.2),
 *     content is a placeholder per-type renderer. Future phases
 *     (9.4 EntityPeek, 9.5 EntityChip, 9.7 BreadcrumbStrip) will replace
 *     these with richer rendering.
 *   - Background remains interactive. Tapping a NEW entity behind the
 *     drawer REPLACES drawer content (no stacking — per NN/G warning).
 *   - Swipe down past peek → dismiss (clears selection).
 *
 * What this component does NOT do:
 *   - It does NOT render on desktop (desktop uses the existing
 *     HousePanel + sidebar layout).
 *   - It does NOT show pin tray (that's Phase 9.6, PinTray.tsx).
 *   - It does NOT render breadcrumb (Phase 9.7).
 *   - It does NOT compute glow hierarchy (Phase 9.8).
 *
 * Maintainability:
 *   - To add a new entity type to the drawer, add a case in
 *     `renderContent()` below. The type system will guide you — adding
 *     a new SelectedEntity member in lib/selection/types.ts will
 *     produce a TypeScript switch-exhaustiveness error here.
 *   - The drawer is intentionally NOT split into sub-components yet;
 *     keep it single-file until per-entity content grows enough to
 *     justify extraction (likely after Phase 9.4+).
 */

import { useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useDrawerSnap } from "@/hooks/useDrawerSnap";
import { useSelection, entityLabel, type SelectedEntity } from "../../lib/selection";
// PR Phase 9.7 — drill-down breadcrumb shown between header and content.
// Self-gated: renders nothing when history is empty.
import BreadcrumbStrip from "./BreadcrumbStrip";

export default function BottomDrawer() {
  const isMobile = useIsMobile();
  const { selected, clear } = useSelection();
  const { snap, setSnap, dragProps, sheetStyle, dragging } = useDrawerSnap({
    onDismiss: clear,
    initialSnap: "default",
  });

  // Reset snap to "default" each time a NEW entity is selected (so a
  // fresh tap always opens at a comfortable default size, even if user
  // had previously dragged to peek).
  useEffect(() => {
    if (selected != null) {
      setSnap("default");
    }
    // selected is the trigger; setSnap is stable from useDrawerSnap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Render gate: mobile-only, only when something is selected.
  if (!isMobile || selected == null) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"   /* Background stays interactive on purpose */
      aria-label={`Details for ${entityLabel(selected)}`}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,        /* Above bottom nav (~50) and CommandOrb (50) */
        background: "rgba(13, 13, 22, 0.96)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderTop: "0.5px solid rgba(201, 169, 110, 0.25)",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.4)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...sheetStyle,
      }}
    >
      {/* Drag handle — full-width tap target containing the visible grip */}
      <div
        {...dragProps}
        aria-label="Drag drawer up or down to resize"
        style={{
          ...dragProps.style,
          padding: "10px 16px 6px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          background: "transparent",
        }}
      >
        {/* Visible grip pill */}
        <div
          style={{
            width: 44,
            height: 4,
            borderRadius: 999,
            background: dragging ? "rgba(201,169,110,0.6)" : "rgba(255,255,255,0.18)",
            transition: dragging ? "none" : "background 140ms",
          }}
        />
      </div>

      {/* Header row: title + close X */}
      <div
        style={{
          padding: "0 16px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
              fontWeight: 600,
            }}
          >
            {entityTypeLabel(selected)}
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {entityLabel(selected)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {/* Snap-state toggle: collapse to peek if at default/full,
              expand if at peek. Just a quick affordance — most users
              will drag the grip. */}
          <button
            type="button"
            aria-label={
              snap === "peek" ? "Expand drawer" : "Collapse to peek"
            }
            onClick={() => setSnap(snap === "peek" ? "default" : "peek")}
            style={{
              width: 36,
              height: 36,
              border: "none",
              background: "transparent",
              color: "var(--muted)",
              cursor: "pointer",
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 140ms, color 140ms, transform 140ms",
              transform: snap === "peek" ? "rotate(180deg)" : "rotate(0deg)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
            }}
          >
            <ChevronDown size={18} />
          </button>
          <button
            type="button"
            aria-label="Close drawer"
            onClick={clear}
            style={{
              width: 36,
              height: 36,
              border: "none",
              background: "transparent",
              color: "var(--muted)",
              cursor: "pointer",
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 140ms, color 140ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* PR Phase 9.7 — drill-down breadcrumb (self-gated when empty) */}
      <BreadcrumbStrip />

      {/* Content area — scrolls within the drawer */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 16px 24px",
          fontSize: 13,
          color: "var(--text)",
          lineHeight: 1.55,
        }}
      >
        {renderContent(selected)}
      </div>
    </div>
  );
}

// ── Per-entity-type label (small chip above the big title) ────────
function entityTypeLabel(e: NonNullable<SelectedEntity>): string {
  switch (e.type) {
    case "house":      return "House";
    case "planet":     return "Planet";
    case "dasha_lord": return `${e.layer} lord`;
    case "nakshatra":  return "Nakshatra";
    case "sub_lord":   return "Sub lord";
  }
}

/**
 * Per-entity content renderer.
 *
 * Phase 9.2 — this is INTENTIONALLY placeholder content. Each subsequent
 * phase will fill in richer rendering:
 *   - Phase 9.4 EntityPeek: long-press tooltip uses the same data shape
 *   - Phase 9.5 EntityChip: inline chip uses entityLabel only
 *   - Phase 9.7 BreadcrumbStrip: adds the breadcrumb at the top of this content
 *   - Phase 9.8 glow hierarchy: doesn't change drawer; affects external glow
 *
 * Future enhancement: pull live workspaceData here via context bridge
 * so the drawer shows the same data the existing HousePanel shows on
 * desktop. For now we show the entity identity + a CTA.
 */
function renderContent(e: NonNullable<SelectedEntity>) {
  return (
    <div>
      <p style={{ marginTop: 0, marginBottom: 12, color: "var(--muted)" }}>
        {/* Phase 9.2 placeholder — Phase 9.3+ will populate with the
            real per-entity detail (4-step CSL chain for houses, full
            signification list for planets, dasha tree for dasha lords, etc.) */}
        Full {e.type === "house" ? "house" : e.type === "planet" ? "planet" : "entity"} detail
        will render here as Phase 9 progresses. For now this is a
        placeholder so the drawer mechanics can be verified on real devices.
      </p>
      <div
        style={{
          padding: 12,
          borderRadius: 8,
          background: "rgba(201, 169, 110, 0.06)",
          border: "0.5px solid rgba(201, 169, 110, 0.15)",
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        <div style={{ fontWeight: 600, color: "var(--accent)", marginBottom: 4 }}>
          Entity: {entityLabel(e)}
        </div>
        <div>Type: <code>{e.type}</code></div>
        {"layer" in e && (
          <div>
            Dasha layer: <code>{e.layer}</code>
          </div>
        )}
      </div>
    </div>
  );
}
