"use client";

/**
 * /auth/confirm — landing page for email-confirm + OAuth redirects.
 *
 * Supabase signup with `emailRedirectTo: .../auth/confirm` sends users
 * here after they click the confirm link. The Supabase client picks up
 * the session from the URL hash, our AuthProvider sees it via
 * onAuthStateChange, and we redirect into /app.
 *
 * Falls back to a clear "click here to continue" if auto-redirect
 * doesn't fire (e.g., user opened the link in a different browser).
 */

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthShell } from "../_shell";
import { theme } from "@/lib/theme";

export default function ConfirmPage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") {
      // Slight delay so the user sees "signed in" briefly before redirect.
      const t = setTimeout(() => router.replace("/app"), 600);
      return () => clearTimeout(t);
    }
  }, [status, router]);

  return (
    <AuthShell
      title={status === "authenticated" ? "Signed in" : "Confirming…"}
      subtitle={
        status === "authenticated"
          ? "Redirecting you to your workspace."
          : "If nothing happens, click below to continue."
      }
    >
      <div style={{ textAlign: "center" }}>
        <Link
          href="/app"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            borderRadius: 8,
            background: "linear-gradient(180deg, #c9a96e 0%, #b8985d 100%)",
            color: "#09090f",
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Open workspace
        </Link>
        <div style={{ marginTop: 16, fontSize: 12, color: theme.text.muted }}>
          Or{" "}
          <Link
            href="/auth/login"
            style={{ color: "#c9a96e", textDecoration: "none" }}
          >
            sign in again
          </Link>
          .
        </div>
      </div>
    </AuthShell>
  );
}
