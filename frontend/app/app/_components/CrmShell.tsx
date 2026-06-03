"use client";

/**
 * CrmShell (Phase 2 Slice 3 — 2026-06-02, mobile redesign 2026-06-02b).
 *
 * Notion-style left sidebar (desktop) + bottom-nav-with-FAB (mobile)
 * layout. Wraps every authenticated /app sub-page that isn't a per-
 * client workspace (Home, Clients, Tools, Profile, Billing).
 *
 * Why this lives in a component (not in app/app/layout.tsx):
 *   - The per-client workspace pages (/app/clients/[id]/*) get a
 *     DIFFERENT shell (PersonHeroBanner + 8 tabs + AI Companion).
 *     If sidebar were in layout.tsx, it would render for those too.
 *   - Slice 4 introduces /app/clients/[id]/layout.tsx with the
 *     workspace shell. Until then, CrmShell is opt-in per page.
 *
 * Desktop (>=820px):
 *   - 220px sticky sidebar with logo, identity, 5 nav items, sign-out
 *   - Main pane has a sticky header (title + inline pageActions)
 *
 * Mobile (<820px):
 *   - Sidebar HIDDEN. Replaced by:
 *     • Sticky top bar (logo + page title in serif + menu hamburger
 *       opening a slide-up sheet with identity + sign-out)
 *     • Sticky bottom nav with 5 icon-pill items (Home/Clients/
 *       Tools/Profile/Billing). Active item gets gold pill background
 *       and breathing-glow accent. Tap targets 56px (well above 44px
 *       minimum from CLAUDE.md mobile rules).
 *     • Floating gold FAB (bottom-right, above the bottom nav)
 *       wired to optional `mobilePrimaryAction` prop. Echoes the
 *       CommandOrb edge-tuck breathing pattern — premium feel.
 *   - Main pane is full-width with comfortable padding + extra
 *     bottom padding so the bottom nav doesn't cover content.
 *
 * Why bottom nav + FAB pattern:
 *   - Mirrors iOS/Android system patterns astrologers already know
 *   - Thumb-reachable on a phone (top sidebar is unreachable)
 *   - The FAB is the "addictive" primary action — gold-glowing,
 *     always one tap away, the way Notion/Linear/Slack do compose
 *
 * Per CLAUDE.md edge-tuck rule (line 270): "if adding another
 * always-present floating element, echo CommandOrb's pattern:
 * half-tuck + breathing glow + pop-out on interaction." Here we
 * choose breathing glow + pop-on-tap (no half-tuck because the FAB
 * sits above the bottom nav, not on the screen edge).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home as HomeIcon,
  Users,
  Wrench,
  User as UserIcon,
  CreditCard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/lib/auth/auth-context";
import { useMe } from "@/lib/api/hooks";
import { useIsMobile } from "@/hooks/useIsMobile";
import { theme } from "@/lib/theme";

interface CrmShellProps {
  children: React.ReactNode;
  /** Optional page-level title shown in the main content header. */
  pageTitle?: string;
  /** Optional right-aligned slot in the main content header (e.g., a
   *  primary CTA like "+ Add client"). Rendered inline on desktop,
   *  hidden on mobile in favor of `mobilePrimaryAction` (the FAB). */
  pageActions?: React.ReactNode;
  /** Mobile-only floating action. Tap handler + label. Renders as a
   *  gold breathing FAB anchored bottom-right above the bottom nav.
   *  When omitted, no FAB renders. */
  mobilePrimaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
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

