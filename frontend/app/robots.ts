/**
 * robots.txt (Phase 5 SEO — 2026-06-02).
 *
 * Next.js App Router auto-detects this file and serves it as
 * /robots.txt. Tells crawlers what they can / can't visit.
 *
 * Allow rules:
 *   /              — landing page
 *   /privacy       — public legal
 *   /terms         — public legal
 *
 * Disallow rules:
 *   /app/*         — gated content (auth required); crawlers can't
 *                    log in anyway, no point fetching
 *   /auth/*        — transactional flows, no SEO value
 *   /c/*           — per-client portal pages are INVITE LINKS.
 *                    Indexing them would defeat the privacy model
 *                    (search "John Doe astrology" → finds his portal)
 *   /api/*         — backend mounted at devastroai.up.railway.app
 *                    not on the frontend domain, but defensive anyway
 */

import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://devastroai.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms"],
        disallow: ["/app/", "/auth/", "/c/", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
