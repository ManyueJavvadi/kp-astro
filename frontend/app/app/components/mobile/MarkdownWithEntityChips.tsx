"use client";

/**
 * MarkdownWithEntityChips — drop-in replacement for <ReactMarkdown>
 * that injects EntityChips into KP entity mentions.
 *
 * Part of Phase 9.5 mobile cross-reference design language.
 * See `.claude/research/mobile-cross-reference-design.md` §1.⑥.
 *
 * Strategy: override react-markdown's `components.p / li / td /
 * strong / em / blockquote` to post-process their string children
 * with renderWithEntityChips. Non-string children (nested formatting
 * like <strong><em>...) recurse via React.Children.map so chips can
 * appear inside bold/italic spans too.
 *
 * `code` and `pre` are NOT processed — code blocks should never get
 * chip wrapping (would break syntax + intent). They render normally.
 *
 * Drop-in usage:
 *   <MarkdownWithEntityChips remarkPlugins={[remarkGfm]}>
 *     {msg.a}
 *   </MarkdownWithEntityChips>
 *
 * Performance: parser is cheap (linear regex scan). For very long
 * answers (3000+ tokens), wrap the rendered output in React.memo on
 * `msg.a` to avoid re-parsing on every render.
 */

import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { PluggableList } from "unified";
import renderWithEntityChips from "./renderWithEntityChips";

interface Props {
  children: string;
  remarkPlugins?: PluggableList;
}

/**
 * Recursively process React children, replacing string children with
 * the chip-enriched rendering.
 */
function withChips(
  children: React.ReactNode,
  keyPrefix: string,
): React.ReactNode {
  return React.Children.map(children, (child, idx) => {
    if (typeof child === "string") {
      return renderWithEntityChips(child, `${keyPrefix}-${idx}-`);
    }
    if (React.isValidElement(child) && (child.props as { children?: React.ReactNode })?.children) {
      // Recurse into nested formatting (e.g., <strong><em>Venus</em></strong>).
      // We rebuild the element with chip-processed children.
      return React.cloneElement(
        child as React.ReactElement<{ children?: React.ReactNode }>,
        {},
        withChips((child.props as { children?: React.ReactNode }).children, `${keyPrefix}-${idx}-`),
      );
    }
    return child;
  });
}

// Standard slot overrides. Each slot processes its string children.
const components: Components = {
  p: ({ children, ...rest }) => <p {...rest}>{withChips(children, "p")}</p>,
  li: ({ children, ...rest }) => <li {...rest}>{withChips(children, "li")}</li>,
  td: ({ children, ...rest }) => <td {...rest}>{withChips(children, "td")}</td>,
  th: ({ children, ...rest }) => <th {...rest}>{withChips(children, "th")}</th>,
  strong: ({ children, ...rest }) => <strong {...rest}>{withChips(children, "s")}</strong>,
  em:     ({ children, ...rest }) => <em     {...rest}>{withChips(children, "e")}</em>,
  blockquote: ({ children, ...rest }) => <blockquote {...rest}>{withChips(children, "bq")}</blockquote>,
  // h1..h6: ALSO process so headings like "## H7 Cuspal Chain" get chips
  h1: ({ children, ...rest }) => <h1 {...rest}>{withChips(children, "h1")}</h1>,
  h2: ({ children, ...rest }) => <h2 {...rest}>{withChips(children, "h2")}</h2>,
  h3: ({ children, ...rest }) => <h3 {...rest}>{withChips(children, "h3")}</h3>,
  h4: ({ children, ...rest }) => <h4 {...rest}>{withChips(children, "h4")}</h4>,
  h5: ({ children, ...rest }) => <h5 {...rest}>{withChips(children, "h5")}</h5>,
  h6: ({ children, ...rest }) => <h6 {...rest}>{withChips(children, "h6")}</h6>,
  // `code` and `pre` are INTENTIONALLY not overridden — they render
  // unchanged. We never want chips inside fenced or inline code.
};

export default function MarkdownWithEntityChips({ children, remarkPlugins }: Props) {
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
      {children}
    </ReactMarkdown>
  );
}
