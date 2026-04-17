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
  Users,
  Target,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Surface, SurfaceHeader, Divider } from "@/components/ui/surface";
import { useClientsList } from "@/hooks/use-clients";
import { useAccuracySummary } from "@/hooks/use-predictions";
import { useFollowupsList, useUpdateFollowup } from "@/hooks/use-followups";
import { useSessionsList } from "@/hooks/use-sessions";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

export default function ProDashboardPage() {
  const { data: me } = useMe();
  const firstName = (me?.full_name ?? "").split(" ")[0] || "there";

  const today = new Date();
  const weekday = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  return (
    <main className="px-8 pt-10 pb-16 max-w-[1400px] mx-auto fade-up">
      <PageHeader
        eyebrow={`${weekday}, ${dateStr}`}
        title={`Good ${greetingHour()}, ${firstName}`}
        description="Your practice at a glance — today's schedule, recent clients, and prediction accuracy."
        actions={
          <>
            <Button variant="secondary" size="md" leftIcon={<Plus />} asChild>
              <Link href="/pro/clients">Add client</Link>
            </Button>
          </>
        }
      />

      <KPIRow />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-10">
        <div className="flex flex-col gap-8 min-w-0">
          <TodayPanel />
          <RecentClientsPanel />
          <ScoreboardPanel />
        </div>
        <div className="flex flex-col gap-6 min-w-0">
          <FollowUpsPanel />
          <BriefingPanel />
          <QuickActionsPanel />
        </div>
      </div>
    </main>
  );
}

function greetingHour() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

/* ═══════════════════════════════════════════════════════════════
   KPI ROW
   ═══════════════════════════════════════════════════════════════ */
