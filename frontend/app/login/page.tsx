"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { theme, styles } from "@/lib/theme";
import { Logo } from "@/components/ui/logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }

    const role =
      (data.user?.user_metadata?.role as string | undefined) ?? "consumer";
    const home = role === "astrologer" ? "/pro" : "/app";
    router.push(redirectParam || home);
    router.refresh();
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg.page,
        color: theme.text.primary,
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Link
          href="/v2"
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 32,
            textDecoration: "none",
          }}
        >
          <Logo size={34} wordmark wordmarkSize={16} />
        </Link>

        <div
          style={{
            backgroundColor: theme.bg.content,
            border: theme.border.strong,
            borderRadius: 10,
            padding: 32,
            boxShadow: theme.shadow.lg,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: theme.text.primary,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Welcome back
            </h1>
            <p style={{ fontSize: 13, color: theme.text.muted, margin: "6px 0 0" }}>
              Sign in to continue your practice
            </p>
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 6,
                backgroundColor: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.25)",
                color: theme.error,
                fontSize: 12,
                marginBottom: 12,
                lineHeight: 1.5,
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Email">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                style={{ ...styles.input, height: 40 }}
              />
            </Field>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 10,
                    color: theme.text.dim,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                  }}
                >
                  Password
                </span>
                <Link
                  href="/forgot"
                  style={{ fontSize: 11, color: theme.gold, textDecoration: "none" }}
                >
                  Forgot?
                </Link>
              </div>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                style={{ ...styles.input, height: 40 }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.primaryButton,
                height: 40,
                width: "100%",
                marginTop: 8,
                opacity: loading ? 0.6 : 1,
                justifyContent: "center",
              }}
            >
              {loading ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <>Sign in <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: theme.text.muted }}>
            New to DevAstroAI?{" "}
            <Link href="/signup" style={{ color: theme.gold, fontWeight: 500, textDecoration: "none" }}>
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: theme.text.dim,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 500,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div style={{ minHeight: "100vh", backgroundColor: theme.bg.page }} />}
    >
      <LoginForm />
    </Suspense>
  );
}
