"use client";

/**
 * DashboardTab — the general-user mode HOME.
 *
 * Phase G1 (2026-05-28) — new tab landing for consumer mode. Replaces
 * the previous UserModeUI chat-first home with a Notion/KundaliGPT-
 * style tabbed dashboard. Navigation IS conventional and predictable;
 * creativity lives INSIDE this tab's content presentation.
 *
 * Sections (top → bottom):
 *   1. Greeting hero — "Namaste, {Name}" with serif italic + current
 *      dasha line
 *   2. Identity triad — Lagna / Moon Sign / Sun Sign (cultural
 *      anchors every Indian astrology user knows)
 *   3. Today strip — panchang (tithi · nakshatra · hora) + Ruling
 *      Planets pulsing badge
 *   4. Quick actions — 4-tile grid (Ask · Horary · Muhurta · Match)
 *      with KP-doctrine subtitles, not generic descriptions
 *   5. Active dasha card — Mahadasha-Bhukti with end date, gold breath
 *   6. Recent questions — last 3 with verdict pills (if any)
 *
 * Design principles applied:
 *   - Verdict typography first: serif on the answer/identity moments
 *   - One accent color (gold) used as punctuation
 *   - Generous whitespace; no card stuffing
 *   - Show the math: visible Lagna/Moon/Sun, visible dasha state
 *   - No fear content, no remedies, no horoscope feed
 *
 * Reuses: existing PLANET_COLORS, motion tokens, useLanguage.
 */

