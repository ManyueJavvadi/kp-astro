"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { theme } from "@/lib/theme";
import { ContentCard, SectionLabel, SectionHeading } from "@/components/ui/content-card";

export function DashaTab({ ws }: { ws: any }) {
  const antardashas: any[] = ws?.antardashas ?? [];
  const mahadashas: any[] = ws?.dashas ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Current period hero */}
      <ContentCard>
        <SectionLabel>Currently running</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginTop: 10,
          }}
        >
          <PeriodBlock
            label="Mahadasha"
            planet={ws.current_dasha?.lord_en}
            start={ws.current_dasha?.start}
            end={ws.current_dasha?.end}
          />
          <PeriodBlock
            label="Antardasha"
            planet={ws.current_antardasha?.lord_en}
            start={ws.current_antardasha?.start}
            end={ws.current_antardasha?.end}
          />
          <PeriodBlock
            label="Pratyantardasha"
            planet={ws.current_pratyantardasha?.lord_en}
            start={ws.current_pratyantardasha?.start}
            end={ws.current_pratyantardasha?.end}
          />
        </div>
      </ContentCard>

      {/* Antardashas list */}
      <ContentCard padding="none">
        <div style={{ padding: "16px 20px", borderBottom: theme.border.default }}>
          <SectionLabel>
            {ws.current_dasha?.lord_en} Mahadasha · {antardashas.length} Antardashas
          </SectionLabel>
          <SectionHeading>Antardasha sequence</SectionHeading>
        </div>
        <div>
          {antardashas.map((ad: any, i: number) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 20px",
                borderTop: i === 0 ? "none" : theme.border.default,
                backgroundColor: ad.is_current ? "rgba(201,169,110,0.06)" : "transparent",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: ad.is_current ? theme.gold : "rgba(255,255,255,0.05)",
                  color: ad.is_current ? "#07070d" : theme.text.muted,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: theme.text.primary }}>
                {ad.lord_en}
              </div>
              <div style={{ fontSize: 11, fontFamily: "monospace", color: theme.text.muted }}>
                {ad.start?.slice(0, 10)} → {ad.end?.slice(0, 10)}
              </div>
              {ad.is_current && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 4,
                    backgroundColor: "rgba(201,169,110,0.15)",
                    color: theme.gold,
                    fontWeight: 500,
                  }}
                >
                  Now
                </span>
              )}
            </div>
          ))}
        </div>
      </ContentCard>

      {/* Full Mahadasha timeline */}
      {mahadashas.length > 0 && (
        <ContentCard padding="none">
          <div style={{ padding: "16px 20px", borderBottom: theme.border.default }}>
            <SectionLabel>Vimshottari · 120-year cycle</SectionLabel>
            <SectionHeading>All mahadashas</SectionHeading>
          </div>
          <div>
            {mahadashas.map((md: any, i: number) => {
              const current = md.lord_en === ws.current_dasha?.lord_en;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 20px",
                    borderTop: i === 0 ? "none" : theme.border.default,
                    backgroundColor: current ? "rgba(201,169,110,0.06)" : "transparent",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: current ? 600 : 400,
                      color: current ? theme.text.primary : theme.text.secondary,
                    }}
                  >
                    {md.lord_en}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: theme.text.muted }}>
                    {md.start?.slice(0, 10)} → {md.end?.slice(0, 10)}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "monospace",
                      color: theme.text.dim,
                      width: 40,
                      textAlign: "right",
                    }}
                  >
                    {md.years}y
                  </div>
                </div>
              );
            })}
          </div>
        </ContentCard>
      )}
    </div>
  );
}

function PeriodBlock({
  label,
  planet,
  start,
  end,
}: {
  label: string;
  planet?: string;
  start?: string;
  end?: string;
}) {
  return (
    <div
      style={{
        padding: 14,
        backgroundColor: theme.bg.page,
        borderRadius: 6,
        border: theme.border.default,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: theme.text.dim,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: theme.gold, marginTop: 4 }}>
        {planet ?? "—"}
      </div>
      <div style={{ fontSize: 11, color: theme.text.muted, fontFamily: "monospace", marginTop: 4 }}>
        {start?.slice(0, 10)} → {end?.slice(0, 10)}
      </div>
    </div>
  );
}
