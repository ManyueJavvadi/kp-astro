"use client";
/**
 * PR A1.1 — muted-grey strip shown under Ruling Planet chip rows that
 * documents WHICH location and time produced those RPs. Astrologer can
 * glance at it to verify the engine is computing for the right context.
 *
 * Used inline wherever RPs are shown: Horary (PR A1.1), Transit/Muhurtha
 * /Analysis (later PRs).
 */
import { Clock, MapPin } from "lucide-react";

export type RPContext = {
  latitude?: number;
  longitude?: number;
  timezone_offset?: number;
  local_datetime?: string;
  utc_datetime?: string;
  weekday?: string;
  day_lord?: string;
  actual_lagna_sign?: string;
  lagna_sign_lord?: string;
  lagna_star_lord?: string;
  moon_sign_lord?: string;
  moon_star_lord?: string;
};

export default function RPContextStrip({ ctx, locationName }: { ctx: RPContext; locationName?: string }) {
  if (!ctx) return null;
  const coords = ctx.latitude != null && ctx.longitude != null
    ? `${ctx.latitude.toFixed(2)}°, ${ctx.longitude.toFixed(2)}°`
    : "";
  const tzSign = (ctx.timezone_offset ?? 0) >= 0 ? "+" : "";
  const tzLabel = ctx.timezone_offset != null ? `UTC${tzSign}${ctx.timezone_offset}` : "";

  return (
    <div className="rp-context-strip">
      <span className="rp-context-item">
        <MapPin size={10} />
        <span>{locationName || coords || "—"}</span>
        {coords && locationName && <span className="rp-context-dim">· {coords}</span>}
      </span>
      <span className="rp-context-dot">·</span>
      <span className="rp-context-item">
        <Clock size={10} />
        <span>{ctx.local_datetime}</span>
        {tzLabel && <span className="rp-context-dim">{tzLabel}</span>}
        {ctx.weekday && <span className="rp-context-dim">· {ctx.weekday}</span>}
      </span>
      {ctx.day_lord && (
        <>
          <span className="rp-context-dot">·</span>
          <span className="rp-context-item rp-context-dim">
            Day Lord: <b>{ctx.day_lord}</b>
          </span>
        </>
      )}
    </div>
  );
}