export function CrmShell({
  children,
  pageTitle,
  pageActions,
  mobilePrimaryAction,
}: CrmShellProps) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { signOut } = useAuth();
  const { data: me } = useMe();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // U2 (2026-06-02) — coach mark on the FAB, shown ONCE per browser
  // until the user taps the FAB or dismisses the tooltip. The state
  // gets persisted to localStorage so we don't pester power users.
  const [showFabCoach, setShowFabCoach] = useState(false);
  useEffect(() => {
    if (!isMobile || !mobilePrimaryAction || typeof window === "undefined") {
      return;
    }
    try {
      const seen = window.localStorage.getItem(
        "devastroai:crm-fab-coach-seen",
      );
      if (!seen) {
        // Slight delay so the coach doesn't pop in mid-page-load.
        const t = setTimeout(() => setShowFabCoach(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {
      /* localStorage disabled — just don't show the coach */
    }
  }, [isMobile, mobilePrimaryAction]);
  function dismissFabCoach() {
    setShowFabCoach(false);
    try {
      window.localStorage.setItem("devastroai:crm-fab-coach-seen", "1");
    } catch {
      /* ignore */
    }
  }

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
    router.replace("/auth/login");
  }

  // ═══════════════════ MOBILE LAYOUT (<820px) ═══════════════════
  if (isMobile) {
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
        {/* ─── Top bar (logo + page title + menu) ─── */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: "rgba(7,11,20,0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            gap: 10,
          }}
        >
          <Link
            href="/app"
            style={{
              textDecoration: "none",
              flexShrink: 0,
              display: "inline-flex",
            }}
          >
            <Logo size={24} wordmark={false} />
          </Link>
          {pageTitle && (
            <h1
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 20,
                fontWeight: 400,
                margin: 0,
                color: theme.text.primary,
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: 1.15,
              }}
            >
              {pageTitle}
            </h1>
          )}
          {/* U6 fix (2026-06-02): "Account" label so first-time mobile
              users can find sign-out / identity. Was a bare hamburger
              with no affordance text — easy to miss. */}
          <button
            type="button"
            aria-label="Account menu"
            onClick={() => setMobileMenuOpen(true)}
            style={{
              minWidth: 36,
              height: 36,
              padding: "0 10px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              color: theme.text.muted,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Menu size={16} />
            <span style={{ display: "inline" }}>Account</span>
          </button>
        </header>

        {/* ─── Main content ─── */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: "16px 16px 96px", // 96px bottom = 70 nav + 26 breathing room
          }}
        >
          {children}
        </main>

        {/* ─── Floating gold FAB (mobile primary action) ─── */}
        {mobilePrimaryAction && (
          <>
            {/* U2 (2026-06-02): first-visit coach mark. Points to the
                FAB with a brief tooltip + dismiss button. localStorage
                ensures it's shown ONCE per browser. */}
            {showFabCoach && (
              <div
                role="tooltip"
                style={{
                  position: "fixed",
                  bottom: 150,        // above the FAB which sits at bottom:84 + 56 height
                  right: 16,
                  zIndex: 41,
                  maxWidth: 220,
                  padding: "10px 12px",
                  background: "rgba(14,14,22,0.97)",
                  border: "1px solid rgba(201,169,110,0.45)",
                  borderRadius: 10,
                  boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
                  fontSize: 12,
                  color: theme.text.primary,
                  lineHeight: 1.45,
                  animation: "crm-coach-fade-in 240ms ease-out",
                }}
              >
                <div style={{ marginBottom: 6, fontWeight: 600 }}>
                  Tap to {mobilePrimaryAction.label.toLowerCase()}
                </div>
                <div style={{ fontSize: 11, color: theme.text.muted, marginBottom: 8 }}>
                  Your fastest action lives right here — one tap from
                  any screen.
                </div>
                <button
                  type="button"
                  onClick={dismissFabCoach}
                  style={{
                    fontSize: 11,
                    color: "#c9a96e",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  Got it
                </button>
                {/* Pointer triangle */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    right: 24,
                    bottom: -6,
                    width: 12,
                    height: 12,
                    background: "rgba(14,14,22,0.97)",
                    borderRight: "1px solid rgba(201,169,110,0.45)",
                    borderBottom: "1px solid rgba(201,169,110,0.45)",
                    transform: "rotate(45deg)",
                  }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                if (showFabCoach) dismissFabCoach();
                mobilePrimaryAction.onClick();
              }}
              aria-label={mobilePrimaryAction.label}
              className="crm-fab-breathing"
              style={{
                position: "fixed",
                bottom: 84, // sits above bottom nav (70 + 14 spacing)
                right: 16,
                zIndex: 40,
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: "none",
                background:
                  "linear-gradient(180deg, #e8c98a 0%, #c9a96e 60%, #b8985d 100%)",
                color: "#09090f",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow:
                  "0 0 0 1px rgba(231,201,138,0.55), 0 6px 18px rgba(0,0,0,0.55), 0 0 28px rgba(231,201,138,0.35)",
              }}
            >
              {mobilePrimaryAction.icon ?? (
                <span style={{ fontSize: 26, fontWeight: 300, lineHeight: 1 }}>
                  +
                </span>
              )}
            </button>
          </>
        )}

        {/* ─── Bottom nav bar ─── */}
        <nav
          aria-label="Primary"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 35,
            display: "flex",
            justifyContent: "space-around",
            alignItems: "stretch",
            height: 70,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            background: "rgba(7,11,20,0.94)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  textDecoration: "none",
                  color: active ? "#c9a96e" : theme.text.muted,
                  fontSize: 10,
                  fontWeight: active ? 600 : 500,
                  position: "relative",
                  transition: "color 150ms",
                }}
              >
                {active && (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 6,
                      width: 32,
                      height: 3,
                      borderRadius: 2,
                      background: "#c9a96e",
                      boxShadow: "0 0 10px rgba(201,169,110,0.6)",
                    }}
                  />
                )}
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ─── Slide-up menu sheet (identity + sign out) ─── */}
        {mobileMenuOpen && (
          <MobileMenuSheet
            onClose={() => setMobileMenuOpen(false)}
            me={me ?? null}
            onSignOut={handleSignOut}
          />
        )}

        {/* Inline keyframes for FAB breathing glow + coach mark fade */}
        <style jsx>{`
          @keyframes crm-fab-breath {
            0%, 100% {
              box-shadow: 0 0 0 1px rgba(231, 201, 138, 0.55),
                0 6px 18px rgba(0, 0, 0, 0.55),
                0 0 28px rgba(231, 201, 138, 0.35);
            }
            50% {
              box-shadow: 0 0 0 1px rgba(231, 201, 138, 0.85),
                0 6px 18px rgba(0, 0, 0, 0.55),
                0 0 44px rgba(231, 201, 138, 0.55);
            }
          }
          @keyframes crm-coach-fade-in {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          :global(.crm-fab-breathing) {
            animation: crm-fab-breath 3.8s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            :global(.crm-fab-breathing) {
              animation: none;
            }
          }
        `}</style>
      </div>
    );
  }

  // ═══════════════════ DESKTOP LAYOUT (>=820px) ═══════════════════
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

