"use client";

/**
 * 3-state language toggle pill. Lives in the /app top bar so every
 * workspace screen can flip between EN / TEL+EN / TEL with one click.
 *
 * Visual: compact segmented control, gold-active / ghost-inactive.
 * Width is tight (~150px) so it doesn't fight the "Back to landing"
 * button for space.
 */

import { useLanguage, type Lang } from "@/lib/i18n";

const OPTIONS: { v: Lang; label: string; hint: string }[] = [
  { v: "en",    label: "EN",       hint: "English only" },
  { v: "te_en", label: "TEL · EN", hint: "Bilingual (default)" },
  { v: "te",    label: "TEL",      hint: "Telugu primary" },
];

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div
      role="radiogroup"
      aria-label="Language"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 2,
        borderRadius: 8,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {OPTIONS.map((o) => {
        const active = lang === o.v;
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.hint}
            onClick={() => setLang(o.v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 26,
              padding: "0 10px",
              borderRadius: 6,
              background: active ? "rgba(201,169,110,0.14)" : "transparent",
              color: active ? "#c9a96e" : "#8b8e99",
              fontSize: 11,
              fontWeight: active ? 600 : 500,
              letterSpacing: "0.02em",
              border: active ? "1px solid rgba(201,169,110,0.35)" : "1px solid transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              transition: "color 120ms, background 120ms, border-color 120ms",
            }}
            onMouseEnter={(e) => {
              if (active) return;
              e.currentTarget.style.color = "#c9a96e";
            }}
            onMouseLeave={(e) => {
              if (active) return;
              e.currentTarget.style.color = "#8b8e99";
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
