import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Keyboard shortcut hint chip (e.g. "⌘K", "Enter", "Esc").
 * Designed to sit inline or at end of menu items / help text.
 */
const Kbd = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, children, ...props }, ref) => (
  <kbd
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center",
      "min-w-[20px] h-5 px-1.5",
      "font-mono text-[10px] font-medium",
      "text-text-muted bg-bg-surface-2 border border-border-strong",
      "rounded-[4px]",
      className
    )}
    {...props}
  >
    {children}
  </kbd>
));
Kbd.displayName = "Kbd";

export { Kbd };
