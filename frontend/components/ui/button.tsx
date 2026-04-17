"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-medium whitespace-nowrap",
    "transition-all duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "[&_svg]:shrink-0 [&_svg]:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-gold text-bg-primary",
          "hover:bg-gold-bright hover:-translate-y-px hover:shadow-md",
          "active:translate-y-0",
        ],
        secondary: [
          "bg-bg-surface-2 text-text-primary border border-border-strong",
          "hover:bg-bg-hover hover:border-border-accent",
        ],
        ghost: [
          "text-text-secondary",
          "hover:bg-bg-hover hover:text-text-primary",
        ],
        danger: [
          "bg-error text-bg-primary",
          "hover:brightness-110 hover:-translate-y-px",
        ],
        ai: [
          "bg-ai text-bg-primary",
          "hover:bg-ai-bright hover:-translate-y-px hover:shadow-[var(--shadow-ai)]",
        ],
        outline: [
          "border border-border-strong bg-transparent text-text-primary",
          "hover:bg-bg-hover hover:border-border-accent",
        ],
      },
      size: {
        sm: "h-8 px-3 text-small rounded-md [&_svg]:size-3.5",
        md: "h-10 px-4 text-body rounded-md [&_svg]:size-4",
        lg: "h-12 px-6 text-body-lg rounded-lg [&_svg]:size-5",
        icon: "size-10 rounded-md [&_svg]:size-4",
        "icon-sm": "size-8 rounded-md [&_svg]:size-3.5",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
