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
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import { theme } from "@/lib/theme";
import { SelectionProvider } from "./lib/selection";
// Commit A of route-segment-refactor (2026-06-01) — WorkspaceProvider
// holds the truly-global state lifted out of /app/page.tsx. Lives here
// so future route segments (/app/chart, /app/horary, etc.) can each
// consume the same workspace state instead of remounting it per route.
// See .claude/research/architecture-decisions-2026-06-01.md (ADR-004)
// and ./_lib/workspace-context.tsx for the lifted state surface.
import { WorkspaceProvider } from "./_lib/workspace-context";
// Phase 1.5 (read-side) — DB → WorkspaceContext sync for chart sessions.
// When the user is authenticated, replaces the sidebar's in-memory
// savedSessions with their server-side list. No-op when anonymous.
// See sessions-bridge.tsx for the write-side TODO.
import { SessionsBridge } from "./_lib/sessions-bridge";
// Phase 2 Slice 1 (2026-06-02) — auth gate. Redirects anonymous
// visitors to /auth/login with ?redirect=<their-destination> so
// they bounce back here after sign-in. Logged-in users see /app
// exactly as before — no UI change in this slice.
import { AuthGate } from "./_lib/auth-gate";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      {/* PR Phase 9.1 — mount SelectionProvider here (above page.tsx) so
          every consumer inside /app routes can call useSelection() without
          page.tsx needing structural restructure.
          chartScopeKey stays null at the layout level; page.tsx will set
          it via a small bridge component once chart is loaded (Phase 9.6
          when pin tray persistence ships). */}
      <SelectionProvider chartScopeKey={null}>
        {/* WorkspaceProvider — scaffolding-only in this commit. page.tsx
            still holds its own copies of mode/birthDetails/etc. The next
            commit (B) deletes those local useState calls and reads from
            useWorkspace() instead, making this provider the single source
            of truth. Adding the provider FIRST without rewiring means we
            can ship in safe slices without a giant atomic refactor. */}
        <WorkspaceProvider>
          {/* SessionsBridge mounts inside WorkspaceProvider so it can
              call useWorkspace().setSavedSessions on auth-state changes.
              Renders nothing — pure side-effect component. */}
          <SessionsBridge />
          {/* AuthGate wraps {children} (and the app shell). If the
              visitor isn't authenticated, AuthGate handles the
              redirect to /auth/login and renders a placeholder.
              Logged-in visitors fall through to the existing AppShell.
              Slice 1 is intentionally surgical — no other behavior
              changes. Sidebar/CRM-home come in Slice 3. */}
          <AuthGate>
            <AppShell>{children}</AppShell>
          </AuthGate>
        </WorkspaceProvider>
      </SelectionProvider>
    </LanguageProvider>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  // Phase 5 / PR 13 — pull `t` so the "Back to landing" link respects
  // the active language (#14). Was previously hardcoded English.
  const { t } = useLanguage();
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
              <span className="v2-hide-mobile">{t("Back to landing", "హోమ్‌కి వెళ్ళు")}</span>
              <span className="v2-show-mobile">{t("Home", "హోమ్")}</span>
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
