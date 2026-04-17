"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Plus,
  Sparkles,
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
  Loader2,
  AlertCircle,
} from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useClient, useClientWorkspace } from "@/hooks/use-clients";
import { SessionsTab } from "@/components/pro/sessions-tab";
import { PredictionsTab } from "@/components/pro/predictions-tab";
import { AnalysisTab } from "@/components/pro/analysis-tab";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ClientWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: client, isLoading: clientLoading, isError: clientError } = useClient(id);
  const { data: ws, isLoading: wsLoading } = useClientWorkspace(id);

  if (clientLoading) {
    return (
      <>
        <TopBar title="Loading client…" tabs={[]} />
        <div className="flex items-center justify-center py-24 text-text-muted">
          <Loader2 className="size-6 animate-spin mr-2" />
          Loading client…
        </div>
      </>
    );
  }

  if (clientError || !client) {
    return (
      <>
        <TopBar title="Client not found" tabs={[]} />
        <div className="max-w-md mx-auto mt-24 p-6 rounded-xl bg-error/10 border border-error/30 text-center">
          <AlertCircle className="size-6 text-error mx-auto mb-2" />
          <div className="text-body text-text-primary font-medium mb-1">
            Client not found
          </div>
          <div className="text-small text-text-muted mb-4">
            It may have been archived or does not exist.
          </div>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/pro/clients">← Back to clients</Link>
          </Button>
        </div>
      </>
    );
  }

  // Derive birth date/time for display
  const birthDate = new Date(client.birth_dt_utc);
  const birthDisplay = {
    date: client.birth_dt_local_str.split("T")[0],
    time: client.birth_dt_local_str.split("T")[1]?.slice(0, 5) ?? "",
  };

  return (
    <>
      <TopBar title={client.full_name} activeTab={client.id} />
      <main className="max-w-[1400px] mx-auto">
        <ClientHeader
          client={client}
          ws={ws}
          birthDisplay={birthDisplay}
          birthIsoDate={birthDate}
        />
        <ClientTabs client={client} ws={ws} wsLoading={wsLoading} />
      </main>
    </>
  );
}

