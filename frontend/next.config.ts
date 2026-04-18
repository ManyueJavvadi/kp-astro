import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

/**
 * Only wrap with Sentry in prod / when DSN is present.
 * Without SENTRY_AUTH_TOKEN you can't upload source maps — that's fine for
 * dev, Sentry just won't symbolicate. Safe to ship without it.
 */
const withSentry = (cfg: NextConfig): NextConfig => {
  const hasDsn =
    !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!hasDsn) return cfg;
  return withSentryConfig(cfg, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    tunnelRoute: "/monitoring",
    disableLogger: true,
  });
};

export default withSentry(nextConfig);
