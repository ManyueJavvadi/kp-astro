"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  Settings,
  Search,
  Sparkles,
  ChevronDown,
  Wand2,
  Target,
  Calendar,
  CalendarRange,
  HeartHandshake,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";

const nav = [
  { label: "Dashboard", href: "/pro", icon: LayoutDashboard },
  { label: "Clients", href: "/pro/clients", icon: Users, count: 87 },
  {
    label: "Tools",
    icon: Wrench,
    children: [
      { label: "Horary · Prashna", href: "/pro/tools/horary", icon: Wand2 },
      { label: "Muhurtha", href: "/pro/tools/muhurtha", icon: Target },
      { label: "Transit · Gochar", href: "/pro/tools/transit", icon: TrendingUp },
      { label: "Panchang", href: "/pro/tools/panchang", icon: Calendar },
      { label: "Kundli Match", href: "/pro/tools/match", icon: HeartHandshake },
    ],
  },
  { label: "Reports", href: "/pro/reports", icon: FileText, count: 12 },
  { label: "Settings", href: "/pro/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = React.useState(true);

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 border-r border-border bg-bg-surface flex flex-col">
      {/* Brand */}
      <div className="h-14 border-b border-border flex items-center gap-2.5 px-4">
        <div className="size-7 rounded-md bg-gradient-to-br from-gold to-gold-dim flex items-center justify-center font-display text-bg-primary text-base font-bold">
          ♎
        </div>
        <div className="font-semibold tracking-tight text-small">
          <span className="text-text-primary">DevAstro</span>
          <span className="text-gold">AI</span>
        </div>
        <div className="ml-auto">
          <Kbd>⌘K</Kbd>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-bg-surface-2 border border-border hover:border-border-strong text-text-muted text-small transition-colors">
          <Search className="size-3.5" />
          <span>Search clients…</span>
          <span className="ml-auto flex gap-0.5">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
        {nav.map((item) => {
          if ("children" in item && item.children) {
            const hasActive = item.children.some((c) => pathname === c.href);
            const Icon = item.icon;
            return (
              <div key={item.label}>
                <button
                  onClick={() => setToolsOpen((v) => !v)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-small transition-colors",
                    hasActive
                      ? "text-text-primary"
                      : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                  <ChevronDown
                    className={cn(
                      "size-3.5 ml-auto transition-transform",
                      toolsOpen && "rotate-180"
                    )}
                  />
                </button>
                {toolsOpen && (
                  <div className="mt-0.5 mb-1 ml-3 pl-3 border-l border-border flex flex-col gap-0.5">
                    {item.children.map((sub) => {
                      const SubIcon = sub.icon;
                      const active = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-small transition-colors",
                            active
                              ? "bg-gold-glow text-gold border border-border-accent"
                              : "text-text-muted hover:bg-bg-hover hover:text-text-primary"
                          )}
                        >
                          <SubIcon className="size-3.5" />
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-small transition-colors",
                active
                  ? "bg-gold-glow text-gold border border-border-accent"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
              {"count" in item && item.count !== undefined && (
                <span
                  className={cn(
                    "ml-auto text-tiny px-1.5 py-0.5 rounded-sm font-mono",
                    active
                      ? "bg-bg-surface text-gold"
                      : "bg-bg-surface-2 text-text-muted"
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* AI banner */}
      <div className="p-3 border-t border-border">
        <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--color-ai)_8%,transparent)] border border-[color-mix(in_srgb,var(--color-ai)_25%,transparent)]">
          <div className="text-tiny uppercase tracking-wider text-ai flex items-center gap-1.5 mb-1">
            <Sparkles className="size-3" /> DAILY BRIEFING
          </div>
          <div className="text-small text-text-primary leading-snug">
            3 predictions due this week
          </div>
          <div className="text-tiny text-text-muted mt-1">Click to review</div>
        </div>
      </div>

      {/* User */}
      <div className="p-3 border-t border-border flex items-center gap-2.5">
        <div className="size-8 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-small font-semibold text-gold shrink-0">
          M
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-small font-medium text-text-primary truncate">
            Manyue Javvadi
          </div>
          <div className="text-tiny text-text-muted">Astrologer Pro</div>
        </div>
        <ChevronDown className="size-3.5 text-text-muted" />
      </div>
    </aside>
  );
}
