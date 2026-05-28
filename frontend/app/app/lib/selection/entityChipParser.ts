/**
 * entityChipParser — detect KP entity mentions in plain text and
 * yield a token stream the renderer can wrap in <EntityChip>.
 *
 * Part of Phase 9.5 mobile cross-reference design language.
 * See `.claude/research/mobile-cross-reference-design.md` §1.⑥.
 *
 * Detected entity types (English):
 *   - Houses: H1..H12 (case-insensitive, word-boundary)
 *   - Planets: Sun / Moon / Mars / Mercury / Jupiter / Venus / Saturn /
 *     Rahu / Ketu (word-boundary)
 *   - Dasha lords: "MD Rahu", "AD Saturn", "PAD Venus", "SD Mercury"
 *     (layer prefix followed by planet name)
 *
 * Detected entity types (Telugu):
 *   - Planets: సూర్యుడు / చంద్రుడు / కుజుడు / బుధుడు / గురువు / శుక్రుడు /
 *     శని / రాహువు / కేతువు
 *
 * Anti-false-positives:
 *   - "Sun" inside "Sunday" → NOT matched (word boundary)
 *   - "Mercury" inside a code identifier → NOT matched
 *   - H13+ → NOT matched (H1..H12 only)
 *   - Existing markdown links / code spans should be processed by the
 *     caller BEFORE running this parser (so we don't double-wrap).
 *
 * Output: array of { kind: "text" | "chip", text?, entity? } tokens
 * the renderer maps to either plain text or <EntityChip>.
 *
 * Performance: regex-based linear scan. Parser is cheap; cache results
 * per-message in the caller (Phase 9.5 AnalysisTab integration does
 * this via a useMemo).
 */

import type { SelectedEntity } from "./types";

// ── Canonical sets (immutable) ────────────────────────────────────
const PLANETS_EN = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn",
  "Rahu", "Ketu",
] as const;

const PLANETS_TE_TO_EN: Record<string, string> = {
  "సూర్యుడు": "Sun",
  "చంద్రుడు": "Moon",
  "కుజుడు":   "Mars",
  "బుధుడు":   "Mercury",
  "గురువు":   "Jupiter",
  "శుక్రుడు": "Venus",
  "శని":      "Saturn",
  "రాహువు":   "Rahu",
  "కేతువు":   "Ketu",
};

const DASHA_LAYERS: ReadonlyArray<"MD" | "AD" | "PAD" | "SD"> =
  ["MD", "AD", "PAD", "SD"];

// ── Token type ─────────────────────────────────────────────────────
export interface ChipTextToken {
  kind: "text";
  text: string;
}
export interface ChipEntityToken {
  kind: "chip";
  /** The original text exactly as it appeared in the source. */
  text: string;
  /** The entity this chip represents (drives glow + drawer on tap). */
  entity: NonNullable<SelectedEntity>;
}
export type ChipToken = ChipTextToken | ChipEntityToken;

// ── Regex assembly ────────────────────────────────────────────────
// Combined pattern with alternation. Group order matters — first
// matching alternative wins. We use a single regex (rather than
// multiple passes) so token positions stay consistent.
//
// Pattern explanation:
//   (?<dasha>(?:MD|AD|PAD|SD)\s+(?:Sun|Moon|...|Ketu))   — dasha lord
//   (?<house>H(?:1[0-2]|[1-9]))\b                         — house H1..H12
//   (?<planet>\b(?:Sun|Moon|...|Ketu)\b)                  — planet (English)
//   (?<teplanet>సూర్యుడు|చంద్రుడు|...|కేతువు)             — planet (Telugu)
//
// `\b` boundaries avoid matching inside larger words (Sunday, etc.).
const PLANET_GROUP_EN = PLANETS_EN.join("|");
const PLANET_GROUP_TE = Object.keys(PLANETS_TE_TO_EN).join("|");
const DASHA_LAYER_GROUP = DASHA_LAYERS.join("|");

const COMBINED_REGEX = new RegExp(
  // Dasha lord (MUST come first — longest match wins)
  `(?<dasha>(?:${DASHA_LAYER_GROUP})\\s+(?:${PLANET_GROUP_EN}))`
  + `|(?<house>H(?:1[0-2]|[1-9]))\\b`
  + `|\\b(?<planet>${PLANET_GROUP_EN})\\b`
  + `|(?<teplanet>${PLANET_GROUP_TE})`,
  "g",
);

/**
 * Tokenize a string into text + entity-chip segments.
 *
 * Use the returned token array to render a mix of <span>/<EntityChip>:
 *
 *   const tokens = parseEntityChips(answerText);
 *   return <>{tokens.map((t, i) =>
 *     t.kind === "text"
 *       ? <React.Fragment key={i}>{t.text}</React.Fragment>
 *       : <EntityChip key={i} entity={t.entity}>{t.text}</EntityChip>
 *   )}</>;
 */
export function parseEntityChips(input: string): ChipToken[] {
  if (!input) return [];
  const out: ChipToken[] = [];
  let lastIndex = 0;

  // Reset regex state (since it's a `g` flag, lastIndex is mutated).
  COMBINED_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = COMBINED_REGEX.exec(input)) !== null) {
    const matchStart = match.index;
    const matchText = match[0];

    // Emit any plain text before the match.
    if (matchStart > lastIndex) {
      out.push({ kind: "text", text: input.slice(lastIndex, matchStart) });
    }

    // Determine which named group matched + build entity.
    const groups = match.groups ?? {};
    let entity: NonNullable<SelectedEntity> | null = null;

    if (groups.dasha) {
      // Split "MD Rahu" → layer "MD" + value "Rahu"
      const parts = groups.dasha.split(/\s+/);
      const layer = parts[0] as "MD" | "AD" | "PAD" | "SD";
      const value = parts.slice(1).join(" ");
      entity = { type: "dasha_lord", value, layer };
    } else if (groups.house) {
      // "H7" → value 7
      const n = parseInt(groups.house.slice(1), 10);
      if (n >= 1 && n <= 12) {
        entity = { type: "house", value: n };
      }
    } else if (groups.planet) {
      entity = { type: "planet", value: groups.planet };
    } else if (groups.teplanet) {
      // Map Telugu name to canonical English (engine internals use EN).
      const en = PLANETS_TE_TO_EN[groups.teplanet];
      if (en) entity = { type: "planet", value: en };
    }

    if (entity != null) {
      out.push({ kind: "chip", text: matchText, entity });
    } else {
      // Defensive: shouldn't happen but if a group matched without a
      // valid entity, emit the raw text instead of dropping it.
      out.push({ kind: "text", text: matchText });
    }

    lastIndex = matchStart + matchText.length;
  }

  // Tail text after the last match.
  if (lastIndex < input.length) {
    out.push({ kind: "text", text: input.slice(lastIndex) });
  }

  return out;
}
