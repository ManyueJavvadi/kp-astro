"use client";

import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Heart,
  Briefcase,
  Activity,
  Coins,
  Plus,
  Clock,
  ChevronRight,
  Star,
  Sun,
  Moon,
  Users,
  Zap,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function ConsumerDashboardPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] leading-tight font-semibold text-balance">
            Namaste, <span className="text-gold">Ravi</span>
          </h1>
        </div>
        <Badge variant="ai" size="lg">
          <Sparkles className="size-3.5" /> 4 AI questions left today
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="flex flex-col gap-6 min-w-0">
          <HeroAI />
          <TodaysEnergy />
          <ZodiacStrip />
          <RecentChats />
          <AstroReadings />
        </div>
        <div className="flex flex-col gap-6 min-w-0">
          <YourChart />
          <FamilyFriends />
          <UpgradeCard />
          <TodayPanchang />
        </div>
      </div>
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HERO AI INPUT — topic chips + ask box
   ══════════════════════════════════════════════════════════════════ */
function HeroAI() {
  const topics = [
    { label: "Love", icon: <Heart className="size-3.5 text-pink-400" /> },
    { label: "Career", icon: <Briefcase className="size-3.5 text-blue-400" /> },
    { label: "Health", icon: <Activity className="size-3.5 text-success" /> },
    { label: "Money", icon: <Coins className="size-3.5 text-warning" /> },
  ];
  return (
    <div className="rounded-2xl p-[1px] bg-gradient-to-b from-gold-glow to-transparent">
      <div className="rounded-2xl bg-gradient-to-br from-bg-surface via-bg-surface to-bg-surface-2 p-6 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="ai" size="md">
            <Sparkles className="size-3" /> AI Vedic Astrologer
          </Badge>
        </div>
        <div className="font-display text-h2 font-semibold text-text-primary mb-4">
          Ready to decode your destiny?
        </div>
        <div className="rounded-xl bg-bg-primary/50 border border-border-strong p-1 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 ml-3 text-gold shrink-0" />
            <input
              placeholder="Ask about your future..."
              className="flex-1 bg-transparent outline-none text-body text-text-primary placeholder:text-text-muted py-2.5"
            />
            <Button variant="primary" size="sm" rightIcon={<ArrowRight />}>
              Ask
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <button
              key={t.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-surface-2 border border-border hover:border-border-accent text-small text-text-secondary hover:text-text-primary transition-colors"
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TODAY'S ENERGY — daily cosmic summary
   ══════════════════════════════════════════════════════════════════ */
function TodaysEnergy() {
  return (
    <div className="rounded-xl bg-bg-surface border border-border p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sun className="size-4 text-gold" />
        <div className="text-tiny uppercase tracking-wider text-gold">
          YOUR COSMIC ENERGY TODAY
        </div>
      </div>
      <div className="font-display text-h3 font-semibold text-text-primary mb-2">
        Strong focus day for Scorpio Lagna
      </div>
      <p className="text-body text-text-secondary leading-relaxed mb-4">
        With Moon in your 3rd house (Capricorn) and Mercury actively transiting
        through your 11th, today favors negotiations, learning, and network
        outreach. Your Saturn MD supports steady execution — prioritize one
        major task rather than scattering energy.
      </p>
      <div className="flex items-center gap-3 pt-3 border-t border-border">
        <Button variant="secondary" size="sm" rightIcon={<ArrowRight />}>
          Read full report
        </Button>
        <div className="text-tiny text-text-muted flex items-center gap-1">
          <Clock className="size-3" /> 4 min read
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ZODIAC STRIP
   ══════════════════════════════════════════════════════════════════ */
function ZodiacStrip() {
  const signs = [
    { name: "Aries", glyph: "♈", active: false },
    { name: "Taurus", glyph: "♉", active: false },
    { name: "Gemini", glyph: "♊", active: false },
    { name: "Cancer", glyph: "♋", active: false },
    { name: "Leo", glyph: "♌", active: false },
    { name: "Virgo", glyph: "♍", active: false },
    { name: "Libra", glyph: "♎", active: false },
    { name: "Scorpio", glyph: "♏", active: true },
    { name: "Sagittarius", glyph: "♐", active: false },
    { name: "Capricorn", glyph: "♑", active: false },
    { name: "Aquarius", glyph: "♒", active: false },
    { name: "Pisces", glyph: "♓", active: false },
  ];
  const periods = ["Today", "Weekly", "Monthly"];
  return (
    <div className="rounded-xl bg-bg-surface border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-tiny uppercase tracking-wider text-gold flex items-center gap-2">
          <Star className="size-3" /> YOUR HOROSCOPE
        </div>
        <div className="flex items-center gap-0 p-0.5 rounded-md bg-bg-surface-2 border border-border">
          {periods.map((p, i) => (
            <button
              key={p}
              className={
                i === 0
                  ? "px-3 py-1 rounded text-tiny font-medium bg-bg-elevated text-text-primary shadow-sm"
                  : "px-3 py-1 rounded text-tiny font-medium text-text-muted hover:text-text-primary"
              }
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
        {signs.map((s) => (
          <button
            key={s.name}
            className={
              s.active
                ? "aspect-square rounded-lg bg-gold-glow border-2 border-gold flex flex-col items-center justify-center gap-0.5 text-gold shadow-[var(--shadow-glow)]"
                : "aspect-square rounded-lg bg-bg-surface-2 border border-border hover:border-border-strong flex flex-col items-center justify-center gap-0.5 text-text-muted hover:text-text-primary transition-colors"
            }
          >
            <div className="text-h3 font-serif">{s.glyph}</div>
            <div className="text-[9px] uppercase tracking-wider">{s.name.slice(0, 3)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   RECENT CHATS
   ══════════════════════════════════════════════════════════════════ */
function RecentChats() {
  const chats = [
    { q: "When will I get married?", answer: "H7 CSL Jupiter signifies...", when: "2 hours ago" },
    { q: "Should I change my job this year?", answer: "Saturn MD until Aug 2027...", when: "yesterday" },
    { q: "What does my dasha period mean?", answer: "You are in Saturn MD...", when: "3 days ago" },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-tiny uppercase tracking-wider text-gold">RECENT CONVERSATIONS</div>
        <Button variant="ghost" size="sm" rightIcon={<ArrowRight />}>
          See all
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {chats.map((c) => (
          <button
            key={c.q}
            className="text-left p-4 rounded-lg bg-bg-surface border border-border hover:border-border-strong transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-small font-medium text-text-primary mb-1 truncate">
                  {c.q}
                </div>
                <div className="text-tiny text-text-muted truncate">{c.answer}</div>
              </div>
              <div className="text-tiny text-text-muted whitespace-nowrap">{c.when}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ASTRO READINGS (cards)
   ══════════════════════════════════════════════════════════════════ */
function AstroReadings() {
  const readings = [
    { title: "Mangal Dosha Check", subtitle: "Mars in Leo", description: "Does your Mars placement create Dosha? Find out.", color: "from-red-500/15 to-transparent", icon: <Zap className="size-4 text-red-400" />, pro: false },
    { title: "Love & Romance", subtitle: "Venus in Virgo", description: "Your Venus sign reveals your love style.", color: "from-pink-500/15 to-transparent", icon: <Heart className="size-4 text-pink-400" />, pro: false },
    { title: "Saturn & Sade Sati", subtitle: "Saturn in Taurus", description: "Sade Sati status + what lies ahead.", color: "from-blue-500/15 to-transparent", icon: <Shield className="size-4 text-blue-400" />, pro: true },
    { title: "Dasha Predictions", subtitle: "Saturn · Mercury", description: "What to expect in this dasha period.", color: "from-gold-glow to-transparent", icon: <Star className="size-4 text-gold" />, pro: true },
    { title: "Gemstone Guide", subtitle: "Scorpio Lagna", description: "Personalized gemstones by your chart.", color: "from-purple-500/15 to-transparent", icon: <Sparkles className="size-4 text-ai" />, pro: true },
    { title: "Yearly Forecast", subtitle: "Apr 2026–Apr 2027", description: "Detailed 12-month cosmic preview.", color: "from-warning/15 to-transparent", icon: <Sun className="size-4 text-warning" />, pro: true },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-tiny uppercase tracking-wider text-gold">YOUR ASTROLOGY READINGS</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {readings.map((r) => (
          <div
            key={r.title}
            className="relative overflow-hidden rounded-xl bg-bg-surface border border-border hover:border-border-accent transition-all cursor-pointer group"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${r.color} opacity-70 pointer-events-none`} />
            <div className="relative p-5">
              {r.pro && (
                <div className="absolute top-3 right-3">
                  <Badge variant="gold" size="sm">PRO</Badge>
                </div>
              )}
              <div className="size-10 rounded-lg bg-bg-surface-2 border border-border flex items-center justify-center mb-3">
                {r.icon}
              </div>
              <div className="text-tiny text-text-muted mb-1">{r.subtitle}</div>
              <div className="font-display text-h3 font-semibold text-text-primary mb-2">
                {r.title}
              </div>
              <div className="text-small text-text-secondary leading-snug mb-4">
                {r.description}
              </div>
              <div className="text-tiny text-gold flex items-center gap-1 group-hover:gap-2 transition-all">
                Read <ChevronRight className="size-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   YOUR CHART (right rail)
   ══════════════════════════════════════════════════════════════════ */
function YourChart() {
  return (
    <div className="rounded-xl bg-bg-surface border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-tiny uppercase tracking-wider text-gold">YOUR JANAM KUNDLI</div>
          <div className="text-small font-medium text-text-primary mt-1">
            Ascendant Deep Dive
          </div>
        </div>
        <Button variant="ghost" size="icon-sm">
          <ChevronRight />
        </Button>
      </div>
      <div className="aspect-square rounded-lg bg-bg-primary border border-border mb-4 p-3">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <rect x="10" y="10" width="180" height="180" fill="none" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.6" />
          <line x1="10" y1="10" x2="190" y2="190" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
          <line x1="190" y1="10" x2="10" y2="190" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
          <line x1="100" y1="10" x2="10" y2="100" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
          <line x1="100" y1="10" x2="190" y2="100" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
          <line x1="100" y1="190" x2="10" y2="100" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
          <line x1="100" y1="190" x2="190" y2="100" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
          <text x="50" y="55" fill="var(--color-sun)" fontSize="10" fontFamily="serif">Mo</text>
          <text x="140" y="55" fill="var(--color-ketu)" fontSize="10" fontFamily="serif">Ke</text>
          <text x="50" y="150" fill="var(--color-jupiter)" fontSize="10" fontFamily="serif">Ju Sa</text>
          <text x="140" y="150" fill="var(--color-mercury)" fontSize="10" fontFamily="serif">Me Ve</text>
          <text x="100" y="60" fill="var(--color-gold)" fontSize="10" fontFamily="serif" textAnchor="middle">Asc</text>
          <text x="100" y="115" fill="var(--color-sun)" fontSize="10" fontFamily="serif" textAnchor="middle">Su Ma</text>
          <text x="160" y="100" fill="var(--color-rahu)" fontSize="10" fontFamily="serif">Ra</text>
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-tiny">
        <div className="p-2 rounded-md bg-bg-surface-2 border border-border">
          <div className="text-text-muted uppercase tracking-wider mb-1">Ascendant</div>
          <div className="text-text-primary font-medium">♏ Scorpio</div>
        </div>
        <div className="p-2 rounded-md bg-bg-surface-2 border border-border">
          <div className="text-text-muted uppercase tracking-wider mb-1">Sun Sign</div>
          <div className="text-text-primary font-medium">♌ Leo</div>
        </div>
        <div className="p-2 rounded-md bg-bg-surface-2 border border-border">
          <div className="text-text-muted uppercase tracking-wider mb-1">Moon Sign</div>
          <div className="text-text-primary font-medium">♑ Capricorn</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FAMILY & FRIENDS (right rail)
   ══════════════════════════════════════════════════════════════════ */
function FamilyFriends() {
  const family = [
    { name: "You", sub: "Self · Scorpio", initial: "R", self: true },
    { name: "Priya", sub: "Wife · Libra", initial: "P", self: false },
    { name: "Karthik", sub: "Son · Gemini", initial: "K", self: false },
  ];
  return (
    <div className="rounded-xl bg-bg-surface border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-tiny uppercase tracking-wider text-gold flex items-center gap-2">
            <Users className="size-3" /> FAMILY & FRIENDS
          </div>
          <div className="text-small font-medium text-text-primary mt-1">
            3 of 5 profiles
          </div>
        </div>
        <Button variant="ghost" size="icon-sm">
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {family.map((f) => (
          <div
            key={f.name}
            className={
              f.self
                ? "p-3 rounded-lg bg-gold-glow border border-border-accent flex flex-col items-center gap-2"
                : "p-3 rounded-lg bg-bg-surface-2 border border-border flex flex-col items-center gap-2 hover:border-border-strong transition-colors cursor-pointer"
            }
          >
            <div className={
              f.self
                ? "size-10 rounded-full bg-bg-surface border-2 border-gold flex items-center justify-center text-body font-semibold text-gold"
                : "size-10 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-body font-semibold text-text-secondary"
            }>
              {f.initial}
            </div>
            <div className="text-center">
              <div className="text-small font-medium text-text-primary">{f.name}</div>
              <div className="text-tiny text-text-muted">{f.sub}</div>
            </div>
          </div>
        ))}
        <button className="p-3 rounded-lg border border-dashed border-border-strong flex flex-col items-center justify-center gap-2 text-text-muted hover:border-border-accent hover:text-gold transition-colors">
          <Plus className="size-5" />
          <div className="text-tiny">Add</div>
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   UPGRADE CARD (right rail)
   ══════════════════════════════════════════════════════════════════ */
function UpgradeCard() {
  return (
    <div className="rounded-xl p-[1px] bg-gradient-to-br from-gold via-gold-dim to-transparent">
      <div className="rounded-xl bg-bg-surface p-5">
        <Badge variant="gold" size="md" className="mb-3">
          <Sparkles className="size-3" /> Unlock Pro
        </Badge>
        <div className="font-display text-h3 font-semibold text-text-primary mb-2">
          Ask unlimited questions
        </div>
        <div className="text-small text-text-secondary leading-relaxed mb-4">
          Consumer Pro unlocks: unlimited AI questions, all 6 astro readings,
          family profiles (up to 5), PDF reports.
        </div>
        <div className="flex items-baseline gap-1 mb-4">
          <span className="font-display text-h1 font-bold text-gold">₹299</span>
          <span className="text-small text-text-muted">/month · 14-day trial</span>
        </div>
        <Button variant="primary" fullWidth rightIcon={<ArrowRight />}>
          Start free trial
        </Button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TODAY PANCHANG (right rail)
   ══════════════════════════════════════════════════════════════════ */
function TodayPanchang() {
  return (
    <div className="rounded-xl bg-bg-surface border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-tiny uppercase tracking-wider text-gold flex items-center gap-2">
            <Moon className="size-3" /> TODAY&apos;S PANCHANG
          </div>
          <div className="text-tiny text-text-muted mt-1 flex items-center gap-1">
            📍 Etobicoke, Canada
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-3 rounded-md bg-bg-surface-2 border border-border">
          <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">Tithi</div>
          <div className="text-small font-medium text-text-primary leading-tight">
            Krishna Chaturdashi
          </div>
        </div>
        <div className="p-3 rounded-md bg-bg-surface-2 border border-border">
          <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">Nakshatra</div>
          <div className="text-small font-medium text-text-primary leading-tight">
            Revati
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-tiny text-text-muted pt-3 border-t border-border">
        <div className="flex items-center gap-1">
          <Sun className="size-3 text-warning" /> 06:33 am
        </div>
        <div className="flex items-center gap-1">
          <Moon className="size-3 text-text-muted" /> 08:03 pm
        </div>
      </div>
    </div>
  );
}
