"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wrench,
  Settings,
  Search,
  ChevronDown,
  Wand2,
  Target,
  Calendar,
  HeartHandshake,
  TrendingUp,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";
import { useMe, useLogout } from "@/hooks/use-me";
import { useClientsList } from "@/hooks/use-clients";
import { LogoMark } from "@/components/ui/logo";

const MOBILE_BREAKPOINT = 860;

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

/**
 * Sidebar — exact spec (no creative decisions).
 *
 * Width:        220px fixed
 * Background:   #0A0E17
 * Border-right: 1px solid rgba(255,255,255,0.06)
 *
 * Nav item: 32px height / 12px horizontal padding / 6px border-radius
 * Nav font: 13px / 400 / #94A3B8
 * Active:   bg rgba(255,255,255,0.06) / color #F1F5F9
 */

const SIDEBAR_BG = "#0A0E17";
const SIDEBAR_BORDER = "rgba(255,255,255,0.06)";
const NAV_COLOR = "#94A3B8";
const NAV_ACTIVE_BG = "rgba(255,255,255,0.06)";
const NAV_ACTIVE_COLOR = "#F1F5F9";
const LABEL_COLOR = "#64748B";

function buildNav(clientCount: number) {
  return [
    { label: "Dashboard", href: "/pro", icon: LayoutDashboard },
    { label: "Clients", href: "/pro/clients", icon: Users, count: clientCount },
    {
      label: "Tools",
      icon: Wrench,
      children: [
        { label: "Horary", href: "/pro/tools/horary", icon: Wand2 },
        { label: "Muhurtha", href: "/pro/tools/muhurtha", icon: Target },
        { label: "Transit", href: "/pro/tools/transit", icon: TrendingUp },
        { label: "Panchang", href: "/pro/tools/panchang", icon: Calendar },
        { label: "Kundli Match", href: "/pro/tools/match", icon: HeartHandshake },
      ],
    },
    { label: "Settings", href: "/pro/settings", icon: Settings },
  ];
}

