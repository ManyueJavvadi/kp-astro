"use client";
/**
 * MuhurthaReasoningTrace — PR Mu15
 *
 * Collapsible "Full reasoning trace" panel for a Muhurtha window.
 * Mirrors MatchReasoningTrace (PR M12) and HoraryReasoningTrace (PR H10):
 * the panel is closed by default; opening it shows every signal the
 * engine used so a senior astrologer can independently re-verify the
 * verdict using a desktop ephemeris.
 *
 * Sections:
 *   1. Verdict + confidence
 *   2. Lagna + event house signification
 *   3. Per-participant checks (Tarabala/Chandrabala/DBA/RP overlap)
 *   4. Doshas active (negative-delta ledger entries surfaced as chips)
 *   5. Panchang context
 *   6. Confidence breakdown (full ledger)
 *   7. Evidence payload (cusp longitudes + planet positions + HHMM tags)
 *
 * Companion: "Astrologer notes" copy-paste block + JSON export button.
 */

import { useState } from "react";
import { ChevronDown, Copy, Check, Download } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type BreakdownItem = { factor: string; delta: number; note?: string };

type Props = {
  window: any;          // a single muhurtha window dict
  metadata?: {
    event_type?: string;
    event_label?: string;
    participants_loaded?: string[];
    eclipses_in_range?: any[];
    advanced_dosha_check_enabled?: boolean;
  };
};