import React from "react";
import { Sparkles, HelpCircle, Target, Heart, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { motion as m } from "motion/react";
// D2 cleanup (2026-06-02): file moved from ../tabs/ to ../tabs/_paused/
// — added one extra "../" to relative paths so the imports still
// resolve. Component logic unchanged.
import { PLANET_COLORS } from "../../components/constants";
import { formatDashaPeriod } from "@/lib/format";
import type { WorkspaceData } from "../../types/workspace";

interface DashboardTabProps {
  workspaceData: WorkspaceData;
  birthDetails: { name?: string; gender?: string };
  /** Recent Q&A messages from Analysis tab — feed last 3 here. */
  recentMessages?: Array<{ q: string; a: string; t?: string }>;
  onJumpToTab: (tabId: string) => void;
  /** Live current Ruling Planets (from horary RP system, optional). */
  rulingPlanets?: string[];
}

export function DashboardTab({
  workspaceData, birthDetails,
  recentMessages = [],
  onJumpToTab, rulingPlanets,
}: DashboardTabProps) {
  const { lang, t } = useLanguage();
  const wd = workspaceData as any;

  // Pick the cultural identity triad — the 3 things every Indian
  // astrology user already knows about themselves.
  const lagnaSign = wd?.lagna_en || wd?.lagna || "—";
  const moonPlanet = wd?.planets?.find((p: any) => p.planet_en === "Moon");
  const sunPlanet  = wd?.planets?.find((p: any) => p.planet_en === "Sun");
  const moonSign = moonPlanet?.sign_en || "—";
  const moonNakshatra = moonPlanet?.nakshatra_en || "";
  const sunSign = sunPlanet?.sign_en || "—";

  // Current dasha state — the "where are you in life" anchor.
  const md = wd?.mahadasha;
  const ad = wd?.current_antardasha;
  const mdLord = md?.lord_en || md?.lord || "—";
  const adLord = ad?.lord_en || ad?.lord || "—";

  // Today's panchang summary (uses panchangam_today if present).
  const pc = wd?.panchangam_today || {};
  const tithi = pc?.tithi_en || pc?.tithi || "—";
  const nakshatra = pc?.nakshatra_en || pc?.nakshatra || "—";

  const firstName = (birthDetails.name || "").trim().split(/\s+/)[0] || "—";

  // Greeting that respects time of day.
  const hour = new Date().getHours();
  const greet = hour < 12 ? t("Good morning", "శుభోదయం")
              : hour < 17 ? t("Good afternoon", "మధ్యాహ్నం శుభాకాంక్షలు")
              : t("Good evening", "శుభ సాయంత్రం");

  // Top-3 RPs to surface as "Now-Planets" (deterministic — first 3
  // from the rulingPlanets prop). Fallback: empty.
  const nowPlanets = (rulingPlanets ?? []).slice(0, 3);

  return (
    <div
      className="tab-content"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 22,
        padding: "12px 4px 40px",
        maxWidth: 720,
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* ─── 1. Greeting hero ─────────────────────────────────── */}
      <m.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
          {greet} · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </div>
        <h1
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontStyle: "italic",
            fontSize: 30,
            lineHeight: 1.2,
            margin: 0,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          {t("Namaste,", "నమస్తే,")}{" "}
          <span style={{ color: "var(--accent)" }}>{firstName}</span>
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.55 }}>
          {t(
            `You are in `,
            `మీరు ఇప్పుడు `,
          )}
          <strong style={{ color: PLANET_COLORS[mdLord] || "var(--accent)", fontWeight: 700 }}>
            {mdLord}
          </strong>
          {t(" Mahadasha · ", " మహాదశ · ")}
          <strong style={{ color: PLANET_COLORS[adLord] || "var(--text)", fontWeight: 600 }}>
            {adLord}
          </strong>
          {t(" Bhukti", " భుక్తి")}
          {ad?.end ? <> · <span style={{ color: "var(--muted)" }}>{t("until", "వరకు")} {formatDashaPeriod(null, ad.end)}</span></> : null}
        </p>
      </m.section>

      {/* ─── 2. Identity triad — Lagna / Moon / Sun ──────────── */}
      <m.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        <IdentityCard label={t("Lagna", "లగ్నం")} value={lagnaSign} sub={t("ascendant", "ఆరోహణ")} tint="gold" />
        <IdentityCard
          label={t("Moon Sign", "చంద్ర రాశి")}
          value={moonSign}
          sub={moonNakshatra}
          tint="blue"
        />
        <IdentityCard
          label={t("Sun Sign", "సూర్య రాశి")}
          value={sunSign}
          sub={sunPlanet?.house ? `H${sunPlanet.house}` : ""}
          tint="amber"
        />
      </m.section>

      {/* ─── 3. Today strip ──────────────────────────────────── */}
      <m.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: "var(--surface)",
          border: "0.5px solid rgba(255,255,255,0.06)",
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}>
            {t("Today's Panchang", "నేటి పంచాంగం")}
          </span>
          <span style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 500 }}>
            {tithi} · {nakshatra}
          </span>
        </div>
        {nowPlanets.length > 0 && (
          <div
            className="now-planets-pulse"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              background: "rgba(201,169,110,0.06)",
              border: "0.5px solid rgba(201,169,110,0.30)",
            }}
          >
            <span className="now-dot" />
            <span style={{ fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 600 }}>
              {t("Now ruling", "ఇప్పుడు పాలించేవి")}
            </span>
            <span style={{ display: "inline-flex", gap: 6 }}>
              {nowPlanets.map(p => (
                <span key={p} style={{ fontSize: 12, fontWeight: 700, color: PLANET_COLORS[p] || "var(--text)" }}>
                  {p.slice(0, 2)}
                </span>
              ))}
            </span>
          </div>
        )}
      </m.section>

      {/* ─── 4. Quick action grid ────────────────────────────── */}
      <m.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, marginBottom: 10, paddingLeft: 2 }}>
          {t("What do you want to know?", "మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          <ActionTile
            Icon={Sparkles}
            title={t("Ask anything", "ఏదైనా అడగండి")}
            sub={t("AI-grounded in your chart's CSL chains", "మీ చార్ట్ CSL చైన్‌లో ఆధారిత AI")}
            onClick={() => onJumpToTab("analysis")}
          />
          <ActionTile
            Icon={HelpCircle}
            title={t("Yes / No verdict", "అవును / కాదు తీర్పు")}
            sub={t("KP Horary · pick a number 1–249", "KP ప్రశ్న · 1–249 సంఖ్య ఎంచుకోండి")}
            onClick={() => onJumpToTab("horary")}
          />
          <ActionTile
            Icon={Target}
            title={t("Find a muhurtha", "ముహూర్తం కనుగొనండి")}
            sub={t("KP windows · 25-min precision", "KP విండోస్ · 25 నిమి కచ్చితత్వం")}
            onClick={() => onJumpToTab("muhurtha")}
          />
          <ActionTile
            Icon={Heart}
            title={t("Match a kundli", "కుండలి సరిపోలిక")}
            sub={t("Verdict not score · KP cross-significators", "స్కోర్ కాదు తీర్పు · KP క్రాస్-సిగ్నిఫికేటర్‌లు")}
            onClick={() => onJumpToTab("match")}
          />
        </div>
      </m.section>

      {/* ─── 5. Recent questions (if any) ─────────────────────── */}
      {recentMessages.length > 0 && (
        <m.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, marginBottom: 10, paddingLeft: 2 }}>
            {t("Your recent questions", "మీ ఇటీవలి ప్రశ్నలు")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentMessages.slice(0, 3).map((msg, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onJumpToTab("analysis")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "var(--surface)",
                  border: "0.5px solid rgba(255,255,255,0.05)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  color: "var(--text)",
                  fontSize: 13,
                  transition: "border-color 140ms, background 140ms",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,169,110,0.30)";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,169,110,0.04)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
                }}
              >
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {msg.q || t("Untitled question", "శీర్షిక లేని ప్రశ్న")}
                </span>
                <ChevronRight size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </m.section>
      )}

      {/* ─── 6. Trust footer (the moat) ───────────────────────── */}
      <m.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        style={{
          marginTop: 8,
          padding: "14px 16px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.015)",
          border: "0.5px dashed rgba(201,169,110,0.18)",
          fontSize: 11.5,
          color: "var(--muted)",
          lineHeight: 1.5,
          textAlign: "center",
        }}
      >
        {t(
          "Math by Krishnamurti Paddhati · words by AI. Every verdict cites your chart's sub-lord chain and dasha context. No remedies, no fear, no per-minute meters.",
          "గణితం కృష్ణమూర్తి పద్ధతి · మాటలు AI. ప్రతి తీర్పు మీ సబ్-లార్డ్ చైన్ + దశ సందర్భాన్ని ఉదహరిస్తుంది.",
        )}
      </m.section>

      <style jsx>{`
        .now-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 8px rgba(201, 169, 110, 0.8);
          animation: now-dot-pulse 2.4s ease-in-out infinite;
        }
        @keyframes now-dot-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.35); }
        }
      `}</style>
    </div>
  );
}

