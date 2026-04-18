"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Sparkles,
  Loader2,
  Plus,
  Heart,
  Briefcase,
  Activity,
  Coins,
  Send,
} from "lucide-react";
import { theme, styles } from "@/lib/theme";
import { ContentCard, SectionLabel, SectionHeading } from "@/components/ui/content-card";
import {
  Dialog,
  DialogBody,
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
  type ClientCreateBody,
} from "@/hooks/use-clients";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { PlacePicker } from "@/components/ui/place-picker";

function useIsNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

export default function ConsumerDashboardPage() {
  const { data: me } = useMe();
  const { data: clients } = useClientsList();
  const selfClient =
    clients?.items.find(
      (c) =>
        c.tags?.includes("self") ||
        (me?.full_name && c.preferred_name === me.full_name)
    ) ??
    clients?.items[0] ??
    null;

  const firstName = (me?.full_name ?? "").split(" ")[0] || "there";
  const isNarrow = useIsNarrow();

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: isNarrow ? "20px 16px" : "32px 24px",
        display: "flex",
        flexDirection: "column",
        gap: isNarrow ? 16 : 24,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={styles.sectionLabel}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <h1 style={styles.pageTitle}>
            Namaste, <span style={{ color: theme.gold }}>{firstName}</span>
          </h1>
        </div>
        {me?.tier === "free" && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              padding: "6px 12px",
              borderRadius: 999,
              backgroundColor: "rgba(167,139,250,0.1)",
              color: theme.ai,
              border: "1px solid rgba(167,139,250,0.3)",
            }}
          >
            <Sparkles size={12} /> Free tier
          </span>
        )}
      </header>

      {!selfClient ? (
        <OnboardingCard />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 320px",
            gap: isNarrow ? 16 : 20,
            alignItems: "start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: isNarrow ? 16 : 20, minWidth: 0 }}>
            <HeroAI client={selfClient} />
            <TodaysEnergy clientId={selfClient.id} />
            <FamilyProfiles />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: isNarrow ? 16 : 20, minWidth: 0 }}>
            <YourChart clientId={selfClient.id} />
            <UpgradeCard tier={me?.tier ?? "free"} />
          </div>
        </div>
      )}
    </main>
  );
}

