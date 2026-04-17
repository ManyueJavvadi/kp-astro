"use client";

import * as React from "react";
import { X, Plus, HelpCircle, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";

interface ClientTab {
  id: string;
  name: string;
  initial: string;
  pending?: number;
}

interface TopBarProps {
  /** Page-level breadcrumb / title shown above tabs. */
  title?: string;
  /** Open client tabs (mocked for now). */
  tabs?: ClientTab[];
  /** Active tab id. */
  activeTab?: string;
}

const defaultTabs: ClientTab[] = [
  { id: "ravi", name: "Ravi Kumar", initial: "R", pending: 3 },
  { id: "priya", name: "Priya Sharma", initial: "P" },
  { id: "mohan", name: "Mohan Reddy", initial: "M", pending: 1 },
];

export function TopBar({
  title = "Dashboard",
  tabs = defaultTabs,
  activeTab,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 bg-bg-primary/80 backdrop-blur-md border-b border-border">
      {/* Client tabs row */}
      <div className="h-9 flex items-end gap-0.5 px-3 pt-1.5 border-b border-border">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <div
              key={tab.id}
              className={cn(
                "h-full px-3 flex items-center gap-2 rounded-t-md border-t border-x text-tiny cursor-pointer transition-colors",
                active
                  ? "bg-bg-surface border-border-strong text-text-primary"
                  : "bg-bg-surface-2/50 border-border text-text-muted hover:text-text-secondary hover:bg-bg-surface-2"
              )}
            >
              <div
                className={cn(
                  "size-5 rounded-full flex items-center justify-center text-[9px] font-semibold",
                  active
                    ? "bg-gold-glow border border-border-accent text-gold"
                    : "bg-bg-elevated text-text-muted"
                )}
              >
                {tab.initial}
              </div>
              <span className="font-medium">{tab.name}</span>
              {tab.pending && tab.pending > 0 && (
                <span className="text-[9px] px-1 rounded-sm bg-warning/15 text-warning">
                  {tab.pending}
                </span>
              )}
              <X className="size-3 opacity-0 hover:opacity-60 transition-opacity" />
            </div>
          );
        })}
        <button className="h-full px-2 text-text-muted hover:text-text-primary transition-colors">
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* Title + actions row */}
      <div className="h-14 flex items-center justify-between px-6">
        <div>
          <div className="text-tiny uppercase tracking-wider text-text-muted mb-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <h1 className="text-h3 font-display font-semibold text-text-primary">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button className="size-9 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
            <HelpCircle className="size-4" />
          </button>
          <button className="size-9 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors relative">
            <Bell className="size-4" />
            <div className="absolute top-2 right-2 size-1.5 rounded-full bg-gold" />
          </button>
          <div className="ml-2 flex items-center gap-1.5 text-tiny text-text-muted">
            <Kbd>?</Kbd>
            <span>shortcuts</span>
          </div>
        </div>
      </div>
    </header>
  );
}
