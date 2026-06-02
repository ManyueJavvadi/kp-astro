"use client";

/**
 * /auth/signup — astrologer account creation.
 *
 * Form fields: display_name (optional), email, password (8+ chars).
 *
 * Flow:
 *   1. POST to Supabase signup (via AuthContext.signUp)
 *   2. Supabase emails the user a confirm link (we assume "Confirm email"
 *      is enabled on the project — should be enforced at the dashboard)
 *   3. We show a "check your email" screen
 *   4. User clicks the link → lands at /auth/confirm with session in URL
 *   5. /auth/confirm picks up the session, then redirects to /app
 *
 * If Supabase is configured to NOT require email confirm, signUp returns
 * a session immediately and we go straight to /app.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { isSupabaseConfigured } from "@/lib/auth/supabase-client";
import {
  AuthShell,
  FormField,
  inputStyle,
  buttonPrimaryStyle,
  buttonDisabledStyle,
} from "../_shell";
import { theme } from "@/lib/theme";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentConfirmEmail, setSentConfirmEmail] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <AuthShell
        title="Auth not configured yet"
        subtitle="The backend has not been wired to Supabase. See SETUP-PHASE-1.md."
      >
        <div style={{ fontSize: 13, lineHeight: 1.6, color: theme.text.muted }}>
          Once <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set, this form will
          allow new astrologers to sign up.
        </div>
      </AuthShell>
    );
  }

  if (sentConfirmEmail) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a confirmation link to ${email}. Click it to finish signing up.`}
      >
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: theme.text.muted,
            textAlign: "center",
          }}
        >
          Didn&apos;t get the email? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setSentConfirmEmail(false)}
            style={{
              background: "none",
              border: "none",
              color: "#c9a96e",
              cursor: "pointer",
              padding: 0,
              fontSize: 13,
            }}
          >
            try again
          </button>
          .
        </div>
      </AuthShell>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    const { error, needsEmailConfirm } = await signUp(email, password, {
      displayName: displayName || undefined,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (needsEmailConfirm) {
      setSentConfirmEmail(true);
      return;
    }
    // Signed in immediately (email confirm disabled).
    router.replace("/app");
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="30-day free trial of Plus. No credit card required."
    >
      <form onSubmit={handleSubmit}>
        <FormField label="Your name" htmlFor="display_name" hint="Shown on client portal pages.">
          <input
            id="display_name"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle}
            disabled={submitting}
          />
        </FormField>

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

        <FormField
          label="Password"
          htmlFor="password"
          hint="At least 8 characters."
        >
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
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
          disabled={submitting || !email || password.length < 8}
          style={
            submitting || !email || password.length < 8
              ? buttonDisabledStyle
              : buttonPrimaryStyle
          }
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div
        style={{
          marginTop: 18,
          textAlign: "center",
          fontSize: 12,
          color: theme.text.muted,
        }}
      >
        Already have an account?{" "}
        <Link
          href="/auth/login"
          style={{ color: "#c9a96e", textDecoration: "none" }}
        >
          Sign in
        </Link>
      </div>
    </AuthShell>
  );
}