export default function MuhurthaReasoningTrace({ window: w, metadata }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!w) return null;
  const breakdown: BreakdownItem[] = w.confidence_breakdown || [];
  const ev = w.evidence_payload || {};
  const adv = w.advanced_doshas || {};
  const m10 = w.mu10_doshas || {};
  const m13 = w.mu13_overlays || {};
  const po = w.panchang_overlays || {};
  const ppl: any[] = w.per_participant || [];
  const dba = w.dba_at_moment_aggregate || {};

  const positiveLedger = breakdown.filter((b) => b.delta > 0);
  const negativeLedger = breakdown.filter((b) => b.delta < 0);
  const flagLedger = breakdown.filter((b) => b.delta === 0); // hard rejects / informational

  // Build the astrologer notes block (copy-paste friendly)
  const buildNotes = (): string => {
    const lines: string[] = [];
    const meta = metadata || {};
    lines.push(`Muhurtha — ${meta.event_label || meta.event_type || "event"}`);
    lines.push(`Date: ${w.date_display || w.date}  Time: ${w.start_time}-${w.end_time}`);
    lines.push(
      `Verdict: ${w.quality}  ·  Score ${w.score} (raw ${w.raw_score}/100 confidence ${w.confidence_score})`
    );
    lines.push(
      `Lagna: ${w.lagna} (${w.lagna_sublord} SL · ${w.lagna_star_lord} star)  ·  ` +
      `Signifies H${(w.signified_houses || []).join(", H")}`
    );
    if (ev.sunrise_hhmm) {
      lines.push(
        `Sunrise: ${ev.sunrise_hhmm}  ·  Sunset: ${ev.sunset_hhmm}  ·  ` +
        `RK: ${ev.rahu_kalam_hhmm}  ·  YG: ${ev.yamagandam_hhmm}  ·  GL: ${ev.gulika_hhmm}` +
        (ev.abhijit_hhmm ? `  ·  Abhijit: ${ev.abhijit_hhmm}` : "")
      );
    }
    if (m13.day_muhurta_name) {
      lines.push(`Day-muhurta: ${m13.day_muhurta_name} (slot ${m13.day_muhurta_idx + 1}/15)`);
    }
    if (w.panchang) {
      const p = w.panchang;
      lines.push(
        `Panchang: ${p.paksha || ""} ${p.tithi || ""} (${p.tithi_num || ""}) · ` +
        `${p.nakshatra || ""} · ${p.yoga || ""} · ${p.vara || ""}`
      );
    }
    if (ppl.length) {
      lines.push("");
      lines.push(`-- Participants --`);
      for (const p of ppl) {
        const tag = p.is_primary ? "[PRIMARY] " : "";
        lines.push(
          `${tag}${p.name}: Tara ${p.tara_bala_name} (${p.tara_bala_num}/9) ${p.tara_bala_good ? "OK" : "BAD"}, ` +
          `CB ${p.chandrabala_num}/12 ${p.chandrabala_good ? "OK" : "BAD"}, ` +
          `DBA ${p.current_md}-${p.current_ad}` +
          (p.rp_x_natal_count > 0 ? ` · RP∩natal ${p.rp_x_natal_count}/${(p.moment_rps || []).length}` : "")
        );
      }
    }
    if (negativeLedger.length) {
      lines.push("");
      lines.push(`-- Doshas / Penalties --`);
      negativeLedger.forEach((b) =>
        lines.push(`  ${b.delta}  ${b.factor}${b.note ? ` · ${b.note}` : ""}`)
      );
    }
    if (positiveLedger.length) {
      lines.push("");
      lines.push(`-- Bonuses --`);
      positiveLedger.forEach((b) =>
        lines.push(`  +${b.delta}  ${b.factor}${b.note ? ` · ${b.note}` : ""}`)
      );
    }
    if (flagLedger.length) {
      lines.push("");
      lines.push(`-- Hard flags --`);
      flagLedger.forEach((b) => lines.push(`  • ${b.factor}: ${b.note || ""}`));
    }
    if (w.hard_rejected_for?.length) {
      lines.push("");
      lines.push(`-- Hard reject reasons --`);
      w.hard_rejected_for.forEach((s: string) => lines.push(`  ✗ ${s}`));
    }
    if (Array.isArray(meta.eclipses_in_range) && meta.eclipses_in_range.length) {
      lines.push("");
      lines.push(`-- Eclipses in range --`);
      meta.eclipses_in_range.forEach((e: any) =>
        lines.push(`  ${e.type} ${e.eclipse_kind} (peak JD ${e.peak_jd?.toFixed?.(3)})`)
      );
    }
    lines.push("");
    lines.push(`Generated: ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`);
    return lines.join("\n");
  };

  const notesText = buildNotes();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notesText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify({ window: w, metadata }, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safe = (metadata?.event_label || metadata?.event_type || "muhurtha").replace(/\s+/g, "_");
      a.download = `muhurtha_${w.date}_${w.start_time?.replace(":", "")}_${safe}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      /* download may fail in restricted contexts */
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Collapsible reasoning trace */}
      <div
        style={{
          background: "rgba(255,255,255,0.01)",
          border: "0.5px solid var(--border2)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "var(--text)",
            fontFamily: "inherit",
            fontSize: 12,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
            <span style={{ color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 10 }}>
              {t("Full reasoning trace", "పూర్తి తర్క కథనం")}
            </span>
            <span style={{ color: "var(--muted)", fontSize: 10, fontWeight: 400 }}>
              {t("(verify by hand)", "(స్వంతంగా ధృవీకరించండి)")}
            </span>
          </span>
          <ChevronDown
            size={14}
            color="var(--muted)"
            strokeWidth={2}
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}
          />
        </button>
        {open && (
          <div
            style={{
              padding: "10px 16px 16px",
              borderTop: "0.5px solid var(--border2)",
              fontSize: 11.5,
              color: "var(--muted)",
              lineHeight: 1.65,
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {/* 1. Verdict + confidence */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                1. {t("Verdict + confidence", "ఫలితం + విశ్వాసం")}
              </div>
              <div>• {t("Quality", "నాణ్యత")}: <span style={{ color: "var(--text)", fontWeight: 600 }}>{w.quality}</span></div>
              <div>• {t("Score", "స్కోర్")}: <span style={{ color: "var(--text)" }}>{w.score}</span> (raw {w.raw_score}, confidence {w.confidence_score}/100)</div>
              <div>• {t("Aggregation strategy", "సమగ్రత")}: {w.aggregation_strategy || "—"}</div>
            </div>

            {/* 2. Lagna + event signification */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                2. {t("Lagna + event signification", "లగ్నం + ఈవెంట్ సూచనలు")}
              </div>
              <div>• {t("Lagna", "లగ్నం")}: {w.lagna} ({ev.lagna_lon_deg ?? "—"}°)</div>
              <div>• {t("Sub Lord", "సబ్ లార్డ్")}: {w.lagna_sublord} · Star: {w.lagna_star_lord}</div>
              <div>• {t("Signifies", "సూచిస్తుంది")} H{(w.signified_houses || []).join(", H")}</div>
              {ev.event_primary_cusp_deg && (
                <div>• {t("Event primary cusp", "ఈవెంట్ ప్రాధమిక కస్ప్")}: {ev.event_primary_cusp_deg}°</div>
              )}
            </div>

            {/* 3. Per-participant */}
            {ppl.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  3. {t("Per-participant", "ప్రతి భాగస్వామి")}
                </div>
                {ppl.map((p: any, i: number) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    • <span style={{ color: "var(--text)", fontWeight: 600 }}>
                      {p.name}{p.is_primary ? " [PRIMARY]" : ""}
                    </span>:
                    {" "}Tara {p.tara_bala_name} ({p.tara_bala_num}/9){p.tara_bala_good ? " ✓" : " ✗"},{" "}
                    CB {p.chandrabala_num}/12{p.chandrabala_good ? " ✓" : " ✗"},{" "}
                    DBA {p.current_md}-{p.current_ad}
                    {p.rp_x_natal_count > 0 && (
                      <span style={{ color: "#4ade80" }}> · RP∩natal {p.rp_x_natal_count}/{(p.moment_rps || []).length}</span>
                    )}
                    {p.chandrashtamam && <span style={{ color: "#f87171" }}> · CHANDRASHTAMAM</span>}
                    {p.janma_tara && <span style={{ color: "#f87171" }}> · JANMA TARA</span>}
                  </div>
                ))}
                <div style={{ marginTop: 4 }}>
                  • {t("DBA aggregate", "DBA మొత్తం")}: {dba.all_signify_count || 0}/{dba.participants_total || 0} all-signify;
                  {" "}{dba.dussthana_count || 0} dussthana hits
                </div>
              </div>
            )}

            {/* 4. Doshas active */}
            {negativeLedger.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  4. {t("Doshas / Penalties", "దోషాలు / జరిమానాలు")}
                </div>
                {negativeLedger.map((b, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>
                    • <span style={{ color: "#f87171", fontWeight: 600 }}>{b.delta}</span> {b.factor.replace(/_/g, " ")}
                    {b.note && <span style={{ opacity: 0.7, fontStyle: "italic" }}> · {b.note}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* 5. Panchang context */}
            {w.panchang && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  5. {t("Panchang context", "పంచాంగ సందర్భం")}
                </div>
                <div>• Tithi: {w.panchang.paksha || ""} {w.panchang.tithi} ({w.panchang.tithi_num})</div>
                <div>• Nakshatra: {w.panchang.nakshatra}  ·  Yoga: {w.panchang.yoga}</div>
                <div>• Vara: {w.panchang.vara}</div>
                {po.amrit_active && <div style={{ color: "#4ade80" }}>• Inside Amrit Kala</div>}
                {po.varjyam_active && <div style={{ color: "#f87171" }}>• Inside Varjyam</div>}
                {po.panchaka_blocks_event && <div style={{ color: "#f87171" }}>• Panchaka blocks this event</div>}
                {m13.day_muhurta_name && <div>• Day muhurta: {m13.day_muhurta_name} ({m13.day_muhurta_idx + 1}/15)</div>}
              </div>
            )}

            {/* 6. Confidence breakdown */}
            {breakdown.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  6. {t("Confidence breakdown", "విశ్వాస విభజన")} ({w.confidence_score}/100, raw {w.raw_score})
                </div>
                {breakdown.map((b, i) => (
                  <div key={i} style={{ marginBottom: 1 }}>
                    • {b.factor.replace(/_/g, " ")}{" "}
                    <span style={{ color: b.delta > 0 ? "#34d399" : b.delta < 0 ? "#f87171" : "var(--muted)", fontWeight: 600 }}>
                      {b.delta > 0 ? "+" : ""}{b.delta}
                    </span>
                    {b.note && <span style={{ opacity: 0.7, fontStyle: "italic" }}> · {b.note}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* 7. Evidence payload */}
            {ev.cusp_longitudes_deg && (
              <div>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  7. {t("Evidence (verify by hand)", "ఆధారాలు (స్వంతంగా చెక్)")}
                </div>
                <div>• Sunrise {ev.sunrise_hhmm}  ·  Sunset {ev.sunset_hhmm}</div>
                <div>• RK {ev.rahu_kalam_hhmm}  ·  YG {ev.yamagandam_hhmm}  ·  GL {ev.gulika_hhmm}</div>
                {ev.abhijit_hhmm && <div>• Abhijit {ev.abhijit_hhmm}</div>}
                <div style={{ marginTop: 4 }}>
                  • Cusps H1-H12: {ev.cusp_longitudes_deg.map((d: number, i: number) => `H${i + 1}=${d}°`).join(", ")}
                </div>
                <div style={{ marginTop: 4 }}>
                  • Sun-Moon sep: {ev.sun_moon_sep_deg}°  ·  JD {ev.jd?.toFixed?.(4)}  ·  tz {ev.day_event_tz}
                </div>
                {ev.planet_positions && (
                  <div style={{ marginTop: 4 }}>
                    {Object.entries(ev.planet_positions).map(([p, pd]: [string, any]) => (
                      <div key={p}>
                        • {p}: {pd.lon_deg}° {pd.sign} · {pd.nakshatra} · SL {pd.sub_lord}
                        {pd.retrograde && <span style={{ color: "#fb923c" }}> ℞</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Astrologer notes + export actions */}
      <div
        style={{
          padding: "12px 14px",
          background: "rgba(255,255,255,0.01)",
          border: "0.5px solid var(--border2)",
          borderRadius: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "var(--accent)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {t("Astrologer notes · copy-paste ready", "జ్యోతిష్కుని గమనికలు · కాపీ-పేస్ట్")}
          </span>
          <div style={{ display: "inline-flex", gap: 8 }}>
            <button
              onClick={handleCopy}
              style={{
                padding: "5px 10px",
                background: copied ? "rgba(52,211,153,0.15)" : "var(--card)",
                border: `0.5px solid ${copied ? "rgba(52,211,153,0.45)" : "var(--border2)"}`,
                borderRadius: 6,
                fontSize: 11,
                color: copied ? "#34d399" : "var(--text)",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                transition: "all 140ms",
              }}
            >
              {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.8} />}
              {copied ? t("Copied", "కాపీ అయింది") : t("Copy notes", "గమనికలు కాపీ")}
            </button>
            <button
              onClick={handleExport}
              style={{
                padding: "5px 10px",
                background: "var(--card)",
                border: "0.5px solid var(--border2)",
                borderRadius: 6,
                fontSize: 11,
                color: "var(--text)",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Download size={12} strokeWidth={1.8} />
              {t("Export JSON", "JSON ఎగుమతి")}
            </button>
          </div>
        </div>
        <pre
          style={{
            margin: 0,
            padding: "10px 12px",
            background: "rgba(0,0,0,0.25)",
            border: "0.5px solid var(--border)",
            borderRadius: 6,
            fontSize: 10.5,
            color: "var(--muted)",
            fontFamily: "ui-monospace, monospace",
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            overflowX: "auto",
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {notesText}
        </pre>
      </div>
    </div>
  );
}
