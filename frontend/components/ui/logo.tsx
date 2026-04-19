/**
 * DevAstroAI brand mark — canvas-rendered rotating Saturn with tilted rings.
 * Single source of truth. Use everywhere the brand appears.
 *
 * The mark is an animated canvas (AnimatedLogoMark); it auto-scales particle
 * counts with `size` and falls back to the static /saturn-logo.svg for users
 * with `prefers-reduced-motion: reduce`.
 */

import type { CSSProperties } from "react";
import { theme } from "@/lib/theme";
import { AnimatedLogoMark } from "./animated-logo-mark";

type LogoProps = {
  size?: number;
  glow?: boolean;
  wordmark?: boolean;
  wordmarkSize?: number;
  style?: CSSProperties;
  className?: string;
};

export function Logo({
  size = 32,
  glow = true,
  wordmark = false,
  wordmarkSize,
  style,
  className,
}: LogoProps) {
  const wrapperStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: Math.max(8, Math.round(size * 0.32)),
    ...style,
  };

  if (!wordmark) {
    return (
      <span style={wrapperStyle} className={className}>
        <LogoMark size={size} glow={glow} />
      </span>
    );
  }

  const fontSize = wordmarkSize ?? Math.round(size * 0.5);
  return (
    <span style={wrapperStyle} className={className}>
      <LogoMark size={size} glow={glow} />
      <span
        style={{
          fontSize,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: theme.text.primary,
          lineHeight: 1,
        }}
      >
        DevAstro<span style={{ color: theme.gold }}>AI</span>
      </span>
    </span>
  );
}

/** Saturn particle logo rendered as a circular tile. */
export function LogoMark({
  size = 32,
  glow = true,
}: {
  size?: number;
  glow?: boolean;
}) {
  return (
    <span
      aria-label="DevAstroAI"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        overflow: "hidden",
        background: "#000",
        border: "1px solid rgba(201,169,110,0.25)",
        boxShadow: glow
          ? [
              "0 0 0 1px rgba(201,169,110,0.18)",
              "0 0 12px rgba(201,169,110,0.35)",
              "0 2px 6px rgba(0,0,0,0.5)",
            ].join(", ")
          : "0 1px 3px rgba(0,0,0,0.4)",
      }}
    >
      <AnimatedLogoMark size={size} />
    </span>
  );
}
