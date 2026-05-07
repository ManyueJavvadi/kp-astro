"use client";
import React from "react";
import { PLANET_COLORS } from "../constants";
import { PLANET_SYMBOLS, WorkspaceData } from "../../types/workspace";
import { useLanguage } from "@/lib/i18n";
import { formatDashaPeriod } from "@/lib/format";

/**
 * Phase 3 — ChartContextStrip
 *
 * The chart-specific quick-read strip that the stress test (#A) wanted
 * pulled OUT of the persistent global header and back ONTO the chart-
 * related tabs. Mounts directly under the tab bar on Chart / Houses /
 * Dasha / Analysis (anywhere "this chart's natal data" is the answer).
 *
 * Three groups, separated by gold dot dividers:
 *   1. Chart anchor:  Lagna · Moon · H{N} Sun
 *   2. Current dasha: MD · AD · PAD  (with formatted end-month)
 *   3. Ruling planets at birth — frequency-sorted unique planets with
 *      ★ on multi-slot strongest. Houses → Ruling shows them in KSK
 *      strength order; this strip shows them in frequency order to
 *      preserve the existing two-view design.
 *
 * The strip is intentionally one-line on desktop and wraps to two
 * rows below 720px viewports — no "give up" collapse to a hamburger.
 * Tooltips on every chip carry the full context (handed off from the
 * old PersonHeroBanner verbatim so we don't lose hover info).
 */
type Props = {
  workspaceData: WorkspaceData;
};

