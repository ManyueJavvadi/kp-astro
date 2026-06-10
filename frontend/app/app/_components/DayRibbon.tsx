"use client";

/**
 * DayRibbon — a sunrise→sunset timeline showing the day's auspicious and
 * inauspicious windows at a glance, with a live "now" marker.
 *
 * 2026-06-10 home redesign. The astrologer's single most-checked fact
 * before scheduling anything is "when is Rahu Kalam / when is Abhijit"
 * — previously buried in the Panchang tab. This surfaces it on the home
 * as a premium gold-on-dark ribbon. All data already comes from the
 * existing /panchangam/location response (no new backend).
 *
 * The bar spans sunrise→sunset. Overlays:
 *   - Rahu Kalam     (red)    — avoid
 *   - Yamagandam     (amber)  — avoid
 *   - Gulika Kalam   (violet) — mixed
 *   - Abhijit Muhurta(gold)   — auspicious
 * A breathing dot marks the current time.
 */

import { useMemo } from "react";
import { theme } from "@/lib/theme";

/** Parse a "6:12 AM" / "06:12 PM" local-time string to minutes-of-day. */
function parseTime(s: string | undefined | null): number | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

/** Parse a "8:30 AM-10:00 AM" range to [startMin, endMin]. */
function parseRange(s: string | undefined | null): [number, number] | null {
  if (!s) return null;
  const parts = s.split("-");
  if (parts.length !== 2) return null;
  const a = parseTime(parts[0]);
  const b = parseTime(parts[1]);
  if (a == null || b == null) return null;
  return [a, b];
}

interface RibbonWindow {
  range: [number, number];
  color: string;
  label: string;
}

export interface DayRibbonData {
  sunrise?: string;
  sunset?: string;
  rahu_kalam?: string;
  yamagandam?: string;
  gulika_kalam?: string;
  abhijit_muhurtha?: { start?: string; end?: string; valid?: boolean };
  now_local_time?: string;
}

export function DayRibbon({ data }: { data: DayRibbonData }) {
  const model = useMemo(() => {
    const dayStart = parseTime(data.sunrise);
    const dayEnd = parseTime(data.sunset);
    if (dayStart == null || dayEnd == null || dayEnd <= dayStart) return null;
    const span = dayEnd - dayStart;

    const windows: RibbonWindow[] = [];
    const push = (range: [number, number] | null, color: string, label: string) => {
      if (range) windows.push({ range, color, label });
    };
    push(parseRange(data.rahu_kalam), "#f87171", "Rahu Kalam");
    push(parseRange(data.yamagandam), "#fbbf24", "Yamagandam");
    push(parseRange(data.gulika_kalam), "#a78bfa", "Gulika");
    if (data.abhijit_muhurtha?.valid !== false) {
      const ab = data.abhijit_muhurtha;
      const a = parseTime(ab?.start);
      const b = parseTime(ab?.end);
      if (a != null && b != null) windows.push({ range: [a, b], color: "#c9a96e", label: "Abhijit" });
    }

    const now = parseTime(data.now_local_time);
    const nowPct =
      now != null && now >= dayStart && now <= dayEnd
        ? ((now - dayStart) / span) * 100
        : null;

    const segs = windows.map((w) => ({
      ...w,
      leftPct: Math.max(0, ((w.range[0] - dayStart) / span) * 100),
      widthPct: Math.min(100, ((w.range[1] - w.range[0]) / span) * 100),
    }));

    return { segs, nowPct };
  }, [data]);

  if (!model) return null;

  return (
    <div style={{ marginTop: 4 }}>
      {/* The bar */}
      <div
        style={{
          position: "relative",
          height: 18,
          borderRadius: 9,
          background:
            "linear-gradient(90deg, rgba(201,169,110,0.10), rgba(201,169,110,0.18), rgba(201,169,110,0.10))",
          border: "0.5px solid rgba(201,169,110,0.2)",
          overflow: "visible",
        }}
      >
        {model.segs.map((s, i) => (
          <div
            key={i}
            title={s.label}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${s.leftPct}%`,
              width: `${s.widthPct}%`,
              minWidth: 3,
              background: s.color,
              opacity: s.label === "Abhijit" ? 0.85 : 0.7,
              borderRadius: 4,
            }}
          />
        ))}
        {/* now marker */}
        {model.nowPct != null && (
          <div
            className="day-ribbon-now"
            style={{
              position: "absolute",
              top: -3,
              bottom: -3,
              left: `calc(${model.nowPct}% - 1px)`,
              width: 2,
              background: theme.text.primary,
              borderRadius: 2,
              boxShadow: "0 0 8px rgba(240,240,240,0.7)",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: -5,
                left: -3,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: theme.text.primary,
                boxShadow: "0 0 8px rgba(240,240,240,0.8)",
              }}
            />
          </div>
        )}
      </div>

      {/* sunrise / sunset end labels + legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 5,
          fontSize: 10,
          color: theme.text.muted,
        }}
      >
        <span>☀ {data.sunrise}</span>
        <span style={{ display: "inline-flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Legend color="#f87171" label="Rahu" />
          <Legend color="#fbbf24" label="Yama" />
          <Legend color="#c9a96e" label="Abhijit" />
        </span>
        <span>☾ {data.sunset}</span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: color, opacity: 0.8 }} />
      {label}
    </span>
  );
}
