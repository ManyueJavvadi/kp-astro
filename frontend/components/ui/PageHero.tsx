// Phase 15.2 — Track A Hero primitive.
//
// <PageHero> is the canonical top-of-tab header for every screen in the
// app. It enforces the Track A quality bar from CLAUDE.md:
//   - Gold eyebrow (tiny uppercase, letter-spaced)
//   - DM Serif Display title (large, italic-optional)
//   - Muted explainer subcopy
//   - MaskReveal entrance on the title (gold sweep)
//   - FadeIn entrance on eyebrow + subcopy (stagger)
//
// Why a primitive instead of inline JSX:
//   - The Track A bar is meant to be ENFORCED across every tab. A wrapper
//     means a tab can't accidentally ship without the hero.
//   - Single source of truth for type sizes, line heights, spacing,
//     entrance timing -- editing this file shifts the entire hero
//     language consistently across the app.
//
// Visual spec (matches Track A):
//   eyebrow:  10px gold, 0.1em letter-spacing, uppercase, fontWeight 500
//   title:    30px serif on desktop, 24px on mobile, line-height 1.2
//   subcopy:  13px muted, line-height 1.5, max-width 540px for readability
//   spacing:  eyebrow → title 8px, title → subcopy 12px, hero → content 28px
//
// Animation choreography (~700ms total):
//   t=0     eyebrow fades up
//   t=120   title mask-sweeps right (revealing the serif)
//   t=420   subcopy fades up
//
// Usage:
//   <PageHero
//     eyebrow="Vimshottari · 120 Years"
//     title="The Periods of Your Life"
//     subcopy="Major, sub, and micro periods of planetary rulership."
//   />
//
// Or with Telugu (bilingual via useLanguage()):
//   <PageHero
//     eyebrow={t("Houses · 12 Bhavas", "భావములు · 12 భావాలు")}
//     title={t("House by House", "ఇంటిని ఇంటిగా")}
//     subcopy={t("Each house signifies a domain of life.", "...")}
//   />

"use client";

import React from "react";
import { FadeIn, MaskReveal } from "@/components/motion";
import { theme } from "@/lib/theme";

interface PageHeroProps {
  /** Short gold uppercase tag above the title. ~3-6 words. */
  eyebrow: React.ReactNode;
  /** The serif headline. Word-by-word brevity reads best. */
  title: React.ReactNode;
  /** Plain-English explanation under the title. ~1-2 sentences. */
  subcopy?: React.ReactNode;
  /** Optional right-side slot (e.g., language pill, info button). */
  rightSlot?: React.ReactNode;
  /** Margin-bottom override. Default 28px (matches design spec). */
  bottomGap?: number;
  /** Make the serif title italic. Default false. */
  italic?: boolean;
  /** Override the mask sweep color. Default = gold. */
  maskColor?: string;
}

export function PageHero({
  eyebrow,
  title,
  subcopy,
  rightSlot,
  bottomGap = 28,
  italic = false,
  maskColor,
}: PageHeroProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 24,
        marginBottom: bottomGap,
        // Allow the hero to wrap on narrow viewports.
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        {/* Eyebrow — tiny gold uppercase */}
        <FadeIn distance="nudge" duration="fast" as="div">
          <div
            style={{
              fontSize: 10,
              color: theme.gold,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontWeight: 500,
              marginBottom: 8,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {eyebrow}
          </div>
        </FadeIn>

        {/* Title — serif with gold mask sweep. The .page-hero-title
            class hook lets globals.css attach the kolam flourish for
            Telugu mode (Phase 16 / Moment #6). */}
        <h1
          className="page-hero-title"
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontStyle: italic ? "italic" : "normal",
            fontWeight: 400,
            fontSize: "clamp(24px, 4vw, 30px)",
            lineHeight: 1.2,
            color: theme.text.primary,
            margin: 0,
            // Allow MaskReveal's inline-block to flow correctly.
            display: "inline-block",
            // Slight letter-spacing tightens serif at large sizes.
            letterSpacing: "-0.01em",
          }}
        >
          <MaskReveal
            color={maskColor ?? theme.gold}
            direction="right"
            duration="slow"
            delay={0.12}
            ease="emphasized"
          >
            {title}
          </MaskReveal>
        </h1>

        {/* Subcopy — muted explainer */}
        {subcopy && (
          <FadeIn distance="small" duration="base" delay={0.42}>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                lineHeight: 1.55,
                color: theme.text.secondary,
                margin: "12px 0 0",
                maxWidth: 540,
              }}
            >
              {subcopy}
            </p>
          </FadeIn>
        )}
      </div>

      {/* Optional right slot (language pill, info badge, etc.) */}
      {rightSlot && (
        <FadeIn distance="small" duration="base" delay={0.32}>
          <div style={{ flex: "0 0 auto" }}>{rightSlot}</div>
        </FadeIn>
      )}
    </header>
  );
}