function OnboardingCard() {
  const router = useRouter();
  const create = useCreateClient();
  const [err, setErr] = useState<string | null>(null);
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
    setErr(null);
    if (!form.full_name || !form.birth_date || !form.birth_time || !form.birth_place) {
      setErr("Please fill name, date, time and place.");
      return;
    }
    if (!form.birth_lat || !form.birth_lon) {
      setErr("Pick your birth place from the dropdown so we can get the coordinates. Start typing and a suggestion list will appear.");
      return;
    }
    // Sanity-check birth date
    const today = new Date().toISOString().slice(0, 10);
    if (form.birth_date < "1900-01-01" || form.birth_date > today) {
      setErr("Birth date must be between 1900 and today.");
      return;
    }
    try {
      await create.mutateAsync({
        full_name: form.full_name,
        birth_date: form.birth_date,
        birth_time: form.birth_time,
        birth_timezone: form.birth_timezone || "Asia/Kolkata",
        birth_lat: parseFloat(form.birth_lat),
        birth_lon: parseFloat(form.birth_lon),
        birth_place: form.birth_place,
        tags: ["self"],
      } as ClientCreateBody);
      // Force a fresh fetch and bounce to dashboard so the view flips
      // from onboarding -> full consumer dashboard.
      router.replace("/app");
      router.refresh();
    } catch (e: unknown) {
      // Surface actual status + detail so we can diagnose production issues.
      let msg = "Could not create your kundli. Check you're signed in and try again.";
      if (e && typeof e === "object") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ax = e as any;
        const status = ax.response?.status;
        const detail =
          ax.response?.data?.detail ||
          (typeof ax.response?.data === "string" ? ax.response.data : null) ||
          ax.message;
        if (status || detail) {
          msg = `${status ? `[${status}] ` : ""}${detail ?? "Network error"}`;
        }
        // Log to browser console for further debugging
        // eslint-disable-next-line no-console
        console.error("Create kundli failed:", {
          status,
          data: ax.response?.data,
          message: ax.message,
          code: ax.code,
        });
      }
      setErr(msg);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", width: "100%" }}>
      <ContentCard>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            padding: "3px 10px",
            borderRadius: 999,
            backgroundColor: "rgba(201,169,110,0.12)",
            color: theme.gold,
            fontWeight: 600,
            letterSpacing: "0.04em",
            marginBottom: 16,
          }}
        >
          <Sparkles size={11} /> Your first kundli
        </span>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: theme.text.primary,
            margin: "0 0 8px",
            letterSpacing: "-0.01em",
          }}
        >
          Add your birth data to decode your destiny
        </h2>
        <p style={{ fontSize: 13, color: theme.text.muted, margin: "0 0 20px", lineHeight: 1.5 }}>
          We compute your KP kundli using Swiss Ephemeris. Data is private to you.
          Accurate time + place is essential for the Lagna.
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Your name">
            <input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Ravi Kumar"
              style={styles.input}
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Birth date">
              <input
                required
                type="date"
                value={form.birth_date}
                min="1900-01-01"
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                style={styles.input}
              />
            </Field>
            <Field label="Birth time">
              <input
                required
                type="time"
                value={form.birth_time}
                onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
                style={styles.input}
              />
            </Field>
          </div>
          <Field label="Birth place">
            <PlacePicker
              value={form.birth_place}
              onChange={(place, pick) => {
                setForm((f) => ({
                  ...f,
                  birth_place: place,
                  birth_lat: pick ? pick.lat.toFixed(4) : f.birth_lat,
                  birth_lon: pick ? pick.lon.toFixed(4) : f.birth_lon,
                  birth_timezone: pick?.timezone ?? f.birth_timezone,
                }));
              }}
            />
          </Field>
          {/* Read-only confirmation row shown ONLY after a place is picked */}
          {form.birth_lat && form.birth_lon && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                fontSize: 11,
                color: theme.text.muted,
              }}
            >
              <div>
                <div style={{ letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
                  Latitude
                </div>
                <div style={{ color: theme.text.secondary, fontSize: 13 }}>{form.birth_lat}</div>
              </div>
              <div>
                <div style={{ letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
                  Longitude
                </div>
                <div style={{ color: theme.text.secondary, fontSize: 13 }}>{form.birth_lon}</div>
              </div>
              <div>
                <div style={{ letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
                  Timezone
                </div>
                <div style={{ color: theme.text.secondary, fontSize: 13 }}>{form.birth_timezone}</div>
              </div>
            </div>
          )}
          {err && (
            <div
              role="alert"
              style={{
                marginTop: 4,
                padding: "10px 12px",
                borderRadius: 6,
                backgroundColor: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.3)",
                color: theme.error,
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {err}
            </div>
          )}
          <button
            type="submit"
            disabled={create.isPending}
            style={{
              ...styles.primaryButton,
              height: 40,
              marginTop: 8,
              width: "100%",
              justifyContent: "center",
              opacity: create.isPending ? 0.6 : 1,
            }}
          >
            {create.isPending ? (
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <>Create my kundli <ArrowRight size={14} /></>
            )}
          </button>
        </form>
      </ContentCard>
    </div>
  );
}

function HeroAI({ client }: { client: any }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const ask = async (topic?: string, override?: string) => {
    const question = override ?? q;
    if (!question && !topic) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await api.post<{ answer: string }>("/astrologer/analyze", {
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
      toast.error("AI failed");
    }
    setLoading(false);
  };

  const topics = [
    { label: "Love", key: "marriage", icon: <Heart size={12} color="#f9a8d4" /> },
    { label: "Career", key: "job", icon: <Briefcase size={12} color="#93c5fd" /> },
    { label: "Health", key: "health", icon: <Activity size={12} color={theme.success} /> },
    { label: "Money", key: "wealth", icon: <Coins size={12} color={theme.warning} /> },
  ];

  return (
    <ContentCard>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          padding: "3px 10px",
          borderRadius: 999,
          backgroundColor: "rgba(167,139,250,0.1)",
          color: theme.ai,
          fontWeight: 600,
          letterSpacing: "0.04em",
          marginBottom: 12,
        }}
      >
        <Sparkles size={11} /> AI Vedic Astrologer
      </span>
      <div style={{ fontSize: 18, fontWeight: 600, color: theme.text.primary, marginBottom: 12 }}>
        Ready to decode your destiny?
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: 4,
          borderRadius: 8,
          backgroundColor: theme.bg.page,
          border: theme.border.strong,
          marginBottom: 12,
        }}
      >
        <Sparkles size={14} color={theme.gold} style={{ marginLeft: 10 }} />
        <input
          placeholder="Ask about your future..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          style={{
            flex: 1,
            height: 36,
            border: "none",
            backgroundColor: "transparent",
            outline: "none",
            color: theme.text.primary,
            fontSize: 13,
          }}
        />
        <button onClick={() => ask()} style={{ ...styles.primaryButton, height: 32 }}>
          <Send size={13} /> Ask
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {topics.map((t) => (
          <button
            key={t.key}
            onClick={() => ask(t.key, `Give me an overview about ${t.label.toLowerCase()}.`)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 11px",
              borderRadius: 999,
              backgroundColor: theme.bg.page,
              border: theme.border.default,
              color: theme.text.secondary,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: theme.text.muted,
          }}
        >
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Claude is reading your chart…
        </div>
      )}

      {answer && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 8,
            backgroundColor: "rgba(167,139,250,0.04)",
            border: "1px solid rgba(167,139,250,0.2)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: theme.ai,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 600,
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Sparkles size={11} /> Claude
          </div>
          <div style={{ fontSize: 13, color: theme.text.primary, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {answer}
          </div>
        </div>
      )}
    </ContentCard>
  );
}

