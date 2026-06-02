"use client";

/**
 * TanStack Query provider (Phase 1, ADR-004 — server state layer).
 *
 * Mounted in the root layout so every page gets the QueryClient. The
 * client itself is created once per browser (useState lazy init) so it
 * survives re-renders.
 *
 * Defaults chosen:
 *   - staleTime 30s: most resources are user-edited, refresh frequently
 *     is wasteful for read endpoints with no concurrent editors
 *   - refetchOnWindowFocus: false. Astrologers ALT-TAB constantly while
 *     reading; we don't want a chart-list refetch every time they peek
 *     at WhatsApp.
 *   - retry: 1 (instead of default 3) — backend rate limiter would
 *     compound failures into 429s.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30s
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            retry: 0, // mutations should NOT auto-retry (could double-charge etc.)
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
