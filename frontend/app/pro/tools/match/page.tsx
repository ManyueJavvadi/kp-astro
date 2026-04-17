"use client";

import Link from "next/link";
import { HeartHandshake, Sparkles, ExternalLink } from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function MatchPage() {
  return (
    <>
      <TopBar title="Kundli Match" tabs={[]} />
      <main className="px-6 pb-12 pt-6 max-w-[1000px] mx-auto">
        <div className="mb-6">
          <div className="text-tiny uppercase tracking-wider text-gold mb-1">
            MARRIAGE COMPATIBILITY
          </div>
          <h1 className="font-display text-h1 font-semibold text-text-primary mb-2">
            Kundli matching
          </h1>
        </div>

        <div className="rounded-2xl bg-bg-surface p-8 border border-border">
          <div className="flex items-start gap-4 mb-5">
            <div className="size-12 rounded-lg bg-gold-glow border border-border-accent flex items-center justify-center text-gold shrink-0">
              <HeartHandshake className="size-6" />
            </div>
            <div>
              <Badge variant="gold" size="md" className="mb-2">
                <Sparkles className="size-3" /> Full engine available
              </Badge>
              <div className="font-display text-h2 font-semibold text-text-primary mb-1">
                KP + 8-Kuta Ashtakoota match
              </div>
              <p className="text-body text-text-secondary leading-relaxed">
                H7 CSL promise for both charts, cross-resonance of Ruling Planets,
                Kuja Dosha with mutual cancellation, full 36-point Ashtakoota,
                D9 Navamsa, separation risk, 5th CSL for love, and AI chat.
              </p>
            </div>
          </div>

          <Button variant="primary" leftIcon={<ExternalLink />} asChild>
            <Link href="/" target="_blank">
              Open on legacy app
            </Link>
          </Button>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-[color-mix(in_srgb,var(--color-ai)_5%,transparent)] border border-[color-mix(in_srgb,var(--color-ai)_20%,transparent)]">
          <div className="text-tiny uppercase tracking-wider text-ai mb-1 flex items-center gap-1">
            <Sparkles className="size-3" /> COMING SOON IN V2
          </div>
          <div className="text-small text-text-secondary">
            Native v2 Match UI — pick two clients from your CRM, get full
            compatibility report with branded PDF export.
          </div>
        </div>
      </main>
    </>
  );
}
