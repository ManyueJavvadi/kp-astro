"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  Plus,
  Loader2,
  Users,
  Heart,
  Briefcase,
  Activity,
  Coins,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMe } from "@/hooks/use-me";
import {
  useClientsList,
  useCreateClient,
  useClientWorkspace,
} from "@/hooks/use-clients";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ConsumerDashboardPage() {
  const { data: me } = useMe();
  const { data: clients } = useClientsList();

  // For consumers, "Self" is the first client tagged 'self' or the first one
  const selfClient =
    clients?.items.find(
      (c) => c.tags?.includes("self") || c.preferred_name === me?.full_name
    ) ??
    clients?.items[0] ??
    null;

  const firstName = (me?.full_name ?? "").split(" ")[0] || "there";

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] leading-tight font-semibold text-balance">
            Namaste, <span className="text-gold">{firstName}</span>
          </h1>
        </div>
        {me?.tier === "free" && (
          <Badge variant="ai" size="lg">
            <Sparkles className="size-3.5" /> Free tier
          </Badge>
        )}
      </div>

      {!selfClient ? (
        <OnboardingCard />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="flex flex-col gap-6 min-w-0">
            <HeroAI client={selfClient} />
            <TodaysEnergy clientId={selfClient.id} />
            <FamilyProfiles />
          </div>
          <div className="flex flex-col gap-6 min-w-0">
            <YourChart clientId={selfClient.id} />
            <UpgradeCard tier={me?.tier ?? "free"} />
          </div>
        </div>
      )}
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ONBOARDING — first-time user has no chart yet
   ══════════════════════════════════════════════════════════════════ */
