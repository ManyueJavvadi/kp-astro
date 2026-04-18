"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { Calendar, Loader2, Sunrise, Sunset, Clock } from "lucide-react";
import { theme, styles } from "@/lib/theme";
import { ContentCard, SectionLabel } from "@/components/ui/content-card";
import { PlacePicker } from "@/components/ui/place-picker";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function PanchangPage() {
  const [coords, setCoords] = useState({ lat: 17.385, lon: 78.4867 });
  const [place, setPlace] = useState("Hyderabad, India");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.post("/panchangam/location", {
        latitude: coords.lat,
        longitude: coords.lon,
        timezone_offset: 5.5,
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

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main
      style={{
        padding: "24px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        minHeight: "100vh",
      }}
    >
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
          <div style={styles.sectionLabel}>Today · {today}</div>
          <h1 style={styles.pageTitle}>Panchang</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 340 }}>
          <div style={{ width: 320 }}>
            <PlacePicker
              value={place}
              onChange={(placeName, pick) => {
                setPlace(placeName);
                if (pick) {
                  setCoords({ lat: pick.lat, lon: pick.lon });
                  // auto-refresh once a real place is picked
                  setTimeout(() => load(), 100);
                }
              }}
              inputStyle={{ height: 32 }}
              placeholder="Search city…"
            />
          </div>
          <button onClick={load} style={styles.primaryButton}>
            {loading ? (
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Calendar size={14} />
            )}
            Refresh
          </button>
        </div>
      </header>

      {loading && !data && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 0",
            color: theme.text.muted,
          }}
        >
          <Loader2 size={18} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} />
          Loading panchang…
        </div>
      )}

      {data && (
        <>
          {/* 5 elements row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <Element label="Tithi" main={data.tithi_en ?? data.tithi} sub={data.tithi} accent="#a78bfa" />
            <Element label="Nakshatra" main={data.nakshatra_en ?? data.nakshatra} sub={data.nakshatra} accent="#60a5fa" />
            <Element label="Yoga" main={data.yoga_en ?? data.yoga} sub={data.yoga} accent="#34d399" />
            <Element label="Karana" main={data.karana} sub={data.karana_te} accent="#fb923c" />
            <Element label="Vara" main={data.vara_en ?? data.vara} sub={data.vara} accent={theme.gold} />
          </div>

          {/* Celestial times */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <ContentCard>
              <SectionLabel>Celestial Times</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                <Row icon={<Sunrise size={14} color={theme.warning} />} label="Sunrise" value={data.sunrise} />
                <Row icon={<Sunset size={14} color={theme.warning} />} label="Sunset" value={data.sunset} />
                <Row
                  icon={<span style={{ fontSize: 11, fontWeight: 700, color: theme.gold }}>R</span>}
                  label="Rahu Kalam"
                  value={data.rahu_kalam}
                />
                <Row icon={<Clock size={14} color={theme.gold} />} label="Current Hora" value={data.hora_lord} />
              </div>
            </ContentCard>

            <ContentCard>
              <SectionLabel>Day Quality</SectionLabel>
              <div style={{ marginTop: 8, fontSize: 13, color: theme.text.secondary, lineHeight: 1.5 }}>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: theme.text.primary }}>
                    {data.vara_en ?? data.vara}
                  </strong>{" "}
                  · favorable activities and planetary influence according to
                  Panchang.
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: theme.text.muted,
                    padding: 10,
                    backgroundColor: theme.bg.page,
                    borderRadius: 6,
                  }}
                >
                  Avoid initiating new work during Rahu Kalam ({data.rahu_kalam}).
                  Current Hora lord ({data.hora_lord}) rules the hour.
                </div>
              </div>
            </ContentCard>
          </div>
        </>
      )}
    </main>
  );
}

function Element({
  label,
  main,
  sub,
  accent,
}: {
  label: string;
  main: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div
      style={{
        backgroundColor: theme.bg.content,
        border: `1px solid ${accent}30`,
        borderRadius: 8,
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: accent,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: theme.text.dim,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontWeight: 500,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: theme.text.primary, lineHeight: 1.3 }}>
        {main}
      </div>
      {sub && sub !== main && (
        <div style={{ fontSize: 11, color: theme.text.muted, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 0",
        borderBottom: theme.border.default,
      }}
    >
      <div style={{ width: 16, display: "flex", justifyContent: "center" }}>{icon}</div>
      <div style={{ flex: 1, fontSize: 13, color: theme.text.secondary }}>{label}</div>
      <div style={{ fontSize: 13, fontFamily: "monospace", color: theme.text.primary }}>{value}</div>
    </div>
  );
}
