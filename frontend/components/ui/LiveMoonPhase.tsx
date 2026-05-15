// Phase 16 — Moment #2: Live moon-phase indicator.
//
// A small SVG moon icon that shows the REAL current moon phase based
// on system time. Updates every minute. The shadow rotates smoothly
// as the lunar cycle progresses.
//
// Purpose: a small ambient widget that signals "this app knows the
// sky, not just your chart". Lives in the header / top bar where
// users see it on every tab.
//
// Phase computation uses the standard synodic period (29.53059 days)
// referenced from a known new moon epoch (2000-01-06 18:14 UTC).
// Accurate to within a few hours — fine for visual display.
//
// Visual:
//   - 18px diameter (compact)
//   - Cream-yellow disk (#f0e8d8)
//   - Dark shadow that wraps around as phase progresses
//   - Subtle 0.18 opacity gold halo around it (always-present)
//
// Usage:
//   <LiveMoonPhase />                  // default 18px
//   <LiveMoonPhase size={24} />        // larger
//   <LiveMoonPhase showLabel />        // adds text label "Waxing Crescent"

"use client";

import React, { useEffect, useState } from "react";

const SYNODIC_DAYS = 29.530588853;
// 2000-01-06 18:14:00 UTC was a known new moon (J2000 epoch ref).
const KNOWN_NEW_MOON = new Date("2000-01-06T18:14:00Z").getTime();

interface MoonInfo {
  /** Phase in days since last new moon (0 .. 29.53). */
  phaseDays: number;
  /** Phase as 0..1 (0 = new, 0.5 = full, 1 = next new). */
  phaseFraction: number;
  /** Illuminated fraction 0..1 (0 = new, 1 = full). */
  illumination: number;
  /** Human-readable name. */
  name: string;
  /** Whether the moon is currently waxing (growing). */
  waxing: boolean;
}

function computeMoonInfo(now = new Date()): MoonInfo {
  const diffMs = now.getTime() - KNOWN_NEW_MOON;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  // Modulo to get current cycle phase (handles negative for dates before epoch)
  const phaseDays = ((diffDays % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
  const phaseFraction = phaseDays / SYNODIC_DAYS;
  // Illumination peaks at 0.5 (full moon).
  const illumination = (1 - Math.cos(phaseFraction * Math.PI * 2)) / 2;
  const waxing = phaseFraction < 0.5;

  // 8-name standard phase classification.
  let name = "New Moon";
  if (phaseDays < 1.84566) name = "New Moon";
  else if (phaseDays < 5.53699) name = "Waxing Crescent";
  else if (phaseDays < 9.22831) name = "First Quarter";
  else if (phaseDays < 12.91963) name = "Waxing Gibbous";
  else if (phaseDays < 16.61096) name = "Full Moon";
  else if (phaseDays < 20.30228) name = "Waning Gibbous";
  else if (phaseDays < 23.99361) name = "Last Quarter";
  else if (phaseDays < 27.68493) name = "Waning Crescent";

  return { phaseDays, phaseFraction, illumination, name, waxing };
}

interface LiveMoonPhaseProps {
  /** Size in pixels. Default 18. */
  size?: number;
  /** Append the phase name as a text label beside the moon. */
  showLabel?: boolean;
  /** Pass-through className. */
  className?: string;
  /** Pass-through style. */
  style?: React.CSSProperties;
}

export function LiveMoonPhase({
  size = 18,
  showLabel = false,
  className,
  style,
}: LiveMoonPhaseProps) {
  const [info, setInfo] = useState<MoonInfo>(() => computeMoonInfo());

  // Recompute every 60s — the phase changes by ~12.2° per day so
  // anything more frequent is wasted. 1 min keeps it "alive" enough.
  useEffect(() => {
    const id = window.setInterval(() => {
      setInfo(computeMoonInfo());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const radius = size / 2;
  // Shadow position: at new moon (phase=0) the shadow fully covers
  // the disk from the right. At full moon (phase=0.5) it's gone.
  // At last quarter (phase=0.75) it covers the right half.
  // We draw the moon as a circle, then overlay a shadow circle whose
  // x-offset varies with phase.
  const phase = info.phaseFraction;
  // -1 = shadow on right covering everything, 0 = no shadow (full), 1 = shadow on left covering everything
  let shadowOffsetX: number;
  let shadowRadius = radius;
  if (phase < 0.5) {
    // Waxing: shadow on left, recedes left-to-right
    shadowOffsetX = -radius * 2 * (1 - phase * 2);
  } else {
    // Waning: shadow on right, advances left-to-right
    shadowOffsetX = radius * 2 * ((phase - 0.5) * 2);
  }

  // Use a clipPath so the shadow circle only shows inside the moon disk.
  const clipId = React.useId();

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: showLabel ? 8 : 0,
        ...style,
      }}
      title={`${info.name} · ${Math.round(info.illumination * 100)}% illuminated`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          filter: "drop-shadow(0 0 6px rgba(231, 201, 138, 0.25))",
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx={radius} cy={radius} r={radius} />
          </clipPath>
          <radialGradient id={`moon-grad-${clipId}`} cx="40%" cy="35%">
            <stop offset="0%" stopColor="#fdf6e3" />
            <stop offset="80%" stopColor="#e8d8a8" />
            <stop offset="100%" stopColor="#c9a96e" />
          </radialGradient>
        </defs>
        {/* Lit moon disk — radial gradient gives subtle 3D shading */}
        <circle cx={radius} cy={radius} r={radius} fill={`url(#moon-grad-${clipId})`} />
        {/* Shadow disk — clipped to the moon's circle */}
        <circle
          cx={radius + shadowOffsetX}
          cy={radius}
          r={shadowRadius}
          fill="rgba(7, 11, 20, 0.92)"
          clipPath={`url(#${clipId})`}
        />
        {/* Subtle terminator line for definition */}
        <circle
          cx={radius}
          cy={radius}
          r={radius - 0.5}
          fill="none"
          stroke="rgba(201, 169, 110, 0.4)"
          strokeWidth={0.5}
        />
      </svg>
      {showLabel && (
        <span
          style={{
            fontSize: 10,
            color: "var(--muted, #888899)",
            letterSpacing: "0.04em",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {info.name}
        </span>
      )}
    </span>
  );
}
