/**
 * DevAstroAI brand mark — Scorpio ♏ glyph on a gold gradient tile.
 * Single source of truth. Use everywhere the brand appears.
 */

import type { CSSProperties } from "react";
import { theme } from "@/lib/theme";

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

  const fontSize = wordmarkSize ?? Math.round(size * 0.5 + 0);
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

/** Just the glyph tile — no wordmark, no wrapper. */
export function LogoMark({
  size = 32,
  glow = true,
}: {
  size?: number;
  glow?: boolean;
}) {
  const radius = Math.max(6, Math.round(size * 0.24));
  const glyphPx = Math.round(size * 0.7);

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
        borderRadius: radius,
        flexShrink: 0,
        background:
          "linear-gradient(135deg, #e7c98a 0%, #c9a96e 45%, #8b7a50 100%)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: glow
          ? [
              "inset 0 1px 0 rgba(255,255,255,0.35)",
              "inset 0 -1px 0 rgba(0,0,0,0.25)",
              "0 0 0 1px rgba(201,169,110,0.25)",
              "0 0 10px rgba(201,169,110,0.38)",
              "0 2px 6px rgba(0,0,0,0.3)",
            ].join(", ")
          : [
              "inset 0 1px 0 rgba(255,255,255,0.3)",
              "inset 0 -1px 0 rgba(0,0,0,0.2)",
            ].join(", "),
      }}
    >
      {/* Inner bevel highlight (top-left sheen) */}
      <span
        style={{
          position: "absolute",
          inset: 1,
          borderRadius: radius - 1,
          background:
            "radial-gradient(ellipse at 28% 18%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 55%)",
          pointerEvents: "none",
        }}
      />
      {/*
        Scorpio glyph drawn as SVG. Font-based rendering isn't reliable across
        OSes — Windows/Chrome ignores VS15 for ♏ and either shows color emoji
        (purple) or picks a broken glyph slot (circle-i). SVG is guaranteed
        identical everywhere.
      */}
      <ScorpioGlyph px={glyphPx} />
    </span>
  );
}

/**
 * Scorpio ♏ — three connected humps ending in an upward-flicking arrow tail.
 * Drawn as a single continuous path on a 32×32 grid, then styled engraved
 * (dark bronze stroke with a warm bottom highlight).
 */
function ScorpioGlyph({ px }: { px: number }) {
  // Proper Scorpio ♏:
  //   - Three equal humps (m-shape) formed by stems + two arches at the top.
  //   - The rightmost stem extends slightly below the others.
  //   - A hooked tail curves out-right and UP, ending in a stinger
  //     (arrowhead pointing up).
  //
  // viewBox 0..28. Baseline ≈ y=19. Arch top ≈ y=11.
  const body =
    // left stem + arch 1 + middle stem
    "M 4 19 V 11 A 3 3 0 0 1 10 11 V 19 " +
    // arch 2 + right stem (extends to y=20)
    "M 10 11 A 3 3 0 0 1 16 11 V 20 " +
    // tail — cubic that swings out-right then curls UP to (22, 13.5)
    "M 16 20 C 20.5 23, 24.5 22, 22 13.5";

  // Arrowhead = up-pointing caret (^), apex at the tail tip (22, 13.5).
  const arrow = "M 20 15.8 L 22 13.5 L 24 15.8";

  return (
    <svg
      viewBox="0 0 28 28"
      width={px}
      height={px}
      style={{ position: "relative", display: "block", overflow: "visible" }}
      aria-hidden
    >
      {/* warm bottom highlight (sheen), sits 0.8px below main stroke */}
      <g
        transform="translate(0,0.8)"
        fill="none"
        stroke="rgba(255,240,200,0.4)"
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={body} />
        <path d={arrow} />
      </g>
      {/* main engraved bronze stroke */}
      <g
        fill="none"
        stroke="#2a1d08"
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={body} />
        <path d={arrow} />
      </g>
    </svg>
  );
}
