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
import { MapPin } from "lucide-react";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { theme } from "@/lib/theme";
import { DayRibbon, type DayRibbonData } from "./DayRibbon";
import { PLANET_COLORS } from "../components/constants";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://devastroai.up.railway.app";

interface PanchangSummary extends DayRibbonData {
  tithi_en?: string;
  nakshatra_en?: string;
  nakshatra_pada?: number;
  yoga_en?: string;
  karana_en?: string;
  // NB: the endpoint returns `sunrise`/`sunset` (DayRibbonData) — the old
  // interface read `sunrise_local`/`sunset_local`, which never existed,
  // so sun times silently never rendered. Fixed by extending DayRibbonData.
  hora_lord?: string;
  current_hora?: { lord?: string };
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
    // Premium shimmer skeleton (replaces the old "Loading…" text) — mirrors
    // the real card's shape so there's no layout jump when data lands.
    return (
      <div
        style={{
          padding: "14px 16px",
          background:
            "linear-gradient(180deg, rgba(201,169,110,0.05) 0%, rgba(201,169,110,0.015) 100%)",
          border: "1px solid rgba(201,169,110,0.12)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
        aria-busy="true"
        aria-label="Loading today's panchang"
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div className="kp-skeleton" style={{ height: 14, width: "45%" }} />
          <div className="kp-skeleton" style={{ height: 18, width: 90, borderRadius: 12 }} />
        </div>
        <div className="kp-skeleton" style={{ height: 18, width: "100%", borderRadius: 9 }} />
        <div className="kp-skeleton" style={{ height: 12, width: "60%" }} />
      </div>
    );
  }

  const horaLord = data.hora_lord || data.current_hora?.lord;
  const horaColor = (horaLord && PLANET_COLORS[horaLord]) || "#c9a96e";

  // Premium "day at a glance" card: location + current-hora chip, the
  // sunrise→sunset DayRibbon (auspicious/inauspicious windows + live now
  // marker), and a compact tithi/nakshatra line.
  return (
    <div
      style={{
        padding: "14px 16px",
        background:
          "linear-gradient(180deg, rgba(201,169,110,0.07) 0%, rgba(201,169,110,0.02) 100%)",
        border: "1px solid rgba(201,169,110,0.18)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Header row: location + live current-hora chip */}
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
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
            {liveLoc.location.display}
          </span>
        </span>
        {horaLord && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              flexShrink: 0,
              padding: "3px 9px",
              borderRadius: 12,
              background: "rgba(7,11,20,0.5)",
              border: `0.5px solid ${horaColor}55`,
              fontSize: 11,
            }}
            title="Current hora lord"
          >
            <span
              className="day-ribbon-hora-dot"
              style={{ width: 7, height: 7, borderRadius: "50%", background: horaColor }}
            />
            <span style={{ color: theme.text.muted }}>Hora</span>
            <span style={{ color: horaColor, fontWeight: 600 }}>{horaLord}</span>
          </span>
        )}
      </div>

      {/* The sunrise→sunset day ribbon */}
      <DayRibbon data={data} />

      {/* Compact tithi · nakshatra line */}
      {(data.tithi_en || data.nakshatra_en) && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            fontSize: 12,
            color: theme.text.muted,
            paddingTop: 2,
          }}
        >
          {data.tithi_en && (
            <span>
              <span style={{ opacity: 0.6 }}>Tithi </span>
              <span style={{ color: theme.text.primary }}>{data.tithi_en}</span>
            </span>
          )}
          {data.tithi_en && data.nakshatra_en && <span style={{ opacity: 0.3 }}>·</span>}
          {data.nakshatra_en && (
            <span>
              <span style={{ opacity: 0.6 }}>Nakshatra </span>
              <span style={{ color: theme.text.primary }}>
                {data.nakshatra_en}
                {data.nakshatra_pada ? ` (${data.nakshatra_pada})` : ""}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

