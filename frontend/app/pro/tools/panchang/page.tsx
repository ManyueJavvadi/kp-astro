"use client";

import { useEffect, useState } from "react";
import { Calendar, MapPin, Loader2, Sun, Moon } from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function PanchangPage() {
  const [coords, setCoords] = useState({ lat: 17.385, lon: 78.4867 });
  const [place, setPlace] = useState("Hyderabad, India");
  const [tz, setTz] = useState(5.5);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.post("/panchangam/location", {
        latitude: coords.lat,
        longitude: coords.lon,
        timezone_offset: tz,
        date: new Date().toISOString().slice(0, 10),
      });
      setData(res.data);
    } catch {
      toast.error("Panchang failed");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <TopBar title="Panchang" tabs={[]} />
      <main className="px-6 pb-12 pt-6 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-tiny uppercase tracking-wider text-gold mb-1">
              TODAY · {new Date().toLocaleDateString()}
            </div>
            <h1 className="font-display text-h1 font-semibold text-text-primary">
              Panchang
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-text-muted" />
            <Input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              size="sm"
              className="max-w-xs"
            />
            <Input
              type="number"
              step="0.01"
              value={coords.lat}
              onChange={(e) => setCoords({ ...coords, lat: parseFloat(e.target.value) })}
              size="sm"
              className="w-24"
            />
            <Input
              type="number"
              step="0.01"
              value={coords.lon}
              onChange={(e) => setCoords({ ...coords, lon: parseFloat(e.target.value) })}
              size="sm"
              className="w-24"
            />
            <Button variant="primary" size="sm" leftIcon={<Calendar />} onClick={load} loading={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {loading && !data && (
          <div className="flex items-center justify-center py-20 text-text-muted">
            <Loader2 className="size-6 animate-spin mr-2" /> Loading panchang…
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Tile label="Tithi" value={data.tithi_en ?? data.tithi} sub={data.tithi} color="purple" />
            <Tile label="Nakshatra" value={data.nakshatra_en ?? data.nakshatra} sub={data.nakshatra} color="blue" />
            <Tile label="Yoga" value={data.yoga_en ?? data.yoga} sub={data.yoga} color="teal" />
            <Tile label="Karana" value={data.karana} sub={data.karana_te} color="orange" />
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-bg-surface border border-border p-5">
              <div className="text-tiny uppercase tracking-wider text-gold mb-3">CELESTIAL</div>
              <div className="space-y-3">
                <Row icon={<Sun className="size-4 text-warning" />} label="Sunrise" value={data.sunrise} />
                <Row icon={<Moon className="size-4 text-text-secondary" />} label="Sunset" value={data.sunset} />
                <Row icon={<span className="font-bold text-gold">R</span>} label="Rahu Kalam" value={data.rahu_kalam} />
                <Row icon={<span className="text-text-muted">D</span>} label="Vara (Day)" value={data.vara_en ?? data.vara} />
                <Row icon={<span className="text-gold">H</span>} label="Current Hora" value={data.hora_lord} />
              </div>
            </div>

            <div className="rounded-xl bg-bg-surface border border-border p-5">
              <div className="text-tiny uppercase tracking-wider text-gold mb-3">RAW RESPONSE</div>
              <pre className="text-tiny font-mono text-text-secondary whitespace-pre-wrap break-words overflow-auto max-h-[500px]">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function Tile({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  const colors: Record<string, string> = {
    purple: "border-[color-mix(in_srgb,#a78bfa_30%,transparent)] bg-[color-mix(in_srgb,#a78bfa_8%,transparent)]",
    blue: "border-[color-mix(in_srgb,#60a5fa_30%,transparent)] bg-[color-mix(in_srgb,#60a5fa_8%,transparent)]",
    teal: "border-[color-mix(in_srgb,#34d399_30%,transparent)] bg-[color-mix(in_srgb,#34d399_8%,transparent)]",
    orange: "border-[color-mix(in_srgb,#fb923c_30%,transparent)] bg-[color-mix(in_srgb,#fb923c_8%,transparent)]",
  };
  return (
    <div className={`p-5 rounded-xl border ${colors[color] ?? "bg-bg-surface border-border"}`}>
      <div className="text-tiny uppercase tracking-wider text-text-muted mb-2">{label}</div>
      <div className="font-display text-h3 font-semibold text-text-primary mb-1">{value}</div>
      {sub && <div className="text-tiny text-text-muted font-sans">{sub}</div>}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 flex items-center justify-center text-tiny">{icon}</div>
      <div className="flex-1 text-small text-text-secondary">{label}</div>
      <Badge size="sm" variant="outline" className="font-mono">
        {value}
      </Badge>
    </div>
  );
}
