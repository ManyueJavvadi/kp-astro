"use client";

/**
 * HeroVerdictCard — premium AI response card for user mode.
 *
 * Visual hierarchy:
 *   1. VERDICT TIER (PROMISED / CONDITIONAL / DENIED) — large, serif, gold
 *   2. Confidence bar (animated 0 -> score on mount)
 *   3. Headline reason — 1 short line (extracted or first sentence of answer)
 *   4. Full answer — markdown, plain English (collapsible, expanded by default)
 *   5. Suggested follow-up chips (when applicable)
 *   6. Feedback row (passed in as children from parent)
 */

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";

interface Props {
  analysis: any;
  answer: string;
  timestamp: string;
  isLatest: boolean;
  children?: React.ReactNode; // feedback row from parent
}

// Map decision_support verdict → user-mode verdict tier (plain English)
function mapVerdictTier(analysis: any): { tier: string; tone: "go" | "lean" | "wait" | "no" } {
  const ds = analysis?.decision_support;
  const verdict = (ds?.verdict || "").toUpperCase();
  if (verdict.includes("STRONG GO") || verdict === "GO") return { tier: "STRONGLY PROMISED", tone: "go" };
  if (verdict.includes("LEAN GO")) return { tier: "PROMISED", tone: "lean" };
  if (verdict.includes("WAIT") || verdict.includes("CONDITIONAL")) return { tier: "CONDITIONAL", tone: "wait" };
  if (verdict.includes("NO GO") || verdict.includes("DENIED")) return { tier: "NOT PROMISED", tone: "no" };
  // Fall back to promise_analysis if decision_support absent
  const promised = analysis?.promise_analysis?.is_promised;
  if (promised === true) return { tier: "PROMISED", tone: "lean" };
  if (promised === false) return { tier: "NOT PROMISED", tone: "no" };
  return { tier: "ANALYSIS", tone: "lean" };
}

// Suggested follow-ups, topic-aware
function suggestFollowUps(analysis: any): string[] {
  const topic = (analysis?.advanced_compute?.topic || "").toLowerCase();
  const map: Record<string, string[]> = {
    marriage: ["When exactly?", "What kind of partner?", "Will it be smooth?"],
    job: ["When will I get an offer?", "Will the salary be good?", "What field fits me?"],
    career: ["When does it shift?", "What field fits me best?", "Salary outlook?"],
    health: ["What should I watch for?", "Is there anything chronic?", "When is the risk window?"],
    foreign_travel: ["Will I settle abroad?", "When?", "Which country fits me?"],
    foreign_settle: ["When does the move happen?", "Will it stick?", "Should I prepare?"],
    children: ["When?", "How many?", "Anything to watch?"],
    education: ["What should I study?", "Will I go abroad for it?", "When does it land?"],
    wealth: ["When does income jump?", "Will I save well?", "What about debt?"],
    property: ["When can I buy?", "Will I own multiple?", "Any blockers?"],
  };
  return map[topic] || ["What's next?", "When does this period end?", "What should I do now?"];
}

export function HeroVerdictCard({ analysis, answer, timestamp, isLatest, children }: Props) {
  const [confAnim, setConfAnim] = useState(0);
  const [showFull, setShowFull] = useState(true);

  const verdictMap = mapVerdictTier(analysis);
  const score = analysis?.decision_support?.score ?? null;
  const dasha = analysis?.current_dasha;
  const adv = analysis?.advanced_compute;
  const followUps = suggestFollowUps(analysis);

  // Animate confidence bar 0 -> score on mount
  useEffect(() => {
    if (score == null) return;
    const t = setTimeout(() => setConfAnim(score), 120);
    return () => clearTimeout(t);
  }, [score]);

  // Headline — first sentence of answer (or strip markdown intro)
  const headline = (() => {
    if (!answer) return "";
    const firstPara = answer.split(/\n\n/)[0] || answer;
    const stripped = firstPara.replace(/[#*_`]/g, "").trim();
    if (stripped.length <= 180) return stripped;
    const firstSent = stripped.match(/^[^.!?]+[.!?]/);
    return firstSent ? firstSent[0].trim() : stripped.slice(0, 180) + "...";
  })();

  return (
    <article className={`user-verdict-card user-verdict-${verdictMap.tone}`}>
      {/* Tier band */}
      <div className="user-verdict-tier-row">
        <span className="user-verdict-tier-icon"><Sparkles size={13} /></span>
        <span className="user-verdict-tier">{verdictMap.tier}</span>
        {score != null && (
          <span className="user-verdict-conf">{Math.round(score)}/100</span>
        )}
      </div>

      {/* Confidence bar (animated) */}
      {score != null && (
        <div className="user-conf-bar">
          <div
            className={`user-conf-fill user-conf-${verdictMap.tone}`}
            style={{ width: `${Math.max(2, Math.min(100, confAnim))}%` }}
          />
        </div>
      )}

      {/* Headline reason */}
      {headline && <p className="user-verdict-headline">{headline}</p>}

      {/* Quick context strip — current dasha + active topic */}
      <div className="user-verdict-meta-strip">
        {adv?.topic && (
          <span className="user-verdict-chip">
            <span className="user-chip-key">Topic</span>
            <span className="user-chip-val">{adv.topic.replace(/_/g, " ")}</span>
          </span>
        )}
        {dasha?.mahadasha?.lord && (
          <span className="user-verdict-chip">
            <span className="user-chip-key">Now</span>
            <span className="user-chip-val">
              {dasha.mahadasha.lord}
              {dasha.antardasha && ` → ${dasha.antardasha.antardasha_lord}`}
            </span>
          </span>
        )}
        {adv?.relevant_houses?.length > 0 && (
          <span className="user-verdict-chip">
            <span className="user-chip-key">Houses</span>
            <span className="user-chip-val">{adv.relevant_houses.map((h: number) => `H${h}`).join(", ")}</span>
          </span>
        )}
      </div>

      {/* Full answer (collapsible) */}
      <button
        type="button"
        className="user-verdict-toggle"
        onClick={() => setShowFull(!showFull)}
        aria-expanded={showFull}
      >
        {showFull ? "▾ Hide reasoning" : "▸ Show full reasoning"}
      </button>
      {showFull && (
        <div className="user-verdict-body markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
        </div>
      )}

      {/* Suggested follow-ups (only on latest message) */}
      {isLatest && followUps.length > 0 && (
        <div className="user-followups">
          <span className="user-followups-label">Quick follow-ups</span>
          <div className="user-followup-chips">
            {followUps.map((q) => (
              <FollowUpChip key={q} q={q} />
            ))}
          </div>
        </div>
      )}

      {/* Footer: timestamp + feedback row (children) */}
      <div className="user-verdict-footer">
        <span className="user-verdict-timestamp">{timestamp}</span>
      </div>
      {children}
    </article>
  );
}

// Click → fills the input box (uses a custom event so we don't need
// to thread setQuestion through every chip).
function FollowUpChip({ q }: { q: string }) {
  const handleClick = () => {
    const evt = new CustomEvent("user-followup-click", { detail: q });
    window.dispatchEvent(evt);
  };
  return (
    <button type="button" className="user-followup-chip" onClick={handleClick}>
      {q}
    </button>
  );
}
