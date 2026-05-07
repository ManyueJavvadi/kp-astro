import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevAstroAI — KP Astrology Intelligence",
  description: "Ancient KP wisdom with AI precision",
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
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
