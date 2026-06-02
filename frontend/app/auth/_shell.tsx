"use client";

/**
 * AuthShell — shared layout chrome for all /auth/* pages.
 *
 * Centered serif title + muted subcopy + content card on the cosmic dark
 * backdrop. Matches the landing/app premium aesthetic (gold accents,
 * DM Serif Display title, DM Sans body).
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { theme } from "@/lib/theme";

export function AuthShell({
  title,
  subtitle,
  children,
  showBackToLanding = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showBackToLanding?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg.page,
        color: theme.text.primary,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          height: 56,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(201,169,110,0.08)",
          backgroundColor: "rgba(7,11,20,0.85)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo size={32} wordmark wordmarkSize={15} />
        </Link>
        {showBackToLanding && (
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              padding: "0 12px",
              borderRadius: 7,
              fontSize: 12,
              color: theme.text.muted,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <ArrowLeft size={12} />
            <span>Back</span>
          </Link>
        )}
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <h1
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 30,
                lineHeight: 1.2,
                margin: 0,
                color: theme.text.primary,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontSize: 14,
                  color: theme.text.muted,
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <div
            style={{
              background: "rgba(22,22,31,0.7)",
              border: "1px solid rgba(201,169,110,0.12)",
              borderRadius: 14,
              padding: 28,
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Shared form primitives (kept here so auth pages stay terse) ──────

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        htmlFor={htmlFor}
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: theme.text.muted,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <div style={{ fontSize: 11, color: theme.text.muted, marginTop: 4 }}>
          {hint}
        </div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  padding: "0 12px",
  borderRadius: 8,
  background: "rgba(9,9,15,0.7)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: theme.text.primary,
  fontSize: 14,
  outline: "none",
  fontFamily: "'DM Sans', sans-serif",
};

export const buttonPrimaryStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 8,
  background: "linear-gradient(180deg, #c9a96e 0%, #b8985d 100%)",
  border: "none",
  color: "#09090f",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  letterSpacing: 0.3,
};

export const buttonDisabledStyle: React.CSSProperties = {
  ...buttonPrimaryStyle,
  opacity: 0.5,
  cursor: "not-allowed",
};