function OnboardingCard() {
  const create = useCreateClient();
  const [form, setForm] = useState({
    full_name: "",
    birth_date: "",
    birth_time: "",
    birth_place: "",
    birth_lat: "",
    birth_lon: "",
    birth_timezone: "Asia/Kolkata",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.birth_date || !form.birth_time || !form.birth_place) {
      toast.error("Fill all fields");
      return;
    }
    await create.mutateAsync({
      full_name: form.full_name,
      birth_date: form.birth_date,
      birth_time: form.birth_time,
      birth_timezone: form.birth_timezone,
      birth_lat: parseFloat(form.birth_lat || "17.385"),
      birth_lon: parseFloat(form.birth_lon || "78.4867"),
      birth_place: form.birth_place,
      tags: ["self"],
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl p-[1px] bg-gradient-to-b from-gold-glow to-transparent">
        <div className="rounded-2xl bg-gradient-to-br from-bg-surface via-bg-surface to-bg-surface-2 p-8 border border-border">
          <Badge variant="gold" size="md" className="mb-4">
            <Sparkles className="size-3.5" /> Your first kundli
          </Badge>
          <h2 className="font-display text-h1 font-semibold text-text-primary mb-2">
            Add your birth data to decode your destiny
          </h2>
          <p className="text-body text-text-secondary mb-6">
            We compute your KP kundli using Swiss Ephemeris. All data stays
            private to you. Accurate birth time + place is essential for Lagna.
          </p>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Your name
              </label>
              <Input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Ravi Kumar"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                  Birth date
                </label>
                <Input
                  required
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                  Birth time
                </label>
                <Input
                  required
                  type="time"
                  value={form.birth_time}
                  onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Birth place
              </label>
              <Input
                required
                value={form.birth_place}
                onChange={(e) => setForm({ ...form, birth_place: e.target.value })}
                placeholder="Hyderabad, Telangana, India"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                  Latitude
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.birth_lat}
                  onChange={(e) => setForm({ ...form, birth_lat: e.target.value })}
                  placeholder="17.385"
                />
              </div>
              <div>
                <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                  Longitude
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.birth_lon}
                  onChange={(e) => setForm({ ...form, birth_lon: e.target.value })}
                  placeholder="78.4867"
                />
              </div>
              <div>
                <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                  Timezone
                </label>
                <Input
                  value={form.birth_timezone}
                  onChange={(e) => setForm({ ...form, birth_timezone: e.target.value })}
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              rightIcon={<ArrowRight />}
              loading={create.isPending}
              className="mt-3"
            >
              Create my kundli
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HERO AI — asks Claude with the user's chart context
   ══════════════════════════════════════════════════════════════════ */
function HeroAI({ client }: { client: any }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const ask = async (topic: string, override?: string) => {
    const question = override ?? q;
    if (!question && !topic) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await api.post("/astrologer/analyze", {
        name: client.full_name,
        date: client.birth_dt_local_str.split("T")[0],
        time: client.birth_dt_local_str.split("T")[1].slice(0, 5),
        latitude: client.birth_lat,
        longitude: client.birth_lon,
        timezone_offset: 5.5,
        topic: topic || "general",
        question,
        history: [],
        language: "english",
      });
      setAnswer(res.data.answer);
    } catch {
      toast.error("AI failed — try again");
    }
    setLoading(false);
  };

  const topics = [
    { label: "Love", key: "marriage", icon: <Heart className="size-3.5 text-pink-400" /> },
    { label: "Career", key: "job", icon: <Briefcase className="size-3.5 text-blue-400" /> },
    { label: "Health", key: "health", icon: <Activity className="size-3.5 text-success" /> },
    { label: "Money", key: "wealth", icon: <Coins className="size-3.5 text-warning" /> },
  ];

  return (
    <div className="rounded-2xl p-[1px] bg-gradient-to-b from-gold-glow to-transparent">
      <div className="rounded-2xl bg-gradient-to-br from-bg-surface via-bg-surface to-bg-surface-2 p-6 border border-border">
        <Badge variant="ai" size="md" className="mb-3">
          <Sparkles className="size-3" /> AI Vedic Astrologer
        </Badge>
        <div className="font-display text-h2 font-semibold text-text-primary mb-4">
          Ready to decode your destiny?
        </div>
        <div className="rounded-xl bg-bg-primary/50 border border-border-strong p-1 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 ml-3 text-gold shrink-0" />
            <input
              placeholder="Ask about your future..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask("")}
              className="flex-1 bg-transparent outline-none text-body text-text-primary placeholder:text-text-muted py-2.5"
            />
            <Button
              variant="primary"
              size="sm"
              rightIcon={<Send />}
              loading={loading}
              onClick={() => ask("")}
            >
              Ask
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <button
              key={t.key}
              onClick={() => ask(t.key, `Give me an overview about ${t.label.toLowerCase()}.`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-surface-2 border border-border hover:border-border-accent text-small text-text-secondary hover:text-text-primary transition-colors"
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="mt-5 flex items-center gap-2 text-small text-text-muted">
            <Loader2 className="size-4 animate-spin" /> Claude is reading your chart…
          </div>
        )}

        {answer && (
          <div className="mt-5 rounded-xl p-4 bg-[color-mix(in_srgb,var(--color-ai)_5%,transparent)] border border-[color-mix(in_srgb,var(--color-ai)_25%,transparent)]">
            <div className="text-tiny uppercase tracking-wider text-ai mb-2 flex items-center gap-1.5">
              <Sparkles className="size-3" /> CLAUDE
            </div>
            <div className="text-small text-text-primary leading-relaxed whitespace-pre-wrap">
              {answer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TodaysEnergy({ clientId }: { clientId: string }) {
  const { data: ws } = useClientWorkspace(clientId);
  if (!ws) return null;
  const today = ws.panchangam_today ?? {};
  return (
    <div className="rounded-xl bg-bg-surface border border-border p-5">
      <div className="text-tiny uppercase tracking-wider text-gold mb-2">
        YOUR COSMIC ENERGY TODAY
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <Mini label="Tithi" value={today.tithi_en ?? today.tithi ?? "—"} />
        <Mini label="Nakshatra" value={today.nakshatra_en ?? today.nakshatra ?? "—"} />
        <Mini label="Yoga" value={today.yoga_en ?? today.yoga ?? "—"} />
        <Mini label="Current Hora" value={today.hora_lord ?? "—"} />
      </div>
      <div className="text-tiny text-text-muted">
        Your current Mahadasha:{" "}
        <span className="text-text-primary font-medium">
          {ws.current_dasha?.lord_en}
        </span>{" "}
        until {ws.current_dasha?.end?.slice(0, 10)}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-md bg-bg-surface-2 border border-border">
      <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">
        {label}
      </div>
      <div className="text-small font-medium text-text-primary leading-tight">
        {value}
      </div>
    </div>
  );
}

function FamilyProfiles() {
  const { data: clients } = useClientsList();
  const items = clients?.items ?? [];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-tiny uppercase tracking-wider text-gold">
          FAMILY & FRIENDS
        </div>
        <Link href="/pro/clients" className="text-tiny text-gold hover:text-gold-bright">
          Manage
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.slice(0, 5).map((c) => (
          <Link
            key={c.id}
            href={`/pro/clients/${c.id}`}
            className="p-3 rounded-lg bg-bg-surface border border-border hover:border-border-accent transition-colors flex flex-col items-center text-center gap-2"
          >
            <div className="size-10 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-body font-semibold text-gold">
              {c.full_name[0].toUpperCase()}
            </div>
            <div>
              <div className="text-small font-medium text-text-primary truncate max-w-[100px]">
                {c.full_name}
              </div>
              <div className="text-tiny text-text-muted truncate max-w-[100px]">
                {c.birth_place}
              </div>
            </div>
          </Link>
        ))}
        {items.length < 5 && (
          <AddFamilyButton />
        )}
      </div>
    </div>
  );
}

function AddFamilyButton() {
  const create = useCreateClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    birth_date: "",
    birth_time: "",
    birth_place: "",
    birth_lat: "",
    birth_lon: "",
    birth_timezone: "Asia/Kolkata",
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      full_name: form.full_name,
      birth_date: form.birth_date,
      birth_time: form.birth_time,
      birth_timezone: form.birth_timezone,
      birth_lat: parseFloat(form.birth_lat || "17.385"),
      birth_lon: parseFloat(form.birth_lon || "78.4867"),
      birth_place: form.birth_place,
      tags: ["family"],
    });
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-3 rounded-lg border border-dashed border-border-strong flex flex-col items-center justify-center gap-2 text-text-muted hover:border-border-accent hover:text-gold transition-colors">
          <Plus className="size-5" />
          <div className="text-tiny">Add</div>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a family profile</DialogTitle>
          <DialogDescription>
            Birth data creates their kundli. All private to your account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input
            required
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              required
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
            <Input
              required
              type="time"
              value={form.birth_time}
              onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
            />
          </div>
          <Input
            required
            placeholder="Birth place"
            value={form.birth_place}
            onChange={(e) => setForm({ ...form, birth_place: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              step="0.0001"
              placeholder="Lat"
              value={form.birth_lat}
              onChange={(e) => setForm({ ...form, birth_lat: e.target.value })}
            />
            <Input
              type="number"
              step="0.0001"
              placeholder="Lon"
              value={form.birth_lon}
              onChange={(e) => setForm({ ...form, birth_lon: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={create.isPending}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function YourChart({ clientId }: { clientId: string }) {
  const { data: ws } = useClientWorkspace(clientId);

  return (
    <div className="rounded-xl bg-bg-surface border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-tiny uppercase tracking-wider text-gold">
            YOUR JANAM KUNDLI
          </div>
          <div className="text-small font-medium text-text-primary mt-1">
            {ws?.cusps?.[0]?.sign_en ? `${ws.cusps[0].sign_en} Lagna` : "Loading…"}
          </div>
        </div>
        <Link
          href={`/pro/clients/${clientId}`}
          className="text-tiny text-gold hover:text-gold-bright"
        >
          Full chart →
        </Link>
      </div>
      {!ws ? (
        <div className="aspect-square rounded-lg bg-bg-primary border border-border flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-gold" />
        </div>
      ) : (
        <>
          <div className="aspect-square rounded-lg bg-bg-primary border border-border mb-4 p-3">
            <ConsumerChart ws={ws} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-tiny">
            <PillBadge label="Ascendant" value={ws.cusps?.[0]?.sign_en ?? "—"} />
            <PillBadge label="Sun" value={ws.planets?.find?.((p: any) => p.planet_en === "Sun")?.sign_en ?? "—"} />
            <PillBadge label="Moon" value={ws.planets?.find?.((p: any) => p.planet_en === "Moon")?.sign_en ?? "—"} />
          </div>
        </>
      )}
    </div>
  );
}

function ConsumerChart({ ws }: { ws: any }) {
  const planets: any[] = Array.isArray(ws?.planets) ? ws.planets : [];
  const byHouse: Record<number, string[]> = {};
  for (let i = 1; i <= 12; i++) byHouse[i] = [];
  for (const p of planets) {
    byHouse[p.house ?? 1].push(p.planet_en?.slice(0, 2) ?? "?");
  }
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <rect
        x="10"
        y="10"
        width="180"
        height="180"
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth="0.5"
        opacity="0.6"
      />
      <line x1="10" y1="10" x2="190" y2="190" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
      <line x1="190" y1="10" x2="10" y2="190" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
      <line x1="100" y1="10" x2="10" y2="100" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
      <line x1="100" y1="10" x2="190" y2="100" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
      <line x1="100" y1="190" x2="10" y2="100" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
      <line x1="100" y1="190" x2="190" y2="100" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.4" />
      {([
        { n: 1, x: 100, y: 50 },
        { n: 2, x: 150, y: 50 },
        { n: 3, x: 170, y: 100 },
        { n: 4, x: 150, y: 150 },
        { n: 5, x: 100, y: 150 },
        { n: 6, x: 50, y: 150 },
        { n: 7, x: 30, y: 100 },
        { n: 8, x: 50, y: 50 },
      ] as const).map((h) => (
        <text
          key={h.n}
          x={h.x}
          y={h.y}
          fill="var(--color-gold)"
          fontSize="9"
          fontFamily="serif"
          textAnchor="middle"
        >
          {byHouse[h.n].join(" ") || ""}
        </text>
      ))}
    </svg>
  );
}

function PillBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-md bg-bg-surface-2 border border-border">
      <div className="text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="text-text-primary font-medium">{value}</div>
    </div>
  );
}

function UpgradeCard({ tier }: { tier: string }) {
  if (tier !== "free") {
    return (
      <div className="rounded-xl bg-bg-surface border border-border p-5 text-center">
        <Badge variant="gold" size="md" className="mb-2">
          <Sparkles className="size-3" /> {tier.replace("_", " ")}
        </Badge>
        <div className="text-body text-text-primary font-medium mb-1">
          You&apos;re on a paid plan
        </div>
        <div className="text-small text-text-muted">Unlimited features unlocked.</div>
      </div>
    );
  }
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
          Pro unlocks unlimited AI questions, family profiles (up to 5),
          all 6 premium readings, and PDF export.
        </div>
        <div className="flex items-baseline gap-1 mb-4">
          <span className="font-display text-h1 font-bold text-gold">₹299</span>
          <span className="text-small text-text-muted">/month</span>
        </div>
        <Button variant="primary" fullWidth rightIcon={<ArrowRight />} disabled>
          Start free trial
        </Button>
        <div className="text-tiny text-text-muted mt-2 text-center">
          Stripe checkout shipping in launch phase
        </div>
      </div>
    </div>
  );
}

// keep
export const _unused = Users;
