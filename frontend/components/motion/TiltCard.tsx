// Phase 15.4 — Signature moment: 3D-tilt card on hover.
//
// <TiltCard> wraps any content with a perspective transform that tilts
// the card toward the cursor on hover. Subtle (~6deg max), spring-damped
// on exit, no parallax of inner children (kept simple).
//
// Used for:
//   - Muhurtha "best window" result cards
//   - Pricing tier cards on landing page
//   - Feature cards on landing
//   - Any "this is a thing" card where the user lingers
//
// Why: a TINY amount of 3D tilt on hover reads as "this surface is
// real / has weight" -- exactly the cosmic-craft language. Used
// sparingly, becomes a signature interaction without being gimmicky.
//
// Mobile: disabled via touch-detection (the effect needs a hover state
// that doesn't exist on touchscreens, and would break tap UX).

"use client";

import React, { useRef } from "react";
import { motion as m, useMotionValue, useSpring, useTransform } from "motion/react";

interface TiltCardProps {
  children: React.ReactNode;
  /** Max rotation in degrees on each axis. Default 6 (subtle). */
  intensity?: number;
  /** Disable on touch devices. Default true. */
  disableOnTouch?: boolean;
  /** Pass-through className. */
  className?: string;
  /** Pass-through style. */
  style?: React.CSSProperties;
  /** Optional click handler. */
  onClick?: () => void;
}

export function TiltCard({
  children,
  intensity = 6,
  disableOnTouch = true,
  className,
  style,
  onClick,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring-damped for smooth tilt + soft return-to-flat on mouseleave.
  const springConfig = { stiffness: 200, damping: 22, mass: 0.8 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [intensity, -intensity]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-intensity, intensity]), springConfig);

  // Touch detection — checks pointer media query at mount.
  const [isTouch, setIsTouch] = React.useState(false);
  React.useEffect(() => {
    if (!disableOnTouch) return;
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    setIsTouch(mq.matches);
  }, [disableOnTouch]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(px);
    y.set(py);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // On touch devices, render a plain wrapper (no transform overhead).
  if (isTouch) {
    return (
      <div className={className} style={style} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <m.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        transformPerspective: 1000,
        cursor: onClick ? "pointer" : "default",
        ...(style ?? {}),
      }}
      className={className}
    >
      {children}
    </m.div>
  );
}
