"use client";

/**
 * MemoMarkdown — ReactMarkdown that does not re-parse on every render.
 *
 * WHY (PR A1.15): the AI chat rendered `analysisMessages.map(...)` with a
 * raw <ReactMarkdown> per message and no memoisation anywhere. Every SSE
 * chunk mutates the messages array, so each chunk re-parsed and re-rendered
 * the markdown of EVERY message in the conversation — roughly 50x a second,
 * with cost growing linearly in chat length. Message 10 of a long chat meant
 * re-rendering ten full markdown documents per chunk. On a phone CPU that is
 * the difference between "streams smoothly" and "unusable".
 *
 * With this, only the message whose text actually changed (the one being
 * streamed) re-renders. Completed messages are skipped entirely.
 *
 * The comparator compares ONLY `children` on purpose — call sites pass
 * `remarkPlugins={[remarkGfm]}` inline, a fresh array each render, so the
 * default shallow compare would never hit.
 */

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function MemoMarkdownImpl({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>;
}

export default React.memo(
  MemoMarkdownImpl,
  (prev, next) => prev.children === next.children,
);
