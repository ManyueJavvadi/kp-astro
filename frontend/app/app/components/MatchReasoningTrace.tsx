"use client";
/**
 * MatchReasoningTrace — PR M12
 *
 * Collapsible "Full reasoning" panel for the Match tab. Mirrors the
 * HoraryReasoningTrace pattern (PR H10) but laid out around the
 * couple's two-chart audit trail:
 *   1. KP verdict + couple-confidence ledger
 *   2. H7 promise per partner (CSL, signified houses, tier)
 *   3. Star-Sub Harmony per partner
 *   4. Multi-cusp TIER + patterns (per partner + couple)
 *   5. Clinical flags (combust / borderline / multi-marriage)
 *   6. Sensitivity tier + auto-escalators
 *   7. Bhavat Bhavam (if user_concerns triggered it)
 *   8. Top precision windows (M10 sookshma) + AD overlaps (M-A1.6)
 *
 * Closed by default — astrologer opens it when they want to verify
 * the verdict's claims with the underlying evidence. If they trust the
 * verdict, they ship it; if they don't, they read the trail.
 *
 * Companion: "Astrologer notes" copy-paste block + "Export JSON" button.
 */
import { useState } from "react";
import { ChevronDown, Copy, Check, Download } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type BreakdownItem = { label: string; delta: number; note?: string };
type Pattern = { id: string; name: string; evidence?: string };

type Props = {
  result: any;
};

