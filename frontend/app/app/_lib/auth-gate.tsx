"use client";

/**
 * AuthGate (Phase 2 Slice 1 — 2026-06-02).
 *
 * Wraps the /app subtree. Redirects anonymous users to /auth/login
 * with a ?redirect= param so they bounce back here after sign-in.
 *
 * Behavior matrix:
 *   status === "loading"        → render a minimal loading state
 *                                  (avoid flashing /app content for
 *                                  half a second before the redirect
 *                                  fires)
 *   status === "anonymous"      → router.replace("/auth/login?redirect=...")
 *                                  + render nothing
 *   status === "authenticated"  → render {children} (the app)
 *   status === "unconfigured"   → render an explainer (Supabase env
 *                                  vars not set — pre-launch dev state)
 *
 * Why this is its own component (not inlined in layout.tsx):
 *   - Easy to write a regression test against
 *   - Keeps layout.tsx tiny + readable
 *   - Reusable if we later add other auth-gated areas (admin
 *     dashboard, etc.)
 *
 * Why redirect.replace (not push):
 *   - We don't want a back-button trip to /app (which would just
 *     redirect again). `replace` puts /auth/login in place of /app
 *     in history, so browser back goes wherever the user was before.
 *
 * Why include current path in ?redirect= param:
 *   - The login page reads this and routes back to where the user
 *     was trying to go after they sign in. Standard pattern.
 *   - We already implemented this on the /auth/login side in Phase 1.
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { isSupabaseConfigured } from "@/lib/auth/supabase-client";
import { theme } from "@/lib/theme";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Tracks whether we've already kicked off the redirect, so the
  // useEffect doesn't re-fire on re-renders.
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (status !== "anonymous") return;
    if (redirecting) return;
    setRedirecting(true);
    // Preserve the destination so /auth/login can route back after
    // successful sign-in. Strip any query string from the path —
    // the G2 ?t=tab routing might still be present in old links.
    const redirectTo = encodeURIComponent(pathname || "/app");
    router.replace(`/auth/login?redirect=${redirectTo}`);
  }, [status, redirecting, router, pathname]);

  // While Supabase env vars are absent (e.g., local dev before
  // SETUP-PHASE-1.md complete), don't redirect — just show a
  // helpful message. This avoids breaking the local-dev workflow
  // for anyone who hasn't set up Supabase yet.
  if (!isSupabaseConfigured) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: theme.bg.page,
          color: theme.text.primary,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <h1
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 24,
              margin: "0 0 12px",
            }}
          >
            Auth not configured
          </h1>
          <p
            style={{
              fontSize: 14,
              color: theme.text.muted,
              lineHeight: 1.6,
            }}
          >
            The frontend is missing <code>NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            or <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. See{" "}
            <code>SETUP-PHASE-1.md</code> in the repo root for setup
            instructions.
          </p>
        </div>
      </div>
    );
  }

  // Loading + anonymous: render a minimal hold-state so we don't
  // flash app chrome before the redirect happens. The redirect
  // happens in the useEffect above; this is just the visible
  // placeholder.
  if (status === "loading" || status === "anonymous") {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: theme.bg.page,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: theme.text.muted,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {status === "loading" ? "Loading…" : "Signing in…"}
        </div>
      </div>
    );
  }

  // status === "authenticated" — render the app.
  return <>{children}</>;
}
