"use client";

/**
 * SectionEyebrow — small bilingual section-header primitive.
 *
 * PR R1 (Phase A refactor) — extracted from page.tsx (was defined inline
 * at line 8554). Used by ChartTab + future extracted tabs.
 *
 * Language-aware:
 *   EN mode     → English primary, Telugu dropped
 *   TE mode     → Telugu primary, English dropped
 *   TE+EN mode  → Telugu primary + English subtitle (the default)
 */

import { useLanguage } from "@/lib/i18n";

interface SectionEyebrowProps {
  te: string;
  en?: string;
  noMarginBottom?: boolean;
}

export function SectionEyebrow({ te, en, noMarginBottom }: SectionEyebrowProps) {
  const { lang } = useLanguage();
  const primary = lang === "en" ? (en ?? te) : te;
  const showSubtitle = lang === "te_en" && en;
  return (
    <div style={{ marginBottom: noMarginBottom ? 0 : 10 }}>
      <div
        style={{
          fontSize: 11,
          color: "#c9a96e",
          letterSpacing: "0.08em",
          fontWeight: 600,
          lineHeight: 1.3,
        }}
      >
        {primary}
      </div>
      {showSubtitle && (
        <div
          style={{
            fontSize: 9,
            color: "var(--muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            fontWeight: 500,
            marginTop: 2,
          }}
        >
          {en}
        </div>
      )}
    </div>
  );
}
