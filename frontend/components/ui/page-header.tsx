import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Canonical page header. One per page.
 * Eyebrow + title + description on the left, action slot on the right.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-6 flex-wrap pb-8",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.12em] text-gold font-semibold mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] font-semibold text-text-primary tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-small text-text-muted max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/**
 * Section header — used inside pages to separate groupings.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-4", className)}>
      <div>
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.1em] text-text-muted font-medium mb-1">
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-lg leading-tight font-semibold text-text-primary">
          {title}
        </h2>
        {description && (
          <p className="text-small text-text-muted mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
