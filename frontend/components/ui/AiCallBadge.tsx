// Phase 13.2 — on-screen AI-call counter.
//
// Tiny floating badge in the bottom-left corner. Shows the running
// count of Anthropic-billing fetches this browser session. Click to
// expand a popover listing the last 10 calls (label + timestamp).
//
// Purpose: when the user reports unexplained Anthropic billing
// changes, they can watch this badge while interacting with the app.
// If billing changes but the badge doesn't tick, the cost came from
// somewhere outside the app (dashboard reporting lag, a different
// browser tab, a stale Vercel CDN bundle, etc.) — not from a typing
// or hover action in the current session.

"use client";

import React, { useState, useEffect } from "react";
import { useAiAuditLog, clearAiAuditLog, type AiAuditEntry } from "@/lib/aiAudit";

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function AiCallBadge() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const log = useAiAuditLog();
  const [open, setOpen] = useState(false);
  const count = log.length;

  if (!mounted) return null;

  return (
    <div
      className="ai-call-badge"
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        zIndex: 9000,
        fontFamily: "DM Sans, sans-serif",
        pointerEvents: "auto",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        title="AI calls this session — click to expand. If your Anthropic dashboard charge does not match this counter, the call did not originate here."
        style={{
          background: "rgba(9, 9, 15, 0.85)",
          border: "1px solid rgba(201, 169, 110, 0.45)",
          borderRadius: 999,
          padding: "5px 11px",
          fontSize: 11,
          color: count > 0 ? "var(--accent, #c9a96e)" : "var(--muted, #888899)",
          cursor: "pointer",
          fontWeight: 500,
          letterSpacing: 0.4,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: count > 0 ? "var(--accent, #c9a96e)" : "rgba(255,255,255,0.25)",
          }}
        />
        AI calls: {count}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: "calc(100% + 8px)",
            background: "rgba(9, 9, 15, 0.96)",
            border: "1px solid rgba(201, 169, 110, 0.35)",
            borderRadius: 10,
            padding: 12,
            minWidth: 280,
            maxWidth: 360,
            maxHeight: 320,
            overflowY: "auto",
            boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <strong style={{ fontSize: 11, color: "var(--accent, #c9a96e)", letterSpacing: 0.4 }}>
              AI CALL LOG
            </strong>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAiAuditLog();
              }}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 10,
                color: "var(--muted, #888899)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              clear
            </button>
          </div>

          {count === 0 ? (
            <div style={{ fontSize: 11, color: "var(--muted, #888899)", padding: "12px 4px" }}>
              No AI calls fired this session yet.
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[...log]
                .reverse()
                .slice(0, 10)
                .map((e: AiAuditEntry, i: number) => (
                  <li
                    key={`${e.ts}-${i}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "5px 0",
                      fontSize: 11,
                      borderBottom: i === 9 ? "none" : "1px dashed rgba(255,255,255,0.04)",
                    }}
                  >
                    <span style={{ color: "var(--text, #f0f0f0)", fontFamily: "ui-monospace, monospace" }}>
                      {e.label}
                    </span>
                    <span style={{ color: "var(--muted, #888899)", fontVariantNumeric: "tabular-nums" }}>
                      {fmtTime(e.ts)}
                    </span>
                  </li>
                ))}
            </ul>
          )}

          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              fontSize: 10,
              color: "var(--muted, #888899)",
              lineHeight: 1.5,
            }}
          >
            Each entry = one Anthropic-billing fetch from this browser
            session. If your Anthropic dashboard charge does not match
            this list, the cost did not come from your actions here.
          </div>
        </div>
      )}
    </div>
  );
}
