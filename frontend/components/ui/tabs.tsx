"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: "underline" | "pills" | "segmented";
  }
>(({ className, variant = "underline", ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1",
      variant === "underline" && "border-b border-border",
      variant === "segmented" &&
        "p-1 bg-bg-surface-2 rounded-md border border-border",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    variant?: "underline" | "pills" | "segmented";
  }
>(({ className, variant = "underline", ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center gap-2 px-3 py-2 text-body font-medium",
      "text-text-muted transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
      "disabled:pointer-events-none disabled:opacity-50",
      "[&_svg]:size-4 [&_svg]:shrink-0",
      variant === "underline" && [
        "relative -mb-px border-b-2 border-transparent",
        "hover:text-text-primary",
        "data-[state=active]:text-gold data-[state=active]:border-gold",
      ],
      variant === "pills" && [
        "rounded-md",
        "hover:bg-bg-hover hover:text-text-primary",
        "data-[state=active]:bg-gold-glow data-[state=active]:text-gold",
      ],
      variant === "segmented" && [
        "rounded-sm",
        "hover:text-text-primary",
        "data-[state=active]:bg-bg-elevated data-[state=active]:text-text-primary data-[state=active]:shadow-sm",
      ],
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 focus-visible:outline-none",
      "data-[state=active]:animate-in data-[state=active]:fade-in-50",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
