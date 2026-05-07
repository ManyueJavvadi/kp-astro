import * as React from "react";
import { Loader2 } from "lucide-react";
import { theme } from "@/lib/theme";

/**
 * Phase 1 / PR 2 — single canonical loading state.
 *
 * Replaces ad-hoc spinners across page.tsx ("Detecting location…",
 * "Calculating planetary positions…", inline `…` strings, etc.).
 * Every loader in the product should render through this component
 * so the spin animation, copy weight, and color are consistent.
 *
 * Spin animation lives in globals.css (`@keyframes kp-spin`) so this
 * component stays SSR-clean (no styled-jsx).
 *
 * Usage:
 *   <Loader />                                  // bare spinner
 *   <Loader label="Calculating positions…" />   // spinner + caption
 *   <Loader label="Detecting location…" subtle />  // smaller, in-flow
 */
export function Loader({
  label,
  subtle = false,
  style,
}: {
  label?: string;
  subtle?: boolean;
  style?: React.CSSProperties;
}) {
  const size = subtle ? 14 : 18;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        color: subtle ? theme.text.muted : theme.text.secondary,
        fontSize: subtle ? 12 : 13,
        fontWeight: 400,
        ...style,
      }}
    >
      <Loader2 size={size} className="kp-spin" style={{ color: theme.gold }} />
      {label ? <span>{label}</span> : null}
    </div>
  );
}
