"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Suspense } from "react";
import { PostHogProvider } from "@/components/providers/posthog-provider";

/**
 * Wrap the whole app in TanStack Query + toast notifications + PostHog.
 * PostHog is env-gated (no-op without NEXT_PUBLIC_POSTHOG_KEY).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );
  return (
    <QueryClientProvider client={qc}>
      {/* PostHogProvider uses useSearchParams → must be in Suspense */}
      <Suspense fallback={null}>
        <PostHogProvider>{children}</PostHogProvider>
      </Suspense>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-strong)",
            color: "var(--color-text-primary)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
