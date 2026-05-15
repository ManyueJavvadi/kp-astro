// Phase 15.4 — Signature moment: animated number counter.
//
// <CountUp> tweens a numeric value from 0 (or a custom from) to a target
// over a short duration. Used for:
//   - Match compatibility score: 0% -> 87% over 1.2s on results reveal
//   - Muhurtha window scores: 0 -> N as each result card appears
//   - Horary number: scrambles through random values then settles
//   - Any "this is the answer" reveal where the number IS the payoff
//
// Why a primitive: counter animations look amateurish if they're not
// uniformly tuned across the app. This wraps the math so every counter
// in the app shares timing + easing.
//
// Usage:
//   <CountUp to={87} duration={1.2} suffix="%" />
//   <CountUp from={100} to={249} duration={0.8} />
//   <CountUp to={5} format={(n) => "★".repeat(n)} />
//
// Respects prefers-reduced-motion (skips the tween, shows final value
// immediately) via Motion's reducedMotion config inherited from root.

"use client";

import React, { useEffect } from "react";
import { useMotionValue, useTransform, animate, useReducedMotion } from "motion/react";
import { motion as motionTokens } from "@/lib/theme";

interface CountUpProps {
  /** Final value to count up to. */
  to: number;
  /** Starting value. Default 0. */
  from?: number;
  /** Duration in seconds. Default 1.2 (matches "long" duration token). */
  duration?: number;
  /** Delay in seconds before counting starts. Default 0. */
  delay?: number;
  /** Decimal places to display. Default 0 (integer). */
  decimals?: number;
  /** Suffix appended to displayed number (e.g., "%", "/100"). */
  suffix?: string;
  /** Prefix prepended (e.g., "$", "#"). */
  prefix?: string;
  /** Custom formatter — overrides decimals/prefix/suffix. */
  format?: (n: number) => string;
  /** Trigger counter when element scrolls into viewport (vs on mount). */
  whileInView?: boolean;
  /** Pass-through className. */
  className?: string;
  /** Pass-through style. */
  style?: React.CSSProperties;
}

export function CountUp({
  to,
  from = 0,
  duration = motionTokens.duration.long,
  delay = 0,
  decimals = 0,
  suffix = "",
  prefix = "",
  format,
  whileInView = false,
  className,
  style,
}: CountUpProps) {
  const reduced = useReducedMotion();
  const count = useMotionValue(reduced ? to : from);

  // Transform the motion value into a display string.
  const rounded = useTransform(count, (n) => {
    if (format) return format(n);
    const fixed = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
    return `${prefix}${fixed}${suffix}`;
  });

  const [display, setDisplay] = React.useState(() => {
    const initial = reduced ? to : from;
    if (format) return format(initial);
    const fixed = decimals > 0 ? initial.toFixed(decimals) : Math.round(initial).toString();
    return `${prefix}${fixed}${suffix}`;
  });

  useEffect(() => {
    const unsub = rounded.on("change", (latest) => setDisplay(latest));
    return unsub;
  }, [rounded]);

  // Run the tween. When `whileInView` is true, IntersectionObserver
  // triggers; otherwise it runs on mount.
  const elementRef = React.useRef<HTMLSpanElement>(null);
  const hasRun = React.useRef(false);

  useEffect(() => {
    if (reduced) return;
    if (hasRun.current) return;

    const start = () => {
      hasRun.current = true;
      const controls = animate(count, to, {
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1], // reveal easing token
      });
      return controls;
    };

    if (!whileInView) {
      const c = start();
      return () => c.stop();
    }

    // IntersectionObserver gate
    const el = elementRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const c = start();
      return () => c.stop();
    }

    let controls: ReturnType<typeof animate> | null = null;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !hasRun.current) {
          controls = start();
          obs.disconnect();
          break;
        }
      }
    }, { threshold: 0.3 });
    obs.observe(el);

    return () => {
      obs.disconnect();
      controls?.stop();
    };
  }, [count, to, duration, delay, whileInView, reduced]);

  return (
    <span ref={elementRef} className={className} style={style}>
      {display}
    </span>
  );
}
