"use client";

/**
 * TodayPanchangStrip — read-only summary of today's panchang at the
 * astrologer's current location.
 *
 * Phase 2 Slice 3 (2026-06-02). Lives on the CRM home + on
 * /app/tools/panchang. Reuses the live-location hook + the existing
 * /panchangam/location endpoint (no new backend work).
 *
 * Render shape (single horizontal strip):
 *   [LOCATION]  Tithi · Nakshatra · Yoga · Karana | Sunrise · Sunset
 *
 * Fails gracefully — if location unavailable, shows a "set location"
 * affordance. If endpoint fails, just hides instead of showing an
 * error (this is a nice-to-have, not a core surface).
 */

import { useEffect, useState } from "react";
import { MapPin, Sun, Moon } from "lucide-react";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { theme } from "@/lib/theme";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://devastroai.up.railway.app";

interface PanchangSummary {
  tithi_en?: string;
  nakshatra_en?: string;
  yoga_en?: string;
  karana_en?: string;
  sunrise_local?: string;
  sunset_local?: string;
  current_hora_en?: string;
}

export function TodayPanchangStrip() {
  const liveLoc = useLiveLocation();
  const [data, setData] = useState<PanchangSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!liveLoc.location) return;
    let cancelled = false;
    setLoading(true);
    fetch(`${API_URL}/panchangam/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: liveLoc.location.latitude,
        longitude: liveLoc.location.longitude,
        timezone_offset: 0, // backend resolves from lat/lon
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return;
        setData(j);
      })
      .catch(() => {
        /* silent — strip just won't render */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [liveLoc.location]);

  if (!liveLoc.location) {
    return (
      <div
        style={{
          padding: "10px 16px",
          background: "rgba(7,11,20,0.4)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          fontSize: 12,
          color: theme.text.muted,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <MapPin size={12} />
        <span>Set your location to see today's panchang</span>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div
        style={{
          padding: "10px 16px",
          background: "rgba(7,11,20,0.4)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          fontSize: 12,
          color: theme.text.muted,
          opacity: 0.6,
        }}
      >
        Loading today's panchang…
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "10px 16px",
        background: "rgba(7,11,20,0.4)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        color: theme.text.muted,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: theme.text.primary }}>
        <MapPin size={11} />
        <span style={{ fontWeight: 500 }}>{liveLoc.location.display}</span>
      </span>

      {data.tithi_en && (
        <span>
          <span style={{ opacity: 0.6 }}>Tithi:</span>{" "}
          <span style={{ color: theme.text.primary }}>{data.tithi_en}</span>
        </span>
      )}
      {data.nakshatra_en && (
        <span>
          <span style={{ opacity: 0.6 }}>Nakshatra:</span>{" "}
          <span style={{ color: theme.text.primary }}>{data.nakshatra_en}</span>
        </span>
      )}
      {data.current_hora_en && (
        <span>
          <span style={{ opacity: 0.6 }}>Hora:</span>{" "}
          <span style={{ color: theme.text.primary }}>{data.current_hora_en}</span>
        </span>
      )}
      {data.sunrise_local && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Sun size={11} /> {data.sunrise_local}
        </span>
      )}
      {data.sunset_local && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Moon size={11} /> {data.sunset_local}
        </span>
      )}
    </div>
  );
}
