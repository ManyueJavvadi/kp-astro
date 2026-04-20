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
import { Clock, MapPin } from "lucide-react";

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

export default function RPContextStrip({ ctx, locationName }: { ctx: RPContext; locationName?: string }) {
  if (!ctx) return null;
  const coords = ctx.latitude != null && ctx.longitude != null
    ? `${ctx.latitude.toFixed(2)}°, ${ctx.longitude.toFixed(2)}°`
    : "";
  const tzSign = (ctx.timezone_offset ?? 0) >= 0 ? "+" : "";
  const tzLabel = ctx.timezone_offset != null ? `UTC${tzSign}${ctx.timezone_offset}` : "";

  return (
    <div className="rp-context-strip">
      <div className="rp-context-header">
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
