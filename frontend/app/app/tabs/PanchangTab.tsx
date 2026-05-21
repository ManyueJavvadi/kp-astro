// @ts-nocheck — PR R8 — final tab extraction. Same loose-typing rationale.
"use client";

/**
 * PanchangTab — daily panchangam + calendar workflow.
 *
 * PR R8 (Phase A foundation refactor) — FINAL tab extraction.
 * Extracted from page.tsx (~957 lines of JSX).
 *
 * After R8 ships, page.tsx ends Phase A around ~3,500 lines (down
 * from 8,589). Phase B (Inquiry Bar) and beyond can now build on
 * a clean modular foundation.
 *
 * Sacred-region check (per .claude/research/world-first-vision.md §15):
 *   - No AI prompts touched
 *   - /panchangam endpoints preserved exactly
 *   - Pure frontend JSX extraction
 */

import React from "react";
import axios from "axios";
import {
  Sparkles, Calendar, Clock, MapPin, RefreshCw, Loader2, ChevronDown,
  ChevronLeft, ChevronRight, X, Globe, Sun, Moon, Star,
  Ban, CircleDashed, Crown, HandHeart, Hourglass, MoonStar,
  Sunrise, Sunset, TriangleAlert,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { PageHero } from "@/components/ui/PageHero";
import { PLANET_COLORS } from "../components/constants";
import { stripSeconds } from "@/lib/format";

interface PanchangTabProps {
  workspaceData: any;
  apiUrl: string;
  liveLoc: any;
  // pc state — all panchang state from parent
  pcData: any; setPcData: any;
  pcLoading: any; setPcLoading: any;
  pcLocationName: any; setPcLocationName: any;
  pcDetectedCoords: any; setPcDetectedCoords: any;
  pcGeoError: any; setPcGeoError: any;
  pcShowCityModal: any; setPcShowCityModal: any;
  pcCityQuery: any; setPcCityQuery: any;
  pcCitySuggestions: any; setPcCitySuggestions: any;
  pcCitySearching: any;
  pcCitySearchRef: any;
  pcFetchLocationRef: any;
  // calendar state
  calMonth: any; setCalMonth: any;
  calData: any; setCalData: any;
  calLoading: any; setCalLoading: any;
  calSelectedDay: any; setCalSelectedDay: any;
}

export function PanchangTab(props: PanchangTabProps) {
  const { t, lang } = useLanguage();
  const {
    workspaceData, apiUrl, liveLoc,
    pcData, setPcData, pcLoading, setPcLoading,
    pcLocationName, setPcLocationName,
    pcDetectedCoords, setPcDetectedCoords,
    pcGeoError, setPcGeoError,
    pcShowCityModal, setPcShowCityModal,
    pcCityQuery, setPcCityQuery,
    pcCitySuggestions, setPcCitySuggestions,
    pcCitySearching, pcCitySearchRef, pcFetchLocationRef,
    calMonth, setCalMonth, calData, setCalData,
    calLoading, setCalLoading, calSelectedDay, setCalSelectedDay,
  } = props;
  const API_URL = apiUrl;

    /* ── Panchangam auto-detect helpers ── */
    const pcFetchLocation = async (dateStr?: string) => {
      if (pcLoading) return;
      setPcLoading(true);
      try {
        let lat: number, lon: number, tz: number;
        if (pcDetectedCoords) {
          lat = pcDetectedCoords.lat; lon = pcDetectedCoords.lon; tz = pcDetectedCoords.tz;
        } else if (liveLoc.location) {
          // Phase 1 / PR 3 — reconcile Panchang to the shared
          // useLiveLocation hook. Horary already uses it; before
          // this change Panchang ran its OWN navigator.geolocation
          // call which could resolve differently (the 2026-05-06
          // stress test caught Panchang showing "Could not detect"
          // while Horary showed "Toronto, Canada" in the same
          // session). Now any tab that opens after the hook has
          // a value seeds from the cached location.
          lat = liveLoc.location.latitude;
          lon = liveLoc.location.longitude;
          tz = 0; // Backend auto-resolves timezone from lat/lon
          setPcDetectedCoords({ lat, lon, tz });
          setPcLocationName(liveLoc.location.display);
        } else {
          // No shared cache and no local state — try browser
          // geolocation directly. Do NOT fall back to birth coords.
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
          ).catch(() => null);

          if (!pos) {
            // Geolocation failed — open city selector instead of silent fallback
            setPcGeoError(t("Could not detect location. Please select your city.", "ప్రదేశం గుర్తించలేకపోయాము. దయచేసి మీ నగరం ఎంచుకోండి."));
            setPcShowCityModal(true);
            setPcLoading(false);
            return;
          }

          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          tz = 0; // Backend auto-resolves timezone from lat/lon
          setPcDetectedCoords({ lat, lon, tz });
          // Reverse geocode for display name
          try {
            const geo = await axios.get("https://nominatim.openstreetmap.org/reverse", {
              params: { lat, lon, format: "json", addressdetails: 1, "accept-language": "en" },
              headers: { "User-Agent": "DevAstroAI/1.0" }
            });
            const addr = geo.data?.address || {};
            const city = addr.neighbourhood || addr.suburb || addr.city_district
              || addr.city || addr.town || addr.village || "";
            const country = addr.country || "";
            const displayName = city && country ? `${city}, ${country}` : city || country || `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`;
            setPcLocationName(displayName);
            // PR 3 — push the freshly-resolved location into the
            // shared hook so Horary / Muhurtha / Transit see it
            // without re-querying.
            liveLoc.override({ lat, lon, display: displayName });
          } catch {
            const fallback = `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`;
            setPcLocationName(fallback);
            liveLoc.override({ lat, lon, display: fallback });
          }
        }
        const r = await axios.post(`${API_URL}/panchangam/location`, {
          latitude: lat, longitude: lon, timezone_offset: tz, ...(dateStr ? { date: dateStr } : {}),
        });
        setPcData(r.data);
        // Also load calendar if not loaded
        if (!calData) {
          setCalLoading(true);
          const cm = dateStr ? { year: parseInt(dateStr.split("-")[0]), month: parseInt(dateStr.split("-")[1]) } : calMonth;
          axios.post(`${API_URL}/panchangam/calendar`, { latitude: lat, longitude: lon, timezone_offset: tz, year: cm.year, month: cm.month })
            .then(cr => setCalData(cr.data)).catch(() => setCalData(null)).finally(() => setCalLoading(false));
        }
      } catch { setPcData(null); }
      setPcLoading(false);
    };
    const pcSelectCity = (s: PlaceSuggestion) => {
      const tz = 0; // Backend auto-resolves timezone from lat/lon
      setPcDetectedCoords({ lat: s.lat, lon: s.lon, tz });
      setPcLocationName(s.display);
      setPcShowCityModal(false);
      setPcCityQuery(""); setPcCitySuggestions([]); setPcGeoError("");
      setPcData(null); setCalData(null); // Clear old data → auto-load triggers refetch
      // PR 3 — propagate the manual pick to the shared hook so
      // every other tab (Horary, Muhurtha, Transit) reflects it.
      liveLoc.override({ lat: s.lat, lon: s.lon, display: s.display });
    };
    const pcTryMyLocation = () => {
      setPcGeoError("");
      setPcDetectedCoords(null); // Force re-detect
      setPcShowCityModal(false);
      setPcData(null); // Clear → auto-load triggers pcFetchLocation
    };
    const pcFetchCalendar = (yr: number, mo: number) => {
      if (!pcDetectedCoords) return;
      setCalLoading(true); setCalData(null);
      axios.post(`${API_URL}/panchangam/calendar`, { latitude: pcDetectedCoords.lat, longitude: pcDetectedCoords.lon, timezone_offset: pcDetectedCoords.tz, year: yr, month: mo })
        .then(r => setCalData(r.data)).catch(() => setCalData(null)).finally(() => setCalLoading(false));
    };
    const handleDayClick = (dateStr: string) => {
      if (calSelectedDay === dateStr) { setCalSelectedDay(null); return; }
      setCalSelectedDay(dateStr);
      if (!pcDetectedCoords) return;
      setPcLoading(true);
      axios.post(`${API_URL}/panchangam/location`, { latitude: pcDetectedCoords.lat, longitude: pcDetectedCoords.lon, timezone_offset: pcDetectedCoords.tz, date: dateStr })
        .then(r => setPcData(r.data)).catch(() => {}).finally(() => setPcLoading(false));
    };
    const prevMonth = () => {
      const prev = calMonth.month === 1 ? { year: calMonth.year - 1, month: 12 } : { year: calMonth.year, month: calMonth.month - 1 };
      setCalMonth(prev); setCalSelectedDay(null); pcFetchCalendar(prev.year, prev.month);
    };
    const nextMonth = () => {
      const next = calMonth.month === 12 ? { year: calMonth.year + 1, month: 1 } : { year: calMonth.year, month: calMonth.month + 1 };
      setCalMonth(next); setCalSelectedDay(null); pcFetchCalendar(next.year, next.month);
    };
    // PR A1.3-fix-24 — auto-load moved to a top-level useEffect.
    // Expose the local fn via a ref so the effect can call it.
    // Writing to a ref during render is the canonical React
    // workaround for "I need an effect to call a closure-bound
    // function". The state-setter side-effect that used to live
    // here now happens cleanly post-commit.
    pcFetchLocationRef.current = pcFetchLocation;

    // Weekday headers — lang aware. EN shows Sun-Sat, te/te_en shows Telugu shorts.
    const weekdayHeadersEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekdayHeadersTe = ["ఆ", "సో", "మం", "బు", "గు", "శు", "శ"];
    const weekdayHeaders   = lang === "en" ? weekdayHeadersEn : weekdayHeadersTe;

    // Frontend mappers for values backend returns only in Telugu.
    const AYANA_EN: Record<string, string> = {
      "ఉత్తరాయణం": "Uttarayana",
      "దక్షిణాయనం": "Dakshinayana",
    };
    // 60-year Samvatsara cycle — must match backend
    // services/telugu_terms.py → TELUGU_YEARS (index 0 = "ప్రభవ").
    const SAMVATSARA_EN: Record<string, string> = {
      "ప్రభవ": "Prabhava",         "విభవ": "Vibhava",            "శుక్ల": "Shukla",
      "ప్రమోదూత": "Pramoda",        "ప్రజాపతి": "Prajapati",      "ఆంగీరస": "Angirasa",
      "శ్రీముఖ": "Shrimukha",       "భావ": "Bhava",               "యువ": "Yuva",
      "ధాత": "Dhata",               "ఈశ్వర": "Ishvara",           "వహుధాన్య": "Bahudhanya",
      "ప్రమాది": "Pramadi",         "విక్రమ": "Vikrama",           "వృష": "Vrisha",
      "చిత్రభాను": "Chitrabhanu",    "స్వభాను": "Svabhanu",        "తారణ": "Tarana",
      "పార్థివ": "Parthiva",         "వ్యయ": "Vyaya",              "సర్వజిత్": "Sarvajit",
      "సర్వధారి": "Sarvadhari",      "విరోధి": "Virodhi",          "వికృతి": "Vikriti",
      "ఖర": "Khara",                "నందన": "Nandana",            "విజయ": "Vijaya",
      "జయ": "Jaya",                 "మన్మథ": "Manmatha",           "దుర్ముఖి": "Durmukhi",
      "హేవిళంబి": "Hevilambi",      "విళంబి": "Vilambi",          "వికారి": "Vikari",
      "శార్వరి": "Sharvari",         "ప్లవ": "Plava",              "శుభకృత్": "Shubhakrit",
      "శోభకృత్": "Shobhakrit",      "క్రోధి": "Krodhi",           "విశ్వావసు": "Vishvavasu",
      "పరాభవ": "Parabhava",         "ప్లవంగ": "Plavanga",         "కీలక": "Kilaka",
      "సౌమ్య": "Saumya",            "సాధారణ": "Sadharana",         "విరోధికృత్": "Virodhikrit",
      "పరీధావి": "Paridhavi",       "ప్రమాదీచ": "Pramadicha",     "ఆనంద": "Ananda",
      "రాక్షస": "Rakshasa",         "నల": "Nala",                 "పింగళ": "Pingala",
      "కాళయుక్తి": "Kalayukti",     "సిద్ధార్థి": "Siddharthi",   "రౌద్ర": "Raudra",
      "దుర్మతి": "Durmati",         "దుందుభి": "Dundubhi",         "రుధిరోద్గారి": "Rudhirodgari",
      "రక్తాక్షి": "Raktakshi",     "క్రోధన": "Krodhana",          "అక్షయ": "Akshaya",
    };
    // PR A1.2a — backend now sends samvatsara_en directly; prefer
    // it over the frontend lookup. Falls back to the local map for
    // cached/older responses.
    const samvatsaraValue = (teName: string | null | undefined): string => {
      if (!teName) return "";
      if (lang === "en") {
        return (pcData?.samvatsara_en as string | undefined)
          ?? SAMVATSARA_EN[teName] ?? teName;
      }
      return teName;
    };
    // Returns "Parabhava · the defeat / reversal of established order" for tooltips.
    const samvatsaraSubtitle = (): string => {
      const en = pcData?.samvatsara_en as string | undefined;
      const meaning = pcData?.samvatsara_meaning as string | undefined;
      const cycle = pcData?.samvatsara_cycle as number | undefined;
      if (!en) return "";
      const parts = [];
      if (cycle != null) parts.push(`#${cycle}/60`);
      if (meaning) parts.push(meaning);
      return parts.join(" · ");
    };
    const RUTU_EN: Record<string, string> = {
      "వసంత ఋతువు":   "Vasanta (Spring)",
      "గ్రీష్మ ఋతువు": "Grishma (Summer)",
      "వర్ష ఋతువు":   "Varsha (Monsoon)",
      "శరద్ ఋతువు":   "Sharad (Autumn)",
      "హేమంత ఋతువు":  "Hemanta (Pre-winter)",
      "శిశిర ఋతువు":  "Shishira (Winter)",
    };
    const SPECIAL_EN: Record<string, string> = {
      "పౌర్ణమి":    "Purnima",
      "అమావాస్య":   "Amavasya",
      "ఏకాదశి":    "Ekadashi",
    };
    const specialClassOf = (s: string | null | undefined): string => {
      if (!s) return "";
      if (s === "పౌర్ణమి" || s === "Purnima")  return "purnima";
      if (s === "అమావాస్య" || s === "Amavasya") return "amavasya";
      if (s === "ఏకాదశి"  || s === "Ekadashi") return "ekadashi";
      return "";
    };

    // tithi_short comes back Telugu like "శు·3" / "కృ·12" / "పౌర్ణమి"
    // — make a small EN-mode equivalent so the calendar doesn't
    // show Telugu when the user is in EN.
    const tithiShortEn = (ts: string, tithiNum?: number) => {
      if (!ts) return "";
      if (ts === "పౌర్ణమి") return "Purnima";
      if (ts === "అమావాస్య") return "Amavasya";
      // శు·N → Shu·N, కృ·N → Kr·N
      if (ts.startsWith("శు·")) return `Shu·${ts.slice(2)}`;
      if (ts.startsWith("కృ·")) return `Kr·${ts.slice(2)}`;
      // Fallback: if tithi_num provided, build it ourselves.
      if (tithiNum) {
        const idx = ((tithiNum - 1) % 15) + 1;
        return tithiNum <= 15 ? `Shu·${idx}` : `Kr·${idx}`;
      }
      return ts;
    };

    const calDays = calData?.days ?? [];
    const firstWeekday = ((calDays[0]?.weekday ?? 0) + 1) % 7; // Convert Mon=0 → Sun=0
    const paddedDays: (any | null)[] = [...Array(firstWeekday).fill(null), ...calDays];
    while (paddedDays.length % 7 !== 0) paddedDays.push(null);

    // Formatted selected date subtitle ("Sunday, April 19, 2026")
    const selectedIso = calSelectedDay || new Date().toISOString().slice(0, 10);
    const selectedFmt = (() => {
      try {
        const d = new Date(selectedIso + "T00:00:00");
        return d.toLocaleDateString(lang === "en" ? "en-US" : "en-IN", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        });
      } catch { return selectedIso; }
    })();
    // PR A1.2c — viewing future/past date logic. The current-hora
    // card and any "right now" choghadiya highlighting only make
    // sense when the selected date IS today; for any other date
    // we hide live-only displays and surface a "Back to today"
    // button so the astrologer can return in one click.
    const todayIso = new Date().toISOString().slice(0, 10);
    const isViewingToday = selectedIso === todayIso;
    const goToToday = () => {
      setCalSelectedDay(null);
      if (pcDetectedCoords) {
        setPcLoading(true);
        axios.post(`${API_URL}/panchangam/location`, {
          latitude: pcDetectedCoords.lat,
          longitude: pcDetectedCoords.lon,
          timezone_offset: pcDetectedCoords.tz,
        }).then(r => setPcData(r.data)).catch(() => {}).finally(() => setPcLoading(false));
      }
    };
    // Quick-jump strip: today + next 6 days. Lets the astrologer
    // scrub a week ahead without scrolling the calendar grid.
    const next7Days = (() => {
      const out: { iso: string; weekday: string; day: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        out.push({
          iso: d.toISOString().slice(0, 10),
          weekday: d.toLocaleDateString(lang === "en" ? "en-US" : "en-IN", { weekday: "short" }),
          day: d.getDate(),
        });
      }
      return out;
    })();

    // Masa header secondary — only show in non-EN modes
    const masaHeaderSub = lang === "en"
      ? (calData?.masa_en ?? "")
      : (calData?.masa_te ?? calData?.masa_en ?? "");

    return (
    <div className="tab-content">
      {/* Loading */}
      {pcLoading && !pcData && (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          {t("Detecting location…", "ప్రదేశం గుర్తిస్తోంది…")}
        </div>
      )}

      {pcData && (
        <>
          {/* ── 1. Centred page hero ── */}
          <header className="pc2-header">
            <div className="pc2-loc-chip" onClick={() => setPcShowCityModal(true)}>
              <MapPin size={12} strokeWidth={1.8} />
              <span>{pcLocationName || t("Detected location", "గుర్తించిన ప్రదేశం")}</span>
              {pcData.timezone_name && (
                <span style={{ opacity: 0.6, fontSize: 10, letterSpacing: "0.04em", textTransform: "none" as const }}>
                  ({pcData.timezone_name})
                </span>
              )}
              {/* PR A1.2b — show lat/lon for transparency. Astrologer can verify
                  the engine is computing for the right point. */}
              {pcDetectedCoords && (
                <span style={{ opacity: 0.55, fontSize: 10, fontFamily: "'JetBrains Mono', ui-monospace, monospace", letterSpacing: 0, textTransform: "none" as const }}>
                  {pcDetectedCoords.lat.toFixed(2)}°, {pcDetectedCoords.lon.toFixed(2)}°
                </span>
              )}
            </div>
            <h1 className="pc2-title">
              {t("Panchang", "పంచాంగం")}
            </h1>
            <div className="pc2-subtitle">
              <span>{selectedFmt}</span>
              {pcData.samvatsara_te && (
                <>
                  <span className="dot" />
                  <span title={samvatsaraSubtitle()}>
                    Samvat {samvatsaraValue(pcData.samvatsara_te)}
                    {pcData?.samvatsara_cycle != null && (
                      <span style={{ color: "var(--muted)", marginLeft: 6, fontSize: 11 }}>
                        #{pcData.samvatsara_cycle}/60
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
            {/* PR A1.2a — show meaning underneath as muted explainer */}
            {pcData?.samvatsara_meaning && (
              <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", marginTop: 4 }}>
                “{pcData.samvatsara_meaning}”
              </div>
            )}
            {/* PR A1.2c — viewing-future banner + Back to today.
                All values below (sunrise/sunset, kalams, choghadiya,
                durmuhurtha, varjyam) are computed for the SELECTED
                date, not "right now". Make that explicit so the
                astrologer doesn't mistake them for live values. */}
            {!isViewingToday && (
              <div className="pc2-future-banner">
                <span>
                  {t(
                    "All values below are computed for this selected date — not live now.",
                    "క్రింది అన్ని విలువలు ఎంచుకున్న తేదీ కోసం లెక్కించబడ్డాయి — ఇప్పటి ప్రత్యక్ష విలువలు కావు."
                  )}
                </span>
                <button onClick={goToToday} className="pc2-back-today-btn">
                  ← {t("Back to today", "నేటికి వెళ్ళండి")}
                </button>
              </div>
            )}
            {/* PR A1.2c — quick-jump strip: today + next 6 days. */}
            <div className="pc2-quickjump-strip" role="tablist">
              {next7Days.map((d) => {
                const isActive = selectedIso === d.iso;
                const isToday = d.iso === todayIso;
                return (
                  <button
                    key={d.iso}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      if (isToday) {
                        goToToday();
                      } else {
                        handleDayClick(d.iso);
                      }
                    }}
                    className={`pc2-quickjump-day${isActive ? " is-active" : ""}${isToday ? " is-today" : ""}`}
                  >
                    <span className="pc2-quickjump-weekday">{d.weekday}</span>
                    <span className="pc2-quickjump-num">{d.day}</span>
                    {isToday && <span className="pc2-quickjump-marker">●</span>}
                  </button>
                );
              })}
            </div>
          </header>

          {/* ── 2. Monthly calendar ── */}
          <div className="pc-section">
            <div className="pc-cal-nav">
              <button onClick={prevMonth}><ChevronLeft size={16} /></button>
              <div style={{ textAlign: "center" }}>
                <span className="pc-cal-title">
                  {new Date(calMonth.year, calMonth.month - 1).toLocaleString(lang === "en" ? "en-US" : "en-IN", { month: "long", year: "numeric" })}
                </span>
                {masaHeaderSub && <span className="pc-cal-subtitle">{masaHeaderSub}</span>}
              </div>
              <button onClick={nextMonth}><ChevronRight size={16} /></button>
            </div>
            {calLoading ? (
              <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--muted)", fontSize: 12 }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: 6 }} />
                {t("Loading…", "లోడ్ అవుతోంది…")}
              </div>
            ) : calDays.length > 0 && (
              <>
                <div className="pc-cal-grid">
                  {weekdayHeaders.map((d, i) => (
                    <div key={`${d}-${i}`} className={`pc2-cal-weekday${i === 0 ? " sun" : ""}`}>{d}</div>
                  ))}
                  {paddedDays.map((day, idx) => {
                    if (!day) return <div key={idx} className="pc-cal-cell empty" />;
                    const specialEn   = day.special ? (SPECIAL_EN[day.special] ?? day.special) : null;
                    const specialText = lang === "en" ? specialEn : day.special;
                    const specialClass = specialClassOf(day.special);
                    const tithiText = lang === "en" ? tithiShortEn(day.tithi_short, day.tithi_num) : day.tithi_short;
                    const naksText  = lang === "en"
                      ? (day.nakshatra_en ? day.nakshatra_en.slice(0, 4) : (day.nakshatra_short || ""))
                      : (day.nakshatra_short || "");
                    const isToday    = !!day.is_today;
                    const isSelected = calSelectedDay === day.date;
                    return (
                      <div key={day.date}
                        className={`pc-cal-cell${isToday ? " pc2-cal-cell today" : ""}${isSelected ? " pc2-cal-cell selected" : ""}`}
                        onClick={() => handleDayClick(day.date)}
                      >
                        <div className="pc-cal-date-row">
                          <span className="pc-cal-day-num">{day.day}</span>
                          <span className="pc-cal-moon">{day.moon_phase_icon}</span>
                        </div>
                        <div className="pc2-cal-tithi">{tithiText}</div>
                        <div className="pc2-cal-nakshatra">{naksText}</div>
                        {specialText && <div className={`pc2-cal-special ${specialClass}`}>{specialText}</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="pc2-cal-legend">
                  <span><i style={{ background: "#fbbf24" }} /> {t("Purnima / Amavasya", "పౌర్ణమి / అమావాస్య")}</span>
                  <span><i style={{ background: "#34d399" }} /> {t("Ekadashi", "ఏకాదశి")}</span>
                  <span><i style={{ background: "rgba(201,169,110,0.7)" }} /> {t("Today", "నేడు")}</span>
                </div>
              </>
            )}
          </div>

          {/* ── 3. Era info strip: Samvatsara · Ayana · Rutu · Masa · Shaka · Vikram ──
              Phase 4 / PR 9 — stress-test "card abuse" (C):
              previously these 6 facts each got their own card,
              eating two rows of vertical space for one line of
              info each. Now rendered as a single horizontal
              info strip with hover tooltips for the meanings.
              One line on desktop, wraps gracefully on mobile. */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 14,
              padding: "10px 14px",
              marginTop: 8,
              background: "rgba(201,169,110,0.04)",
              border: "0.5px solid rgba(201,169,110,0.15)",
              borderRadius: 10,
              fontSize: 12,
            }}
          >
            {(() => {
              const ayanaEn = pcData.ayana_te ? (AYANA_EN[pcData.ayana_te] ?? pcData.ayana_te) : "";
              const rutuEn  = pcData.rutu_te  ? (RUTU_EN[pcData.rutu_te]   ?? pcData.rutu_te)  : "";
              const items = [
                { label: "Samvatsara", value: samvatsaraValue(pcData.samvatsara_te), tip: lang === "en" ? "60-year cycle" : "60 సంవత్సరాల చక్రం" },
                { label: "Ayana",      value: lang === "en" ? ayanaEn : (pcData.ayana_te ?? ayanaEn), tip: lang === "en" ? "Solar direction" : "సూర్య ప్రయాణం" },
                { label: "Rutu",       value: lang === "en" ? rutuEn  : (pcData.rutu_te  ?? rutuEn),  tip: lang === "en" ? "Season" : "ఋతువు" },
                { label: "Masa",       value: lang === "en" ? (pcData.masa_en ?? pcData.masa_te ?? "") : (pcData.masa_te ?? pcData.masa_en ?? ""), tip: lang === "en" ? "Lunar month" : "చాంద్ర మాసం" },
                { label: "Shaka",      value: pcData.shaka_year ? String(pcData.shaka_year) : "", tip: lang === "en" ? "Shaka era" : "శక సంవత్సరం" },
                { label: "Vikram",     value: pcData.vikram_samvat ? String(pcData.vikram_samvat) : "", tip: lang === "en" ? "Vikram Samvat" : "విక్రమ సంవత్" },
              ].filter(x => x.value);
              return items.map((it, idx) => (
                <React.Fragment key={it.label}>
                  {idx > 0 && (
                    <span aria-hidden style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(201,169,110,0.35)" }} />
                  )}
                  <span title={it.tip} style={{ display: "inline-flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{it.label}</span>
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>{it.value}</span>
                  </span>
                </React.Fragment>
              ));
            })()}
          </div>

          {/* ── 4. Tithi / Nakshatra / Yoga / Karana element cards ── */}
          {/* PR A1.2c-final: Choghadiya donut removed — the "now"
              needle made it misleading on non-today dates and the
              textual choghadiya list below carries the same data
              more legibly. */}
          <div className="pc2-elements-grid">
              {/* Tithi — primary language-aware + moon illum */}
              <div className="pc2-element-card el-tithi">
                <div className="pc2-element-head">
                  <div className="pc2-element-icon-wrap"><Moon size={18} strokeWidth={1.6} /></div>
                  <div className="pc2-element-meta">
                    <div className="pc2-element-eyebrow">{t("Tithi", "తిథి")}</div>
                    {pcData.tithi_ends_at && (
                      <div className="pc2-element-until-inline">{t("until", "వరకు")} {stripSeconds(pcData.tithi_ends_at)}</div>
                    )}
                  </div>
                </div>
                <div className="pc2-element-primary">
                  {lang === "en" ? (pcData.tithi_en ?? pcData.tithi_te) : (pcData.tithi_te ?? pcData.tithi_en)}
                </div>
                {lang !== "en" && pcData.tithi_en && (
                  <div className="pc2-element-secondary">{pcData.tithi_en}</div>
                )}
                {/* PR A1.2c — was showing moon_illum_pct labeled as
                    tithi-progress; corrected to actual tithi-elapsed
                    fraction. Moon illumination retained as smaller
                    muted line. */}
                {pcData.tithi_progress_pct != null && (
                  <div className="pc2-moon-illum-row" title={`${pcData.tithi_progress_pct}% of current tithi elapsed`}>
                    <div className="pc2-moon-illum-bar">
                      <div className="pc2-moon-illum-fill" style={{ width: `${pcData.tithi_progress_pct}%` }} />
                    </div>
                    <span className="pc2-moon-illum-pct">{pcData.tithi_progress_pct}%</span>
                  </div>
                )}
                {pcData.moon_illum_pct != null && (
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, opacity: 0.7 }}>
                    {t(`Moon ${pcData.moon_illum_pct}% illuminated`, `చంద్రుడు ${pcData.moon_illum_pct}% ప్రకాశవంతం`)}
                  </div>
                )}
              </div>

              {/* Nakshatra */}
              <div className="pc2-element-card el-nakshatra">
                <div className="pc2-element-head">
                  <div className="pc2-element-icon-wrap"><Star size={18} strokeWidth={1.6} /></div>
                  <div className="pc2-element-meta">
                    <div className="pc2-element-eyebrow">{t("Nakshatra", "నక్షత్రం")}</div>
                    {pcData.nakshatra_ends_at && (
                      <div className="pc2-element-until-inline">{t("until", "వరకు")} {pcData.nakshatra_ends_at}</div>
                    )}
                  </div>
                </div>
                <div className="pc2-element-primary">
                  {lang === "en" ? (pcData.nakshatra_en ?? pcData.nakshatra_te) : (pcData.nakshatra_te ?? pcData.nakshatra_en)}
                  {pcData.nakshatra_pada && <span style={{ fontSize: 14, color: "var(--muted)", marginLeft: 6, fontStyle: "italic" }}>· Pada {pcData.nakshatra_pada}</span>}
                </div>
                {lang !== "en" && pcData.nakshatra_en && (
                  <div className="pc2-element-secondary">{pcData.nakshatra_en}</div>
                )}
              </div>

              {/* Yoga — PR A1.2b: tint based on yoga_quality
                  from backend so malefic yogas (Atiganda etc.) show
                  red instead of inheriting the generic green pill. */}
              <div className={`pc2-element-card el-yoga${pcData.yoga_quality === "inauspicious" ? " is-malefic" : ""}`}>
                <div className="pc2-element-head">
                  <div className="pc2-element-icon-wrap">
                    {pcData.yoga_quality === "inauspicious"
                      ? <TriangleAlert size={18} strokeWidth={1.6} />
                      : <Sparkles size={18} strokeWidth={1.6} />}
                  </div>
                  <div className="pc2-element-meta">
                    <div className="pc2-element-eyebrow">
                      {t("Yoga", "యోగం")}
                      {pcData.yoga_quality === "inauspicious" && (
                        <span style={{ marginLeft: 6, fontSize: 9, color: "#f87171", letterSpacing: "0.08em" }}>
                          · {t("INAUSPICIOUS", "అశుభ")}
                        </span>
                      )}
                    </div>
                    {pcData.yoga_ends_at && (
                      <div className="pc2-element-until-inline">{t("until", "వరకు")} {pcData.yoga_ends_at}</div>
                    )}
                  </div>
                </div>
                <div className="pc2-element-primary">
                  {lang === "en" ? (pcData.yoga_en ?? pcData.yoga_te) : (pcData.yoga_te ?? pcData.yoga_en)}
                </div>
                {lang !== "en" && pcData.yoga_en && (
                  <div className="pc2-element-secondary">{pcData.yoga_en}</div>
                )}
              </div>

              {/* Karana — note backend flips: `karana` = English, `karana_te` = Telugu */}
              <div className="pc2-element-card el-karana">
                <div className="pc2-element-head">
                  <div className="pc2-element-icon-wrap"><HandHeart size={18} strokeWidth={1.6} /></div>
                  <div className="pc2-element-meta">
                    <div className="pc2-element-eyebrow">{t("Karana", "కరణం")}</div>
                    {pcData.karana_ends_at && (
                      <div className="pc2-element-until-inline">{t("until", "వరకు")} {pcData.karana_ends_at}</div>
                    )}
                  </div>
                </div>
                <div className="pc2-element-primary">
                  {lang === "en" ? (pcData.karana ?? pcData.karana_te) : (pcData.karana_te ?? pcData.karana)}
                </div>
                {lang !== "en" && pcData.karana && (
                  <div className="pc2-element-secondary">{pcData.karana}</div>
                )}
                {pcData.karana2 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "0.5px solid rgba(255,255,255,0.06)", display: "flex", gap: 6, alignItems: "baseline" }}>
                    <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--muted)", fontWeight: 600 }}>then</span>
                    <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 15, color: "var(--text)", letterSpacing: "-0.01em" }}>
                      {lang === "en" ? (pcData.karana2 ?? pcData.karana2_te) : (pcData.karana2_te ?? pcData.karana2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

          {/* ── 5. Current Hora hero ──
              PR A1.2c: hora changes every ~1 hour and is intrinsically
              a "right now" concept. Hide when viewing any non-today
              date because the value is meaningless out of context. */}
          {pcData.current_hora && isViewingToday && (() => {
            const HORA_SYMBOLS: Record<string, string> = {
              Sun: "\u2609", Moon: "\u263D", Mars: "\u2642", Mercury: "\u263F",
              Jupiter: "\u2643", Venus: "\u2640", Saturn: "\u2644"
            };
            const lord = pcData.current_hora.lord;
            const lordColor = PLANET_COLORS[lord] ?? "#c9a96e";
            return (
              <div className="pc2-hora-hero" style={{ color: lordColor }}>
                <div className="pc2-hora-glyph">{HORA_SYMBOLS[lord] || "\u2609"}</div>
                <div className="pc2-hora-body">
                  <div className="pc2-hora-label">
                    {t("Current Hora", "ప్రస్తుత హోర")}
                    {pcData.current_hora.is_auspicious && (
                      <span className="pc2-hora-ausp" style={{ marginLeft: 8 }}>
                        {t("Auspicious", "శుభ")}
                      </span>
                    )}
                  </div>
                  <div className="pc2-hora-lord">{lord}</div>
                </div>
                <span className="pc2-hora-time">{stripSeconds(pcData.current_hora.start)} – {stripSeconds(pcData.current_hora.end)}</span>
              </div>
            );
          })()}

          {/* ── 6. Celestial 2×2 + Auspicious/Avoid panels ── */}
          <div className="pc-half-grid">
            {/* LEFT: Sun/Moon times */}
            <div className="pc2-celestial-grid">
              {[
                // Phase 7 / PR 19 — strip backend seconds (`HH:MM:SS` → `HH:MM`).
                // Seconds aren't actionable for sunrise/moon timings.
                { Icon: Sunrise,  color: "#fbbf24", label: t("Sunrise", "సూర్యోదయం"),   time: stripSeconds(pcData.sunrise),  warm: true  },
                { Icon: Sunset,   color: "#fbbf24", label: t("Sunset", "సూర్యాస్తమయం"), time: stripSeconds(pcData.sunset),   warm: true  },
                { Icon: Moon,     color: "#93c5fd", label: t("Moonrise", "చంద్రోదయం"),  time: stripSeconds(pcData.moonrise), warm: false },
                { Icon: MoonStar, color: "#93c5fd", label: t("Moonset", "చంద్రాస్తమయం"), time: stripSeconds(pcData.moonset),  warm: false },
              ].map(c => (
                <div key={c.label} className={`pc2-celestial-card ${c.warm ? "warm" : "cool"}`} style={{ color: c.color }}>
                  <div className="pc2-celestial-icon"><c.Icon size={16} strokeWidth={1.8} /></div>
                  <div className="pc2-celestial-body">
                    <span className="pc2-celestial-label">{c.label}</span>
                    <span className={`pc2-celestial-time${!c.time ? " dim" : ""}`}>
                      {c.time || t("no rise today", "నేడు లేదు")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT: Auspicious / Avoid panels */}
            <div className="pc2-times-wrap">
              <div className="pc2-times-panel good">
                <div className="pc2-times-panel-title">
                  <Sparkles size={12} strokeWidth={2} />
                  {t("Auspicious", "శుభ సమయాలు")}
                </div>
                {pcData.brahma_muhurta && (
                  <div className="pc2-time-row highlight">
                    <div className="pc2-time-row-icon" style={{ background: "rgba(201,169,110,0.15)", color: "#c9a96e" }}>
                      <Sparkles size={14} strokeWidth={1.8} />
                    </div>
                    <div className="pc2-time-row-body">
                      <div className="pc2-time-row-label">{t("Brahma Muhurta", "బ్రహ్మ ముహూర్తం")}</div>
                      <div className="pc2-time-row-sub">{t("Best for meditation & study", "ధ్యానం & అధ్యయనానికి ఉత్తమం")}</div>
                    </div>
                    <span className="pc2-time-row-value">{stripSeconds(pcData.brahma_muhurta.start)} – {stripSeconds(pcData.brahma_muhurta.end)}</span>
                  </div>
                )}
                {pcData.abhijit_muhurtha?.valid && (
                  <div className="pc2-time-row">
                    <div className="pc2-time-row-icon" style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
                      <Crown size={14} strokeWidth={1.8} />
                    </div>
                    <div className="pc2-time-row-body">
                      <div className="pc2-time-row-label">{t("Abhijit Muhurtha", "అభిజిత్ ముహూర్తం")}</div>
                      <div className="pc2-time-row-sub">{t("Universally auspicious", "సార్వత్రికంగా శుభ")}</div>
                    </div>
                    <span className="pc2-time-row-value">{stripSeconds(pcData.abhijit_muhurtha.start)} – {stripSeconds(pcData.abhijit_muhurtha.end)}</span>
                  </div>
                )}
                {/* PR A1.2c — Amrit Kala (auspicious 1h36m window from Moon's nakshatra). */}
                {pcData.amrit_kala && (
                  <div className="pc2-time-row">
                    <div className="pc2-time-row-icon" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>
                      <Sparkles size={14} strokeWidth={1.8} />
                    </div>
                    <div className="pc2-time-row-body">
                      <div className="pc2-time-row-label">{t("Amrit Kala", "అమృత కాలం")}</div>
                      <div className="pc2-time-row-sub">{t("Highly auspicious nakshatra-derived window", "నక్షత్రం నుండి అత్యంత శుభ సమయం")}</div>
                    </div>
                    <span className="pc2-time-row-value">{stripSeconds(pcData.amrit_kala)}</span>
                  </div>
                )}
              </div>

              <div className="pc2-times-panel avoid">
                <div className="pc2-times-panel-title">
                  <TriangleAlert size={12} strokeWidth={2} />
                  {t("Avoid", "నివారించండి")}
                </div>
                <div className="pc2-time-row">
                  <div className="pc2-time-row-icon" style={{ background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
                    <TriangleAlert size={14} strokeWidth={1.8} />
                  </div>
                  <div className="pc2-time-row-body">
                    <div className="pc2-time-row-label">Rahu Kalam</div>
                    <div className="pc2-time-row-sub">{t("Avoid new ventures", "కొత్త పనులు నివారించండి")}</div>
                  </div>
                  <span className="pc2-time-row-value">{stripSeconds(pcData.rahu_kalam)}</span>
                </div>
                <div className="pc2-time-row">
                  <div className="pc2-time-row-icon" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                    <Ban size={14} strokeWidth={1.8} />
                  </div>
                  <div className="pc2-time-row-body">
                    <div className="pc2-time-row-label">Yamagandam</div>
                  </div>
                  <span className="pc2-time-row-value">{stripSeconds(pcData.yamagandam)}</span>
                </div>
                <div className="pc2-time-row">
                  <div className="pc2-time-row-icon" style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>
                    <CircleDashed size={14} strokeWidth={1.8} />
                  </div>
                  <div className="pc2-time-row-body">
                    <div className="pc2-time-row-label">Gulika Kalam</div>
                  </div>
                  <span className="pc2-time-row-value">{stripSeconds(pcData.gulika_kalam)}</span>
                </div>
                {pcData.durmuhurtha?.map((dm: any, i: number) => (
                  <div key={i} className="pc2-time-row">
                    <div className="pc2-time-row-icon" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                      <Hourglass size={14} strokeWidth={1.8} />
                    </div>
                    <div className="pc2-time-row-body">
                      <div className="pc2-time-row-label">{t(`Durmuhurtha ${i + 1}`, `దుర్ముహూర్తం ${i + 1}`)}</div>
                    </div>
                    <span className="pc2-time-row-value">{stripSeconds(dm.start)} – {stripSeconds(dm.end)}</span>
                  </div>
                ))}
                {/* PR A1.2c — Varjyam (avoid 1h36m window from Moon's nakshatra). */}
                {pcData.varjyam && (
                  <div className="pc2-time-row">
                    <div className="pc2-time-row-icon" style={{ background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
                      <Ban size={14} strokeWidth={1.8} />
                    </div>
                    <div className="pc2-time-row-body">
                      <div className="pc2-time-row-label">{t("Varjyam", "వర్జ్యం")}</div>
                      <div className="pc2-time-row-sub">{t("Avoid important actions", "ముఖ్యమైన పనులు నివారించండి")}</div>
                    </div>
                    <span className="pc2-time-row-value">{stripSeconds(pcData.varjyam)}</span>
                  </div>
                )}
                {/* PR A1.2c — Night Rahu/Yama/Gulika (less commonly used but valuable). */}
                {pcData.rahu_kalam_night && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: "pointer", fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>
                      {t("▸ Night kalam windows (sunset → next sunrise)", "▸ రాత్రి కాలం (సూర్యాస్తం → తదుపరి సూర్యోదయం)")}
                    </summary>
                    <div className="pc2-time-row" style={{ marginTop: 4 }}>
                      <div className="pc2-time-row-icon" style={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}>
                        <TriangleAlert size={14} strokeWidth={1.8} />
                      </div>
                      <div className="pc2-time-row-body">
                        <div className="pc2-time-row-label">{t("Night Rahu Kalam", "రాత్రి రాహుకాలం")}</div>
                      </div>
                      <span className="pc2-time-row-value">{pcData.rahu_kalam_night}</span>
                    </div>
                    <div className="pc2-time-row">
                      <div className="pc2-time-row-icon" style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24" }}>
                        <Ban size={14} strokeWidth={1.8} />
                      </div>
                      <div className="pc2-time-row-body">
                        <div className="pc2-time-row-label">{t("Night Yamagandam", "రాత్రి యమగండం")}</div>
                      </div>
                      <span className="pc2-time-row-value">{pcData.yamagandam_night}</span>
                    </div>
                    <div className="pc2-time-row">
                      <div className="pc2-time-row-icon" style={{ background: "rgba(167,139,250,0.08)", color: "#a78bfa" }}>
                        <CircleDashed size={14} strokeWidth={1.8} />
                      </div>
                      <div className="pc2-time-row-body">
                        <div className="pc2-time-row-label">{t("Night Gulika", "రాత్రి గులిక")}</div>
                      </div>
                      <span className="pc2-time-row-value">{stripSeconds(pcData.gulika_kalam_night)}</span>
                    </div>
                  </details>
                )}
                {/* PR A1.2c — Panchaka + Tithi Shunya doshas (advisory tags). */}
                {(pcData.panchaka_active || pcData.tithi_shunya_active) && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {pcData.panchaka_active && (
                      <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: "rgba(248,113,113,0.12)", color: "#f87171", border: "0.5px solid rgba(248,113,113,0.3)", letterSpacing: "0.04em" }}
                        title={t("Moon in one of the 5 Panchaka nakshatras (Dhanishtha 2nd half through Revati). Avoid travel, ceremonies.", "")}>
                        {t("PANCHAKA DOSHA", "పంచక దోషం")}
                      </span>
                    )}
                    {pcData.tithi_shunya_active && (
                      <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "0.5px solid rgba(251,191,36,0.3)", letterSpacing: "0.04em" }}
                        title={t("Tithi shunya (void) for this lunar month. Activities yield reduced or no result.", "")}>
                        {t("TITHI SHUNYA", "తిథి శూన్యం")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 7. Day & Night Choghadiya ── */}
          {pcData.choghadiya && pcData.choghadiya.length > 0 && (
            <div className="pc-section">
              <div className="pc2-section-title">{t("Choghadiya", "చోఘడియ")}</div>
              {/* Phase 7 / PR 20 — colour-quality legend.
                  Dots inside each row had no visible legend
                  before this PR; live test confirmed users can't
                  decode green/red/purple at a glance. Kept tiny
                  and right-aligned so it doesn't compete with
                  the row content. */}
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: 8,
                  fontSize: 10,
                  color: "var(--muted)",
                }}
                aria-label={t("Choghadiya quality legend", "చోఘడియ నాణ్యత చిహ్నాలు")}
              >
                {[
                  { color: "#34d399", label: t("Auspicious", "శుభ") },
                  { color: "#f87171", label: t("Inauspicious", "అశుభ") },
                  { color: "#a78bfa", label: t("Neutral", "తటస్థ") },
                ].map(item => (
                  <span key={item.label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                    {item.label}
                  </span>
                ))}
              </div>
              <div className="pc-half-grid">
                {([
                  { isDay: true,  color: "#fbbf24", title: t("Day", "పగలు"),  sub: t("Sunrise", "సూర్యోదయం"), subTime: stripSeconds(pcData.sunrise), Icon: Sun },
                  { isDay: false, color: "#93c5fd", title: t("Night", "రాత్రి"), sub: t("Sunset", "సూర్యాస్తమయం"), subTime: stripSeconds(pcData.sunset),  Icon: Moon },
                ] as const).map(section => (
                  <div key={section.isDay ? "day" : "night"}>
                    <div className="pc2-chog-head">
                      <span className="pc2-chog-head-title" style={{ color: section.color }}>
                        <section.Icon size={13} strokeWidth={1.8} />
                        {section.title}
                      </span>
                      <span className="pc2-chog-head-sub">{section.sub} {section.subTime}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {pcData.choghadiya.filter((c: any) => c.is_day === section.isDay).map((c: any, i: number) => {
                        const qColor = c.quality === "auspicious" ? "#34d399" : c.quality === "inauspicious" ? "#f87171" : "#a78bfa";
                        // Phase 4 / PR 9 — accessible legend for the
                        // colored dot. Stress-test #11: dots had no
                        // visible legend; #10: a malefic-active row
                        // turned the whole row red so the dot lost
                        // its meaning. Tooltip + always-on quality
                        // label fixes both. ACTIVE pill now uses a
                        // gold border + gold text so it never
                        // collides with the red/green/purple dot.
                        const qLabel = c.quality === "auspicious"
                          ? t("Auspicious", "శుభ")
                          : c.quality === "inauspicious"
                            ? t("Inauspicious", "అశుభ")
                            : t("Neutral", "తటస్థ");
                        return (
                          <div key={i}
                            className={`pc2-chog-row${c.is_current ? " is-current" : ""}`}
                            title={`${c.name} — ${qLabel}${c.is_current ? ` (${t("active now", "ప్రస్తుతం")})` : ""}`}
                            style={{
                              background: c.is_current ? `${qColor}14` : "transparent",
                              borderColor: c.is_current ? `${qColor}55` : "transparent",
                            }}>
                            <span className="pc2-chog-dot" style={{ background: qColor }} aria-label={qLabel} />
                            <span className="pc2-chog-name" style={{ color: c.is_current ? qColor : "var(--text)", fontWeight: c.is_current ? 700 : 500 }}>{c.name}</span>
                            <span className="pc2-chog-time">{stripSeconds(c.start)}–{stripSeconds(c.end)}</span>
                            {c.is_current && (
                              <span
                                className="pc2-chog-active-badge"
                                style={{
                                  background: "rgba(201,169,110,0.18)",
                                  color: "#c9a96e",
                                  border: "0.5px solid rgba(201,169,110,0.55)",
                                }}
                              >
                                ◷ {t("ACTIVE", "ఇప్పుడు")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* City selector modal */}
      {pcShowCityModal && (
        <div className="pc-city-modal-overlay" onClick={() => setPcShowCityModal(false)}>
          <div className="pc-city-modal" onClick={e => e.stopPropagation()}>
            <div className="pc-city-header">
              <span className="pc-city-title">{t("SELECT CITY", "నగరం ఎంచుకోండి")}</span>
              <button onClick={() => setPcShowCityModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, fontFamily: "inherit" }}>&times;</button>
            </div>
            <input
              className="pc-city-search"
              type="text" value={pcCityQuery} autoFocus
              placeholder={t("Search any city…", "ఏదైనా నగరం వెతకండి…")}
              onChange={e => {
                setPcCityQuery(e.target.value);
                if (pcCitySearchRef.current) clearTimeout(pcCitySearchRef.current);
                pcCitySearchRef.current = setTimeout(() => searchPcCities(e.target.value), 400);
              }}
            />
            <button className="pc-city-myloc" onClick={pcTryMyLocation}>
              <MapPin size={14} />
              <span>{t("My Location", "నా ప్రదేశం")}</span>
              <span style={{ marginLeft: "auto", fontSize: 9, background: "rgba(52,211,153,0.15)", color: "#34d399", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{t("CURRENT", "ప్రస్తుతం")}</span>
            </button>
            {pcGeoError && (
              <div style={{ fontSize: 11, color: "#f87171", marginBottom: "0.5rem", padding: "6px 10px", background: "rgba(248,113,113,0.08)", borderRadius: 6 }}>{pcGeoError}</div>
            )}
            {pcCitySearching && <div style={{ fontSize: 11, color: "var(--muted)", padding: "8px 0" }}>{t("Searching…", "వెతుకుతోంది…")}</div>}
            {pcCitySuggestions.length === 0 && !pcCitySearching && pcCityQuery.length < 2 && (
              <div style={{ fontSize: 11, color: "var(--muted)", padding: "8px 0" }}>{t("Type at least 2 characters to search", "కనీసం 2 అక్షరాలు టైప్ చేయండి")}</div>
            )}
            {pcCitySuggestions.map((s, i) => (
              <button key={i} className="pc-city-result" onClick={() => pcSelectCity(s)}>
                <div style={{ fontWeight: 500 }}>{s.name}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{s.display}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
    );
}
