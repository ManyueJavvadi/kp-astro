"use client";

/**
 * /auth/confirm — landing page for email-confirm + OAuth redirects.
 *
 * Supabase signup with `emailRedirectTo: .../auth/confirm` sends users
 * here after they click the confirm link. The Supabase client picks up
 * the session from the URL hash, our AuthProvider sees it via
 * onAuthStateChange, and we redirect into /app.
 *
 * Wave 14 (2026-06-03, item #6) — replaced the stub success state
 * with:
 *   - Big success checkmark (so users feel rewarded for the email
 *     friction)
 *   - Visible countdown ("Taking you to your workspace in 2s…") with
 *     a manual override button so users with auto-redirect blocked or
 *     who landed via wrong browser still have a clear path
 *   - Friendly display_name greeting when present in the session
 *   - Sign-in fallback for the edge case where the URL was opened in a
 *     different browser (no session present, no auto-confirm happened)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthShell } from "../_shell";
import { theme } from "@/lib/theme";

export default function ConfirmPage() {
  const router = useRouter();
  const { status, user } = useAuth();

  // Countdown for the auto-redirect — 2 seconds, visible.
  const [secondsLeft, setSecondsLeft] = useState(2);
  useEffect(() => {
    if (status !== "authenticated") return;
    if (secondsLeft <= 0) {
      router.replace("/app");
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [status, secondsLeft, router]);

  // ─── Success state — session present ──────────────────────────────
  if (status === "authenticated") {
    const displayName =
      (user?.user_metadata?.display_name as string | undefined) ||
      (user?.user_metadata?.name as string | undefined) ||
      user?.email?.split("@")[0] ||
      null;
    return (
      <AuthShell
        title="You're in"
        subtitle="Your account is confirmed."
      >
        <div style={{ textAlign: "center" }}>
          {/* Success badge */}
          <div
            style={{
              margin: "0 auto 18px",
              width: 64,
              height: 64,
              borderRadius: 999,
              background: "rgba(52,211,153,0.10)",
              border: "1px solid rgba(52,211,153,0.35)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#34d399",
            }}
          >
            <CheckCircle2 size={30} />
          </div>

          {displayName && (
            <div
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 20,
                color: theme.text.primary,
                marginBottom: 6,
                lineHeight: 1.2,
              }}
            >
              Welcome, {displayName}.
            </div>
          )}
          <div
            style={{
              fontSize: 13,
              color: theme.text.muted,
              marginBottom: 22,
            }}
          >
            Taking you to your workspace in {secondsLeft}s…
          </div>

          {/* Manual continue */}
          <Link
            href="/app"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "12px 22px",
              borderRadius: 10,
              background:
                "linear-gradient(180deg, #e8c98a 0%, #c9a96e 60%, #b8985d 100%)",
              color: "#09090f",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              boxShadow:
                "0 0 0 1px rgba(231,201,138,0.45), 0 4px 14px rgba(0,0,0,0.4), 0 0 22px rgba(231,201,138,0.18)",
            }}
          >
            Continue to workspace
            <ArrowRight size={16} />
          </Link>
        </div>
      </AuthShell>
    );
  }

  // ─── Loading state — Supabase still parsing URL hash ──────────────
  if (status === "loading") {
    return (
      <AuthShell
        title="Confirming…"
        subtitle="One second while we verify your email."
      >
        <div
          style={{
            textAlign: "center",
            fontSize: 13,
            color: theme.text.muted,
            padding: "20px 0",
          }}
        >
          This usually takes a moment.
        </div>
      </AuthShell>
    );
  }

  // ─── No session — likely opened in different browser, or token expired ─
  return (
    <AuthShell
      title="Need to sign in"
      subtitle="Looks like the confirmation link was opened in a different browser, or your session has expired."
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            margin: "0 auto 14px",
            width: 48,
            height: 48,
            borderRadius: 999,
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.3)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fbbf24",
          }}
        >
          <AlertCircle size={22} />
        </div>
        <p
          style={{
            fontSize: 13,
            color: theme.text.muted,
            margin: "0 0 18px",
            lineHeight: 1.55,
          }}
        >
          Your email is confirmed — you just need to sign in with the
          password you set during signup.
        </p>
        <Link
          href="/auth/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            borderRadius: 8,
            background:
              "linear-gradient(180deg, #c9a96e 0%, #b8985d 100%)",
            color: "#09090f",
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Sign in
          <ArrowRight size={14} />
        </Link>
      </div>
    </AuthShell>
  );
}
