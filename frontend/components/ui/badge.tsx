import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium whitespace-nowrap transition-colors [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-bg-surface-2 text-text-secondary border border-border",
        gold: "bg-gold-glow text-gold border border-border-accent",
        ai: "bg-[color-mix(in_srgb,var(--color-ai)_15%,transparent)] text-ai border border-[color-mix(in_srgb,var(--color-ai)_30%,transparent)]",
        success: "bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-success border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)]",
        warning: "bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)] text-warning border border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)]",
        error: "bg-[color-mix(in_srgb,var(--color-error)_15%,transparent)] text-error border border-[color-mix(in_srgb,var(--color-error)_30%,transparent)]",
        info: "bg-[color-mix(in_srgb,var(--color-info)_15%,transparent)] text-info border border-[color-mix(in_srgb,var(--color-info)_30%,transparent)]",
        outline: "bg-transparent text-text-secondary border border-border-strong",
      },
      size: {
        sm: "h-5 px-2 text-tiny rounded-sm",
        md: "h-6 px-2.5 text-tiny rounded-md",
        lg: "h-7 px-3 text-small rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
