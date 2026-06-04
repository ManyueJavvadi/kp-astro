"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Link2 } from "lucide-react";
import { WorkspaceData } from "../../types/workspace";
import { BirthDetails, ChartSession } from "../../types";
import { useLanguage } from "@/lib/i18n";

/**
 * Phase 3 — slim header (~64px).
 *
 * The persistent header that sits above every tab. Stress-test
 * findings A + B + F said this region was carrying too much (avatar +
 * name + gender + "Astrologer mode" pill + birth details + Lagna/Moon/Sun
 * chips + MD/AD/PAD chips + RPS chips + PDF + Switch + New Chart, ~120px
 * tall, dominating every screen).
 *
 * After Phase 3:
 *   - Header keeps avatar + name + birth-line + global actions only.
 *   - Lagna / Moon / Sun / dasha / RPs moved to <ChartContextStrip>
 *     mounted under the tab bar on chart-related tabs (so they're
 *     attached to "this chart" instead of competing with the tab content).
 *   - Today's panchang moved to <TodayStrip>, sticky at the top.
 *   - "★ Astrologer mode" pill demoted to a small gold dot on the
 *     avatar — no more verbal repetition every tab.
 *
 * Same prop signature as before so no caller needs to change.
 */
interface PersonHeroBannerProps {
  workspaceData: WorkspaceData;
  birthDetails: BirthDetails;
  onNewChart: () => void;
  onPdf: () => void;
  pdfLoading: boolean;
  savedSessions: ChartSession[];
  onSwitchSession: (s: ChartSession) => void;
  astrologerMode?: boolean;
  onEditChart?: () => void;
  /**
   * Trust-2 (PR May 2026) — optional slot for the LiveLocationPill so
   * the "YOUR LOCATION" trust signal sits next to the PDF button at
   * the top of the workspace, always visible without scrolling the
   * stats strip on small screens.  Parent (page.tsx) owns the
   * useLiveLocation state; this component just provides the slot.
   */
  liveLocSlot?: React.ReactNode;
  /**
   * 2026-06-03 — when the astrologer is inside a per-client workspace
   * (/app/clients/[id]/*), pass the portal admin URL here. The header
   * renders a gold "Portal" pill that links directly to it — saves
   * the astrologer going back to the clients list to find the row's
   * Portal button. When undefined (e.g., the legacy /app entry point
   * before CRM-first redesign), the pill is hidden.
   *
   * Chart switching: the multi-chart chip strip below this header
   * already lets astrologers tap to switch between loaded charts, so
   * the old "Switch ▾" dropdown was redundant once the strip shipped.
   * The dropdown is now hidden when portalHref is set (i.e., on the
   * per-client routes where the chip strip is also active).
   */
  portalHref?: string;
}

