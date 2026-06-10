import type { NextConfig } from "next";

// 2026-06-08 audit fix (P2): the app shipped with NO HTTP security
// headers. These four are pure wins (they can't break a same-origin SPA):
//   - X-Frame-Options: DENY — blocks clickjacking. The login/signup pages
//     handle credentials; framing them is never legitimate here.
//   - X-Content-Type-Options: nosniff — stops MIME-sniffing attacks.
//   - Referrer-Policy: strict-origin-when-cross-origin — on cross-origin
//     navigations only the origin (not the path) is sent, so a portal
//     /c/<slug> URL — where the slug IS the access token — never leaks via
//     the Referer header to a third-party link inside a note.
//   - Permissions-Policy — disable unused powerful features; geolocation
//     stays self-allowed because the Ruling-Planets live-location feature
//     uses it.
// HSTS is intentionally omitted — Vercel injects it at the platform edge.
// A Content-Security-Policy is deferred: it needs careful testing against
// Supabase, Google Fonts, and the app's inline styles, and a wrong CSP
// silently breaks auth. Tracked as a follow-up (start in Report-Only).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to every route.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
