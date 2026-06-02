/**
 * Sitemap (Phase 5 SEO — 2026-06-02).
 *
 * Next.js App Router auto-detects this file and serves it as
 * /sitemap.xml. Search engines pull it to know what pages to crawl.
 *
 * Only PUBLIC routes go here — no /app/* (gated content), no
 * /auth/* (interactive flows), no /c/[slug] (per-client URLs that
 * should NOT be indexed — they're private invite links).
 *
 * If we add public marketing content in Phase 5 (5-10 anchor content
 * pages like "What is KP astrology", "KP vs Vedic", etc.), add them
 * here so they get crawled.
 */

import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://devastroai.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    // Auth pages are intentionally NOT here — they're transactional,
    // not content surfaces. Crawlers don't need to index sign-up
    // forms.
    //
    // /app and /c/[slug] are also excluded — gated/private.
  ];
}
