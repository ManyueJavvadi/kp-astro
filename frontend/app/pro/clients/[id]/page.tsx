"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Plus,
  Sparkles,
  Clock,
  Edit,
  MoreHorizontal,
  ChevronRight,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Target,
  CheckCircle2,
  Star,
  FileText,
  MessageCircle,
} from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function ClientWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const client = {
    name: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    initial: id[0].toUpperCase(),
    gender: "Male",
    birth: "Sep 9, 2000",
    birthTime: "12:31 PM",
    place: "Tenali, Andhra Pradesh",
    lagna: "Scorpio",
    moon: "Capricorn",
    phone: "+91 98765 43210",
    email: "ravi.kumar@email.com",
    tags: ["career", "priority"],
    sessions: 12,
    pending: 3,
    lastSeen: "today",
  };

  return (
    <>
      <TopBar title={client.name} activeTab="ravi" />
      <main className="max-w-[1400px] mx-auto">
        <ClientHeader client={client} />
        <ClientTabs client={client} />
      </main>
    </>
  );
}

function ClientHeader({ client }: { client: Record<string, unknown> }) {
  return (
    <div className="px-6 py-5 border-b border-border">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="size-16 rounded-full bg-gradient-to-br from-gold to-gold-dim border-2 border-border-accent flex items-center justify-center text-h2 font-bold text-bg-primary shrink-0">
            {client.initial as string}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/pro/clients"
                className="text-tiny text-text-muted hover:text-text-primary flex items-center gap-1"
              >
                <ArrowLeft className="size-3" /> Clients
              </Link>
              <span className="text-tiny text-text-muted">/</span>
              <span className="text-tiny text-text-primary font-medium">
                {client.name as string}
              </span>
            </div>
            <h1 className="font-display text-h1 font-semibold text-text-primary mb-2">
              {client.name as string}
            </h1>
            <div className="flex items-center gap-4 flex-wrap text-small text-text-secondary">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-text-muted" />
                {client.birth as string} · {client.birthTime as string}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-text-muted" />
                {client.place as string}
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="size-3.5 text-text-muted" />
                {client.phone as string}
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-text-muted" />
                <span className="truncate">{client.email as string}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="gold" size="md">
                <Star className="size-3 fill-gold" /> {client.lagna as string} Lagna
              </Badge>
              <Badge size="md">Moon in {client.moon as string}</Badge>
              {(client.tags as string[]).map((t) => (
                <span
                  key={t}
                  className={cn(
                    "text-tiny px-2 py-0.5 rounded-sm font-medium",
                    t === "priority"
                      ? "bg-warning/15 text-warning border border-warning/20"
                      : "bg-bg-surface-2 text-text-muted border border-border"
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="md" leftIcon={<Edit />}>
            Edit
          </Button>
          <Button variant="secondary" size="md" leftIcon={<Download />}>
            Export PDF
          </Button>
          <Button variant="primary" size="md" leftIcon={<Plus />}>
            New session
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <MiniStat label="Sessions" value={String(client.sessions)} sub="5 this year" />
        <MiniStat label="Last seen" value={client.lastSeen as string} sub="Consultation completed" />
        <MiniStat label="Pending predictions" value={String(client.pending)} sub="2 overdue" warning />
        <MiniStat label="Accuracy (Ravi)" value="92%" sub="11 of 12 verified" success />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  success,
  warning,
}: {
  label: string;
  value: string;
  sub: string;
  success?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="p-4 rounded-lg bg-bg-surface border border-border">
      <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">
        {label}
      </div>
      <div
        className={cn(
          "font-display text-h2 leading-none font-semibold",
          success ? "text-success" : warning ? "text-warning" : "text-text-primary"
        )}
      >
        {value}
      </div>
      <div className="text-tiny text-text-muted mt-1">{sub}</div>
    </div>
  );
}

function ClientTabs({ client }: { client: Record<string, unknown> }) {
  const [tab, setTab] = useState("chart");
  return (
    <div>
      <Tabs value={tab} onValueChange={setTab}>
        <div className="px-6 border-b border-border sticky top-[7.5rem] z-30 bg-bg-primary">
          <TabsList>
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="houses">Houses</TabsTrigger>
            <TabsTrigger value="dasha">Dasha</TabsTrigger>
            <TabsTrigger value="analysis">
              <Sparkles className="size-3.5" /> Analysis
            </TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
        </div>
        <div className="px-6 py-6">
          <TabsContent value="chart">
            <ChartTab />
          </TabsContent>
          <TabsContent value="houses">
            <PlaceholderTab name="Houses" description="Full 12-house deep dive with KP significators." />
          </TabsContent>
          <TabsContent value="dasha">
            <PlaceholderTab name="Dasha Timeline" description="Scrubbable Gantt showing MD → AD → PAD with planet colors." />
          </TabsContent>
          <TabsContent value="analysis">
            <PlaceholderTab name="AI Analysis" description="Topic pills + chat with Claude." />
          </TabsContent>
          <TabsContent value="sessions">
            <SessionsTab />
          </TabsContent>
          <TabsContent value="predictions">
            <PredictionsTab />
          </TabsContent>
          <TabsContent value="notes">
            <PlaceholderTab name="Notes" description="Freeform astrologer notes, searchable." />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CHART TAB — the default view
   ══════════════════════════════════════════════════════════════════ */
function ChartTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="flex flex-col gap-5 min-w-0">
        {/* Chart + planet list */}
        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-tiny uppercase tracking-wider text-gold">NATAL CHART · SOUTH INDIAN</div>
            <div className="flex items-center gap-0 p-0.5 rounded-md bg-bg-surface-2 border border-border">
              {["North", "South", "East"].map((s, i) => (
                <button
                  key={s}
                  className={cn(
                    "px-3 py-1 rounded text-tiny font-medium transition-colors",
                    i === 1
                      ? "bg-bg-elevated text-text-primary shadow-sm"
                      : "text-text-muted hover:text-text-primary"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
            <MockChart />
            <PlanetsList />
          </div>
        </div>

        {/* House overview grid */}
        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-tiny uppercase tracking-wider text-gold">HOUSE OVERVIEW</div>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight />}>
              Full breakdown
            </Button>
          </div>
          <HouseGrid />
        </div>
      </div>

      {/* Right inspector */}
      <div className="flex flex-col gap-4 min-w-0">
        <PromiseCard />
        <DashaCard />
        <AIInsightCard />
        <RulingPlanetsCard />
      </div>
    </div>
  );
}

function MockChart() {
  return (
    <div className="relative aspect-square">
      <svg viewBox="0 0 300 300" className="w-full h-full">
        <rect x="10" y="10" width="280" height="280" fill="none" stroke="var(--color-border-accent)" strokeWidth="1" />
        <line x1="10" y1="10" x2="290" y2="290" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
        <line x1="290" y1="10" x2="10" y2="290" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
        <line x1="150" y1="10" x2="10" y2="150" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
        <line x1="150" y1="10" x2="290" y2="150" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
        <line x1="150" y1="290" x2="10" y2="150" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
        <line x1="150" y1="290" x2="290" y2="150" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />

        {/* house numbers */}
        {[
          { n: 1, x: 150, y: 30 },
          { n: 2, x: 260, y: 40 },
          { n: 3, x: 280, y: 150 },
          { n: 4, x: 260, y: 260 },
          { n: 5, x: 150, y: 270 },
          { n: 6, x: 40, y: 260 },
          { n: 7, x: 20, y: 150 },
          { n: 8, x: 40, y: 40 },
          { n: 9, x: 100, y: 20 },
          { n: 10, x: 200, y: 20 },
          { n: 11, x: 200, y: 280 },
          { n: 12, x: 100, y: 280 },
        ].map((h) => (
          <text key={h.n} x={h.x} y={h.y} fill="var(--color-text-muted)" fontSize="10" textAnchor="middle">
            {h.n}
          </text>
        ))}

        {/* planet positions */}
        <text x="150" y="100" fill="var(--color-sun)" fontSize="13" fontFamily="serif" textAnchor="middle" fontWeight="600">☉ Su</text>
        <text x="150" y="118" fill="var(--color-mars)" fontSize="13" fontFamily="serif" textAnchor="middle" fontWeight="600">♂ Ma</text>
        <text x="225" y="100" fill="var(--color-moon)" fontSize="13" fontFamily="serif" textAnchor="middle" fontWeight="600">☽ Mo</text>
        <text x="70" y="100" fill="var(--color-mercury)" fontSize="13" fontFamily="serif" textAnchor="middle" fontWeight="600">☿ Me</text>
        <text x="80" y="120" fill="var(--color-venus)" fontSize="13" fontFamily="serif" textAnchor="middle" fontWeight="600">♀ Ve</text>
        <text x="150" y="200" fill="var(--color-jupiter)" fontSize="13" fontFamily="serif" textAnchor="middle" fontWeight="600">♃ Ju Sa</text>
        <text x="230" y="200" fill="var(--color-rahu)" fontSize="13" fontFamily="serif" textAnchor="middle" fontWeight="600">☊ Ra</text>
        <text x="70" y="200" fill="var(--color-ketu)" fontSize="13" fontFamily="serif" textAnchor="middle" fontWeight="600">☋ Ke</text>
        <text x="150" y="150" fill="var(--color-gold)" fontSize="13" fontFamily="serif" textAnchor="middle" fontWeight="700">Asc</text>
      </svg>
    </div>
  );
}

function PlanetsList() {
  const planets = [
    { name: "Sun", glyph: "☉", sign: "Leo", deg: "23.0°", house: 10, color: "sun" },
    { name: "Moon", glyph: "☽", sign: "Capricorn", deg: "2.3°", house: 3, color: "moon" },
    { name: "Mars", glyph: "♂", sign: "Leo", deg: "1.2°", house: 10, color: "mars" },
    { name: "Mercury", glyph: "☿", sign: "Virgo", deg: "8.4°", house: 11, color: "mercury" },
    { name: "Jupiter", glyph: "♃", sign: "Taurus", deg: "16.7°", house: 7, color: "jupiter" },
    { name: "Venus", glyph: "♀", sign: "Virgo", deg: "17.3°", house: 11, color: "venus" },
    { name: "Saturn", glyph: "♄", sign: "Taurus", deg: "7.1°", house: 7, color: "saturn" },
    { name: "Rahu", glyph: "☊", sign: "Gemini", deg: "27.8°", house: 8, color: "rahu", retro: true },
    { name: "Ketu", glyph: "☋", sign: "Sagittarius", deg: "27.8°", house: 2, color: "ketu", retro: true },
  ];
  return (
    <div className="flex flex-col gap-1 text-small overflow-x-auto">
      <div className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] gap-3 pb-2 border-b border-border text-tiny uppercase tracking-wider text-text-muted">
        <div></div>
        <div>Planet</div>
        <div>Sign</div>
        <div className="font-mono">Deg</div>
        <div>Ho</div>
      </div>
      {planets.map((p) => (
        <div
          key={p.name}
          className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] gap-3 py-1.5 items-center text-small hover:bg-bg-hover rounded-sm px-1 -mx-1 transition-colors"
        >
          <div
            className="font-serif text-body"
            style={{ color: `var(--color-${p.color})` }}
          >
            {p.glyph}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-primary">{p.name}</span>
            {p.retro && (
              <span className="text-tiny text-warning font-mono">R</span>
            )}
          </div>
          <div className="text-text-secondary">{p.sign}</div>
          <div className="font-mono text-tiny text-text-muted">{p.deg}</div>
          <div className="font-mono text-tiny bg-gold-glow text-gold px-1.5 rounded">{p.house}</div>
        </div>
      ))}
    </div>
  );
}

function HouseGrid() {
  const houses = [
    { n: 1, sign: "Scorpio", theme: "Self & Personality", planets: [] },
    { n: 2, sign: "Sagittarius", theme: "Wealth & Family", planets: ["Ketu"] },
    { n: 3, sign: "Capricorn", theme: "Courage & Siblings", planets: ["Moon"] },
    { n: 4, sign: "Aquarius", theme: "Home & Mother", planets: [] },
    { n: 5, sign: "Pisces", theme: "Creativity & Children", planets: [] },
    { n: 6, sign: "Aries", theme: "Health & Service", planets: [] },
    { n: 7, sign: "Taurus", theme: "Marriage & Partnership", planets: ["Jupiter", "Saturn"] },
    { n: 8, sign: "Gemini", theme: "Change & Mystery", planets: ["Rahu"] },
    { n: 9, sign: "Cancer", theme: "Luck & Dharma", planets: [] },
    { n: 10, sign: "Leo", theme: "Career & Reputation", planets: ["Sun", "Mars"] },
    { n: 11, sign: "Virgo", theme: "Gains & Network", planets: ["Mercury", "Venus"] },
    { n: 12, sign: "Libra", theme: "Spirituality & Loss", planets: [] },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {houses.map((h) => (
        <div
          key={h.n}
          className="p-3 rounded-md bg-bg-surface-2 border border-border hover:border-border-strong transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="text-tiny text-text-muted font-mono">H{h.n}</div>
            {h.planets.length > 0 && (
              <div className="flex gap-0.5">
                {h.planets.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] px-1 rounded-sm bg-gold-glow text-gold font-mono"
                  >
                    {p.slice(0, 2)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-small font-medium text-text-primary mb-0.5">
            {h.sign}
          </div>
          <div className="text-tiny text-text-muted leading-tight">
            {h.theme}
          </div>
        </div>
      ))}
    </div>
  );
}

function PromiseCard() {
  return (
    <div className="p-4 rounded-xl bg-bg-surface border-2 border-gold shadow-[var(--shadow-glow)]">
      <div className="text-tiny uppercase tracking-wider text-gold mb-2 flex items-center gap-1.5">
        <Target className="size-3" /> KP VERDICT · MARRIAGE
      </div>
      <div className="font-display text-h3 font-semibold text-text-primary mb-1">
        Promised
      </div>
      <div className="text-small text-text-secondary mb-3">
        H7 CSL <span className="text-gold font-mono">Jupiter</span> signifies
        H2, H7, H11 — all favorable.
      </div>
      <div className="flex items-center gap-2 text-tiny">
        <Badge variant="success" size="sm">
          <CheckCircle2 className="size-3" /> 3 sigs
        </Badge>
        <Badge variant="gold" size="sm">
          Venus · strong
        </Badge>
      </div>
    </div>
  );
}

function DashaCard() {
  return (
    <div className="p-4 rounded-xl bg-bg-surface border border-border">
      <div className="text-tiny uppercase tracking-wider text-text-muted mb-2">
        CURRENT DASHA
      </div>
      <div className="space-y-2.5">
        <DashaRow label="MD" planet="Saturn" until="Aug 2027" color="saturn" />
        <DashaRow label="AD" planet="Mercury" until="Jan 2026" color="mercury" />
        <DashaRow label="PAD" planet="Venus" until="Nov 2025" color="venus" />
      </div>
      <button className="text-tiny text-gold mt-3 hover:text-gold-bright flex items-center gap-1">
        Open timeline <ChevronRight className="size-3" />
      </button>
    </div>
  );
}

function DashaRow({ label, planet, until, color }: { label: string; planet: string; until: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-small">
      <div className="text-tiny uppercase tracking-wider text-text-muted w-8 font-mono">{label}</div>
      <div
        className="size-2 rounded-full"
        style={{ background: `var(--color-${color})` }}
      />
      <div className="text-text-primary font-medium flex-1">{planet}</div>
      <div className="text-tiny text-text-muted font-mono">until {until}</div>
    </div>
  );
}

function AIInsightCard() {
  return (
    <div className="p-4 rounded-xl bg-[color-mix(in_srgb,var(--color-ai)_6%,var(--color-bg-surface))] border border-[color-mix(in_srgb,var(--color-ai)_25%,transparent)]">
      <div className="text-tiny uppercase tracking-wider text-ai mb-2 flex items-center gap-1.5">
        <Sparkles className="size-3" /> AI INSIGHT
      </div>
      <div className="text-small text-text-primary leading-relaxed mb-3">
        Last consultation: you predicted &ldquo;job by June.&rdquo; Saturn MD
        ends <span className="text-gold font-medium">Aug 2027</span>. Consider
        asking Ravi about outcome in today&apos;s session.
      </div>
      <Button variant="ai" size="sm" leftIcon={<MessageCircle />} fullWidth>
        Ask Claude about this chart
      </Button>
    </div>
  );
}

function RulingPlanetsCard() {
  const rps = [
    { role: "Day Lord", planet: "Thursday · Jupiter", color: "jupiter" },
    { role: "Lagna Sign", planet: "Mars", color: "mars" },
    { role: "Lagna Star", planet: "Saturn", color: "saturn" },
    { role: "Moon Sign", planet: "Saturn", color: "saturn" },
    { role: "Moon Star", planet: "Mars", color: "mars" },
  ];
  return (
    <div className="p-4 rounded-xl bg-bg-surface border border-border">
      <div className="text-tiny uppercase tracking-wider text-text-muted mb-3">
        RULING PLANETS · NOW
      </div>
      <div className="space-y-2">
        {rps.map((r) => (
          <div key={r.role} className="flex items-center gap-2.5 text-tiny">
            <div className="text-text-muted w-16">{r.role}</div>
            <div
              className="size-2 rounded-full"
              style={{ background: `var(--color-${r.color})` }}
            />
            <div className="text-text-primary font-medium flex-1">{r.planet}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SESSIONS TAB
   ══════════════════════════════════════════════════════════════════ */
function SessionsTab() {
  const sessions = [
    { date: "Apr 16, 2026", time: "9:30 AM", topic: "Career transition", summary: "Discussed job change. I said Saturn MD (ends Aug 2027) supports steady progress. Advised patience until Mercury AD begins.", duration: "52m" },
    { date: "Mar 8, 2026", time: "5:00 PM", topic: "Job by June", summary: "Prediction: job offer between Apr–Jun 2026. H10 CSL Sun in Leo + Mercury AD activation. Advised actively interviewing.", duration: "45m" },
    { date: "Jan 12, 2026", time: "11:00 AM", topic: "New year outlook", summary: "Overall year-review. Strong H11 activation. Marriage possible late 2026 if approached.", duration: "60m" },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-tiny uppercase tracking-wider text-gold">12 SESSIONS · ALL-TIME</div>
        <Button variant="primary" size="sm" leftIcon={<Plus />}>New session</Button>
      </div>
      {sessions.map((s) => (
        <div key={s.date} className="p-5 rounded-xl bg-bg-surface border border-border hover:border-border-strong transition-colors">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-tiny uppercase tracking-wider text-gold">{s.date} · {s.time}</div>
                <Badge size="sm">
                  <Clock className="size-3" /> {s.duration}
                </Badge>
              </div>
              <div className="font-display text-h3 font-semibold text-text-primary">
                {s.topic}
              </div>
            </div>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight />}>
              Open
            </Button>
          </div>
          <div className="rounded-lg bg-[color-mix(in_srgb,var(--color-ai)_5%,transparent)] border border-[color-mix(in_srgb,var(--color-ai)_20%,transparent)] p-3">
            <div className="text-tiny uppercase tracking-wider text-ai mb-1 flex items-center gap-1">
              <Sparkles className="size-3" /> AI SUMMARY
            </div>
            <div className="text-small text-text-secondary leading-relaxed">
              {s.summary}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PREDICTIONS TAB
   ══════════════════════════════════════════════════════════════════ */
function PredictionsTab() {
  const preds = [
    { text: "Job offer by June 2026", domain: "career", window: "Apr–Jun 2026", outcome: "correct", basis: "H10 CSL Sun + Mercury AD" },
    { text: "House construction resumes", domain: "property", window: "Apr 2026", outcome: "correct", basis: "H4 CSL Saturn + Mars RP" },
    { text: "Marriage discussions begin", domain: "marriage", window: "Oct 2026", outcome: "pending", basis: "H7 CSL Jupiter · Venus Mdasha" },
    { text: "Foreign opportunity emerges", domain: "foreign", window: "Jul 2027", outcome: "pending", basis: "H9 CSL Mercury + Rahu transit" },
    { text: "Health flare-up (avoid heat)", domain: "health", window: "May–Jul 2026", outcome: "partial", basis: "Sun + Mars in H10 stress" },
  ];
  const badges = {
    correct: { variant: "success" as const, label: "Correct" },
    partial: { variant: "warning" as const, label: "Partial" },
    wrong: { variant: "error" as const, label: "Wrong" },
    pending: { variant: "default" as const, label: "Pending" },
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
        <MiniStat label="Total predictions" value="12" sub="For this client" />
        <MiniStat label="Correct" value="11" sub="92%" success />
        <MiniStat label="Partial" value="1" sub="Health related" warning />
        <MiniStat label="Pending" value="2" sub="Verification open" />
      </div>
      <div className="rounded-xl bg-bg-surface border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-bg-surface-2 border-b border-border">
              <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Prediction</th>
              <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Domain</th>
              <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Window</th>
              <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">KP Basis</th>
              <th className="text-center text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {preds.map((p) => (
              <tr key={p.text} className="hover:bg-bg-hover transition-colors">
                <td className="px-4 py-3 text-small text-text-primary">{p.text}</td>
                <td className="px-4 py-3 text-small text-text-secondary capitalize">{p.domain}</td>
                <td className="px-4 py-3 text-small text-text-muted font-mono">{p.window}</td>
                <td className="px-4 py-3 text-tiny text-text-muted font-mono">{p.basis}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={badges[p.outcome as keyof typeof badges].variant} size="sm">
                    {badges[p.outcome as keyof typeof badges].label}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PLACEHOLDER TAB
   ══════════════════════════════════════════════════════════════════ */
function PlaceholderTab({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="size-14 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-gold mb-4">
        <FileText className="size-6" />
      </div>
      <div className="font-display text-h2 font-semibold text-text-primary mb-2">
        {name}
      </div>
      <div className="text-body text-text-secondary max-w-md mb-6">
        {description}
      </div>
      <Badge variant="ai" size="md">
        <Sparkles className="size-3.5" /> Coming in Phase 3
      </Badge>
    </div>
  );
}