// ═══════════════════ Mobile menu sheet ═══════════════════
/**
 * Slide-up sheet shown when the user taps the hamburger.
 * Contains: identity (display_name + email) + sign-out.
 * Backdrop tap or × button closes it.
 *
 * Future polish: settings shortcut, theme toggle, lang toggle here.
 */
function MobileMenuSheet({
  onClose,
  me,
  onSignOut,
}: {
  onClose: () => void;
  me: { display_name?: string | null; email: string } | null;
  onSignOut: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "rgba(14,14,22,0.98)",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderTop: "1px solid rgba(201,169,110,0.18)",
          padding: "12px 16px calc(20px + env(safe-area-inset-bottom, 0px))",
          animation: "crm-sheet-up 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 40,
            height: 4,
            background: "rgba(255,255,255,0.18)",
            borderRadius: 2,
            margin: "0 auto 14px",
          }}
        />

        {/* Identity */}
        {me && (
          <div
            style={{
              padding: "10px 4px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: theme.text.primary,
                marginBottom: 2,
              }}
            >
              {me.display_name || me.email.split("@")[0]}
            </div>
            <div style={{ fontSize: 12, color: theme.text.muted }}>
              {me.email}
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onSignOut();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "14px 10px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            color: "#f87171",
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.18)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <LogOut size={16} />
          Sign out
        </button>

        {/* Close */}
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 32,
            height: 32,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            color: theme.text.muted,
            cursor: "pointer",
          }}
        >
          <X size={16} />
        </button>
      </div>

      <style jsx>{`
        @keyframes crm-sheet-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
