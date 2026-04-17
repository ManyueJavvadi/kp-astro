"use client";

import Link from "next/link";
import {
  Wand2,
  Target,
  TrendingUp,
  Calendar,
  HeartHandshake,
  ChevronRight,
} from "lucide-react";
import { theme, styles } from "@/lib/theme";

const tools = [
  { href: "/pro/tools/horary", icon: Wand2, name: "Horary · Prashna", desc: "Pick 1–249 → KP YES/NO verdict" },
  { href: "/pro/tools/muhurtha", icon: Target, name: "Muhurtha", desc: "Auspicious windows for any event" },
  { href: "/pro/tools/transit", icon: TrendingUp, name: "Transit · Gochar", desc: "Current sky vs natal chart" },
  { href: "/pro/tools/panchang", icon: Calendar, name: "Panchang", desc: "Daily tithi, nakshatra, yoga, hora" },
  { href: "/pro/tools/match", icon: HeartHandshake, name: "Kundli Match", desc: "Pair compatibility (KP + 8-kuta)" },
];

export default function ToolsHubPage() {
  return (
    <main
      style={{
        padding: "24px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        minHeight: "100vh",
      }}
    >
      <header>
        <div style={styles.sectionLabel}>KP Tools</div>
        <h1 style={styles.pageTitle}>Standalone tools</h1>
        <p style={{ fontSize: 13, color: theme.text.muted, margin: "4px 0 0", maxWidth: 600 }}>
          Tools that don't need a client context. For client-specific analysis (Marriage, Career, Dasha), open a client.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 12,
        }}
      >
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              style={{
                backgroundColor: theme.bg.content,
                border: theme.border.default,
                borderRadius: theme.radius.md,
                padding: 20,
                textDecoration: "none",
                color: theme.text.primary,
                display: "flex",
                alignItems: "center",
                gap: 16,
                transition: "border-color 150ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: "rgba(201,169,110,0.1)",
                  color: theme.gold,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 2 }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 12, color: theme.text.muted, lineHeight: 1.4 }}>{t.desc}</div>
              </div>
              <ChevronRight size={14} color={theme.text.dim} />
            </Link>
          );
        })}
      </div>
    </main>
  );
}
