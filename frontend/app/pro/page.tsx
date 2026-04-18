"use client";

import Link from "next/link";
import {
  Plus,
  Sparkles,
  AlertCircle,
  Target,
  ArrowRight,
  ChevronRight,
  Clock,
  CheckCircle2,
  Users,
  Calendar as CalendarIcon,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import {
  ContentCard,
  SectionLabel,
  SectionHeading,
} from "@/components/ui/content-card";
import { useClientsList } from "@/hooks/use-clients";
import { useAccuracySummary } from "@/hooks/use-predictions";
import { useFollowupsList, useUpdateFollowup } from "@/hooks/use-followups";
import { useSessionsList } from "@/hooks/use-sessions";
import { useMe } from "@/hooks/use-me";

/* ──────────────────────────────────────────────────────────────
   TOKENS (locked — do not change)
   ────────────────────────────────────────────────────────────── */
const MUTED = "#64748B";
const DIM = "#475569";
const TEXT = "#F1F5F9";
const GOLD = "#c9a96e";

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
    <main
      data-mobile-pad
      style={{
        padding: "24px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 32,
        minHeight: "100vh",
      }}
    >
      {/* Page header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: DIM,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            {weekday}, {dateStr}
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: TEXT,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Good {greeting()}, {firstName}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: MUTED,
              marginTop: 4,
              margin: 0,
            }}
          >
            Your practice at a glance — schedule, recent clients, and accuracy.
          </p>
        </div>
        <Link
          href="/pro/clients"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 32,
            padding: "0 12px",
            backgroundColor: GOLD,
            color: "#07070d",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          <Plus size={14} /> Add client
        </Link>
      </header>

      {/* KPI row */}
      <KPIRow />

      {/* 2-column layout: stretches to fill remaining height */}
      <div
        data-mobile-stack
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 24,
          flex: 1,
          minHeight: 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          <TodayPanel />
          <RecentClientsPanel />
          <ScoreboardPanel />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          <FollowUpsPanel />
          <BriefingPanel />
          <ShortcutsPanel />
        </div>
      </div>
    </main>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

/* ──────────────────────────────────────────────────────────────
   KPI ROW — 4 StatCards
   ────────────────────────────────────────────────────────────── */
function KPIRow() {
  const { data: clients } = useClientsList();
  const { data: accuracy } = useAccuracySummary();
  const { data: followups } = useFollowupsList();
  const { data: sessions } = useSessionsList();

  const today = new Date();
  const sameDay = (d: string) =>
    new Date(d).toDateString() === today.toDateString();
  const todayCount = (sessions?.items ?? []).filter((s) =>
    sameDay(s.scheduled_at)
  ).length;

  return (
    <div
      data-mobile-2col
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 16,
      }}
    >
      <StatCard
        label="Today"
        value={String(todayCount)}
        sub={todayCount === 0 ? "Nothing scheduled" : `${todayCount} session${todayCount !== 1 ? "s" : ""}`}
      />
      <StatCard
        label="Clients"
        value={String(clients?.total ?? 0)}
        sub={(clients?.total ?? 0) === 0 ? "Add your first" : "In directory"}
      />
      <StatCard
        label="Accuracy"
        value={accuracy?.total ? `${accuracy.accuracy_pct}%` : "—"}
        sub={accuracy?.total ? `${accuracy.correct} of ${accuracy.total} verified` : "Log predictions to track"}
      />
      <StatCard
        label="Follow-ups"
        value={String(followups?.total ?? 0)}
        sub={(followups?.overdue ?? 0) > 0 ? `${followups!.overdue} overdue` : "All caught up"}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Section wrapper — eyebrow label + heading + content
   ────────────────────────────────────────────────────────────── */
function Section({
  label,
  title,
  right,
  children,
}: {
  label: string;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 12,
        }}
      >
        <div>
          <SectionLabel>{label}</SectionLabel>
          <SectionHeading>{title}</SectionHeading>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
   TODAY
   ────────────────────────────────────────────────────────────── */
function TodayPanel() {
  const { data } = useSessionsList();
  const today = new Date();
  const sameDay = (d: string) =>
    new Date(d).toDateString() === today.toDateString();
  const items = (data?.items ?? []).filter((s) => sameDay(s.scheduled_at));

  return (
    <Section label="Today" title="Your schedule">
      {items.length === 0 ? (
        <ContentCard>
          <div style={{ textAlign: "center", padding: "24px 16px" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: "rgba(201,169,110,0.1)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: GOLD,
                marginBottom: 12,
              }}
            >
              <CalendarIcon size={18} />
            </div>
            <div style={{ fontSize: 13, color: MUTED, maxWidth: 360, margin: "0 auto 14px" }}>
              No consultations booked today. When a client walks in or calls,
              open their profile and start a session.
            </div>
            <Link
              href="/pro/clients"
              style={secondaryButtonStyle}
            >
              Go to clients
            </Link>
          </div>
        </ContentCard>
      ) : (
        <ContentCard padding="none">
          <div>
            {items.map((s, i) => (
              <Link
                key={s.id}
                href={`/pro/clients/${s.client_id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)",
                  textDecoration: "none",
                  color: TEXT,
                }}
              >
                <div style={{ fontSize: 11, fontFamily: "monospace", color: MUTED, width: 56 }}>
                  {new Date(s.scheduled_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>
                    {s.query_text || s.session_type}
                  </div>
                </div>
                {s.status === "completed" && (
                  <Pill color="success">
                    <CheckCircle2 size={10} /> {s.duration_minutes}m
                  </Pill>
                )}
                {s.status === "in_progress" && (
                  <Pill color="gold">
                    <Clock size={10} /> Live
                  </Pill>
                )}
                {s.status === "scheduled" && <Pill>Upcoming</Pill>}
                <ChevronRight size={14} color={DIM} />
              </Link>
            ))}
          </div>
        </ContentCard>
      )}
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────────
   RECENT CLIENTS
   ────────────────────────────────────────────────────────────── */
function RecentClientsPanel() {
  const { data } = useClientsList();
  const items = (data?.items ?? []).slice(0, 6);

  return (
    <Section
      label="Directory"
      title="Recent clients"
      right={
        items.length > 0 && (
          <Link
            href="/pro/clients"
            style={{
              fontSize: 12,
              color: MUTED,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            All {data?.total ?? 0} <ArrowRight size={12} />
          </Link>
        )
      }
    >
      {items.length === 0 ? (
        <ContentCard>
          <div style={{ textAlign: "center", padding: "24px 16px" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: "rgba(201,169,110,0.1)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: GOLD,
                marginBottom: 12,
              }}
            >
              <Users size={18} />
            </div>
            <div style={{ fontSize: 13, color: MUTED, maxWidth: 360, margin: "0 auto 14px" }}>
              No clients yet. Add your first to begin tracking their KP chart,
              sessions, and predictions.
            </div>
            <Link href="/pro/clients" style={primaryButtonStyle}>
              <Plus size={14} /> Add your first client
            </Link>
          </div>
        </ContentCard>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/pro/clients/${c.id}`}
              style={{
                backgroundColor: "#0F172A",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: 16,
                textDecoration: "none",
                color: TEXT,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  background: "linear-gradient(135deg, #c9a96e, #8b7a50)",
                  color: "#07070d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {c.full_name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: TEXT,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.full_name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: MUTED,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.birth_place}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────────
   PREDICTION SCOREBOARD
   ────────────────────────────────────────────────────────────── */
function ScoreboardPanel() {
  const { data } = useAccuracySummary();

  return (
    <Section label="Prediction accuracy · all time" title="Your track record">
      {!data || data.total === 0 ? (
        <ContentCard>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                backgroundColor: "rgba(201,169,110,0.1)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: GOLD,
                flexShrink: 0,
              }}
            >
              <Target size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, color: TEXT, fontWeight: 500, marginBottom: 2 }}>
                No predictions logged yet
              </div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
                Open any client → Predictions → log what you predict with a
                target window. Mark outcomes later. Accuracy builds over time.
              </div>
            </div>
          </div>
        </ContentCard>
      ) : (
        <ContentCard padding="none">
          <div
            style={{
              padding: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div>
              <SectionLabel>
                Overall · last {data.total} prediction{data.total !== 1 ? "s" : ""}
              </SectionLabel>
              <div style={{ fontSize: 36, fontWeight: 700, color: GOLD, lineHeight: 1 }}>
                {data.accuracy_pct}%
              </div>
            </div>
            <div style={{ fontSize: 11, color: MUTED, textAlign: "right" }}>
              <div style={{ color: TEXT, fontSize: 12 }}>
                {data.correct} correct · {data.partial} partial · {data.wrong} wrong
              </div>
              <div style={{ marginTop: 2 }}>{data.pending} pending</div>
            </div>
          </div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {data.by_domain.map((d) => (
              <div key={d.domain} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 13, color: TEXT, width: 100, textTransform: "capitalize" }}>
                  {d.domain}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "rgba(255,255,255,0.04)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      backgroundColor:
                        d.accuracy_pct >= 80 ? "#34d399" : d.accuracy_pct >= 60 ? "#fbbf24" : "#f87171",
                      width: `${d.accuracy_pct}%`,
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: MUTED, width: 40, textAlign: "right" }}>
                  {d.accuracy_pct}%
                </div>
              </div>
            ))}
          </div>
        </ContentCard>
      )}
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────────
   FOLLOW-UPS panel (right column)
   ────────────────────────────────────────────────────────────── */
function FollowUpsPanel() {
  const { data } = useFollowupsList();
  const update = useUpdateFollowup();
  const items = data?.items ?? [];
  const now = new Date();

  return (
    <ContentCard padding="none">
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <SectionLabel>Follow-ups</SectionLabel>
          <SectionHeading>Your to-dos</SectionHeading>
        </div>
        {(data?.overdue ?? 0) > 0 && (
          <Pill color="warning">{data!.overdue} overdue</Pill>
        )}
      </div>
      {items.length === 0 ? (
        <div style={{ padding: "20px", textAlign: "center", fontSize: 13, color: MUTED }}>
          No pending follow-ups.
        </div>
      ) : (
        <div>
          {items.slice(0, 4).map((f) => {
            const due = new Date(f.due_at);
            const overdue = due < now;
            return (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 20px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <button
                  onClick={() =>
                    update.mutate({ id: f.id, body: { completed: true } })
                  }
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    border: "2px solid rgba(255,255,255,0.2)",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                  title="Mark complete"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.4 }}>{f.note}</div>
                  <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>
                    {due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
                {overdue && <Pill color="error">Overdue</Pill>}
              </div>
            );
          })}
        </div>
      )}
    </ContentCard>
  );
}

/* ──────────────────────────────────────────────────────────────
   BRIEFING
   ────────────────────────────────────────────────────────────── */
function BriefingPanel() {
  const { data: clients } = useClientsList();
  const n = clients?.total ?? 0;

  return (
    <ContentCard>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            backgroundColor: "rgba(167,139,250,0.12)",
            color: "#a78bfa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Sparkles size={15} />
        </div>
        <div>
          <SectionLabel>
            <span style={{ color: "#a78bfa" }}>Briefing</span>
          </SectionLabel>
          <SectionHeading>
            {n === 0 ? "Let's get you set up" : n < 5 ? "Build your practice" : "Your practice is live"}
          </SectionHeading>
        </div>
      </div>
      {n === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Step n={1}>Add your first client — chart computes instantly.</Step>
          <Step n={2}>Start walk-ins. Notes → AI summary at end.</Step>
          <Step n={3}>Log predictions with target windows.</Step>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
          You have <strong style={{ color: TEXT }}>{n}</strong> client
          {n > 1 ? "s" : ""}. Open any to see their real KP chart.
        </div>
      )}
    </ContentCard>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: "rgba(167,139,250,0.15)",
          color: "#a78bfa",
          fontSize: 10,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, flex: 1 }}>{children}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   SHORTCUTS
   ────────────────────────────────────────────────────────────── */
function ShortcutsPanel() {
  const actions = [
    { href: "/pro/tools/horary", label: "Horary · Prashna", desc: "1–249 KP question" },
    { href: "/pro/tools/muhurtha", label: "Muhurtha", desc: "Auspicious timing" },
    { href: "/pro/tools/panchang", label: "Panchang", desc: "Today's tithi + nakshatra" },
    { href: "/pro/tools/match", label: "Kundli Match", desc: "Pair compatibility" },
  ];
  return (
    <ContentCard padding="none">
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <SectionLabel>Shortcuts</SectionLabel>
        <SectionHeading>Quick tools</SectionHeading>
      </div>
      <div>
        {actions.map((a, i) => (
          <Link
            key={a.href}
            href={a.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 20px",
              borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)",
              textDecoration: "none",
              color: TEXT,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>
                {a.label}
              </div>
              <div style={{ fontSize: 11, color: DIM }}>{a.desc}</div>
            </div>
            <ChevronRight size={14} color={DIM} />
          </Link>
        ))}
      </div>
    </ContentCard>
  );
}

/* ──────────────────────────────────────────────────────────────
   Pill — small tag
   ────────────────────────────────────────────────────────────── */
function Pill({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: "success" | "gold" | "warning" | "error";
}) {
  const colors: Record<string, [string, string]> = {
    success: ["rgba(52,211,153,0.12)", "#34d399"],
    gold: ["rgba(201,169,110,0.15)", GOLD],
    warning: ["rgba(251,191,36,0.12)", "#fbbf24"],
    error: ["rgba(248,113,113,0.12)", "#f87171"],
    default: ["rgba(255,255,255,0.06)", MUTED],
  };
  const [bg, fg] = colors[color ?? "default"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 4,
        backgroundColor: bg,
        color: fg,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────
   Button styles
   ────────────────────────────────────────────────────────────── */
const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  backgroundColor: GOLD,
  color: "#07070d",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
  textDecoration: "none",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: TEXT,
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
  textDecoration: "none",
};

// keep
export const _unused = AlertCircle;
