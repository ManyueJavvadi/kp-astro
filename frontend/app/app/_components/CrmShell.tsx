"use client";

/**
 * CrmShell (Phase 2 Slice 3 — 2026-06-02).
 *
 * Notion-style left sidebar + main content layout. Wraps every
 * authenticated /app sub-page that isn't a per-client workspace
 * (Home, Clients, Tools, Profile, Billing).
 *
 * Why this lives in a component (not in app/app/layout.tsx):
 *   - The per-client workspace pages (/app/clients/[id]/*) get a
 *     DIFFERENT shell (PersonHeroBanner + 8 tabs + AI Companion).
 *     If sidebar were in layout.tsx, it would render for those too.
 *   - Slice 4 introduces /app/clients/[id]/layout.tsx with the
 *     workspace shell. Until then, CrmShell is opt-in per page.
 *
 * Sidebar nav items: Home / Clients / Tools / Profile / Billing.
 * Each item uses Next.js Link so navigation feels instant.
 * The current path is highlighted via usePathname() comparison.
 *
 * Sign-out button at the bottom of the sidebar. Confirms via window.confirm
 * (cheap v1 — replace with proper modal later if needed).
 *
 * Responsive:
 *   - Desktop (>=768px): sidebar visible, 220px wide
 *   - Mobile (<768px): sidebar collapses to a top bar with hamburger
 *     menu (Phase 2 polish — see TODO comment)
 *
 * TODO Phase 2 polish: mobile drawer for sidebar, animated transitions,
 * the astrologer's display_name + photo at the top of the sidebar.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home as HomeIcon,
  Users,
  Wrench,
  User as UserIcon,
  CreditCard,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/lib/auth/auth-context";
import { useMe } from "@/lib/api/hooks";
import { theme } from "@/lib/theme";

interface CrmShellProps {
  children: React.ReactNode;
  /** Optional page-level title shown in the main content header. */
  pageTitle?: string;
  /** Optional right-aligned slot in the main content header (e.g., a
   *  primary CTA like "+ Add client"). */
  pageActions?: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  /** When true, the link is highlighted only when pathname is EXACTLY
   *  this href. When false, also matches sub-routes. */
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Home", icon: HomeIcon, exact: true },
  { href: "/app/clients", label: "Clients", icon: Users },
  { href: "/app/tools", label: "Tools", icon: Wrench },
  { href: "/app/profile", label: "Profile", icon: UserIcon },
  { href: "/app/billing", label: "Billing", icon: CreditCard },
];

export function CrmShell({ children, pageTitle, pageActions }: CrmShellProps) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { signOut } = useAuth();
  const { data: me } = useMe();

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  async function handleSignOut() {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Sign out?")
    ) {
      return;
    }
    await signOut();
    // Auth gate will catch the status flip and redirect to /auth/login,
    // but pushing explicitly is faster + avoids the brief
    // authenticated→anonymous flicker in CrmShell while the AuthGate
    // useEffect picks up the change.
    router.replace("/auth/login");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg.page,
        color: theme.text.primary,
        display: "flex",
      }}
    >
      {/* ───────────── Sidebar ───────────── */}
      <aside
        className="crm-sidebar"
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(7,11,20,0.6)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 0",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        {/* Logo / brand */}
        <Link
          href="/app"
          style={{
            padding: "0 20px 24px",
            textDecoration: "none",
            display: "block",
          }}
        >
          <Logo size={28} wordmark wordmarkSize={14} />
        </Link>

        {/* Astrologer identity */}
        {me && (
          <div
            style={{
              padding: "0 20px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: theme.text.primary,
                marginBottom: 2,
              }}
            >
              {me.display_name || me.email.split("@")[0]}
            </div>
            <div
              style={{
                fontSize: 11,
                color: theme.text.muted,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {me.email}
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "0 8px" }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  marginBottom: 2,
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? theme.text.primary : theme.text.muted,
                  background: active ? "rgba(201,169,110,0.10)" : "transparent",
                  textDecoration: "none",
                  transition: "background 120ms, color 120ms",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.color = theme.text.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = theme.text.muted;
                  }
                }}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: "0 8px 0", marginTop: "auto" }}>
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              color: theme.text.muted,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              transition: "color 120ms, background 120ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              e.currentTarget.style.color = theme.text.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = theme.text.muted;
            }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ───────────── Main content ───────────── */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {(pageTitle || pageActions) && (
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 32px 0",
              gap: 16,
            }}
          >
            {pageTitle && (
              <h1
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 28,
                  fontWeight: 400,
                  margin: 0,
                  color: theme.text.primary,
                }}
              >
                {pageTitle}
              </h1>
            )}
            {pageActions && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {pageActions}
              </div>
            )}
          </header>
        )}

        <div style={{ flex: 1, padding: "20px 32px 40px" }}>{children}</div>
      </main>
    </div>
  );
}
