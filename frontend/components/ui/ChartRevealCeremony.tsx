// Phase 16 — Moment #1: Chart reveal CEREMONY.
//
// Replaces the tiny 1.75s bloom in the original kp-chart-reveal CSS
// with a full 3.4-second cinematic sequence. This is THE moment users
// remember — the only moment they screenshot/video.
//
// Choreography:
//   0.0 - 0.5s  Dark void overlay fades in (covers chart)
//   0.5 - 1.4s  18 stars converge from screen edges to center
//   1.4 - 2.3s  9 planet glyphs emerge from center, orbit out to
//               their cardinal positions (clockwise from top)
//   2.3 - 2.8s  Gold zodiac wheel draws around the planets via
//               stroke-dashoffset animation (250px circle)
//   2.6 - 3.2s  Name + nakshatra serif title fades up under wheel
//   3.2 - 3.5s  Whole overlay fades out, revealing the real chart
//
// Total: 3.5s. Pointer-events: none throughout so clicks fall through.
// Uses prefers-reduced-motion via MotionConfig — degrades to instant
// fade-in + name reveal only (skips converge/orbit/wheel-draw).
//
// Usage (one mount, controlled by parent state):
//   {showChartReveal && (
//     <ChartRevealCeremony
//       name="Manyue Javvadi"
//       nakshatra="Uttara Ashadha"
//       onComplete={() => setShowChartReveal(false)}
//     />
//   )}

"use client";

import React, { useEffect } from "react";
import { motion as m } from "motion/react";
import { PLANET_GLYPHS, PLANET_COLORS } from "@/lib/planets";

interface ChartRevealCeremonyProps {
  /** Native's full name to render in the final title. */
  name?: string;
  /** Native's Janma Nakshatra (Moon's nakshatra) — the most personal label. */
  nakshatra?: string;
  /** Optional sub-label below nakshatra (e.g., "Capricorn Moon"). */
  subLabel?: string;
  /** Called when the ceremony finishes — parent unmounts the overlay. */
  onComplete: () => void;
  /** Override total duration in ms. Default 3500. */
  durationMs?: number;
}

// Planets ordered clockwise from 12 o'clock for the orbit reveal.
const PLANET_ORDER: (keyof typeof PLANET_GLYPHS)[] = [
  "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Moon", "Ketu",
];

// 9 cardinal positions on a circle, radius ~140px, starting at top (12 o'clock).
function planetPosition(index: number, radius = 140): { x: number; y: number } {
  const angle = (index / 9) * Math.PI * 2 - Math.PI / 2; // -90deg = top
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

// 18 star particles distributed around the viewport edges. Each gets a
// random delay between 0 and 0.4s so they don't converge in a single beat.
const STARS = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  // Spawn at viewport-edge radius (50% of vmax + some random padding)
  const startRadius = 600;
  return {
    id: i,
    startX: Math.cos(angle) * startRadius,
    startY: Math.sin(angle) * startRadius,
    delay: Math.random() * 0.4,
    size: 2 + Math.random() * 2.5,
  };
});

