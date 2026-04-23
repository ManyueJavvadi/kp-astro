"use client";

/*
 * PR20 + PR21 — Mobile Command Orb.
 * PR A2.1 — Drag-to-zone gesture (long-press + drag to a 3×3 zone grid).
 *
 * A draggable, edge-tucking floating orb that is our mobile nav.
 * Inspired by iOS AssistiveTouch + Samsung's floating note toolbox.
 *
 * Two drag modes:
 *   - Reposition (short press + drag): orb follows finger, snaps to edge
 *   - Zone-drag (long press ≥180ms + drag): orb stays pinned, finger hits
 *     one of 9 zone targets; release in a zone = navigate to that tab,
 *     release in center/outside = cancel
 * Short tap still opens the bottom sheet (unchanged).
 *
 * - Orb idle → tucks half into the screen edge with always-on breath
 * - First visit (position) → 1-shot coach mark ("Tap for tabs · Drag to move")
 * - First long-press (zones) → 1-shot coach mark ("Drag to a zone to jump")
 * - Sheet can be dismissed with swipe-down on handle/header (PR21)
 * - Desktop: this component renders null (useIsMobile gate in page.tsx)
 */

import React, { useEffect, useRef, useState } from "react";
import { Plus, Globe2, X, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useSheetDrag } from "@/hooks/useSheetDrag";
import { LogoMark } from "@/components/ui/logo";
import type { ChartSession } from "../types";

type Tab = {
  id: string;
  en: string;
  te: string;
  Icon: LucideIcon;
};

interface CommandOrbProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onNewChart: () => void;
  sessions?: ChartSession[];
  currentSessionId?: string;
  onSwitchSession?: (s: ChartSession) => void;
}

const STORAGE_KEY_POS   = "kp_orb_position_v1";       // { side: "left" | "right", yPct: 0-100 }
const STORAGE_KEY_COACH = "kp_orb_coach_seen_v1";     // "1" when dismissed
const STORAGE_KEY_ZONE_COACH = "kp_orb_zone_coach_seen_v1"; // PR A2.1 — drag-to-zone coach

const LONG_PRESS_MS = 180;   // hold to enter zone-drag mode
const TAP_DEADZONE_PX = 6;   // movement below this is a tap, not a drag

// PR A2.1 — 3×3 zone-to-tab map. Rows: 0=top, 1=middle, 2=bottom.
// Cols: 0=left, 1=center, 2=right. Center of middle row is cancel.
// Layout groups tabs semantically (see plan):
//   top row    = chart's own data   (houses / chart / dasha)
//   middle row = interpretation     (panchang / cancel / analysis)
//   bottom row = situational query  (muhurtha / horary / match)
const ZONE_MAP: string[][] = [
  ["houses",   "chart",  "dasha"],
  ["panchang", "cancel", "analysis"],
  ["muhurtha", "horary", "match"],
];

// Haptic helpers (no-op on browsers without navigator.vibrate, e.g. iOS Safari)
function haptic(ms: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(ms);
    }
  } catch { /* ignore */ }
}