function TodaysEnergy({ clientId }: { clientId: string }) {
  const { data: ws } = useClientWorkspace(clientId);
  if (!ws) return null;
  const today = ws.panchangam_today ?? {};
  return (
    <ContentCard>
      <SectionLabel>Your cosmic energy today</SectionLabel>
      <SectionHeading>Daily panchang</SectionHeading>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginTop: 14,
        }}
      >
        <Mini label="Tithi" value={today.tithi_en ?? today.tithi ?? "—"} />
        <Mini label="Nakshatra" value={today.nakshatra_en ?? today.nakshatra ?? "—"} />
        <Mini label="Yoga" value={today.yoga_en ?? today.yoga ?? "—"} />
        <Mini label="Hora" value={today.hora_lord ?? "—"} />
      </div>
      <div style={{ fontSize: 12, color: theme.text.muted, marginTop: 12 }}>
        Current Mahadasha:{" "}
        <span style={{ color: theme.text.primary, fontWeight: 500 }}>
          {ws.current_dasha?.lord_en}
        </span>{" "}
        until {ws.current_dasha?.end?.slice(0, 10)}
      </div>
    </ContentCard>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 6,
        backgroundColor: theme.bg.page,
        border: theme.border.default,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: theme.text.dim,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: theme.text.primary }}>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
        <div>
          <SectionLabel>Family & friends</SectionLabel>
          <SectionHeading>Your profiles</SectionHeading>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
        }}
      >
        {items.slice(0, 5).map((c) => (
          <Link
            key={c.id}
            href={`/pro/clients/${c.id}`}
            style={{
              padding: 14,
              borderRadius: 8,
              backgroundColor: theme.bg.content,
              border: theme.border.default,
              textDecoration: "none",
              color: theme.text.primary,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: `linear-gradient(135deg, ${theme.gold}, ${theme.goldDim})`,
                color: "#07070d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {c.full_name[0].toUpperCase()}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: theme.text.primary }}>
                {c.full_name}
              </div>
              <div style={{ fontSize: 10, color: theme.text.muted }}>
                {c.birth_place}
              </div>
            </div>
          </Link>
        ))}
        {items.length < 5 && <AddFamilyButton />}
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
    if (!form.birth_lat || !form.birth_lon) {
      toast.error("Pick a place from the dropdown so we can get coordinates.");
      return;
    }
    await create.mutateAsync({
      full_name: form.full_name,
      birth_date: form.birth_date,
      birth_time: form.birth_time,
      birth_timezone: form.birth_timezone || "Asia/Kolkata",
      birth_lat: parseFloat(form.birth_lat),
      birth_lon: parseFloat(form.birth_lon),
      birth_place: form.birth_place,
      tags: ["family"],
    } as ClientCreateBody);
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          style={{
            padding: 14,
            borderRadius: 8,
            border: `1px dashed ${theme.text.dim}`,
            backgroundColor: "transparent",
            color: theme.text.muted,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minHeight: 96,
          }}
        >
          <Plus size={16} />
          <span style={{ fontSize: 11 }}>Add</span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add family profile</DialogTitle>
          <DialogDescription>
            Birth data creates their kundli. All private to your account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} style={{ display: "contents" }}>
          <DialogBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Full name">
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  style={styles.input}
                />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Date">
                  <input
                    required
                    type="date"
                    value={form.birth_date}
                    min="1900-01-01"
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                    style={styles.input}
                  />
                </Field>
                <Field label="Time">
                  <input
                    required
                    type="time"
                    value={form.birth_time}
                    onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
                    style={styles.input}
                  />
                </Field>
              </div>
              <Field label="Place">
                <PlacePicker
                  value={form.birth_place}
                  onChange={(place, pick) => {
                    setForm((f) => ({
                      ...f,
                      birth_place: place,
                      birth_lat: pick ? pick.lat.toFixed(4) : f.birth_lat,
                      birth_lon: pick ? pick.lon.toFixed(4) : f.birth_lon,
                      birth_timezone: pick?.timezone ?? f.birth_timezone,
                    }));
                  }}
                />
              </Field>
              {form.birth_lat && form.birth_lon && (
                <div
                  style={{
                    fontSize: 11,
                    color: theme.text.muted,
                    display: "flex",
                    gap: 18,
                  }}
                >
                  <span>lat {form.birth_lat}</span>
                  <span>lon {form.birth_lon}</span>
                  <span>{form.birth_timezone}</span>
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" onClick={() => setOpen(false)} style={styles.ghostButton}>
              Cancel
            </button>
            <button type="submit" disabled={create.isPending} style={styles.primaryButton}>
              {create.isPending ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Plus size={14} />
              )}
              Add
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function YourChart({ clientId }: { clientId: string }) {
  const { data: ws } = useClientWorkspace(clientId);
  return (
    <ContentCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
        <div>
          <SectionLabel>Your janam kundli</SectionLabel>
          <SectionHeading>
            {ws?.cusps?.[0]?.sign_en ? `${ws.cusps[0].sign_en} Lagna` : "Loading…"}
          </SectionHeading>
        </div>
        <Link href={`/pro/clients/${clientId}`} style={{ fontSize: 11, color: theme.gold, textDecoration: "none" }}>
          Full chart →
        </Link>
      </div>
      {!ws ? (
        <div
          style={{
            aspectRatio: "1 / 1",
            borderRadius: 6,
            backgroundColor: theme.bg.page,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme.gold,
          }}
        >
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : (
        <>
          <div
            style={{
              aspectRatio: "1 / 1",
              borderRadius: 6,
              backgroundColor: theme.bg.page,
              border: theme.border.default,
              padding: 10,
              marginBottom: 12,
            }}
          >
            <ConsumerChartSVG ws={ws} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            <PillTile label="Ascendant" value={ws.cusps?.[0]?.sign_en ?? "—"} />
            <PillTile
              label="Sun"
              value={ws.planets?.find?.((p: any) => p.planet_en === "Sun")?.sign_en ?? "—"}
            />
            <PillTile
              label="Moon"
              value={ws.planets?.find?.((p: any) => p.planet_en === "Moon")?.sign_en ?? "—"}
            />
          </div>
        </>
      )}
    </ContentCard>
  );
}

function PillTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        backgroundColor: theme.bg.page,
        border: theme.border.default,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: theme.text.dim,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, color: theme.text.primary }}>
        {value}
      </div>
    </div>
  );
}

