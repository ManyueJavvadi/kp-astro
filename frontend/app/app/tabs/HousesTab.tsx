"use client";

/**
 * HousesTab — the 12-house cusp + significators + ruling planets +
 * panchangam consolidated view (5 sub-tabs).
 *
 * PR R2 (Phase A foundation refactor) — extracted from page.tsx
 * lines 2532-2917 (~386 lines). Same pattern as ChartTab from PR R1:
 * extract JSX wholesale, move tab-local state INTO the component, keep
 * shared state in parent.
 *
 * State decisions:
 *   - housesSubTab (overview/cusps/sigs/ruling/panchang) — TAB-LOCAL → moved in
 *   - cslSelectedHouse (CSL chain detail panel) — TAB-LOCAL → moved in
 *   - showSigGrid (significators grid toggle) — TAB-LOCAL → moved in
 *   - selectedHouse / setSelectedHouse — SHARED with ChartTab → stays in parent,
 *     passed as prop
 *   - workspaceData → prop from parent
 *
 * Sacred-region check (per .claude/research/world-first-vision.md §15):
 *   - No AI prompts touched
 *   - No backend engines touched
 *   - Pure frontend JSX extraction
 *   - Legacy prop access patterns preserved verbatim (significators,
 *     ruling_planets?.all_en) with narrow `as any` casts to compile
 *     under WorkspaceData strict types while maintaining runtime behavior.
 */

import { useState } from "react";
import { Compass } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PageHero } from "@/components/ui/PageHero";
import TaraChakraWidget from "../components/TaraChakraWidget";
import HousePanel from "../components/HousePanel";
import HouseOverviewGrid from "../components/workspace/HouseOverviewGrid";
import CSLChainView from "../components/workspace/CSLChainView";
import PanchangamCard from "../components/PanchangamCard";
import { PLANET_COLORS } from "../components/constants";
import type { WorkspaceData } from "../types/workspace";

type HousesSubTab = "overview" | "cusps" | "sigs" | "ruling" | "panchang";

interface HousesTabProps {
  workspaceData: WorkspaceData;
  selectedHouse: number | null;
  setSelectedHouse: (
    h: number | null | ((prev: number | null) => number | null),
  ) => void;
}