export default function MatchReasoningTrace({ result }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!result) return null;
  const kp = result.kp_analysis || {};
  const p1 = result.person1 || {};
  const p2 = result.person2 || {};
  const breakdown: BreakdownItem[] = result.couple_confidence_breakdown || [];
  const score = result.couple_confidence_score;
  const promise1 = kp.chart1_promise || {};
  const promise2 = kp.chart2_promise || {};
  const tier1 = result.multi_cusp_tier_chart1 || {};
  const tier2 = result.multi_cusp_tier_chart2 || {};
  const ssh1 = result.h7_star_sub_chart1 || {};
  const ssh2 = result.h7_star_sub_chart2 || {};
  const combust1 = result.h7_csl_combust_chart1 || {};
  const combust2 = result.h7_csl_combust_chart2 || {};
  const border1 = result.h7_csl_borderline_chart1 || {};
  const border2 = result.h7_csl_borderline_chart2 || {};
  const multi1 = result.multi_marriage_chart1 || {};
  const multi2 = result.multi_marriage_chart2 || {};
  const patterns1: Pattern[] = result.patterns_chart1 || [];
  const patterns2: Pattern[] = result.patterns_chart2 || [];
  const patternsCouple: Pattern[] = result.patterns_couple || [];
  const sens = result.sensitivity || {};
  const bb1 = result.bhavat_bhavam_chart1;
  const bb2 = result.bhavat_bhavam_chart2;
  const overlaps: any[] = result.upcoming_windows?.overlap_windows || [];
  const precision: any[] = result.joint_precision_windows || [];

  // Build the astrologer notes block (copy-paste friendly)
  const buildNotes = (): string => {
    const lines: string[] = [];
    lines.push(`Match: ${p1.name || "P1"}  ×  ${p2.name || "P2"}`);
    lines.push(
      `Overall: ${result.overall_verdict}  ·  KP ${kp.kp_verdict}` +
      (typeof score === "number" ? `  ·  ${score}/100` : "")
    );
    lines.push(
      `Ashtakoota: ${result.ashtakoota?.total_score}/${result.ashtakoota?.max_score} (${result.ashtakoota?.verdict})`
    );
    if (sens.tier) {
      const esc = sens.escalators_triggered?.length
        ? ` · escalators: ${sens.escalators_triggered.slice(0, 4).join(", ")}`
        : "";
      lines.push(`Sensitivity: Tier ${sens.tier}${esc}`);
    }
    lines.push("");
    lines.push(`-- H7 promise --`);
    lines.push(
      `${p1.name}: CSL ${promise1.sub_lord} → ${promise1.verdict} · sigs H${(promise1.signified_houses || []).join(", H")} · tier ${tier1.label || tier1.tier}`
    );
    lines.push(
      `${p2.name}: CSL ${promise2.sub_lord} → ${promise2.verdict} · sigs H${(promise2.signified_houses || []).join(", H")} · tier ${tier2.label || tier2.tier}`
    );

    if (ssh1.harmony || ssh2.harmony) {
      lines.push("");
      lines.push(`-- Star-Sub Harmony --`);
      if (ssh1.harmony)
        lines.push(`${p1.name}: ${ssh1.harmony} (Star ${ssh1.star_lord} rel=${(ssh1.star_relevant || []).join(",") || "—"} den=${(ssh1.star_denial || []).join(",") || "—"} | Sub ${ssh1.sub_lord} rel=${(ssh1.sub_relevant || []).join(",") || "—"} den=${(ssh1.sub_denial || []).join(",") || "—"})`);
      if (ssh2.harmony)
        lines.push(`${p2.name}: ${ssh2.harmony} (Star ${ssh2.star_lord} rel=${(ssh2.star_relevant || []).join(",") || "—"} den=${(ssh2.star_denial || []).join(",") || "—"} | Sub ${ssh2.sub_lord} rel=${(ssh2.sub_relevant || []).join(",") || "—"} den=${(ssh2.sub_denial || []).join(",") || "—"})`);
    }

    if (patterns1.length || patterns2.length || patternsCouple.length) {
      lines.push("");
      lines.push(`-- Patterns fired --`);
      if (patternsCouple.length)
        lines.push(`Couple: ${patternsCouple.map((p) => `${p.id}(${p.name})`).join(" | ")}`);
      if (patterns1.length)
        lines.push(`${p1.name}: ${patterns1.map((p) => `${p.id}(${p.name})`).join(" | ")}`);
      if (patterns2.length)
        lines.push(`${p2.name}: ${patterns2.map((p) => `${p.id}(${p.name})`).join(" | ")}`);
    }

    const flagBits: string[] = [];
    if (combust1.is_combust) flagBits.push(`${p1.name} H7 CSL combust ${combust1.distance_from_sun_deg}°`);
    if (combust2.is_combust) flagBits.push(`${p2.name} H7 CSL combust ${combust2.distance_from_sun_deg}°`);
    if (border1.is_borderline) flagBits.push(`${p1.name} H7 borderline (${border1.current_sub}⇄${border1.alternate_sub}, ~${border1.minutes_of_birth_time} min)`);
    if (border2.is_borderline) flagBits.push(`${p2.name} H7 borderline (${border2.current_sub}⇄${border2.alternate_sub}, ~${border2.minutes_of_birth_time} min)`);
    if (multi1.signature_present) flagBits.push(`${p1.name} multi-marriage signature (${multi1.basis})`);
    if (multi2.signature_present) flagBits.push(`${p2.name} multi-marriage signature (${multi2.basis})`);
    if (flagBits.length) {
      lines.push("");
      lines.push(`-- Clinical flags --`);
      flagBits.forEach((b) => lines.push(`• ${b}`));
    }

    if (bb1?.applies || bb2?.applies) {
      lines.push("");
      lines.push(`-- Bhavat Bhavam (relative-marriage) --`);
      if (bb1?.applies)
        lines.push(`${p1.name} for ${bb1.relative}: H7 → H${bb1.rotated_house}, CSL ${bb1.csl_at_rotated} sigs H${(bb1.sigs || []).join(", H")} — ${bb1.flavor_en}`);
      if (bb2?.applies)
        lines.push(`${p2.name} for ${bb2.relative}: H7 → H${bb2.rotated_house}, CSL ${bb2.csl_at_rotated} sigs H${(bb2.sigs || []).join(", H")} — ${bb2.flavor_en}`);
    }

    if (overlaps.length) {
      lines.push("");
      lines.push(`-- Top AD overlap windows --`);
      overlaps.slice(0, 4).forEach((w) =>
        lines.push(`${w.start} → ${w.end} (${w.duration_days}d) · ${p1.name} AD ${w.person1_ad} · ${p2.name} AD ${w.person2_ad} · score ${w.combined_score}`)
      );
    }
    if (precision.length) {
      lines.push("");
      lines.push(`-- Wedding-grade precision windows (PD+Sookshma joint fire) --`);
      precision.slice(0, 4).forEach((w) =>
        lines.push(`${w.start} → ${w.end} (${w.duration_days}d) · strength ${w.joint_strength}/4 · ${p1.name} ${w.person1_lords} · ${p2.name} ${w.person2_lords}`)
      );
    }

    if (breakdown.length) {
      lines.push("");
      lines.push(`-- Confidence ledger (${score}/100) --`);
      breakdown.forEach((b) =>
        lines.push(`${b.delta > 0 ? "+" : ""}${b.delta}  ${b.label}${b.note ? ` · ${b.note}` : ""}`)
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
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safe1 = (p1.name || "person1").replace(/\s+/g, "_");
      const safe2 = (p2.name || "person2").replace(/\s+/g, "_");
      a.download = `match_${safe1}_x_${safe2}.json`;
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
              {t("(audit trail)", "(ఆడిట్ ట్రయిల్)")}
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
            {/* 1. Overall verdict + confidence */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                1. {t("Overall verdict", "మొత్తం ఫలితం")}
              </div>
              <div>• {t("Verdict", "ఫలితం")}: <span style={{ color: "var(--text)", fontWeight: 600 }}>{result.overall_verdict}</span></div>
              <div>• {t("KP verdict", "KP ఫలితం")}: <span style={{ color: "var(--text)" }}>{kp.kp_verdict}</span></div>
              {typeof score === "number" && (
                <div>• {t("Couple confidence", "జంట విశ్వాసం")}: <span style={{ color: "var(--text)", fontWeight: 600 }}>{score}/100</span></div>
              )}
              <div>• {t("Ashtakoota", "అష్టకూట")}: {result.ashtakoota?.total_score}/{result.ashtakoota?.max_score} ({result.ashtakoota?.verdict})</div>
            </div>

            {/* 2. H7 promise per partner */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                2. {t("H7 promise per partner", "H7 ప్రమాణం")}
              </div>
              <div>• {p1.name}: CSL <span style={{ color: "var(--text)" }}>{promise1.sub_lord}</span> → {promise1.verdict} · sigs H{(promise1.signified_houses || []).join(", H")} · tier {tier1.label || tier1.tier}</div>
              <div>• {p2.name}: CSL <span style={{ color: "var(--text)" }}>{promise2.sub_lord}</span> → {promise2.verdict} · sigs H{(promise2.signified_houses || []).join(", H")} · tier {tier2.label || tier2.tier}</div>
            </div>

            {/* 3. Star-Sub Harmony */}
            {(ssh1.harmony || ssh2.harmony) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  3. {t("Star-Sub Harmony", "నక్షత్రం-సబ్ సమన్వయం")}
                </div>
                {ssh1.harmony && (
                  <div>• {p1.name}: <span style={{ color: "var(--text)", fontWeight: 600 }}>{ssh1.harmony}</span> · Star {ssh1.star_lord} rel=H{(ssh1.star_relevant || []).join(",H") || "—"} den=H{(ssh1.star_denial || []).join(",H") || "—"} | Sub {ssh1.sub_lord} rel=H{(ssh1.sub_relevant || []).join(",H") || "—"} den=H{(ssh1.sub_denial || []).join(",H") || "—"}</div>
                )}
                {ssh2.harmony && (
                  <div>• {p2.name}: <span style={{ color: "var(--text)", fontWeight: 600 }}>{ssh2.harmony}</span> · Star {ssh2.star_lord} rel=H{(ssh2.star_relevant || []).join(",H") || "—"} den=H{(ssh2.star_denial || []).join(",H") || "—"} | Sub {ssh2.sub_lord} rel=H{(ssh2.sub_relevant || []).join(",H") || "—"} den=H{(ssh2.sub_denial || []).join(",H") || "—"}</div>
                )}
              </div>
            )}

            {/* 4. Patterns fired */}
            {(patterns1.length || patterns2.length || patternsCouple.length) > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  4. {t("Patterns fired", "నమూనాలు")}
                </div>
                {patternsCouple.length > 0 && (
                  <div style={{ marginBottom: 2 }}>• {t("Couple", "జంట")}: {patternsCouple.map((p) => <span key={p.id} style={{ color: "var(--text)", fontWeight: 600 }}>{p.id} </span>)} — {patternsCouple.map((p) => p.name).join(" | ")}</div>
                )}
                {patterns1.length > 0 && (
                  <div style={{ marginBottom: 2 }}>• {p1.name}: {patterns1.map((p) => <span key={p.id} style={{ color: "var(--text)", fontWeight: 600 }}>{p.id} </span>)} — {patterns1.map((p) => p.name).join(" | ")}</div>
                )}
                {patterns2.length > 0 && (
                  <div style={{ marginBottom: 2 }}>• {p2.name}: {patterns2.map((p) => <span key={p.id} style={{ color: "var(--text)", fontWeight: 600 }}>{p.id} </span>)} — {patterns2.map((p) => p.name).join(" | ")}</div>
                )}
              </div>
            )}

            {/* 5. Clinical flags */}
            {(combust1.is_combust || combust2.is_combust || border1.is_borderline || border2.is_borderline || multi1.signature_present || multi2.signature_present) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  5. {t("Clinical flags", "క్లినికల్ ఫ్లాగ్‌లు")}
                </div>
                {combust1.is_combust && <div>• {p1.name}: H7 CSL <span style={{ color: "#f87171" }}>combust</span> ({combust1.distance_from_sun_deg}° from Sun)</div>}
                {combust2.is_combust && <div>• {p2.name}: H7 CSL <span style={{ color: "#f87171" }}>combust</span> ({combust2.distance_from_sun_deg}° from Sun)</div>}
                {border1.is_borderline && <div>• {p1.name}: H7 <span style={{ color: "#93c5fd" }}>borderline</span> ({border1.current_sub}⇄{border1.alternate_sub}, ~{border1.minutes_of_birth_time} min)</div>}
                {border2.is_borderline && <div>• {p2.name}: H7 <span style={{ color: "#93c5fd" }}>borderline</span> ({border2.current_sub}⇄{border2.alternate_sub}, ~{border2.minutes_of_birth_time} min)</div>}
                {multi1.signature_present && <div>• {p1.name}: <span style={{ color: "#fbbf24" }}>multi-marriage signature</span> ({multi1.basis.replace(/_/g, " ")})</div>}
                {multi2.signature_present && <div>• {p2.name}: <span style={{ color: "#fbbf24" }}>multi-marriage signature</span> ({multi2.basis.replace(/_/g, " ")})</div>}
              </div>
            )}

            {/* 6. Sensitivity tier */}
            {sens.tier && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  6. {t("Sensitivity", "సెన్సిటివిటీ")}
                </div>
                <div>• {t("Effective tier", "ప్రభావవంత స్థాయి")}: <span style={{ color: "var(--text)", fontWeight: 600 }}>{sens.tier}</span> (base {sens.base_tier})</div>
                {sens.escalators_triggered?.length > 0 && (
                  <div>• {t("Escalators", "ఎస్కలేటర్‌లు")}: {sens.escalators_triggered.map((e: string) => e.replace(/_/g, " ")).join(" · ")}</div>
                )}
              </div>
            )}

            {/* 7. Bhavat Bhavam */}
            {(bb1?.applies || bb2?.applies) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  7. {t("Bhavat Bhavam · relative-marriage", "Bhavat Bhavam · బంధువు")}
                </div>
                {bb1?.applies && <div>• {p1.name} for {bb1.relative}: H7 → H{bb1.rotated_house}, CSL {bb1.csl_at_rotated} sigs H{(bb1.sigs || []).join(", H")} — {bb1.flavor_en}</div>}
                {bb2?.applies && <div>• {p2.name} for {bb2.relative}: H7 → H{bb2.rotated_house}, CSL {bb2.csl_at_rotated} sigs H{(bb2.sigs || []).join(", H")} — {bb2.flavor_en}</div>}
              </div>
            )}

            {/* 8. Timing windows */}
            {(overlaps.length > 0 || precision.length > 0) && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  8. {t("Timing windows", "సమయ కిటికీలు")}
                </div>
                {overlaps.slice(0, 3).map((w, i) => (
                  <div key={`o-${i}`}>• AD overlap: <span style={{ color: "var(--text)" }}>{w.start} → {w.end}</span> ({w.duration_days}d) · score {w.combined_score}</div>
                ))}
                {precision.slice(0, 3).map((w, i) => (
                  <div key={`p-${i}`} style={{ color: "var(--text)" }}>• PD+Sookshma: <span style={{ fontWeight: 600 }}>{w.start} → {w.end}</span> ({w.duration_days}d) · strength {w.joint_strength}/4</div>
                ))}
              </div>
            )}

            {/* 9. Confidence breakdown */}
            {breakdown.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  9. {t("Confidence breakdown", "విశ్వాస విభజన")} ({score}/100)
                </div>
                {breakdown.map((b, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>
                    • {b.label}{" "}
                    <span style={{ color: b.delta > 0 ? "#34d399" : b.delta < 0 ? "#f87171" : "var(--muted)", fontWeight: 600 }}>
                      {b.delta > 0 ? "+" : ""}{b.delta}
                    </span>
                    {b.note && <span style={{ opacity: 0.7, fontStyle: "italic" }}> · {b.note}</span>}
                  </div>
                ))}
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
