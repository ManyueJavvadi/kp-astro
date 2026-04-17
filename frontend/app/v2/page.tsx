"use client";

import Link from "next/link";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";

/**
 * DevAstroAI v2 Landing Page.
 * Serves at /v2 during development. Will move to / via (public) route group in Phase 1.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans overflow-x-hidden">
      <Nav />
      <Hero />
      <TrustStrip />
      <Features />
      <Comparison />
      <LiveDemoPreview />
      <Pricing />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   NAV — sticky, translucent, premium
   ══════════════════════════════════════════════════════════════════ */
function Nav() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-lg bg-bg-primary/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/v2" className="flex items-center gap-2.5 shrink-0">
          <div className="size-8 rounded-md bg-gradient-to-br from-gold to-gold-dim flex items-center justify-center font-display text-bg-primary text-lg font-bold">
            ♎
          </div>
          <div className="font-semibold tracking-tight">
            <span className="text-text-primary">DevAstro</span>
            <span className="text-gold">AI</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-small text-text-secondary">
          <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
          <a href="#comparison" className="hover:text-text-primary transition-colors">Why us</a>
          <a href="#pricing" className="hover:text-text-primary transition-colors">Pricing</a>
          <a href="#demo" className="hover:text-text-primary transition-colors">Demo</a>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button variant="primary" size="sm" rightIcon={<ArrowRight />} asChild>
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HERO — animated starfield, oversized serif headline
   ══════════════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Animated starfield background */}
      <StarField />
      {/* Gold glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-radial from-gold-glow via-transparent to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-24 md:pt-32 md:pb-32">
        <div className="flex flex-col items-center text-center">
          {/* Announcement chip */}
          <Badge variant="gold" size="lg" className="mb-8">
            <Sparkles className="size-3.5" />
            Now in private beta · Join the waitlist
            <ChevronRight className="size-3.5" />
          </Badge>

          {/* Hero headline */}
          <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] font-bold tracking-tight mb-6 text-balance max-w-5xl">
            The KP astrology tool
            <br />
            every professional will{" "}
            <span className="italic text-gold">open daily</span>
          </h1>

          {/* Subheadline */}
          <p className="text-body-lg md:text-lg text-text-secondary max-w-2xl mb-10 leading-relaxed">
            Modern cloud-based practice management for serious KP astrologers.
            Client CRM, prediction tracking, and bilingual AI analysis — in one
            beautifully crafted workspace.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-10">
            <Button variant="primary" size="lg" rightIcon={<ArrowRight />} asChild>
              <Link href="/signup">Start 14-day free trial</Link>
            </Button>
            <Button variant="ghost" size="lg" leftIcon={<Play />}>
              See it in action
            </Button>
          </div>

          {/* Trust micro-copy */}
          <div className="flex items-center gap-6 text-tiny uppercase tracking-wider text-text-muted">
            <div className="flex items-center gap-1.5">
              <Check className="size-3 text-success" />
              No credit card required
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="size-3 text-success" />
              Full access during trial
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <Check className="size-3 text-success" />
              Cancel anytime
            </div>
          </div>
        </div>

        {/* Floating product preview */}
        <div className="mt-16 md:mt-24 relative">
          <MockAppPreview />
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STARFIELD — subtle animated stars
   ══════════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════════
   MOCK APP PREVIEW — stylized dashboard screenshot
   ══════════════════════════════════════════════════════════════════ */
