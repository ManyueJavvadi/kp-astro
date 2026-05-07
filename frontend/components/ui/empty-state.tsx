import * as React from "react";
import { theme } from "@/lib/theme";

/**
 * Phase 1 / PR 2 — single canonical empty-state component.
 *
 * Replaces the patchwork on Match ("Enter new partner details" → bare
 * gray button) / Muhurtha ("No strong muhurtha windows in this range.
 * Try a longer range or different dates." → centered text only) /
 * Horary ("TYPE A QUESTION FIRST" → tiny caps under disabled CTA).
 *
 * Shape: optional icon → headline → subcopy → optional CTA, vertically
 * stacked, centered, generous padding so it reads as a deliberate
 * "nothing here yet" surface and not a layout glitch.
 *
 * Usage:
 *   <EmptyState
 *     headline="No strong muhurtha windows in this range"
 *     subcopy="Try a longer range or different dates."
 *     cta={{ label: "Search different dates", onClick: () => ... }}
 *   />
 */
type CtaSpec = { label: string; onClick: () => void };

function isCtaSpec(value: unknown): value is CtaSpec {
  return (
    typeof value === "object" &&
    value !== null &&
    "label" in value &&
    "onClick" in value &&
    typeof (value as { label: unknown }).label === "string" &&
    typeof (value as { onClick: unknown }).onClick === "function"
  );
}

export function EmptyState({
  icon,
  headline,
  subcopy,
  cta,
  align = "center",
  compact = false,
}: {
  icon?: React.ReactNode;
  headline: string;
  subcopy?: string;
  /**
   * Either a render-spec `{ label, onClick }` (we render a default
   * ghost button) or any custom React node (e.g. `<PrimaryAction>`)
   * if the caller wants full control.
   */
  cta?: CtaSpec | React.ReactNode;
  align?: "center" | "start";
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align === "center" ? "center" : "left",
        gap: compact ? 6 : 10,
        padding: compact ? "20px 16px" : "32px 20px",
        color: theme.text.secondary,
      }}
    >
      {icon ? (
        <div style={{ color: theme.text.muted, marginBottom: 4 }}>{icon}</div>
      ) : null}
      <div
        style={{
          fontSize: compact ? 13 : 14,
          fontWeight: 500,
          color: theme.text.primary,
          lineHeight: 1.4,
        }}
      >
        {headline}
      </div>
      {subcopy ? (
        <div
          style={{
            fontSize: 12,
            color: theme.text.muted,
            lineHeight: 1.5,
            maxWidth: 420,
          }}
        >
          {subcopy}
        </div>
      ) : null}
      {cta ? (
        <div style={{ marginTop: compact ? 8 : 14 }}>
          {isCtaSpec(cta) ? (
            <button
              type="button"
              onClick={cta.onClick}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 32,
                padding: "0 14px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: theme.border.medium,
                color: theme.text.primary,
                borderRadius: theme.radius.sm,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {cta.label}
            </button>
          ) : (
            (cta as React.ReactNode)
          )}
        </div>
      ) : null}
    </div>
  );
}
