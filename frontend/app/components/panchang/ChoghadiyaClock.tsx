"use client";
import React, { useMemo } from "react";
import { ChoghadiyaPeriod } from "../../types/panchang";

interface ChoghadiyaClockProps {
  periods: ChoghadiyaPeriod[];
  sunrise: string;  // "HH:MM"
  sunset: string;   // "HH:MM"
  showDay: boolean; // true = day choghadiya, false = night
}

const QUALITY_COLORS: Record<string, string> = {
  auspicious:   "#34d399",
  neutral:      "#a78bfa",
  inauspicious: "#f87171",
};

const NAME_COLORS: Record<string, string> = {
  Amrit: "#34d399",
  Shubh: "#fbbf24",
  Labh:  "#60a5fa",
  Chal:  "#a78bfa",
  Rog:   "#f87171",
  Kaal:  "#6b7280",
  Udveg: "#f59e0b",
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToAngle(minutes: number, startMinutes: number, totalMinutes: number): number {
  // Map minutes within day period to 0-360 degrees
  const fraction = ((minutes - startMinutes) % totalMinutes) / totalMinutes;
  return fraction * 360 - 90; // -90 so 0 = top (12 o'clock)
}

function polarToXY(angle: number, r: number, cx: number, cy: number): [number, number] {
  const rad = (angle * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const [x1, y1] = polarToXY(startAngle, r, cx, cy);
  const [x2, y2] = polarToXY(endAngle, r, cx, cy);
  const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export default function ChoghadiyaClock({ periods, sunrise, sunset, showDay }: ChoghadiyaClockProps) {
  const CX = 110, CY = 110, R = 90, R_INNER = 55;

  const filtered = useMemo(() => periods.filter(p => p.is_day === showDay), [periods, showDay]);

  const startRef  = showDay ? sunrise : sunset;
  const totalMins = 8 * 90; // 8 × 90-minute segments

  const startMinutes = timeToMinutes(startRef);
  const nowMinutes   = (() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  })();

  const segments = useMemo(() => {
    return filtered.map(p => {
      const pStart = timeToMinutes(p.start);
      const pEnd   = timeToMinutes(p.end);
      const sa = minutesToAngle(pStart, startMinutes, totalMins) - 90;
      const ea = minutesToAngle(pEnd,   startMinutes, totalMins) - 90;
      const isCurrent = p.is_current || (nowMinutes >= pStart && nowMinutes < pEnd);
      return { ...p, sa, ea, isCurrent };
    });
  }, [filtered, startMinutes, nowMinutes, totalMins]);

  // Current time needle angle
  const nowAngle = minutesToAngle(nowMinutes, startMinutes, totalMins) - 90;
  const [nx, ny] = polarToXY(nowAngle, R - 8, CX, CY);

  const currentPeriod = filtered.find(p => p.is_current) ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <svg width={220} height={220} viewBox="0 0 220 220">
        {/* Background circle */}
        <circle cx={CX} cy={CY} r={R} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

        {/* Segments */}
        {segments.map((seg, i) => {
          const color = NAME_COLORS[seg.name] ?? "#888";
          return (
            <path
              key={i}
              d={describeArc(CX, CY, R, seg.sa, seg.ea)}
              fill={seg.isCurrent ? `${color}50` : `${color}20`}
              stroke={color}
              strokeWidth={seg.isCurrent ? 2 : 0.5}
            />
          );
        })}

        {/* Inner circle (donut hole) */}
        <circle cx={CX} cy={CY} r={R_INNER} fill="var(--bg)" />

        {/* Center text */}
        {currentPeriod && (
          <>
            <text x={CX} y={CY - 8} textAnchor="middle" fontSize={11} fontWeight={700}
              fill={NAME_COLORS[currentPeriod.name] ?? "#c9a96e"}>
              {currentPeriod.name}
            </text>
            <text x={CX} y={CY + 8} textAnchor="middle" fontSize={9} fill="#888899">
              {currentPeriod.start}–{currentPeriod.end}
            </text>
          </>
        )}

        {/* Now needle */}
        <line
          x1={CX} y1={CY}
          x2={nx} y2={ny}
          stroke="#c9a96e" strokeWidth={2} strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={4} fill="#c9a96e" />
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {Object.entries(NAME_COLORS).map(([name, color]) => (
          <span key={name} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 10, color: "#888899",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