function MockAppPreview() {
  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Gradient border via padded wrapper */}
      <div className="rounded-2xl p-px bg-gradient-to-b from-border-accent via-border to-transparent shadow-2xl">
        <div className="rounded-2xl bg-bg-surface border border-border-strong overflow-hidden">
          {/* Window chrome */}
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

          {/* App body */}
          <div className="grid grid-cols-[200px_1fr] min-h-[420px]">
            {/* Sidebar */}
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

            {/* Main */}
            <main className="p-5 flex flex-col gap-4">
              {/* Client tabs */}
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

              {/* Sub tabs */}
              <div className="flex gap-4 border-b border-border pb-1.5 text-small">
                <div className="text-gold border-b-2 border-gold -mb-1.5 pb-1.5">Chart</div>
                <div className="text-text-muted">Houses</div>
                <div className="text-text-muted">Dasha</div>
                <div className="text-text-muted">Analysis</div>
                <div className="text-text-muted">Sessions</div>
                <div className="text-text-muted">Predictions</div>
              </div>

              {/* Content grid */}
              <div className="grid grid-cols-3 gap-3 flex-1">
                {/* Chart */}
                <div className="col-span-2 rounded-lg border border-border bg-bg-primary/50 p-4 flex items-center justify-center">
                  <MiniChart />
                </div>
                {/* Right panel */}
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

/* ══════════════════════════════════════════════════════════════════
   MINI CHART — stylized kundali placeholder
   ══════════════════════════════════════════════════════════════════ */
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
      {/* Planet glyphs */}
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
        <div className="text-tiny uppercase tracking-wider text-text-muted">
          Trusted by practicing KP astrologers across India
        </div>
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
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FEATURES — 4 column grid
   ══════════════════════════════════════════════════════════════════ */