export function Sidebar() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = React.useState(true);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const { data: me } = useMe();
  const { data: clients } = useClientsList();
  const logout = useLogout();
  const isMobile = useIsMobile();
  const nav = buildNav(clients?.total ?? 0);

  // Close drawer on route change
  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open
  React.useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  // --- MOBILE: compact top bar + slide-in drawer -------------------------
  if (isMobile) {
    return (
      <>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            height: 56,
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: SIDEBAR_BG,
            borderBottom: `1px solid ${SIDEBAR_BORDER}`,
            width: "100%",
          }}
        >
          <button
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 7,
              background: "transparent",
              border: "none",
              color: NAV_COLOR,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Menu size={18} strokeWidth={1.8} />
          </button>
          <Link
            href="/pro"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <LogoMark size={26} />
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: NAV_ACTIVE_COLOR,
                letterSpacing: "-0.01em",
              }}
            >
              DevAstro<span style={{ color: "#c9a96e" }}>AI</span>
            </span>
          </Link>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              background: "linear-gradient(135deg, #c9a96e, #8b7a50)",
              color: "#0A0E17",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {(me?.full_name ?? me?.email ?? "U")[0].toUpperCase()}
          </div>
        </header>

        {drawerOpen && (
          <>
            <div
              onClick={() => setDrawerOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 50,
                backgroundColor: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(2px)",
              }}
            />
            <aside
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                bottom: 0,
                zIndex: 51,
                width: "min(280px, 86vw)",
                backgroundColor: SIDEBAR_BG,
                borderRight: `1px solid ${SIDEBAR_BORDER}`,
                display: "flex",
                flexDirection: "column",
                animation: "drawerSlideIn 200ms ease-out",
              }}
            >
              <div
                style={{
                  height: 56,
                  padding: "0 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: `1px solid ${SIDEBAR_BORDER}`,
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <LogoMark size={26} />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: NAV_ACTIVE_COLOR,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    DevAstro<span style={{ color: "#c9a96e" }}>AI</span>
                  </span>
                </div>
                <button
                  aria-label="Close menu"
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: "transparent",
                    border: "none",
                    color: NAV_COLOR,
                    cursor: "pointer",
                  }}
                >
                  <X size={18} strokeWidth={1.8} />
                </button>
              </div>
              <DrawerNav
                nav={nav}
                pathname={pathname}
                toolsOpen={toolsOpen}
                setToolsOpen={setToolsOpen}
              />
              <DrawerFooter
                me={me}
                logout={logout}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
              />
            </aside>
            <style jsx global>{`
              @keyframes drawerSlideIn {
                from {
                  transform: translateX(-100%);
                }
                to {
                  transform: translateX(0);
                }
              }
            `}</style>
          </>
        )}
      </>
    );
  }

  // --- DESKTOP: original 220px sticky rail -------------------------------
  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        backgroundColor: SIDEBAR_BG,
        borderRight: `1px solid ${SIDEBAR_BORDER}`,
        display: "flex",
        flexDirection: "column",
        zIndex: 20,
      }}
    >
      {/* Brand — 48px tall */}
      <div
        style={{
          height: 48,
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: `1px solid ${SIDEBAR_BORDER}`,
        }}
      >
        <LogoMark size={26} />
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: NAV_ACTIVE_COLOR,
            letterSpacing: "-0.01em",
          }}
        >
          DevAstro<span style={{ color: "#c9a96e" }}>AI</span>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: 12, borderBottom: `1px solid ${SIDEBAR_BORDER}` }}>
        <button
          style={{
            width: "100%",
            height: 32,
            padding: "0 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "rgba(255,255,255,0.03)",
            border: `1px solid ${SIDEBAR_BORDER}`,
            borderRadius: 6,
            color: LABEL_COLOR,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <Search size={14} />
          <span style={{ flex: 1, textAlign: "left" }}>Search clients…</span>
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono), monospace",
              color: LABEL_COLOR,
              letterSpacing: "0.04em",
            }}
          >
            ⌘K
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
        }}
      >
        {nav.map((item) => {
          if ("children" in item && item.children) {
            const hasActive = item.children.some((c) => pathname === c.href);
            const Icon = item.icon;
            return (
              <div key={item.label}>
                <button
                  onClick={() => setToolsOpen((v) => !v)}
                  style={{
                    ...navItemStyle(false),
                    color: hasActive ? NAV_ACTIVE_COLOR : NAV_COLOR,
                    width: "100%",
                  }}
                >
                  <Icon size={15} />
                  <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                  <ChevronDown
                    size={13}
                    style={{
                      transform: toolsOpen ? "rotate(180deg)" : "rotate(0)",
                      transition: "transform 200ms",
                      opacity: 0.7,
                    }}
                  />
                </button>
                {toolsOpen && (
                  <div
                    style={{
                      marginTop: 2,
                      marginBottom: 4,
                      paddingLeft: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    {item.children.map((sub) => {
                      const SubIcon = sub.icon;
                      const active = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          style={navItemStyle(active)}
                        >
                          <SubIcon size={14} />
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href!} style={navItemStyle(active)}>
              <Icon size={15} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {"count" in item && item.count !== undefined && (
                <span
                  style={{
                    fontSize: 11,
                    color: active ? NAV_ACTIVE_COLOR : LABEL_COLOR,
                    fontFamily: "var(--font-mono), monospace",
                  }}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User menu */}
      <div
        style={{
          padding: 8,
          borderTop: `1px solid ${SIDEBAR_BORDER}`,
          position: "relative",
        }}
      >
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              left: 8,
              right: 8,
              bottom: "calc(100% + 4px)",
              borderRadius: 6,
              backgroundColor: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}
          >
            <Link
              href="/pro/settings"
              onClick={() => setMenuOpen(false)}
              style={navItemStyle(false)}
            >
              <User size={14} /> Account settings
            </Link>
            <button
              onClick={() => {
                setMenuOpen(false);
                logout.mutate();
              }}
              style={{
                ...navItemStyle(false),
                width: "100%",
                color: "#f87171",
              }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 4px",
            borderRadius: 6,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: NAV_COLOR,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              background: "linear-gradient(135deg, #c9a96e, #8b7a50)",
              color: "#0A0E17",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(me?.full_name ?? me?.email ?? "U")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: NAV_ACTIVE_COLOR,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {me?.full_name ?? "Loading…"}
            </div>
            <div style={{ fontSize: 11, color: LABEL_COLOR }}>
              {me?.tier === "astrologer_pro" || me?.tier === "team"
                ? "Astrologer Pro"
                : me?.tier === "consumer_pro"
                ? "Consumer Pro"
                : "Free tier"}
            </div>
          </div>
          <ChevronDown size={13} style={{ opacity: 0.6 }} />
        </button>
      </div>
    </aside>
  );
}

function navItemStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    height: 32,
    padding: "0 12px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 400,
    color: active ? NAV_ACTIVE_COLOR : NAV_COLOR,
    backgroundColor: active ? NAV_ACTIVE_BG : "transparent",
    transition: "background-color 150ms, color 150ms",
    textDecoration: "none",
    cursor: "pointer",
    border: "none",
  };
}

/* -------------------- Mobile drawer helpers -------------------- */

type NavItem = ReturnType<typeof buildNav>[number];

function DrawerNav({
  nav,
  pathname,
  toolsOpen,
  setToolsOpen,
}: {
  nav: NavItem[];
  pathname: string | null;
  toolsOpen: boolean;
  setToolsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <nav
      style={{
        flex: 1,
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        overflowY: "auto",
      }}
    >
      {nav.map((item) => {
        if ("children" in item && item.children) {
          const Icon = item.icon;
          const hasActive = item.children.some((c) => pathname === c.href);
          return (
            <div key={item.label}>
              <button
                onClick={() => setToolsOpen((v) => !v)}
                style={{
                  ...navItemStyle(false),
                  color: hasActive ? NAV_ACTIVE_COLOR : NAV_COLOR,
                  width: "100%",
                  height: 38,
                  fontSize: 14,
                }}
              >
                <Icon size={16} />
                <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                <ChevronDown
                  size={14}
                  style={{
                    transform: toolsOpen ? "rotate(180deg)" : "rotate(0)",
                    transition: "transform 200ms",
                    opacity: 0.7,
                  }}
                />
              </button>
              {toolsOpen && (
                <div
                  style={{
                    marginTop: 2,
                    marginBottom: 4,
                    paddingLeft: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {item.children.map((sub) => {
                    const SubIcon = sub.icon;
                    const active = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        style={{ ...navItemStyle(active), height: 36, fontSize: 14 }}
                      >
                        <SubIcon size={15} />
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href!}
            style={{ ...navItemStyle(active), height: 38, fontSize: 14 }}
          >
            <Icon size={16} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {"count" in item && item.count !== undefined && (
              <span
                style={{
                  fontSize: 12,
                  color: active ? NAV_ACTIVE_COLOR : LABEL_COLOR,
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function DrawerFooter({
  me,
  logout,
  menuOpen,
  setMenuOpen,
}: {
  me: ReturnType<typeof useMe>["data"];
  logout: ReturnType<typeof useLogout>;
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div
      style={{
        padding: 10,
        borderTop: `1px solid ${SIDEBAR_BORDER}`,
        position: "relative",
      }}
    >
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            bottom: "calc(100% + 4px)",
            borderRadius: 6,
            backgroundColor: "#111827",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          <Link
            href="/pro/settings"
            onClick={() => setMenuOpen(false)}
            style={{ ...navItemStyle(false), height: 38, fontSize: 14 }}
          >
            <User size={15} /> Account settings
          </Link>
          <button
            onClick={() => {
              setMenuOpen(false);
              logout.mutate();
            }}
            style={{
              ...navItemStyle(false),
              width: "100%",
              color: "#f87171",
              height: 38,
              fontSize: 14,
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
      <button
        onClick={() => setMenuOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 6px",
          borderRadius: 6,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: NAV_COLOR,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: "linear-gradient(135deg, #c9a96e, #8b7a50)",
            color: "#0A0E17",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {(me?.full_name ?? me?.email ?? "U")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: NAV_ACTIVE_COLOR,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {me?.full_name ?? "Loading…"}
          </div>
          <div style={{ fontSize: 12, color: LABEL_COLOR }}>
            {me?.tier === "astrologer_pro" || me?.tier === "team"
              ? "Astrologer Pro"
              : me?.tier === "consumer_pro"
              ? "Consumer Pro"
              : "Free tier"}
          </div>
        </div>
        <ChevronDown size={14} style={{ opacity: 0.6 }} />
      </button>
    </div>
  );
}
