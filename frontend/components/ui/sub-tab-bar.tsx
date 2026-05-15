import * as React from "react";
import { theme } from "@/lib/theme";

/**
 * Phase 1 / PR 2 — single canonical sub-tab bar.
 *
 * The product currently has near-identical horizontal pill rows on:
 *   - Houses sub-tabs (Overview / Cusps / Significators / Ruling / Panchangam)
 *   - Dasha sub-tabs (Overview / Planets / KP Rule)
 *   - Dasha → Today's transits sub-tabs (same again)
 *   - Match sub-tabs (post-verdict views)
 *   - Analysis topic chips (slightly different — chip grid not bar)
 *
 * Every one is "horizontal pills with gold active state". The shapes
 * drift a few px. Build it once, replace gradually in Phase 2-5.
 *
 * Each tab can carry an optional `count` (badge) and `dot` (unread/new
 * marker), and the bar can be rendered with `variant: "underline"`
 * (the tab-bar-style) or `"pill"` (the chip-style) — both already
 * appear in the codebase.
 */
export type SubTab = {
  id: string;
  label: string;
  count?: number;
  /** Tiny coloured dot — for "new" / "needs attention" markers. */
  dot?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export function SubTabBar({
  tabs,
  active,
  onChange,
  variant = "pill",
  ariaLabel = "Sub navigation",
}: {
  tabs: SubTab[];
  active: string;
  onChange: (id: string) => void;
  variant?: "pill" | "underline";
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: "flex",
        gap: variant === "pill" ? 6 : 4,
        flexWrap: "wrap",
        alignItems: "center",
        padding: variant === "underline" ? "0" : "4px",
        borderBottom: variant === "underline" ? theme.border.default : "none",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const baseStyle: React.CSSProperties = {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: variant === "pill" ? 30 : 36,
          padding: variant === "pill" ? "0 12px" : "0 14px",
          fontSize: 12.5,
          fontWeight: 500,
          letterSpacing: "0.01em",
          cursor: tab.disabled ? "not-allowed" : "pointer",
          opacity: tab.disabled ? 0.5 : 1,
          transition: "color 140ms ease, background 140ms ease, border-color 140ms ease",
          border: "none",
          background: "transparent",
          color: theme.text.secondary,
          position: "relative",
        };

        const pillActive: React.CSSProperties = isActive
          ? {
              background: "rgba(201,169,110,0.12)",
              color: theme.gold,
              borderRadius: 999,
              border: `1px solid rgba(201,169,110,0.4)`,
            }
          : {
              borderRadius: 999,
              border: `1px solid transparent`,
            };

        const underlineActive: React.CSSProperties = isActive
          ? {
              color: theme.text.primary,
              borderBottom: `2px solid ${theme.gold}`,
              borderRadius: 0,
            }
          : {
              borderBottom: "2px solid transparent",
              borderRadius: 0,
            };

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-disabled={tab.disabled}
            onClick={tab.disabled ? undefined : () => onChange(tab.id)}
            style={{
              ...baseStyle,
              ...(variant === "pill" ? pillActive : underlineActive),
            }}
          >
            {tab.icon ? (
              <span style={{ display: "inline-flex", alignItems: "center" }}>{tab.icon}</span>
            ) : null}
            <span>{tab.label}</span>
            {tab.count != null ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: isActive ? "rgba(201,169,110,0.2)" : "rgba(255,255,255,0.08)",
                  color: isActive ? theme.goldBright : theme.text.secondary,
                  letterSpacing: 0,
                }}
              >
                {tab.count}
              </span>
            ) : null}
            {tab.dot ? (
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: theme.gold,
                  display: "inline-block",
                }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
