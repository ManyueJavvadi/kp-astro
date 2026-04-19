"use client";

/**
 * /app shell — sticky top bar with Logo (→ /) and "Back to landing" link.
 *
 * Purely chrome. No auth, no nav items yet — those come when we split the
 * single-page tool into routes (later PRs). For now just gives the tool
 * a consistent frame and a clear escape hatch back to the marketing page.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { LanguageProvider } from "@/lib/i18n";
import { theme } from "@/lib/theme";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <AppShell>{children}</AppShell>
    </LanguageProvider>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg.page,
        color: theme.text.primary,
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          backgroundColor: "rgba(7,11,20,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(201,169,110,0.08)",
        }}
      >
        <div
          style={{
            height: 56,
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
            <Logo size={32} wordmark wordmarkSize={15} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LanguageToggle />
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
                transition: "color 120ms, border-color 120ms, background 120ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.text.primary;
                e.currentTarget.style.borderColor = "rgba(201,169,110,0.3)";
                e.currentTarget.style.background = "rgba(201,169,110,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.text.muted;
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <ArrowLeft size={12} />
              <span className="v2-hide-mobile">Back to landing</span>
              <span className="v2-show-mobile">Home</span>
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
