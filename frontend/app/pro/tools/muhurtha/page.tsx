"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { Target, Sparkles, Loader2, Calendar, MapPin, Users } from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";

const EVENT_TYPES = [
  { key: "marriage", label: "Marriage" },
  { key: "business", label: "Business start" },
  { key: "house_warming", label: "House warming" },
  { key: "travel", label: "Travel" },
  { key: "education", label: "Education" },
];

export default function MuhurthaPage() {
  const [eventType, setEventType] = useState("marriage");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [lat, setLat] = useState(17.385);
  const [lon, setLon] = useState(78.4867);
  const [place, setPlace] = useState("Hyderabad, India");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedWindow, setExpandedWindow] = useState<number | null>(null);

  const run = async () => {
    if (!dateStart || !dateEnd) {
      toast.error("Pick a date range");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/muhurtha/find", {
        event_type: eventType,
        date_start: dateStart,
        date_end: dateEnd,
        latitude: lat,
        longitude: lon,
        timezone_offset: 5.5,
        participants: [],
      });
      setResult(res.data);
    } catch {
      toast.error("Muhurtha search failed");
    }
    setLoading(false);
  };

  const windows: any[] = result?.windows ?? [];

  return (
    <>
      <TopBar title="Muhurtha" tabs={[]} />
      <main className="px-6 pb-12 pt-6 max-w-[1200px] mx-auto">
        <div className="mb-6">
          <div className="text-tiny uppercase tracking-wider text-gold mb-1">
            AUSPICIOUS TIMING
          </div>
          <h1 className="font-display text-h1 font-semibold text-text-primary">
            Muhurtha finder
          </h1>
        </div>

        {/* Setup */}
        <div className="rounded-xl bg-bg-surface border border-border p-5 mb-6">
          <div className="mb-4">
            <div className="text-tiny uppercase tracking-wider text-text-muted mb-2">
              EVENT TYPE
            </div>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setEventType(t.key)}
                  className={
                    eventType === t.key
                      ? "px-4 py-2 rounded-full text-small font-medium bg-gold-glow text-gold border border-border-accent"
                      : "px-4 py-2 rounded-full text-small font-medium bg-bg-surface-2 text-text-secondary border border-border hover:text-text-primary"
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Date from
              </label>
              <Input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                leftIcon={<Calendar />}
              />
            </div>
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Date to
              </label>
              <Input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                leftIcon={<Calendar />}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Event location
              </label>
              <Input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                leftIcon={<MapPin />}
              />
            </div>
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Latitude
              </label>
              <Input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Longitude
              </label>
              <Input
                type="number"
                step="0.0001"
                value={lon}
                onChange={(e) => setLon(parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="primary"
              leftIcon={<Target />}
              loading={loading}
              onClick={run}
              size="lg"
            >
              Find auspicious windows
            </Button>
          </div>
        </div>

        {/* Results */}
        {result && windows.length === 0 && (
          <div className="p-10 rounded-xl border-2 border-dashed border-border-strong text-center">
            <div className="text-body text-text-muted">
              No strong muhurtha windows in that date range. Try extending the
              range or a different event type.
            </div>
          </div>
        )}

        {result?.nearby_better && (
          <div className="mb-4 p-4 rounded-lg bg-warning/10 border border-warning/30">
            <div className="text-tiny uppercase tracking-wider text-warning mb-1 font-medium">
              Better window nearby
            </div>
            <div className="text-body text-text-primary">
              {result.nearby_better.date_display} — Score{" "}
              {result.nearby_better.score} ({result.nearby_better.quality})
            </div>
          </div>
        )}

        {windows.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="text-tiny uppercase tracking-wider text-gold">
              {windows.length} WINDOW{windows.length > 1 ? "S" : ""} FOUND ·
              TOP BY SCORE
            </div>
            {windows.map((w: any, i: number) => {
              const expanded = expandedWindow === i;
              const qColor =
                w.quality === "Excellent"
                  ? "text-gold"
                  : w.quality === "Good"
                  ? "text-success"
                  : "text-text-muted";
              return (
                <div
                  key={i}
                  className="rounded-xl bg-bg-surface border border-border overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedWindow(expanded ? null : i)}
                    className="w-full text-left px-5 py-4 hover:bg-bg-hover transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <div className="text-tiny text-text-muted">
                          {w.date_display}
                        </div>
                        <div className="font-display text-h3 font-semibold text-text-primary mt-0.5">
                          {w.start_time} – {w.end_time}
                        </div>
                        <div className="text-tiny text-text-muted mt-1 flex items-center gap-2">
                          Lagna: <span className="text-text-primary">{w.lagna}</span> · SL:{" "}
                          <span className="text-gold font-medium">{w.lagna_sublord}</span>{" "}
                          · Houses: {w.signified_houses?.join(", ")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`font-display text-h2 font-bold ${qColor}`}>
                          {w.score}
                        </div>
                        <Badge variant={w.quality === "Excellent" ? "gold" : "default"} size="md">
                          {w.quality}
                        </Badge>
                      </div>
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-t border-border px-5 py-4 bg-bg-surface-2/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-small">
                        <KV label="Moon sign" value={w.moon_sign} />
                        <KV label="Moon nakshatra" value={w.moon_nakshatra} />
                        <KV label="Event cusp CSL" value={w.event_cusp_csl} />
                        <KV label="H11 CSL" value={w.h11_csl} />
                        <KV
                          label="Badhaka check"
                          value={w.badhaka_check?.passed ? "PASS" : "FAIL"}
                          good={w.badhaka_check?.passed}
                        />
                        <KV
                          label="Moon SL favorable"
                          value={w.moon_sl_favorable ? "Yes" : "No"}
                          good={w.moon_sl_favorable}
                        />
                        <KV label="Tithi" value={w.panchang?.tithi} />
                        <KV label="Yoga" value={w.panchang?.yoga} />
                        {w.in_rahu_kalam && (
                          <div className="col-span-2 text-error text-tiny">
                            ⚠ In Rahu Kalam
                          </div>
                        )}
                        {w.is_vishti && (
                          <div className="col-span-2 text-error text-tiny">
                            ⚠ Vishti Karana
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

function KV({ label, value, good }: { label: string; value?: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="text-text-muted text-tiny uppercase tracking-wider">{label}</div>
      <div className={good ? "text-success font-medium" : "text-text-primary"}>
        {value ?? "—"}
      </div>
    </div>
  );
}

// keep
export const _unused = Users;
