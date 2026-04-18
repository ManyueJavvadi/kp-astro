"use client";

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
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link href="/v2" style={{ textDecoration: "none" }}>
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
          </div>
        </div>
      </header>
      <main
        data-mobile-pad
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
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: theme.text.primary,
            margin: "0 0 32px",
            lineHeight: 1.15,
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
      </main>
    </div>
  );
}

export function H({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 18,
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
