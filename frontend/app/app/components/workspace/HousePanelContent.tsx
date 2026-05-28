"use client";

/**
 * HousePanelContent — the pure-data inner body of HousePanel.
 *
 * Phase 9.10b — extracted from HousePanel.tsx so the BottomDrawer
 * (mobile) can render the same KP-doctrine sections as the desktop
 * HousePanel overlay. Both surfaces now share this component:
 *   - Desktop: HousePanel renders chrome (overlay frame + mandala
 *     header + close X) and embeds <HousePanelContent /> in its body.
 *   - Mobile: BottomDrawer renders sheet chrome (drag handle + header
 *     + close X + breadcrumb) and embeds <HousePanelContent /> in its
 *     scrollable body.
 *
 * What this component shows (in order — matches desktop verbatim):
 *   1. Cusp degree + sign + nakshatra
 *   2. Sub Lord Chain (Sub Lord → Star Lord, colored by planet)
 *   3. Occupants (planets in this house) or "no planets" disclaimer
 *   4. Significators (4 KP levels — L1/L2/L3/L4 + ALL)
 *   5. Fruitful significators (planets in current Ruling Planets)
 *   6. Active dasha periods (MD/AD slots whose lord is a significator)
 *
 * Maintainability:
 *   - The data shape this expects (cusps[], significators map,
 *     planets[], rulingPlanets[], antardashas[]) is the canonical
 *     workspaceData shape from the backend. Both call sites pass
 *     workspaceData directly; if backend adds new fields, both
 *     surfaces light up at once.
 *   - All KP-doctrine logic (occupants filter, sig lookup, fruitful
 *     intersection, active dasha filter) lives here. To change KP
 *     doctrine, edit one place.
 *   - No motion/animation imports here — the wrapper supplies that.
 */

import React from "react";
import { PLANET_COLORS } from "../constants";
import { useLanguage } from "@/lib/i18n";
import { formatDashaPeriod } from "@/lib/format";

interface HousePanelContentProps {
  house: number;
  cusps: any[];
  significators: any;
  planets: any[];
  rulingPlanets: string[];
  antardashas: any[];
  /**
   * Optional bottom padding for mobile sheets that need extra space
   * to avoid being hidden by the iOS safe-area indicator. Desktop
   * passes nothing (or 24); mobile drawer passes ~80.
   */
  bottomPad?: number;
}

const HOUSE_TOPIC_MAP: Record<number, string> = {
  1: "Self & Vitality", 2: "Wealth & Family", 3: "Siblings & Short Travel",
  4: "Home & Mother", 5: "Children & Intelligence", 6: "Health & Enemies",
  7: "Marriage & Partnership", 8: "Longevity & Obstacles", 9: "Fortune & Father",
  10: "Career & Status", 11: "Gains & Fulfillment", 12: "Losses & Foreign",
};

export function houseTopicLabel(house: number): string {
  return HOUSE_TOPIC_MAP[house] ?? "";
}

