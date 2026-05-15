// Phase 15.1 — Foundation root providers.
//
// <MotionRoot> wraps the app once at the layout level. It does two things:
//
// 1. MotionConfig with prefers-reduced-motion respected globally.
//    Users with the OS-level reduced-motion preference get instant
//    transitions instead of animated ones. No code changes per component.
//
// 2. Lenis smooth-scroll, attached to the document scroller. Once enabled,
//    every page scroll has momentum + inertia (industry standard 2026 —
//    used by awwwards.com, framer.com, vercel.com, lusion.co, etc.).
//
// Lenis IS the smoothness budget for the whole app. Single root setup,
// transforms feel across every tab without any per-page wiring.
//
// Reduced-motion behavior:
//   - Motion: respects automatically via MotionConfig reducedMotion="user"
//   - Lenis: explicitly disabled when matchMedia("(prefers-reduced-motion: reduce)")
//     matches, so the user gets native browser scroll.

"use client";

import React, { useEffect, useRef } from "react";
import { MotionConfig } from "motion/react";
import Lenis from "lenis";

interface MotionRootProps {
  children: React.ReactNode;
}

export function MotionRoot({ children }: MotionRootProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect user preference for reduced motion — skip Lenis entirely.
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    // Lenis config — tuned for "weight & inertia" feel without sluggishness.
    // duration: 1.2 means a wheel tick takes ~1.2s to settle (vs ~0.1s native).
    // smoothWheel: true → wheel events glide. touchMultiplier: 2 → mobile feels
    // identical to desktop intent (Lenis defaults are conservative on touch).
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
      wheelMultiplier: 1,
    });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    }
    rafRef.current = requestAnimationFrame(raf);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return (
    // reducedMotion="user" makes Motion respect prefers-reduced-motion
    // automatically — every entrance animation becomes instant for users
    // who set that OS preference.
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  );
}
