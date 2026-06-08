import type { Metadata, Viewport } from "next";
import "./globals.css";
// Phase 15.1 — Foundation. MotionRoot wraps the app in Motion's
// MotionConfig (reduced-motion support) + Lenis smooth scroll.
// See components/motion/MotionRoot.tsx for what it does and why.
import { MotionRoot } from "@/components/motion/MotionRoot";
// Phase 1 (2026-06-01) — auth + server-state foundation.
// AuthProvider: Supabase session listener + signIn/signUp/etc helpers
//   (ADR-002). Available everywhere via useAuth().
// QueryProvider: TanStack Query client (ADR-004) for server data
//   caching. Mounted at root so all routes (including auth pages)
//   share a QueryClient instance.
// Both are no-ops when their respective env vars are missing — pages
// that need them show clear "not configured yet" messages instead
// of crashing. See SETUP-PHASE-1.md.
import { AuthProvider } from "@/lib/auth/auth-context";
import { QueryProvider } from "@/lib/api/query-client";
import { EnvBanner } from "@/components/EnvBanner";

// Phase 5 SEO (2026-06-02) — full metadata pass.
// metadataBase makes relative URLs in OG/Twitter cards work.
// keywords + author + openGraph + twitter cover the major search +
// social sharing surfaces. Schema.org JSON-LD added per-page (landing
// gets organization + software application schema in its own component).
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://devastroai.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DevAstroAI — KP Astrology for Practising Astrologers",
    template: "%s · DevAstroAI",
  },
  description:
    "The first KP-rigorous, mobile-first SaaS for professional KP astrologers in India. Client CRM, KP chart engine, AI-assisted analysis, and per-client portal pages — all in one tool.",
  keywords: [
    "KP astrology",
    "Krishnamurti Paddhati",
    "KP astrology software",
    "KP astrologer app",
    "AI astrology",
    "kundali",
    "horary",
    "muhurtha",
    "Indian astrology",
    "Telugu astrology",
    "astrology CRM",
  ],
  authors: [{ name: "DevAstroAI" }],
  creator: "DevAstroAI",
  publisher: "DevAstroAI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "DevAstroAI",
    title: "DevAstroAI — KP Astrology for Practising Astrologers",
    description:
      "The first KP-rigorous, mobile-first SaaS for professional KP astrologers. Client CRM, KP chart engine, AI analysis, per-client portal pages.",
    // OG image will be added in a later polish pass once we have a
    // proper social card design. Browsers fall back to favicon for
    // now — acceptable v1.
  },
  twitter: {
    card: "summary_large_image",
    title: "DevAstroAI — KP Astrology for Practising Astrologers",
    description:
      "The first KP-rigorous, mobile-first SaaS for professional KP astrologers. Client CRM + KP chart engine + AI analysis.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    // Browser tab icon. We don't have a custom favicon file shipped
    // yet — Next falls back to /favicon.ico if present in /public.
    // TODO: ship a proper 32x32 + 16x16 favicon set.
    icon: "/favicon.ico",
  },
};

// PR A1.3-fix-25 — explicit viewport export.
// Fixes a CASCADE of mobile bugs that all stemmed from the missing tag:
//   - viewport-fit=cover unlocks env(safe-area-inset-*) on iPhone notch/home-bar.
//     Before this, padding-bottom: env(safe-area-inset-bottom) was always 0.
//   - initialScale=1 + maximumScale=5 lets users pinch-zoom for accessibility
//     (don't disable zoom — WCAG violation).
//   - themeColor matches our brand bg so iOS Safari address bar is dark, not
//     white (huge visual inconsistency before).
//   - Without an explicit viewport, Next provides a default but it's missing
//     viewport-fit and theme-color.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#09090f",
  // 2026-05-27 — `resizes-content` tells iOS Safari + Chrome Android
  // to RESIZE the layout viewport when the on-screen keyboard opens
  // (rather than overlaying it). Without this, the chat input bar
  // gets covered by the keyboard and the user can't see what they're
  // typing on the Analysis tab. With it, 100dvh containers shrink
  // and our fixed bottom nav + input naturally lift above the
  // keyboard.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* PR A1.3-fix-25 — preconnect to fonts.googleapis.com to shave
            ~150ms off cold mobile page load (font request blocks first paint
            otherwise). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=Cinzel:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* EnvBanner — visible only when NEXT_PUBLIC_ENV != "production".
            Sits fixed top-right so dev/staging tabs are unmistakable
            from prod. Renders nothing on prod builds. */}
        <EnvBanner />
        {/* QueryProvider (outermost): provides TanStack Query client
            to everything. AuthProvider (next): provides Supabase
            session state. MotionRoot (innermost-of-these): wraps in
            MotionConfig + Lenis. children = page content. */}
        <QueryProvider>
          <AuthProvider>
            <MotionRoot>{children}</MotionRoot>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
