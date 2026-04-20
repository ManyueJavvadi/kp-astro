"use client";

/**
 * PR26 — Legal page shell + typography helpers.
 *
 * Adapted from developv2. Differences from that version:
 * - Header "Back to app" link points to "/" (landing) instead of "/v2"
 * - No auth-dependent props / nav items
 * - Responsive padding tightened for mobile (matches our 820px shell
 *   breakpoint from the MOBILE LAYOUT SHELL conventions in CLAUDE.md)
 */

import Link from "next/link";
import { theme } from "@/lib/theme";
import { Logo } from "@/components/ui/logo";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg.page,
        color: theme.text.primary,
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      }}
    >
      <header
        style={{
          borderBottom: theme.border.default,
          padding: "16px 24px",
          position: "sticky",
          top: 0,
          background: "rgba(10,14,23,0.82)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Link href="/" style={{ textDecoration: "none" }}>
            <Logo size={28} wordmark wordmarkSize={14} />
          </Link>
          <div style={{ display: "flex", gap: 18, fontSize: 13 }}>
            <Link
              href="/privacy"
              style={{ color: theme.text.secondary, textDecoration: "none" }}
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              style={{ color: theme.text.secondary, textDecoration: "none" }}
            >
              Terms
            </Link>
            <Link
              href="/app"
              style={{ color: theme.gold, textDecoration: "none", fontWeight: 600 }}
            >
              Open the app →
            </Link>
          </div>
        </div>
      </header>
      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "48px 24px 96px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: theme.gold,
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          Legal · Last updated {updated}
        </div>
        <h1
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 40,
            fontWeight: 400,
            letterSpacing: "-0.015em",
            color: theme.text.primary,
            margin: "0 0 32px",
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        <div
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: theme.text.secondary,
          }}
        >
          {children}
        </div>

        <div
          style={{
            marginTop: 56,
            paddingTop: 20,
            borderTop: theme.border.default,
            fontSize: 12,
            color: theme.text.muted,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span>© {new Date().getFullYear()} DevAstroAI</span>
          <span>
            <Link href="/privacy" style={{ color: theme.text.muted, textDecoration: "none" }}>Privacy</Link>
            {" · "}
            <Link href="/terms" style={{ color: theme.text.muted, textDecoration: "none" }}>Terms</Link>
          </span>
        </div>
      </main>
    </div>
  );
}

export function H({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 20,
        fontWeight: 600,
        color: theme.text.primary,
        marginTop: 36,
        marginBottom: 12,
        letterSpacing: "-0.005em",
      }}
    >
      {children}
    </h2>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 14px" }}>{children}</p>;
}

export function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul
      style={{
        margin: "0 0 14px",
        paddingLeft: 22,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {children}
    </ul>
  );
}

export function Li({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>;
}

export function B({ children }: { children: React.ReactNode }) {
  return (
    <strong style={{ color: theme.text.primary, fontWeight: 600 }}>
      {children}
    </strong>
  );
}

export function A({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      style={{ color: theme.gold, textDecoration: "none" }}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
    >
      {children}
    </a>
  );
}
