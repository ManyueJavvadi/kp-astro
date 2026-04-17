"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageCircle,
  Calendar,
  HeartHandshake,
  Users,
  FileText,
  Menu,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "My Chart", href: "/app/chart", icon: FileText },
  { label: "Ask AI", href: "/app/chat", icon: MessageCircle },
  { label: "Family", href: "/app/family", icon: Users },
  { label: "Panchang", href: "/app/panchang", icon: Calendar },
  { label: "Match", href: "/app/match", icon: HeartHandshake },
];

export default function ConsumerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans">
      <header className="sticky top-0 z-40 bg-bg-primary/85 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Link href="/app" className="flex items-center gap-2.5 shrink-0">
              <div className="size-8 rounded-md bg-gradient-to-br from-gold to-gold-dim flex items-center justify-center font-display text-bg-primary text-lg font-bold">
                ♎
              </div>
              <div className="font-semibold tracking-tight">
                <span className="text-text-primary">DevAstro</span>
                <span className="text-gold">AI</span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {nav.map((n) => {
                const active = pathname === n.href;
                const Icon = n.icon;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-small font-medium flex items-center gap-2 transition-colors",
                      active
                        ? "bg-gold-glow text-gold"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    )}
                  >
                    <Icon className="size-3.5" />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button className="size-9 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors relative">
              <Bell className="size-4" />
              <div className="absolute top-2 right-2 size-1.5 rounded-full bg-gold" />
            </button>
            <div className="size-9 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-small font-semibold text-gold">
              R
            </div>
            <button className="md:hidden size-9 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary">
              <Menu className="size-4" />
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
