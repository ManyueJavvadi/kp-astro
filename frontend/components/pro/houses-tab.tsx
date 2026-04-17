"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { theme } from "@/lib/theme";
import { ContentCard, SectionLabel } from "@/components/ui/content-card";

export function HousesTab({ ws }: { ws: any }) {
  const cusps: any[] = Array.isArray(ws?.cusps) ? ws.cusps : [];
  const sigs = ws?.significators ?? {};
  const planets: any[] = Array.isArray(ws?.planets) ? ws.planets : [];
  const [selected, setSelected] = useState(1);
  const cuspData = cusps.find((c) => c.house_num === selected) ?? cusps[0];
  const houseSigs = sigs[`House_${selected}`];
  const occupants = planets.filter((p) => p.house === selected).map((p) => p.planet_en);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        gap: 20,
        alignItems: "start",
      }}
    >
      {/* Sidebar with all 12 houses */}
      <ContentCard padding="none" style={{ position: "sticky", top: 64 }}>
        <div style={{ padding: "12px 16px", borderBottom: theme.border.default }}>
          <SectionLabel>12 Houses</SectionLabel>
        </div>
        <div>
          {cusps.map((c) => {
            const active = c.house_num === selected;
            const occ = planets.filter((p) => p.house === c.house_num).length;
            return (
              <button
                key={c.house_num}
                onClick={() => setSelected(c.house_num)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  background: active ? "rgba(201,169,110,0.08)" : "transparent",
                  border: "none",
                  borderLeft: active
                    ? `2px solid ${theme.gold}`
                    : "2px solid transparent",
                  cursor: "pointer",
                  color: active ? theme.text.primary : theme.text.secondary,
                  textAlign: "left",
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    width: 24,
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: active ? theme.gold : theme.text.dim,
                    fontWeight: 600,
                  }}
                >
                  H{c.house_num}
                </span>
                <span style={{ flex: 1 }}>{c.sign_en}</span>
                {occ > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      backgroundColor: "rgba(201,169,110,0.1)",
                      color: theme.gold,
                      padding: "1px 6px",
                      borderRadius: 3,
                    }}
                  >
                    {occ}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ContentCard>

      {cuspData && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* House header */}
          <ContentCard>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <SectionLabel>House {selected}</SectionLabel>
                <div style={{ fontSize: 28, fontWeight: 600, color: theme.text.primary, marginTop: 4 }}>
                  {cuspData.sign_en}
                </div>
                <div style={{ fontSize: 12, color: theme.text.muted, marginTop: 4, fontFamily: "monospace" }}>
                  Cusp: {typeof cuspData.cusp_longitude === "number" ? `${cuspData.cusp_longitude.toFixed(2)}°` : "—"}
                  {" · "}Nakshatra: {cuspData.nakshatra_en ?? cuspData.nakshatra ?? "—"}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 10,
                marginTop: 16,
              }}
            >
              <Stat label="Sub Lord" value={cuspData.sub_lord_en ?? "—"} emphasize />
              <Stat label="Star Lord" value={cuspData.star_lord_en ?? "—"} />
              <Stat label="Sign Lord" value={cuspData.sign_lord_en ?? "—"} />
              <Stat label="Occupants" value={occupants.join(", ") || "None"} />
            </div>
          </ContentCard>

          {/* Significators */}
          {houseSigs && (
            <ContentCard>
              <SectionLabel>Significators · 4-level</SectionLabel>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <SigBlock label="Occupants (L1)" planets={houseSigs.occupants_en ?? []} sub="Planets in this house" />
                <SigBlock label="House lord (L2)" planets={[houseSigs.house_lord_en].filter(Boolean)} sub={`Sign lord = ${houseSigs.house_lord_en ?? "—"}`} />
                <SigBlock
                  label="All significators"
                  planets={houseSigs.all_significators_en ?? []}
                  sub="L1 + L2 + star-of-L1 + star-of-L2"
                  highlight
                />
              </div>
            </ContentCard>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      style={{
        padding: 10,
        backgroundColor: theme.bg.page,
        borderRadius: 6,
        border: theme.border.default,
      }}
    >
      <div style={{ fontSize: 10, color: theme.text.dim, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: emphasize ? theme.gold : theme.text.primary,
          marginTop: 3,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SigBlock({
  label,
  planets,
  sub,
  highlight,
}: {
  label: string;
  planets: string[];
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: 12,
        backgroundColor: highlight ? "rgba(201,169,110,0.06)" : theme.bg.page,
        border: highlight ? theme.border.accent : theme.border.default,
        borderRadius: 6,
      }}
    >
      <div style={{ fontSize: 10, color: theme.text.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {planets.length === 0 ? (
          <span style={{ fontSize: 11, color: theme.text.muted }}>None</span>
        ) : (
          planets.map((p) => (
            <span
              key={p}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                backgroundColor: highlight ? "rgba(201,169,110,0.15)" : "rgba(255,255,255,0.05)",
                color: highlight ? theme.gold : theme.text.primary,
              }}
            >
              {p}
            </span>
          ))
        )}
      </div>
      {sub && <div style={{ fontSize: 11, color: theme.text.muted }}>{sub}</div>}
    </div>
  );
}