export function ChartRevealCeremony({
  name,
  nakshatra,
  subLabel,
  onComplete,
  durationMs = 3500,
}: ChartRevealCeremonyProps) {
  // Auto-dismiss the overlay after duration. Parent passes a setter that
  // toggles state to false, so React unmounts us cleanly.
  useEffect(() => {
    const id = window.setTimeout(onComplete, durationMs);
    return () => window.clearTimeout(id);
  }, [onComplete, durationMs]);

  return (
    <m.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 1, 0] }}
      transition={{
        duration: durationMs / 1000,
        times: [0, 0.15, 0.6, 0.92, 1],
        ease: "easeInOut",
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse at center, rgba(7,11,20,0.92) 0%, rgba(7,11,20,1) 70%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        pointerEvents: "none",
      }}
    >
      {/* ── Scene: 320×320 stage containing all the orbital action ── */}
      <div
        style={{
          position: "relative",
          width: 320,
          height: 320,
          marginBottom: 28,
        }}
      >
        {/* Stars converging from screen edges to center.
            Each starts off-canvas (translated by edge-radius) and tweens
            to (0,0) while fading in then out. */}
        {STARS.map((star) => (
          <m.div
            key={`star-${star.id}`}
            initial={{
              x: star.startX,
              y: star.startY,
              opacity: 0,
              scale: 0,
            }}
            animate={{
              x: 0,
              y: 0,
              opacity: [0, 0.9, 0],
              scale: [0, 1, 0.4],
            }}
            transition={{
              duration: 0.9,
              delay: 0.5 + star.delay,
              ease: [0.16, 1, 0.3, 1],
              opacity: { times: [0, 0.5, 1], duration: 0.9 },
            }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: star.size,
              height: star.size,
              marginLeft: -star.size / 2,
              marginTop: -star.size / 2,
              borderRadius: "50%",
              background: "#e8c98a",
              boxShadow: "0 0 8px #e8c98a, 0 0 16px rgba(231,201,138,0.6)",
            }}
          />
        ))}

        {/* Central core flash — happens AT the moment stars converge.
            Quick bright pulse, then settles to the wheel center. */}
        <m.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.6] }}
          transition={{
            duration: 0.6,
            delay: 1.3,
            times: [0, 0.5, 1],
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 28,
            height: 28,
            marginLeft: -14,
            marginTop: -14,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 50% 50%, #fff 0%, #e8c98a 40%, transparent 80%)",
            boxShadow: "0 0 40px 12px rgba(231,201,138,0.7)",
          }}
        />

        {/* 9 planet glyphs — each spawns from center, orbits to its
            cardinal position with a stagger. Each lights up with its
            own brand color. */}
        {PLANET_ORDER.map((planet, i) => {
          const dest = planetPosition(i);
          const color = PLANET_COLORS[planet];
          const glyph = PLANET_GLYPHS[planet];
          return (
            <m.div
              key={`planet-${planet}`}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{
                x: dest.x,
                y: dest.y,
                opacity: [0, 1, 1, 0.9],
                scale: [0, 1.2, 1],
              }}
              transition={{
                duration: 1.0,
                delay: 1.4 + i * 0.07, // staggered orbit
                ease: [0.16, 1, 0.3, 1],
                opacity: { times: [0, 0.3, 0.8, 1], duration: 1.0 },
                scale: { times: [0, 0.6, 1], duration: 1.0 },
              }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                marginLeft: -18,
                marginTop: -18,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 600,
                color,
                textShadow: `0 0 12px ${color}, 0 0 24px ${color}80`,
                fontFamily: "ui-serif, 'DM Serif Display', serif",
              }}
            >
              {glyph}
            </m.div>
          );
        })}

        {/* Zodiac wheel — draws around the planets via stroke-dashoffset.
            r=150 → circumference = 942.5px. Animate from full offset to 0. */}
        <svg
          width={320}
          height={320}
          viewBox="0 0 320 320"
          style={{
            position: "absolute",
            inset: 0,
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          <m.circle
            cx={160}
            cy={160}
            r={150}
            fill="none"
            stroke="#c9a96e"
            strokeWidth={1.5}
            strokeDasharray={942.5}
            initial={{ strokeDashoffset: 942.5, opacity: 0 }}
            animate={{
              strokeDashoffset: 0,
              opacity: [0, 0.8, 0.8],
            }}
            transition={{
              duration: 0.7,
              delay: 2.3,
              ease: [0.16, 1, 0.3, 1],
              opacity: { times: [0, 0.3, 1], duration: 0.7 },
            }}
            style={{
              transformOrigin: "center",
              transform: "rotate(-90deg)",
              filter: "drop-shadow(0 0 8px rgba(201,169,110,0.5))",
            }}
          />
          {/* 12 zodiac tick marks — appear AFTER the wheel completes. */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 360 - 90; // degrees
            const rad = (angle * Math.PI) / 180;
            const inner = 144;
            const outer = 156;
            const x1 = 160 + Math.cos(rad) * inner;
            const y1 = 160 + Math.sin(rad) * inner;
            const x2 = 160 + Math.cos(rad) * outer;
            const y2 = 160 + Math.sin(rad) * outer;
            return (
              <m.line
                key={`tick-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#c9a96e"
                strokeWidth={1}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8] }}
                transition={{
                  duration: 0.4,
                  delay: 2.7 + i * 0.02,
                  ease: "easeOut",
                }}
              />
            );
          })}
        </svg>
      </div>

      {/* ── Title block — name + nakshatra, fades up at t=2.6s ── */}
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 2.6,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{ textAlign: "center" }}
      >
        {name && (
          <div
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 26,
              color: "#f0f0f0",
              letterSpacing: "-0.005em",
              lineHeight: 1.2,
            }}
          >
            {name}
          </div>
        )}
        {nakshatra && (
          <div
            style={{
              fontSize: 11,
              color: "#c9a96e",
              marginTop: 8,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {nakshatra} Nakshatra
          </div>
        )}
        {subLabel && (
          <div
            style={{
              fontSize: 11,
              color: "var(--muted, #888899)",
              marginTop: 4,
              letterSpacing: "0.06em",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {subLabel}
          </div>
        )}
      </m.div>
    </m.div>
  );
}
