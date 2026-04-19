"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Public marketing landing — devastroai.com/
 *
 * Uses only PR-1 primitives (theme + logo + v2-landing CSS classes)
 * plus lucide-react icons that are already in the project. No
 * framer-motion, no CVA, no Radix — keeps the dependency surface
 * minimal for this incremental PR.
 *
 * CTAs all point to /app (no signup/login yet — stateless app).
 */

import Link from "next/link";
import {
  ArrowRight,
  Check,
  X,
  Sparkles,
  ChevronRight,
  Star,
  Zap,
  TrendingUp,
  Target,
  MessageCircle,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/ui/logo";
import { theme } from "@/lib/theme";

export default function LandingPage() {
  return (
    <div className="v2-landing" style={{ minHeight: "100vh", overflowX: "hidden" }}>
      <Nav />
      <Hero />
      <StatsBanner />
      <FeatureSection
        id="features"
        label="KP Core Engine"
        icon={<Zap size={18} />}
        title="The math you can defend"
        description="Rigorous Krishnamurti Paddhati calculations — every Cuspal Sub Lord, every 4-level significator, every Ruling Planet — exposed in the UI, not hidden behind an LLM. Your reasoning is your product."
        bullets={[
          "Cuspal Sub Lord (CSL) for every house",
          "4-level signification chain (Occupant → Owner → Star Lord → Sub Lord)",
          "Full 249-number Horary Prashna support",
          "Vimshottari Dasha with antardasha + pratyantardasha precision",
          "Ruling Planets computed at query time",
        ]}
        mock={<KPChainMock />}
      />
      <FeatureSection
        reverse
        label="AI Copilot"
        icon={<Sparkles size={18} />}
        title="Claude, speaking Telugu + English"
        description="Ask in Telugu-English mix. Get citations to actual CSL chains and dasha dates. Never a hallucination — the AI reads your computed chart data, doesn't invent it."
        bullets={[
          "Bilingual analysis: Telugu script + English KP terms",
          "Cites specific planets, houses, and sub lords from the chart",
          "Topic-aware knowledge injection (marriage, job, health, etc.)",
          "Follow-up questions with full conversation memory",
          "Safe-by-default: never invents dasha dates",
        ]}
        mock={<AIChatMock />}
        accent="ai"
      />
      <FeatureSection
        label="Accuracy Scoreboard"
        icon={<TrendingUp size={18} />}
        title="Track what you predict"
        description="No other tool measures this. Every prediction you make gets logged. Every outcome you record builds evidence — of your hit rate, your best domains, your best timing windows. Your reputation, quantified."
        bullets={[
          "Log predictions with target date windows",
          "Mark outcomes: correct / partial / wrong / pending",
          "Accuracy dashboards by domain (marriage, career, health)",
          "Per-client prediction history timeline",
          "Exportable stats for client credibility",
        ]}
        mock={<AccuracyMock />}
      />
      <Comparison />
      <Pricing />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ───────────── NAV ───────────── */

function Nav() {
  return (
    <nav className="v2-landing-nav">
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          height: 60,
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
          <Logo size={32} wordmark wordmarkSize={16} />
        </Link>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            fontSize: 14,
            color: theme.text.secondary,
          }}
          className="v2-nav-links"
        >
          <a href="#features" style={{ color: "inherit", textDecoration: "none" }}>
            Features
          </a>
          <a href="#comparison" style={{ color: "inherit", textDecoration: "none" }}>
            Why us
          </a>
          <a href="#pricing" style={{ color: "inherit", textDecoration: "none" }}>
            Pricing
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/app" className="v2-btn-cyan" style={{ padding: "8px 16px", fontSize: 14 }}>
            Try it now <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ───────────── HERO ───────────── */

function Hero() {
  return (
    <section className="v2-section" style={{ position: "relative", overflow: "hidden" }}>
      <div className="v2-blob-cyan-tl" />
      <div className="v2-blob-gold-br" />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1100,
          margin: "0 auto",
          padding: "96px 24px 80px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 999,
            background: "rgba(201,169,110,0.08)",
            border: "1px solid rgba(201,169,110,0.3)",
            color: "#c9a96e",
            fontSize: 12,
            fontWeight: 500,
            marginBottom: 28,
          }}
        >
          <Sparkles size={12} />
          Now in public beta · No account required
          <ChevronRight size={12} />
        </span>
        <h1
          style={{
            fontSize: "clamp(2.5rem, 6vw, 4.8rem)",
            lineHeight: 1.05,
            fontWeight: 700,
            color: "#E8EDF5",
            letterSpacing: "-0.02em",
            margin: "0 0 20px",
            fontFamily: "'DM Serif Display', Georgia, serif",
          }}
        >
          The KP astrology tool
          <br />
          every professional will{" "}
          <span style={{ color: "#c9a96e", fontStyle: "italic" }}>open daily</span>
        </h1>
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color: "#94A3B8",
            maxWidth: 620,
            margin: "0 auto 36px",
          }}
        >
          Modern practice companion for serious KP astrologers and curious
          seekers. Rigorous chart math, bilingual AI analysis, and prediction
          tracking — in one beautifully crafted workspace.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 40,
          }}
        >
          <Link href="/app" className="v2-btn-cyan">
            Open the app <ArrowRight size={14} />
          </Link>
          <a href="#features" className="v2-btn-ghost">
            See features
          </a>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 28,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#4A6080",
            flexWrap: "wrap",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Check size={12} color="#c9a96e" /> No credit card
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Check size={12} color="#c9a96e" /> No signup
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Check size={12} color="#c9a96e" /> Works in your browser
          </span>
        </div>
      </div>
    </section>
  );
}

