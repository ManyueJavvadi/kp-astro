"use client";
/**
 * HoraryReasoningTrace — PR H10
 *
 * Collapsible "Full reasoning" panel that lays out the engine's audit
 * trail: every CSL chain step, every multi-cusp confirmation, every
 * RP overlap, every pattern fire, every confidence contribution.
 *
 * Closed by default — astrologer opens it when they want to verify
 * the verdict's claims with the underlying evidence. If they trust the
 * verdict, they ship it; if they don't, they read the trail.
 *
 * Companion: "Astrologer notes" copy-paste block + "Export JSON" button
 * so the astrologer can save the chart to their own records.
 */
import { useState } from "react";
import { ChevronDown, Copy, Check, Download } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type BreakdownItem = { label: string; delta: number; note: string };

type Pattern = {
  id: string;
  name: string;
  evidence: string;
};

type Props = {
  result: any;
};

export default function HoraryReasoningTrace({ result }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!result) return null;
  const v = result.verdict || {};
  const breakdown: BreakdownItem[] = v.confidence_breakdown || [];
  const patterns: Pattern[] = result.patterns_fired || [];
  const ssh = v.star_sub_harmony || {};
  const lv = result.lagna_validity || {};
  const bbc = result.bhavat_bhavam;
  const sens = result.sensitivity || {};

  // Build the astrologer notes block (copy-paste friendly)
  const buildNotes = (): string => {
    const lines: string[] = [];
    lines.push(`Question: "${result.question}"  #${result.prashna_number}`);
    lines.push(
      `Topic: ${result.resolved_topic || result.topic}${
        result.topic_was_aliased ? ` (aliased from "${result.topic}")` : ""
      } · Primary H${result.primary_house}`
    );
    lines.push(
      `Lagna: ${result.lagna?.sign} ${result.lagna?.degree_in_sign?.toFixed(2)}° · ` +
      `Nak ${result.lagna?.nakshatra} · Star ${result.lagna?.star_lord} · Sub ${result.lagna?.sub_lord}`
    );
    lines.push(`Validity: ${lv.state || "—"} (${lv.degree_in_sign?.toFixed(2)}°, window 5°–25°)`);
    if (bbc) {
      lines.push(
        `Bhavat Bhavam: ${bbc.relative_label_en} — relative's H1 = native's H${bbc.native_house_for_relative_h1}; ` +
        `translated yes=${bbc.translated_yes.join(",")} no=${bbc.translated_no.join(",")}`
      );
    }
    lines.push(`Sensitivity: Tier ${sens.tier || 1}${sens.escalators_triggered?.length ? ` (escalated by: ${sens.escalators_triggered.slice(0,3).join("/")})` : ""}`);
    lines.push("");
    lines.push(
      `Verdict: ${v.verdict} · ${v.confidence}${
        typeof v.confidence_score === "number" ? ` (${v.confidence_score}/100)` : ""
      }`
    );
    if (ssh.harmony) {
      lines.push(
        `Star-Sub Harmony: ${ssh.harmony} (Star ${ssh.star_lord}: rel=${(ssh.star_relevant||[]).join(",") || "—"}, ` +
        `den=${(ssh.star_denial||[]).join(",") || "—"} | Sub ${ssh.sub_lord}: rel=${(ssh.sub_relevant||[]).join(",") || "—"}, ` +
        `den=${(ssh.sub_denial||[]).join(",") || "—"})`
      );
    }
    lines.push(`Primary CSL: ${v.query_csl} signifies H${(v.query_csl_significations||[]).join(", H")}`);
    lines.push(`Lagna CSL: ${v.lagna_csl} signifies H${(v.lagna_csl_significations||[]).join(", H")}`);
    if (v.ruling_planets?.length) {
      lines.push(
        `RPs (7-slot): ${(v.ruling_planets as string[]).join(", ")} | ` +
        `Topic-confirming: ${(v.rp_signifying_yes || []).join(", ") || "—"}`
      );
    }
    if (patterns.length) {
      lines.push(`Patterns fired: ${patterns.map(p => `${p.id} (${p.name})`).join(" | ")}`);
    }
    lines.push("");
    lines.push(`Generated: ${new Date().toISOString().replace("T"," ").slice(0,19)} UTC`);
    return lines.join("\n");
  };

  const notesText = buildNotes();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notesText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable in some contexts */
    }
  };

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `horary_${result.prashna_number}_${(result.resolved_topic||"general").replace(/\s+/g,"_")}.json`;
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
          <div style={{ padding: "10px 16px 16px", borderTop: "0.5px solid var(--border2)", fontSize: 11.5, color: "var(--muted)", lineHeight: 1.65, fontFamily: "ui-monospace, monospace" }}>
            {/* 1. Topic + Bhavat Bhavam */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>1. {t("Topic resolution", "టాపిక్ నిర్ణయం")}</div>
              <div>• {t("Asked topic", "అడిగిన టాపిక్")}: <span style={{ color: "var(--text)" }}>{result.topic}</span></div>
              <div>• {t("Resolved canonical", "నిర్ణీత")}: <span style={{ color: "var(--text)" }}>{result.resolved_topic}</span></div>
              <div>• {t("Primary house", "ప్రాథమిక భావం")}: H{result.primary_house}</div>
              <div>• {t("Yes houses", "అనుకూల భావాలు")}: <span style={{ color: "#34d399" }}>H{(result.topic_houses?.yes || []).join(", H")}</span></div>
              <div>• {t("No houses", "నిరాకరణ భావాలు")}: <span style={{ color: "#f87171" }}>H{(result.topic_houses?.no || []).join(", H")}</span></div>
              {bbc && (
                <div style={{ marginTop: 4, color: "#fb923c" }}>
                  • Bhavat Bhavam: relative={bbc.relative_label_en}, native H{bbc.native_house_for_relative_h1} = relative's H1
                </div>
              )}
            </div>

            {/* 2. CSL chain */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                2. {t("CSL chain (4-step UNION)", "CSL చైన్ (4-స్థాయి UNION)")}
              </div>
              <div>• {t("Lagna CSL", "లగ్న CSL")} {v.lagna_csl}: signifies H{(v.lagna_csl_significations || []).join(", H")}</div>
              <div>• {t("Primary CSL", "ప్రాథమిక CSL")} {v.query_csl} (H{result.primary_house}): signifies H{(v.query_csl_significations || []).join(", H")}</div>
            </div>

            {/* 3. Star-Sub Harmony */}
            {ssh.harmony && ssh.harmony !== "NEUTRAL" && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  3. {t("Star-Sub Harmony", "నక్షత్రం-సబ్ సమన్వయం")}
                </div>
                <div>• STAR layer ({ssh.star_lord}): rel=H{(ssh.star_relevant || []).join(",H") || "—"}, den=H{(ssh.star_denial || []).join(",H") || "—"}</div>
                <div>• SUB layer ({ssh.sub_lord}): rel=H{(ssh.sub_relevant || []).join(",H") || "—"}, den=H{(ssh.sub_denial || []).join(",H") || "—"}</div>
                <div>• Verdict: <span style={{ color: "var(--text)", fontWeight: 600 }}>{ssh.harmony}</span></div>
                <div style={{ fontStyle: "italic", opacity: 0.85 }}>• {ssh.note}</div>
              </div>
            )}

            {/* 4. Ruling Planets */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                4. {t("Ruling Planets (7-slot)", "నియమ గ్రహాలు (7-స్థానాలు)")}
              </div>
              <div>• {t("All RPs", "అన్ని RPs")}: {(v.ruling_planets || []).join(", ")}</div>
              <div>• {t("Topic-confirming RPs", "టాపిక్‌ను నిర్ధారించే RPs")}: <span style={{ color: "#34d399" }}>{(v.rp_signifying_yes || []).join(", ") || "—"}</span></div>
            </div>

            {/* 5. Patterns fired */}
            {patterns.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  5. {t("Patterns fired", "నమూనాలు")}
                </div>
                {patterns.map((p, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>• <span style={{ color: "var(--text)", fontWeight: 600 }}>{p.id}</span> — {p.name}</div>
                ))}
              </div>
            )}

            {/* 6. Confidence breakdown */}
            {breakdown.length > 0 && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                  6. {t("Confidence breakdown", "విశ్వాస విభజన")} ({v.confidence_score}/100)
                </div>
                {breakdown.map((b, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>
                    • {b.label} <span style={{ color: b.delta > 0 ? "#34d399" : b.delta < 0 ? "#f87171" : "var(--muted)", fontWeight: 600 }}>{b.delta > 0 ? "+" : ""}{b.delta}</span>
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
