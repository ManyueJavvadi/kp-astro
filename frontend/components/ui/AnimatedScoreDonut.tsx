// Phase 15.4 — Signature moment: animated compatibility-score donut.
//
// <AnimatedScoreDonut> shows a circular score (used for Ashtakoota
// compatibility in Match) where:
//   - The stroke arc tweens from 0 to final length (~1.2s)
//   - The center number counts up 0 -> N synchronously
//   - The outer glow ring grows from 0 to its final intensity
//
// This is the headline reveal of the Match tab's results page -- the
// "drumroll" moment after the user clicks Compute. The animation IS
// the payoff.
//
// Used in: frontend/app/app/page.tsx Match tab results card.

"use client";

import React, { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

interface AnimatedScoreDonutProps {
  /** Final score value (e.g. 28). */
  score: number;
  /** Max possible (e.g. 36 for Ashtakoota). */
  max: number;
  /** Arc/text color. */
  color: string;
  /** Pixel diameter. Default 84. */
  size?: number;
  /** Animation duration in seconds. Default 1.2. */
  duration?: number;
}

export function AnimatedScoreDonut({
  score,
  max,
  color,
  size = 84,
  duration = 1.2,
}: AnimatedScoreDonutProps) {
  const reduced = useReducedMotion();
  const [displayScore, setDisplayScore] = useState(reduced ? score : 0);
  const [arcProgress, setArcProgress] = useState(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      setDisplayScore(score);
      setArcProgress(1);
      return;
    }

    const controls = animate(0, 1, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setArcProgress(latest);
        setDisplayScore(Math.round(score * latest));
      },
      onComplete: () => {
        setDisplayScore(score);
        setArcProgress(1);
      },
    });
    return () => controls.stop();
  }, [score, duration, reduced]);

  const r = 34;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r; // ≈ 213.6 for r=34
  const dashLength = (score / max) * circumference * arcProgress;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
      {/* Animated arc */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={`${dashLength} ${circumference}`}
        strokeLinecap="round"
        strokeDashoffset={circumference * 0.25}
        style={{
          filter: `drop-shadow(0 0 ${4 + arcProgress * 8}px ${color}${Math.round(arcProgress * 96).toString(16).padStart(2, "0")})`,
          transition: "filter 80ms linear",
        }}
      />
      {/* Animated count-up number */}
      <text
        x={cx}
        y={cy + 2}
        textAnchor="middle"
        className="match-score-donut-num"
        fontSize={18}
        fill={color}
      >
        {displayScore}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={9} fill="var(--muted)">
        /{max}
      </text>
    </svg>
  );
}
