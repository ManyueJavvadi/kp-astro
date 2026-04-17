import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  [
    "w-full bg-bg-surface-2 border border-border rounded-md",
    "text-text-primary placeholder:text-text-muted",
    "transition-colors duration-[150ms]",
    "focus:outline-none focus:border-border-accent focus:ring-1 focus:ring-gold",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      size: {
        sm: "h-8 px-3 text-small",
        md: "h-10 px-3.5 text-body",
        lg: "h-12 px-4 text-body-lg",
      },
      invalid: {
        true: "border-error focus:border-error focus:ring-error",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, invalid, leftIcon, rightIcon, ...props }, ref) => {
    if (leftIcon || rightIcon) {
      return (
        <div className="relative w-full">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none [&_svg]:size-4">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              inputVariants({ size, invalid }),
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted [&_svg]:size-4">
              {rightIcon}
            </div>
          )}
        </div>
      );
    }
    return (
      <input
        ref={ref}
        className={cn(inputVariants({ size, invalid, className }))}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full bg-bg-surface-2 border border-border rounded-md",
        "text-text-primary placeholder:text-text-muted text-body",
        "px-3.5 py-2.5 resize-y min-h-[80px]",
        "transition-colors duration-[150ms]",
        "focus:outline-none focus:border-border-accent focus:ring-1 focus:ring-gold",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid && "border-error focus:border-error focus:ring-error",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Input, Textarea, inputVariants };
