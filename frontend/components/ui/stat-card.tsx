import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Canonical KPI / stat tile. One composable element with strict spacing.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "default",
  className,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "default" | "gold" | "success" | "warning" | "error" | "ai";
  className?: string;
  trend?: "up" | "down" | null;
}) {
  const accentColor =
    accent === "gold"
      ? "text-gold"
      : accent === "success"
      ? "text-success"
      : accent === "warning"
      ? "text-warning"
      : accent === "error"
      ? "text-error"
      : accent === "ai"
      ? "text-ai"
      : "text-text-muted";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-bg-surface border border-border p-5",
        "transition-all duration-200 hover:border-border-strong",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "size-9 rounded-lg flex items-center justify-center [&>svg]:size-[18px]",
            accent === "gold" && "bg-gold/10 text-gold",
            accent === "success" && "bg-success/10 text-success",
            accent === "warning" && "bg-warning/10 text-warning",
            accent === "error" && "bg-error/10 text-error",
            accent === "ai" && "bg-ai/10 text-ai",
            accent === "default" && "bg-bg-surface-2 text-text-muted"
          )}
        >
          {icon}
        </div>
        <div className="text-[10px] uppercase tracking-[0.1em] text-text-muted font-medium">
          {label}
        </div>
      </div>
      <div
        className={cn(
          "font-display text-[2rem] leading-none font-bold tracking-tight",
          accentColor === "text-text-muted" ? "text-text-primary" : accentColor
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-text-muted mt-2 flex items-center gap-1">
          {trend === "up" && <span className="text-success">↑</span>}
          {trend === "down" && <span className="text-error">↓</span>}
          {hint}
        </div>
      )}
    </div>
  );
}
