"use client";

/**
 * /app error boundary (Next.js 16 App Router convention).
 *
 * P0-3 fix (deep-scan-2, 2026-06-02). Catches uncaught render
 * exceptions anywhere in the /app subtree. Without this file, a
 * single uncaught throw renders Next.js's default error page (or
 * a blank screen on some browsers) with no recovery path — the
 * astrologer's only option was hard-refreshing.
 *
 * What renders:
 *   • Reassuring serif title
 *   • Plain-English message (no stack-trace leak to user)
 *   • Two actions: "Try again" (resets the boundary) and
 *                  "Back to home" (router.push /app)
 *   • If the thrown Error carries a `digest` (Next puts one on
 *     server-thrown errors), surface the digest for support
 *     correlation — not the message itself
 *
 * What it does NOT do:
 *   • Doesn't replace per-component isError branches on TanStack
 *     hooks — those should still render in-context "Couldn't load
 *     this client's notes" etc. This boundary is the LAST resort
 *     when something genuinely unexpected throws.
 *   • Doesn't auto-report to Sentry — Wave 10 wires that.
 */

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home as HomeIcon } from "lucide-react";
import { theme } from "@/lib/theme";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Local diagnostic so devtools shows what blew up. Sentry wire-up
    // in Wave 10 will additionally report this server-side.
    // eslint-disable-next-line no-console
    console.error("[app/error] uncaught:", error);
  }, [error]);

  return (
    <div
      role="alert"
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 460,
          width: "100%",
          padding: "28px 24px",
          background: "rgba(22,22,31,0.6)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            borderRadius: 999,
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.25)",
            color: "#f87171",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Something went wrong
        </div>
        <h1
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22,
            fontWeight: 400,
            margin: "0 0 10px",
            color: theme.text.primary,
            lineHeight: 1.25,
          }}
        >
          We hit a snag opening this page.
        </h1>
        <p
          style={{
            fontSize: 13,
            color: theme.text.muted,
            margin: "0 0 20px",
            lineHeight: 1.6,
          }}
        >
          The astrologer workspace stayed safe — none of your charts or
          notes were lost. Try the page again, or head back to your
          home dashboard.
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: error.digest ? 16 : 0,
          }}
        >
          <button
            type="button"
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background:
                "linear-gradient(180deg, #c9a96e 0%, #b8985d 100%)",
              color: "#09090f",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} />
            Try again
          </button>
          <Link
            href="/app"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: theme.text.muted,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <HomeIcon size={14} />
            Back to home
          </Link>
        </div>

        {error.digest && (
          <div
            style={{
              fontSize: 10,
              color: theme.text.muted,
              opacity: 0.6,
              fontFamily: "monospace",
            }}
          >
            Reference: {error.digest}
          </div>
        )}
      </div>
    </div>
  );
}
