"use client";

import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Plus,
  Briefcase,
  Heart,
  Home,
  Plane,
  BookOpen,
  Calendar,
  Users,
  Target,
} from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardLabel, CardTitle } from "@/components/ui/card";
import { useClientsList } from "@/hooks/use-clients";
import { useAccuracySummary } from "@/hooks/use-predictions";
import { useFollowupsList, useUpdateFollowup } from "@/hooks/use-followups";
import { useSessionsList } from "@/hooks/use-sessions";
import { cn } from "@/lib/utils";

export default function ProDashboardPage() {
  return (
    <>
      <TopBar title="Welcome back" />
      <main className="px-6 pb-12 pt-6 max-w-[1400px] mx-auto">
        <KPIRow />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
          <div className="flex flex-col gap-6 min-w-0">
            <TodaysConsultations />
            <RecentClients />
            <PredictionScoreboard />
          </div>
          <div className="flex flex-col gap-6 min-w-0">
            <FollowUps />
            <WelcomeBriefing />
          </div>
        </div>
      </main>
    </>
  );
}

function KPIRow() {
  const { data: clients } = useClientsList();
  const { data: accuracy } = useAccuracySummary();
  const { data: followups } = useFollowupsList();
  const { data: todaySessions } = useSessionsList();

  const activeClients = clients?.total ?? 0;
  const accPct = accuracy?.accuracy_pct ?? 0;
  const overdue = followups?.overdue ?? 0;

  const today = new Date();
  const sameDay = (d: string) => new Date(d).toDateString() === today.toDateString();
  const todayCount = (todaySessions?.items ?? []).filter((s) => sameDay(s.scheduled_at)).length;

  const kpis = [
    {
      label: "Today's consults",
      value: String(todayCount),
      sub: todayCount === 0 ? "Nothing scheduled" : `${todayCount} scheduled`,
      accent: "gold",
      icon: <Calendar className="size-4" />,
    },
    {
      label: "Active clients",
      value: String(activeClients),
      sub: activeClients === 0 ? "Add your first" : "In your directory",
      accent: "default",
      icon: <Users className="size-4" />,
    },
    {
      label: "Prediction accuracy",
      value: accuracy?.total ? `${accPct}%` : "—",
      sub: accuracy?.total
        ? `${accuracy.correct}/${accuracy.total} verified`
        : "Log to start tracking",
      accent: "success",
      icon: <TrendingUp className="size-4" />,
    },
    {
      label: "Pending follow-ups",
      value: String(followups?.total ?? 0),
      sub: overdue > 0 ? `${overdue} overdue` : "All caught up",
      accent: overdue > 0 ? "warning" : "default",
      icon: <AlertCircle className="size-4" />,
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
          <div className="font-display text-[clamp(1.75rem,3vw,2.25rem)] leading-none font-bold text-text-primary">
            {k.value}
          </div>
          <div className="text-tiny text-text-muted mt-2">{k.sub}</div>
        </div>
      ))}
    </div>
  );
}