export default function HousePanelContent({
  house, cusps, significators, planets, rulingPlanets, antardashas,
  bottomPad,
}: HousePanelContentProps) {
  const { lang, t } = useLanguage();

  const pick = (enVal?: string, teVal?: string): string => {
    if (lang === "en") return enVal ?? teVal ?? "";
    return teVal ?? enVal ?? "";
  };

  const cusp = cusps[house - 1];
  const sig = significators
    ? (Object.values(significators).find((s: any) => s.house_num === house) as any)
    : null;
  const occupants = planets.filter((p: any) => parseInt(p.house) === house);
  const allSigEn: string[] = sig?.all_significators_en || [];
  const allSigTe: string[] = sig?.all_significators_te || [];
  const fruitful = allSigEn.filter((p: string) => rulingPlanets.includes(p));
  const activeDashas = antardashas.filter((ad: any) => allSigEn.includes(ad.lord_en));

  const rowStyle: React.CSSProperties = {
    display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 9, color: "var(--muted)",
    textTransform: "uppercase" as const, letterSpacing: "0.08em",
    minWidth: 100, paddingTop: 1,
  };

  return (
    <div style={{ paddingBottom: bottomPad ?? 0 }}>
      {/* Cusp info */}
      {cusp && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4 }}>
            {t("Cusp", "కస్ప్")}
          </div>
          <div style={{ fontSize: 12, color: "var(--text)" }}>
            {cusp.degree_in_sign?.toFixed(2)}° {pick(cusp.sign_en, cusp.sign_te)}
          </div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
            {pick(cusp.nakshatra_en, cusp.nakshatra_te)}
          </div>
        </div>
      )}

      {/* Sub Lord chain */}
      {cusp && (
        <div
          style={{
            marginBottom: 12, background: "var(--surface2)", borderRadius: 8,
            padding: "10px 12px", border: "0.5px solid var(--border)",
          }}
        >
          <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 }}>
            {t("Sub Lord Chain", "సబ్ లార్డ్ చైన్")}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 3 }}>Sub Lord</div>
              <span style={{ fontSize: 14, fontWeight: 700, color: PLANET_COLORS[cusp.sub_lord_en] || "var(--accent)" }}>
                {pick(cusp.sub_lord_en, cusp.sub_lord_te)}
              </span>
              {lang === "te_en" && (
                <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 1 }}>{cusp.sub_lord_en}</div>
              )}
            </div>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>→</span>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 3 }}>Star Lord</div>
              <span style={{ fontSize: 14, fontWeight: 700, color: PLANET_COLORS[cusp.star_lord_en] || "var(--text)" }}>
                {pick(cusp.star_lord_en, cusp.star_lord_te)}
              </span>
              {lang === "te_en" && (
                <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 1 }}>{cusp.star_lord_en}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Occupants */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 5 }}>
          {t("Occupants", "నివాస గ్రహాలు")}
        </div>
        {occupants.length > 0 ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {occupants.map((p: any) => (
              <span key={p.planet_en} style={{
                fontSize: 12, fontWeight: 600, color: PLANET_COLORS[p.planet_en],
                background: `${PLANET_COLORS[p.planet_en]}18`,
                border: `0.5px solid ${PLANET_COLORS[p.planet_en]}40`,
                borderRadius: 4, padding: "2px 8px",
              }}>
                {pick(p.planet_en, p.planet_te)}{p.retrograde ? "℞" : ""}
              </span>
            ))}
          </div>
        ) : (
          <div>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              {t("No planets occupying this house", "ఈ భావంలో గ్రహాలు లేవు")}
            </span>
            <div style={{ fontSize: 10, color: "var(--muted)", opacity: 0.75, marginTop: 3, lineHeight: 1.4 }}>
              {t(
                "House can still be active via its significator chain (L1 / L3 below).",
                "L1 / L3 సూచకుల ద్వారా ఈ భావం ఇంకా క్రియాశీలంగా ఉండవచ్చు."
              )}
            </div>
          </div>
        )}
      </div>

      {/* Significators (4 KP levels) */}
      {sig && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>
            {t("Significators (4 levels)", "సూచకులు (4 స్థాయిలు)")}
          </div>

          <div style={rowStyle} title="L1 — planets occupying the nakshatra of an occupant. Strongest significators per KP.">
            <span style={labelStyle}>L1 (in star of occupants)</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {((lang === "en" ? sig.planets_in_star_of_occupants_en : sig.planets_in_star_of_occupants_te) || []).map((p: string, i: number) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 600, color: PLANET_COLORS[sig.planets_in_star_of_occupants_en?.[i]] || "var(--text)" }}>{p}</span>
              ))}
              {!(sig.planets_in_star_of_occupants_en?.length) && <span style={{ fontSize: 10, color: "var(--muted)" }}>—</span>}
            </div>
          </div>

          <div style={rowStyle} title="L2 — planets occupying this house.">
            <span style={labelStyle}>L2 (occupants)</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {((lang === "en" ? sig.occupants_en : sig.occupants_te) || []).map((p: string, i: number) => (
                <span key={i} style={{ fontSize: 11, color: PLANET_COLORS[sig.occupants_en?.[i]] || "var(--text)" }}>{p}</span>
              ))}
              {!(sig.occupants_en?.length) && <span style={{ fontSize: 10, color: "var(--muted)" }}>—</span>}
            </div>
          </div>

          <div style={rowStyle} title="L3 — planets occupying the nakshatra of this house's sign lord.">
            <span style={labelStyle}>L3 (in star of lord)</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {((lang === "en" ? sig.planets_in_star_of_lord_en : sig.planets_in_star_of_lord_te) || []).map((p: string, i: number) => (
                <span key={i} style={{ fontSize: 11, color: PLANET_COLORS[sig.planets_in_star_of_lord_en?.[i]] || "var(--text)" }}>{p}</span>
              ))}
              {!(sig.planets_in_star_of_lord_en?.length) && <span style={{ fontSize: 10, color: "var(--muted)" }}>—</span>}
            </div>
          </div>

          <div style={rowStyle} title="L4 — sign lord of the house. Weakest signification level.">
            <span style={labelStyle}>L4 (lord)</span>
            <span style={{ fontSize: 11, color: PLANET_COLORS[sig.house_lord_en] || "var(--text)" }}>
              {pick(sig.house_lord_en, sig.house_lord_te)}
            </span>
          </div>

          <div style={{ ...rowStyle, marginTop: 6, paddingTop: 6, borderTop: "0.5px solid var(--border)" }}>
            <span style={labelStyle}>All significators</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {(lang === "en" ? allSigEn : allSigTe).map((p: string, i: number) => (
                <span key={i} style={{ fontSize: 11, color: PLANET_COLORS[allSigEn[i]] || "var(--text)" }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fruitful significators (intersection with current Ruling Planets) */}
      {fruitful.length > 0 && (
        <div style={{
          marginBottom: 12, background: "rgba(52,211,153,0.05)", borderRadius: 8,
          padding: "8px 10px", border: "0.5px solid rgba(52,211,153,0.2)",
        }}>
          <div style={{ fontSize: 9, color: "var(--green)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 5 }}>
            {t("Fruitful (in Ruling Planets)", "ఫలదాయి (రూలింగ్ గ్రహాలలో)")}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {fruitful.map((p: string) => (
              <span key={p} style={{ fontSize: 12, color: PLANET_COLORS[p] || "var(--green)", fontWeight: 600 }}>
                ✓ {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Active dasha periods (significator dasha lords) */}
      {activeDashas.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>
            {t("Dasha Periods for this House", "ఈ భావపు దశా కాలాలు")}
          </div>
          {activeDashas.slice(0, 5).map((ad: any, i: number) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "4px 8px", borderRadius: 6,
              background: ad.is_current ? "rgba(201,169,110,0.08)" : "transparent",
              border: ad.is_current ? "0.5px solid rgba(201,169,110,0.25)" : "0.5px solid transparent",
              marginBottom: 2,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: PLANET_COLORS[ad.lord_en] || "var(--muted)", flexShrink: 0,
              }} />
              <span style={{
                fontSize: 11, fontWeight: ad.is_current ? 600 : 400,
                color: PLANET_COLORS[ad.lord_en] || "var(--text)", minWidth: 55,
              }}>
                {pick(ad.lord_en, ad.lord_te)}
              </span>
              <span style={{ fontSize: 10, color: "var(--muted)", flex: 1 }}>
                {formatDashaPeriod(ad.start, ad.end)}
              </span>
              {ad.is_current && (
                <span style={{ fontSize: 9, color: "var(--accent)" }}>
                  ← {t("Now", "ఇప్పుడు")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
