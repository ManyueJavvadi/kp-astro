/**
 * Sentry edge-runtime config (middleware + edge API routes).
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
const env = process.env.NEXT_PUBLIC_APP_ENV ?? "development";

if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: env === "production" ? 0.1 : 1.0,
    debug: false,
  });
}
