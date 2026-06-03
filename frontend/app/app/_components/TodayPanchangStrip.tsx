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

  // Compact pill-grid layout — works equally well on a 320-wide phone
  // and a desktop wide bar. Each fact gets its own pill so text never
  // overlaps (the user previously saw "Krishna" wrap mid-word into the
  // location row because everything shared one long flex line).
  return (
    <div
      style={{
        padding: "12px 14px",
        background:
          "linear-gradient(180deg, rgba(201,169,110,0.06) 0%, rgba(201,169,110,0.015) 100%)",
        border: "1px solid rgba(201,169,110,0.16)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Location header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            color: theme.text.primary,
            fontSize: 12,
            fontWeight: 500,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <MapPin size={11} style={{ flexShrink: 0, color: "#c9a96e" }} />
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {liveLoc.location.display}
          </span>
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: theme.text.muted,
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          {data.sunrise_local && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Sun size={11} /> {data.sunrise_local}
            </span>
          )}
          {data.sunrise_local && data.sunset_local && (
            <span style={{ opacity: 0.4 }}>·</span>
          )}
          {data.sunset_local && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Moon size={11} /> {data.sunset_local}
            </span>
          )}
        </span>
      </div>

      {/* Facts grid — auto-flows nicely from 1 col mobile to 3 col desktop */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 6,
        }}
      >
        {data.tithi_en && <PanchangFact label="Tithi" value={data.tithi_en} />}
        {data.nakshatra_en && (
          <PanchangFact label="Nakshatra" value={data.nakshatra_en} />
        )}
        {data.current_hora_en && (
          <PanchangFact label="Hora" value={data.current_hora_en} />
        )}
      </div>
    </div>
  );
}

function PanchangFact({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "6px 10px",
        background: "rgba(7,11,20,0.55)",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: 7,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: theme.text.muted,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: theme.text.primary,
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