export function ChartContextStrip({ workspaceData }: Props) {
  const { lang, t } = useLanguage();
  // The workspace shape is partly typed and partly dynamic (different
  // backend endpoints return slightly different keys). PersonHeroBanner
  // used `as any` for the same fields; we follow that precedent here so
  // this component stays a drop-in successor.
  const wd = workspaceData as any;

  const cuspsArray = Array.isArray(wd.cusps) ? wd.cusps : Object.values(wd.cusps ?? {});
  const lagnaCusp = cuspsArray[0] as any;
  const lagna = lang === "en"
    ? (lagnaCusp?.sign_en ?? wd.lagna_en ?? "—")
    : (lagnaCusp?.sign_te ?? lagnaCusp?.sign_en ?? wd.lagna_en ?? "—");

  const moonPlanet = wd.planets?.find((p: any) => p.planet_en === "Moon");
  const moonSign = lang === "en"
    ? (moonPlanet?.sign_en ?? "—")
    : (moonPlanet?.sign_te ?? moonPlanet?.sign_en ?? "—");
  const sunPlanet = wd.planets?.find((p: any) => p.planet_en === "Sun");
  const sunInfo = sunPlanet ? `H${sunPlanet.house} Sun` : "";

  const currentMD  = wd.current_dasha ?? wd.mahadasha;
  const currentAD  = wd.current_antardasha;
  const currentPAD = wd.current_pratyantardasha;

  const rpData = wd.ruling_planets;
  const rulingPlanets: { planet: string }[] = Array.isArray(rpData)
    ? rpData.map((p: string) => ({ planet: p }))
    : ((rpData?.all_en ?? []) as string[]).map((p: string) => ({ planet: p }));
  const ctx = rpData && !Array.isArray(rpData) ? rpData.rp_context : null;
  const planetSlots: Record<string, string[]> = ctx?.planet_slots ?? {};
  const strongest: string[] = ctx?.strongest ?? [];

  return (
    <div
      role="region"
      aria-label={t("Chart context", "చార్ట్ సందర్భం")}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
        padding: "8px 24px",
        background: "rgba(255,255,255,0.015)",
        borderBottom: "0.5px solid var(--border)",
      }}
    >
      {/* Group 1 — chart anchor */}
      <ChipPair label={t("Lagna", "లగ్న")} value={lagna as string} tint="gold" />
      <ChipPair label={t("Moon", "చంద్ర")} value={moonSign as string} tint="blue" icon="☽" />
      {sunInfo && <ChipPair label="" value={sunInfo} tint="amber" icon="☉" />}

      <Divider />

      {/* Group 2 — current dasha */}
      {currentMD && (
        <DashaChip
          label="MD"
          planet={(currentMD as any).lord ?? (currentMD as any).lord_en ?? "?"}
          end={formatDashaPeriod(null, (currentMD as any).end)}
        />
      )}
      {currentAD && (
        <DashaChip
          label="AD"
          planet={(currentAD as any).lord ?? (currentAD as any).lord_en ?? "?"}
          end={formatDashaPeriod(null, (currentAD as any).end)}
        />
      )}
      {currentPAD && (
        <DashaChip
          label="PAD"
          planet={(currentPAD as any).lord ?? (currentPAD as any).lord_en ?? "?"}
          end={formatDashaPeriod(null, (currentPAD as any).end)}
        />
      )}

      {rulingPlanets.length > 0 && <Divider />}

      {/* Group 3 — ruling planets at birth */}
      {rulingPlanets.length > 0 && (
        <div
          style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}
          title="Ruling planets at the native's moment of birth — frequency-sorted (planets in 2+ KP slots are flagged with ★). Houses → Ruling shows the canonical KSK strength order."
        >
          <span
            style={{
              fontSize: 9,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {t("RPs @ birth", "జన్మ RPs")}:
          </span>
          {rulingPlanets.slice(0, 7).map((rp, i) => {
            const freq = planetSlots[rp.planet]?.length ?? 0;
            const isStrong = strongest.includes(rp.planet);
            return (
              <span
                key={i}
                title={
                  freq > 0
                    ? isStrong
                      ? `${rp.planet} — ${freq}/7 slots · strongest natal RP`
                      : `${rp.planet} — ${freq}/7 slots`
                    : rp.planet
                }
                style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
              >
                <PlanetChip planet={rp.planet} />
                {isStrong && <span style={{ color: "var(--accent)", fontSize: 9 }}>★</span>}
                {freq > 0 && (
                  <span style={{ fontSize: 8, color: "rgba(201,169,110,0.6)", fontWeight: 600 }}>
                    {freq}/7
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlanetChip({ planet }: { planet: string }) {
  const color = PLANET_COLORS[planet] ?? "var(--accent)";
  const sym = PLANET_SYMBOLS[planet] ?? planet[0];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "1px 7px",
        borderRadius: 999,
        background: `${color}18`,
        border: `0.5px solid ${color}50`,
        fontSize: 10,
        fontWeight: 600,
        color,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 9 }}>{sym}</span>
      {planet.slice(0, 2)}
    </span>
  );
}

function DashaChip({
  label,
  planet,
  end,
}: {
  label: string;
  planet: string;
  end?: string;
}) {
  const color = PLANET_COLORS[planet] ?? "var(--accent)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 9px",
        borderRadius: 999,
        background: `${color}18`,
        border: `0.5px solid ${color}50`,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: 9 }}>{label}</span>
      <span style={{ color }}>{planet}</span>
      {end && <span style={{ color: "var(--muted)", fontSize: 9, opacity: 0.75 }}>· {end}</span>}
    </span>
  );
}

function ChipPair({
  label,
  value,
  tint,
  icon,
}: {
  label: string;
  value: string;
  tint: "gold" | "blue" | "amber";
  icon?: string;
}) {
  const colors = {
    gold:  { bg: "rgba(201,169,110,0.08)", br: "rgba(201,169,110,0.2)", c: "#c9a96e" },
    blue:  { bg: "rgba(147,197,253,0.08)", br: "rgba(147,197,253,0.2)", c: "#93c5fd" },
    amber: { bg: "rgba(245,158,11,0.08)",  br: "rgba(245,158,11,0.2)",  c: "#f59e0b" },
  }[tint];
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 8,
        background: colors.bg,
        border: `0.5px solid ${colors.br}`,
        color: colors.c,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {icon ? <span style={{ marginRight: 3 }}>{icon}</span> : null}
      {label ? `${label}: ` : ""}
      {value}
    </span>
  );
}

function Divider() {
  return (
    <span
      aria-hidden
      style={{
        width: 4,
        height: 4,
        borderRadius: "50%",
        background: "rgba(201,169,110,0.35)",
        flexShrink: 0,
      }}
    />
  );
}
