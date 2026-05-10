// Phase 15.1 — Foundation motion primitive.
//
// <StaggerChildren> orchestrates a cascade of child reveals. Each direct
// child fades + lifts in with a fixed gap between siblings, producing
// the "breathing in" rhythm that signals craft.
//
// Usage — the parent controls timing, children just need to exist:
//
//   <StaggerChildren>
//     <div>First (appears at 0ms)</div>
//     <div>Second (appears at 60ms)</div>
//     <div>Third (appears at 120ms)</div>
//   </StaggerChildren>
//
// Or with the helper child <StaggerItem> for fine control:
//
//   <StaggerChildren gap="relaxed">
//     <StaggerItem>Card A</StaggerItem>
//     <StaggerItem distance="medium">Card B (slides further)</StaggerItem>
//   </StaggerChildren>
//
// Variants accepted by `gap`:
//   - "tight"   (30ms, dense lists)
//   - "base"    (60ms, default — most lists)
//   - "relaxed" (100ms, hero sections)
//   - "dramatic"(180ms, small intentional sets)
//
// Like FadeIn, respects prefers-reduced-motion via root MotionConfig.

"use client";

import React from "react";
import { motion as m, type Variants } from "motion/react";
import { motion as motionTokens } from "@/lib/theme";

type GapKey = keyof typeof motionTokens.stagger;
type DistanceKey = keyof typeof motionTokens.distance;
type DurationKey = keyof typeof motionTokens.duration;
type EaseKey = keyof typeof motionTokens.ease;

interface StaggerChildrenProps {
  children: React.ReactNode;
  /** Time between sibling reveals. Default "base" (60ms). */
  gap?: GapKey;
  /** Delay before the FIRST child starts. Default 0. */
  delay?: number;
  /** Reveal on scroll into viewport (once). Default true (intent of cascades). */
  whileInView?: boolean;
  /** Reveal on mount immediately instead. Overrides whileInView. */
  immediate?: boolean;
  /** Pass-through className. */
  className?: string;
  /** Pass-through style. */
  style?: React.CSSProperties;
  /** Render as element other than div. */
  as?: "div" | "ul" | "ol" | "section" | "nav";
}

export function StaggerChildren({
  children,
  gap = "base",
  delay = 0,
  whileInView = true,
  immediate = false,
  className,
  style,
  as = "div",
}: StaggerChildrenProps) {
  const staggerGap = motionTokens.stagger[gap];

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        delayChildren: delay,
        staggerChildren: staggerGap,
      },
    },
  };

  const Component = (m as unknown as Record<string, typeof m.div>)[as] ?? m.div;

  if (immediate) {
    return (
      <Component
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={className}
        style={style}
      >
        {children}
      </Component>
    );
  }

  if (whileInView) {
    return (
      <Component
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-5% 0px" }}
        className={className}
        style={style}
      >
        {children}
      </Component>
    );
  }

  return (
    <Component
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
      style={style}
    >
      {children}
    </Component>
  );
}

// ─── <StaggerItem> ────────────────────────────────────────────────────
// A child slot for StaggerChildren. Inherits the parent's cascade
// timing. If a child isn't a StaggerItem, the StaggerChildren parent
// will still cascade it correctly (Motion picks up nested motion.div
// children automatically), but using StaggerItem gives per-item control
// over distance/duration/easing without breaking the cascade.

interface StaggerItemProps {
  children: React.ReactNode;
  /** Override distance for this item only. Default "small". */
  distance?: DistanceKey;
  /** Override duration. Default "base". */
  duration?: DurationKey;
  /** Override easing. Default "reveal". */
  ease?: EaseKey;
  /** Pass-through className. */
  className?: string;
  /** Pass-through style. */
  style?: React.CSSProperties;
  /** Render as element. */
  as?: "div" | "li" | "span" | "section" | "article";
}

export function StaggerItem({
  children,
  distance = "small",
  duration = "base",
  ease = "reveal",
  className,
  style,
  as = "div",
}: StaggerItemProps) {
  const d = motionTokens.distance[distance];
  const dur = motionTokens.duration[duration];
  const easing = motionTokens.ease[ease];

  const variants: Variants = {
    hidden: { opacity: 0, y: d },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: dur, ease: easing },
    },
  };

  const Component = (m as unknown as Record<string, typeof m.div>)[as] ?? m.div;

  return (
    <Component variants={variants} className={className} style={style}>
      {children}
    </Component>
  );
}
