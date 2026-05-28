"use client";

/**
 * MobileBottomNav — primary mobile tab strip (Phase 9.9).
 *
 * Part of Phase 9 mobile cross-reference design language.
 * See `.claude/research/mobile-cross-reference-design.md` §1.⑨.
 *
 * Pattern: a fixed bottom 5-cell strip with the four PRIMARY tabs
 * (Chart, Dasha, Muhurtha, Horary) plus a `+ More` overflow that
 * opens a small action sheet exposing the secondary tabs (Houses,
 * Analysis, Panchang, Match) and the power actions (New chart, Lang
 * cycle, Switch chart). Mirrors the Notion/iOS Health convention of
 * keeping power tools one tap away while protecting the bottom strip
 * for the user's most-frequent surfaces.
 *
 * Why this exists alongside the older CommandOrb:
 *   - The CommandOrb was the *only* mobile nav surface — every tab
 *     switch took two taps (open orb sheet, pick tab).
 *   - User research (see master design doc) said the primary 4 tabs
 *     deserve a one-tap surface, with the remaining tabs + power
 *     actions in an overflow sheet.
 *   - Phase 9.9 mounts this nav alongside <MobileAiOrb /> and the
 *     CommandOrb is demoted (or removed entirely from the mount
 *     site) — kept in tree only as a fallback for the few power
 *     actions not yet covered here.
 *
 * Maintainability:
 *   - PRIMARY_TAB_IDS is the single source of truth for which tabs
 *     get a strip cell. Change this array to change the primary set.
 *   - Tabs outside that set automatically appear in the "More" sheet
 *     (they're filtered from the same TABS prop).
 *   - Drag-to-snap is intentionally NOT used here. This is a static
 *     persistent strip — taps only.
 */

import React, { useState, useEffect, useRef } from "react";
import { MoreHorizontal, X, Plus, Globe2, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useSheetDrag } from "@/hooks/useSheetDrag";
import type { ChartSession } from "../../types";

type Tab = {
  id: string;
  en: string;
  te: string;
  Icon: LucideIcon;
};

interface MobileBottomNavProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onNewChart: () => void;
  sessions?: ChartSession[];
  currentSessionId?: string;
  onSwitchSession?: (s: ChartSession) => void;
}

/**
 * Primary 4 tabs (left → right). The "More" cell at position 5 is
 * synthesized at render time. Keep this list to exactly 4 ids for
 * even spacing.
 */
const PRIMARY_TAB_IDS = ["chart", "dasha", "muhurtha", "horary"];

/** Width-baseline height for the strip — 56px is the iOS / Material tab-bar default. */
export const MOBILE_NAV_HEIGHT = 56;

export default function MobileBottomNav({
  tabs,
  activeTab,
  onTabChange,
  onNewChart,
  sessions,
  currentSessionId,
  onSwitchSession,
}: MobileBottomNavProps) {
  const { lang, setLang } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the more-sheet whenever the user navigates somewhere new.
  useEffect(() => { setMoreOpen(false); }, [activeTab]);

  // Build the primary cells — preserve original Tab metadata so we keep
  // the language helper + icon component without re-typing the tab data.
  const primaryTabs = PRIMARY_TAB_IDS
    .map(id => tabs.find(t => t.id === id))
    .filter((t): t is Tab => t != null);
  const overflowTabs = tabs.filter(t => !PRIMARY_TAB_IDS.includes(t.id));

  // Active state for the More cell — true when the active tab is in
  // the overflow group (visually signals "your current tab lives behind
  // this menu").
  const moreActive = !primaryTabs.some(t => t.id === activeTab);

  const tLabel = (t: Tab): string => (lang === "en" ? t.en : t.te);

  return (
    <>
      <nav
        role="navigation"
        aria-label="Primary"
        className="mobile-bottom-nav"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: MOBILE_NAV_HEIGHT,
          paddingBottom: "env(safe-area-inset-bottom, 0)",
          zIndex: 52,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          background: "rgba(13, 13, 22, 0.96)",
          borderTop: "0.5px solid rgba(201, 169, 110, 0.22)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 -4px 18px rgba(0, 0, 0, 0.35)",
        }}
      >
        {primaryTabs.map(t => (
          <NavCell
            key={t.id}
            label={tLabel(t)}
            Icon={t.Icon}
            active={activeTab === t.id}
            onClick={() => onTabChange(t.id)}
          />
        ))}
        <NavCell
          label={lang === "en" ? "More" : "మరిన్ని"}
          Icon={MoreHorizontal}
          active={moreActive || moreOpen}
          onClick={() => setMoreOpen(v => !v)}
          aria-haspopup="menu"
          aria-expanded={moreOpen}
        />
      </nav>

      {moreOpen && (
        <MoreSheet
          overflowTabs={overflowTabs}
          activeTab={activeTab}
          onTabChange={(id) => { onTabChange(id); setMoreOpen(false); }}
          onClose={() => setMoreOpen(false)}
          onNewChart={() => { onNewChart(); setMoreOpen(false); }}
          onLangCycle={() => {
            // Cycle: en → te_en → te → en
            const next = lang === "en" ? "te_en" : lang === "te_en" ? "te" : "en";
            setLang(next as any);
          }}
          currentLangLabel={lang === "en" ? "EN" : lang === "te_en" ? "TE + EN" : "TE"}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSwitchSession={(s) => {
            onSwitchSession?.(s);
            setMoreOpen(false);
          }}
        />
      )}
    </>
  );
}

