"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { theme } from "@/lib/theme";
import { ContentCard, SectionLabel } from "@/components/ui/content-card";

export function ChartTab({ ws }: { ws: any }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gap: 20,
        alignItems: "start",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
        <ContentCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SectionLabel>Natal chart</SectionLabel>
            <span style={{ fontSize: 11, color: theme.text.dim }}>South Indian · Swiss Ephemeris</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
            <ChartSVG ws={ws} />
            <PlanetsTable ws={ws} />
          </div>
        </ContentCard>

        <ContentCard>
          <SectionLabel>House overview</SectionLabel>
          <HouseGrid ws={ws} />
        </ContentCard>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <PromiseCard ws={ws} />
        <DashaCard ws={ws} />
        <RulingPlanetsCard ws={ws} />
      </div>
    </div>
  );
}

/* ─── Chart SVG ─────────────────────────────────────────── */
function ChartSVG({ ws }: { ws: any }) {
  const planets: any[] = Array.isArray(ws?.planets) ? ws.planets : [];
  const byHouse: Record<number, string[]> = {};
  for (let i = 1; i <= 12; i++) byHouse[i] = [];
  for (const p of planets) {
    byHouse[p.house ?? 1].push(p.planet_en?.slice(0, 2) ?? "?");
  }
  // South-Indian 4x4 box positions (house numbers counter-clockwise from Aries at top-left)
  const positions = [
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
  ];
  return (
    <div
      style={{
        backgroundColor: theme.bg.page,
        borderRadius: 6,
        padding: 12,
        border: theme.border.default,
        aspectRatio: "1 / 1",
      }}
    >
      <svg viewBox="0 0 300 300" width="100%" height="100%">
        <rect x="10" y="10" width="280" height="280" fill="none" stroke="rgba(201,169,110,0.4)" strokeWidth="1" />
        <line x1="10" y1="10" x2="290" y2="290" stroke={theme.gold} strokeOpacity="0.3" strokeWidth="0.5" />
        <line x1="290" y1="10" x2="10" y2="290" stroke={theme.gold} strokeOpacity="0.3" strokeWidth="0.5" />
        <line x1="150" y1="10" x2="10" y2="150" stroke={theme.gold} strokeOpacity="0.3" strokeWidth="0.5" />
        <line x1="150" y1="10" x2="290" y2="150" stroke={theme.gold} strokeOpacity="0.3" strokeWidth="0.5" />
        <line x1="150" y1="290" x2="10" y2="150" stroke={theme.gold} strokeOpacity="0.3" strokeWidth="0.5" />
        <line x1="150" y1="290" x2="290" y2="150" stroke={theme.gold} strokeOpacity="0.3" strokeWidth="0.5" />
        {positions.map((h) => {
          const occ = byHouse[h.n];
          return (
            <g key={h.n}>
              <text x={h.x} y={h.y - 10} fill={theme.text.dim} fontSize="9" textAnchor="middle">
                {h.n}
              </text>
              {occ.map((p, i) => (
                <text
                  key={p + i}
                  x={h.x}
                  y={h.y + i * 13}
                  fill={theme.gold}
                  fontSize="11"
                  fontFamily="serif"
                  fontWeight="600"
                  textAnchor="middle"
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

/* ─── Planets table ─────────────────────────────────────── */
function PlanetsTable({ ws }: { ws: any }) {
  const planets: any[] = Array.isArray(ws?.planets) ? ws.planets : [];
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto auto",
          gap: 12,
          padding: "6px 0",
          borderBottom: theme.border.default,
          fontSize: 10,
          color: theme.text.dim,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontWeight: 500,
        }}
      >
        <span>Planet</span>
        <span>Sign</span>
        <span>Sub Lord</span>
        <span>H</span>
      </div>
      {planets.map((p) => (
        <div
          key={p.planet_en}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto auto",
            gap: 12,
            padding: "8px 0",
            borderBottom: theme.border.default,
            fontSize: 13,
            alignItems: "center",
          }}
        >
          <span style={{ color: theme.text.primary, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            {p.planet_en}
            {p.retrograde && (
              <span style={{ fontSize: 9, color: theme.warning, fontFamily: "monospace" }}>R</span>
            )}
          </span>
          <span style={{ color: theme.text.secondary }}>{p.sign_en}</span>
          <span style={{ color: theme.gold, fontFamily: "monospace", fontSize: 12 }}>{p.sub_lord_en ?? "—"}</span>
          <span
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: theme.gold,
              backgroundColor: "rgba(201,169,110,0.1)",
              padding: "2px 6px",
              borderRadius: 4,
              minWidth: 24,
              textAlign: "center",
            }}
          >
            {p.house ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── House grid ─────────────────────────────────────────── */
function HouseGrid({ ws }: { ws: any }) {
  const cusps: any[] = Array.isArray(ws?.cusps) ? ws.cusps : [];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 8,
      }}
    >
      {cusps.map((c) => (
        <div
          key={c.house_num}
          style={{
            padding: 12,
            backgroundColor: theme.bg.page,
            border: theme.border.default,
            borderRadius: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 10, color: theme.text.dim, fontFamily: "monospace" }}>
              H{c.house_num}
            </span>
            {c.sub_lord_en && (
              <span
                style={{
                  fontSize: 9,
                  color: theme.gold,
                  fontFamily: "monospace",
                  backgroundColor: "rgba(201,169,110,0.1)",
                  padding: "1px 5px",
                  borderRadius: 3,
                }}
              >
                {c.sub_lord_en.slice(0, 3)}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: theme.text.primary }}>
            {c.sign_en}
          </div>
          {typeof c.cusp_longitude === "number" && (
            <div style={{ fontSize: 10, color: theme.text.muted, fontFamily: "monospace", marginTop: 2 }}>
              {(c.cusp_longitude % 30).toFixed(1)}°
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Right-rail cards ──────────────────────────────────── */
function PromiseCard({ ws }: { ws: any }) {
  const h7 = ws?.cusps?.[6];
  if (!h7) return null;
  return (
    <ContentCard style={{ borderColor: "rgba(201,169,110,0.4)" }}>
      <SectionLabel>
        <span style={{ color: theme.gold }}>H7 Cusp · Marriage</span>
      </SectionLabel>
      <div style={{ fontSize: 18, fontWeight: 600, color: theme.text.primary, marginTop: 4, marginBottom: 6 }}>
        SL: {h7.sub_lord_en ?? "—"}
      </div>
      <div style={{ fontSize: 12, color: theme.text.muted, lineHeight: 1.5 }}>
        Full CSL signification chain computed server-side. Analyze in the Analysis tab.
      </div>
      <div style={{ marginTop: 10 }}>
        <span
          style={{
            fontSize: 11,
            padding: "3px 8px",
            borderRadius: 4,
            backgroundColor: "rgba(201,169,110,0.15)",
            color: theme.gold,
          }}
        >
          {h7.sign_en}
        </span>
      </div>
    </ContentCard>
  );
}

function DashaCard({ ws }: { ws: any }) {
  if (!ws) return null;
  return (
    <ContentCard>
      <SectionLabel>Current dasha</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        <DashaRow label="MD" planet={ws.current_dasha?.lord_en} end={ws.current_dasha?.end} />
        <DashaRow label="AD" planet={ws.current_antardasha?.lord_en} end={ws.current_antardasha?.end} />
        <DashaRow label="PAD" planet={ws.current_pratyantardasha?.lord_en} end={ws.current_pratyantardasha?.end} />
      </div>
    </ContentCard>
  );
}

function DashaRow({ label, planet, end }: { label: string; planet?: string; end?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
      <span
        style={{
          width: 32,
          fontSize: 10,
          color: theme.text.dim,
          fontFamily: "monospace",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1, color: theme.text.primary, fontWeight: 500 }}>{planet ?? "—"}</span>
      <span style={{ fontSize: 11, color: theme.text.muted, fontFamily: "monospace" }}>
        {end ? `until ${end.slice(0, 10)}` : ""}
      </span>
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
    <ContentCard>
      <SectionLabel>Ruling planets · now</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {rps.map((r) => (
          <div key={r.role} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
            <span style={{ flex: 1, color: theme.text.muted }}>{r.role}</span>
            <span style={{ color: theme.text.primary, fontWeight: 500 }}>{r.planet ?? "—"}</span>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}
