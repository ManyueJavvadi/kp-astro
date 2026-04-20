"use client";
/**
 * PR A1.1 — live location hook for KP tools that need the astrologer's
 * current coordinates + timezone (Horary, Muhurtha, Transit, Panchang).
 *
 * Behaviors:
 *   - Hydrates from localStorage (`devastroai:liveLocation`) on mount so
 *     a returning astrologer doesn't re-pick on every load.
 *   - If no persisted value, queries browser geolocation.
 *   - Reverse-geocodes lat/lon -> human-readable name via bigdatacloud
 *     (free, no key). Falls back to coordinates if the call fails.
 *   - Resolves timezone offset from bigdatacloud's `localityInfo.timeZone`
 *     when available; otherwise uses the browser's own offset.
 *   - `override(pick)` lets the user manually pick a city via PlacePicker.
 *   - `refresh()` clears cache and re-queries geolocation.
 *
 * IMPORTANT: never falls back to natal-chart coordinates. If we can't
 * resolve a location, we return `status: "error"` — KP RPs require a
 * real location, no silent defaults.
 */
import { useCallback, useEffect, useState } from "react";

export type LiveLocation = {
  latitude: number;
  longitude: number;
  timezone_offset: number;
  display: string;        // e.g. "Toronto, Canada"
};

export type LiveLocationStatus =
  | "idle"
  | "resolving"
  | "ready"
  | "denied"
  | "unsupported"
  | "error";

const STORAGE_KEY = "devastroai:liveLocation";

export function useLiveLocation() {
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [status, setStatus] = useState<LiveLocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Browser's own offset as a fallback when bigdatacloud's timeZone is missing.
  const browserOffset = -new Date().getTimezoneOffset() / 60;

  const persist = useCallback((loc: LiveLocation) => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loc)); } catch { /* ignore */ }
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<Omit<LiveLocation, "latitude" | "longitude"> | null> => {
    try {
      const r = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
        { cache: "no-store" }
      );
      if (!r.ok) return null;
      const d = await r.json();
      const city = d.city || d.locality || d.principalSubdivision || "";
      const country = d.countryName || "";
      const display = city && country ? `${city}, ${country}` : (city || country || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);
      // Try to pull IANA timezone → offset via Intl.
      const tzString: string | undefined =
        (d.localityInfo?.administrative || []).find((a: { timeZone?: { name?: string } }) => a?.timeZone?.name)?.timeZone?.name
        || d.timezone?.name
        || d.timeZone?.name;
      let tz = browserOffset;
      if (tzString) {
        try {
          // Compute the offset for this tz at "now" via Intl.DateTimeFormat
          const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tzString, timeZoneName: "shortOffset" });
          const part = fmt.formatToParts(new Date()).find(p => p.type === "timeZoneName");
          const match = part?.value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
          if (match) {
            const sign = match[1] === "-" ? -1 : 1;
            const hours = parseInt(match[2], 10);
            const mins = match[3] ? parseInt(match[3], 10) : 0;
            tz = sign * (hours + mins / 60);
          }
        } catch { /* ignore */ }
      }
      return { timezone_offset: tz, display };
    } catch {
      return null;
    }
  }, [browserOffset]);

  const resolveFromBrowser = useCallback(async () => {
    setStatus("resolving");
    setError(null);
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      setError("Geolocation not supported in this browser.");
      return;
    }
    const pos = await new Promise<GeolocationPosition | null>(res =>
      navigator.geolocation.getCurrentPosition(p => res(p), () => res(null), {
        timeout: 8000,
        maximumAge: 60 * 60 * 1000,  // 1 hour cache
      })
    );
    if (!pos) {
      setStatus("denied");
      setError("Location permission denied or timed out. Pick a city to continue.");
      return;
    }
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const meta = await reverseGeocode(lat, lon);
    const loc: LiveLocation = {
      latitude: lat,
      longitude: lon,
      timezone_offset: meta?.timezone_offset ?? browserOffset,
      display: meta?.display ?? `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
    };
    setLocation(loc);
    persist(loc);
    setStatus("ready");
  }, [browserOffset, persist, reverseGeocode]);

  // Hydrate from localStorage on mount; otherwise attempt browser geo.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LiveLocation;
        if (parsed && typeof parsed.latitude === "number") {
          setLocation(parsed);
          setStatus("ready");
          return;
        }
      }
    } catch { /* ignore */ }
    // No cached value — kick off browser geolocation.
    resolveFromBrowser();
  }, [resolveFromBrowser]);

  const override = useCallback(async (pick: { lat: number; lon: number; display: string; timezone?: number }) => {
    const meta = pick.timezone != null
      ? { timezone_offset: pick.timezone, display: pick.display }
      : (await reverseGeocode(pick.lat, pick.lon)) ?? { timezone_offset: browserOffset, display: pick.display };
    const loc: LiveLocation = {
      latitude: pick.lat,
      longitude: pick.lon,
      timezone_offset: meta.timezone_offset,
      display: pick.display,
    };
    setLocation(loc);
    persist(loc);
    setStatus("ready");
    setError(null);
  }, [browserOffset, persist, reverseGeocode]);

  const refresh = useCallback(() => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setLocation(null);
    resolveFromBrowser();
  }, [resolveFromBrowser]);

  return { location, status, error, override, refresh };
}
