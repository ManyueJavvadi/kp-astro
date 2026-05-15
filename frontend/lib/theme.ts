/**
 * Locked design tokens (pixel spec — no creative decisions).
 * Every page must import from here. No hex colors inline elsewhere.
 */

export const theme = {
  // Backgrounds (in increasing elevation)
  bg: {
    page: "#070B14",
    sidebar: "#0A0E17",
    content: "#0F172A",
    stat: "#111827",
    hover: "rgba(255,255,255,0.03)",
    elevated: "#1e2030",
  },

  // Borders
  border: {
    default: "1px solid rgba(255,255,255,0.06)",
    medium: "1px solid rgba(255,255,255,0.08)",
    strong: "1px solid rgba(255,255,255,0.12)",
    accent: "1px solid rgba(201,169,110,0.4)",
  },

  // Text
  text: {
    primary: "#F1F5F9",
    secondary: "#94A3B8",
    muted: "#64748B",
    dim: "#475569",
  },

  // Accents
  gold: "#c9a96e",
  goldBright: "#e7c98a",
  goldDim: "#8b7a50",
  // AI-authored content tint — warm cream. Research: purple (#a78bfa) is
  // the generic AI color in 2025-2026 (Notion AI, ChatGPT, Linear AI,
  // Copilot). Cream reads as "margin note in an ancient manuscript" and
  // no other AI tool owns it. Use on borders / subtle surface washes
  // behind Claude output, NEVER as a button fill.
  ai: "#E6C79C",
  aiDim: "rgba(230,199,156,0.15)",
  success: "#34d399",
  warning: "#fbbf24",
  error: "#f87171",
  info: "#60a5fa",

  // Shadow
  shadow: {
    sm: "0 1px 3px rgba(0,0,0,0.3)",
    md: "0 2px 8px rgba(0,0,0,0.4)",
    lg: "0 4px 16px rgba(0,0,0,0.5)",
  },

  // Radius
  radius: {
    sm: 6,
    md: 8,
    lg: 12,
  },

  // Spacing
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
  },

  // Type sizes
  font: {
    tiny: 10,
    caption: 11,
    small: 12,
    body: 13,
    body_large: 14,
    section: 16,
    heading: 20,
    page_title: 24,
    display: 28,
    hero: 36,
  },
} as const;

// ════════════════════════════════════════════════════════════════
// Motion tokens (Phase 15.1 — "Cosmic Craft")
// ════════════════════════════════════════════════════════════════
// EVERY animation in the app pulls easing/timing from this single source.
// Consistent rhythm is what brains read as "well-made". Adding a new motion
// shape? Either reuse a token below, or extend the token set — never inline
// a magic cubic-bezier in component code.
//
// Used by:
//   - <FadeIn>, <StaggerChildren>, <MaskReveal> primitives
//   - Motion components throughout the app
//   - CSS keyframes that need to match Motion timing
//
// Reference grammar (oryzo/Lusion-style "weight & inertia"):
//   - Reveals: emphasized decelerate (heavy entrance, soft landing)
//   - Hover/press: gentle overshoot (responsive but not bouncy)
//   - Continuous: slow ease loop (breathing rhythm)
//   - Layout: spring with low damping (organic, never snappy)
// ════════════════════════════════════════════════════════════════

export const motion = {
  // ── Easings (use these strings as Motion's `ease` prop) ──────────────
  ease: {
    // Material 3 "emphasized decelerate" — perfect for reveals.
    // Fast initial, soft landing. Feels like content "arriving".
    reveal: [0.16, 1, 0.3, 1] as [number, number, number, number],
    // Gentle overshoot — for hover/press micro-interactions.
    // Just enough bounce to feel alive, not cartoonish.
    overshoot: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
    // Strong decelerate — for important entrances (page heroes, modals).
    emphasized: [0.05, 0.7, 0.1, 1] as [number, number, number, number],
    // In-out — for continuous loops (breathing, idle pulses).
    breathing: [0.45, 0, 0.55, 1] as [number, number, number, number],
  },

  // ── Durations (seconds — Motion expects seconds, not ms) ─────────────
  duration: {
    instant: 0.12,    // hover tint, focus ring
    fast: 0.25,       // small UI feedback (button press, chip select)
    base: 0.4,        // most reveals
    slow: 0.6,        // hero reveals, larger components
    long: 1.2,        // dramatic entrances (chart bloom, page hero)
    breathing: 3.8,   // continuous loops (orb breath, pulse-gold)
  },

  // ── Stagger gaps (seconds between siblings in a cascade) ─────────────
  stagger: {
    tight: 0.03,      // dense lists (planet table rows, panchang day cells)
    base: 0.06,       // most lists (house grid, dasha tree, topic chips)
    relaxed: 0.1,     // hero sections, large cards
    dramatic: 0.18,   // small set of items meant to feel intentional
  },

  // ── Spring presets (Motion's spring config objects) ──────────────────
  spring: {
    // Default — for most layout animations. Smooth, settles fast.
    soft: { type: "spring" as const, stiffness: 200, damping: 24, mass: 1 },
    // Snappier — for buttons, chip selects.
    crisp: { type: "spring" as const, stiffness: 360, damping: 28, mass: 0.8 },
    // Bouncy — for celebration moments (chart bloom, score reveal).
    elastic: { type: "spring" as const, stiffness: 180, damping: 14, mass: 1.1 },
    // Heavy — for large UI (sheet open, modal lift).
    weighty: { type: "spring" as const, stiffness: 140, damping: 22, mass: 1.3 },
  },

  // ── Distances (pixels — used for translateY/X on reveal) ─────────────
  distance: {
    nudge: 6,         // subtle (hover lift)
    small: 12,        // most reveals (text fade-up)
    medium: 20,       // cards (slide-up)
    large: 32,        // page-level entrances
  },
} as const;

/** Inline style helpers for common patterns. */
export const styles = {
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 32,
    padding: "0 12px",
    backgroundColor: theme.gold,
    color: "#07070d",
    borderRadius: theme.radius.sm,
    fontSize: 13,
    fontWeight: 500,
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
  } as React.CSSProperties,

  secondaryButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 32,
    padding: "0 12px",
    backgroundColor: "rgba(255,255,255,0.04)",
    border: theme.border.medium,
    color: theme.text.primary,
    borderRadius: theme.radius.sm,
    fontSize: 13,
    fontWeight: 500,
    textDecoration: "none",
    cursor: "pointer",
  } as React.CSSProperties,

  ghostButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 32,
    padding: "0 12px",
    backgroundColor: "transparent",
    border: "none",
    color: theme.text.secondary,
    borderRadius: theme.radius.sm,
    fontSize: 13,
    fontWeight: 500,
    textDecoration: "none",
    cursor: "pointer",
  } as React.CSSProperties,

  input: {
    width: "100%",
    height: 36,
    padding: "0 12px",
    backgroundColor: theme.bg.content,
    border: theme.border.medium,
    borderRadius: theme.radius.sm,
    fontSize: 13,
    color: theme.text.primary,
    outline: "none",
  } as React.CSSProperties,

  sectionLabel: {
    fontSize: 10,
    color: theme.text.dim,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    fontWeight: 500,
    marginBottom: 6,
  } as React.CSSProperties,

  sectionHeading: {
    fontSize: 16,
    fontWeight: 600,
    color: theme.text.primary,
    lineHeight: 1.3,
  } as React.CSSProperties,

  pageTitle: {
    fontSize: 24,
    fontWeight: 600,
    color: theme.text.primary,
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
    margin: 0,
  } as React.CSSProperties,
};

import type * as React from "react";