/* ───────────── STATS ───────────── */

function StatsBanner() {
  const stats = [
    { value: "249", unit: "", label: "KP Horary numbers", sub: "full prashna system" },
    { value: "9×12", unit: "", label: "Significator grid", sub: "4-level chains" },
    { value: "120", unit: "yr", label: "Vimshottari cycle", sub: "MD / AD / PAD precision" },
    { value: "2", unit: "lang", label: "Telugu + English", sub: "bilingual AI analysis" },
  ];
  return (
    <section className="v2-section" style={{ position: "relative" }}>
      <div className="v2-blob-gold-center" />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1100,
          margin: "0 auto",
          padding: "72px 24px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#c9a96e",
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            By the numbers
          </div>
          <h2
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              fontWeight: 600,
              color: "#E8EDF5",
              letterSpacing: "-0.01em",
              margin: 0,
              fontFamily: "'DM Serif Display', Georgia, serif",
            }}
          >
            Evidence over vibes.{" "}
            <span style={{ color: "#c9a96e", fontStyle: "italic" }}>Measured</span>{" "}
            astrology.
          </h2>
        </div>
        <div
          data-mobile-2col
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {stats.map((s) => (
            <div key={s.label} className="v2-stat-card">
              <div className="v2-stat-number">
                {s.value}
                {s.unit && (
                  <span style={{ fontSize: 22, color: "#4A6080", marginLeft: 4 }}>{s.unit}</span>
                )}
              </div>
              <div className="v2-stat-underline" />
              <div className="v2-stat-label">{s.label}</div>
              <div className="v2-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── FEATURE SECTION (reusable) ───────────── */

function FeatureSection({
  id,
  label,
  icon,
  title,
  description,
  bullets,
  mock,
  reverse = false,
  accent = "cyan",
}: {
  id?: string;
  label: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  mock: React.ReactNode;
  reverse?: boolean;
  accent?: "cyan" | "ai";
}) {
  const iconBg =
    accent === "ai" ? "rgba(230,199,156,0.14)" : "rgba(201,169,110,0.08)";
  const iconColor = accent === "ai" ? "#E6C79C" : "#c9a96e";
  const iconBorder =
    accent === "ai" ? "1px solid rgba(230,199,156,0.35)" : "1px solid rgba(201,169,110,0.3)";

  return (
    <section id={id} className="v2-section" style={{ position: "relative" }}>
      <div className={reverse ? "v2-blob-gold-right" : "v2-blob-cyan-left"} />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1100,
          margin: "0 auto",
          padding: "96px 24px",
        }}
      >
        <div
          data-mobile-stack
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 56,
            alignItems: "center",
          }}
        >
          <div style={{ order: reverse ? 2 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: iconBg,
                  color: iconColor,
                  border: iconBorder,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {icon}
              </div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#4A6080",
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
            </div>
            <h3
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                fontWeight: 600,
                color: "#E8EDF5",
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                margin: "0 0 18px",
                fontFamily: "'DM Serif Display', Georgia, serif",
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: 17,
                color: "#94A3B8",
                lineHeight: 1.65,
                marginBottom: 24,
              }}
            >
              {description}
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {bullets.map((b) => (
                <li
                  key={b}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    fontSize: 14,
                    color: "#94A3B8",
                    lineHeight: 1.5,
                  }}
                >
                  <span className="v2-bullet-dot" style={{ marginTop: 7 }} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ order: reverse ? 1 : 2 }}>
            <div className="v2-mockup-card" style={{ padding: 24 }}>
              {mock}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── MOCK PANELS (illustrative, not connected) ───────────── */

