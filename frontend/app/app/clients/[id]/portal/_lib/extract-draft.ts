/**
 * Smart draft extractor for the AI Drafts Lane (2026-06-03).
 *
 * Goal: when the astrologer clicks "Edit & publish" or "Make public" on
 * an AI Q&A draft, do NOT copy-paste the full 7-section internal KP
 * analysis into the public note. That's overwhelming for the client and
 * leaks engine jargon (RULE-N, Pattern T1, vargottama, CSL, RP-confirmed).
 *
 * Instead we extract two pieces:
 *   1. clientDraft     — what the client should actually read. A short
 *                        plain-English verdict opener + the CLIENT SUMMARY
 *                        section (which the AI already writes in client-
 *                        facing prose).
 *   2. astrologerNote  — 3-5 short bullets the astrologer can OPTIONALLY
 *                        keep below a divider so their future self
 *                        remembers WHY this conclusion was reached
 *                        (CSL chain, current AD/PAD, breakthrough AD,
 *                        engine confidence, dominant pattern code).
 *
 * Approach: parse the markdown by the `### N. SECTION NAME` headings the
 * analyze-stream prompt is known to emit. Best-effort — if section
 * markers are missing (short chat reply, follow-up Q, custom prompt),
 * we degrade gracefully to returning the verbatim answer with
 * hasTemplate=false. Caller then preserves the current copy-paste
 * behaviour, never worse than today.
 *
 * NOTE: this file lives in the frontend only. We deliberately do NOT
 * modify the LLM prompt or backend (those are sacred regions per
 * CLAUDE.md). The extractor is pure rule-based parsing — zero AI cost,
 * deterministic, hot-reloadable.
 */

export interface ExtractedDraft {
  /** What goes in the public-note textarea by default. */
  clientDraft: string;
  /** Bullet list for the astrologer's own records. May be empty. */
  astrologerNote: string;
  /** True when at least 2 known sections were detected — controls
   *  whether the UI shows the "include private notes" toggle and the
   *  "show full original answer" expander. */
  hasTemplate: boolean;
  /** Verbatim original answer, so the UI can show it on demand. */
  fullAnswer: string;
}

// Section names we know the analyze-stream prompt emits, normalised to
// uppercase + parenthetical-suffix stripped. Add new ones here as the
// prompt evolves.
const KNOWN_SECTIONS = new Set([
  "DIRECT VERDICT",
  "CUSPAL EVIDENCE",
  "FRUITFUL SIGNIFICATORS",
  "TIMING WINDOWS",
  "PRATYANTARDASHA",
  "CHART-SPECIFIC GUIDANCE",
  "CLIENT SUMMARY",
]);

const SECTION_HEAD_RE = /^###\s+\d+\.\s+(.+?)\s*$/;

/**
 * Split the answer markdown into a Map<section-name, body>.
 *
 * Section names are normalised: uppercased, any trailing "FOR <topic>"
 * or "(<subtitle>)" stripped. So both
 *   "### 6. CHART-SPECIFIC GUIDANCE FOR DATA ENGINEERING"
 *   "### 5. PRATYANTARDASHA (SATURN AD — CURRENT)"
 * normalise to "CHART-SPECIFIC GUIDANCE" / "PRATYANTARDASHA".
 */
function parseSections(text: string): Map<string, string> {
  const out = new Map<string, string>();
  const lines = text.split(/\r?\n/);
  let currentName: string | null = null;
  let buffer: string[] = [];

  function flush() {
    if (currentName !== null) {
      out.set(currentName, buffer.join("\n").trim());
    }
  }

  for (const line of lines) {
    const m = line.match(SECTION_HEAD_RE);
    if (m) {
      flush();
      const normalised = m[1]
        .toUpperCase()
        .replace(/\s*\(.*?\)\s*$/, "")
        .replace(/\s+FOR\s+.*$/, "")
        .trim();
      currentName = normalised;
      buffer = [];
    } else if (currentName !== null) {
      buffer.push(line);
    }
  }
  flush();
  return out;
}

/**
 * Derive a 1-line plain-English opener from the DIRECT VERDICT section.
 *
 * Maps engine tiers to client-readable openers:
 *   TIER 1/2 STRONGLY PROMISED     → "Bottom line — strongly favourable."
 *   TIER 3 LIKELY / MODERATE        → "Bottom line — moderately favourable."
 *   TIER 4 MIXED / CONDITIONAL      → "Bottom line — the picture is mixed."
 *   TIER 5 DENIED / UNFAVOURABLE    → "Bottom line — your chart does not
 *                                       support this strongly."
 *
 * If nothing matches confidently we return empty string — CLIENT SUMMARY
 * speaks for itself; better silent than mis-classified.
 */
function extractVerdictOpener(verdictBody: string): string {
  if (!verdictBody) return "";
  // Look at the first paragraph (where the tier verdict lives in bold).
  const firstPara = verdictBody.split(/\n\s*\n/)[0] ?? "";
  const lower = firstPara.toLowerCase();

  if (/\bdenied\b|\btier\s*5\b|\bunfavourable\b|\bnot\s+promised\b/.test(lower)) {
    return "Bottom line — your chart does not support this strongly.";
  }
  if (/\bmixed\b|\bconditional\b|\btier\s*4\b/.test(lower)) {
    return "Bottom line — the picture is mixed.";
  }
  if (/\bstrongly promised\b|\bstrongly favourable\b|\btier\s*[12]\b/.test(lower)) {
    return "Bottom line — strongly favourable.";
  }
  if (/\blikely\b|\bmoderate\b|\btier\s*3\b/.test(lower)) {
    return "Bottom line — moderately favourable.";
  }
  return "";
}

