"use client";

/**
 * PostHog provider — env-gated.
 *
 * Reads NEXT_PUBLIC_POSTHOG_KEY + NEXT_PUBLIC_POSTHOG_HOST.
 * If the key is missing we render children untouched — no tracking, no lib
 * load. This lets dev work offline and prod only tracks when configured.
 *
 * Tracks pageviews automatically on route change. You can also call
 * `usePostHog()` anywhere in the tree to capture custom events.
 */

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useMe } from "@/hooks/use-me";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let initialised = false;

function init() {
  if (initialised || !KEY || typeof window === "undefined") return;
  posthog.init(KEY, {
    api_host: HOST,
    // We track pageviews ourselves via App Router; disable the default
    // listener to avoid duplicates.
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
    // Respect Do Not Track
    respect_dnt: true,
  });
  initialised = true;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const { data: me } = useMe();
  const lastIdentifiedUserId = useRef<string | null>(null);

  // Initialise once
  useEffect(() => {
    init();
  }, []);

  // Identify / reset on auth change
  useEffect(() => {
    if (!KEY || typeof window === "undefined") return;
    if (me?.id && me.id !== lastIdentifiedUserId.current) {
      posthog.identify(me.id, {
        email: me.email,
        role: me.role,
        tier: me.tier,
      });
      lastIdentifiedUserId.current = me.id;
    } else if (!me && lastIdentifiedUserId.current) {
      posthog.reset();
      lastIdentifiedUserId.current = null;
    }
  }, [me]);

  // Pageview on route change
  useEffect(() => {
    if (!KEY || typeof window === "undefined" || !initialised) return;
    const url =
      pathname + (search?.toString() ? `?${search.toString()}` : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, search]);

  return <>{children}</>;
}

/** Small helper for capturing events from anywhere. Safe when disabled. */
export function capture(event: string, props?: Record<string, unknown>) {
  if (!KEY || typeof window === "undefined" || !initialised) return;
  posthog.capture(event, props);
}
