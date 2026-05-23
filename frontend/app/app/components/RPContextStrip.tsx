"use client";
/**
 * PR A1.1c — muted strip under RP chip rows showing WHICH location,
 * moment, and slot-attribution produced those RPs. Astrologer can glance
 * at it to verify the engine's context, same info as ksrinivas.com's
 * "Ruling Planet Parameters" card.
 *
 * Used inline wherever RPs are shown: Horary (now), Transit / Muhurtha /
 * Analysis in later PRs.
 */
import { Clock, MapPin, Radio, Anchor, AlertTriangle } from "lucide-react";

export type SlotAssignment = { slot: string; planet: string };
export type PlanetSlots = Record<string, string[]>;

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
  lagna_sub_lord?: string;
  moon_sign_lord?: string;
  moon_star_lord?: string;
  moon_sub_lord?: string;
  // PR A1.1c
  slot_assignments?: SlotAssignment[];
  planet_slots?: PlanetSlots;
  strongest?: string[];
  rp_system?: string;
};

/**
 * PR A1.13 — RP frame indicator. Three modes:
 *   "live"     → green pill, RPs are astrologer's current location + now
 *                (Horary / Muhurtha / Transit when live-geo resolved)
 *   "natal"    → gold pill, RPs are NATAL chart's lat/lon at current
 *                server time (Analysis / Workspace default)
 *   "fallback" → amber pill, live-geo was requested but denied/failed
 *                and the system fell back to natal-loc — astrologer
 *                should know these RPs aren't astrologer-live
 *
 * Per Gemini audit finding D — without this badge the user can't tell
 * at a glance whether RPs are accurate for their consultation context.
 * Opt-in: passing no `mode` prop renders no badge (existing callsites
 * keep working unchanged).
 */
export type RPFrameMode = "live" | "natal" | "fallback";

export default function RPContextStrip({
  ctx,
  locationName,
  mode,
}: {
  ctx: RPContext;
  locationName?: string;
  mode?: RPFrameMode;
}) {
  if (!ctx) return null;
  const coords = ctx.latitude != null && ctx.longitude != null
    ? `${ctx.latitude.toFixed(2)}°, ${ctx.longitude.toFixed(2)}°`
    : "";
  const tzSign = (ctx.timezone_offset ?? 0) >= 0 ? "+" : "";
  const tzLabel = ctx.timezone_offset != null ? `UTC${tzSign}${ctx.timezone_offset}` : "";

  // Frame-mode badge: keeps the strip's content identical, just prepends
  // a tiny chip that tells the astrologer what RP-context they're seeing.
  const modeBadge = mode ? (
    <span
      className={`rp-context-frame is-${mode}`}
      title={
        mode === "live"
          ? "Ruling Planets computed at astrologer's current location + current moment"
          : mode === "natal"
          ? "Ruling Planets computed at the NATAL chart's location + server time. For live-moment RPs use Horary/Muhurtha tabs with geolocation enabled."
          : "Live-location request failed — Ruling Planets are using the natal chart's location as fallback. Click the Pencil on the location pill to pick your current city."
      }
    >
      {mode === "live" && <Radio size={9} />}
      {mode === "natal" && <Anchor size={9} />}
      {mode === "fallback" && <AlertTriangle size={9} />}
      <span>{mode === "live" ? "LIVE" : mode === "natal" ? "NATAL" : "FALLBACK"}</span>
    </span>
  ) : null;

  return (
    <div className={`rp-context-strip${mode === "fallback" ? " is-fallback" : ""}`}>
      <div className="rp-context-header">
        {modeBadge}
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
      </div>

      {/* PR A1.1c — 7-slot breakdown. One row per unique planet, showing
          exactly which slots (out of 7) they fill. Mirrors ksrinivas.com
          "Ruling Planet Strength · Frequency across 7 positions". */}
      {ctx.planet_slots && Object.keys(ctx.planet_slots).length > 0 && (
        <div className="rp-context-breakdown">
          <div className="rp-context-breakdown-title">
            {ctx.rp_system ?? "7-slot RP breakdown"}
          </div>
          <div className="rp-context-breakdown-rows">
            {Object.entries(ctx.planet_slots)
              .sort(([, a], [, b]) => b.length - a.length)
              .map(([planet, slots]) => {
                const isStrongest = (ctx.strongest ?? []).includes(planet);
                return (
                  <div key={planet} className={`rp-context-row${isStrongest ? " is-strongest" : ""}`}>
                    <span className="rp-context-planet">
                      {isStrongest && <span className="rp-context-star">★</span>}
                      {planet}
                    </span>
                    <span className="rp-context-freq">{slots.length}/7</span>
                    <span className="rp-context-slots">{slots.join(" · ")}</span>
                  </div>
                );
              })}
          </div>
          {(ctx.strongest ?? []).length > 0 && (
            <div className="rp-context-strongest-note">
              <b>Strongest:</b> planets appearing in 2+ slots carry the most weight in KP verdict timing.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
