"use client";
/**
 * PR A1.1d — Clinical flags strip. The astrologer's 5-second scan.
 *
 * Shows a curated list of green/yellow/red indicators computed by the
 * backend's _compute_clinical_flags. Each flag has a tone, label, and a
 * longer `detail` that appears in a tooltip on hover / tap on mobile.
 *
 * Engine-wise these are PURELY presentational — they read facts from the
 * same horary response the verdict card uses. They never mutate the
 * verdict/confidence values.
 *
 * PR H11 — bilingual support. Backend now emits label_en/label_te +
 * detail_en/detail_te alongside the legacy label/detail strings. This
 * component picks the localized variant when language is Telugu; falls
 * back to legacy fields for flags that don't have bilingual versions yet.
 */
import { useState } from "react";
import { Check, AlertTriangle, XCircle, ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export type ClinicalFlag = {
  tone: "green" | "yellow" | "red";
  code: string;
  label: string;             // legacy English string (always present)
  detail: string;            // legacy English string
  label_en?: string;         // PR H11 — explicit English
  label_te?: string;         // PR H11 — Telugu
  detail_en?: string;        // PR H11
  detail_te?: string;        // PR H11
};

const ICONS = {
  green: Check,
  yellow: AlertTriangle,
  red: XCircle,
} as const;

function pickLabel(f: ClinicalFlag, lang: string): string {
  if (lang === "te" && f.label_te) return f.label_te;
  return f.label_en ?? f.label;
}

function pickDetail(f: ClinicalFlag, lang: string): string {
  if (lang === "te" && f.detail_te) return f.detail_te;
  return f.detail_en ?? f.detail;
}

export default function ClinicalFlagsStrip({ flags }: { flags: ClinicalFlag[] }) {
  const { t, lang } = useLanguage();
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!flags || flags.length === 0) return null;

  return (
    <div className="clinical-flags-card">
      <div className="clinical-flags-head">
        <div className="clinical-flags-eyebrow">
          {t("Clinical indicators", "క్లినికల్ సూచికలు")}
        </div>
        <div className="clinical-flags-sub">
          {t(
            "A 5-second scan of what an experienced KP astrologer would notice at a glance. These do not change the verdict — they give it context.",
            "అనుభవజ్ఞుడైన KP జ్యోతిష్కుడు ఒక చూపులో గమనించే వాటి 5-సెకన్ల స్కాన్. ఇవి తీర్పును మార్చవు — సందర్భాన్ని ఇస్తాయి."
          )}
        </div>
      </div>
      <div className="clinical-flags-list">
        {flags.map((f) => {
          const Icon = ICONS[f.tone];
          const isOpen = expanded === f.code;
          const labelText = pickLabel(f, lang);
          const detailText = pickDetail(f, lang);
          return (
            <button
              key={f.code}
              className={`clinical-flag-row tone-${f.tone}${isOpen ? " is-open" : ""}`}
              onClick={() => setExpanded(isOpen ? null : f.code)}
              aria-expanded={isOpen}
              type="button"
            >
              <span className={`clinical-flag-dot tone-${f.tone}`} aria-hidden>
                <Icon size={12} strokeWidth={2.2} />
              </span>
              <span className="clinical-flag-label">{labelText}</span>
              <ChevronDown size={12} className={`clinical-flag-chev${isOpen ? " is-open" : ""}`} aria-hidden />
              {isOpen && (
                <div className="clinical-flag-detail" role="region">
                  {detailText}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