/**
 * Compose the astrologer-private reference footer.
 *
 * Each bullet is best-effort — if a piece can't be extracted we just
 * skip that line. An empty footer (no matches at all) tells the UI to
 * hide the toggle entirely.
 */
function buildAstrologerNote(sections: Map<string, string>): string {
  const bullets: string[] = [];

  // ─── CSL chain from CUSPAL EVIDENCE ────────────────────────────────
  // Looks for the pattern: "H10 CSL = Rahu" optionally followed by
  // "(in star of Jupiter, in sub of Venus)". Captures the relevant
  // house number, the CSL, star lord, sub lord.
  const ce = sections.get("CUSPAL EVIDENCE") ?? "";
  const cslMatch = ce.match(
    /\bH(\d{1,2})\s+CSL\s*=\s*\*{0,2}(\w+)\*{0,2}\s*(?:\(in\s+star\s+of\s+(\w+)(?:[^)]*?in\s+sub\s+of\s+(\w+))?[^)]*\))?/i,
  );
  if (cslMatch) {
    const [, hNum, csl, star, sub] = cslMatch;
    let line = `H${hNum} CSL: ${csl}`;
    const parts: string[] = [];
    if (star) parts.push(`${star}-star`);
    if (sub) parts.push(`${sub}-sub`);
    if (parts.length) line += ` (${parts.join(", ")})`;
    bullets.push(`• ${line}`);
  }

  // ─── Current AD from TIMING WINDOWS (table row marked "(current)") ─
  const tw = sections.get("TIMING WINDOWS") ?? "";
  // Match a table row like:
  //   | **Saturn** (current) | Mar 2026 → Jan 2029 | ... |
  const curMatch = tw.match(
    /\|\s*\*{0,2}(\w+)\*{0,2}\s*\(current\)\s*\|\s*([^|]+?)\s*\|/i,
  );
  if (curMatch) {
    bullets.push(`• Current AD: ${curMatch[1]} (${curMatch[2].trim()})`);
  }

  // ─── Breakthrough AD from "PRIMARY WINDOW: <X> AD (<dates>)" ───────
  const primMatch = tw.match(
    /PRIMARY WINDOW[:\s]+\*{0,2}([A-Za-z]+)\s+AD[^*\n]*?\(([^)]+)\)/i,
  );
  if (primMatch) {
    bullets.push(`• Breakthrough: ${primMatch[1]} AD (${primMatch[2].trim()})`);
  }

  // ─── Confidence + Tier + Pattern from DIRECT VERDICT ───────────────
  const dv = sections.get("DIRECT VERDICT") ?? "";
  const confMatch = dv.match(/confidence[:\s]+(\d+)\s*\/\s*100/i);
  const tierMatch = dv.match(/\bTIER\s+(\d+)\b/i);
  // Pattern codes look like D2-LITE, T1, M5, X7-FLEX, etc.
  const patternMatch = dv.match(/\bPattern\s+([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)?)\b/);
  const meta: string[] = [];
  if (tierMatch) meta.push(`Tier ${tierMatch[1]}`);
  if (confMatch) meta.push(`${confMatch[1]}/100`);
  if (patternMatch) meta.push(`Pattern ${patternMatch[1]}`);
  if (meta.length) bullets.push(`• ${meta.join(" · ")}`);

  return bullets.join("\n");
}

/**
 * Main entry point. Pure function — no React, no side effects.
 */
export function extractDraft(answer: string): ExtractedDraft {
  const sections = parseSections(answer);

  // We require at least 2 KNOWN section names to consider this a
  // "templated" answer worth extracting. Stops us from mangling short
  // chat replies that happen to contain a single "### 1. Foo" heading.
  let knownHits = 0;
  for (const name of sections.keys()) {
    if (KNOWN_SECTIONS.has(name)) knownHits += 1;
  }

  if (knownHits < 2) {
    return {
      clientDraft: answer,
      astrologerNote: "",
      hasTemplate: false,
      fullAnswer: answer,
    };
  }

  const verdictOpener = extractVerdictOpener(sections.get("DIRECT VERDICT") ?? "");
  const summary = sections.get("CLIENT SUMMARY") ?? "";

  const clientDraftParts: string[] = [];
  if (verdictOpener) clientDraftParts.push(verdictOpener);
  if (summary) clientDraftParts.push(summary);

  const clientDraft =
    clientDraftParts.length > 0
      ? clientDraftParts.join("\n\n").trim()
      : // Templated answer but no CLIENT SUMMARY emitted — fall back
        // to verbatim so we never publish nothing.
        answer;

  const astrologerNote = buildAstrologerNote(sections);

  return {
    clientDraft,
    astrologerNote,
    hasTemplate: true,
    fullAnswer: answer,
  };
}

/**
 * Stable footer wrapper. Kept in this module so the toggle in
 * ComposerPanel can match it exactly to add/remove without clobbering
 * the astrologer's manual edits.
 */
export const ASTRO_NOTE_DIVIDER =
  "\n\n———————————————————————————————\n📌 Astrologer reference (private — strip before publishing if you like)\n";

export function withAstrologerNote(
  clientText: string,
  astrologerNote: string,
): string {
  if (!astrologerNote.trim()) return clientText;
  // Already appended — leave alone (idempotent).
  if (clientText.includes(ASTRO_NOTE_DIVIDER)) return clientText;
  return clientText + ASTRO_NOTE_DIVIDER + astrologerNote;
}

export function withoutAstrologerNote(text: string): string {
  const idx = text.indexOf(ASTRO_NOTE_DIVIDER);
  if (idx === -1) return text;
  return text.slice(0, idx);
}