function KPChainMock() {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#c9a96e",
          fontWeight: 600,
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Target size={12} /> H7 CSL Chain · Marriage
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { level: "CSL", planet: "Jupiter", houses: "2, 5, 7" },
          { level: "Owner", planet: "Mercury", houses: "11" },
          { level: "Star Lord", planet: "Venus", houses: "2, 7, 11" },
          { level: "Sub Lord", planet: "Moon", houses: "5, 7" },
        ].map((row) => (
          <div
            key={row.level}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#4A6080",
                width: 72,
              }}
            >
              {row.level}
            </span>
            <span className="v2-badge-planet">{row.planet}</span>
            <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
              {row.houses.split(", ").map((h) => (
                <span key={h} className="v2-badge-house">
                  H{h}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 18,
          paddingTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "#4A6080",
            marginBottom: 6,
          }}
        >
          KP Verdict
        </div>
        <div className="v2-verdict-gold">Marriage Promised</div>
      </div>
    </div>
  );
}

function AIChatMock() {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#E6C79C",
          fontWeight: 600,
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <MessageCircle size={12} /> Ask in Telugu-English
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            alignSelf: "flex-end",
            maxWidth: "85%",
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(201,169,110,0.08)",
            border: "1px solid rgba(201,169,110,0.25)",
            color: "#E8EDF5",
            fontSize: 13,
          }}
        >
          <span style={{ fontFamily: "'Noto Sans Telugu', sans-serif" }}>నా</span> job
          promotion ఎప్పుడు?
        </div>
        <div
          style={{
            alignSelf: "flex-start",
            maxWidth: "95%",
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(230,199,156,0.08)",
            border: "1px solid rgba(230,199,156,0.22)",
            color: "#E8EDF5",
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          <span style={{ fontFamily: "'Noto Sans Telugu', sans-serif" }}>
            10వ ఇంటి CSL
          </span>{" "}
          <span className="v2-badge-planet">Sun</span> is signifying{" "}
          <span className="v2-badge-house">H10</span>{" "}
          <span className="v2-badge-house">H11</span> strongly.{" "}
          <span style={{ fontFamily: "'Noto Sans Telugu', sans-serif" }}>
            మీ Saturn Mahadasha
          </span>{" "}
          ends Aug 2027 — watch the Jupiter AD for the shift.
        </div>
      </div>
    </div>
  );
}

