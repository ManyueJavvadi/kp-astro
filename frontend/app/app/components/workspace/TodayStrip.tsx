"use client";
import React from "react";
import { useLanguage } from "@/lib/i18n";
import { formatDate, stripSeconds } from "@/lib/format";

/**
 * Phase 3 — TodayStrip
 *
 * The single horizontal "Today anchor" the stress test (#F) called for.
 * One sticky 28-32px row immediately under the global top nav that
 * compresses the panchang facts a returning user actually checks daily.
 *
 * Phase 8 / PR 21 — strip is now CLICKABLE. Live test concluded that
 * a static factsheet at the top wastes the prime real-estate. Each
 * cell is now a real link into the Panchang tab so the daily ritual
 * becomes single-click navigation:
 *
 *     Today | 07 May 2026 | Thursday | Krishna Panchami | Purva Ashadha | Hora Venus | ⚠ Rahu Kalam
 *       ↓        ↓             ↓             ↓                  ↓             ↓               ↓
 *     Panchang Panchang     Panchang      Panchang            Panchang     Panchang        Panchang
 *
 * Each pill keeps a hover state (subtle gold tint) so the affordance
 * is visible without dominating the strip.
 */
export function TodayStrip({
  data,
  compact = false,
  onJumpToPanchang,
}: {
  data?: {
    date?: string;
    vara?: string;
    vara_en?: string;
    tithi?: string;
    tithi_en?: string;
    nakshatra?: string;
    nakshatra_en?: string;
    hora_lord?: string;
    hora_lord_en?: string;
    rahu_kalam?: string;
  } | null;
  /** When mounted in tight mobile shells, kill the date and shrink padding. */
  compact?: boolean;
  /** Click handler — typically `() => setActiveTab("panchang")`. */
  onJumpToPanchang?: () => void;
}) {
  const { lang, t } = useLanguage();
  if (!data) return null;
  const pickField = (base: string) =>
    lang === "en"
      ? ((data as Record<string, string | undefined>)[`${base}_en`] ?? (data as Record<string, string | undefined>)[base] ?? "")
      : ((data as Record<string, string | undefined>)[`${base}_te`] ?? (data as Record<string, string | undefined>)[base] ?? "");
  const vara      = pickField("vara");
  const tithi     = pickField("tithi");
  const nakshatra = pickField("nakshatra");
  const hora      = lang === "en" ? (data.hora_lord_en ?? data.hora_lord ?? "") : (data.hora_lord ?? data.hora_lord_en ?? "");
  // Phase 7 / PR 19 — strip backend HH:MM:SS so the strip reads "13:39–15:15"
  // not "13:39:00–15:15:00".
  const rahu      = stripSeconds(data.rahu_kalam ?? "");

  // Phase 8 / PR 21 — common click prop — every clickable pill is a
  // shortcut into the Panchang tab. `role="link"` + onClick keeps the
  // semantics correct without breaking the existing read-only fallback
  // when the prop is absent.
  const clickable = !!onJumpToPanchang;
  const pillClick = clickable
    ? {
        role: "link",
        tabIndex: 0,
        onClick: onJumpToPanchang,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onJumpToPanchang?.();
          }
        },
        style: { cursor: "pointer" } as React.CSSProperties,
      }
    : {};

  return (
    <div
      role="region"
      aria-label={t("Today's panchang summary", "నేటి పంచాంగం సారాంశం")}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 8,
        display: "flex",
        alignItems: "center",
        gap: compact ? 8 : 14,
        padding: compact ? "5px 12px" : "6px 18px",
        background: "rgba(15, 23, 42, 0.92)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: "0.5px solid rgba(201,169,110,0.18)",
        fontSize: compact ? 10 : 11,
        color: "var(--muted)",
        whiteSpace: "nowrap",
        overflowX: "auto",
        scrollbarWidth: "none",
        flexShrink: 0,
      }}
      title={t(
        "Snapshot of today's panchang at chart load. Open the Panchang tab for live data.",
        "చార్ట్ లోడ్ సమయంలో నేటి పంచాంగం స్నాప్‌షాట్."
      )}
    >
      {/* Eyebrow */}
      <span
        style={{
          color: "var(--accent)",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: compact ? 9 : 9.5,
          flexShrink: 0,
        }}
      >
        {t("Today", "నేడు")}
      </span>

      {!compact && data.date && (
        <Pill text={formatDate(data.date)} mute interactive={pillClick} />
      )}
      {vara && <Pill text={vara} interactive={pillClick} />}
      {tithi && <Pill text={tithi} interactive={pillClick} />}
      {nakshatra && <Pill text={nakshatra} interactive={pillClick} />}
      {hora && <Pill text={`${t("Hora", "హోర")} ${hora}`} icon="◷" interactive={pillClick} />}
      {rahu && (
        <Pill
          text={`${t("Rahu Kalam", "రాహుకాలం")} ${rahu}`}
          icon="⚠"
          warn
          title={
            clickable
              ? t("Click to open Panchang · Avoid important actions during Rahu Kalam", "పంచాంగం తెరవండి · రాహుకాలంలో ముఖ్యమైన పనులు చేయవద్దు")
              : t("Avoid important actions during Rahu Kalam", "రాహుకాలంలో ముఖ్యమైన పనులు చేయవద్దు")
          }
          interactive={pillClick}
        />
      )}
      {/* Honest staleness indicator — small dot far-right. */}
      <span
        aria-hidden
        style={{
          marginLeft: "auto",
          fontSize: 8,
          color: "rgba(201,169,110,0.45)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {t("snapshot", "స్నాప్")}
      </span>
    </div>
  );
}

function Pill({
  text,
  icon,
  warn,
  mute,
  title,
  interactive,
}: {
  text: string;
  icon?: string;
  warn?: boolean;
  mute?: boolean;
  title?: string;
  /** Phase 8 / PR 21 — pass-through {role, onClick, onKeyDown, tabIndex, style}
   *  from the parent. When set, the pill becomes a real link with hover affordance. */
  interactive?: Record<string, unknown>;
}) {
  const isInteractive = interactive && Object.keys(interactive).length > 0;
  return (
    <span
      {...(interactive as React.HTMLAttributes<HTMLSpanElement>)}
      title={title}
      className={isInteractive ? "today-strip-pill" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        color: warn ? "#f87171" : mute ? "var(--muted)" : "var(--text)",
        fontWeight: warn ? 500 : 400,
        flexShrink: 0,
        padding: isInteractive ? "2px 6px" : 0,
        borderRadius: isInteractive ? 5 : 0,
        transition: isInteractive ? "background 120ms ease, color 120ms ease" : undefined,
        ...(interactive?.style as React.CSSProperties),
      }}
    >
      {icon ? <span style={{ opacity: 0.7, fontSize: "0.95em" }}>{icon}</span> : null}
      {text}
    </span>
  );
}