function ConsumerChartSVG({ ws }: { ws: any }) {
  const planets: any[] = Array.isArray(ws?.planets) ? ws.planets : [];
  const byHouse: Record<number, string[]> = {};
  for (let i = 1; i <= 12; i++) byHouse[i] = [];
  for (const p of planets) {
    byHouse[p.house ?? 1].push(p.planet_en?.slice(0, 2) ?? "?");
  }
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <rect x="10" y="10" width="180" height="180" fill="none" stroke={theme.gold} strokeOpacity="0.5" strokeWidth="0.7" />
      <line x1="10" y1="10" x2="190" y2="190" stroke={theme.gold} strokeOpacity="0.3" strokeWidth="0.5" />
      <line x1="190" y1="10" x2="10" y2="190" stroke={theme.gold} strokeOpacity="0.3" strokeWidth="0.5" />
      <line x1="100" y1="10" x2="10" y2="100" stroke={theme.gold} strokeOpacity="0.3" strokeWidth="0.5" />
      <line x1="100" y1="10" x2="190" y2="100" stroke={theme.gold} strokeOpacity="0.3" strokeWidth="0.5" />
      <line x1="100" y1="190" x2="10" y2="100" stroke={theme.gold} strokeOpacity="0.3" strokeWidth="0.5" />
      <line x1="100" y1="190" x2="190" y2="100" stroke={theme.gold} strokeOpacity="0.3" strokeWidth="0.5" />
      {[
        { n: 1, x: 100, y: 50 },
        { n: 2, x: 150, y: 50 },
        { n: 3, x: 170, y: 100 },
        { n: 4, x: 150, y: 150 },
        { n: 5, x: 100, y: 150 },
        { n: 6, x: 50, y: 150 },
        { n: 7, x: 30, y: 100 },
        { n: 8, x: 50, y: 50 },
      ].map((h) => (
        <text
          key={h.n}
          x={h.x}
          y={h.y}
          fill={theme.gold}
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

function UpgradeCard({ tier }: { tier: string }) {
  if (tier !== "free") {
    return (
      <ContentCard>
        <div style={{ textAlign: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 999,
              backgroundColor: "rgba(201,169,110,0.15)",
              color: theme.gold,
              fontWeight: 600,
            }}
          >
            <Sparkles size={11} /> {tier.replace("_", " ")}
          </span>
          <div style={{ fontSize: 13, color: theme.text.primary, fontWeight: 500, marginTop: 8 }}>
            You&apos;re on a paid plan
          </div>
          <div style={{ fontSize: 12, color: theme.text.muted, marginTop: 2 }}>
            Unlimited features unlocked.
          </div>
        </div>
      </ContentCard>
    );
  }
  return (
    <ContentCard style={{ border: `1px solid ${theme.gold}50` }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 11,
          padding: "3px 10px",
          borderRadius: 999,
          backgroundColor: "rgba(201,169,110,0.15)",
          color: theme.gold,
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        <Sparkles size={11} /> Unlock Pro
      </span>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.text.primary, marginBottom: 6 }}>
        Ask unlimited questions
      </div>
      <p style={{ fontSize: 12, color: theme.text.muted, margin: "0 0 14px", lineHeight: 1.5 }}>
        Pro unlocks unlimited AI questions, family profiles (up to 5), premium
        readings, and PDF export.
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: theme.gold, lineHeight: 1 }}>₹299</span>
        <span style={{ fontSize: 11, color: theme.text.muted }}>/month</span>
      </div>
      <button
        disabled
        style={{
          ...styles.primaryButton,
          width: "100%",
          justifyContent: "center",
          opacity: 0.5,
          cursor: "not-allowed",
        }}
      >
        Start free trial <ArrowRight size={13} />
      </button>
      <div style={{ fontSize: 10, color: theme.text.dim, marginTop: 8, textAlign: "center" }}>
        Stripe checkout ships at launch
      </div>
    </ContentCard>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: theme.text.dim,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 500,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