export function HousesTab({ workspaceData, selectedHouse, setSelectedHouse }: HousesTabProps) {
  const { t, lang } = useLanguage();
  // Phase 9.10b — on mobile the BottomDrawer handles the per-house
  // detail surface (same HousePanelContent body). Hide the inline
  // HousePanel mounts here so we don't double-render the same data.
  const isMobile = useIsMobile();
  // Tab-local state — only Houses tab cares about these.
  const [housesSubTab, setHousesSubTab] = useState<HousesSubTab>("overview");
  const [cslSelectedHouse, setCslSelectedHouse] = useState<number | null>(null);
  const [showSigGrid, setShowSigGrid] = useState(false);

  if (!workspaceData) {
    return (
      <div className="tab-content" style={{ padding: "1rem", height: "100%", overflowY: "auto" }}>
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          {/* PR A1.3-fix-25 — replaced 📊 emoji with lucide
              icon to match the rest of the app's icon style. */}
          <Compass size={36} strokeWidth={1.5} color="var(--muted)" style={{ marginBottom: 12, opacity: 0.6 }} />
          <div style={{ fontSize: 14, color: "var(--muted)" }}>{t("Load a chart above", "పైన చార్ట్ లోడ్ చేయండి")}</div>
        </div>
      </div>
    );
  }

  // Loose alias so legacy `workspaceData.<field>` accesses compile under
  // the strict WorkspaceData type (was implicitly `any` in pre-R1 page.tsx).
  const wd: any = workspaceData;

  return (
    <div className="tab-content" style={{ padding: "1rem", height: "100%", overflowY: "auto" }}>
      {/* Phase 15.2 — Track A serif PageHero (Houses tab) */}
      <PageHero
        eyebrow={t("12 houses · KP cusp framework", "12 భావాలు · KP కస్ప్ ఫ్రేమ్‌వర్క్")}
        title={t("Your house architecture", "మీ భావ నిర్మాణం")}
        subcopy={t(
          "Each cusp's sub lord gates that life area's promise. Click a house to drill into its CSL chain, occupants, and ruling planets.",
          "ప్రతి కస్ప్ యొక్క సబ్ లార్డ్ ఆ జీవిత ప్రాంతం యొక్క వాగ్దానాన్ని శాసిస్తుంది. CSL చైన్, నివాసులు, నియమ గ్రహాల వివరాల కోసం భావాన్ని క్లిక్ చేయండి."
        )}
      />
      {/* Sub-tab pill switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          { id: "overview", en: "Overview",     te: "సారాంశం" },
          { id: "cusps",    en: "Cusps",        te: "కస్పాలు" },
          { id: "sigs",     en: "Significators", te: "కారకులు" },
          { id: "ruling",   en: "Ruling",       te: "రూలింగ్" },
          { id: "panchang", en: "Panchangam",   te: "పంచాంగం" },
        ].map(st => {
          const active = housesSubTab === st.id;
          const label = lang === "en" ? st.en : st.te;
          return (
            <button
              key={st.id}
              onClick={() => { setHousesSubTab(st.id as HousesSubTab); setCslSelectedHouse(null); }}
              style={{
                padding: "7px 16px",
                borderRadius: 999,
                border: active ? "1px solid rgba(201,169,110,0.55)" : "1px solid rgba(255,255,255,0.08)",
                background: active ? "rgba(201,169,110,0.12)" : "transparent",
                color: active ? "var(--accent)" : "var(--muted)",
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "color 120ms, border-color 120ms, background 120ms",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "rgba(201,169,110,0.3)"; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; } }}
            >
              <span>{label}</span>
              {lang === "te_en" && (
                <span style={{ fontSize: 9, opacity: 0.55, fontWeight: 400 }}>{st.en}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW sub-tab — HouseOverviewGrid */}
      {housesSubTab === "overview" && (
        <div className="tab-content">
          {/* PR A1.3-fix-20 — Tara Chakra widget at top of Overview */}
          {wd?.tara_chakra && (
            <TaraChakraWidget
              taraData={wd.tara_chakra}
              todayMoonNakshatra={wd?.panchangam_today?.nakshatra_en}
            />
          )}
          <div style={{ display: "flex", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 340 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{t("House overview", "భావ సారాంశం")}</span>
                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 6, background: "rgba(201,169,110,0.1)", color: "var(--accent)", border: "0.5px solid rgba(201,169,110,0.25)" }}>CSL · KP unique</span>
              </div>
              <HouseOverviewGrid
                cusps={wd.cusps}
                planets={wd.planets}
                selectedHouse={cslSelectedHouse}
                onHouseClick={h => setCslSelectedHouse(prev => prev === h ? null : h)}
              />
            </div>
            {/* CSL Chain view panel */}
            {cslSelectedHouse && wd.csl_chains && wd.csl_chains[String(cslSelectedHouse)] && (
              <div style={{ width: 300, flexShrink: 0 }} className="fade-in">
                <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 }}>{t("CSL chain analysis", "CSL చైన్ విశ్లేషణ")}</div>
                <CSLChainView
                  houseNum={cslSelectedHouse}
                  chain={wd.csl_chains[String(cslSelectedHouse)]}
                />
                {!isMobile && (
                  <div style={{ marginTop: 8 }}>
                    <HousePanel
                      house={cslSelectedHouse}
                      cusps={wd.cusps}
                      significators={wd.significators}
                      planets={wd.planets}
                      rulingPlanets={wd.ruling_planets?.all_en || []}
                      antardashas={wd.antardashas || []}
                      onClose={() => setCslSelectedHouse(null)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUSPS sub-tab */}
      {housesSubTab === "cusps" && (
        <div className="tab-content" style={{ display: "flex", gap: "1rem", alignItems: "start" }}>
          <div style={{ flex: 1, overflowX: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{t("House cusps · KP key", "భావ కస్పాల పట్టిక · KP కీలకం")}</div>
              <div style={{ fontSize: 9, color: "var(--muted)" }}>{t("Click any row → house panel", "ఏదైనా అడ్డంగా నొక్కండి → భావ వివరాలు")}</div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
              <thead>
                <tr>
                  {[
                    t("House", "భావం"),
                    t("Sign", "రాశి"),
                    t("Degree", "అంశం"),
                    t("Nakshatra", "నక్షత్రం"),
                    t("Star lord", "నక్షత్రాధిపతి"),
                    t("Sub lord", "సబ్ లార్డ్"),
                  ].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--muted)", fontSize: 10, letterSpacing: "0.06em", borderBottom: "0.5px solid var(--border)", fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(wd.cusps as any[]).map((c: any) => {
                  const signV = lang === "en" ? c.sign_en : (c.sign_te ?? c.sign_en);
                  const nakV  = lang === "en" ? c.nakshatra_en : (c.nakshatra_te ?? c.nakshatra_en);
                  const starV = lang === "en" ? c.star_lord_en : (c.star_lord_te ?? c.star_lord_en);
                  const subV  = lang === "en" ? c.sub_lord_en : (c.sub_lord_te ?? c.sub_lord_en);
                  const houseSub = lang === "en" ? "" : (c.house_te ?? "");
                  return (
                    <tr key={c.house_num} onClick={() => setSelectedHouse(selectedHouse === c.house_num ? null : c.house_num)} style={{ borderBottom: "0.5px solid rgba(201,169,110,.06)", cursor: "pointer", background: selectedHouse === c.house_num ? "rgba(201,169,110,0.08)" : "transparent" }} onMouseEnter={e => { if (selectedHouse !== c.house_num) e.currentTarget.style.background = "rgba(201,169,110,0.04)"; }} onMouseLeave={e => { if (selectedHouse !== c.house_num) e.currentTarget.style.background = "transparent"; }}>
                      <td style={{ padding: "9px 10px" }}>
                        <span style={{ color: selectedHouse === c.house_num ? "var(--accent2)" : "var(--accent)", fontWeight: 700 }}>H{c.house_num}</span>
                        {houseSub && <span style={{ color: "var(--muted)", fontSize: 10, marginLeft: 4 }}>{houseSub}</span>}
                      </td>
                      <td style={{ padding: "9px 10px", color: "var(--text)" }}>{signV}</td>
                      <td style={{ padding: "9px 10px", color: "var(--muted)", fontSize: 11 }}>{c.degree_in_sign.toFixed(2)}°</td>
                      <td style={{ padding: "9px 10px", color: "var(--text)" }}>{nakV}</td>
                      <td style={{ padding: "9px 10px", color: PLANET_COLORS[c.star_lord_en] || "var(--text)" }}>{starV}</td>
                      <td style={{ padding: "9px 10px" }}><span style={{ background: "rgba(201,169,110,.1)", color: "var(--accent)", border: "0.5px solid var(--border2)", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{subV}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {selectedHouse && !isMobile && (
            <div style={{ width: 280, flexShrink: 0 }}>
              <HousePanel
                house={selectedHouse}
                cusps={wd.cusps}
                significators={wd.significators}
                planets={wd.planets}
                rulingPlanets={wd.ruling_planets?.all_en || []}
                antardashas={wd.antardashas || []}
                onClose={() => setSelectedHouse(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* SIGNIFICATORS sub-tab */}
      {housesSubTab === "sigs" && (
        <div className="tab-content" style={{ display: "flex", gap: "1rem", alignItems: "start" }}>
          <div style={{ flex: 1 }}>
            {(() => {
              // Build 9×12 strength grid from significators data
              const PLANETS_EN = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
              const sigGrid: Record<string, number[]> = {};
              PLANETS_EN.forEach(p => { sigGrid[p] = []; });
              Object.entries(wd.significators).forEach(([, sig]: [string, any]) => {
                const hNum: number = sig.house_num;
                (sig.all_significators_en || []).forEach((p: string) => {
                  if (sigGrid[p] !== undefined && !sigGrid[p].includes(hNum)) sigGrid[p].push(hNum);
                });
              });
              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{t("Significators · all houses", "కారక గ్రహాలు · అన్ని భావాలు")}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ fontSize: 9, color: "var(--muted)" }}>{t("Click any house → full details", "ఏ భావాన్నయినా నొక్కండి → వివరాలు")}</div>
                      <button onClick={() => setShowSigGrid(g => !g)}
                        style={{ padding: "3px 10px", background: showSigGrid ? "rgba(201,169,110,0.2)" : "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 5, color: showSigGrid ? "var(--accent)" : "var(--muted)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                        {showSigGrid ? t("Hide grid", "గ్రిడ్ దాచు") : t("Show strength grid", "బలం గ్రిడ్ చూడు")}
                      </button>
                    </div>
                  </div>
                  {showSigGrid && (
                    <div style={{ overflowX: "auto", marginBottom: 16 }}>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>{t("Planet × house significator matrix", "గ్రహ × భావ కారకత్వ మాతృక")}</div>
                      <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr>
                            <th style={{ padding: "5px 8px", color: "var(--accent)", fontWeight: 600, textAlign: "left", minWidth: 70 }}>{t("Planet", "గ్రహం")}</th>
                            {Array.from({length:12},(_,i)=>(
                              <th key={i} style={{ padding: "5px 6px", color: "var(--muted)", fontWeight: 500, textAlign: "center", minWidth: 28 }}>H{i+1}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {PLANETS_EN.map(p => (
                            <tr key={p} style={{ borderBottom: "0.5px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "5px 8px", color: PLANET_COLORS[p] || "var(--fg)", fontWeight: 500 }}>{p}</td>
                              {Array.from({length:12},(_,i)=>{
                                const has = sigGrid[p]?.includes(i+1);
                                return (
                                  <td key={i} style={{ padding: "5px 6px", textAlign: "center" }}>
                                    {has ? (
                                      <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: "50%", background: `${PLANET_COLORS[p] || "var(--accent)"}25`, border: `1px solid ${PLANET_COLORS[p] || "var(--accent)"}60`, color: PLANET_COLORS[p] || "var(--accent)", fontSize: 9, lineHeight: "18px", fontWeight: 700 }}>✓</span>
                                    ) : (
                                      <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 11 }}>·</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              );
            })()}
            <div className="grid-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {Object.entries(wd.significators).map(([key, sig]: [string, any]) => {
                const houseSub = lang === "en" ? "" : (sig.house_te ?? "");
                const occNames = lang === "en" ? (sig.occupants_en ?? []) : (sig.occupants_te ?? sig.occupants_en ?? []);
                const lordName = lang === "en" ? sig.house_lord_en : (sig.house_lord_te ?? sig.house_lord_en);
                const allSigs = lang === "en" ? (sig.all_significators_en ?? []) : (sig.all_significators_te ?? sig.all_significators_en ?? []);
                return (
                  <div key={key} onClick={() => setSelectedHouse(selectedHouse === sig.house_num ? null : sig.house_num)} style={{ background: selectedHouse === sig.house_num ? "rgba(201,169,110,0.12)" : "var(--surface2)", borderRadius: 8, padding: "0.75rem", border: `0.5px solid ${selectedHouse === sig.house_num ? "rgba(201,169,110,0.5)" : "var(--border)"}`, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => { if (selectedHouse !== sig.house_num) (e.currentTarget as HTMLElement).style.background = "rgba(201,169,110,0.06)"; }} onMouseLeave={e => { if (selectedHouse !== sig.house_num) (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}>
                    <div style={{ fontSize: 11, color: selectedHouse === sig.house_num ? "var(--accent2)" : "var(--accent)", fontWeight: 700, marginBottom: 2 }}>H{sig.house_num}</div>
                    {houseSub && <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>{houseSub}</div>}
                    {sig.occupants_en?.length > 0 && (
                      <div style={{ marginBottom: 3 }}>
                        <span style={{ fontSize: 9, color: "var(--muted)" }}>{t("Occupants", "నివాసులు")}: </span>
                        {occNames.map((p: string, i: number) => <span key={i} style={{ fontSize: 11, color: PLANET_COLORS[sig.occupants_en[i]] || "var(--accent2)", marginRight: 3 }}>{p}</span>)}
                      </div>
                    )}
                    <div style={{ marginBottom: 3 }}>
                      <span style={{ fontSize: 9, color: "var(--muted)" }}>{t("Lord", "అధిపతి")}: </span>
                      <span style={{ fontSize: 11, color: PLANET_COLORS[sig.house_lord_en] || "var(--green)" }}>{lordName}</span>
                    </div>
                    <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 4, marginTop: 2 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                        {allSigs.map((p: string, i: number) => <span key={i} style={{ fontSize: 10, color: PLANET_COLORS[sig.all_significators_en[i]] || "var(--text)" }}>{p}</span>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {selectedHouse && !isMobile && (
            <div style={{ width: 280, flexShrink: 0 }}>
              <HousePanel
                house={selectedHouse}
                cusps={wd.cusps}
                significators={wd.significators}
                planets={wd.planets}
                rulingPlanets={wd.ruling_planets?.all_en || []}
                antardashas={wd.antardashas || []}
                onClose={() => setSelectedHouse(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* RULING sub-tab (inline, no outer wrapper) */}
      {housesSubTab === "ruling" && (
        <div>
          <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.75rem" }}>
            {t("Ruling planets", "రూలింగ్ గ్రహాలు")} · {wd.ruling_planets.query_time}
          </div>
          {/* Phase 2 / PR 4 — KSK strength order + extended 5+2 slots.
              Stress-test findings #2, #3, #4: previously this list was
              sorted Day-Lord-first (weakest in KSK) and the extended
              Asc/Moon Sub Lords were missing entirely. Now strongest
              is at the top, weakest at the bottom, and the extended
              pair is grouped under a clear "Extended" subheader. The
              `lagna_sub_lord` / `moon_sub_lord` values come from the
              `rp_context` block the backend already emits — no
              backend change required. */}
          <div className="setup-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 10, padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 9, color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                <span>{t("Strength order", "శక్తి క్రమం")}</span>
                <span style={{ color: "var(--muted)" }}>{t("strongest →", "బలమైనది →")}</span>
              </div>
              {/* Core 5 — KSK canonical strength order:
                    1. Asc Star Lord  (strongest)
                    2. Asc Sign Lord
                    3. Moon Star Lord
                    4. Moon Sign Lord
                    5. Day Lord       (weakest) */}
              {[
                { l: t("Asc star lord",     "లగ్న నక్షత్రాధిపతి"), en: wd.ruling_planets.lagna_star_lord_en, te: wd.ruling_planets.lagna_star_lord_te, rank: 1 },
                { l: t("Asc sign lord",     "లగ్న రాశ్యధిపతి"),  en: wd.ruling_planets.lagna_sign_lord_en, te: wd.ruling_planets.lagna_sign_lord_te, rank: 2 },
                { l: t("Moon star lord",    "చంద్ర నక్షత్రాధిపతి"), en: wd.ruling_planets.moon_star_lord_en, te: wd.ruling_planets.moon_star_lord_te, rank: 3 },
                { l: t("Moon sign lord",    "చంద్ర రాశ్యధిపతి"),  en: wd.ruling_planets.moon_sign_lord_en, te: wd.ruling_planets.moon_sign_lord_te, rank: 4 },
                { l: t("Day lord",          "వారాధిపతి"),        en: wd.ruling_planets.day_lord_en,         te: wd.ruling_planets.day_lord_te,         rank: 5 },
              ].map(item => {
                const val = lang === "en" ? item.en : (item.te ?? item.en);
                return (
                  <div key={item.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 10, borderBottom: "0.5px solid var(--border)" }}>
                    <span style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 9, color: "var(--accent)", opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>{item.rank}</span>
                      {item.l}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: PLANET_COLORS[item.en] || "var(--accent)" }}>{val}</span>
                  </div>
                );
              })}
              {/* Extended 5+2 — Asc Sub Lord and Moon Sub Lord.
                  Backend (Phase 2 / PR 4) emits these as top-level
                  *_en/*_te keys to match the existing 5-slot pattern.
                  Visually grouped under a dimmer subheader so the KSK
                  core 5 stays the primary read. */}
              {(wd.ruling_planets.lagna_sub_lord_en || wd.ruling_planets.moon_sub_lord_en) && (
                <>
                  <div style={{ marginTop: 4, marginBottom: 8, fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" as const, opacity: 0.7 }}>
                    {t("Extended (KSK 5+2)", "విస్తరించినవి (KSK 5+2)")}
                  </div>
                  {[
                    { l: t("Asc sub lord",  "లగ్న ఉప నాథ"),   en: wd.ruling_planets.lagna_sub_lord_en, te: wd.ruling_planets.lagna_sub_lord_te },
                    { l: t("Moon sub lord", "చంద్ర ఉప నాథ"), en: wd.ruling_planets.moon_sub_lord_en,  te: wd.ruling_planets.moon_sub_lord_te },
                  ].filter(item => item.en).map(item => {
                    const val = lang === "en" ? item.en : (item.te ?? item.en);
                    return (
                      <div key={item.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 8, borderBottom: "0.5px solid var(--border)", opacity: 0.85 }}>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{item.l}</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: PLANET_COLORS[item.en!] || "var(--accent)" }}>{val}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
            <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border2)", borderRadius: 10, padding: "1rem" }}>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: "0.75rem" }}>{t("All ruling planets", "అన్ని రూలింగ్ గ్రహాలు")}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(lang === "en" ? wd.ruling_planets.all_en : wd.ruling_planets.all_te).map((p: string, i: number) => (
                  <div key={i} style={{ textAlign: "center", padding: "10px 14px", background: `${PLANET_COLORS[wd.ruling_planets.all_en[i]] || "var(--accent)"}15`, border: `0.5px solid ${PLANET_COLORS[wd.ruling_planets.all_en[i]] || "var(--accent)"}30`, borderRadius: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: PLANET_COLORS[wd.ruling_planets.all_en[i]] || "var(--accent)" }}>{p}</div>
                    {lang !== "en" && <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>{wd.ruling_planets.all_en[i]}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANCHANGAM sub-tab */}
      {housesSubTab === "panchang" && (
        <div>
          <div className="setup-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            {/* Phase 2 / PR 6 — pass `kind` so the Hora row reads
                "Birth hora" on the left card and "Hora at chart load"
                on the right card. Previously both said "Current hora"
                which was misleading on the birth card (#9). */}
            <PanchangamCard data={wd.panchangam_birth} title={t("Birth panchangam", "జన్మ పంచాంగం")} kind="birth" />
            <PanchangamCard data={wd.panchangam_today} title={t("Today's panchangam", "నేటి పంచాంగం")} kind="today" />
          </div>
        </div>
      )}
    </div>
  );
}
