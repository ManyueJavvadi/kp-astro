"use client";

/**
 * DashaTab — Vimshottari dasha journey + collapsible Transit (Gochar)
 * section. The biggest single tab in the app (~574 lines of JSX in the
 * pre-R3 monolith).
 *
 * PR R3 (Phase A foundation refactor) — extracted from page.tsx
 * lines 2550-3121. Same pattern as R1/R2 + bundled `transitState` prop
 * to keep the parent interface clean (8 transit state vars would be
 * messy as individual props).
 *
 * State decisions:
 *   - All local rendering helpers (periodProgress, fmt) — INSIDE component
 *   - Transit state (data/loading/date/fetchedAt/subTab/show) — STAYS in
 *     parent, passed as a bundled `transitState` prop. Reason: the transit
 *     API call is wired to liveLoc + timezoneOffset which are also parent
 *     state. Moving transit state into DashaTab would require moving those
 *     too. Out of scope for a refactor PR.
 *   - workspaceData → prop from parent
 *
 * Sacred-region check (per .claude/research/world-first-vision.md §15):
 *   - No AI prompts touched
 *   - Transit API call (/transit/analyze) preserved verbatim
 *   - Pure frontend JSX extraction
 */

import axios from "axios";
import {
  Orbit, ChevronDown, Loader2, RefreshCw, Compass, TriangleAlert,
  Sparkles, Calendar,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { PageHero } from "@/components/ui/PageHero";
import DashaStrip from "../components/workspace/DashaStrip";
import DashaTimeline from "../components/DashaTimeline";
import MobileDashaStories from "../components/mobile/MobileDashaStories";
import { PLANET_COLORS } from "../components/constants";
import { formatDate } from "@/lib/format";
import type { WorkspaceData } from "../types/workspace";

// Bundled transit state — keeps DashaTab's prop surface clean.
// All 8 transit-related state vars + setters live in parent (page.tsx)
// and pass through this single object.
export interface TransitStateBundle {
  data: any;
  loading: boolean;
  date: string;
  fetchedAt: number | null;
  subTab: "overview" | "planets" | "kp";
  show: boolean;
  setData: (d: any) => void;
  setLoading: (b: boolean) => void;
  setDate: (s: string) => void;
  setFetchedAt: (n: number | null) => void;
  setSubTab: (s: "overview" | "planets" | "kp") => void;
  setShow: (b: boolean) => void;
}

interface DashaTabProps {
  workspaceData: WorkspaceData;
  transitState: TransitStateBundle;
  liveLoc: { location: { latitude?: number; longitude?: number; timezone_offset?: number } | null };
  timezoneOffset: number;
  apiUrl: string;
  isMobile?: boolean;
}

export function DashaTab({
  workspaceData,
  transitState,
  liveLoc,
  timezoneOffset,
  apiUrl,
  isMobile,
}: DashaTabProps) {
  const { t, lang } = useLanguage();

  // Period-elapsed helper: given YYYY-MM-DD strings,
  // returns { pct 0-100, elapsedYears, totalYears }.
  const periodProgress = (start?: string, end?: string) => {
    if (!start || !end) return { pct: 0, elapsedY: 0, totalY: 0 };
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const now = Date.now();
    const total = e - s;
    if (total <= 0) return { pct: 0, elapsedY: 0, totalY: 0 };
    const elapsed = Math.max(0, Math.min(total, now - s));
    const yr = (ms: number) => ms / (1000 * 60 * 60 * 24 * 365.25);
    return {
      pct: Math.round((elapsed / total) * 100),
      elapsedY: +yr(elapsed).toFixed(1),
      totalY: +yr(total).toFixed(1),
    };
  };

  // Loose alias to preserve pre-R3 access patterns under the strict type.
  const wd: any = workspaceData;

  const md  = wd.current_dasha ?? wd.mahadasha;
  const ad  = wd.current_antardasha;
  const pad = wd.current_pratyantardasha;
  const mdLord  = md  ? (lang === "en" ? md.lord_en  : (md.lord_te  || md.lord_en))  : null;
  const adLord  = ad  ? (lang === "en" ? ad.lord_en  : (ad.lord_te  || ad.lord_en))  : null;
  const padLord = pad ? (lang === "en" ? pad.lord_en : (pad.lord_te || pad.lord_en)) : null;
  const mdProg  = periodProgress(md?.start,  md?.end);
  const adProg  = periodProgress(ad?.start,  ad?.end);
  const padProg = periodProgress(pad?.start, pad?.end);
  const fmt = (s?: string) => formatDate(s) || "—";

  // Destructure transit state for readability
  const {
    data: transitData,
    loading: transitLoading,
    date: transitDate,
    fetchedAt: transitFetchedAt,
    subTab: transitSubTab,
    show: showTransitInDasha,
    setData: setTransitData,
    setLoading: setTransitLoading,
    setDate: setTransitDate,
    setFetchedAt: setTransitFetchedAt,
    setSubTab: setTransitSubTab,
    setShow: setShowTransitInDasha,
  } = transitState;

  return (
    <div className="tab-content">
      {/* Phase 15.2 — Track A serif PageHero (Dasha tab) */}
      <PageHero
        eyebrow={t("Vimshottari · 120-year cycle", "విమ్శోత్తరి · 120 సంవత్సరాల చక్రం")}
        title={t("Your dasha journey", "మీ దశ ప్రయాణం")}
        subcopy={t(
          "Every planet rules a window of your life. See which Mahadasha, Antardasha, and Pratyantardasha you're living in — with transits layered on top.",
          "ప్రతి గ్రహం మీ జీవితంలో ఒక కాలాన్ని శాసిస్తుంది. మీరు ఏ మహాదశ, అంతర్దశ, ప్రత్యంతర్దశలో ఉన్నారో చూడండి — గోచారాలతో కలిపి."
        )}
      />

      {/* Currently running — 3-card hero with MD breathing */}
      {md && (
        <div className="dasha-now-grid">
          <div
            className="dasha-now-card is-md celestial-glass celestial-panel"
            style={{ ["--planet-color" as any]: PLANET_COLORS[md.lord_en] ?? "var(--accent)" }}
          >
            <div className="dasha-now-stage celestial-sub-serif">{t("Mahadasha", "మహాదశ")}</div>
            <div className="dasha-now-planet celestial-serif">{mdLord ?? "—"}</div>
            <div className="dasha-now-dates celestial-mono">{fmt(md.start)} → {fmt(md.end)}</div>
            <div className="dasha-now-progress">
              <div className="dasha-now-progress-fill" style={{ width: `${mdProg.pct}%`, boxShadow: `0 0 8px ${PLANET_COLORS[md.lord_en] ?? "var(--accent)"}` }} />
            </div>
            <div className="dasha-now-elapsed celestial-mono">
              <b>{mdProg.elapsedY}y</b> / {mdProg.totalY}y · {mdProg.pct}% {t("elapsed", "పూర్తయింది")}
            </div>
          </div>

          {ad && (
            <div
              className="dasha-now-card celestial-glass celestial-panel"
              style={{ ["--planet-color" as any]: PLANET_COLORS[ad.lord_en] ?? "var(--accent)" }}
            >
              <div className="dasha-now-stage celestial-sub-serif">{t("Antardasha", "అంతర్దశ")}</div>
              <div className="dasha-now-planet celestial-serif">{adLord ?? "—"}</div>
              <div className="dasha-now-dates celestial-mono">{fmt(ad.start)} → {fmt(ad.end)}</div>
              <div className="dasha-now-progress">
                <div className="dasha-now-progress-fill" style={{ width: `${adProg.pct}%`, boxShadow: `0 0 8px ${PLANET_COLORS[ad.lord_en] ?? "var(--accent)"}` }} />
              </div>
              <div className="dasha-now-elapsed celestial-mono">
                <b>{adProg.elapsedY}y</b> / {adProg.totalY}y · {adProg.pct}% {t("elapsed", "పూర్తయింది")}
              </div>
            </div>
          )}

          {pad && (
            <div
              className="dasha-now-card celestial-glass celestial-panel"
              style={{ ["--planet-color" as any]: PLANET_COLORS[pad.lord_en] ?? "var(--accent)" }}
            >
              <div className="dasha-now-stage celestial-sub-serif">{t("Pratyantardasha", "ప్రత్యంతర్దశ")}</div>
              <div className="dasha-now-planet celestial-serif">{padLord ?? "—"}</div>
              <div className="dasha-now-dates celestial-mono">{fmt(pad.start)} → {fmt(pad.end)}</div>
              <div className="dasha-now-progress">
                <div className="dasha-now-progress-fill" style={{ width: `${padProg.pct}%`, boxShadow: `0 0 8px ${PLANET_COLORS[pad.lord_en] ?? "var(--accent)"}` }} />
              </div>
              <div className="dasha-now-elapsed celestial-mono">
                <b>{padProg.pct}%</b> {t("elapsed", "పూర్తయింది")}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DashaStrip — the 120y bar + tree + AD chips */}
      <div style={{ marginTop: 24 }}>
        <DashaStrip
          dashas={wd.dashas ?? []}
          currentDasha={wd.current_dasha ?? wd.mahadasha}
          antardashas={wd.antardashas ?? []}
          currentAntardasha={wd.current_antardasha}
          pratyantardashas={wd.pratyantardashas ?? []}
          currentPratyantardasha={wd.current_pratyantardasha}
        />
      </div>

      {/* Antardasha timeline section */}
      {wd.antardashas && wd.antardashas.length > 0 && (
        <div className="dasha-section celestial-glass celestial-panel" style={{ padding: "24px", borderRadius: "12px" }}>
          <div className="dasha-section-header">
            <div className="dasha-section-eyebrow celestial-sub-serif">
              {t("Antardasha · sub-period", "అంతర్దశ · ఉప-కాలం")}
            </div>
            <div className="dasha-section-title celestial-serif" style={{ color: "var(--accent)", fontSize: "1.25rem", margin: "4px 0 8px" }}>
              {t(`Antardashas in ${mdLord ?? ""} Mahadasha`, `${mdLord ?? ""} మహాదశలో అంతర్దశలు`)}
            </div>
            <div className="dasha-section-sub">
              {t(
                "Each planet rules a smaller slice of the current Mahadasha. The highlighted row is where you are right now.",
                "ప్రతి గ్రహం ప్రస్తుత మహాదశలో ఒక చిన్న భాగాన్ని పాలిస్తుంది. హైలైట్ అయిన వరుస మీరు ప్రస్తుతం ఉన్న స్థానం."
              )}
            </div>
          </div>
          {isMobile ? (
            <MobileDashaStories mahadasha={wd.mahadasha} antardashas={wd.antardashas} workspaceData={workspaceData} />
          ) : (
            <DashaTimeline mahadasha={wd.mahadasha} antardashas={wd.antardashas} workspaceData={workspaceData} />
          )}
        </div>
      )}



      {/* ────────────────────────────────────────────────
           TRANSIT (Gochar) — PR18 wow-pass.
           Collapsible section inside Dasha. Premium toggle
           card, serif gochar hero, 3 MD/AD/PAD spotlight
           cards, polished planets table with breathing
           dasha-lord row, KP rule card. Full i18n.
           ──────────────────────────────────────────────── */}
      <div className="transit-section">
        <button
          className={`transit-toggle${showTransitInDasha ? " is-open" : ""}`}
          onClick={() => {
            const next = !showTransitInDasha;
            setShowTransitInDasha(next);
            if (next && workspaceData && !transitData && !transitLoading) {
              setTransitLoading(true);
              // PR A1.3-fix-24 — use astrologer's CURRENT location
              // for transit (KP Ruling Planet rule: live time + live
              // location, NOT natal). Falls back to natal if user
              // hasn't granted location access yet.
              axios.post(`${apiUrl}/transit/analyze`, {
                natal: workspaceData, transit_date: undefined,
                latitude: liveLoc.location?.latitude ?? wd.latitude ?? 17.385,
                longitude: liveLoc.location?.longitude ?? wd.longitude ?? 78.4867,
                timezone_offset: liveLoc.location?.timezone_offset ?? timezoneOffset,
              }).then(res => { setTransitData(res.data); setTransitFetchedAt(Date.now()); setTransitLoading(false); })
                .catch(() => setTransitLoading(false));
            }
          }}
        >
          <span className="transit-toggle-icon"><Orbit size={20} strokeWidth={1.6} /></span>
          <span className="transit-toggle-body">
            <span className="transit-toggle-eyebrow">{t("Gochar · Current Sky", "గోచారం · ప్రస్తుత ఆకాశం")}</span>
            <span className="transit-toggle-title">{t("Today's transits", "నేటి గోచారాలు")}</span>
            <span className="transit-toggle-sub">
              {t(
                "Rank current-sky planets against your dasha — flag Sade Sati.",
                "ప్రస్తుత గ్రహాలను మీ దశతో పోల్చి చూపుతుంది — సాడేసాతి హెచ్చరిక."
              )}
            </span>
          </span>
          <span className="transit-toggle-chevron"><ChevronDown size={16} strokeWidth={2} /></span>
        </button>

        {showTransitInDasha && (
          <div className="transit-body">
            {/* Controls row: current period chips + date input + refresh */}
            <div className="transit-controls">
              <div className="transit-controls-period">
                <div className="transit-controls-eyebrow">{t("Your current period", "మీ ప్రస్తుత దశ")}</div>
                <div className="transit-controls-period-row">
                  {wd.mahadasha && (
                    <span className="transit-period-chip md">
                      <span className="stage">MD</span>
                      <span>{lang === "en" ? wd.mahadasha.lord_en : (wd.mahadasha.lord_te || wd.mahadasha.lord_en)}</span>
                    </span>
                  )}
                  {wd.current_antardasha && (
                    <span className="transit-period-chip ad">
                      <span className="stage">AD</span>
                      <span>{lang === "en" ? wd.current_antardasha.lord_en : (wd.current_antardasha.lord_te || wd.current_antardasha.lord_en)}</span>
                    </span>
                  )}
                  {wd.current_pratyantardasha && (
                    <span className="transit-period-chip pad">
                      <span className="stage">PAD</span>
                      <span>{lang === "en" ? wd.current_pratyantardasha.lord_en : (wd.current_pratyantardasha.lord_te || wd.current_pratyantardasha.lord_en)}</span>
                    </span>
                  )}
                </div>
              </div>
              <input
                type="date"
                className="transit-date-input"
                value={transitDate}
                onChange={e => setTransitDate(e.target.value)}
                aria-label={t("Transit date", "గోచార తేదీ")}
              />
              <button
                className="transit-refresh-btn"
                disabled={transitLoading}
                onClick={async () => {
                  if (!workspaceData) return;
                  setTransitLoading(true);
                  try {
                    // PR A1.3-fix-24 — same live-location fix as the auto-fetch above
                    const res = await axios.post(`${apiUrl}/transit/analyze`, {
                      natal: workspaceData,
                      transit_date: transitDate || undefined,
                      latitude: liveLoc.location?.latitude ?? wd.latitude ?? 17.385,
                      longitude: liveLoc.location?.longitude ?? wd.longitude ?? 78.4867,
                      timezone_offset: liveLoc.location?.timezone_offset ?? timezoneOffset,
                    });
                    setTransitData(res.data);
                    setTransitFetchedAt(Date.now());
                  } catch { setTransitData(null); }
                  setTransitLoading(false);
                }}
              >
                {transitLoading
                  ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                  : <RefreshCw size={13} strokeWidth={2} />}
                {transitLoading ? t("Loading…", "లోడ్...") : t("Refresh", "రిఫ్రెష్")}
              </button>
              {/* PR A1.3-fix-25 — stale-data indicator. */}
              {transitFetchedAt && !transitLoading && (() => {
                const ageMin = Math.floor((Date.now() - transitFetchedAt) / 60000);
                const isStale = ageMin >= 5;
                return (
                  <span style={{
                    fontSize: 10,
                    color: isStale ? "#fbbf24" : "var(--muted)",
                    fontStyle: "italic",
                    marginLeft: 6,
                  }}>
                    {ageMin < 1
                      ? t("Just now", "ఇప్పుడే")
                      : ageMin === 1
                      ? t("1 min ago", "1 నిమిషం క్రితం")
                      : t(`${ageMin} min ago`, `${ageMin} నిమిషాల క్రితం`)}
                    {isStale && " · " + t("refresh recommended", "రిఫ్రెష్ చేయండి")}
                  </span>
                );
              })()}
            </div>

            {/* Sade Sati hero (only when active) */}
            {transitData?.sade_sati?.active && (
              <div className="transit-sade-hero">
                <span className="transit-sade-icon"><TriangleAlert size={22} strokeWidth={1.8} /></span>
                <div className="transit-sade-body">
                  <div className="transit-sade-eyebrow">{t("Alert · Sade Sati active", "హెచ్చరిక · సాడేసాతి")}</div>
                  <div className="transit-sade-title">{transitData.sade_sati.phase}</div>
                  <div className="transit-sade-meta">
                    {t("Natal Moon sign", "చంద్ర రాశి")}: <b>{transitData.sade_sati.natal_moon_sign}</b>
                    {" · "}
                    {t("Saturn transiting", "శని ప్రస్తుతం")}: <b>{transitData.sade_sati.saturn_in}</b>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state */}
            {transitLoading && (
              <div className="transit-loading">
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                {t("Scanning the current sky…", "ప్రస్తుత ఆకాశం చదువుతోంది...")}
              </div>
            )}

            {/* Empty state */}
            {!transitLoading && !transitData && (
              <div className="transit-empty">
                <span className="transit-empty-icon"><Compass size={22} strokeWidth={1.6} /></span>
                <div className="transit-empty-title">{t("No transit data yet", "గోచార డేటా ఇంకా లేదు")}</div>
                <div className="transit-empty-sub">
                  {t(
                    "Pick a date and press Refresh to see today's sky against your chart.",
                    "తేదీ ఎంచుకుని రిఫ్రెష్ నొక్కండి — మీ చార్ట్‌తో పోల్చి చూపుతుంది."
                  )}
                </div>
              </div>
            )}

            {/* Sub-tabs + panes — only when we have data */}
            {!transitLoading && transitData?.transits && (() => {
              const mdLordTransit = transitData.current_period?.dasha_lord;
              const adLordTransit = transitData.current_period?.bhukti_lord;
              const padLordTransit = transitData.current_period?.antara_lord;
              const mdT = transitData.transits.find((x: any) => x.planet === mdLordTransit);
              const adT = transitData.transits.find((x: any) => x.planet === adLordTransit);
              const padT = transitData.transits.find((x: any) => x.planet === padLordTransit);
              const planetCount = transitData.transits.length;

              return (
                <>
                  <div className="transit-subtab-bar">
                    {(["overview", "planets", "kp"] as const).map(key => {
                      const labels = {
                        overview: { en: "Overview", te: "అవలోకనం" },
                        planets:  { en: "Planets",  te: "గ్రహాలు"   },
                        kp:       { en: "KP Rule",  te: "KP సూత్రం" },
                      };
                      const active = transitSubTab === key;
                      return (
                        <button
                          key={key}
                          className={`transit-subtab-pill${active ? " is-active" : ""}`}
                          onClick={() => setTransitSubTab(key)}
                        >
                          <span>{lang === "en" ? labels[key].en : labels[key].te}</span>
                          {key === "planets" && <span className="count">{planetCount}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Overview pane ── */}
                  {transitSubTab === "overview" && (
                    <div className="transit-pane" key="overview">
                      <div className="transit-hero">
                        <div className="transit-hero-eyebrow">
                          <Sparkles size={12} strokeWidth={1.8} />
                          {t("Gochar · ", "గోచారం · ")}{transitData.transit_date}
                        </div>
                        <div className="transit-hero-title">
                          {t("How the sky speaks to your chart today", "నేడు ఆకాశం మీ చార్ట్‌తో ఏమి చెబుతోంది")}
                        </div>
                        <div className="transit-hero-sub">
                          {t(
                            "KP Gochar rule: only the Dasha and Bhukti lords deliver strong results. A transit sub-lord aligned with the relevant houses confirms timing.",
                            "KP గోచార సూత్రం: దశాధిపతి మరియు అంతర్దశాధిపతి గ్రహాలు మాత్రమే బలమైన ఫలితాన్ని ఇస్తాయి. ట్రాన్‌జిట్ సబ్‌లార్డ్ సంబంధిత భావాలను సూచిస్తే — ఆ సమయం నిర్ధారణ."
                          )}
                        </div>
                      </div>

                      {(mdT || adT || padT) && (
                        <div className="transit-spotlight-grid">
                          {mdT && (
                            <div className="transit-spotlight is-md">
                              <div className="transit-spot-stage">{t("Mahadasha lord", "మహాదశ నాథుడు")}</div>
                              <div className="transit-spot-planet">
                                <span className="sym">{mdT.symbol}</span>
                                <span>{mdT.planet}</span>
                                {mdT.retrograde && <span className="transit-spot-retro">℞</span>}
                              </div>
                              <div className="transit-spot-meta">
                                <b>{mdT.sign}</b> · {mdT.nakshatra}
                              </div>
                              <div><span className="transit-spot-house">{t("House", "భావం")} {mdT.transit_house}</span></div>
                            </div>
                          )}
                          {adT && (
                            <div className="transit-spotlight">
                              <div className="transit-spot-stage">{t("Antardasha lord", "అంతర్దశ నాథుడు")}</div>
                              <div className="transit-spot-planet">
                                <span className="sym">{adT.symbol}</span>
                                <span>{adT.planet}</span>
                                {adT.retrograde && <span className="transit-spot-retro">℞</span>}
                              </div>
                              <div className="transit-spot-meta">
                                <b>{adT.sign}</b> · {adT.nakshatra}
                              </div>
                              <div><span className="transit-spot-house">{t("House", "భావం")} {adT.transit_house}</span></div>
                            </div>
                          )}
                          {padT && (
                            <div className="transit-spotlight">
                              <div className="transit-spot-stage">{t("Pratyantardasha lord", "ప్రత్యంతర్దశ నాథుడు")}</div>
                              <div className="transit-spot-planet">
                                <span className="sym">{padT.symbol}</span>
                                <span>{padT.planet}</span>
                                {padT.retrograde && <span className="transit-spot-retro">℞</span>}
                              </div>
                              <div className="transit-spot-meta">
                                <b>{padT.sign}</b> · {padT.nakshatra}
                              </div>
                              <div><span className="transit-spot-house">{t("House", "భావం")} {padT.transit_house}</span></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Planets pane ── */}
                  {transitSubTab === "planets" && (
                    <div className="transit-pane" key="planets">
                      <div className="transit-table-wrap">
                        <table className="transit-table">
                          <thead>
                            <tr>
                              <th>{t("Planet", "గ్రహం")}</th>
                              <th>{t("Sign", "రాశి")}</th>
                              <th>{t("Nakshatra", "నక్షత్రం")}</th>
                              <th>{t("Star lord", "స్టార్ లార్డ్")}</th>
                              <th>{t("Sub lord", "సబ్ లార్డ్")}</th>
                              <th className="center">{t("House", "భావం")}</th>
                              <th>{t("Note", "వివరణ")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transitData.transits.map((tr: any) => {
                              const isDasha  = tr.is_dasha_lord;
                              const isBhukti = tr.is_bhukti_lord;
                              const isAntara = tr.is_antara_lord;
                              const rowClass = isDasha ? "row-md" : isBhukti ? "row-ad" : isAntara ? "row-pad" : "";
                              const cellClass = isDasha ? "planet-cell strong" : isBhukti ? "planet-cell medium" : "planet-cell";
                              return (
                                <tr key={tr.planet} className={rowClass}>
                                  <td>
                                    <span className={cellClass}>
                                      <span className="sym">{tr.symbol}</span>
                                      <span>{tr.planet}</span>
                                      {tr.retrograde && <span className="retro-mark">℞</span>}
                                      {isDasha  && <span className="stage-badge md">MD</span>}
                                      {isBhukti && !isDasha  && <span className="stage-badge ad">AD</span>}
                                      {isAntara && !isDasha && !isBhukti && <span className="stage-badge pad">PAD</span>}
                                    </span>
                                  </td>
                                  <td>{tr.sign}</td>
                                  <td style={{ color: "var(--muted)" }}>{tr.nakshatra}</td>
                                  <td>{tr.star_lord}</td>
                                  <td>{tr.sub_lord}</td>
                                  <td style={{ textAlign: "center" }}>
                                    <span className="house-pill">H{tr.transit_house}</span>
                                    {tr.over_natal_position && (
                                      <span className="over-natal" title={t("Transiting over natal position", "జన్మస్థానం మీద గోచారం")}>●</span>
                                    )}
                                  </td>
                                  <td className="note-cell">
                                    {tr.note}
                                    {tr.natal_houses_activated?.length > 0 && (
                                      <span className="activated">
                                        ({t("Natal H", "జన్మ H")}{tr.natal_houses_activated.join("/")})
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ── KP Rule pane ── */}
                  {transitSubTab === "kp" && (
                    <div className="transit-pane" key="kp">
                      <div className="transit-kp-stack">
                        <div className="transit-kp-legend">
                          <div className="transit-kp-legend-title">{t("Stage badges", "దశ బ్యాడ్జ్‌లు")}</div>
                          <div className="transit-kp-legend-row">
                            <span className="transit-kp-legend-badge md">MD</span>
                            <span>
                              <b>{t("Mahadasha lord", "మహాదశ నాథుడు")}</b> — {t(
                                "The planet ruling the current major period. Transits of this planet are strong and primary.",
                                "ప్రస్తుత ప్రధాన దశను శాసించే గ్రహం. దీని గోచారం బలమైనది మరియు ప్రధానమైనది."
                              )}
                            </span>
                          </div>
                          <div className="transit-kp-legend-row">
                            <span className="transit-kp-legend-badge ad">AD</span>
                            <span>
                              <b>{t("Antardasha lord", "అంతర్దశ నాథుడు")}</b> — {t(
                                "The sub-period lord. Transits of this planet confirm or trigger MD promises.",
                                "ఉప-దశ నాథుడు. దీని గోచారం మహాదశ వాగ్దానాలను నిర్ధారిస్తుంది లేదా ప్రేరేపిస్తుంది."
                              )}
                            </span>
                          </div>
                          <div className="transit-kp-legend-row">
                            <span className="transit-kp-legend-badge pad">PAD</span>
                            <span>
                              <b>{t("Pratyantardasha lord", "ప్రత్యంతర్దశ నాథుడు")}</b> — {t(
                                "The fine-grained sub-sub-period lord. Supplies precise day-level timing.",
                                "సూక్ష్మ ఉప-ఉప-దశ నాథుడు. ఖచ్చితమైన రోజు-స్థాయి సమయాన్ని ఇస్తుంది."
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="transit-kp-sutra">
                          <div className="transit-kp-sutra-title">
                            {t("KP Gochar Sutra", "KP గోచార సూత్రం")}
                          </div>
                          <div className="transit-kp-sutra-body">
                            {t(
                              "Only the Dasha lord and Antardasha lord give prominent results. If the transit planet's sub-lord also signifies the matching natal houses — the event manifests.",
                              "దశాధిపతి మరియు అంతర్దశాధిపతి గ్రహాలు మాత్రమే ప్రస్తుతం ఎక్కువ ఫలితాన్ని ఇస్తాయి. ట్రాన్‌జిట్ సబ్‌లార్డ్ కూడా సంబంధిత భావాలను సూచిస్తే — ఆ ఫలితం నిర్ధారణ."
                            )}
                          </div>
                          <span className="transit-kp-sutra-date">
                            <Calendar size={11} strokeWidth={2} />
                            {t("Date", "తేదీ")}: {transitData.transit_date}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
