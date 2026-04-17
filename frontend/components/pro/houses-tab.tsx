"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function HousesTab({ ws }: { ws: any }) {
  const cusps: any[] = Array.isArray(ws?.cusps) ? ws.cusps : [];
  const sigs = ws?.significators ?? {};
  const planets: any[] = Array.isArray(ws?.planets) ? ws.planets : [];
  const [selectedHouse, setSelectedHouse] = useState(1);

  const cuspData = cusps.find((c) => c.house_num === selectedHouse) ?? cusps[0];
  const houseSigs = sigs[`House_${selectedHouse}`];

  const occupants = planets
    .filter((p) => p.house === selectedHouse)
    .map((p) => p.planet_en);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
      {/* House selector column */}
      <div className="rounded-xl bg-bg-surface border border-border p-3 h-fit sticky top-[7.5rem]">
        <div className="text-tiny uppercase tracking-wider text-gold mb-3 px-2">
          12 HOUSES
        </div>
        <div className="flex flex-col gap-1">
          {cusps.map((c) => {
            const active = c.house_num === selectedHouse;
            const occupantCount = planets.filter(
              (p) => p.house === c.house_num
            ).length;
            return (
              <button
                key={c.house_num}
                onClick={() => setSelectedHouse(c.house_num)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                  active
                    ? "bg-gold-glow border border-border-accent"
                    : "hover:bg-bg-hover border border-transparent"
                )}
              >
                <div
                  className={cn(
                    "size-8 rounded-md flex items-center justify-center text-small font-bold font-mono",
                    active
                      ? "bg-gold text-bg-primary"
                      : "bg-bg-surface-2 text-text-muted"
                  )}
                >
                  {c.house_num}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-small font-medium truncate",
                      active ? "text-text-primary" : "text-text-secondary"
                    )}
                  >
                    {c.sign_en}
                  </div>
                  <div className="text-tiny text-text-muted truncate">
                    SL: {c.sub_lord_en ?? "—"}
                  </div>
                </div>
                {occupantCount > 0 && (
                  <Badge variant="gold" size="sm">
                    {occupantCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* House detail */}
      <div className="flex flex-col gap-4 min-w-0">
        {cuspData && (
          <>
            {/* Header */}
            <div className="rounded-xl bg-bg-surface border border-border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-tiny uppercase tracking-wider text-gold mb-1">
                    HOUSE {selectedHouse}
                  </div>
                  <h2 className="font-display text-h1 font-semibold text-text-primary mb-1">
                    {cuspData.sign_en}
                  </h2>
                  <div className="text-small text-text-muted font-mono">
                    Cusp: {typeof cuspData.cusp_longitude === "number"
                      ? `${cuspData.cusp_longitude.toFixed(2)}°`
                      : "—"}{" "}
                    · Nakshatra: {cuspData.nakshatra_en ?? cuspData.nakshatra ?? "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Sub Lord" value={cuspData.sub_lord_en ?? "—"} emphasize />
                <Stat label="Star Lord" value={cuspData.star_lord_en ?? "—"} />
                <Stat label="Sign Lord" value={cuspData.sign_lord_en ?? "—"} />
                <Stat label="Occupants" value={occupants.join(", ") || "None"} />
              </div>
            </div>

            {/* Significators */}
            {houseSigs && (
              <div className="rounded-xl bg-bg-surface border border-border p-5">
                <div className="text-tiny uppercase tracking-wider text-gold mb-3">
                  SIGNIFICATORS (4-LEVEL)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SigRow
                    label="Occupants (L1)"
                    planets={houseSigs.occupants_en ?? []}
                    sub="Planets sitting in this house"
                  />
                  <SigRow
                    label="House Lord (L2)"
                    planets={[houseSigs.house_lord_en].filter(Boolean)}
                    sub={`Sign lord = ${houseSigs.house_lord_en ?? "—"}`}
                  />
                  <SigRow
                    label="All significators"
                    planets={houseSigs.all_significators_en ?? []}
                    sub="L1 + L2 + star-of-L1 + star-of-L2"
                    highlight
                  />
                </div>
              </div>
            )}

            {/* CSL chain */}
            {ws?.csl_chains?.[selectedHouse - 1] && (
              <div className="rounded-xl bg-bg-surface border border-border p-5">
                <div className="text-tiny uppercase tracking-wider text-gold mb-3">
                  CSL SIGNIFICATION CHAIN
                </div>
                <pre className="text-tiny font-mono text-text-secondary whitespace-pre-wrap">
                  {JSON.stringify(ws.csl_chains[selectedHouse - 1], null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
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
    <div className="p-3 rounded-lg bg-bg-surface-2 border border-border">
      <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">
        {label}
      </div>
      <div
        className={cn(
          "text-body font-medium truncate",
          emphasize ? "text-gold font-semibold" : "text-text-primary"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function SigRow({
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
      className={cn(
        "p-3 rounded-lg border",
        highlight
          ? "bg-gold-glow border-border-accent"
          : "bg-bg-surface-2 border-border"
      )}
    >
      <div className="text-tiny uppercase tracking-wider text-text-muted mb-1.5">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-1">
        {planets.length === 0 ? (
          <span className="text-tiny text-text-muted">None</span>
        ) : (
          planets.map((p) => (
            <Badge key={p} variant={highlight ? "gold" : "default"} size="sm">
              {p}
            </Badge>
          ))
        )}
      </div>
      {sub && <div className="text-tiny text-text-muted">{sub}</div>}
    </div>
  );
}