function Features() {
  const features = [
    {
      icon: <Zap className="size-5" />,
      title: "Rigorous KP Engine",
      description:
        "Cuspal Sub Lord, 4-level significators, Ruling Planets, 249 Horary — the math you can defend in front of any senior astrologer.",
      accent: "gold",
    },
    {
      icon: <Users className="size-5" />,
      title: "Client CRM",
      description:
        "Session history, prediction tracking, follow-up reminders. Every consult remembered, every promise verified.",
      accent: "gold",
    },
    {
      icon: <Sparkles className="size-5" />,
      title: "Bilingual AI Copilot",
      description:
        "Ask Claude about any chart in Telugu + English. Cites actual CSL chains and dasha dates — never hallucinates.",
      accent: "ai",
    },
    {
      icon: <TrendingUp className="size-5" />,
      title: "Accuracy Scoreboard",
      description:
        "Track every prediction's outcome. Build evidence over time that no other tool lets you measure.",
      accent: "gold",
    },
  ];
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-16 text-center max-w-3xl mx-auto">
          <div className="text-tiny uppercase tracking-wider text-gold mb-3">Built for practitioners</div>
          <h2 className="font-display text-h1 md:text-[3rem] leading-tight font-semibold mb-4 text-balance">
            Depth where it matters. Polish everywhere else.
          </h2>
          <p className="text-body-lg text-text-secondary">
            No consumer fluff. No rounded-off shortcuts. Every feature designed for
            astrologers who bet their reputation on the answer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-xl bg-bg-surface border border-border hover:border-border-strong transition-all"
            >
              <div
                className={`inline-flex size-10 rounded-lg items-center justify-center mb-4 ${
                  f.accent === "ai"
                    ? "bg-[color-mix(in_srgb,var(--color-ai)_15%,transparent)] text-ai border border-[color-mix(in_srgb,var(--color-ai)_30%,transparent)]"
                    : "bg-gold-glow text-gold border border-border-accent"
                }`}
              >
                {f.icon}
              </div>
              <h3 className="text-h3 font-semibold mb-2">{f.title}</h3>
              <p className="text-small text-text-secondary leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   COMPARISON — vs Leostar & KundaliGPT
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

  const renderCell = (val: boolean | "partial") =>
    val === true ? (
      <Check className="size-5 text-success mx-auto" />
    ) : val === "partial" ? (
      <span className="text-tiny text-warning font-medium">Partial</span>
    ) : (
      <X className="size-5 text-text-disabled mx-auto" />
    );

  return (
    <section id="comparison" className="py-24 md:py-32 bg-bg-surface/30 border-y border-border">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <div className="text-tiny uppercase tracking-wider text-gold mb-3">Why astrologers switch</div>
          <h2 className="font-display text-h1 md:text-[3rem] leading-tight font-semibold mb-4 text-balance">
            The only tool that combines <span className="italic text-gold">depth</span>,{" "}
            <span className="italic text-gold">AI</span>, and a real practice layer
          </h2>
        </div>

        <div className="rounded-2xl border border-border overflow-hidden bg-bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-6 py-4 font-medium">Capability</th>
                <th className="text-center text-small px-6 py-4 bg-gold-glow/30">
                  <div className="font-semibold text-gold">DevAstroAI</div>
                  <div className="text-tiny text-text-muted font-normal mt-0.5">Pro astrologer tier</div>
                </th>
                <th className="text-center text-small px-6 py-4">
                  <div className="font-semibold text-text-secondary">Leostar</div>
                  <div className="text-tiny text-text-muted font-normal mt-0.5">Desktop</div>
                </th>
                <th className="text-center text-small px-6 py-4">
                  <div className="font-semibold text-text-secondary">KundaliGPT</div>
                  <div className="text-tiny text-text-muted font-normal mt-0.5">Consumer AI</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? "bg-bg-surface-2/30" : ""}>
                  <td className="text-small text-text-primary px-6 py-3.5">{row.feature}</td>
                  <td className="text-center px-6 py-3.5 bg-gold-glow/10">{renderCell(row.us)}</td>
                  <td className="text-center px-6 py-3.5">{renderCell(row.leostar)}</td>
                  <td className="text-center px-6 py-3.5">{renderCell(row.kundaligpt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LIVE DEMO PREVIEW
   ══════════════════════════════════════════════════════════════════ */
function LiveDemoPreview() {
  return (
    <section id="demo" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
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
                { kbd: "⌘K", label: "Open command palette — find any client, tool, or setting" },
                { kbd: "c", label: "Add new client" },
                { kbd: "n", label: "Start new session with current client" },
                { kbd: "⌘+1–9", label: "Switch between open client tabs" },
                { kbd: "/", label: "Search" },
              ].map((item) => (
                <div key={item.kbd} className="flex items-start gap-3">
                  <div className="flex gap-0.5 shrink-0 pt-0.5">
                    {item.kbd.split("+").map((k, i) => (
                      <Kbd key={i}>{k}</Kbd>
                    ))}
                  </div>
                  <div className="text-small text-text-secondary">{item.label}</div>
                </div>
              ))}
            </div>
            <Button variant="secondary" rightIcon={<ArrowRight />}>Watch demo video</Button>
          </div>

          <div className="relative">
            {/* Command palette mock */}
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
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PRICING — 4 tiers in INR
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
    <section id="pricing" className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16 text-center max-w-3xl mx-auto">
          <div className="text-tiny uppercase tracking-wider text-gold mb-3">Simple pricing, no hidden fees</div>
          <h2 className="font-display text-h1 md:text-[3rem] leading-tight font-semibold mb-4 text-balance">
            Priced for Indian professionals
          </h2>
          <p className="text-body-lg text-text-secondary">
            A practicing KP astrologer charges ₹500–2,000 per consultation. Astrologer
            Pro costs less than one consult per month.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-6 flex flex-col ${
                tier.highlighted
                  ? "bg-bg-surface border-2 border-gold shadow-[var(--shadow-glow)]"
                  : "bg-bg-surface border border-border"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="gold" size="md">
                    <Star className="size-3 fill-gold" /> Most popular
                  </Badge>
                </div>
              )}
              <div className="mb-6">
                <div className="text-small font-medium text-text-secondary mb-2">{tier.name}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-display text-[2.5rem] leading-none font-bold text-text-primary">
                    {tier.price}
                  </span>
                  <span className="text-small text-text-muted">{tier.period}</span>
                </div>
                {tier.yearly && (
                  <div className="text-tiny text-text-muted">or {tier.yearly}</div>
                )}
                <p className="text-small text-text-secondary mt-3">{tier.description}</p>
              </div>

              <ul className="flex-1 space-y-2.5 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-small text-text-secondary">
                    <Check className="size-4 text-success shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={tier.highlighted ? "primary" : "secondary"}
                fullWidth
                rightIcon={<ArrowRight />}
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-small text-text-muted">
          <div className="flex items-center gap-2">
            <Shield className="size-4" /> 14-day free trial on all paid tiers
          </div>
          <div className="flex items-center gap-2">
            <Check className="size-4 text-success" /> Cancel anytime
          </div>
          <div className="flex items-center gap-2">
            <Check className="size-4 text-success" /> Data export guaranteed
          </div>
        </div>
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
    <section className="py-24 md:py-32 bg-bg-surface/30 border-y border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-16 text-center max-w-3xl mx-auto">
          <div className="text-tiny uppercase tracking-wider text-gold mb-3">Voices from the field</div>
          <h2 className="font-display text-h1 md:text-[3rem] leading-tight font-semibold text-balance">
            Loved by astrologers who care about rigor
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quotes.map((q) => (
            <div key={q.name} className="p-6 rounded-xl bg-bg-surface border border-border flex flex-col">
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-4 fill-gold text-gold" />
                ))}
              </div>
              <p className="text-body text-text-secondary leading-relaxed mb-6 flex-1 italic">
                &ldquo;{q.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="size-10 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-body font-semibold text-gold">
                  {q.initial}
                </div>
                <div>
                  <div className="text-small font-medium text-text-primary">{q.name}</div>
                  <div className="text-tiny text-text-muted">{q.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FINAL CTA
   ══════════════════════════════════════════════════════════════════ */
function FinalCTA() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gold-glow/40 to-transparent pointer-events-none" />
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-display text-h1 md:text-[3.5rem] leading-[1.1] font-bold mb-6 text-balance">
          Start your first client session today
        </h2>
        <p className="text-body-lg text-text-secondary mb-10 max-w-xl mx-auto">
          14-day free trial. No credit card. Full Astrologer Pro access. See why
          astrologers are switching from Leostar.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Button variant="primary" size="lg" rightIcon={<ArrowRight />} asChild>
            <Link href="/signup">Start free trial</Link>
          </Button>
          <Button variant="ghost" size="lg">
            Talk to founder
          </Button>
        </div>
        <div className="text-tiny text-text-muted">
          Questions?{" "}
          <a href="mailto:hello@devastroai.com" className="text-gold hover:text-gold-bright">
            hello@devastroai.com
          </a>
        </div>
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
              <div className="size-8 rounded-md bg-gradient-to-br from-gold to-gold-dim flex items-center justify-center font-display text-bg-primary text-lg font-bold">
                ♎
              </div>
              <div className="font-semibold tracking-tight">
                <span className="text-text-primary">DevAstro</span>
                <span className="text-gold">AI</span>
              </div>
            </div>
            <p className="text-small text-text-muted max-w-xs leading-relaxed">
              Modern cloud-based KP astrology practice management. Built in India, for astrologers everywhere.
            </p>
          </div>
          <FooterCol
            title="Product"
            items={["Features", "Pricing", "Changelog", "Roadmap"]}
          />
          <FooterCol
            title="Company"
            items={["About", "Blog", "Careers", "Contact"]}
          />
          <FooterCol
            title="Legal"
            items={["Privacy", "Terms", "Security", "Cookies"]}
          />
        </div>
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-tiny text-text-muted">
            © 2026 DevAstroAI. All rights reserved.
          </div>
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
  return (
    <div>
      <div className="text-tiny uppercase tracking-wider text-text-muted font-medium mb-4">
        {title}
      </div>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item}>
            <a href="#" className="text-small text-text-secondary hover:text-text-primary transition-colors">
              {item}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
