"use client";
/**
 * PR A1.1 — pill that shows the astrologer's detected/selected live
 * location + a pencil icon to override it. Used on any tab that needs
 * "current moment + current location" data (Horary starts; Muhurtha,
 * Transit, Panchang will reuse in later PRs).
 *
 * If location is not yet ready, shows a status banner with an error
 * message and a Pick-city button. NEVER falls back to natal coordinates.
 */
import { useState } from "react";
import { MapPin, Pencil, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { PlacePicker } from "@/components/ui/place-picker";
import type { LiveLocation, LiveLocationStatus } from "@/hooks/useLiveLocation";

interface Props {
  location: LiveLocation | null;
  status: LiveLocationStatus;
  error: string | null;
  onOverride: (pick: { lat: number; lon: number; display: string; timezone?: number }) => void;
  onRefresh: () => void;
}

/** Convert IANA timezone string (e.g. "America/Toronto") to offset hours. */
function ianaToOffset(iana: string): number | undefined {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: iana, timeZoneName: "shortOffset" });
    const part = fmt.formatToParts(new Date()).find(p => p.type === "timeZoneName");
    const m = part?.value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (m) {
      const sign = m[1] === "-" ? -1 : 1;
      return sign * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0));
    }
  } catch { /* ignore */ }
  return undefined;
}

export default function LiveLocationPill({ location, status, error, onOverride, onRefresh }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (status === "resolving") {
    return (
      <div className="live-loc-pill is-resolving" aria-live="polite">
        <Loader2 size={12} className="spin" />
        <span>Detecting your location…</span>
      </div>
    );
  }

  if (status === "denied" || status === "unsupported" || status === "error") {
    return (
      <div className="live-loc-pill is-error" aria-live="polite">
        <AlertTriangle size={12} />
        <span>{error || "Location needed."}</span>
        {editing ? (
          <div style={{ flex: 1, minWidth: 220 }}>
            <PlacePicker
              value={draft}
              onChange={(val, pick) => {
                setDraft(val);
                if (pick) {
                  onOverride({
                    lat: pick.lat,
                    lon: pick.lon,
                    display: pick.display,
                    timezone: pick.timezone ? ianaToOffset(pick.timezone) : undefined,
                  });
                  setEditing(false);
                  setDraft("");
                }
              }}
              placeholder="Pick your city…"
            />
          </div>
        ) : (
          <button className="live-loc-pill-btn" onClick={() => setEditing(true)}>
            Pick city
          </button>
        )}
      </div>
    );
  }

  // ready
  return (
    <div className="live-loc-pill is-ready">
      <MapPin size={12} />
      {editing ? (
        <div style={{ flex: 1, minWidth: 220 }}>
          <PlacePicker
            value={draft}
            onChange={(val, pick) => {
              setDraft(val);
              if (pick) {
                onOverride({
                  lat: pick.lat,
                  lon: pick.lon,
                  display: pick.display,
                  timezone: pick.timezone ? ianaToOffset(pick.timezone) : undefined,
                });
                setEditing(false);
                setDraft("");
              }
            }}
            placeholder={location?.display ?? "Pick city…"}
          />
          <button className="live-loc-pill-btn ghost" onClick={() => { setEditing(false); setDraft(""); }} style={{ marginTop: 4 }}>
            Cancel
          </button>
        </div>
      ) : (
        <>
          <span className="live-loc-name">{location?.display}</span>
          <span className="live-loc-coords">
            {location ? `${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°` : ""}
          </span>
          <button className="live-loc-pill-icon" onClick={() => setEditing(true)} aria-label="Change location">
            <Pencil size={11} />
          </button>
          <button className="live-loc-pill-icon" onClick={onRefresh} aria-label="Re-detect location">
            <RefreshCw size={11} />
          </button>
        </>
      )}
    </div>
  );
}