// ─── Single nav cell ────────────────────────────────────────────────
function NavCell({
  label, Icon, active, onClick, ...aria
}: {
  label: string;
  Icon: LucideIcon;
  active: boolean;
  onClick: () => void;
} & React.AriaAttributes) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      {...aria}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        padding: "6px 4px 4px",
        color: active ? "var(--accent)" : "var(--muted)",
        position: "relative",
        transition: "color 160ms",
        minWidth: 0,
      }}
    >
      {/* Active-state gold underline (top of cell, 18px wide). */}
      {active && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 18,
            height: 2,
            borderRadius: 999,
            background: "var(--accent)",
            boxShadow: "0 0 8px rgba(201, 169, 110, 0.6)",
          }}
        />
      )}
      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
      <span
        style={{
          fontSize: 10,
          fontWeight: active ? 700 : 500,
          letterSpacing: "0.02em",
          lineHeight: 1.1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "100%",
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ─── Overflow sheet (the "+ More" menu) ─────────────────────────────
interface MoreSheetProps {
  overflowTabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onClose: () => void;
  onNewChart: () => void;
  onLangCycle: () => void;
  currentLangLabel: string;
  sessions?: ChartSession[];
  currentSessionId?: string;
  onSwitchSession?: (s: ChartSession) => void;
}

function MoreSheet({
  overflowTabs, activeTab, onTabChange, onClose,
  onNewChart, onLangCycle, currentLangLabel,
  sessions, currentSessionId, onSwitchSession,
}: MoreSheetProps) {
  const { lang } = useLanguage();
  const { dragProps, sheetStyle } = useSheetDrag({ onClose });
  const tLabel = (t: Tab): string => (lang === "en" ? t.en : t.te);

  return (
    <>
      {/* Backdrop — taps anywhere outside the sheet dismiss. */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.45)",
          zIndex: 58,
          animation: "fade-in 160ms ease-out",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More tabs and actions"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 59,
          background: "rgba(15, 15, 24, 0.98)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "0.5px solid rgba(201, 169, 110, 0.3)",
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 12px)",
          maxHeight: "72vh",
          display: "flex",
          flexDirection: "column",
          ...sheetStyle,
        }}
      >
        {/* Drag handle */}
        <div
          {...dragProps}
          style={{
            ...dragProps.style,
            padding: "10px 16px 4px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 44, height: 4, borderRadius: 999,
              background: "rgba(255,255,255,0.18)",
            }}
          />
        </div>

        {/* Header row */}
        <div
          style={{
            padding: "6px 18px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11, textTransform: "uppercase",
              letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 700,
            }}
          >
            {lang === "en" ? "More" : "మరిన్ని"}
          </span>
          <button
            type="button"
            aria-label="Close more menu"
            onClick={onClose}
            style={{
              width: 32, height: 32, border: "none", background: "transparent",
              color: "var(--muted)", cursor: "pointer", borderRadius: 8,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            overflowY: "auto",
            padding: "0 14px 6px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* Overflow tabs as a 4-up grid */}
          {overflowTabs.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em",
                  color: "var(--muted)", fontWeight: 600, marginBottom: 8, paddingLeft: 4,
                }}
              >
                {lang === "en" ? "Jump to" : "వెళ్ళు"}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                }}
              >
                {overflowTabs.map(t => {
                  const active = activeTab === t.id;
                  const Icon = t.Icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onTabChange(t.id)}
                      aria-current={active ? "page" : undefined}
                      style={{
                        background: active ? "rgba(201,169,110,0.12)" : "rgba(255,255,255,0.03)",
                        border: `0.5px solid ${active ? "rgba(201,169,110,0.45)" : "rgba(255,255,255,0.06)"}`,
                        borderRadius: 12,
                        padding: "12px 6px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        color: active ? "var(--accent)" : "var(--text)",
                        cursor: "pointer",
                        transition: "background 140ms, border-color 140ms",
                      }}
                    >
                      <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                      <span style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>
                        {tLabel(t)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Power actions row */}
          <div>
            <div
              style={{
                fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em",
                color: "var(--muted)", fontWeight: 600, marginBottom: 8, paddingLeft: 4,
              }}
            >
              {lang === "en" ? "Actions" : "చర్యలు"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <ActionButton
                Icon={Plus}
                label={lang === "en" ? "New chart" : "క్రొత్త చార్ట్"}
                onClick={onNewChart}
              />
              <ActionButton
                Icon={Globe2}
                label={`${lang === "en" ? "Language" : "భాష"} · ${currentLangLabel}`}
                onClick={onLangCycle}
              />
            </div>
          </div>

          {/* Saved sessions list — only shown if we have >1 */}
          {sessions && sessions.length > 1 && onSwitchSession && (
            <div>
              <div
                style={{
                  fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em",
                  color: "var(--muted)", fontWeight: 600, marginBottom: 8, paddingLeft: 4,
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <Users size={11} />
                <span>{lang === "en" ? "Switch chart" : "చార్ట్ మార్చు"}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {sessions.map(s => {
                  const active = s.id === currentSessionId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onSwitchSession(s)}
                      style={{
                        background: active ? "rgba(201,169,110,0.10)" : "transparent",
                        border: `0.5px solid ${active ? "rgba(201,169,110,0.35)" : "rgba(255,255,255,0.06)"}`,
                        borderRadius: 8,
                        padding: "8px 12px",
                        textAlign: "left",
                        color: active ? "var(--accent)" : "var(--text)",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: active ? 700 : 500,
                      }}
                    >
                      {s.name || (lang === "en" ? "Untitled" : "పేరు లేదు")}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ActionButton({
  Icon, label, onClick,
}: { Icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "var(--text)",
        cursor: "pointer",
        transition: "background 140ms, border-color 140ms",
        fontSize: 12,
        fontWeight: 600,
        textAlign: "left",
      }}
    >
      <Icon size={16} />
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </span>
    </button>
  );
}
