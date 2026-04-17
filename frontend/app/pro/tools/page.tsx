"use client";

import Link from "next/link";
import {
  Wand2,
  Target,
  TrendingUp,
  Calendar,
  HeartHandshake,
  ChevronRight,
} from "lucide-react";
import { TopBar } from "@/components/pro/topbar";

const tools = [
  {
    href: "/pro/tools/horary",
    icon: Wand2,
    name: "Horary · Prashna",
    description: "Pick 1–249 → get YES/NO verdict with 3-layer KP analysis",
  },
  {
    href: "/pro/tools/muhurtha",
    icon: Target,
    name: "Muhurtha",
    description: "Find auspicious windows for marriage, business, travel, etc.",
  },
  {
    href: "/pro/tools/transit",
    icon: TrendingUp,
    name: "Transit · Gochar",
    description: "Current planet transits mapped to natal chart",
  },
  {
    href: "/pro/tools/panchang",
    icon: Calendar,
    name: "Panchang",
    description: "Daily tithi, nakshatra, yoga, karana, choghadiya, hora",
  },
  {
    href: "/pro/tools/match",
    icon: HeartHandshake,
    name: "Kundli Match",
    description: "8-Kuta + KP compatibility between any two charts",
  },
];

export default function ToolsHubPage() {
  return (
    <>
      <TopBar title="Tools" tabs={[]} />
      <main className="px-6 pb-12 pt-6 max-w-[1200px] mx-auto">
        <div className="mb-6">
          <div className="text-tiny uppercase tracking-wider text-gold mb-1">
            KP TOOLS
          </div>
          <h1 className="font-display text-h1 font-semibold text-text-primary mb-2">
            Standalone tools
          </h1>
          <p className="text-body text-text-secondary max-w-2xl">
            Tools that don&apos;t need a client context. For client-specific
            analysis (Marriage, Career, Dasha), open a client.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className="group p-5 rounded-xl bg-bg-surface border border-border hover:border-border-accent transition-all"
              >
                <div className="size-10 rounded-lg bg-gold-glow border border-border-accent flex items-center justify-center text-gold mb-3">
                  <Icon className="size-5" />
                </div>
                <div className="font-display text-h3 font-semibold text-text-primary mb-1">
                  {t.name}
                </div>
                <p className="text-small text-text-secondary leading-snug mb-4">
                  {t.description}
                </p>
                <div className="flex items-center gap-1 text-tiny text-gold group-hover:gap-2 transition-all">
                  Open <ChevronRight className="size-3" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
