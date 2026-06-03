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
import { Mail, RefreshCw, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { isSupabaseConfigured, maybeGetSupabase } from "@/lib/auth/supabase-client";
import {
  AuthShell,
  FormField,
  inputStyle,
  buttonPrimaryStyle,
  buttonDisabledStyle,
} from "../_shell";
import { PasswordInput } from "@/components/ui/password-input";
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
    return <ConfirmEmailSentState email={email} onResetForm={() => setSentConfirmEmail(false)} />;
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
          <PasswordInput
            id="password"
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

// ─── Confirm-email-sent state ────────────────────────────────────────
// Wave 14 (2026-06-03, item #6).
//
// Original version: tiny "didn't get the email? try again" line — left
// non-technical astrologers stuck wondering what to do, especially when
// Gmail filed the message in spam.
//
// New version:
//   • Big mail icon + clear destination email
//   • Explicit spam-folder guidance (Gmail files first-time-sender mail
//     as spam ~70% of the time)
//   • Resend button that re-fires Supabase's resend-email API directly
//     (not just "go back and submit the form again", which doubles signup
//     attempts → potential "user already exists" error)
//   • "I've confirmed — sign in now" button so the user has a clear next
//     step after clicking the email link, even if they came back to this
//     tab instead of the link's auto-redirect
//   • "Back to signup with different email" escape hatch
function ConfirmEmailSentState({
  email,
  onResetForm,
}: {
  email: string;
  onResetForm: () => void;
}) {
  const [resending, setResending] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  async function handleResend() {
    setResendError(null);
    setResending(true);
    try {
      const supabase = maybeGetSupabase();
      if (!supabase) {
        setResendError("Supabase isn't configured.");
        return;
      }
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/confirm`
              : undefined,
        },
      });
      if (error) {
        // Most common: rate-limit ("email rate limit exceeded") when
        // Supabase's built-in SMTP throttles. Tell the user plainly.
        setResendError(
          /rate.?limit/i.test(error.message)
            ? "Too many emails recently — wait a few minutes and try again."
            : error.message,
        );
        return;
      }
      setResentAt(Date.now());
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("[signup] resend failed:", err);
      setResendError("Couldn't resend. Please wait a moment and try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell title="Check your email" subtitle="One more step to finish setting up your workspace.">
      <div style={{ textAlign: "center" }}>
        {/* Mail icon */}
        <div
          style={{
            margin: "0 auto 16px",
            width: 56,
            height: 56,
            borderRadius: 999,
            background: "rgba(201,169,110,0.10)",
            border: "1px solid rgba(201,169,110,0.3)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#c9a96e",
          }}
        >
          <Mail size={26} />
        </div>

        {/* Destination email — prominent */}
        <div
          style={{
            fontSize: 13,
            color: theme.text.muted,
            marginBottom: 4,
          }}
        >
          We sent a confirmation link to
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: theme.text.primary,
            wordBreak: "break-all",
            marginBottom: 20,
          }}
        >
          {email}
        </div>

        {/* Inbox / spam tip card */}
        <div
          style={{
            textAlign: "left",
            background: "rgba(7,11,20,0.5)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            padding: 14,
            marginBottom: 20,
            fontSize: 12.5,
            lineHeight: 1.6,
            color: theme.text.primary,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            📬 <strong>Open the email</strong> and click the link to confirm.
          </div>
          <div style={{ color: theme.text.muted }}>
            🛡️ <strong style={{ color: theme.text.primary }}>Not in your inbox?</strong>{" "}
            Check your <strong style={{ color: "#c9a96e" }}>spam folder</strong>. Gmail
            often files first-time-sender mail there.
          </div>
        </div>

        {/* Action stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* I've confirmed — sign in */}
          <Link
            href={`/auth/login?email=${encodeURIComponent(email)}`}
            style={{
              ...buttonPrimaryStyle,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <CheckCircle2 size={15} />
            I&apos;ve confirmed — sign in now
          </Link>

          {/* Resend */}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            style={{
              ...inputStyle,
              height: 42,
              cursor: resending ? "not-allowed" : "pointer",
              background: "transparent",
              border: "1px solid rgba(201,169,110,0.3)",
              color: "#c9a96e",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: resending ? "spin 1s linear infinite" : "none",
              }}
            />
            {resending ? "Resending…" : "Resend email"}
          </button>

          {/* Back to form */}
          <button
            type="button"
            onClick={onResetForm}
            style={{
              background: "transparent",
              border: "none",
              color: theme.text.muted,
              fontSize: 12,
              cursor: "pointer",
              padding: "8px 12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <ArrowLeft size={12} />
            Back to signup (try a different email)
          </button>
        </div>

        {/* Resend feedback */}
        {resendError && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "rgba(248,113,113,0.06)",
              border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: 6,
              fontSize: 12,
              color: "#f87171",
            }}
          >
            {resendError}
          </div>
        )}
        {resentAt && !resendError && (
          <div
            role="status"
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "rgba(52,211,153,0.06)",
              border: "1px solid rgba(52,211,153,0.2)",
              borderRadius: 6,
              fontSize: 12,
              color: "#34d399",
            }}
          >
            Email sent again. Allow up to a minute for it to arrive.
          </div>
        )}
      </div>
    </AuthShell>
  );
}
