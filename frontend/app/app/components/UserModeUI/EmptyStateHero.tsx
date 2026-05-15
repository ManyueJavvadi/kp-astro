"use client";

/**
 * EmptyStateHero — premium welcome shown before the first question.
 *
 * Two layers:
 *   1. Welcome line that feels personal — uses the user's name + one
 *      chart-derived fact (current dasha) to immediately demonstrate
 *      "this is YOUR chart, not a generic horoscope"
 *   2. Categorized starter questions grouped by life area, mixing
 *      past/present/future so users see this isn't just fortune-telling
 */

import React from "react";

interface Props {
  birthDetails: { name: string };
  currentDasha: any;
  onPickQuestion: (q: string) => void;
}

const STARTERS = [
  {
    label: "Career & Money",
    questions: [
      "When will my income grow?",
      "Am I in the right field?",
      "Will I get a promotion this year?",
    ],
  },
  {
    label: "Relationships",
    questions: [
      "Do I have a partner already?",
      "When will I get married?",
      "What kind of partner fits me?",
    ],
  },
  {
    label: "Past & Present",
    questions: [
      "When did I get my first job?",
      "Why does this period feel hard?",
      "What was I like as a teenager?",
    ],
  },
  {
    label: "Future",
    questions: [
      "Will I move abroad?",
      "When's my next big shift?",
      "What's the best year ahead?",
    ],
  },
];

export function EmptyStateHero({ birthDetails, currentDasha, onPickQuestion }: Props) {
  const md = currentDasha?.mahadasha || currentDasha?.current_mahadasha;
  const ad = currentDasha?.antardasha || currentDasha?.current_antardasha;

  return (
    <div className="user-empty-hero">
      <div className="user-empty-mark" aria-hidden="true">✦</div>

      <h1 className="user-empty-title">
        Welcome, {birthDetails.name.split(" ")[0]}
      </h1>

      <p className="user-empty-sub">
        Your chart is ready.
        {md?.lord && ad?.antardasha_lord && (
          <>
            {" "}You're in <strong>{md.lord}</strong> period
            {ad.antardasha_lord && <> with <strong>{ad.antardasha_lord}</strong> running now.</>}
          </>
        )}
      </p>

      <p className="user-empty-prompt">
        Ask anything — past, present, or the curious things you've wondered about.
      </p>

      <div className="user-empty-categories">
        {STARTERS.map((cat) => (
          <div key={cat.label} className="user-empty-cat">
            <h3 className="user-empty-cat-title">{cat.label}</h3>
            <div className="user-empty-cat-questions">
              {cat.questions.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="user-empty-q"
                  onClick={() => onPickQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
