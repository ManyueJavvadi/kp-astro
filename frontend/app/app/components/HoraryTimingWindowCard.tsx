"use client";
/**
 * HoraryTimingWindowCard — PR H9
 *
 * Synthesizes a single "Fires between X and Y" timing window from the
 * cross of horary RPs × the native's Vimshottari dasha tree.
 *
 * Logic:
 *   - The strongest fire is when a planet is BOTH a topic-significator
 *     (in rp_signifying_yes) AND a Ruling Planet at query.
 *   - Scan native's upcoming PADs (within current AD) — pick the FIRST
 *     PAD whose lord is in rp_signifying_yes (so it's both significator
 *     + RP). That PAD's start->end is the primary fire window.
 *   - If no PAD lord matches, fall through to ADs — pick first upcoming
 *     AD whose lord is in rp_signifying_yes. AD spans months/years.
 *   - If no upcoming period matches, show "Watch for [planet] dasha"
 *     as a graceful fallback.
 *
 * Why this matters: verdict says "YES, 78/100" — the astrologer's next
 * question is always "WHEN?" This card answers it in one line.
 *
 * Source: pattern_library.md T1 (Joint Period) + T4 (Sookshma day-precision).
 */
import { Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type Period = {
  lord?: string;
  lord_en?: string;
  lord_te?: string;
  start?: string;
  end?: string;
  is_current?: boolean;
};

type Props = {
  rulingPlanets: string[];
  rpSignifyingYes: string[];
  antardashas: Period[];
  pratyantardashas: Period[];
};

function getLord(p: Period | undefined): string {
  return p?.lord ?? p?.lord_en ?? p?.lord_te ?? "";
}

function fmt(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const d = dateStr.length >= 10 ? dateStr.slice(0, 10) : dateStr;
  // YYYY-MM-DD → "12 Mar 2027"
  const parts = d.split("-");
  if (parts.length === 3) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const m = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (m >= 1 && m <= 12) return `${day} ${months[m - 1]} ${parts[0]}`;
  }
  return d;
}

function findFireWindow(
  rpSignifyingYes: string[],
  antardashas: Period[],
  pratyantardashas: Period[],
): { period: Period | null; level: "PAD" | "AD" | null; lord: string } {
  const todayIso = new Date().toISOString().slice(0, 10);
  const rpSet = new Set(rpSignifyingYes);

  // 1) Try upcoming PADs first (sharpest window)
  for (const pad of pratyantardashas) {
    const lord = getLord(pad);
    if (!lord || !pad.end) continue;
    if (pad.end < todayIso) continue; // already passed
    if (rpSet.has(lord)) {
      return { period: pad, level: "PAD", lord };
    }
  }

  // 2) Fall back to upcoming ADs
  for (const ad of antardashas) {
    const lord = getLord(ad);
    if (!lord || !ad.end) continue;
    if (ad.end < todayIso) continue;
    if (rpSet.has(lord)) {
      return { period: ad, level: "AD", lord };
    }
  }

  return { period: null, level: null, lord: "" };
}

export default function HoraryTimingWindowCard({
  rulingPlanets,
  rpSignifyingYes,
  antardashas,
  pratyantardashas,
}: Props) {
  const { t } = useLanguage();
  if (!rpSignifyingYes || rpSignifyingYes.length === 0) {
    // No topic-confirming RPs — engine already said timing thread is dormant
    return null;
  }
  if (!antardashas?.length && !pratyantardashas?.length) {
    // No native dasha context (no chart loaded) — show graceful hint
    return (
      <div
        style={{
          padding: "12px 16px",
          background: "rgba(201,169,110,0.04)",
          border: "0.5px solid rgba(201,169,110,0.18)",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 11.5,
          color: "var(--muted)",
        }}
      >
        <Clock size={14} color="var(--muted)" strokeWidth={1.8} />
        <span>
          {t(
            `Watch for dasha of ${rpSignifyingYes.join(", ")} — load your natal chart in Setup to see exact firing dates.`,
            `${rpSignifyingYes.join(", ")} యొక్క దశ చూడండి — ఖచ్చితమైన తేదీల కోసం మీ జాతక చార్ట్ లోడ్ చేయండి.`
          )}
        </span>
      </div>
    );
  }

  const fire = findFireWindow(rpSignifyingYes, antardashas, pratyantardashas);

  if (!fire.period) {
    return (
      <div
        style={{
          padding: "12px 16px",
          background: "rgba(201,169,110,0.04)",
          border: "0.5px solid rgba(201,169,110,0.18)",
          borderRadius: 10,
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Clock size={14} color="var(--accent)" strokeWidth={1.8} />
          <span style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
            {t("Fires when", "ఎప్పుడు జరుగుతుంది")}
          </span>
        </div>
        <div style={{ lineHeight: 1.6 }}>
          {t(
            `None of ${rpSignifyingYes.join(", ")} is the upcoming PAD or AD lord in your dasha tree. The matter waits for one of these planets to enter its bhukti — typically months to years out.`,
            `${rpSignifyingYes.join(", ")} ఏదీ మీ దశలో రాబోయే PAD/AD అధిపతి కాదు. ఈ గ్రహాలలో ఒకటి దాని భుక్తిలోకి ప్రవేశించే వరకు వేచి ఉండాలి.`
          )}
        </div>
      </div>
    );
  }

  const period = fire.period;
  const lvlLabel =
    fire.level === "PAD"
      ? t("Pratyantar window (PAD)", "ప్రత్యంతర్ విండో")
      : t("Antardasha window", "అంతర్దశ విండో");
  const startDate = fmt(period.start);
  const endDate = fmt(period.end);
  const lord = fire.lord;

  return (
    <div
      style={{
        padding: "14px 16px",
        background: "rgba(52,211,153,0.04)",
        border: "1px solid rgba(52,211,153,0.32)",
        borderRadius: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Clock size={14} color="#34d399" strokeWidth={2} />
        <span
          style={{
            fontSize: 10,
            color: "#34d399",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {t("Fires between", "ఎప్పుడు జరుగుతుంది")}
        </span>
      </div>
      <div style={{ fontSize: 16, color: "var(--text)", fontWeight: 700, letterSpacing: "0.02em", marginBottom: 6 }}>
        {startDate} <span style={{ color: "#34d399" }}>→</span> {endDate}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
        {t(
          `${lvlLabel} of ${lord} — ${lord} is both a topic significator AND a Ruling Planet at query (per Pattern T1/T2 joint convergence). This is the strongest fire window your dasha tree offers for this question.`,
          `${lord} యొక్క ${lvlLabel} — ${lord} టాపిక్‌ను సూచిస్తుంది + ప్రశ్న సమయంలో నియమ గ్రహం. మీ దశలో ఇది బలమైన ఫైరింగ్ విండో.`
        )}
      </div>
    </div>
  );
}