// ─── Identity triad card ──────────────────────────────────────
function IdentityCard({
  label, value, sub, tint,
}: {
  label: string; value: string; sub?: string;
  tint?: "gold" | "blue" | "amber";
}) {
  const tintColor =
    tint === "gold"  ? "rgba(201,169,110,0.30)" :
    tint === "blue"  ? "rgba(96,165,250,0.30)"  :
    tint === "amber" ? "rgba(251,191,36,0.30)"  : "rgba(255,255,255,0.08)";
  const tintBg =
    tint === "gold"  ? "rgba(201,169,110,0.05)" :
    tint === "blue"  ? "rgba(96,165,250,0.05)"  :
    tint === "amber" ? "rgba(251,191,36,0.05)"  : "rgba(255,255,255,0.02)";
  return (
    <div
      style={{
        background: tintBg,
        border: `0.5px solid ${tintColor}`,
        borderRadius: 12,
        padding: "12px 12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={{
        fontSize: 9, color: "var(--muted)",
        letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: 19, color: "var(--text)", lineHeight: 1.1,
        marginTop: 2,
      }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.03em" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── Quick action tile ────────────────────────────────────────
function ActionTile({
  Icon, title, sub, onClick,
}: {
  Icon: typeof Sparkles; title: string; sub: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        background: "var(--surface)",
        border: "0.5px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: "16px 14px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
        color: "var(--text)",
        transition: "border-color 200ms, background 200ms, transform 200ms",
        minHeight: 96,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,169,110,0.40)";
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,169,110,0.04)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
      }}
    >
      <Icon size={18} style={{ color: "var(--accent)", marginBottom: 2 }} strokeWidth={1.8} />
      <span style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: 16, color: "var(--text)", lineHeight: 1.15,
      }}>
        {title}
      </span>
      <span style={{ fontSize: 10.5, color: "var(--muted)", lineHeight: 1.45 }}>
        {sub}
      </span>
    </button>
  );
}