export default function CommandOrb({
  tabs,
  activeTab,
  onTabChange,
  onNewChart,
  sessions = [],
  currentSessionId,
  onSwitchSession,
}: CommandOrbProps) {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [showZoneCoach, setShowZoneCoach] = useState(false);
  const [side, setSide] = useState<"left" | "right">("right");
  const [yPct, setYPct] = useState<number>(60);
  const [dragging, setDragging] = useState(false);
  // PR A2.1 — zone-drag mode state
  const [zoneDragActive, setZoneDragActive] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [zoneClosing, setZoneClosing] = useState(false);  // drives fade-out
  const dragMoved = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orbRef = useRef<HTMLButtonElement | null>(null);

  // ── Hydrate persisted position + coach flag
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_POS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.side === "left" || parsed?.side === "right") setSide(parsed.side);
        if (typeof parsed?.yPct === "number") setYPct(Math.max(6, Math.min(94, parsed.yPct)));
      }
      if (!localStorage.getItem(STORAGE_KEY_COACH)) {
        // Delay the coach so it doesn't fight the initial tab animations.
        const tid = setTimeout(() => setShowCoach(true), 900);
        const off = setTimeout(() => setShowCoach(false), 6900);
        return () => { clearTimeout(tid); clearTimeout(off); };
      }
    } catch {
      // Ignore — localStorage can be blocked in private mode.
    }
  }, []);

  // ── Persist position whenever it changes (only after a drag)
  const persistPosition = (nextSide: "left" | "right", nextYPct: number) => {
    try {
      localStorage.setItem(STORAGE_KEY_POS, JSON.stringify({ side: nextSide, yPct: nextYPct }));
    } catch { /* ignore */ }
  };

  // PR A2.1 — map pointer position to a zone id ("houses"/"chart"/…/"cancel" or null).
  const zoneAtPointer = (clientX: number, clientY: number): string | null => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Inset the grid from the viewport edges so the orb itself isn't
    // sitting inside a cell; also feels less "edge to edge" for touch.
    const INSET = 16;
    if (clientX < INSET || clientX > vw - INSET) return null;
    if (clientY < INSET || clientY > vh - INSET) return null;
    const col = Math.min(2, Math.max(0, Math.floor(((clientX - INSET) / (vw - 2 * INSET)) * 3)));
    const row = Math.min(2, Math.max(0, Math.floor(((clientY - INSET) / (vh - 2 * INSET)) * 3)));
    return ZONE_MAP[row][col];
  };

  // ── Pointer handlers: distinguish tap vs reposition-drag vs zone-drag
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!orbRef.current) return;
    orbRef.current.setPointerCapture(e.pointerId);
    dragMoved.current = false;
    setDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Snapshot orb position so we can preserve it during zone-drag
    const pinnedSide = side;
    const pinnedYPct = yPct;

    // Local flag: tracks whether we've already entered zone-drag mode.
    // Using a ref-free local is safe because move/up close over it.
    let localZoneActive = false;

    // Long-press timer → enter zone-drag mode if still held & barely moved.
    longPressTimer.current = setTimeout(() => {
      // Only arm zone-drag if the user hasn't already started repositioning
      if (dragMoved.current) return;
      localZoneActive = true;
      setZoneDragActive(true);
      setZoneClosing(false);
      setHoveredZone(null);
      haptic(10);
      // Dismiss standard coach; first zone long-press fades in its own coach
      setShowCoach(false);
      try {
        if (!localStorage.getItem(STORAGE_KEY_ZONE_COACH)) {
          setShowZoneCoach(true);
          setTimeout(() => setShowZoneCoach(false), 3200);
        }
      } catch { /* ignore */ }
    }, LONG_PRESS_MS);

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      // If we're in zone-drag mode, don't touch orb position — just update
      // the hovered zone indicator.
      if (localZoneActive) {
        const z = zoneAtPointer(ev.clientX, ev.clientY);
        setHoveredZone(prev => {
          if (prev !== z && z && z !== "cancel") haptic(8);
          return z;
        });
        return;
      }

      // Not yet in zone-drag: dead-zone before treating as reposition-drag.
      if (!dragMoved.current && Math.hypot(dx, dy) < TAP_DEADZONE_PX) return;

      // Moved past deadzone → cancel the long-press timer; this is a
      // reposition-drag.
      dragMoved.current = true;
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      // Follow finger; snap on pointerup.
      const liveSide: "left" | "right" = ev.clientX < vw / 2 ? "left" : "right";
      const liveYPct = Math.max(6, Math.min(94, (ev.clientY / vh) * 100));
      setSide(liveSide);
      setYPct(liveYPct);
      if (showCoach) setShowCoach(false);
    };

    const up = (ev: PointerEvent) => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      setDragging(false);

      if (localZoneActive) {
        // Zone-drag release: navigate if over a tab zone.
        const finalZone = zoneAtPointer(ev.clientX, ev.clientY);
        if (finalZone && finalZone !== "cancel") {
          // confirm haptic (slightly stronger, two-beat)
          haptic([12, 30, 12]);
          onTabChange(finalZone);
        }
        // Restore orb to its exact pre-drag position (it shouldn't have
        // moved, but be defensive — React setState races).
        setSide(pinnedSide);
        setYPct(pinnedYPct);
        // Mark zone coach as seen on any release (seen = had one chance)
        try { localStorage.setItem(STORAGE_KEY_ZONE_COACH, "1"); } catch { /* ignore */ }
        setShowZoneCoach(false);
        // Animate overlay fade-out, then remove from DOM.
        setZoneClosing(true);
        setHoveredZone(null);
        setTimeout(() => {
          setZoneDragActive(false);
          setZoneClosing(false);
        }, 200);
        // Suppress the follow-up click (React synthesises a click after
        // pointerup; dragMoved.current = true gates it in onClick).
        dragMoved.current = true;
        return;
      }

      // Standard reposition-drag path (unchanged from PR20/PR21).
      if (dragMoved.current) {
        persistPosition(side, yPct);
        try { localStorage.setItem(STORAGE_KEY_COACH, "1"); } catch { /* ignore */ }
      }
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  const onClick = () => {
    if (dragMoved.current) return;     // drag just ended — don't open
    setOpen(v => !v);
    setShowCoach(false);
    try { localStorage.setItem(STORAGE_KEY_COACH, "1"); } catch { /* ignore */ }
  };

  // ── Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // ── Language cycle
  const nextLang = () => {
    const order = ["en", "te_en", "te"] as const;
    const i = order.indexOf(lang as "en" | "te_en" | "te");
    setLang(order[(i + 1) % order.length]);
  };
  const langLabel = lang === "en" ? "EN" : lang === "te" ? "తె" : "తె + EN";

  // ── Tab chip click — switch + close sheet
  const handleChipTap = (id: string) => {
    onTabChange(id);
    setOpen(false);
  };

  // ── Swipe-to-dismiss hook for the sheet drag handle
  const { dragProps: sheetDragProps, sheetStyle } = useSheetDrag({
    onClose: () => setOpen(false),
  });

  // Orb positions flush with the edge; idle state tucks it halfway
  // into the edge via transform (see .command-orb CSS). Dragging +
  // open both bypass the tuck so the orb is fully visible then.
  const orbStyle: React.CSSProperties = {
    top: `${yPct}%`,
    [side]: 0,
    [side === "left" ? "right" : "left"]: "auto",
    transition: dragging ? "none" : "top 240ms cubic-bezier(0.2,0.8,0.2,1), left 240ms cubic-bezier(0.2,0.8,0.2,1), right 240ms cubic-bezier(0.2,0.8,0.2,1), transform 220ms ease",
  };

  // PR A2.1 — resolve zone id to its display Tab for the overlay cells.
  const tabById = (id: string) => tabs.find(tab => tab.id === id);

  return (
    <>
      {/* Floating orb (hidden while sheet is open — the sheet is the focus then) */}
      <button
        ref={orbRef}
        data-side={side}
        className={`command-orb${dragging ? " is-dragging" : ""}${open ? " is-open" : ""}${showCoach ? " is-coaching" : ""}${zoneDragActive ? " is-zone-drag" : ""}`}
        style={orbStyle}
        aria-label={t("Open navigation menu", "నావిగేషన్ మెనూ తెరవండి")}
        aria-hidden={open ? true : undefined}
        onPointerDown={onPointerDown}
        onClick={onClick}
      >
        <span className="command-orb-logo" aria-hidden>
          <LogoMark size={34} glow={false} />
        </span>
        {showCoach && !zoneDragActive && (
          <span className="command-orb-coach" aria-hidden>
            {t("Tap for tabs · Drag to move", "ట్యాబ్‌ల కోసం నొక్కండి · తరలించండి")}
          </span>
        )}
        {showZoneCoach && zoneDragActive && (
          <span className="command-orb-coach command-orb-coach-zone" aria-hidden>
            {t("Drag to a zone to jump", "జంప్ చేయడానికి జోన్‌కి లాగండి")}
          </span>
        )}
      </button>

      {/* PR A2.1 — Zone overlay. Rendered while user holds & drags.
          pointer-events: none so pointer capture stays on the orb; we
          hit-test via math (zoneAtPointer). */}
      {(zoneDragActive || zoneClosing) && (
        <div
          className={`command-zone-overlay${zoneClosing ? " is-exiting" : " is-entering"}`}
          aria-hidden
        >
          {ZONE_MAP.flatMap((row, rIdx) =>
            row.map((zoneId, cIdx) => {
              const isCancel = zoneId === "cancel";
              const tab = isCancel ? null : tabById(zoneId);
              const active = hoveredZone === zoneId && !isCancel;
              const Icon = tab?.Icon;
              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={
                    "command-zone-cell" +
                    (active ? " is-active" : "") +
                    (isCancel ? " is-cancel" : "") +
                    (hoveredZone === "cancel" && isCancel ? " is-active" : "")
                  }
                >
                  <div className="command-zone-icon">
                    {isCancel ? (
                      <X size={20} strokeWidth={1.6} />
                    ) : Icon ? (
                      <Icon size={20} strokeWidth={1.6} />
                    ) : null}
                  </div>
                  <div className="command-zone-label">
                    {isCancel
                      ? t("cancel", "రద్దు")
                      : tab
                        ? (lang === "en" ? tab.en : tab.te)
                        : ""}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Bottom sheet */}
      {open && (
        <>
          <div className="command-sheet-backdrop" onClick={() => setOpen(false)} />
          <div className="command-sheet" role="dialog" aria-modal="true" style={sheetStyle}>
            {/* Drag handle area — swipe down here to dismiss. */}
            <div className="command-sheet-drag-zone" {...sheetDragProps}>
              <div className="command-sheet-handle" />
            </div>

            <div className="command-sheet-head">
              <div>
                <div className="command-sheet-eyebrow">{t("Jump to", "వెళ్ళండి")}</div>
                <div className="command-sheet-title">
                  {tabs.find(x => x.id === activeTab)?.[lang === "en" ? "en" : "te"] ?? ""}
                </div>
              </div>
              <button
                className="command-sheet-close"
                onClick={() => setOpen(false)}
                aria-label={t("Close", "మూసివేయండి")}
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Tab chips */}
            <div className="command-sheet-section-label">{t("Tabs", "ట్యాబ్‌లు")}</div>
            <div className="command-chip-grid">
              {tabs.map(tab => {
                const TabIcon = tab.Icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className={`command-chip${active ? " is-active" : ""}`}
                    onClick={() => handleChipTap(tab.id)}
                  >
                    <span className="command-chip-icon"><TabIcon size={18} strokeWidth={1.7} /></span>
                    <span className="command-chip-label">{lang === "en" ? tab.en : tab.te}</span>
                    {lang === "te_en" && (
                      <span className="command-chip-sub">{tab.en}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Power actions */}
            <div className="command-sheet-section-label">{t("Quick actions", "త్వరిత చర్యలు")}</div>
            <div className="command-action-row">
              <button
                className="command-action"
                onClick={() => { setOpen(false); onNewChart(); }}
              >
                <span className="command-action-icon"><Plus size={16} strokeWidth={2} /></span>
                <span className="command-action-label">{t("New chart", "కొత్త చార్ట్")}</span>
              </button>
              <button
                className="command-action"
                onClick={nextLang}
              >
                <span className="command-action-icon"><Globe2 size={16} strokeWidth={1.8} /></span>
                <span className="command-action-label">{langLabel}</span>
              </button>
            </div>

            {/* Switch client — only when multiple sessions exist */}
            {sessions.length > 1 && onSwitchSession && (
              <>
                <div className="command-sheet-section-label">
                  <Users size={12} strokeWidth={1.8} style={{ verticalAlign: -2, marginRight: 4 }} />
                  {t("Switch chart", "చార్ట్ మార్చండి")}
                </div>
                <div className="command-session-list">
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      className={`command-session-item${s.id === currentSessionId ? " is-current" : ""}`}
                      onClick={() => { setOpen(false); onSwitchSession(s); }}
                    >
                      <span className="command-session-name">{s.name}</span>
                      {s.id === currentSessionId && (
                        <span className="command-session-current">
                          {t("current", "ప్రస్తుతం")}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
