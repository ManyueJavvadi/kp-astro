// PR R4 (Phase A foundation refactor) — TOPICS + TOPIC_EMOJI moved out of
// page.tsx into this shared module so AnalysisTab (extracted in R4) and
// page.tsx's handleTopicAnalysis handler can both import them without
// drift risk.
//
// Why extract: the pre-R4 page.tsx defined these inside the component
// function body (lines 1214-1231). Used by both:
//   - handleTopicAnalysis (line 982) — needs TOPICS to look up topic labels
//   - AnalysisTab JSX (multiple lines) — needs TOPICS for chips, TOPIC_EMOJI
//     for emoji display
// Single source of truth here.

export interface Topic {
  id: string;
  en: string;
  te: string;
}

// Phase 11 / PR 28 — added Finance + Legal so the Analysis grid matches
// the canonical Horary topic set (10 topics across both surfaces).
export const TOPICS: Topic[] = [
  { id: "marriage",       en: "Marriage",      te: "వివాహం" },
  { id: "job",            en: "Career",        te: "ఉద్యోగం" },
  { id: "health",         en: "Health",        te: "ఆరోగ్యం" },
  { id: "foreign_travel", en: "Foreign travel", te: "విదేశాలు" },
  { id: "children",       en: "Children",      te: "సంతానం" },
  { id: "education",      en: "Education",     te: "విద్య" },
  { id: "property",       en: "Property",      te: "ఆస్తి" },
  { id: "wealth",         en: "Wealth",        te: "సంపద" },
  { id: "finance",        en: "Finance",       te: "ధనం" },
  { id: "legal",          en: "Legal",         te: "న్యాయం" },
];

export const TOPIC_EMOJI: Record<string, string> = {
  marriage: "💍", job: "💼", health: "🏥", foreign_travel: "✈️",
  children: "👶", education: "📚", property: "🏠", wealth: "💰",
  finance: "💵", legal: "⚖️",
};
