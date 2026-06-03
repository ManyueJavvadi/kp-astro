"use client";

/**
 * /auth/login — astrologer sign-in.
 *
 * Forms post to Supabase Auth via AuthContext.signIn. On success the
 * AuthProvider sees the new session via its onAuthStateChange listener
 * and updates status → "authenticated". This page redirects to /app
 * once that happens (effect watches status).
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { isSupabaseConfigured } from "@/lib/auth/supabase-client";
import {
  AuthShell,
  FormField,
  inputStyle,
  buttonPrimaryStyle,
  buttonDisabledStyle,
} from "../_shell";
import { PasswordInput } from "@/components/ui/password-input";
import { theme } from "@/lib/theme";

// useSearchParams() requires a Suspense boundary for static prerender
// (Next.js App Router rule). Page export wraps the actual form.
export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShell title="Loading…">{null}</AuthShell>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, signIn } = useAuth();

  const redirectTo = searchParams.get("redirect") || "/app";
  // P0-4 (deep-scan-2): when AuthProvider's 401 handler bounces the
  // user here, ?reauth=1 is in the URL. Show a banner explaining why
  // they had to sign back in.
  const reauth = searchParams.get("reauth") === "1";
  // Wave 14 (2026-06-03, item #6): signup's "I've confirmed — sign
  // in now" button passes ?email=... so the user doesn't retype.
  // Read BEFORE useState below — TDZ rules.
  const prefillEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-redirect if already signed in.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(redirectTo);
    }
  }, [status, router, redirectTo]);

  if (!isSupabaseConfigured) {
    return (
      <AuthShell
        title="Auth not configured yet"
        subtitle="The backend has not been wired to Supabase. See SETUP-PHASE-1.md."
      >
        <div style={{ fontSize: 13, lineHeight: 1.6, color: theme.text.muted }}>
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your Vercel project,
          redeploy, and the login form will activate.
        </div>
      </AuthShell>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Redirect happens via the useEffect above when status flips.
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your DevAstroAI workspace.">
      {reauth && (
        <div
          role="status"
          style={{
            marginBottom: 18,
            padding: "12px 14px",
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.3)",
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.5,
            color: "#fbbf24",
          }}
        >
          Your session expired — please sign in again. We'll bring you
          back to where you left off.
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <FormField label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            disabled={submitting}
          />
        </FormField>

        <FormField label="Password" htmlFor="password">
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            disabled={submitting}
          />
        </FormField>

        {error && (
          <div
            style={{
              fontSize: 12,
              color: "#f87171",
              marginBottom: 12,
              padding: "8px 12px",
              background: "rgba(248,113,113,0.06)",
              border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: 6,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !email || !password}
          style={
            submitting || !email || !password
              ? buttonDisabledStyle
              : buttonPrimaryStyle
          }
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 18,
          fontSize: 12,
          color: theme.text.muted,
        }}
      >
        <Link
          href="/auth/reset-password"
          style={{ color: "#c9a96e", textDecoration: "none" }}
        >
          Forgot password?
        </Link>
        <Link
          href="/auth/signup"
          style={{ color: "#c9a96e", textDecoration: "none" }}
        >
          Create account
        </Link>
      </div>
    </AuthShell>
  );
}
