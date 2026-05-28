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
// Phase 9.10b — real KP-doctrine house body inside the drawer (replaces
// the Phase 9.2 placeholder text). Same component the desktop HousePanel
// embeds, so what the astrologer sees on tablet/desktop is byte-identical
// here on the phone.
import HousePanelContent from "../workspace/HousePanelContent";

/**
 * Optional workspace data the drawer needs to render rich KP content
 * (occupants, significators, sub-lord chain, dasha overlays). When
 * absent the drawer falls back to a minimal label-only view — used as
 * a graceful degradation when the chart hasn't loaded yet.
 */
export interface BottomDrawerData {
  cusps?: any[];
  significators?: any;
  planets?: any[];
  rulingPlanets?: string[];
  antardashas?: any[];
}

interface BottomDrawerProps {
  /** Live workspace data from page.tsx — passed so the drawer can
   *  render the full HousePanel content body. */
  workspace?: BottomDrawerData;
}

export default function BottomDrawer({ workspace }: BottomDrawerProps = {}) {
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
        {renderContent(selected, workspace)}
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
 * Phase 9.10b — replaces the Phase 9.2 placeholder text with the real
 * KP-doctrine surfaces. Each entity type now shows the same data that
 * the desktop overlay panels show, optimized for the drawer's vertical
 * scroll context:
 *
 *   - house      → <HousePanelContent /> — cusp, sub-lord chain,
 *                  occupants, 4-level significators, fruitful, active
 *                  dasha periods. Identical sections to desktop
 *                  HousePanel overlay.
 *   - planet     → planet identity + house/sign/star/sub lord card
 *                  (full PlanetList row data, vertical layout).
 *   - dasha_lord → which dasha layer (MD/AD/PAD/SD) + lord planet's
 *                  natal placement (house/sign/star/sub).
 *   - nakshatra  → name + sign + lord planet.
 *   - sub_lord   → name only (sub-lord is identified by planet —
 *                  pivot to that planet's detail).
 *
 * When `workspace` is undefined or missing required fields (e.g. the
 * chart hasn't finished loading), the renderer degrades to a minimal
 * identity card — never a hard error.
 */
function renderContent(
  e: NonNullable<SelectedEntity>,
  workspace?: { cusps?: any[]; significators?: any; planets?: any[]; rulingPlanets?: string[]; antardashas?: any[] },
) {
  // House — embed the shared HousePanelContent.
  if (e.type === "house" && typeof e.value === "number") {
    if (workspace?.cusps && workspace?.planets) {
      return (
        <HousePanelContent
          house={e.value}
          cusps={workspace.cusps}
          significators={workspace.significators ?? {}}
          planets={workspace.planets}
          rulingPlanets={workspace.rulingPlanets ?? []}
          antardashas={workspace.antardashas ?? []}
          bottomPad={24}
        />
      );
    }
    return <MinimalIdentity e={e} note="House data is loading…" />;
  }

  // Planet — show natal placement card (house, sign, star lord, sub lord).
  if (e.type === "planet" && workspace?.planets) {
    const p = workspace.planets.find((x: any) => x.planet_en === e.value);
    if (p) return <PlanetDetailCard p={p} />;
    return <MinimalIdentity e={e} note="Planet not found in this chart." />;
  }

  // Dasha lord — show which layer + the lord's natal placement.
  if (e.type === "dasha_lord" && workspace?.planets) {
    const p = workspace.planets.find((x: any) => x.planet_en === e.value);
    return (
      <div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
          Currently focused dasha layer: <strong style={{ color: "var(--accent)" }}>{e.layer}</strong>
        </div>
        {p ? <PlanetDetailCard p={p} /> : <MinimalIdentity e={e} note="Lord planet data unavailable." />}
      </div>
    );
  }

  // Nakshatra / sub_lord — minimal identity card for now (these need
  // their own data shapes; will enrich in a follow-up).
  return <MinimalIdentity e={e} />;
}

// ── Minimal identity fallback ───────────────────────────────────────
function MinimalIdentity({ e, note }: { e: NonNullable<SelectedEntity>; note?: string }) {
  return (
    <div>
      {note && (
        <p style={{ marginTop: 0, marginBottom: 10, color: "var(--muted)", fontSize: 12 }}>
          {note}
        </p>
      )}
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
          {entityLabel(e)}
        </div>
        <div>Type: <code>{e.type}</code></div>
        {"layer" in e && (
          <div>Dasha layer: <code>{e.layer}</code></div>
        )}
      </div>
    </div>
  );
}

// ── Planet detail card — vertical mobile layout ─────────────────────
function PlanetDetailCard({ p }: { p: any }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontSize: 22, fontWeight: 700,
          color: "var(--accent)",
          fontFamily: "'DM Serif Display', serif",
        }}>
          {p.planet_en}{p.retrograde ? " ℞" : ""}
        </span>
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 999,
          background: "rgba(201,169,110,0.1)",
          color: "var(--accent)",
          border: "0.5px solid rgba(201,169,110,0.3)",
        }}>
          H{p.house}
        </span>
      </div>

      <FieldRow label="Sign"   value={`${p.sign_en} ${p.degree_in_sign?.toFixed(2)}°`} />
      <FieldRow label="Nakshatra" value={p.nakshatra_en} />
      <FieldRow label="Star Lord"  value={p.star_lord_en} accent />
      <FieldRow label="Sub Lord"   value={p.sub_lord_en}  accent />
    </div>
  );
}

function FieldRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
      <span style={{
        fontSize: 9, color: "var(--muted)",
        textTransform: "uppercase" as const, letterSpacing: "0.08em",
        minWidth: 84,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 13,
        fontWeight: accent ? 700 : 500,
        color: accent ? "var(--accent)" : "var(--text)",
      }}>
        {value}
      </span>
    </div>
  );
}
