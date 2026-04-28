"use client";

/**
 * ActiveAnalysisPanel — dynamic per-question context card.
 *
 * Updates each time the user asks a new question. Shows what the
 * engine is currently looking at: topic, relevant houses, key planets,
 * confidence score. This replaces the "Test accuracy" widget concept —
 * instead of a separate tool, the panel makes the chart's reasoning
 * visible in real time as the user converses.
 *
 * Empty state (before first question): subtle prompt nudging the user
 * to ask something.
 */

import React from "react";
import { TrendingUp, Compass } from "lucide-react";

interface Props {
  analysis: any;
  question: string | null;
}

export function ActiveAnalysisPanel({ analysis, question }: Props) {
  if (!analysis) {
    return (
      <section className="user-card user-active-empty">
        <h3 className="user-card-title">Active Question</h3>
        <div className="user-active-empty-body">
          <Compass size={18} />
          <p>Once you ask a question, this panel will show what your chart is looking at — relevant houses, key planets, and the confidence score.</p>
        </div>
      </section>
    );
  }

  const adv = analysis?.advanced_compute || {};
  const ds = analysis?.decision_support || {};
  const score = ds.score;
  const verdict = ds.verdict;
  const topic = adv.topic;
  const relevantHouses: number[] = adv.relevant_houses || [];
  const denialHouses: number[] = adv.denial_houses || [];
  const primaryCSL = adv.primary_csl;

  // Extract key planets — use star_sub_harmony / fruitful significators
  const keyPlanets: string[] = (() => {
    const out: Set<string> = new Set();
    const harmony = adv.star_sub_harmony;
    if (harmony?.self_lord) out.add(harmony.self_lord);
    if (harmony?.star_lord) out.add(harmony.star_lord);
    if (harmony?.sub_lord) out.add(harmony.sub_lord);
    if (primaryCSL) out.add(primaryCSL);
    const fruitful = adv.fruitful_significators || [];
    fruitful.slice(0, 3).forEach((p: string) => out.add(p));
    return Array.from(out).slice(0, 5);
  })();

  return (
    <section className="user-card user-active">
      <h3 className="user-card-title">Active Question</h3>

      {question && (
        <p className="user-active-q" title={question}>
          "{question.length > 110 ? question.slice(0, 107) + "..." : question}"
        </p>
      )}

      {topic && (
        <div className="user-active-row">
          <span className="user-active-key">Topic</span>
          <span className="user-active-val">{topic.replace(/_/g, " ")}</span>
        </div>
      )}

      {relevantHouses.length > 0 && (
        <div className="user-active-row">
          <span className="user-active-key">Houses</span>
          <span className="user-active-val">
            {relevantHouses.map((h: number) => (
              <span key={h} className="user-house-pill">H{h}</span>
            ))}
            {denialHouses.length > 0 && (
              <span className="user-active-deny">
                · denial: {denialHouses.map((h: number) => `H${h}`).join(", ")}
              </span>
            )}
          </span>
        </div>
      )}

      {keyPlanets.length > 0 && (
        <div className="user-active-row">
          <span className="user-active-key">Key planets</span>
          <span className="user-active-val">
            {keyPlanets.map((p: string) => (
              <span key={p} className="user-planet-pill">{p}</span>
            ))}
          </span>
        </div>
      )}

      {score != null && (
        <div className="user-active-confidence">
          <div className="user-active-conf-row">
            <span className="user-active-key">
              <TrendingUp size={12} /> Confidence
            </span>
            <span className="user-active-conf-num">{Math.round(score)}/100</span>
          </div>
          <div className="user-active-conf-bar">
            <div
              className="user-active-conf-fill"
              style={{ width: `${Math.max(2, Math.min(100, score))}%` }}
            />
          </div>
          {verdict && <span className="user-active-verdict">{verdict}</span>}
        </div>
      )}
    </section>
  );
}