function TodaysConsultations() {
  const { data } = useSessionsList();
  const today = new Date();
  const sameDay = (d: string) => new Date(d).toDateString() === today.toDateString();
  const items = (data?.items ?? []).filter((s) => sameDay(s.scheduled_at));

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <CardLabel>TODAY · {items.length} SESSIONS</CardLabel>
          <CardTitle className="text-h3 mt-1">Today&apos;s consultations</CardTitle>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-8 text-center text-small text-text-muted">
          No sessions today. Open a client and start a walk-in when they
          arrive.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((s) => (
            <Link
              key={s.id}
              href={`/pro/clients/${s.client_id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-bg-hover transition-colors cursor-pointer group"
            >
              <div className="text-tiny text-text-muted font-mono w-16 shrink-0">
                {new Date(s.scheduled_at).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-small font-medium text-text-primary truncate">
                  {s.query_text || s.session_type}
                </div>
              </div>
              <Badge
                size="sm"
                variant={
                  s.status === "completed"
                    ? "success"
                    : s.status === "in_progress"
                    ? "gold"
                    : "default"
                }
              >
                {s.status === "completed" && (
                  <>
                    <CheckCircle2 className="size-3" /> Done
                  </>
                )}
                {s.status === "in_progress" && (
                  <>
                    <Clock className="size-3" /> Live
                  </>
                )}
                {s.status === "scheduled" && <>Upcoming</>}
              </Badge>
              <ChevronRight className="size-4 text-text-muted group-hover:text-text-primary transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

function RecentClients() {
  const { data } = useClientsList({ include_archived: false });
  const clients = (data?.items ?? []).slice(0, 6);

  if (clients.length === 0) {
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
          <Button variant="primary" size="sm" leftIcon={<Plus />} asChild>
            <Link href="/pro/clients">Add your first client</Link>
          </Button>
        </div>
        <div className="p-10 rounded-xl border-2 border-dashed border-border-strong text-center">
          <div className="size-12 mx-auto mb-3 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-gold">
            <Users className="size-5" />
          </div>
          <div className="text-body text-text-primary font-medium mb-1">
            No clients yet
          </div>
          <div className="text-small text-text-muted">
            Add clients to start tracking their charts, sessions, and predictions.
          </div>
        </div>
      </div>
    );
  }

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
          <Link href="/pro/clients">All {data?.total ?? 0} clients</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/pro/clients/${c.id}`}
            className="p-4 rounded-xl bg-bg-surface border border-border hover:border-border-accent transition-all group"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="size-10 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-body font-semibold text-gold shrink-0">
                {c.full_name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-small font-medium text-text-primary truncate">
                  {c.full_name}
                </div>
                <div className="text-tiny text-text-muted truncate">
                  {c.birth_place}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {c.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-sm font-medium",
                    t === "priority"
                      ? "bg-warning/15 text-warning"
                      : "bg-bg-surface-2 text-text-muted border border-border"
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PredictionScoreboard() {
  const { data } = useAccuracySummary();

  const DOMAIN_ICONS: Record<string, React.ReactNode> = {
    career: <Briefcase className="size-4" />,
    marriage: <Heart className="size-4" />,
    foreign: <Plane className="size-4" />,
    property: <Home className="size-4" />,
    education: <BookOpen className="size-4" />,
    health: <AlertCircle className="size-4" />,
    travel: <Plane className="size-4" />,
    finance: <TrendingUp className="size-4" />,
  };

  if (!data || data.total === 0) {
    return (
      <Card padding="lg">
        <CardLabel className="mb-2">PREDICTION SCOREBOARD</CardLabel>
        <CardTitle className="mb-4">Your track record</CardTitle>
        <div className="p-8 rounded-lg bg-bg-surface-2 border border-dashed border-border-strong text-center">
          <Target className="size-10 mx-auto mb-3 text-gold opacity-50" />
          <div className="text-body text-text-primary font-medium mb-1">
            No predictions logged yet
          </div>
          <div className="text-small text-text-muted">
            Open a client → Predictions tab → log your first prediction with a
            target date window. Mark outcomes later to build accuracy.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <CardLabel>PREDICTION ACCURACY · ALL TIME</CardLabel>
          <CardTitle className="text-h3 mt-1">Your track record</CardTitle>
        </div>
        <div className="text-right">
          <div className="font-display text-h2 leading-none font-bold text-gold">
            {data.accuracy_pct}%
          </div>
          <div className="text-tiny text-text-muted mt-1">
            {data.correct} / {data.total}
          </div>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {data.by_domain.map((d) => (
          <div key={d.domain} className="flex items-center gap-4">
            <div className="w-28 flex items-center gap-2 text-small text-text-primary capitalize">
              <span className="text-text-muted">{DOMAIN_ICONS[d.domain] ?? <Target className="size-4" />}</span>
              {d.domain}
            </div>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-bg-surface-2 overflow-hidden">
                <div
                  className={
                    d.accuracy_pct >= 80
                      ? "h-full bg-success"
                      : d.accuracy_pct >= 60
                      ? "h-full bg-warning"
                      : "h-full bg-error"
                  }
                  style={{ width: `${d.accuracy_pct}%` }}
                />
              </div>
            </div>
            <div className="text-tiny font-mono text-text-muted w-20 text-right">
              {d.correct}/{d.total} · <span className="text-text-primary">{d.accuracy_pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FollowUps() {
  const { data } = useFollowupsList();
  const update = useUpdateFollowup();
  const items = data?.items ?? [];
  const now = new Date();

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <CardLabel>FOLLOW-UPS</CardLabel>
          <CardTitle className="text-h3 mt-1">Your to-dos</CardTitle>
        </div>
        {data?.overdue && data.overdue > 0 ? (
          <Badge variant="warning" size="sm">
            {data.overdue} overdue
          </Badge>
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className="p-8 text-center text-small text-text-muted">
          No follow-ups pending. Add them from any client page.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.slice(0, 5).map((f) => {
            const due = new Date(f.due_at);
            const overdue = due < now;
            return (
              <div key={f.id} className="flex items-start gap-3 px-5 py-3.5 group">
                <button
                  onClick={() => update.mutate({ id: f.id, body: { completed: true } })}
                  className="mt-0.5 size-5 rounded-full border-2 border-border hover:border-gold transition-colors shrink-0"
                  title="Mark complete"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-small text-text-primary leading-snug mb-0.5">
                    {f.note}
                  </div>
                  <div className="text-tiny text-text-muted">
                    {f.source} · {due.toLocaleDateString()}
                  </div>
                </div>
                <Badge
                  variant={overdue ? "error" : "default"}
                  size="sm"
                  className="shrink-0"
                >
                  {overdue ? "Overdue" : formatRelativeDue(due)}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function WelcomeBriefing() {
  const { data: clients } = useClientsList();
  const n = clients?.total ?? 0;
  return (
    <div className="rounded-xl p-5 bg-[color-mix(in_srgb,var(--color-ai)_6%,var(--color-bg-surface))] border border-[color-mix(in_srgb,var(--color-ai)_25%,transparent)]">
      <div className="flex items-start gap-3 mb-4">
        <div className="size-10 rounded-lg bg-[color-mix(in_srgb,var(--color-ai)_18%,transparent)] border border-[color-mix(in_srgb,var(--color-ai)_30%,transparent)] flex items-center justify-center text-ai shrink-0">
          <Sparkles className="size-4" />
        </div>
        <div>
          <div className="text-tiny uppercase tracking-wider text-ai font-medium mb-0.5">
            GETTING STARTED
          </div>
          <div className="text-small font-semibold text-text-primary">
            {n === 0
              ? "Let's get you set up"
              : n < 5
              ? "Build your practice"
              : "Your practice is live"}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 text-small text-text-secondary leading-relaxed">
        {n === 0 && (
          <>
            <p>
              <strong className="text-text-primary">Step 1:</strong> Add your
              first client on the Clients page. Their KP chart is computed
              instantly via Swiss Ephemeris.
            </p>
            <p>
              <strong className="text-text-primary">Step 2:</strong> Start a
              walk-in session when they arrive. Take notes, then let AI
              summarize.
            </p>
            <p>
              <strong className="text-text-primary">Step 3:</strong> Log every
              prediction with a target window. Accuracy scoreboard builds over
              time.
            </p>
          </>
        )}
        {n > 0 && (
          <p>
            You have <strong className="text-text-primary">{n}</strong> client
            {n > 1 ? "s" : ""} in your directory. Open any of them to see their
            real KP chart, start sessions, and log predictions.
          </p>
        )}
      </div>
      <Button variant="ghost" size="sm" rightIcon={<ArrowRight />} className="mt-4" asChild>
        <Link href="/pro/clients">Go to clients</Link>
      </Button>
    </div>
  );
}

function formatRelativeDue(d: Date): string {
  const diffMs = d.getTime() - Date.now();
  const days = Math.ceil(diffMs / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.ceil(days / 7)}w`;
  return d.toLocaleDateString();
}