export default function PersonHeroBanner({
  birthDetails, onNewChart, onPdf, pdfLoading,
  savedSessions, onSwitchSession, astrologerMode,
  onEditChart, liveLocSlot, portalHref,
}: PersonHeroBannerProps) {
  const { t } = useLanguage();
  const [showSwitch, setShowSwitch] = useState(false);

  const initial = (birthDetails.name ?? "?")[0]?.toUpperCase() ?? "?";
  const genderSym = birthDetails.gender === "male" ? "♂" : birthDetails.gender === "female" ? "♀" : "";

  // Single birth line: "09 Sep 2000 · 12:31 PM · Tenali, Andhra Pradesh"
  // Same shape as before but rendered smaller — the chart context
  // chips that lived next to it have moved out.
  const birthLine = [
    birthDetails.date,
    birthDetails.time ? `${birthDetails.time} ${birthDetails.ampm}` : "",
    birthDetails.place ? `· ${birthDetails.place}` : "",
  ].filter(Boolean).join(" · ");

  return (
    <div
      className="person-hero-banner"
      style={{
        background: "var(--hero-gradient)",
        borderBottom: "0.5px solid rgba(201,169,110,0.15)",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        minHeight: 64,
      }}
    >
      {/* Avatar — gold dot in upper-right corner stands in for the
          "Astrologer mode" pill that used to consume header real estate. */}
      <div
        title={astrologerMode ? t("Astrologer mode", "జ్యోతిష్కుడు మోడ్") : undefined}
        style={{
          position: "relative",
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "rgba(201,169,110,0.12)",
          border: "1.5px solid rgba(201,169,110,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 700,
          color: "#c9a96e",
          flexShrink: 0,
        }}
      >
        {initial}
        {astrologerMode && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#c9a96e",
              boxShadow: "0 0 0 1.5px var(--hero-gradient, #07070d), 0 0 6px rgba(201,169,110,0.5)",
            }}
          />
        )}
      </div>

      {/* Identity — compact. Name + birth-line below it.
          Genders/Astrologer-pill compressed: gender shown inline, mode
          shown via the avatar dot above. */}
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#f0f0f0",
              letterSpacing: "0.01em",
            }}
          >
            {birthDetails.name?.toUpperCase() ?? "—"}
          </span>
          {genderSym && (
            <span style={{ fontSize: 11, color: "#888899" }}>{genderSym}</span>
          )}
          {onEditChart && (
            <button
              onClick={onEditChart}
              title={t("Edit Details", "వివరాలు సవరించండి")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "transparent",
                border: "1px solid rgba(201, 169, 110, 0.4)",
                color: "#c9a96e",
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 9.5,
                fontWeight: 600,
                cursor: "pointer",
                marginLeft: 8,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(201, 169, 110, 0.12)";
                e.currentTarget.style.borderColor = "rgba(201, 169, 110, 0.8)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(201, 169, 110, 0.4)";
              }}
            >
              ✏️ {t("Edit", "సవరించు")}
            </button>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: "#666677", marginTop: 1, lineHeight: 1.4 }}>
          {birthLine}
        </div>
      </div>

      {/* Action buttons — Live location pill, PDF, Switch, New Chart.
          Same controls, slightly smaller heights to match 38px avatar.
          Trust-2 (May 2026) — liveLocSlot pinned LEFT of PDF so the
          astrologer's RP-driving location is always visible. */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        {liveLocSlot}
        <button
          onClick={onPdf}
          disabled={pdfLoading}
          aria-label={t("Download PDF", "PDF డౌన్‌లోడ్")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 30,
            padding: "0 12px",
            borderRadius: 7,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.08)",
            color: pdfLoading ? "#555566" : "#b0b0c0",
            fontSize: 12,
            fontWeight: 500,
            cursor: pdfLoading ? "not-allowed" : "pointer",
            transition: "border-color 0.15s, color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => { if (pdfLoading) return; e.currentTarget.style.color = "#c9a96e"; e.currentTarget.style.borderColor = "rgba(201,169,110,0.35)"; e.currentTarget.style.background = "rgba(201,169,110,0.04)"; }}
          onMouseLeave={e => { if (pdfLoading) return; e.currentTarget.style.color = "#b0b0c0"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "transparent"; }}
        >
          {pdfLoading ? "…" : t("PDF ↓", "PDF ↓")}
        </button>

        {/* 2026-06-03 — Portal pill (replaces Switch dropdown when
            inside a per-client route). Direct link saves the
            astrologer a round trip through the clients list. */}
        {portalHref && (
          <Link
            href={portalHref}
            aria-label={t("Open client portal admin", "క్లయింట్ పోర్టల్ తెరువు")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 30,
              padding: "0 12px",
              borderRadius: 7,
              background:
                "linear-gradient(180deg, rgba(201,169,110,0.16) 0%, rgba(201,169,110,0.06) 100%)",
              border: "1px solid rgba(201,169,110,0.45)",
              color: "#c9a96e",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.3,
              textTransform: "uppercase" as const,
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "#c9a96e";
              e.currentTarget.style.background =
                "linear-gradient(180deg, rgba(201,169,110,0.22) 0%, rgba(201,169,110,0.12) 100%)";
              e.currentTarget.style.boxShadow =
                "0 0 0 1px rgba(201,169,110,0.35), 0 0 14px rgba(201,169,110,0.25)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(201,169,110,0.45)";
              e.currentTarget.style.background =
                "linear-gradient(180deg, rgba(201,169,110,0.16) 0%, rgba(201,169,110,0.06) 100%)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <Link2 size={12} />
            {t("Portal", "పోర్టల్")}
          </Link>
        )}

        {/* Legacy Switch dropdown — hidden when portalHref is set
            (per-client routes use the chip strip below this header
            for chart switching). Kept for the legacy /app entry that
            still uses the savedSessions sidebar pattern. */}
        {!portalHref && astrologerMode && savedSessions.length > 0 && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowSwitch(s => !s)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 30,
                padding: "0 12px",
                borderRadius: 7,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#b0b0c0",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "border-color 0.15s, color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#E8EDF5"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#b0b0c0"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              {t("Switch", "మార్చు")} ▾
            </button>
            {showSwitch && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  zIndex: 100,
                  background: "var(--elevated)",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: 6,
                  minWidth: 180,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
              >
                {savedSessions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { onSwitchSession(s); setShowSwitch(false); }}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontSize: 12,
                      color: "#d0d0d8",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,169,110,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* U9 fix (2026-06-02): wired to AddClientModal (via custom
            event the per-client page listens for) instead of the
            legacy NewChartModal which only created a chart_session
            with no client_id — those orphan sessions showed up in
            the sidebar as ghost rows. The legacy onNewChart prop
            still fires too so any state cleanup it does (stash etc.)
            still happens. */}
        <button
          onClick={() => {
            onNewChart();
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("workspace-add-client"));
            }
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 30,
            padding: "0 14px",
            borderRadius: 7,
            background: "#c9a96e",
            border: "none",
            color: "#1a130a",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 0 0 1px rgba(201,169,110,0.55), 0 2px 6px rgba(201,169,110,0.18), 0 0 18px rgba(231,201,138,0.28)",
            transition: "background 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#e7c98a"; e.currentTarget.style.boxShadow = "0 0 0 1px rgba(231,201,138,0.7), 0 2px 8px rgba(201,169,110,0.25), 0 0 26px rgba(231,201,138,0.42)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#c9a96e"; e.currentTarget.style.boxShadow = "0 0 0 1px rgba(201,169,110,0.55), 0 2px 6px rgba(201,169,110,0.18), 0 0 18px rgba(231,201,138,0.28)"; }}
        >
          + {t("New Client", "కొత్త క్లయింట్")}
        </button>
      </div>
    </div>
  );
}
