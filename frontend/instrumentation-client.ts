/**
 * Sentry client-side config. Env-gated: no-op when NEXT_PUBLIC_SENTRY_DSN is
 * unset (local dev). Loaded automatically by @sentry/nextjs on the client.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const env = process.env.NEXT_PUBLIC_APP_ENV ?? "development";

if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    // 10% of sessions, 100% of errors
    tracesSampleRate: env === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Don't pollute local logs
    debug: false,
    // Filter noisy / privacy-sensitive breadcrumbs before send
    beforeSend(event) {
      // Drop anything containing a Supabase JWT in URL params
      if (event.request?.url?.includes("access_token=")) return null;
      return event;
    },
  });
}

// Next 16 router transition hook (Sentry SDK provides this)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
