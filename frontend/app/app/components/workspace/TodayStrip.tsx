"use client";
import React from "react";
import { useLanguage } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

/**
 * Phase 3 — TodayStrip
 *
 * The single horizontal "Today anchor" the stress test (#F) called for.
 * One sticky 28-32px row immediately under the global top nav that
 * compresses the panchang facts a returning user actually checks daily:
 *
 *   Thu · 07 May 2026 · Krishna Panchami · Purva Ashadha · Hora Venus · ⚠ Rahu Kalam 13:39–15:15
 *
 * Why this exists:
 *   - The sidebar widget was non-discoverable + duplicated the Panchang
 *     tab's content + lied about being "now" when it was a snapshot
 *     (Phase 2 / PR 6 made the labelling honest, but the widget itself
 *     still belonged elsewhere).
 *   - Reading order: most users open the app to answer "is today okay
 *     for X?" — surfacing today's panchang at the top makes that the
 *     first thing the eye hits.
 *
 * Source of truth:
 *   `panchangam_today` is computed at chart-load (same caveat as the old
 *   sidebar widget). The strip carries a small "snapshot" indicator and
 *   tooltip so the staleness is honest. A future PR can wire a live
 *   refetch on tab focus — no API change needed.
 */
export function TodayStrip({
  data,
  compact = false,
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
  const rahu      = data.rahu_kalam ?? "";

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
        <Pill text={formatDate(data.date)} mute />
      )}
      {vara && <Pill text={vara} />}
      {tithi && <Pill text={tithi} />}
      {nakshatra && <Pill text={nakshatra} />}
      {hora && <Pill text={`${t("Hora", "హోర")} ${hora}`} icon="◷" />}
      {rahu && (
        <Pill
          text={`${t("Rahu Kalam", "రాహుకాలం")} ${rahu}`}
          icon="⚠"
          warn
          title={t("Avoid important actions during Rahu Kalam", "రాహుకాలంలో ముఖ్యమైన పనులు చేయవద్దు")}
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
}: {
  text: string;
  icon?: string;
  warn?: boolean;
  mute?: boolean;
  title?: string;
}) {
  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        color: warn ? "#f87171" : mute ? "var(--muted)" : "var(--text)",
        fontWeight: warn ? 500 : 400,
        flexShrink: 0,
      }}
    >
      {icon ? <span style={{ opacity: 0.7, fontSize: "0.95em" }}>{icon}</span> : null}
      {text}
    </span>
  );
}
