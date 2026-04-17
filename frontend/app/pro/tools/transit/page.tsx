"use client";

import Link from "next/link";
import { TrendingUp, Sparkles, ExternalLink } from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TransitPage() {
  return (
    <>
      <TopBar title="Transit · Gochar" tabs={[]} />
      <main className="px-6 pb-12 pt-6 max-w-[1000px] mx-auto">
        <div className="mb-6">
          <div className="text-tiny uppercase tracking-wider text-gold mb-1">
            GOCHAR · CURRENT SKY
          </div>
          <h1 className="font-display text-h1 font-semibold text-text-primary mb-2">
            Transit analysis
          </h1>
        </div>

        <div className="rounded-2xl bg-bg-surface p-8 border border-border">
          <div className="flex items-start gap-4 mb-5">
            <div className="size-12 rounded-lg bg-gold-glow border border-border-accent flex items-center justify-center text-gold shrink-0">
              <TrendingUp className="size-6" />
            </div>
            <div>
              <Badge variant="gold" size="md" className="mb-2">
                <Sparkles className="size-3" /> Full engine available
              </Badge>
              <div className="font-display text-h2 font-semibold text-text-primary mb-1">
                Transit engine
              </div>
              <p className="text-body text-text-secondary leading-relaxed">
                Ranks transits by dasha/bhukti/antara relevance. Detects Sade
                Sati phases. Open a client to see their transits (coming in v2
                client workspace Dasha tab).
              </p>
            </div>
          </div>

          <Button variant="primary" leftIcon={<ExternalLink />} asChild>
            <Link href="/" target="_blank">
              Open on legacy app
            </Link>
          </Button>
        </div>
      </main>
    </>
  );
}
