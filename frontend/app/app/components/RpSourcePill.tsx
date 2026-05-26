"use client";
/**
 * RpSourcePill — the trust pill that follows the Ruling Planets
 * everywhere they appear on the UI.
 *
 * Why this exists: KP Ruling Planets are computed for "current time +
 * current location", but the meaning of "current location" varies by
 * context:
 *
 *   - Analysis / Chart / Houses / Dasha / Horary / Panchang →
 *     the astrologer's live location (from useLiveLocation)
 *   - Match (moment-RPs at recommended date) →
 *     person 1's natal location (event default; partner_natal)
 *   - Muhurtha (per window) →
 *     the event location the user picked in Step 2
 *
 * If we just showed a single global "your location" pill, the
 * astrologer would assume Match/Muhurtha RPs also came from there —
 * silently wrong. So this micro-component renders inline anywhere RPs
 * are surfaced, with a coloured dot + label + tooltip explaining
 * exactly which location/time fed those specific RPs.
 *
 * Tone (intentional):
 *   green  — auto-detected live location; everything is right
 *   amber  — manually-picked OR event/partner location; verify it's right
 *   red    — natal fallback (live location was missing); probably wrong
 *
 * The component is presentational only — all data comes from props
 * (usually from chart_pipeline's rp_meta or composed client-side for
 * Match/Muhurtha event surfaces).
 */
import { MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";

export type RpSource = "live" | "manual" | "natal_fallback" | "event" | "partner_natal";

export interface RpSourceData {
  source: RpSource;
  place_name?: string | null;     // human display e.g. "Hyderabad"
  tz_name?: string | null;        // IANA e.g. "Asia/Kolkata"
  tz_offset?: number | null;      // e.g. 5.5
  computed_at_local?: string | null;  // "HH:MM"
  lat?: number | null;
  lon?: number | null;
}

export interface RpSourcePillProps {
  data: RpSourceData;
  /** Compact mode: smaller, no time, dot+label only. Used in dense rows. */
  compact?: boolean;
  /** Optional click handler — e.g. opens the live-location picker. */
  onClick?: () => void;
  /** Override the default tooltip body. Markdown not supported. */
  title?: string;
  /** Optional className override for layout integration. */
  className?: string;
}

const COLOURS: Record<RpSource, { dot: string; label: string; ring: string; icon: React.ReactNode }> = {
  live:           { dot: "#34d399", label: "auto",            ring: "rgba(52, 211, 153, 0.25)",  icon: <CheckCircle2 size={11} /> },
  manual:         { dot: "#fbbf24", label: "manual",          ring: "rgba(251, 191, 36, 0.25)", icon: <MapPin size={11} /> },
  event:          { dot: "#fbbf24", label: "event location",  ring: "rgba(251, 191, 36, 0.25)", icon: <MapPin size={11} /> },
  partner_natal:  { dot: "#fbbf24", label: "partner's birth", ring: "rgba(251, 191, 36, 0.25)", icon: <MapPin size={11} /> },
  natal_fallback: { dot: "#f87171", label: "natal fallback",  ring: "rgba(248, 113, 113, 0.30)", icon: <AlertTriangle size={11} /> },
};

/** Format a numeric offset like 5.5 → "UTC+5:30" or -7 → "UTC-7". */
function formatOffset(off?: number | null): string {
  if (off == null || Number.isNaN(off)) return "";
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, "0")}`;
}

/** Build a concise default tooltip body from rp_meta. */
function defaultTooltip(data: RpSourceData): string {
  const sourceLabel: Record<RpSource, string> = {
    live: "auto-detected from your browser",
    manual: "manually picked by you",
    event: "set as the event location in Step 2",
    partner_natal: "from Person 1's natal birthplace",
    natal_fallback: "FALLBACK to the chart's birthplace (your live location wasn't available)",
  };
  const where = data.place_name || data.tz_name || `${data.lat?.toFixed(2)}°, ${data.lon?.toFixed(2)}°`;
  const when = data.computed_at_local ? `at ${data.computed_at_local}` : "";
  const off = formatOffset(data.tz_offset);
  return `Ruling Planets computed at ${where}${off ? " (" + off + ")" : ""} ${when}\nSource: ${sourceLabel[data.source]}`.trim();
}

export function RpSourcePill({ data, compact, onClick, title, className }: RpSourcePillProps) {
  const c = COLOURS[data.source] || COLOURS.natal_fallback;
  const where = data.place_name || data.tz_name || "Unknown location";
  const when = data.computed_at_local ? ` · ${data.computed_at_local}` : "";

  return (
    <span
      className={`rp-source-pill ${compact ? "is-compact" : ""} ${onClick ? "is-clickable" : ""} ${className || ""}`}
      title={title ?? defaultTooltip(data)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: compact ? "2px 8px" : "4px 10px",
        borderRadius: 999,
        background: `linear-gradient(135deg, ${c.ring}, transparent)`,
        border: `1px solid ${c.dot}55`,
        fontSize: compact ? 10 : 11,
        fontWeight: 500,
        color: "rgba(240,240,240,0.92)",
        cursor: onClick ? "pointer" : "help",
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden="true" style={{ color: c.dot, display: "inline-flex", alignItems: "center" }}>
        {c.icon}
      </span>
      <span style={{ color: c.dot, fontWeight: 600 }}>{c.label}</span>
      <span style={{ opacity: 0.8 }}>·</span>
      <span>{where}{!compact && when}</span>
    </span>
  );
}

/**
 * Convenience wrapper for the most common case: render the pill from a
 * chart_pipeline rp_meta object verbatim. Tolerates null/undefined
 * gracefully (returns null so callers can splat unconditionally).
 */
export function RpSourcePillFromMeta(props: {
  rpMeta: RpSourceData | null | undefined;
  compact?: boolean;
  onClick?: () => void;
  placeName?: string | null;  // optional override for "Hyderabad" etc.
  className?: string;
}) {
  const { rpMeta, placeName, ...rest } = props;
  if (!rpMeta || !rpMeta.source) return null;
  // Frontend can enrich place_name from useLiveLocation if backend didn't know it.
  const data: RpSourceData = placeName && !rpMeta.place_name ? { ...rpMeta, place_name: placeName } : rpMeta;
  return <RpSourcePill data={data} {...rest} />;
}
