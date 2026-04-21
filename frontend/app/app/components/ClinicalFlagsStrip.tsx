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
 */
import { useState } from "react";
import { Check, AlertTriangle, XCircle, ChevronDown } from "lucide-react";

export type ClinicalFlag = {
  tone: "green" | "yellow" | "red";
  code: string;
  label: string;
  detail: string;
};

const ICONS = {
  green: Check,
  yellow: AlertTriangle,
  red: XCircle,
} as const;

export default function ClinicalFlagsStrip({ flags }: { flags: ClinicalFlag[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!flags || flags.length === 0) return null;

  return (
    <div className="clinical-flags-card">
      <div className="clinical-flags-head">
        <div className="clinical-flags-eyebrow">Clinical indicators</div>
        <div className="clinical-flags-sub">
          A 5-second scan of what an experienced KP astrologer would notice at a glance.
          These do not change the verdict — they give it context.
        </div>
      </div>
      <div className="clinical-flags-list">
        {flags.map((f) => {
          const Icon = ICONS[f.tone];
          const isOpen = expanded === f.code;
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
              <span className="clinical-flag-label">{f.label}</span>
              <ChevronDown size={12} className={`clinical-flag-chev${isOpen ? " is-open" : ""}`} aria-hidden />
              {isOpen && (
                <div className="clinical-flag-detail" role="region">
                  {f.detail}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