function ClientHeader({
  client,
  ws,
  birthDisplay,
}: {
  client: any;
  ws: any;
  birthDisplay: { date: string; time: string };
  birthIsoDate: Date;
}) {
  const lagna = ws?.cusps?.[0]?.sign_en ?? ws?.planets?.Ascendant?.sign_en ?? "…";
  const moonSign = ws?.planets?.find?.((p: any) => p.planet_en === "Moon")?.sign_en ?? "…";
  return (
    <div className="px-6 py-5 border-b border-border">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="size-16 rounded-full bg-gradient-to-br from-gold to-gold-dim border-2 border-border-accent flex items-center justify-center text-h2 font-bold text-bg-primary shrink-0">
            {client.full_name[0].toUpperCase()}
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
                {client.full_name}
              </span>
            </div>
            <h1 className="font-display text-h1 font-semibold text-text-primary mb-2">
              {client.full_name}
            </h1>
            <div className="flex items-center gap-4 flex-wrap text-small text-text-secondary">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-text-muted" />
                {birthDisplay.date} · {birthDisplay.time}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-text-muted" />
                {client.birth_place}
              </div>
              {client.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="size-3.5 text-text-muted" />
                  {client.phone}
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="size-3.5 text-text-muted" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {lagna && lagna !== "…" && (
                <Badge variant="gold" size="md">
                  <Star className="size-3 fill-gold" /> {lagna} Lagna
                </Badge>
              )}
              {moonSign && moonSign !== "…" && (
                <Badge size="md">Moon in {moonSign}</Badge>
              )}
              {(client.tags ?? []).map((t: string) => (
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
        <MiniStat label="Sessions" value="0" sub="None yet" />
        <MiniStat label="Created" value={formatDate(client.created_at)} sub="Added to directory" />
        <MiniStat label="Pending predictions" value="0" sub="Log predictions in sessions" />
        <MiniStat
          label="Current dasha"
          value={ws?.current_dasha?.lord_en ?? "…"}
          sub={ws?.current_antardasha ? `AD: ${ws.current_antardasha.lord_en}` : " "}
          success
        />
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

function ClientTabs({
  client,
  ws,
  wsLoading,
}: {
  client: any;
  ws: any;
  wsLoading: boolean;
}) {
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
            {wsLoading ? (
              <LoadingChart />
            ) : ws ? (
              <ChartTab ws={ws} />
            ) : (
              <LoadingChart error />
            )}
          </TabsContent>
          <TabsContent value="houses">
            <PlaceholderTab
              name="Houses"
              description="12-house deep dive with KP significators. Real data is computed — UI coming in next pass."
            />
          </TabsContent>
          <TabsContent value="dasha">
            {wsLoading ? (
              <LoadingChart />
            ) : ws ? (
              <DashaTab ws={ws} />
            ) : (
              <LoadingChart error />
            )}
          </TabsContent>
          <TabsContent value="analysis">
            {ws ? (
              <AnalysisTab
                input={{
                  name: client.full_name,
                  date: client.birth_dt_local_str.split("T")[0],
                  time: client.birth_dt_local_str.split("T")[1].slice(0, 5),
                  latitude: client.birth_lat,
                  longitude: client.birth_lon,
                  timezone_offset: ws.timezone_offset ?? 5.5,
                }}
              />
            ) : (
              <LoadingChart />
            )}
          </TabsContent>
          <TabsContent value="sessions">
            <SessionsTab clientId={client.id} />
          </TabsContent>
          <TabsContent value="predictions">
            <PredictionsTab clientId={client.id} />
          </TabsContent>
          <TabsContent value="notes">
            <PlaceholderTab
              name="Notes"
              description="Freeform astrologer notes, searchable."
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CHART TAB — real planets + cusps + significators + KP inspector
   ══════════════════════════════════════════════════════════════════ */
function ChartTab({ ws }: { ws: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="flex flex-col gap-5 min-w-0">
        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-tiny uppercase tracking-wider text-gold">
              NATAL CHART
            </div>
            <div className="text-tiny text-text-muted">Lagna → 12 houses →</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
            <RealChartSVG ws={ws} />
            <PlanetsTable ws={ws} />
          </div>
        </div>

        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-tiny uppercase tracking-wider text-gold">
              HOUSE OVERVIEW
            </div>
          </div>
          <HouseGrid ws={ws} />
        </div>
      </div>

      <div className="flex flex-col gap-4 min-w-0">
        <PromiseCard ws={ws} />
        <DashaCard ws={ws} />
        <RulingPlanetsCard ws={ws} />
      </div>
    </div>
  );
}

function RealChartSVG({ ws }: { ws: any }) {
  // Use existing planets + cusps from workspace response
  const planets: any[] = Array.isArray(ws?.planets) ? ws.planets : [];
  // Bucket planets by house (1-12)
  const byHouse: Record<number, string[]> = {};
  for (let i = 1; i <= 12; i++) byHouse[i] = [];
  for (const p of planets) {
    const h = p.house ?? 1;
    const short = p.planet_en?.slice(0, 2) ?? "?";
    byHouse[h].push(short);
  }
  return (
    <div className="aspect-square">
      <svg viewBox="0 0 300 300" className="w-full h-full">
        <rect
          x="10"
          y="10"
          width="280"
          height="280"
          fill="none"
          stroke="var(--color-border-accent)"
          strokeWidth="1"
        />
        {/* Diagonals for South Indian style */}
        <line x1="10" y1="10" x2="290" y2="290" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
        <line x1="290" y1="10" x2="10" y2="290" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
        <line x1="150" y1="10" x2="10" y2="150" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
        <line x1="150" y1="10" x2="290" y2="150" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
        <line x1="150" y1="290" x2="10" y2="150" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
        <line x1="150" y1="290" x2="290" y2="150" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />

        {/* House positions (approximate South Indian layout) */}
        {(
          [
            { n: 1, x: 150, y: 60 },
            { n: 2, x: 225, y: 60 },
            { n: 3, x: 250, y: 150 },
            { n: 4, x: 225, y: 240 },
            { n: 5, x: 150, y: 240 },
            { n: 6, x: 75, y: 240 },
            { n: 7, x: 50, y: 150 },
            { n: 8, x: 75, y: 60 },
            { n: 9, x: 100, y: 30 },
            { n: 10, x: 200, y: 30 },
            { n: 11, x: 200, y: 270 },
            { n: 12, x: 100, y: 270 },
          ] as const
        ).map((h) => {
          const occupants = byHouse[h.n];
          return (
            <g key={h.n}>
              <text x={h.x} y={h.y - 10} fill="var(--color-text-muted)" fontSize="9" textAnchor="middle">
                {h.n}
              </text>
              {occupants.map((p, i) => (
                <text
                  key={p + i}
                  x={h.x}
                  y={h.y + i * 14}
                  fill="var(--color-gold)"
                  fontSize="12"
                  fontFamily="serif"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {p}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PlanetsTable({ ws }: { ws: any }) {
  const planets: any[] = Array.isArray(ws?.planets) ? ws.planets : [];
  return (
    <div className="flex flex-col gap-1 text-small overflow-x-auto">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 pb-2 border-b border-border text-tiny uppercase tracking-wider text-text-muted">
        <div>Planet</div>
        <div>Sign</div>
        <div className="font-mono">Sub Lord</div>
        <div>Ho</div>
      </div>
      {planets.map((p) => (
        <div
          key={p.planet_en}
          className="grid grid-cols-[1fr_auto_auto_auto] gap-3 py-1.5 items-center text-small hover:bg-bg-hover rounded-sm px-1 -mx-1 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-text-primary font-medium">
              {p.planet_en}
            </span>
            {p.retrograde && (
              <span className="text-tiny text-warning font-mono">R</span>
            )}
          </div>
          <div className="text-text-secondary">{p.sign_en}</div>
          <div className="font-mono text-tiny text-gold">{p.sub_lord_en ?? "—"}</div>
          <div className="font-mono text-tiny bg-gold-glow text-gold px-1.5 rounded">
            {p.house ?? "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

function HouseGrid({ ws }: { ws: any }) {
  const cusps: any[] = Array.isArray(ws?.cusps) ? ws.cusps : [];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {cusps.map((c) => (
        <div
          key={c.house_num}
          className="p-3 rounded-md bg-bg-surface-2 border border-border hover:border-border-strong transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="text-tiny text-text-muted font-mono">H{c.house_num}</div>
            {c.sub_lord_en && (
              <div className="text-[10px] px-1 rounded-sm bg-gold-glow text-gold font-mono">
                {c.sub_lord_en.slice(0, 2)}
              </div>
            )}
          </div>
          <div className="text-small font-medium text-text-primary mb-0.5">
            {c.sign_en}
          </div>
          <div className="text-tiny text-text-muted leading-tight font-mono">
            {typeof c.cusp_longitude === "number"
              ? `${(c.cusp_longitude % 30).toFixed(1)}°`
              : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

function PromiseCard({ ws }: { ws: any }) {
  const h7 = ws?.cusps?.[6];
  if (!h7) return null;
  const subLord = h7.sub_lord_en ?? "—";
  return (
    <div className="p-4 rounded-xl bg-bg-surface border-2 border-gold shadow-[var(--shadow-glow)]">
      <div className="text-tiny uppercase tracking-wider text-gold mb-2 flex items-center gap-1.5">
        <Target className="size-3" /> H7 CUSP · MARRIAGE
      </div>
      <div className="font-display text-h3 font-semibold text-text-primary mb-1">
        Sub Lord: {subLord}
      </div>
      <div className="text-small text-text-secondary mb-3">
        Full CSL signification chain is computed server-side. Analyze in the
        Analysis tab.
      </div>
      <div className="flex items-center gap-2 text-tiny">
        <Badge variant="gold" size="sm">{h7.sign_en}</Badge>
      </div>
    </div>
  );
}

function DashaCard({ ws }: { ws: any }) {
  if (!ws) return null;
  return (
    <div className="p-4 rounded-xl bg-bg-surface border border-border">
      <div className="text-tiny uppercase tracking-wider text-text-muted mb-2">
        CURRENT DASHA
      </div>
      <div className="space-y-2.5">
        <DashaRow label="MD" planet={ws.current_dasha?.lord_en} end={ws.current_dasha?.end} />
        <DashaRow label="AD" planet={ws.current_antardasha?.lord_en} end={ws.current_antardasha?.end} />
        <DashaRow label="PAD" planet={ws.current_pratyantardasha?.lord_en} end={ws.current_pratyantardasha?.end} />
      </div>
    </div>
  );
}

function DashaRow({
  label,
  planet,
  end,
}: {
  label: string;
  planet?: string;
  end?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-small">
      <div className="text-tiny uppercase tracking-wider text-text-muted w-8 font-mono">
        {label}
      </div>
      <div className="text-text-primary font-medium flex-1">{planet ?? "—"}</div>
      <div className="text-tiny text-text-muted font-mono">
        {end ? `until ${end.slice(0, 10)}` : ""}
      </div>
    </div>
  );
}

function RulingPlanetsCard({ ws }: { ws: any }) {
  const rp = ws?.ruling_planets;
  if (!rp) return null;
  const rps = [
    { role: "Day Lord", planet: rp.day_lord_en },
    { role: "Lagna Sign", planet: rp.lagna_sign_lord_en },
    { role: "Lagna Star", planet: rp.lagna_star_lord_en },
    { role: "Moon Sign", planet: rp.moon_sign_lord_en },
    { role: "Moon Star", planet: rp.moon_star_lord_en },
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
            <div className="text-text-primary font-medium flex-1">
              {r.planet ?? "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DASHA TAB — list antardashas with current marker
   ══════════════════════════════════════════════════════════════════ */
function DashaTab({ ws }: { ws: any }) {
  const antardashas: any[] = ws?.antardashas ?? [];
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-bg-surface border border-border p-5">
        <div className="text-tiny uppercase tracking-wider text-gold mb-4">
          CURRENT · {ws.current_dasha?.lord_en} MAHADASHA
        </div>
        <div className="text-body text-text-secondary mb-6">
          Started {ws.current_dasha?.start?.slice(0, 10)} · ends {ws.current_dasha?.end?.slice(0, 10)}
        </div>
        <div className="text-tiny uppercase tracking-wider text-text-muted mb-3">
          ANTARDASHAS ({antardashas.length})
        </div>
        <div className="flex flex-col gap-1.5">
          {antardashas.map((ad, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                ad.is_current
                  ? "bg-gold-glow border border-border-accent"
                  : "bg-bg-surface-2 border border-border hover:border-border-strong"
              )}
            >
              <div
                className={cn(
                  "size-7 rounded-full flex items-center justify-center text-tiny font-bold",
                  ad.is_current ? "bg-gold text-bg-primary" : "bg-bg-elevated text-text-muted"
                )}
              >
                {i + 1}
              </div>
              <div className="flex-1 text-small text-text-primary font-medium">
                {ad.lord_en}
              </div>
              <div className="text-tiny text-text-muted font-mono">
                {ad.start?.slice(0, 10)} → {ad.end?.slice(0, 10)}
              </div>
              {ad.is_current && (
                <Badge variant="gold" size="sm">Now</Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STATES
   ══════════════════════════════════════════════════════════════════ */
function LoadingChart({ error = false }: { error?: boolean }) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <AlertCircle className="size-6 text-error mb-2" />
        <div className="text-small">Could not compute chart — backend error.</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 text-text-muted">
      <Loader2 className="size-6 animate-spin mb-2" />
      <div className="text-small">Computing chart (Swiss Ephemeris)…</div>
    </div>
  );
}

function PlaceholderTab({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
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
        <Sparkles className="size-3.5" /> Coming in next phase
      </Badge>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}
