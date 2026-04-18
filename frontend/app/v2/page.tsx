"use client";

import Link from "next/link";
import { motion, useScroll, useSpring } from "framer-motion";
import {
  ArrowRight,
  Check,
  X,
  Sparkles,
  Users,
  TrendingUp,
  Play,
  Globe,
  Shield,
  Zap,
  Star,
  ChevronRight,
  Command,
  Target,
  BarChart3,
  Clock,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { Reveal, RevealStagger, RevealChild } from "@/components/landing/reveal";
import { LogoMark } from "@/components/ui/logo";

/**
 * DevAstroAI v2 Landing Page.
 * Serves at /v2 during development. Will move to / via (public) route group in Phase 1.
 */
export default function LandingPage() {
  return (
    <div className="v2-landing min-h-screen font-sans overflow-x-hidden">
      <ScrollProgress />
      <Nav />
      <Hero />
      <TrustStrip />
      <StatsBanner />
      <FeatureRivers />
      <CityMarquee />
      <Comparison />
      <KeyboardFlow />
      <CaseStudies />
      <Pricing />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SCROLL PROGRESS — thin gold bar at top of page
   ══════════════════════════════════════════════════════════════════ */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold to-gold-bright origin-left z-[60]"
      style={{ scaleX }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════
   NAV
   ══════════════════════════════════════════════════════════════════ */
function Nav() {
  return (
    <nav className="v2-landing-nav">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/v2" className="flex items-center gap-2.5 shrink-0">
          <LogoMark size={32} />
          <div className="font-semibold tracking-tight" style={{ color: "#E8EDF5" }}>
            DevAstro<span style={{ color: "#FFB400" }}>AI</span>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-small" style={{ color: "#94A3B8" }}>
          <a href="#features" className="transition-colors hover:text-white">Features</a>
          <a href="#comparison" className="transition-colors hover:text-white">Why us</a>
          <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
          <a href="#stories" className="transition-colors hover:text-white">Stories</a>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            style={{
              fontSize: 14,
              color: "#E8EDF5",
              padding: "8px 14px",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Sign in
          </Link>
          <Link href="/signup" className="v2-btn-cyan" style={{ padding: "8px 16px", fontSize: 14 }}>
            Start free <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HERO
   ══════════════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <section className="v2-section relative overflow-hidden">
      <StarField />
      <div className="v2-blob-cyan-tl" />
      <div className="v2-blob-gold-br" />
      <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-24 md:pt-32 md:pb-32" style={{ zIndex: 1 }}>
        <div className="flex flex-col items-center text-center">
          <Reveal earlier>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(0, 200, 255, 0.08)",
                border: "1px solid rgba(0, 200, 255, 0.2)",
                color: "#00C8FF",
                fontSize: 12,
                fontWeight: 500,
                marginBottom: 32,
              }}
            >
              <Sparkles className="size-3.5" />
              Now in private beta · Join the waitlist
              <ChevronRight className="size-3.5" />
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1
              className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] font-bold tracking-tight mb-6 text-balance max-w-5xl"
              style={{ color: "#E8EDF5" }}
            >
              The KP astrology tool
              <br />
              every professional will{" "}
              <span className="italic" style={{ color: "#FFB400" }}>open daily</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="md:text-lg max-w-2xl mb-10 leading-relaxed" style={{ color: "#94A3B8", fontSize: 17 }}>
              Modern cloud-based practice management for serious KP astrologers.
              Client CRM, prediction tracking, and bilingual AI analysis — in one
              beautifully crafted workspace.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-10">
              <Link href="/signup" className="v2-btn-cyan">
                Start 14-day free trial <ArrowRight className="size-4" />
              </Link>
              <button type="button" className="v2-btn-ghost">
                <Play className="size-4" /> See it in action
              </button>
            </div>
          </Reveal>
          <Reveal delay={0.4}>
            <div className="flex items-center gap-6 text-tiny uppercase tracking-wider" style={{ color: "#4A6080" }}>
              <div className="flex items-center gap-1.5">
                <Check className="size-3" style={{ color: "#00C8FF" }} />
                No credit card required
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-3" style={{ color: "#00C8FF" }} />
                Full access during trial
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <Check className="size-3" style={{ color: "#00C8FF" }} />
                Cancel anytime
              </div>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.3} className="mt-16 md:mt-24 relative">
          <div className="v2-mockup-card">
            <MockAppPreview />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function StarField() {
  const stars = Array.from({ length: 60 }, (_, i) => {
    const top = Math.random() * 100;
    const left = Math.random() * 100;
    const size = Math.random() * 2 + 1;
    const delay = Math.random() * 4;
    const duration = Math.random() * 3 + 2;
    return { top, left, size, delay, duration, key: i };
  });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <div
          key={s.key}
          className="absolute rounded-full bg-gold/40"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}

function MockAppPreview() {
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="rounded-2xl p-px bg-gradient-to-b from-border-accent via-border to-transparent shadow-2xl">
        <div className="rounded-2xl bg-bg-surface border border-border-strong overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-bg-surface-2">
            <div className="flex gap-1.5">
              <div className="size-3 rounded-full bg-error/60" />
              <div className="size-3 rounded-full bg-warning/60" />
              <div className="size-3 rounded-full bg-success/60" />
            </div>
            <div className="ml-4 flex items-center gap-1 text-tiny text-text-muted bg-bg-elevated border border-border rounded px-2 py-0.5">
              <Globe className="size-3" />
              devastroai.com/pro/clients/ravi-kumar
            </div>
          </div>
          <div className="grid grid-cols-[200px_1fr] min-h-[420px]">
            <aside className="border-r border-border bg-bg-surface-2/50 p-3 flex flex-col gap-1 text-small">
              {[
                { label: "Dashboard", active: false, icon: "⌂" },
                { label: "Clients", active: true, icon: "👥" },
                { label: "Tools", active: false, icon: "⚙" },
                { label: "Reports", active: false, icon: "⎙" },
                { label: "Settings", active: false, icon: "⚙︎" },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md ${
                    item.active
                      ? "bg-gold-glow text-gold border border-border-accent"
                      : "text-text-secondary"
                  }`}
                >
                  <span className="opacity-60">{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </aside>
            <main className="p-5 flex flex-col gap-4">
              <div className="flex gap-1 text-tiny">
                {["Ravi Kumar", "Priya S.", "Mohan R."].map((name, i) => (
                  <div
                    key={name}
                    className={`px-3 py-1.5 rounded-t-md border-t border-x ${
                      i === 0
                        ? "bg-bg-surface border-border-strong text-text-primary"
                        : "bg-bg-surface-2/50 border-border text-text-muted"
                    }`}
                  >
                    {name}
                  </div>
                ))}
              </div>
              <div className="flex gap-4 border-b border-border pb-1.5 text-small">
                <div className="text-gold border-b-2 border-gold -mb-1.5 pb-1.5">Chart</div>
                <div className="text-text-muted">Houses</div>
                <div className="text-text-muted">Dasha</div>
                <div className="text-text-muted">Analysis</div>
                <div className="text-text-muted">Sessions</div>
                <div className="text-text-muted">Predictions</div>
              </div>
              <div className="grid grid-cols-3 gap-3 flex-1">
                <div className="col-span-2 rounded-lg border border-border bg-bg-primary/50 p-4 flex items-center justify-center">
                  <MiniChart />
                </div>
                <div className="flex flex-col gap-3">
                  <div className="rounded-lg border border-border-accent bg-gold-glow/30 p-3">
                    <div className="text-tiny uppercase tracking-wider text-gold mb-1">KP VERDICT</div>
                    <div className="font-semibold text-text-primary text-body">Marriage promised</div>
                    <div className="text-tiny text-text-muted mt-1">H7 CSL · Jupiter · 3 sigs</div>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-surface-2 p-3">
                    <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">CURRENT DASHA</div>
                    <div className="text-small text-text-primary">Saturn · Mercury</div>
                    <div className="text-tiny text-text-muted mt-1">Until Aug 2027</div>
                  </div>
                  <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-ai)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-ai)_8%,transparent)] p-3">
                    <div className="text-tiny uppercase tracking-wider text-ai mb-1 flex items-center gap-1">
                      <Sparkles className="size-3" /> AI INSIGHT
                    </div>
                    <div className="text-small text-text-primary leading-snug">
                      Ask about job stability — Saturn MD ends Aug 2027
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniChart() {
  return (
    <svg viewBox="0 0 200 200" className="w-56 h-56">
      <rect x="10" y="10" width="180" height="180" fill="none" stroke="var(--color-border-accent)" strokeWidth="0.5" />
      <line x1="10" y1="10" x2="190" y2="190" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.6" />
      <line x1="190" y1="10" x2="10" y2="190" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.6" />
      <line x1="100" y1="10" x2="10" y2="100" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.6" />
      <line x1="100" y1="10" x2="190" y2="100" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.6" />
      <line x1="100" y1="190" x2="10" y2="100" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.6" />
      <line x1="100" y1="190" x2="190" y2="100" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.6" />
      <text x="50" y="60" fill="var(--color-sun)" fontSize="14" fontFamily="serif">☉</text>
      <text x="140" y="60" fill="var(--color-moon)" fontSize="14" fontFamily="serif">☽</text>
      <text x="100" y="100" fill="var(--color-jupiter)" fontSize="14" fontFamily="serif" textAnchor="middle">♃</text>
      <text x="60" y="150" fill="var(--color-mars)" fontSize="14" fontFamily="serif">♂</text>
      <text x="145" y="150" fill="var(--color-venus)" fontSize="14" fontFamily="serif">♀</text>
      <text x="30" y="100" fill="var(--color-saturn)" fontSize="14" fontFamily="serif">♄</text>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TRUST STRIP
   ══════════════════════════════════════════════════════════════════ */
function TrustStrip() {
  return (
    <section className="border-y border-border py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <Reveal>
          <div className="text-tiny uppercase tracking-wider text-text-muted">
            Trusted by practicing KP astrologers across India
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="flex items-center gap-6 text-text-muted">
            <div className="flex -space-x-2">
              {["R", "P", "M", "S", "V"].map((initial, i) => (
                <div
                  key={initial}
                  className="size-9 rounded-full bg-bg-surface border-2 border-bg-primary flex items-center justify-center text-tiny font-semibold text-gold"
                  style={{ zIndex: 5 - i }}
                >
                  {initial}
                </div>
              ))}
            </div>
            <div className="text-small">
              <span className="text-text-primary font-semibold">100+</span> astrologers ·{" "}
              <span className="text-text-primary font-semibold">1,200+</span> client sessions tracked
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STATS BANNER — big metric callouts (GitHub-style)
   ══════════════════════════════════════════════════════════════════ */
function StatsBanner() {
  const stats = [
    { value: "249", unit: "", label: "KP Horary numbers supported", sub: "full 1–249 prashna system" },
    { value: "92", unit: "%", label: "Prediction accuracy tracked", sub: "across beta cohort" },
    { value: "4×", unit: "", label: "Faster than Leostar", sub: "avg session workflow time" },
    { value: "₹6k", unit: "/yr", label: "Saved vs legacy tools", sub: "Astrologer Pro vs Leostar Expert" },
  ];
  return (
    <section className="v2-section relative py-24 md:py-32">
      <div className="v2-blob-gold-center" />
      <div className="max-w-6xl mx-auto px-6 relative" style={{ zIndex: 1 }}>
        <Reveal className="text-center mb-16 max-w-3xl mx-auto">
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#FFB400",
              marginBottom: 12,
              fontWeight: 600,
            }}
          >
            By the numbers
          </div>
          <h2 className="font-display text-h1 md:text-[3rem] leading-tight font-semibold text-balance" style={{ color: "#E8EDF5" }}>
            Evidence over vibes.{" "}
            <span className="italic" style={{ color: "#FFB400" }}>Measured</span> astrology.
          </h2>
        </Reveal>
        <RevealStagger className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <RevealChild key={s.label}>
              <div className="v2-stat-card h-full">
                <div className="v2-stat-number">
                  {s.value}
                  <span style={{ fontSize: 24, color: "#4A6080", marginLeft: 2 }}>{s.unit}</span>
                </div>
                <div className="v2-stat-underline" />
                <div className="v2-stat-label">{s.label}</div>
                <div className="v2-stat-sub">{s.sub}</div>
              </div>
            </RevealChild>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FEATURE RIVERS — alternating L/R with mock panels (GitHub-style)
   ══════════════════════════════════════════════════════════════════ */
function FeatureRivers() {
  return (
    <section id="features" className="v2-section relative py-24 md:py-32">
      <div className="v2-blob-cyan-left" />
      <div className="max-w-6xl mx-auto px-6 relative" style={{ zIndex: 1 }}>
        <Reveal className="text-center mb-20 max-w-3xl mx-auto">
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#00C8FF", marginBottom: 12, fontWeight: 600 }}>
            Built for practitioners
          </div>
          <h2 className="font-display text-h1 md:text-[3rem] leading-tight font-semibold mb-4 text-balance" style={{ color: "#E8EDF5" }}>
            Depth where it matters.
            <br />
            <span className="italic" style={{ color: "#FFB400" }}>Polish</span> everywhere else.
          </h2>
          <p style={{ fontSize: 17, color: "#94A3B8" }}>
            Four product pillars. Every detail designed for astrologers who bet
            their reputation on the answer.
          </p>
        </Reveal>

        <div className="flex flex-col gap-32 md:gap-40">
          <FeatureRiver
            label="KP CORE ENGINE"
            title="The math you can defend"
            description="Rigorous Krishnamurti Paddhati calculations — every Cuspal Sub Lord, every 4-level significator, every Ruling Planet — exposed in the UI, not hidden behind an LLM. Your reasoning is your product."
            bullets={[
              "Cuspal Sub Lord (CSL) for every house",
              "4-level signification chain (Occupant → Owner → Star Lord → Sub Lord)",
              "Full 249-number Horary Prashna support",
              "Vimshottari Dasha with antardasha + pratyantardasha precision",
              "Ruling Planets computed at query time",
            ]}
            mockup={<MockKPPanel />}
            icon={<Zap className="size-5" />}
          />
          <FeatureRiver
            reverse
            label="CLIENT CRM"
            title="Every consultation, remembered"
            description="Your clients return six months later expecting you to remember what you said. DevAstroAI does. Session summaries, prediction tracking, follow-up reminders — built into the workflow, not bolted on."
            bullets={[
              "Client directory with semantic search",
              "Consultation history with AI-generated summaries",
              "Prediction outcomes tracked over time",
              "Follow-up reminders on your dashboard",
              "Branded PDF reports emailed to clients",
            ]}
            mockup={<MockCRMPanel />}
            icon={<Users className="size-5" />}
          />
          <FeatureRiver
            label="AI COPILOT"
            accent="ai"
            title="Claude, speaking Telugu + English"
            description="Ask in Telugu-English mix. Get citations to actual CSL chains and dasha dates. Never a hallucination — the AI reads your computed chart data, doesn't invent it."
            bullets={[
              "Bilingual analysis: Telugu script + English KP terms",
              "Cites specific planets, houses, and sub lords from the chart",
              "Topic-aware knowledge injection (marriage, job, health, etc.)",
              "Follow-up questions with full conversation memory",
              "Safe-by-default: never invents dasha dates",
            ]}
            mockup={<MockAIPanel />}
            icon={<Sparkles className="size-5" />}
          />
          <FeatureRiver
            reverse
            label="ACCURACY SCOREBOARD"
            title="Track what you predict"
            description="No other tool measures this. Every prediction you make gets logged. Every outcome you record builds evidence — of your hit rate, your best domains, your best timing windows. Your reputation, quantified."
            bullets={[
              "Log predictions with target date windows",
              "Mark outcomes: correct / partial / wrong / pending",
              "Accuracy dashboards by domain (marriage, career, health)",
              "Per-client prediction history timeline",
              "Exportable stats for client credibility",
            ]}
            mockup={<MockScoreboardPanel />}
            icon={<TrendingUp className="size-5" />}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureRiver({
  label,
  title,
  description,
  bullets,
  mockup,
  icon,
  reverse = false,
  accent = "gold",
}: {
  label: string;
  title: string;
  description: string;
  bullets: string[];
  mockup: React.ReactNode;
  icon: React.ReactNode;
  reverse?: boolean;
  accent?: "gold" | "ai";
}) {
  const iconBg = accent === "ai" ? "rgba(136, 51, 204, 0.14)" : "rgba(0, 200, 255, 0.08)";
  const iconColor = accent === "ai" ? "#B88FDC" : "#00C8FF";
  const iconBorder = accent === "ai" ? "1px solid rgba(136, 51, 204, 0.3)" : "1px solid rgba(0, 200, 255, 0.25)";
  return (
    <Reveal>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        <div className={reverse ? "lg:order-2" : ""}>
          <div className="flex items-center gap-3 mb-4">
            <div
              style={{
                display: "inline-flex",
                width: 40,
                height: 40,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                background: iconBg,
                color: iconColor,
                border: iconBorder,
              }}
            >
              {icon}
            </div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4A6080", fontWeight: 500 }}>
              {label}
            </div>
          </div>
          <h3 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-tight font-semibold mb-4 text-balance" style={{ color: "#E8EDF5" }}>
            {title}
          </h3>
          <p style={{ fontSize: 17, color: "#94A3B8", marginBottom: 24, lineHeight: 1.65 }}>
            {description}
          </p>
          <ul className="flex flex-col gap-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3" style={{ fontSize: 14, color: "#94A3B8" }}>
                <span className="v2-bullet-dot" style={{ marginTop: 7 }} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={reverse ? "lg:order-1" : ""}>
          <div className="v2-mockup-card">
            {mockup}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MOCK PANELS — one per feature river
   ══════════════════════════════════════════════════════════════════ */
function MockPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ overflow: "hidden" }}>
      {children}
    </div>
  );
}

function MockKPPanel() {
  return (
    <MockPanel>
      <div className="p-6">
        <div className="text-tiny uppercase tracking-wider text-gold mb-4 flex items-center gap-2">
          <Target className="size-3" /> H7 CSL CHAIN · MARRIAGE
        </div>
        <div className="flex flex-col gap-2">
          {[
            { level: "CSL", planet: "Jupiter", houses: "2, 5, 7" },
            { level: "Owner", planet: "Mercury", houses: "11" },
            { level: "Star Lord", planet: "Venus", houses: "2, 7, 11" },
            { level: "Sub Lord", planet: "Moon", houses: "5, 7" },
          ].map((row) => (
            <div
              key={row.level}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-bg-surface-2 border border-border"
            >
              <div className="text-tiny uppercase tracking-wider text-text-muted w-20">
                {row.level}
              </div>
              <div className="size-7 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-tiny font-bold text-gold">
                {row.planet[0]}
              </div>
              <div className="text-body text-text-primary font-medium">{row.planet}</div>
              <div className="ml-auto flex gap-1">
                {row.houses.split(", ").map((h) => (
                  <span
                    key={h}
                    className="px-1.5 py-0.5 rounded text-tiny font-mono bg-gold-glow text-gold"
                  >
                    H{h}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-5 border-t border-border flex items-center justify-between">
          <div>
            <div className="text-tiny uppercase tracking-wider text-text-muted">Verdict</div>
            <div className="text-body font-semibold text-success mt-0.5">
              Marriage PROMISED — 2, 7, 11 all signified
            </div>
          </div>
          <Badge variant="success">3 sigs</Badge>
        </div>
      </div>
    </MockPanel>
  );
}

function MockCRMPanel() {
  const clients = [
    { name: "Ravi Kumar", age: "14d", pending: 3, color: "gold" },
    { name: "Priya Sharma", age: "3d", pending: 1, color: "default" },
    { name: "Mohan Reddy", age: "1mo", pending: 0, color: "default" },
    { name: "Lakshmi Devi", age: "today", pending: 0, color: "default" },
  ];
  return (
    <MockPanel>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-tiny uppercase tracking-wider text-text-muted">
            Clients · 4 of 87
          </div>
          <div className="text-tiny text-text-muted flex items-center gap-1">
            <Command className="size-3" /> K to search
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {clients.map((c, i) => (
            <div
              key={c.name}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md ${
                i === 0
                  ? "bg-gold-glow border border-border-accent"
                  : "bg-bg-surface-2 border border-border"
              }`}
            >
              <div
                className={`size-9 rounded-full border flex items-center justify-center text-small font-semibold ${
                  i === 0
                    ? "bg-bg-surface border-border-accent text-gold"
                    : "bg-bg-elevated border-border text-text-secondary"
                }`}
              >
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-small font-medium text-text-primary truncate">{c.name}</div>
                <div className="text-tiny text-text-muted flex items-center gap-2">
                  <Clock className="size-3" /> Last seen {c.age}
                  {c.pending > 0 && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="text-warning">{c.pending} pending</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight className="size-4 text-text-muted" />
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-[color-mix(in_srgb,var(--color-ai)_8%,transparent)] border border-[color-mix(in_srgb,var(--color-ai)_30%,transparent)]">
          <div className="text-tiny uppercase tracking-wider text-ai mb-1 flex items-center gap-1">
            <Sparkles className="size-3" /> FOLLOW-UP DUE
          </div>
          <div className="text-small text-text-primary leading-snug">
            Ravi&apos;s job prediction window (June) has passed. Check outcome.
          </div>
        </div>
      </div>
    </MockPanel>
  );
}

function MockAIPanel() {
  return (
    <MockPanel>
      <div className="p-5 flex flex-col gap-3">
        <div className="text-tiny uppercase tracking-wider text-ai flex items-center gap-2 mb-1">
          <Sparkles className="size-3" /> AI ANALYSIS · MARRIAGE
        </div>
        <div className="rounded-lg bg-bg-surface-2 border border-border p-3 text-small text-text-secondary">
          <span className="text-text-muted">Q:</span> పెళ్లి ఎప్పుడు అవుతుంది?
        </div>
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-ai)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-ai)_5%,transparent)] p-3 text-small text-text-primary leading-relaxed">
          <div className="text-tiny uppercase tracking-wider text-ai mb-2 flex items-center gap-1">
            <Sparkles className="size-3" /> Claude
          </div>
          <p>
            మీ <span className="text-gold font-medium font-mono">H7 CSL Jupiter</span> → H2, H7, H11 signifies —{" "}
            <span className="text-success font-semibold">marriage is promised</span>.
          </p>
          <p className="mt-2">
            Timing window: <span className="text-gold font-mono">Saturn MD / Mercury AD</span>{" "}
            (అక్టోబర్ 2025 – జూలై 2026). Mercury is a significator of 2, 7, 11.
          </p>
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-tiny text-text-muted">
            <Check className="size-3 text-success" />
            Cited 4 CSL chains · Verified against dasha dates
          </div>
        </div>
      </div>
    </MockPanel>
  );
}

function MockScoreboardPanel() {
  const domains = [
    { domain: "Marriage", total: 24, correct: 21, color: "success" },
    { domain: "Career", total: 31, correct: 19, color: "warning" },
    { domain: "Health", total: 12, correct: 11, color: "success" },
    { domain: "Foreign", total: 8, correct: 7, color: "success" },
  ];
  return (
    <MockPanel>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">
              YOUR ACCURACY · LAST 90 DAYS
            </div>
            <div className="font-display text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-bold text-gold">
              87%
            </div>
            <div className="text-tiny text-text-muted mt-1">
              75 / 87 predictions verified correct
            </div>
          </div>
          <BarChart3 className="size-12 text-gold opacity-40" />
        </div>
        <div className="flex flex-col gap-3">
          {domains.map((d) => {
            const pct = Math.round((d.correct / d.total) * 100);
            return (
              <div key={d.domain}>
                <div className="flex items-center justify-between text-small mb-1.5">
                  <div className="text-text-primary font-medium">{d.domain}</div>
                  <div className="text-text-muted font-mono">
                    {d.correct}/{d.total} ·{" "}
                    <span className="text-text-primary">{pct}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-bg-surface-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      pct >= 80 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-error"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MockPanel>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CITY MARQUEE — slow-scrolling "Trusted by astrologers in …"
   ══════════════════════════════════════════════════════════════════ */
function CityMarquee() {
  const cities = [
    "Hyderabad", "Bangalore", "Chennai", "Mumbai", "Pune", "Kolkata",
    "Delhi", "Vijayawada", "Vizag", "Coimbatore", "Thiruvananthapuram",
    "Mysore", "Tirupati", "Warangal", "Kochi", "Ahmedabad",
  ];
  const doubled = [...cities, ...cities];
  return (
    <section className="py-12 border-y border-border bg-bg-surface/30 overflow-hidden">
      <div className="text-center mb-6">
        <div className="text-tiny uppercase tracking-wider text-text-muted">
          Astrologers using DevAstroAI across India
        </div>
      </div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />
        <div className="flex gap-8 animate-[marquee_40s_linear_infinite]">
          {doubled.map((city, i) => (
            <div
              key={i}
              className="shrink-0 flex items-center gap-2 text-body-lg text-text-secondary font-display italic"
            >
              <MapPin className="size-4 text-gold" />
              {city}
              <span className="text-text-disabled ml-8">·</span>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   COMPARISON
   ══════════════════════════════════════════════════════════════════ */
function Comparison() {
  type Cell = boolean | "partial";
  const rows: { feature: string; us: Cell; leostar: Cell; kundaligpt: Cell }[] = [
    { feature: "Cloud-based (any device)", us: true, leostar: false, kundaligpt: true },
    { feature: "Professional KP depth", us: true, leostar: true, kundaligpt: false },
    { feature: "AI copilot for predictions", us: true, leostar: false, kundaligpt: true },
    { feature: "Client CRM + session history", us: true, leostar: false, kundaligpt: false },
    { feature: "Prediction accuracy tracking", us: true, leostar: false, kundaligpt: false },
    { feature: "Bilingual (Telugu + English)", us: true, leostar: "partial", kundaligpt: false },
    { feature: "Branded PDF reports", us: true, leostar: true, kundaligpt: false },
    { feature: "Keyboard-first navigation", us: true, leostar: false, kundaligpt: false },
    { feature: "Multi-client workspace tabs", us: true, leostar: false, kundaligpt: false },
    { feature: "14-day free trial", us: true, leostar: false, kundaligpt: true },
  ];
  const renderCell = (val: Cell, ours = false) =>
    val === true ? (
      <Check style={{ width: 18, height: 18, color: ours ? "#00C8FF" : "#00C8FF", margin: "0 auto" }} />
    ) : val === "partial" ? (
      <span style={{ fontSize: 11, color: "#FFB400", fontWeight: 500 }}>Partial</span>
    ) : (
      <X style={{ width: 18, height: 18, color: "rgba(239,68,68,0.5)", margin: "0 auto" }} />
    );
  return (
    <section id="comparison" className="v2-section relative py-24 md:py-32">
      <div className="v2-blob-gold-right" />
      <div className="max-w-5xl mx-auto px-6 relative" style={{ zIndex: 1 }}>
        <Reveal className="mb-12 text-center max-w-3xl mx-auto">
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#FFB400", marginBottom: 12, fontWeight: 600 }}>
            Why astrologers switch
          </div>
          <h2 className="font-display text-h1 md:text-[3rem] leading-tight font-semibold mb-4 text-balance" style={{ color: "#E8EDF5" }}>
            The only tool that combines <span className="italic" style={{ color: "#FFB400" }}>depth</span>,{" "}
            <span className="italic" style={{ color: "#FFB400" }}>AI</span>, and a real practice layer
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ background: "#0A0F1C", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4A6080", padding: "16px 24px", fontWeight: 500 }}>Capability</th>
                  <th style={{ textAlign: "center", padding: "16px 24px", background: "rgba(0,200,255,0.08)", borderBottom: "2px solid #00C8FF" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#00C8FF" }}>DevAstroAI</div>
                    <div style={{ fontSize: 11, color: "#4A6080", fontWeight: 400, marginTop: 2 }}>Pro astrologer tier</div>
                  </th>
                  <th style={{ textAlign: "center", padding: "16px 24px" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#4A6080" }}>Leostar</div>
                    <div style={{ fontSize: 11, color: "#4A6080", fontWeight: 400, marginTop: 2 }}>Desktop</div>
                  </th>
                  <th style={{ textAlign: "center", padding: "16px 24px" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#4A6080" }}>KundaliGPT</div>
                    <div style={{ fontSize: 11, color: "#4A6080", fontWeight: 400, marginTop: 2 }}>Consumer AI</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.feature} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                    <td style={{ fontSize: 13, color: "#E8EDF5", padding: "14px 24px" }}>{row.feature}</td>
                    <td style={{ textAlign: "center", padding: "14px 24px", background: "rgba(0,200,255,0.04)" }}>{renderCell(row.us, true)}</td>
                    <td style={{ textAlign: "center", padding: "14px 24px" }}>{renderCell(row.leostar)}</td>
                    <td className="text-center px-6 py-3.5">{renderCell(row.kundaligpt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   KEYBOARD FLOW
   ══════════════════════════════════════════════════════════════════ */
function KeyboardFlow() {
  return (
    <section id="demo" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="text-tiny uppercase tracking-wider text-gold mb-3">Keyboard-first workflow</div>
            <h2 className="font-display text-h1 md:text-[2.5rem] leading-tight font-semibold mb-4 text-balance">
              Built for astrologers who think in <span className="italic text-gold">flows</span>, not clicks
            </h2>
            <p className="text-body-lg text-text-secondary mb-8 leading-relaxed">
              Open three clients at once, jump between them with <Kbd>⌘</Kbd><Kbd>1</Kbd>,
              search clients semantically with <Kbd>⌘</Kbd><Kbd>K</Kbd>, create sessions with{" "}
              <Kbd>n</Kbd>. Every action at your fingertips.
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { kbd: ["⌘", "K"], label: "Open command palette — find any client, tool, or setting" },
                { kbd: ["c"], label: "Add new client" },
                { kbd: ["n"], label: "Start new session with current client" },
                { kbd: ["⌘", "1–9"], label: "Switch between open client tabs" },
                { kbd: ["/"], label: "Search" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="flex gap-0.5 shrink-0 pt-0.5">
                    {item.kbd.map((k, i) => (
                      <Kbd key={i}>{k}</Kbd>
                    ))}
                  </div>
                  <div className="text-small text-text-secondary">{item.label}</div>
                </div>
              ))}
            </div>
            <Button variant="secondary" rightIcon={<ArrowRight />}>Watch demo video</Button>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="rounded-xl border border-border-strong bg-bg-elevated shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <Command className="size-4 text-text-muted" />
                <input
                  className="flex-1 bg-transparent outline-none text-body text-text-primary placeholder:text-text-muted"
                  placeholder="Search or type a command..."
                  defaultValue="ravi"
                  readOnly
                />
                <Kbd>Esc</Kbd>
              </div>
              <div className="p-2">
                <div className="text-tiny uppercase tracking-wider text-text-muted px-3 py-2">CLIENTS</div>
                <div className="px-3 py-2.5 rounded-md bg-gold-glow flex items-center gap-3">
                  <div className="size-8 rounded-full bg-bg-surface-2 flex items-center justify-center text-tiny font-semibold text-gold">RK</div>
                  <div className="flex-1">
                    <div className="text-small font-medium text-text-primary">Ravi Kumar</div>
                    <div className="text-tiny text-text-muted">Last seen 14 days ago · 3 pending predictions</div>
                  </div>
                  <Kbd>↵</Kbd>
                </div>
                <div className="px-3 py-2.5 rounded-md flex items-center gap-3 hover:bg-bg-hover">
                  <div className="size-8 rounded-full bg-bg-surface-2 flex items-center justify-center text-tiny font-semibold text-text-muted">RS</div>
                  <div className="flex-1">
                    <div className="text-small text-text-primary">Ravi Shankar</div>
                    <div className="text-tiny text-text-muted">First session</div>
                  </div>
                </div>
                <div className="text-tiny uppercase tracking-wider text-text-muted px-3 py-2 mt-2">ACTIONS</div>
                <div className="px-3 py-2.5 rounded-md flex items-center gap-3 hover:bg-bg-hover">
                  <Users className="size-4 text-text-muted" />
                  <div className="flex-1 text-small text-text-primary">Add new client for &quot;Ravi&quot;</div>
                  <Kbd>c</Kbd>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CASE STUDIES
   ══════════════════════════════════════════════════════════════════ */
function CaseStudies() {
  const stories = [
    {
      metric: "3× more clients",
      headline: "Dr. Sharma scaled his Hyderabad practice",
      description:
        "Switched from spreadsheets. Now tracks 180 clients, 420+ sessions, and maintains 89% prediction accuracy.",
      initial: "S",
      role: "KP Astrologer · Hyderabad",
    },
    {
      metric: "92% retention",
      headline: "Lakshmi Rao retains clients year-over-year",
      description:
        "Session summaries + follow-ups mean clients feel remembered. 92% return within 6 months.",
      initial: "L",
      role: "Jyotish · Bangalore",
    },
    {
      metric: "4× faster",
      headline: "Ravi Teja's consults got leaner",
      description:
        "Multi-client tabs + command palette cut his session prep time from 20 min to 5. More time with clients.",
      initial: "R",
      role: "Consultant · Chennai",
    },
  ];
  return (
    <section id="stories" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-16 max-w-3xl mx-auto">
          <div className="text-tiny uppercase tracking-wider text-gold mb-3">Real results</div>
          <h2 className="font-display text-h1 md:text-[3rem] leading-tight font-semibold text-balance">
            Astrologers shipping better predictions with <span className="italic text-gold">DevAstroAI</span>
          </h2>
        </Reveal>
        <RevealStagger className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stories.map((s) => (
            <RevealChild key={s.initial}>
              <div className="relative p-6 rounded-xl bg-gradient-to-br from-bg-surface to-bg-surface-2 border border-border hover:border-border-accent transition-all h-full flex flex-col group">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-3xl bg-gold-glow/30 pointer-events-none group-hover:bg-gold-glow/50 transition-colors" />
                <div className="relative">
                  <div className="font-display text-[clamp(2rem,4vw,3rem)] leading-none font-bold text-gold mb-3">
                    {s.metric}
                  </div>
                  <div className="text-h3 font-semibold text-text-primary mb-3 text-balance">
                    {s.headline}
                  </div>
                  <p className="text-body text-text-secondary leading-relaxed mb-6 flex-1">
                    {s.description}
                  </p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <div className="size-10 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-body font-semibold text-gold">
                      {s.initial}
                    </div>
                    <div className="text-small text-text-secondary">{s.role}</div>
                  </div>
                </div>
              </div>
            </RevealChild>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PRICING
   ══════════════════════════════════════════════════════════════════ */
function Pricing() {
  const tiers = [
    {
      name: "Free",
      price: "₹0",
      period: "forever",
      description: "Curious about KP? Get a taste.",
      features: ["1 birth chart", "5 AI questions/day", "Basic KP analysis", "Daily panchang"],
      cta: "Start free",
      highlighted: false,
    },
    {
      name: "Consumer Pro",
      price: "₹299",
      period: "/month",
      yearly: "₹2,499/yr",
      description: "Serious about your own chart.",
      features: [
        "Unlimited charts",
        "50 AI questions/day",
        "Family profiles (up to 5)",
        "PDF export",
        "All analysis tabs",
        "Kundli match",
      ],
      cta: "Start 14-day trial",
      highlighted: false,
    },
    {
      name: "Astrologer Pro",
      price: "₹799",
      period: "/month",
      yearly: "₹6,999/yr",
      description: "For practicing professionals.",
      features: [
        "Everything in Consumer Pro",
        "Client CRM (up to 500 clients)",
        "Session history + AI summaries",
        "Prediction accuracy tracking",
        "500 AI questions/day",
        "Branded PDF reports",
        "Semantic client search",
        "Priority support",
      ],
      cta: "Start 14-day trial",
      highlighted: true,
    },
    {
      name: "Team",
      price: "₹1,999",
      period: "/month",
      yearly: "+ ₹499/seat",
      description: "Jyotish firms + multiple astrologers.",
      features: [
        "Everything in Astrologer Pro",
        "Multi-astrologer seats",
        "Shared client pool",
        "Role-based access control",
        "Team dashboard",
        "White-label (coming soon)",
      ],
      cta: "Contact sales",
      highlighted: false,
    },
  ];
  return (
    <section id="pricing" className="v2-section relative py-24 md:py-32">
      <div className="v2-blob-cyan-left" />
      <div className="v2-blob-gold-right" />
      <div className="max-w-7xl mx-auto px-6 relative" style={{ zIndex: 1 }}>
        <Reveal className="mb-16 text-center max-w-3xl mx-auto">
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#00C8FF", marginBottom: 12, fontWeight: 600 }}>
            Simple pricing, no hidden fees
          </div>
          <h2 className="font-display text-h1 md:text-[3rem] leading-tight font-semibold mb-4 text-balance" style={{ color: "#E8EDF5" }}>
            Priced for Indian professionals
          </h2>
          <p style={{ fontSize: 17, color: "#94A3B8" }}>
            A practicing KP astrologer charges ₹500–2,000 per consultation. Astrologer
            Pro costs less than one consult per month.
          </p>
        </Reveal>
        <RevealStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" staggerDelay={0.08}>
          {tiers.map((tier) => (
            <RevealChild key={tier.name}>
              <div
                className={tier.highlighted ? "v2-price-card-popular" : "v2-price-card"}
                style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%" }}
              >
                {tier.highlighted && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)" }}>
                    <span className="v2-price-badge">Most popular</span>
                  </div>
                )}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#94A3B8", marginBottom: 8 }}>{tier.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 20, color: "#4A6080", verticalAlign: "top", fontWeight: 600 }}>
                      {tier.price.slice(0, 1)}
                    </span>
                    <span style={{ fontSize: 36, fontWeight: 700, color: "#E8EDF5", lineHeight: 1 }}>
                      {tier.price.slice(1)}
                    </span>
                    <span style={{ fontSize: 14, color: "#4A6080" }}>{tier.period}</span>
                  </div>
                  {tier.yearly && (
                    <div style={{ fontSize: 11, color: "#4A6080" }}>or {tier.yearly}</div>
                  )}
                  <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 12 }}>{tier.description}</p>
                </div>
                <ul style={{ flex: 1, marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
                  {tier.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#94A3B8" }}>
                      <Check style={{ width: 16, height: 16, color: "#00C8FF", flexShrink: 0, marginTop: 2 }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {tier.highlighted ? (
                  <Link href="/signup" className="v2-btn-cyan" style={{ justifyContent: "center", width: "100%" }}>
                    {tier.cta} <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <Link
                    href={tier.cta === "Contact sales" ? "mailto:sales@devastro.ai" : "/signup"}
                    className="v2-btn-ghost"
                    style={{ justifyContent: "center", width: "100%" }}
                  >
                    {tier.cta} <ArrowRight className="size-4" />
                  </Link>
                )}
              </div>
            </RevealChild>
          ))}
        </RevealStagger>
        <Reveal delay={0.3} className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-small text-text-muted">
          <div className="flex items-center gap-2">
            <Shield className="size-4" /> 14-day free trial on all paid tiers
          </div>
          <div className="flex items-center gap-2">
            <Check className="size-4 text-success" /> Cancel anytime
          </div>
          <div className="flex items-center gap-2">
            <Check className="size-4 text-success" /> Data export guaranteed
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TESTIMONIALS
   ══════════════════════════════════════════════════════════════════ */
function Testimonials() {
  const quotes = [
    {
      quote:
        "Finally, a KP tool that thinks like a practitioner. The CSL significator chains and dasha-relevance check are exactly how I work.",
      name: "Dr. Sharma",
      role: "KP Astrologer · Hyderabad",
      initial: "S",
    },
    {
      quote:
        "The prediction tracking alone is worth the subscription. My clients trust me more because I can pull up what I said last year and show them.",
      name: "Lakshmi Rao",
      role: "Jyotish · Bangalore",
      initial: "L",
    },
    {
      quote:
        "AI in Telugu that actually understands KP? Game changer. I use it alongside my own analysis as a second opinion.",
      name: "Ravi Teja",
      role: "Astrology Consultant · Chennai",
      initial: "R",
    },
  ];
  return (
    <section className="v2-section relative py-24 md:py-32">
      <div className="v2-blob-cyan-left" />
      <div className="max-w-6xl mx-auto px-6 relative" style={{ zIndex: 1 }}>
        <Reveal className="mb-16 text-center max-w-3xl mx-auto">
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#00C8FF", marginBottom: 12, fontWeight: 600 }}>
            Voices from the field
          </div>
          <h2 className="font-display text-h1 md:text-[3rem] leading-tight font-semibold text-balance" style={{ color: "#E8EDF5" }}>
            Loved by astrologers who care about rigor
          </h2>
        </Reveal>
        <RevealStagger className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quotes.map((q) => (
            <RevealChild key={q.name}>
              <div className="v2-testi-card flex flex-col h-full">
                <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} style={{ width: 14, height: 14, fill: "#FFB400", color: "#FFB400" }} />
                  ))}
                </div>
                <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.7, marginBottom: 24, flex: 1, fontStyle: "italic" }}>
                  &ldquo;{q.quote}&rdquo;
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 18,
                    background: "rgba(0,200,255,0.1)",
                    border: "1px solid rgba(0,200,255,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 600, color: "#00C8FF"
                  }}>
                    {q.initial}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>{q.name}</div>
                    <div className="text-tiny text-text-muted">{q.role}</div>
                  </div>
                </div>
              </div>
            </RevealChild>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FINAL CTA
   ══════════════════════════════════════════════════════════════════ */
function FinalCTA() {
  return (
    <section className="v2-section relative py-24 md:py-32 overflow-hidden">
      <div className="v2-blob-gold-center" />
      <div className="v2-blob-cyan-tl" />
      <div className="relative max-w-4xl mx-auto px-6 text-center" style={{ zIndex: 1 }}>
        <Reveal>
          <h2 className="font-display text-h1 md:text-[3.5rem] leading-[1.1] font-bold mb-6 text-balance" style={{ color: "#E8EDF5" }}>
            Start your first client session today
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={{ fontSize: 17, color: "#94A3B8", marginBottom: 40, maxWidth: 560, margin: "0 auto 40px" }}>
            14-day free trial. No credit card. Full Astrologer Pro access. See why
            astrologers are switching from Leostar.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Link href="/signup" className="v2-btn-cyan">
              Start free trial <ArrowRight className="size-4" />
            </Link>
            <a href="mailto:hello@devastroai.com" className="v2-btn-ghost">
              Talk to founder
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.3}>
          <div style={{ fontSize: 11, color: "#4A6080" }}>
            Questions?{" "}
            <a href="mailto:hello@devastroai.com" style={{ color: "#00C8FF", textDecoration: "none" }}>
              hello@devastroai.com
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="border-t border-border pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <LogoMark size={32} />
              <div className="font-semibold tracking-tight">
                <span className="text-text-primary">DevAstro</span>
                <span className="text-gold">AI</span>
              </div>
            </div>
            <p className="text-small text-text-muted max-w-xs leading-relaxed">
              Modern cloud-based KP astrology practice management. Built in India, for astrologers everywhere.
            </p>
          </div>
          <FooterCol title="Product" items={["Features", "Pricing", "Changelog", "Roadmap"]} />
          <FooterCol title="Company" items={["About", "Blog", "Careers", "Contact"]} />
          <FooterCol title="Legal" items={["Privacy", "Terms", "Security", "Cookies"]} />
        </div>
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-tiny text-text-muted">© 2026 DevAstroAI. All rights reserved.</div>
          <div className="flex items-center gap-4 text-tiny text-text-muted">
            <span>Made with ✧ in Hyderabad</span>
            <span className="opacity-40">·</span>
            <span>v2.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  // Known routes — anything else falls back to "#"
  const routes: Record<string, string> = {
    Privacy: "/privacy",
    Terms: "/terms",
    Pricing: "#pricing",
    Features: "#features",
  };
  return (
    <div>
      <div className="text-tiny uppercase tracking-wider text-text-muted font-medium mb-4">
        {title}
      </div>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item}>
            <a
              href={routes[item] ?? "#"}
              className="text-small text-text-secondary hover:text-text-primary transition-colors"
            >
              {item}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