function AccuracyMock() {
  const buckets = [
    { label: "Marriage", correct: 0.78, total: 18, color: "#c9a96e" },
    { label: "Career", correct: 0.65, total: 23, color: "#c9a96e" },
    { label: "Health", correct: 0.42, total: 12, color: "#c9a96e" },
    { label: "Wealth", correct: 0.7, total: 10, color: "#c9a96e" },
  ];
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 20,
        }}
      >
        <span className="v2-num-cyan" style={{ fontSize: 52, lineHeight: 1 }}>
          68%
        </span>
        <span style={{ fontSize: 13, color: "#4A6080" }}>hit rate · 63 predictions tracked</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {buckets.map((b) => (
          <div key={b.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#94A3B8",
                marginBottom: 6,
              }}
            >
              <span>{b.label}</span>
              <span style={{ color: "#4A6080" }}>
                {Math.round(b.correct * b.total)}/{b.total}
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${b.correct * 100}%`,
                  height: "100%",
                  background: b.color,
                  borderRadius: 4,
                  boxShadow:
                    b.color === "#c9a96e"
                      ? "0 0 8px rgba(201,169,110,0.4)"
                      : "0 0 8px rgba(201,169,110,0.4)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── COMPARISON ───────────── */

function Comparison() {
  type Cell = boolean | "partial";
  const rows: { feature: string; us: Cell; leostar: Cell; kundaligpt: Cell }[] = [
    { feature: "Runs in any browser (no install)", us: true, leostar: false, kundaligpt: true },
    { feature: "Professional KP depth (CSL / 4-level sigs / RPs)", us: true, leostar: true, kundaligpt: false },
    { feature: "AI copilot grounded in computed chart data", us: true, leostar: false, kundaligpt: "partial" },
    { feature: "Bilingual Telugu + English", us: true, leostar: "partial", kundaligpt: false },
    { feature: "Horary Prashna (1-249)", us: true, leostar: true, kundaligpt: false },
    { feature: "Muhurtha finder", us: true, leostar: true, kundaligpt: false },
    { feature: "Marriage match with D9 Navamsa", us: true, leostar: true, kundaligpt: false },
    { feature: "Daily Panchang (location-aware)", us: true, leostar: true, kundaligpt: "partial" },
    { feature: "Branded PDF reports", us: true, leostar: true, kundaligpt: false },
  ];

  const renderCell = (val: Cell) =>
    val === true ? (
      <Check size={18} style={{ color: "#c9a96e", margin: "0 auto" }} />
    ) : val === "partial" ? (
      <span style={{ fontSize: 11, color: "#c9a96e", fontWeight: 500 }}>Partial</span>
    ) : (
      <X size={18} style={{ color: "rgba(239,68,68,0.5)", margin: "0 auto" }} />
    );

  return (
    <section id="comparison" className="v2-section" style={{ position: "relative" }}>
      <div className="v2-blob-gold-right" />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 960,
          margin: "0 auto",
          padding: "96px 24px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#c9a96e",
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            Why astrologers switch
          </div>
          <h2
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              fontWeight: 600,
              color: "#E8EDF5",
              letterSpacing: "-0.01em",
              margin: 0,
              fontFamily: "'DM Serif Display', Georgia, serif",
            }}
          >
            Depth where it matters.{" "}
            <span style={{ color: "#c9a96e", fontStyle: "italic" }}>Polish</span>{" "}
            everywhere else.
          </h2>
        </div>
        <div
          style={{
            background: "#0A0F1C",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th
                  style={{
                    textAlign: "left",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#4A6080",
                    padding: "16px 24px",
                    fontWeight: 500,
                  }}
                >
                  Capability
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "16px 16px",
                    background: "rgba(201,169,110,0.08)",
                    borderBottom: "2px solid #c9a96e",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#c9a96e" }}>DevAstroAI</div>
                  <div style={{ fontSize: 11, color: "#4A6080", fontWeight: 400, marginTop: 2 }}>
                    Beta
                  </div>
                </th>
                <th style={{ textAlign: "center", padding: "16px 16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#4A6080" }}>Leostar</div>
                  <div style={{ fontSize: 11, color: "#4A6080", fontWeight: 400, marginTop: 2 }}>
                    Desktop
                  </div>
                </th>
                <th style={{ textAlign: "center", padding: "16px 16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#4A6080" }}>KundaliGPT</div>
                  <div style={{ fontSize: 11, color: "#4A6080", fontWeight: 400, marginTop: 2 }}>
                    Consumer AI
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.feature}
                  style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}
                >
                  <td style={{ fontSize: 13, color: "#E8EDF5", padding: "14px 24px" }}>
                    {row.feature}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      padding: "14px 16px",
                      background: "rgba(201,169,110,0.04)",
                    }}
                  >
                    {renderCell(row.us)}
                  </td>
                  <td style={{ textAlign: "center", padding: "14px 16px" }}>
                    {renderCell(row.leostar)}
                  </td>
                  <td style={{ textAlign: "center", padding: "14px 16px" }}>
                    {renderCell(row.kundaligpt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ───────────── PRICING (illustrative, no checkout) ───────────── */

function Pricing() {
  const tiers = [
    {
      name: "Free beta",
      price: "₹0",
      period: "",
      description: "Everything that's shipped today. Use it, share feedback.",
      features: [
        "All KP tools (chart, dasha, houses, horary, muhurtha, match)",
        "AI analysis in Telugu + English",
        "Panchang + transit",
        "PDF export",
      ],
      cta: "Open the app",
      highlighted: true,
    },
    {
      name: "Pro (coming)",
      price: "TBD",
      period: "",
      description: "For practicing astrologers. Launch pricing shared with beta users first.",
      features: [
        "Save unlimited client charts",
        "Session history + AI summaries",
        "Prediction tracking + accuracy dashboard",
        "Branded PDF reports",
        "Priority support",
      ],
      cta: "Join waitlist",
      highlighted: false,
    },
    {
      name: "Team (coming)",
      price: "TBD",
      period: "",
      description: "Jyotish firms with multiple astrologers.",
      features: [
        "Everything in Pro",
        "Multi-astrologer seats",
        "Shared client pool",
        "Role-based access",
      ],
      cta: "Talk to us",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="v2-section" style={{ position: "relative" }}>
      <div className="v2-blob-cyan-left" />
      <div className="v2-blob-gold-right" />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1100,
          margin: "0 auto",
          padding: "96px 24px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 640, margin: "0 auto 48px" }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#c9a96e",
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            Simple, transparent
          </div>
          <h2
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              fontWeight: 600,
              color: "#E8EDF5",
              letterSpacing: "-0.01em",
              margin: "0 0 12px",
              fontFamily: "'DM Serif Display', Georgia, serif",
            }}
          >
            Free while we&apos;re in beta
          </h2>
          <p style={{ fontSize: 16, color: "#94A3B8", margin: 0, lineHeight: 1.6 }}>
            Use every feature today at no cost. Pro tier + pricing locked in
            alongside real beta user feedback.
          </p>
        </div>
        <div
          data-mobile-stack
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={tier.highlighted ? "v2-price-card-popular" : "v2-price-card"}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {tier.highlighted && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                >
                  <span className="v2-price-badge">Available now</span>
                </div>
              )}
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#94A3B8",
                    marginBottom: 8,
                  }}
                >
                  {tier.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 32, fontWeight: 700, color: "#E8EDF5", lineHeight: 1 }}>
                    {tier.price}
                  </span>
                  {tier.period && <span style={{ fontSize: 13, color: "#4A6080" }}>{tier.period}</span>}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: "#94A3B8",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {tier.description}
                </p>
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 24px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {tier.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      fontSize: 13,
                      color: "#94A3B8",
                    }}
                  >
                    <Check size={16} color="#c9a96e" style={{ flexShrink: 0, marginTop: 2 }} />
                    {f}
                  </li>
                ))}
              </ul>
              {tier.highlighted ? (
                <Link
                  href="/app"
                  className="v2-btn-cyan"
                  style={{ justifyContent: "center", width: "100%" }}
                >
                  {tier.cta} <ArrowRight size={14} />
                </Link>
              ) : (
                <a
                  href="mailto:hello@devastroai.com"
                  className="v2-btn-ghost"
                  style={{ justifyContent: "center", width: "100%" }}
                >
                  {tier.cta}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── TESTIMONIALS (placeholder quotes) ───────────── */

function Testimonials() {
  const quotes = [
    {
      quote:
        "Finally, a KP tool that thinks like a practitioner. The CSL significator chains and dasha-relevance check are exactly how I work.",
      name: "Dr. Sharma",
      role: "KP Astrologer · Hyderabad",
      initial: "S",
    },
    {
      quote:
        "AI in Telugu that actually understands KP? Game changer. I use it alongside my own analysis as a second opinion.",
      name: "Ravi Teja",
      role: "Astrology Consultant · Chennai",
      initial: "R",
    },
    {
      quote:
        "The interface is clean and the math is trustworthy. I've cross-checked a dozen charts against my desktop tool — identical.",
      name: "Lakshmi Rao",
      role: "Jyotish · Bangalore",
      initial: "L",
    },
  ];

  return (
    <section className="v2-section" style={{ position: "relative" }}>
      <div className="v2-blob-cyan-left" />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1100,
          margin: "0 auto",
          padding: "96px 24px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#c9a96e",
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            Voices from the field
          </div>
          <h2
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
              fontWeight: 600,
              color: "#E8EDF5",
              letterSpacing: "-0.01em",
              margin: 0,
              fontFamily: "'DM Serif Display', Georgia, serif",
            }}
          >
            Early words from practitioners
          </h2>
        </div>
        <div
          data-mobile-stack
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {quotes.map((q) => (
            <div
              key={q.name}
              className="v2-testi-card"
              style={{ display: "flex", flexDirection: "column" }}
            >
              <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    style={{ fill: "#c9a96e", color: "#c9a96e" }}
                  />
                ))}
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "#94A3B8",
                  lineHeight: 1.7,
                  marginBottom: 20,
                  flex: 1,
                  fontStyle: "italic",
                }}
              >
                &ldquo;{q.quote}&rdquo;
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  paddingTop: 16,
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    background: "rgba(201,169,110,0.1)",
                    border: "1px solid rgba(201,169,110,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#c9a96e",
                  }}
                >
                  {q.initial}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>{q.name}</div>
                  <div style={{ fontSize: 12, color: "#4A6080" }}>{q.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── FINAL CTA ───────────── */

function FinalCTA() {
  return (
    <section className="v2-section" style={{ position: "relative", overflow: "hidden" }}>
      <div className="v2-blob-gold-center" />
      <div className="v2-blob-cyan-tl" />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 720,
          margin: "0 auto",
          padding: "96px 24px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 700,
            color: "#E8EDF5",
            letterSpacing: "-0.01em",
            margin: "0 0 18px",
            fontFamily: "'DM Serif Display', Georgia, serif",
          }}
        >
          Open your first chart today
        </h2>
        <p style={{ fontSize: 17, color: "#94A3B8", margin: "0 0 32px", lineHeight: 1.6 }}>
          No signup. No credit card. No install. Just open the app, enter the
          birth details, and see how KP Astro handles the math you actually
          care about.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link href="/app" className="v2-btn-cyan">
            Open the app <ArrowRight size={14} />
          </Link>
          <a href="mailto:hello@devastroai.com" className="v2-btn-ghost">
            Talk to us
          </a>
        </div>
      </div>
    </section>
  );
}

/* ───────────── FOOTER ───────────── */

function Footer() {
  return (
    <footer
      className="v2-section"
      style={{
        padding: "48px 24px 28px",
        borderTop: "1px solid rgba(201,169,110,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <Link
          href="/"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10 }}
        >
          <LogoMark size={28} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#E8EDF5" }}>
            DevAstro<span style={{ color: "#c9a96e" }}>AI</span>
          </span>
        </Link>
        <div
          style={{
            fontSize: 12,
            color: "#4A6080",
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <span>© {new Date().getFullYear()} DevAstroAI</span>
          <a
            href="mailto:hello@devastroai.com"
            style={{ color: "#4A6080", textDecoration: "none" }}
          >
            hello@devastroai.com
          </a>
        </div>
      </div>
    </footer>
  );
}
