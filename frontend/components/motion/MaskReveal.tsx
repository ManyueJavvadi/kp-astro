// Phase 15.1 — Foundation motion primitive.
//
// <MaskReveal> sweeps a colored block off a piece of text/image, revealing
// it underneath. Mostly used for serif page-hero titles — the gold sweep
// behind the title is our signature entrance for headings.
//
// Visual: a gold rectangle sits ON TOP of the content. It slides off
// (left -> right) revealing the text underneath. The text doesn't fade —
// it's there the whole time, the sweep just uncovers it.
//
// Used for:
//   - Serif page heroes (Chart / Houses / Dasha / etc. — Phase 15.2)
//   - Verdict words on Horary (PROMISED / CONDITIONAL / DENIED)
//   - Section headings on the landing page
//
// Usage:
//   <MaskReveal>
//     <h1 className="serif-title">The Sky at Your Birth</h1>
//   </MaskReveal>
//
//   <MaskReveal color="var(--accent)" direction="right">
//     <span>PROMISED</span>
//   </MaskReveal>
//
// Direction options:
//   - "right" (default): sweep moves left-to-right (uncovers from left)
//   - "left":            sweep moves right-to-left (uncovers from right)
//   - "down":            sweep moves top-to-bottom
//   - "up":              sweep moves bottom-to-top

"use client";

import React from "react";
import { motion as m, type Variants } from "motion/react";
import { motion as motionTokens, theme } from "@/lib/theme";

type Direction = "left" | "right" | "up" | "down";
type DurationKey = keyof typeof motionTokens.duration;
type EaseKey = keyof typeof motionTokens.ease;

interface MaskRevealProps {
  children: React.ReactNode;
  /** Color of the sweeping mask. Default = gold accent. */
  color?: string;
  /** Direction the mask sweeps. Default "right". */
  direction?: Direction;
  /** Duration of the sweep. Default "slow" (600ms). */
  duration?: DurationKey;
  /** Delay before starting. Default 0. */
  delay?: number;
  /** Easing token. Default "emphasized". */
  ease?: EaseKey;
  /** Reveal on viewport enter (once). Default false (animates on mount). */
  whileInView?: boolean;
  /** Pass-through className. */
  className?: string;
  /** Pass-through style. */
  style?: React.CSSProperties;
}

export function MaskReveal({
  children,
  color = theme.gold,
  direction = "right",
  duration = "slow",
  delay = 0,
  ease = "emphasized",
  whileInView = false,
  className,
  style,
}: MaskRevealProps) {
  const dur = motionTokens.duration[duration];
  const easing = motionTokens.ease[ease];

  // Mask animates from covering the content (scaleX/Y = 1) to fully
  // swept away (scaleX/Y = 0). transform-origin controls the sweep dir.
  const transformOriginMap: Record<Direction, string> = {
    right: "right",
    left: "left",
    down: "bottom",
    up: "top",
  };

  const initialScale =
    direction === "left" || direction === "right"
      ? { scaleX: 1, scaleY: 1 }
      : { scaleY: 1, scaleX: 1 };

  const visibleScale =
    direction === "left" || direction === "right"
      ? { scaleX: 0, scaleY: 1 }
      : { scaleY: 0, scaleX: 1 };

  const variants: Variants = {
    hidden: initialScale,
    visible: {
      ...visibleScale,
      transition: { duration: dur, delay, ease: easing },
    },
  };

  return (
    <span
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        overflow: "hidden",
        ...(style ?? {}),
      }}
    >
      {/* The content sits underneath — visible immediately, no opacity dance. */}
      {children}
      {/* The mask sits on top — it sweeps off to reveal the content. */}
      <m.span
        aria-hidden="true"
        variants={variants}
        initial="hidden"
        {...(whileInView
          ? {
              whileInView: "visible" as const,
              viewport: { once: true, margin: "-10% 0px" },
            }
          : { animate: "visible" as const })}
        style={{
          position: "absolute",
          inset: 0,
          background: color,
          transformOrigin: transformOriginMap[direction],
          pointerEvents: "none",
          willChange: "transform",
        }}
      />
    </span>
  );
}
