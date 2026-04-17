"use client";

import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Target,
  ArrowRight,
  ChevronRight,
  Plus,
  Briefcase,
  Heart,
  Home,
  Plane,
  BookOpen,
  Calendar,
  MessageCircle,
} from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardLabel, CardTitle } from "@/components/ui/card";

export default function ProDashboardPage() {
  return (
    <>
      <TopBar title="Good evening, Manyue" />
      <main className="px-6 pb-12 pt-6 max-w-[1400px] mx-auto">
        <KPIRow />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
          <div className="flex flex-col gap-6 min-w-0">
            <TodaysConsultations />
            <RecentClients />
            <PredictionScoreboard />
          </div>
          <div className="flex flex-col gap-6 min-w-0">
            <AIBriefing />
            <FollowUps />
            <UpcomingDashaTransits />
          </div>
        </div>
      </main>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   KPI ROW — 4 big numbers
   ══════════════════════════════════════════════════════════════════ */
function KPIRow() {
  const kpis = [
    {
      label: "Today's consults",
      value: "3",
      sub: "2 completed · 1 upcoming",
      accent: "gold",
      icon: <Calendar className="size-4" />,
      trend: null,
    },
    {
      label: "Active clients",
      value: "87",
      sub: "+4 this month",
      accent: "default",
      icon: <CheckCircle2 className="size-4" />,
      trend: "up",
    },
    {
      label: "Prediction accuracy",
      value: "87",
      unit: "%",
      sub: "75/87 verified correct",
      accent: "success",
      icon: <TrendingUp className="size-4" />,
      trend: "up",
    },
    {
      label: "Pending follow-ups",
      value: "6",
      sub: "3 overdue",
      accent: "warning",
      icon: <AlertCircle className="size-4" />,
      trend: null,
    },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="p-5 rounded-xl bg-bg-surface border border-border hover:border-border-strong transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className={
                k.accent === "gold"
                  ? "text-gold"
                  : k.accent === "success"
                  ? "text-success"
                  : k.accent === "warning"
                  ? "text-warning"
                  : "text-text-muted"
              }
            >
              {k.icon}
            </div>
            <div className="text-tiny uppercase tracking-wider text-text-muted">
              {k.label}
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <div className="font-display text-[clamp(1.75rem,3vw,2.25rem)] leading-none font-bold text-text-primary">
              {k.value}
            </div>
            {k.unit && <div className="text-h3 text-text-muted">{k.unit}</div>}
          </div>
          <div className="text-tiny text-text-muted mt-2">{k.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TODAY'S CONSULTATIONS — timeline
   ══════════════════════════════════════════════════════════════════ */
function TodaysConsultations() {
  const consults = [
    {
      time: "9:30 AM",
      client: "Ravi Kumar",
      initial: "R",
      topic: "Career transition — software to consulting",
      status: "completed",
      duration: "52m",
    },
    {
      time: "11:00 AM",
      client: "Priya Sharma",
      initial: "P",
      topic: "Marriage muhurtha for brother",
      status: "completed",
      duration: "38m",
    },
    {
      time: "4:30 PM",
      client: "Mohan Reddy",
      initial: "M",
      topic: "Horary: will visa arrive?",
      status: "upcoming",
      duration: null,
    },
  ];
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <CardLabel>TODAY · 3 CONSULTATIONS</CardLabel>
          <CardTitle className="text-h3 mt-1">Sessions for today</CardTitle>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<Plus />}>
          Schedule
        </Button>
      </div>
      <div className="divide-y divide-border">
        {consults.map((c) => (
          <div
            key={c.time}
            className="flex items-center gap-4 px-5 py-4 hover:bg-bg-hover transition-colors cursor-pointer group"
          >
            <div className="text-tiny text-text-muted font-mono w-16 shrink-0">
              {c.time}
            </div>
            <div className="size-9 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-small font-semibold text-gold shrink-0">
              {c.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-small font-medium text-text-primary truncate">
                {c.client}
              </div>
              <div className="text-tiny text-text-muted truncate">{c.topic}</div>
            </div>
            <div className="flex items-center gap-3">
              {c.status === "completed" ? (
                <>
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="size-3" /> Done · {c.duration}
                  </Badge>
                </>
              ) : (
                <Badge variant="gold" size="sm">
                  <Clock className="size-3" /> Upcoming
                </Badge>
              )}
              <ChevronRight className="size-4 text-text-muted group-hover:text-text-primary transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════
   RECENT CLIENTS — 6 cards
   ══════════════════════════════════════════════════════════════════ */
function RecentClients() {
  const clients = [
    {
      name: "Ravi Kumar",
      initial: "R",
      lagna: "Scorpio",
      dasha: "Saturn · Mercury",
      lastSeen: "today",
      pending: 3,
    },
    {
      name: "Priya Sharma",
      initial: "P",
      lagna: "Libra",
      dasha: "Jupiter · Saturn",
      lastSeen: "today",
      pending: 1,
    },
    {
      name: "Mohan Reddy",
      initial: "M",
      lagna: "Gemini",
      dasha: "Mars · Venus",
      lastSeen: "today",
      pending: 0,
    },
    {
      name: "Lakshmi Devi",
      initial: "L",
      lagna: "Cancer",
      dasha: "Venus · Moon",
      lastSeen: "3 days ago",
      pending: 2,
    },
    {
      name: "Sunita Patel",
      initial: "S",
      lagna: "Virgo",
      dasha: "Moon · Mars",
      lastSeen: "1 week ago",
      pending: 0,
    },
    {
      name: "Vijay Bhaskar",
      initial: "V",
      lagna: "Aquarius",
      dasha: "Mercury · Ketu",
      lastSeen: "2 weeks ago",
      pending: 4,
    },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-tiny uppercase tracking-wider text-gold mb-1">
            RECENT CLIENTS
          </div>
          <h2 className="text-h3 font-display font-semibold text-text-primary">
            Quick jump
          </h2>
        </div>
        <Button variant="ghost" size="sm" rightIcon={<ArrowRight />} asChild>
          <Link href="/pro/clients">All 87 clients</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {clients.map((c) => (
          <Link
            key={c.name}
            href={`/pro/clients/${c.name.toLowerCase().replace(/ /g, "-")}`}
            className="p-4 rounded-xl bg-bg-surface border border-border hover:border-border-accent transition-all group"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="size-10 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-body font-semibold text-gold shrink-0">
                {c.initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-small font-medium text-text-primary truncate">
                  {c.name}
                </div>
                <div className="text-tiny text-text-muted truncate">
                  {c.lagna} Lagna
                </div>
              </div>
              {c.pending > 0 && (
                <Badge variant="warning" size="sm">
                  {c.pending}
                </Badge>
              )}
            </div>
            <div className="text-tiny text-text-muted flex items-center gap-2 mb-1">
              <TrendingUp className="size-3" />
              <span className="font-mono">{c.dasha}</span>
            </div>
            <div className="text-tiny text-text-muted flex items-center gap-2">
              <Clock className="size-3" />
              Last seen {c.lastSeen}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PREDICTION SCOREBOARD
   ══════════════════════════════════════════════════════════════════ */
function PredictionScoreboard() {
  const domains = [
    { label: "Career", icon: <Briefcase className="size-4" />, total: 31, correct: 25 },
    { label: "Marriage", icon: <Heart className="size-4" />, total: 24, correct: 21 },
    { label: "Foreign", icon: <Plane className="size-4" />, total: 8, correct: 7 },
    { label: "Property", icon: <Home className="size-4" />, total: 12, correct: 10 },
    { label: "Education", icon: <BookOpen className="size-4" />, total: 7, correct: 6 },
    { label: "Health", icon: <AlertCircle className="size-4" />, total: 5, correct: 4 },
  ];
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <CardLabel>PREDICTION ACCURACY · LAST 90 DAYS</CardLabel>
          <CardTitle className="text-h3 mt-1">Your track record</CardTitle>
        </div>
        <div className="text-right">
          <div className="font-display text-h2 leading-none font-bold text-gold">
            87%
          </div>
          <div className="text-tiny text-text-muted mt-1">75 of 87</div>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {domains.map((d) => {
          const pct = Math.round((d.correct / d.total) * 100);
          return (
            <div key={d.label} className="flex items-center gap-4">
              <div className="w-28 flex items-center gap-2 text-small text-text-primary">
                <span className="text-text-muted">{d.icon}</span>
                {d.label}
              </div>
              <div className="flex-1">
                <div className="h-2 rounded-full bg-bg-surface-2 overflow-hidden">
                  <div
                    className={
                      pct >= 80
                        ? "h-full bg-success"
                        : pct >= 60
                        ? "h-full bg-warning"
                        : "h-full bg-error"
                    }
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="text-tiny font-mono text-text-muted w-20 text-right">
                {d.correct}/{d.total} · <span className="text-text-primary">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════
   AI BRIEFING — daily
   ══════════════════════════════════════════════════════════════════ */
function AIBriefing() {
  return (
    <div className="rounded-xl p-5 bg-[color-mix(in_srgb,var(--color-ai)_6%,var(--color-bg-surface))] border border-[color-mix(in_srgb,var(--color-ai)_25%,transparent)]">
      <div className="flex items-start gap-3 mb-4">
        <div className="size-10 rounded-lg bg-[color-mix(in_srgb,var(--color-ai)_18%,transparent)] border border-[color-mix(in_srgb,var(--color-ai)_30%,transparent)] flex items-center justify-center text-ai shrink-0">
          <Sparkles className="size-4" />
        </div>
        <div>
          <div className="text-tiny uppercase tracking-wider text-ai font-medium mb-0.5">
            DAILY BRIEFING
          </div>
          <div className="text-small font-semibold text-text-primary">
            3 things to notice today
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 text-small text-text-secondary leading-relaxed">
        <p>
          <strong className="text-text-primary">Ravi Kumar&apos;s</strong>{" "}
          Saturn Mahadasha ends <span className="text-gold">Aug 2027</span>.
          Last year you predicted &ldquo;job by June&rdquo; — worth following
          up on outcome in today&apos;s session.
        </p>
        <p>
          <strong className="text-text-primary">6 clients</strong> are entering
          a new Antardasha this week. Consider proactive outreach for{" "}
          <span className="text-warning font-medium">Kuja Dosha</span>{" "}
          natives.
        </p>
        <p>
          Your <strong className="text-success">Marriage accuracy is 88%</strong>{" "}
          (21/24). Consider publishing a case study — you&apos;re in the top
          decile.
        </p>
      </div>
      <Button variant="ghost" size="sm" rightIcon={<ArrowRight />} className="mt-4">
        Open full briefing
      </Button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FOLLOW-UPS
   ══════════════════════════════════════════════════════════════════ */
function FollowUps() {
  const items = [
    {
      client: "Ravi Kumar",
      initial: "R",
      note: "Check job outcome — predicted by June",
      due: "Overdue",
      urgent: true,
    },
    {
      client: "Lakshmi Devi",
      initial: "L",
      note: "Verify marriage muhurtha outcome (Apr 22)",
      due: "2 days",
      urgent: false,
    },
    {
      client: "Vijay Bhaskar",
      initial: "V",
      note: "Saturn Sade Sati — schedule checkup",
      due: "1 week",
      urgent: false,
    },
  ];
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <CardLabel>FOLLOW-UPS</CardLabel>
          <CardTitle className="text-h3 mt-1">Due this week</CardTitle>
        </div>
        <Badge variant="warning" size="sm">3 overdue</Badge>
      </div>
      <div className="divide-y divide-border">
        {items.map((i) => (
          <div
            key={i.client}
            className="flex items-start gap-3 px-5 py-3.5 hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <div className="size-8 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-small font-semibold text-gold shrink-0">
              {i.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-small text-text-primary font-medium mb-0.5">
                {i.client}
              </div>
              <div className="text-tiny text-text-secondary leading-snug">
                {i.note}
              </div>
            </div>
            <Badge
              variant={i.urgent ? "error" : "default"}
              size="sm"
              className="shrink-0"
            >
              {i.due}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════
   UPCOMING DASHA TRANSITIONS
   ══════════════════════════════════════════════════════════════════ */
function UpcomingDashaTransits() {
  const items = [
    {
      client: "Sunita Patel",
      initial: "S",
      from: "Moon MD",
      to: "Mars MD",
      when: "Oct 12",
    },
    {
      client: "Ravi Kumar",
      initial: "R",
      from: "Sat/Me",
      to: "Sat/Ke",
      when: "Oct 28",
    },
    {
      client: "Mohan Reddy",
      initial: "M",
      from: "Mars/Ra",
      to: "Mars/Ju",
      when: "Nov 4",
    },
  ];
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <CardLabel>DASHA TRANSITIONS</CardLabel>
          <CardTitle className="text-h3 mt-1">Next 30 days</CardTitle>
        </div>
        <Target className="size-4 text-gold" />
      </div>
      <div className="divide-y divide-border">
        {items.map((i) => (
          <div
            key={i.client}
            className="flex items-center gap-3 px-5 py-3.5 hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <div className="size-8 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-small font-semibold text-gold shrink-0">
              {i.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-small text-text-primary font-medium">{i.client}</div>
              <div className="text-tiny text-text-muted font-mono">
                {i.from} → {i.to}
              </div>
            </div>
            <div className="text-tiny text-text-muted shrink-0">{i.when}</div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-border bg-bg-surface-2/30">
        <button className="text-tiny text-ai flex items-center gap-1.5 hover:text-ai-bright transition-colors">
          <MessageCircle className="size-3" />
          Draft follow-up message for all 3
        </button>
      </div>
    </Card>
  );
}