function KPIRow() {
  const { data: clients } = useClientsList();
  const { data: accuracy } = useAccuracySummary();
  const { data: followups } = useFollowupsList();
  const { data: sessions } = useSessionsList();

  const today = new Date();
  const sameDay = (d: string) => new Date(d).toDateString() === today.toDateString();
  const todayCount = (sessions?.items ?? []).filter((s) => sameDay(s.scheduled_at)).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Today"
        value={String(todayCount)}
        hint={todayCount === 0 ? "Nothing scheduled" : `${todayCount} session${todayCount !== 1 ? "s" : ""}`}
        accent="gold"
        icon={<CalendarIcon />}
      />
      <StatCard
        label="Clients"
        value={String(clients?.total ?? 0)}
        hint={(clients?.total ?? 0) === 0 ? "Add your first" : "In directory"}
        icon={<Users />}
      />
      <StatCard
        label="Accuracy"
        value={accuracy?.total ? `${accuracy.accuracy_pct}%` : "—"}
        hint={
          accuracy?.total
            ? `${accuracy.correct} of ${accuracy.total} verified`
            : "Log predictions to track"
        }
        accent="success"
        icon={<TrendingUp />}
      />
      <StatCard
        label="Follow-ups"
        value={String(followups?.total ?? 0)}
        hint={
          (followups?.overdue ?? 0) > 0
            ? `${followups!.overdue} overdue`
            : "All caught up"
        }
        accent={(followups?.overdue ?? 0) > 0 ? "warning" : "default"}
        icon={<AlertCircle />}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TODAY PANEL — upcoming + past consultations
   ═══════════════════════════════════════════════════════════════ */
function TodayPanel() {
  const { data } = useSessionsList();
  const today = new Date();
  const sameDay = (d: string) => new Date(d).toDateString() === today.toDateString();
  const items = (data?.items ?? []).filter((s) => sameDay(s.scheduled_at));

  return (
    <div>
      <SectionHeader
        eyebrow="Today"
        title="Your schedule"
        description={
          items.length === 0
            ? "No consultations booked today"
            : `${items.length} consultation${items.length !== 1 ? "s" : ""}`
        }
      />
      <Surface padding="none">
        {items.length === 0 ? (
          <div className="p-10 text-center">
            <div className="size-12 mx-auto rounded-xl bg-gold/10 text-gold flex items-center justify-center mb-3">
              <CalendarIcon className="size-5" />
            </div>
            <div className="text-small text-text-secondary max-w-sm mx-auto mb-4 leading-relaxed">
              When a client calls or walks in, open their profile and start a
              session from there — today's list populates automatically.
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/pro/clients">Go to clients</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((s) => (
              <Link
                key={s.id}
                href={`/pro/clients/${s.client_id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-bg-hover transition-colors group"
              >
                <div className="text-tiny text-text-muted font-mono w-14 shrink-0">
                  {new Date(s.scheduled_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-small font-medium text-text-primary truncate">
                    {s.query_text || s.session_type}
                  </div>
                  <div className="text-tiny text-text-muted mt-0.5 capitalize">
                    {s.session_type.replace("_", " ")}
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
                      <CheckCircle2 className="size-3" /> {s.duration_minutes}m
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
      </Surface>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RECENT CLIENTS
   ═══════════════════════════════════════════════════════════════ */
function RecentClientsPanel() {
  const { data } = useClientsList();
  const items = (data?.items ?? []).slice(0, 6);

  return (
    <div>
      <SectionHeader
        eyebrow="Directory"
        title="Recent clients"
        description={items.length > 0 ? `${data?.total ?? 0} total clients` : undefined}
        actions={
          items.length > 0 ? (
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight />} asChild>
              <Link href="/pro/clients">All clients</Link>
            </Button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <Surface padding="lg">
          <div className="text-center py-6">
            <div className="size-12 mx-auto rounded-xl bg-gold/10 text-gold flex items-center justify-center mb-3">
              <Users className="size-5" />
            </div>
            <div className="text-h3 font-semibold text-text-primary mb-1">
              No clients yet
            </div>
            <div className="text-small text-text-secondary max-w-md mx-auto mb-4">
              Add your first client to begin. Their KP chart is computed
              instantly, and everything about them — sessions, predictions,
              notes — lives here forever.
            </div>
            <Button variant="primary" size="md" leftIcon={<Plus />} asChild>
              <Link href="/pro/clients">Add your first client</Link>
            </Button>
          </div>
        </Surface>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/pro/clients/${c.id}`}
              className="lift-on-hover rounded-xl bg-bg-surface border border-border p-4 hover:border-border-strong group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="size-10 rounded-full bg-gradient-to-br from-gold to-gold-dim flex items-center justify-center text-small font-bold text-bg-primary shrink-0">
                  {c.full_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-small font-semibold text-text-primary truncate">
                    {c.full_name}
                  </div>
                  <div className="text-[11px] text-text-muted truncate">
                    {c.birth_place}
                  </div>
                </div>
              </div>
              {c.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {c.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                        t === "priority"
                          ? "bg-warning/15 text-warning"
                          : "bg-bg-surface-2 text-text-muted"
                      )}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PREDICTION SCOREBOARD
   ═══════════════════════════════════════════════════════════════ */
function ScoreboardPanel() {
  const { data } = useAccuracySummary();
  const DOMAIN_ICONS: Record<string, React.ReactNode> = {
    career: <Briefcase className="size-3.5" />,
    marriage: <Heart className="size-3.5" />,
    foreign: <Plane className="size-3.5" />,
    property: <Home className="size-3.5" />,
    education: <BookOpen className="size-3.5" />,
    health: <AlertCircle className="size-3.5" />,
    travel: <Plane className="size-3.5" />,
    finance: <TrendingUp className="size-3.5" />,
  };

  return (
    <div>
      <SectionHeader
        eyebrow="Prediction accuracy · all time"
        title="Your track record"
        description="The single metric that separates you from competitors. Build it over time."
      />

      {!data || data.total === 0 ? (
        <Surface padding="lg">
          <div className="flex items-center gap-5">
            <div className="size-14 rounded-xl bg-gold/10 text-gold flex items-center justify-center shrink-0">
              <Target className="size-6" />
            </div>
            <div>
              <div className="text-body font-semibold text-text-primary mb-1">
                No predictions logged yet
              </div>
              <div className="text-small text-text-secondary max-w-lg">
                Open a client → Predictions tab → log what you predict with a
                target window. Mark outcomes later. Your per-domain accuracy
                populates automatically.
              </div>
            </div>
          </div>
        </Surface>
      ) : (
        <Surface padding="none">
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.1em] text-text-muted font-medium">
                Overall · last{" "}
                {data.total} prediction{data.total !== 1 ? "s" : ""}
              </div>
              <div className="font-display text-[2.5rem] leading-none font-bold text-gold mt-1">
                {data.accuracy_pct}%
              </div>
            </div>
            <div className="text-right text-tiny text-text-muted">
              <div className="text-text-primary text-small font-medium">
                {data.correct} correct · {data.partial} partial · {data.wrong} wrong
              </div>
              <div className="mt-0.5">{data.pending} pending verification</div>
            </div>
          </div>
          <Divider />
          <div className="px-6 py-5 space-y-3.5">
            {data.by_domain.map((d) => (
              <div key={d.domain} className="flex items-center gap-4">
                <div className="w-32 flex items-center gap-2 text-small text-text-primary capitalize">
                  <span className="text-text-muted [&>svg]:size-3.5">
                    {DOMAIN_ICONS[d.domain] ?? <Target className="size-3.5" />}
                  </span>
                  {d.domain}
                </div>
                <div className="flex-1">
                  <div className="h-1.5 rounded-full bg-bg-surface-2 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-500",
                        d.accuracy_pct >= 80
                          ? "bg-success"
                          : d.accuracy_pct >= 60
                          ? "bg-warning"
                          : "bg-error"
                      )}
                      style={{ width: `${d.accuracy_pct}%` }}
                    />
                  </div>
                </div>
                <div className="text-tiny font-mono text-text-muted w-16 text-right">
                  <span className="text-text-primary font-semibold">
                    {d.accuracy_pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FOLLOW-UPS
   ═══════════════════════════════════════════════════════════════ */
function FollowUpsPanel() {
  const { data } = useFollowupsList();
  const update = useUpdateFollowup();
  const items = data?.items ?? [];
  const now = new Date();

  return (
    <Surface padding="none">
      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.1em] text-text-muted font-medium mb-0.5">
            Follow-ups
          </div>
          <div className="text-[15px] font-semibold text-text-primary">
            Your to-dos
          </div>
        </div>
        {(data?.overdue ?? 0) > 0 && (
          <Badge variant="warning" size="sm">
            {data!.overdue} overdue
          </Badge>
        )}
      </div>
      <Divider />
      {items.length === 0 ? (
        <div className="px-5 py-6 text-center text-small text-text-muted">
          No pending follow-ups. Add one from any client page.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.slice(0, 4).map((f) => {
            const due = new Date(f.due_at);
            const overdue = due < now;
            return (
              <div
                key={f.id}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-bg-hover group transition-colors"
              >
                <button
                  onClick={() =>
                    update.mutate({ id: f.id, body: { completed: true } })
                  }
                  className="mt-0.5 size-4 rounded-full border-2 border-border hover:border-gold transition-colors shrink-0"
                  title="Mark complete"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-small text-text-primary leading-snug">
                    {f.note}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    {due.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                {overdue && (
                  <Badge variant="error" size="sm">
                    Overdue
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Surface>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BRIEFING — context-aware greeting + getting-started
   ═══════════════════════════════════════════════════════════════ */
function BriefingPanel() {
  const { data: clients } = useClientsList();
  const n = clients?.total ?? 0;

  return (
    <Surface ai padding="md">
      <div className="flex items-start gap-3 mb-3">
        <div className="size-9 rounded-lg bg-ai/15 border border-ai/30 flex items-center justify-center text-ai shrink-0">
          <Sparkles className="size-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.1em] text-ai font-medium mb-0.5">
            Briefing
          </div>
          <div className="text-[15px] font-semibold text-text-primary">
            {n === 0
              ? "Let's get you set up"
              : n < 5
              ? "Build your practice"
              : "Your practice is live"}
          </div>
        </div>
      </div>

      {n === 0 ? (
        <div className="space-y-3 text-small text-text-secondary leading-relaxed">
          <Step n={1}>
            Add your first client on the Clients page — their KP chart computes
            from Swiss Ephemeris instantly.
          </Step>
          <Step n={2}>
            Start a walk-in when they arrive. Take notes, end the session — AI
            summarizes in 3 sentences.
          </Step>
          <Step n={3}>
            Log predictions with target windows. Mark outcomes later. Your
            accuracy builds over time.
          </Step>
        </div>
      ) : (
        <div className="text-small text-text-secondary leading-relaxed">
          You have <strong className="text-text-primary">{n}</strong> client
          {n > 1 ? "s" : ""}. Open any to see their real KP chart, start
          sessions, and log predictions.
        </div>
      )}
    </Surface>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="size-5 rounded-full bg-ai/15 text-ai text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   QUICK ACTIONS
   ═══════════════════════════════════════════════════════════════ */
function QuickActionsPanel() {
  const actions = [
    { href: "/pro/tools/horary", label: "Horary · Prashna", desc: "1-249 KP question" },
    { href: "/pro/tools/muhurtha", label: "Muhurtha", desc: "Auspicious timing" },
    { href: "/pro/tools/panchang", label: "Panchang", desc: "Today's tithi + nakshatra" },
    { href: "/pro/tools/match", label: "Kundli Match", desc: "Pair compatibility" },
  ];
  return (
    <Surface padding="none">
      <SurfaceHeader eyebrow="Shortcuts" title="Quick tools" className="px-5 pt-4 mb-0" />
      <Divider />
      <div className="divide-y divide-border">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-3 px-5 py-3 hover:bg-bg-hover transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="text-small font-medium text-text-primary">
                {a.label}
              </div>
              <div className="text-[11px] text-text-muted">{a.desc}</div>
            </div>
            <ChevronRight className="size-4 text-text-muted group-hover:text-text-primary transition-colors" />
          </Link>
        ))}
      </div>
    </Surface>
  );
}
