"use client";

/**
 * renderWithEntityChips — convert plain text into React nodes with
 * inline EntityChip wrappers for detected KP entities.
 *
 * Part of Phase 9.5 mobile cross-reference design language.
 * See `.claude/research/mobile-cross-reference-design.md` §1.⑥.
 *
 * Use this helper inside react-markdown's `components.text` (or
 * similar) to inject entity chips without re-writing the markdown
 * pipeline. The parser ignores text inside <code>/<pre> blocks by
 * convention — caller is responsible for routing markdown text
 * properly (code/links don't go through this).
 */

import React from "react";
import EntityChip from "./EntityChip";
import { parseEntityChips } from "../../lib/selection/entityChipParser";

/**
 * Tokenize a string and emit a React fragment with chips inline.
 *
 * Returns a stable React.ReactNode (a Fragment). The output is safe
 * to use inside any text-receiving slot (paragraphs, list items,
 * table cells, etc.) — chips render as inline buttons with
 * vertical-align: baseline so they sit cleanly in the flow.
 */
export default function renderWithEntityChips(
  text: string,
  keyPrefix: string = "",
): React.ReactNode {
  if (!text) return null;
  const tokens = parseEntityChips(text);
  // Fast path: if there are no chips, just return the text as-is.
  // Saves an array map + Fragment wrap on the common case where AI
  // answer text doesn't mention any KP entity.
  if (tokens.length === 1 && tokens[0].kind === "text") return text;
  return (
    <>
      {tokens.map((t, i) =>
        t.kind === "text"
          ? <React.Fragment key={`${keyPrefix}t${i}`}>{t.text}</React.Fragment>
          : (
            <EntityChip key={`${keyPrefix}c${i}`} entity={t.entity}>
              {t.text}
            </EntityChip>
          ),
      )}
    </>
  );
}
