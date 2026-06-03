"use client";

/**
 * ChartTab — the rasi chart + planet list view.
 *
 * PR R1 (Phase A foundation refactor) — extracted from page.tsx lines
 * 2514-2619 (~106 lines). This is the PROOF-OF-PATTERN extraction
 * before tackling bigger tabs. Zero behavior change vs the inline
 * version — JSX moved wholesale, state isolated where tab-local.
 *
 * State decisions:
 *   - chartView (Chart/Planets toggle) is TAB-LOCAL → kept inside ChartTab
 *   - selectedHouse is SHARED with HousePanel which other tabs also use →
 *     stays in parent, passed as prop
 *   - workspaceData comes from parent
 *
 * Sacred-region check (per .claude/research/world-first-vision.md §15):
 *   - No AI prompts touched
 *   - No backend engines touched
 *   - Pure frontend JSX extraction
 *   - Safe under the locked v2 plan's preservation protocol
 */

import { useState } from "react";
import { LayoutGrid, Target, Grid3x3 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PageHero } from "@/components/ui/PageHero";
// PR R1-hotfix — was importing the legacy ./components/SouthIndianChart
// (the old 56-line south-only renderer). The pre-R1 page.tsx used a
// `const SouthIndianChart = RasiChart` ALIAS so the modern RasiChart
// (with South/North/East style toggle) was actually rendered. The R1
// extraction missed the alias and pulled in the wrong file, regressing
// the chart UI to the old style-toggle-less version. Fixed by importing
// RasiChart directly under the legacy name.
import RasiChart from "../components/RasiChart";
const SouthIndianChart = RasiChart; // backwards-compat alias (same as pre-R1 page.tsx)
import HousePanel from "../components/HousePanel";
import PlanetList from "../components/workspace/PlanetList";
import { SectionEyebrow } from "../components/SectionEyebrow";
// Wave 15 (2026-06-03, item #7): per user request, add Cusps as a
// third pill on Chart tab. Mirrors (doesn't replace) Houses → Cusps,
// so astrologers can reach the cusps view from either entry point.
import { CuspsTable } from "../components/CuspsTable";
import type { WorkspaceData } from "../types/workspace";

// PR R1 — props match the original page.tsx call pattern. workspaceData
// is typed as WorkspaceData; the `.ruling_planets?.all_en` legacy access
// pattern (which evaluates to undefined→[] at runtime since RulingPlanet[]
// has no `all_en` property) is preserved exactly via a narrow cast at the
// call site. This is intentional zero-behavior-change refactoring;
// cleaning up that legacy access is a separate concern for a later PR.
interface ChartTabProps {
  workspaceData: WorkspaceData;
  selectedHouse: number | null;
  setSelectedHouse: (
    h: number | null | ((prev: number | null) => number | null),
  ) => void;
}

type ChartViewMode = "chart" | "planets" | "cusps";

