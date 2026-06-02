"use client";

/**
 * /auth/reset-password — dual purpose:
 *   1. If NOT authenticated and no recovery session in URL: show "send
 *      reset email" form
 *   2. If a recovery session is present (user just clicked the email
 *      link): show "set new password" form
 *
 * Supabase puts the recovery session in the URL hash. The Supabase
 * client detects this on first construction (we set detectSessionInUrl:
 * true) and creates a TYPE=recovery session — which our AuthProvider
 * mirrors as `status === "authenticated"`.
 *
 * We don't have a clean way to tell "this is a recovery session, not a
 * normal login" from the session object alone, so we check the URL hash
 * directly on mount.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function ResetPasswordPage() {
  const { requestPasswordReset, updatePassword, signOut } = useAuth();
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // Detect whether we landed here from an email link.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    if (hash.includes("type=recovery")) {
      setIsRecoveryMode(true);
    }
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <AuthShell title="Auth not configured yet">
        <div style={{ fontSize: 13, color: theme.text.muted }}>
          See SETUP-PHASE-1.md for the Supabase setup steps.
        </div>
      </AuthShell>
    );
  }

  return isRecoveryMode ? (
    <SetNewPasswordForm
      updatePassword={updatePassword}
      onDone={async () => {
        // Sign out so the user re-logs in with the new password fresh —
        // safer than carrying a recovery session into the normal app.
        await signOut();
        window.location.href = "/auth/login";
      }}
    />
  ) : (
    <RequestResetForm requestPasswordReset={requestPasswordReset} />
  );
}

function RequestResetForm({
  requestPasswordReset,
}: {
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a reset link to ${email}. Click it to choose a new password.`}
      >
        <div style={{ textAlign: "center", fontSize: 13, color: theme.text.muted }}>
          <Link href="/auth/login" style={{ color: "#c9a96e", textDecoration: "none" }}>
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await requestPasswordReset(email);
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email — we'll send a reset link.">
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
        {error && (
          <div style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting || !email}
          style={submitting || !email ? buttonDisabledStyle : buttonPrimaryStyle}
        >
          {submitting ? "Sending…" : "Send reset link"}
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
        <Link href="/auth/login" style={{ color: "#c9a96e", textDecoration: "none" }}>
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}

function SetNewPasswordForm({
  updatePassword,
  onDone,
}: {
  updatePassword: (
    pw: string,
  ) => Promise<{ error: Error | null }>;
  onDone: () => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    await onDone();
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a new password for your account.">
      <form onSubmit={handleSubmit}>
        <FormField label="New password" htmlFor="password">
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
        <FormField label="Confirm password" htmlFor="confirm">
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={inputStyle}
            disabled={submitting}
          />
        </FormField>
        {error && (
          <div style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting || !password || !confirm}
          style={
            submitting || !password || !confirm
              ? buttonDisabledStyle
              : buttonPrimaryStyle
          }
        >
          {submitting ? "Saving…" : "Set new password"}
        </button>
      </form>
    </AuthShell>
  );
}
