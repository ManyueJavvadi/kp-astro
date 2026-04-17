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
} from "lucide-react";
import { useMe, useLogout } from "@/hooks/use-me";
import { useClientsList } from "@/hooks/use-clients";

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
  const { data: me } = useMe();
  const { data: clients } = useClientsList();
  const logout = useLogout();
  const nav = buildNav(clients?.total ?? 0);

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
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: "linear-gradient(135deg, #c9a96e, #8b7a50)",
            color: "#0A0E17",
            fontWeight: 700,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ♎
        </div>
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
