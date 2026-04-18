/**
 * Next.js instrumentation hook — loads Sentry for server and edge runtimes.
 * Called once per worker on boot. Client-side Sentry is loaded via
 * sentry.client.config.ts automatically.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onRequestError = async (...args: any[]) => {
  const hasDsn =
    !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!hasDsn) return;
  const Sentry = await import("@sentry/nextjs");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Sentry as any).captureRequestError(...args);
};