export function ChartTab({ workspaceData, selectedHouse, setSelectedHouse }: ChartTabProps) {
  const { t } = useLanguage();
  // Phase 9.10b — gate the HousePanel overlay off on mobile so the
  // BottomDrawer (which now renders the same HousePanelContent) is the
  // single house-detail surface. Otherwise both render on top of each
  // other and the user sees a placeholder + an overlay simultaneously.
  const isMobile = useIsMobile();
  // Tab-local state — no other tab cares about chart-vs-planets toggle.
  const [chartView, setChartView] = useState<ChartViewMode>("chart");

  return (
    <div className="tab-content">
      {/* Phase 15.2 — Track A serif PageHero with MaskReveal
          gold-sweep on the title. Replaces inline dasha-hero. */}
      <PageHero
        eyebrow={t("KP rasi · Krishnamurti Paddhati", "KP రాశి · కృష్ణమూర్తి పద్ధతి")}
        title={t("Your KP rasi chart", "మీ KP రాశి చార్ట్")}
        subcopy={t(
          "Planets, signs, houses, and sub lords — the full KP picture in one view. Tap any house to expand its details.",
          "గ్రహాలు, రాశులు, భావాలు, సబ్ లార్డ్‌లు — KP పూర్తి దృశ్యం ఒక్క చోట. వివరాల కోసం ఏ భావాన్నైనా నొక్కండి."
        )}
      />
      {/* Chart / Planets / Cusps view toggle.
          Wave 15 (2026-06-03): Cusps pill added per user request.
          Same KP cusps table as Houses → Cusps sub-tab (mirrored,
          not moved — both entry points work). */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { v: "chart",   l: "Chart",   Icon: LayoutGrid },
          { v: "planets", l: "Planets", Icon: Target },
          { v: "cusps",   l: "Cusps",   Icon: Grid3x3 },
        ].map(opt => {
          const active = chartView === opt.v;
          const OptIcon = opt.Icon;
          return (
            <button
              key={opt.v}
              onClick={() => setChartView(opt.v as ChartViewMode)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 999,
                border: active ? "1px solid rgba(201,169,110,0.45)" : "1px solid rgba(255,255,255,0.08)",
                background: active ? "rgba(201,169,110,0.1)" : "transparent",
                color: active ? "#c9a96e" : "var(--muted)",
                fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                transition: "color 120ms, border-color 120ms, background 120ms",
              }}
              onMouseEnter={e => { if (active) return; e.currentTarget.style.color = "#c9a96e"; e.currentTarget.style.borderColor = "rgba(201,169,110,0.3)"; }}
              onMouseLeave={e => { if (active) return; e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              <OptIcon size={13} strokeWidth={1.8} />
              {opt.l}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "1.5rem", alignItems: "start", flexWrap: "wrap" }}>
        {/* LEFT — Chart */}
        {(chartView === "chart" || chartView === "planets") && (
          <div style={{ flexShrink: 0 }}>
            {chartView === "chart" && (
              <>
                {/* PR fix-21 — title is rendered inside RasiChart now (dynamic per active style) */}
                <SouthIndianChart
                  planets={workspaceData.planets as any}
                  cusps={workspaceData.cusps as any}
                  onHouseClick={h => setSelectedHouse(prev => prev === h ? null : h)}
                  selectedHouse={selectedHouse}
                />
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 8, textAlign: "center", letterSpacing: "0.02em" }}>Tap a house for details · <span style={{ color: "#c9a96e" }}>↑</span> = Lagna</div>
              </>
            )}
          </div>
        )}

        {/* RIGHT — PlanetList (star lord → sub lord) */}
        {chartView === "chart" && !selectedHouse && (
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <SectionEyebrow te="గ్రహ స్థానాలు" en="Planet Positions · KP" noMarginBottom />
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 10, padding: "3px 10px", borderRadius: 999,
                background: "rgba(201,169,110,0.08)", color: "#c9a96e",
                border: "0.5px solid rgba(201,169,110,0.3)",
                fontWeight: 500,
              }}>Star → Sub Lord</span>
            </div>
            <div style={{ background: "var(--card)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
              <PlanetList planets={workspaceData.planets} cusps={workspaceData.cusps as any} />
            </div>
          </div>
        )}

        {/* House panel overlay — preserves exact prop access from pre-R1
            page.tsx. workspaceData is typed as `any` in page.tsx so the
            legacy `.significators` and `.ruling_planets?.all_en` accesses
            compiled there but trip TS in this strictly-typed component.
            We re-loosen via `any` cast to maintain zero behavior change.
            Fixing the underlying data-shape mismatch is a separate concern
            for a later PR (out of scope for the proof-of-pattern refactor).
            HOTFIX (2026-06-03) — also gate by chartView === "chart" so
            the Cusps view's OWN HousePanel render below doesn't double
            up with this one. Without the chartView gate, clicking a
            cusps row rendered TWO HousePanels and squeezed the table
            into a tiny middle column. */}
        {chartView === "chart" && selectedHouse && !isMobile && (
          <HousePanel
            house={selectedHouse}
            cusps={workspaceData.cusps as any}
            significators={(workspaceData as any).significators}
            planets={workspaceData.planets as any}
            rulingPlanets={(workspaceData.ruling_planets as any)?.all_en || []}
            antardashas={workspaceData.antardashas as any || []}
            onClose={() => setSelectedHouse(null)}
          />
        )}

        {/* Mobile: planets-only view (full table) */}
        {chartView === "planets" && (
          <div style={{ flex: 1, minWidth: 260 }}>
            <SectionEyebrow te="గ్రహ స్థాన పట్టిక" en="Planet Positions · KP" />
            <div style={{ background: "var(--card)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
              <PlanetList planets={workspaceData.planets} cusps={workspaceData.cusps as any} />
            </div>
          </div>
        )}

        {/* Wave 15 (2026-06-03, item #7) — Cusps view, mirrored from
            Houses tab. Side-by-side with HousePanel on desktop when
            a row is clicked; mobile uses the existing bottom drawer
            (HousePanel render gated by !isMobile). */}
        {chartView === "cusps" && (
          <div style={{ flex: 1, minWidth: 260, display: "flex", gap: "1rem", alignItems: "start" }}>
            <CuspsTable
              cusps={workspaceData.cusps as any}
              selectedHouse={selectedHouse}
              setSelectedHouse={setSelectedHouse}
            />
            {selectedHouse && !isMobile && (
              <div style={{ width: 280, flexShrink: 0 }}>
                <HousePanel
                  house={selectedHouse}
                  cusps={workspaceData.cusps as any}
                  significators={(workspaceData as any).significators}
                  planets={workspaceData.planets as any}
                  rulingPlanets={(workspaceData.ruling_planets as any)?.all_en || []}
                  antardashas={(workspaceData as any).antardashas || []}
                  onClose={() => setSelectedHouse(null)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
