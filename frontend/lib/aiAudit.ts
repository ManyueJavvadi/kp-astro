// Phase 13.2 — frontend AI-call audit.
//
// Every fetch that triggers an Anthropic-billing backend endpoint MUST
// call recordAiCall(label) immediately before its `await fetch(...)`.
// The label lands in:
//   1. The browser DevTools console (`[AI_CALL] <label> @ <time>`)
//   2. sessionStorage (last 50 entries, key: devastroai:aiAuditLog)
//   3. Any subscribed React component (via useAiAuditLog)
//
// The on-screen <AiCallBadge /> reads useAiAuditLog and shows a small
// counter that ticks up every time a billing call fires. If the user
// reports billing weirdness, they can compare:
//   - Anthropic dashboard charges
//   - Railway server logs ([ENDPOINT_HIT] + [ANTHROPIC_AUDIT] lines)
//   - Browser console [AI_CALL] lines
//   - On-screen badge counter
// All four MUST line up. Any mismatch is a leak.

"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "devastroai:aiAuditLog";
const MAX_ENTRIES = 50;

export type AiAuditEntry = {
  ts: number;
  label: string;
};

let log: AiAuditEntry[] = [];

// Hydrate from sessionStorage on first import (browser only).
if (typeof window !== "undefined") {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) log = JSON.parse(raw);
  } catch {
    /* ignore corrupt storage */
  }
}

const listeners = new Set<() => void>();

/** Append one entry, persist to sessionStorage, console.log, notify subscribers. */
export function recordAiCall(label: string): void {
  const entry: AiAuditEntry = { ts: Date.now(), label };
  log.push(entry);
  if (log.length > MAX_ENTRIES) log = log.slice(-MAX_ENTRIES);

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    } catch {
      /* sessionStorage full or disabled — non-fatal */
    }
    // High-visibility console line so the user can grep DevTools by [AI_CALL].
    // eslint-disable-next-line no-console
    console.log(
      `%c[AI_CALL]%c ${label} @ ${new Date(entry.ts).toLocaleTimeString()}`,
      "color: #c9a96e; font-weight: 600;",
      "color: inherit;",
    );
  }

  listeners.forEach((fn) => fn());
}

/** React hook — re-renders whenever recordAiCall fires. Returns the
 * full log (most recent last). */
export function useAiAuditLog(): AiAuditEntry[] {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return log;
}

/** Clear the log (useful for "reset counter" affordance). */
export function clearAiAuditLog(): void {
  log = [];
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((fn) => fn());
}
