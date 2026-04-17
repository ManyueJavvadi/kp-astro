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
  goldDim: "#8b7a50",
  ai: "#a78bfa",
  aiDim: "rgba(167,139,250,0.15)",
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
