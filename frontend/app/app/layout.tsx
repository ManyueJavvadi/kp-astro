"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { theme } from "@/lib/theme";
import { Logo } from "@/components/ui/logo";
import { useMe } from "@/hooks/use-me";

// Consumer nav. Keep in sync with actual built routes — prefetching
// links to non-existent pages spams 404s in the console on hover.
const nav: { label: string; href: string; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
];

const MOBILE_BREAKPOINT = 860;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export default function ConsumerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: me } = useMe();
  const initial = (me?.full_name ?? "U").trim().charAt(0).toUpperCase();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer whenever route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

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
          position: "sticky",
          top: 0,
          zIndex: 40,
          backgroundColor: "rgba(7,11,20,0.85)",
          backdropFilter: "blur(8px)",
          borderBottom: theme.border.default,
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            height: 60,
            padding: isMobile ? "0 16px" : "0 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: isMobile ? 12 : 32,
          }}
        >
          {/* Brand */}
          <Link href="/app" style={{ textDecoration: "none", flexShrink: 0 }}>
            <Logo size={isMobile ? 28 : 30} wordmark wordmarkSize={isMobile ? 14 : 15} />
          </Link>

          {/* Desktop nav */}
          {!isMobile && (
            <nav
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                flex: 1,
                justifyContent: "center",
              }}
            >
              {nav.map((n) => {
                const active = pathname === n.href;
                const Icon = n.icon;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      height: 34,
                      padding: "0 14px",
                      borderRadius: 7,
                      fontSize: 13,
                      fontWeight: 500,
                      textDecoration: "none",
                      color: active ? theme.text.primary : theme.text.secondary,
                      backgroundColor: active ? "rgba(255,255,255,0.06)" : "transparent",
                      transition: "background-color 120ms, color 120ms",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
                        e.currentTarget.style.color = theme.text.primary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = theme.text.secondary;
                      }
                    }}
                  >
                    <Icon size={14} strokeWidth={1.8} />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right cluster */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              aria-label="Notifications"
              style={iconButtonStyle}
            >
              <Bell size={15} strokeWidth={1.8} />
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: theme.gold,
                }}
              />
            </button>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${theme.gold}, ${theme.goldDim})`,
                color: "#07070d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
            {isMobile && (
              <button
                aria-label="Open menu"
                onClick={() => setDrawerOpen(true)}
                style={iconButtonStyle}
              >
                <Menu size={18} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {isMobile && drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              backgroundColor: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(2px)",
            }}
          />
          {/* Panel */}
          <aside
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 51,
              width: "min(300px, 86vw)",
              backgroundColor: theme.bg.sidebar,
              borderLeft: theme.border.default,
              display: "flex",
              flexDirection: "column",
              animation: "slideInRight 200ms ease-out",
            }}
          >
            <div
              style={{
                height: 60,
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: theme.border.default,
              }}
            >
              <Logo size={28} wordmark wordmarkSize={14} />
              <button
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                style={iconButtonStyle}
              >
                <X size={18} strokeWidth={1.8} />
              </button>
            </div>
            <nav
              style={{
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                overflowY: "auto",
              }}
            >
              {nav.map((n) => {
                const active = pathname === n.href;
                const Icon = n.icon;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      height: 40,
                      padding: "0 12px",
                      borderRadius: 7,
                      fontSize: 14,
                      fontWeight: 500,
                      textDecoration: "none",
                      color: active ? theme.text.primary : theme.text.secondary,
                      backgroundColor: active ? "rgba(255,255,255,0.06)" : "transparent",
                    }}
                  >
                    <Icon size={16} strokeWidth={1.8} />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <style jsx global>{`
            @keyframes slideInRight {
              from {
                transform: translateX(100%);
              }
              to {
                transform: translateX(0);
              }
            }
          `}</style>
        </>
      )}

      {children}
    </div>
  );
}

const iconButtonStyle: React.CSSProperties = {
  position: "relative",
  width: 34,
  height: 34,
  borderRadius: 7,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#94A3B8",
  backgroundColor: "transparent",
  border: "none",
  cursor: "pointer",
  flexShrink: 0,
};
