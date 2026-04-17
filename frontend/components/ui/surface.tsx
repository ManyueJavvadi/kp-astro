import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Surface — canonical block container. Replaces every hand-rolled rounded-xl box.
 * Consistent padding, border radius, and border across the app.
 */
export function Surface({
  children,
  className,
  glow,
  ai,
  padding = "md",
  hover,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  ai?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-bg-surface border transition-colors",
        glow && "border-gold/40 shadow-[0_0_24px_rgba(201,169,110,0.12)]",
        ai && "border-ai/35 bg-ai/5",
        !glow && !ai && "border-border-strong",
        hover && "hover:border-border-accent",
        padding === "sm" && "p-3",
        padding === "md" && "p-5",
        padding === "lg" && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * SurfaceHeader — the title row inside a Surface.
 */
export function SurfaceHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 mb-4", className)}>
      <div>
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-[0.1em] text-text-muted font-medium mb-1">
            {eyebrow}
          </div>
        )}
        <div className="text-[15px] font-semibold text-text-primary">{title}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Divider — tight horizontal rule.
 */
export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-border", className)} />;
}
