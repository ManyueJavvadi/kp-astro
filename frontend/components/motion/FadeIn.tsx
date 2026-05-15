// Phase 15.1 — Foundation motion primitive.
//
// <FadeIn> wraps any content with the canonical entrance animation:
// fade + slight translateY, with the project's standard "reveal" easing.
// Use this anywhere a single element should appear with weight + grace
// instead of a hard mount.
//
// Examples:
//   <FadeIn>...</FadeIn>                         // default, fades on mount
//   <FadeIn delay={0.2}>...</FadeIn>             // delay before starting
//   <FadeIn distance="medium" duration="slow">   // bigger reveal
//   <FadeIn whileInView>...</FadeIn>             // reveal on scroll into viewport
//   <FadeIn as="span" inline>...</FadeIn>        // inline rendering
//
// Why a wrapper instead of using `motion.div` everywhere:
//   - Single source of truth for entrance grammar (every fade uses the same
//     easing/distance/duration). Switching the design language = editing
//     one file, not 200 inline magic numbers.
//   - Respects prefers-reduced-motion automatically (MotionConfig at root).
//   - Cheap to drop in around existing JSX without restructuring.

"use client";

import React from "react";
import { motion as m, type Variants } from "motion/react";
import { motion as motionTokens } from "@/lib/theme";

type DistanceKey = keyof typeof motionTokens.distance;
type DurationKey = keyof typeof motionTokens.duration;
type EaseKey = keyof typeof motionTokens.ease;

interface FadeInProps {
  children: React.ReactNode;
  /** Delay in seconds before animation starts. Default 0. */
  delay?: number;
  /** How far to translateY from. Default "small". */
  distance?: DistanceKey;
  /** Duration token. Default "base". */
  duration?: DurationKey;
  /** Easing token. Default "reveal". */
  ease?: EaseKey;
  /** If true, reveal only when scrolled into viewport (once). */
  whileInView?: boolean;
  /** Render as a different element. Default "div". */
  as?: "div" | "span" | "li" | "section" | "article" | "header" | "h1" | "h2" | "h3" | "p";
  /** Inline-block rendering when wrapping inline content. */
  inline?: boolean;
  /** Pass-through className for the wrapper. */
  className?: string;
  /** Pass-through style for the wrapper. */
  style?: React.CSSProperties;
}

export function FadeIn({
  children,
  delay = 0,
  distance = "small",
  duration = "base",
  ease = "reveal",
  whileInView = false,
  as = "div",
  inline = false,
  className,
  style,
}: FadeInProps) {
  const d = motionTokens.distance[distance];
  const dur = motionTokens.duration[duration];
  const easing = motionTokens.ease[ease];

  const variants: Variants = {
    hidden: { opacity: 0, y: d },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: dur, delay, ease: easing },
    },
  };

  // motion supports `as` via the proxy: motion.span, motion.li, etc.
  // Build the component dynamically with a tiny lookup.
  const Component = (m as unknown as Record<string, typeof m.div>)[as] ?? m.div;

  const baseProps = {
    variants,
    className,
    style: inline ? { display: "inline-block", ...(style ?? {}) } : style,
  };

  if (whileInView) {
    return (
      <Component
        {...baseProps}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-10% 0px" }}
      >
        {children}
      </Component>
    );
  }

  return (
    <Component {...baseProps} initial="hidden" animate="visible">
      {children}
    </Component>
  );
}
