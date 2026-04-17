"use client";

import Link from "next/link";
import { Target, Sparkles, ExternalLink } from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function MuhurthaPage() {
  return (
    <>
      <TopBar title="Muhurtha" tabs={[]} />
      <main className="px-6 pb-12 pt-6 max-w-[1000px] mx-auto">
        <div className="mb-6">
          <div className="text-tiny uppercase tracking-wider text-gold mb-1">
            AUSPICIOUS TIMING
          </div>
          <h1 className="font-display text-h1 font-semibold text-text-primary mb-2">
            Muhurtha finder
          </h1>
          <p className="text-body text-text-secondary max-w-2xl">
            Full multi-chart muhurtha with KP engine scoring (Badhaka,
            Event Cusp CSL, H11, Moon SL, Panchang) is wired on the legacy
            app — visit it while we restyle into v2.
          </p>
        </div>

        <div className="rounded-2xl p-[1px] bg-gradient-to-br from-gold via-gold-dim to-transparent">
          <div className="rounded-2xl bg-bg-surface p-8">
            <div className="flex items-start gap-4 mb-5">
              <div className="size-12 rounded-lg bg-gold-glow border border-border-accent flex items-center justify-center text-gold shrink-0">
                <Target className="size-6" />
              </div>
              <div className="flex-1">
                <Badge variant="gold" size="md" className="mb-2">
                  <Sparkles className="size-3" /> Full engine available
                </Badge>
                <div className="font-display text-h2 font-semibold text-text-primary mb-1">
                  Multi-chart muhurtha
                </div>
                <p className="text-body text-text-secondary leading-relaxed">
                  Scans every 4 minutes across your date range. Scores each
                  Lagna Sub Lord against event house requirements. Adds bonuses
                  for event-cusp CSL confirmation, H11 CSL confirmation, Moon SL
                  favorability, and natal RP resonance for every participant.
                  Penalizes Rahu Kalam, Vishti Karana, and Badhaka/Maraka hits.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-5">
              {[
                "Event cusp CSL + H11 CSL confirmation",
                "Badhaka/Maraka check based on Lagna sign type",
                "Moon Sub Lord favorability",
                "Multi-participant natal RP resonance bonus",
                "Event-location-aware Rahu Kalam, Choghadiya, Hora",
                "Full panchang (tithi, nakshatra, yoga, vara)",
                "AI deep-dive analysis on top windows",
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-small text-text-secondary">
                  <div className="size-1.5 rounded-full bg-gold" />
                  {feat}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="primary" leftIcon={<ExternalLink />} asChild>
                <Link href="/" target="_blank">
                  Open on legacy app
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/pro/tools">← Back to tools</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-[color-mix(in_srgb,var(--color-ai)_5%,transparent)] border border-[color-mix(in_srgb,var(--color-ai)_20%,transparent)]">
          <div className="text-tiny uppercase tracking-wider text-ai mb-1 flex items-center gap-1">
            <Sparkles className="size-3" /> COMING IN NEXT PHASE
          </div>
          <div className="text-small text-text-secondary">
            Native v2 muhurtha UI with calendar strip, expandable windows,
            and AI chat — wired to{" "}
            <code className="font-mono text-gold">/muhurtha/find</code> +{" "}
            <code className="font-mono text-gold">/muhurtha/analyze</code>.
          </div>
        </div>
      </main>
    </>
  );
}
