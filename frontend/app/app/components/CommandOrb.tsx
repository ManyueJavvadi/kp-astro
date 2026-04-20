"use client";

/*
 * PR20 — Mobile Command Orb.
 *
 * A draggable, edge-snapping floating orb that is our mobile nav.
 * Inspired by iOS AssistiveTouch + Samsung's floating note toolbox.
 *
 * - Tap the orb → opens a bottom sheet with tab chips + power actions
 * - Drag the orb → snaps to nearest vertical edge (L/R), persisted to localStorage
 * - First visit → 1-shot coach-mark pulse + tooltip ("Tap for tabs · Drag to move")
 * - Desktop: this component renders null (useIsMobile gate in page.tsx)
 */

import React, { useEffect, useRef, useState } from "react";
import { Compass, Plus, Globe2, X, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
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

const STORAGE_KEY_POS   = "kp_orb_position_v1";   // { side: "left" | "right", yPct: 0-100 }
const STORAGE_KEY_COACH = "kp_orb_coach_seen_v1"; // "1" when dismissed

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
  const [side, setSide] = useState<"left" | "right">("right");
  const [yPct, setYPct] = useState<number>(60);
  const [dragging, setDragging] = useState(false);
  const dragMoved = useRef(false);
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

  // ── Pointer handlers: distinguish tap vs drag
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!orbRef.current) return;
    orbRef.current.setPointerCapture(e.pointerId);
    dragMoved.current = false;
    setDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      // 6px dead-zone — below that, it's a tap.
      if (!dragMoved.current && Math.hypot(dx, dy) < 6) return;
      dragMoved.current = true;
      // Follow finger; snap on pointerup.
      const liveSide: "left" | "right" = ev.clientX < vw / 2 ? "left" : "right";
      const liveYPct = Math.max(6, Math.min(94, (ev.clientY / vh) * 100));
      setSide(liveSide);
      setYPct(liveYPct);
      // Suppress coach once the user interacts.
      if (showCoach) setShowCoach(false);
    };

    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      setDragging(false);
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

  const orbStyle: React.CSSProperties = {
    top: `${yPct}%`,
    [side]: 12,
    [side === "left" ? "right" : "left"]: "auto",
    transition: dragging ? "none" : "top 240ms cubic-bezier(0.2,0.8,0.2,1), left 240ms cubic-bezier(0.2,0.8,0.2,1), right 240ms cubic-bezier(0.2,0.8,0.2,1)",
  };

  return (
    <>
      {/* Floating orb */}
      <button
        ref={orbRef}
        className={`command-orb${dragging ? " is-dragging" : ""}${open ? " is-open" : ""}${showCoach ? " is-coaching" : ""}`}
        style={orbStyle}
        aria-label={t("Open navigation menu", "నావిగేషన్ మెనూ తెరవండి")}
        onPointerDown={onPointerDown}
        onClick={onClick}
      >
        <Compass size={20} strokeWidth={1.8} />
        {showCoach && (
          <span className="command-orb-coach" aria-hidden>
            {t("Tap for tabs · Drag to move", "ట్యాబ్‌ల కోసం నొక్కండి · తరలించండి")}
          </span>
        )}
      </button>

      {/* Bottom sheet */}
      {open && (
        <>
          <div className="command-sheet-backdrop" onClick={() => setOpen(false)} />
          <div className="command-sheet" role="dialog" aria-modal="true">
            <div className="command-sheet-handle" />

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
