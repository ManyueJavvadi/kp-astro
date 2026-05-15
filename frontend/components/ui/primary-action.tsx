import * as React from "react";
import { theme } from "@/lib/theme";
import { Loader2 } from "lucide-react";

/**
 * Phase 1 / PR 2 — single canonical primary-action button.
 *
 * Replaces the eight slightly-different gold CTAs across the app:
 *   "Find auspicious windows", "Compute compatibility", "Compute verdict",
 *   "Pick dates →", "Generate chart →", "Refresh", etc.
 *
 * The point is consistency, not customization. Three variants only:
 *   primary   — full-width gold gradient, the page's most-important action
 *   secondary — bordered ghost, supporting actions
 *   subtle    — text-only with hover bg, for de-emphasized commands
 *
 * Loading state shows a small spinner inline; disabled state respects
 * the disabledHint so users always know WHY a CTA is greyed out
 * (this fixes the "Compute compatibility" silent-disable confusion).
 *
 * Hover/active styles + spin keyframes live in globals.css (`.kp-pa-btn`,
 * `.kp-spin`) so this component is SSR-clean (no styled-jsx).
 */
export type PrimaryActionVariant = "primary" | "secondary" | "subtle";

export function PrimaryAction({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  loading = false,
  disabledHint,
  fullWidth = false,
  type = "button",
  iconRight,
  iconLeft,
  style,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: PrimaryActionVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Shown beneath the button when `disabled` is true — explains why. */
  disabledHint?: string;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  iconRight?: React.ReactNode;
  iconLeft?: React.ReactNode;
  style?: React.CSSProperties;
  ariaLabel?: string;
}) {
  const isDisabled = disabled || loading;

  const baseStyle: React.CSSProperties = {
    display: fullWidth ? "flex" : "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    padding: "0 18px",
    width: fullWidth ? "100%" : "auto",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.01em",
    cursor: isDisabled ? "not-allowed" : "pointer",
    transition: "transform 120ms ease, opacity 120ms ease, box-shadow 200ms ease",
    opacity: isDisabled ? 0.55 : 1,
    border: "none",
  };

  const variantStyle: React.CSSProperties =
    variant === "primary"
      ? {
          background: `linear-gradient(135deg, ${theme.goldBright} 0%, ${theme.gold} 100%)`,
          color: "#0c0a06",
          boxShadow: isDisabled
            ? "none"
            : "0 6px 20px rgba(201,169,110,0.18)",
        }
      : variant === "secondary"
      ? {
          background: "rgba(255,255,255,0.04)",
          border: theme.border.medium,
          color: theme.text.primary,
        }
      : {
          background: "transparent",
          color: theme.text.secondary,
        };

  return (
    <div
      style={{
        display: fullWidth ? "block" : "inline-block",
        width: fullWidth ? "100%" : "auto",
      }}
    >
      <button
        type={type}
        onClick={isDisabled ? undefined : onClick}
        aria-disabled={isDisabled}
        aria-label={ariaLabel}
        className="kp-pa-btn"
        style={{ ...baseStyle, ...variantStyle, ...style }}
      >
        {loading ? (
          <Loader2 size={16} className="kp-spin" />
        ) : (
          iconLeft ?? null
        )}
        <span>{children}</span>
        {!loading && iconRight ? iconRight : null}
      </button>
      {isDisabled && disabledHint ? (
        <div
          style={{
            fontSize: 11,
            color: theme.text.muted,
            textAlign: "center",
            marginTop: 6,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {disabledHint}
        </div>
      ) : null}
    </div>
  );
}
