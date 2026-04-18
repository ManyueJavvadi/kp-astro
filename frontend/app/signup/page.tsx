"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { theme, styles } from "@/lib/theme";
import { Logo } from "@/components/ui/logo";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"consumer" | "astrologer">("consumer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      router.push(role === "astrologer" ? "/pro" : "/app");
    }, 900);
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
              Create your account
            </h1>
            <p style={{ fontSize: 13, color: theme.text.muted, margin: "6px 0 0" }}>
              14-day free trial · no card required
            </p>
          </div>

          {/* Role toggle */}
          <div style={{ marginBottom: 18 }}>
            <div style={styles.sectionLabel}>I am a</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <RoleButton
                active={role === "consumer"}
                onClick={() => setRole("consumer")}
                title="Consumer"
                desc="Exploring my own chart"
              />
              <RoleButton
                active={role === "astrologer"}
                onClick={() => setRole("astrologer")}
                title="KP Astrologer"
                desc="Practicing with clients"
              />
            </div>
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

          {success && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 6,
                backgroundColor: "rgba(52,211,153,0.1)",
                border: "1px solid rgba(52,211,153,0.25)",
                color: theme.success,
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              Account created! Redirecting…
            </div>
          )}

          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Full name">
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ravi Kumar"
                style={{ ...styles.input, height: 40 }}
              />
            </Field>
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
            <Field label="Password">
              <input
                required
                minLength={8}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                style={{ ...styles.input, height: 40 }}
              />
            </Field>

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
                <>Create account <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: theme.text.muted }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: theme.gold, fontWeight: 500, textDecoration: "none" }}>
              Sign in
            </Link>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: theme.text.muted }}>
          By signing up, you agree to our{" "}
          <Link href="/terms" style={{ color: theme.text.secondary, textDecoration: "underline" }}>Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" style={{ color: theme.text.secondary, textDecoration: "underline" }}>Privacy Policy</Link>
        </div>
      </div>
    </main>
  );
}

function RoleButton({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: 12,
        borderRadius: 8,
        border: active ? `2px solid ${theme.gold}` : theme.border.default,
        backgroundColor: active ? "rgba(201,169,110,0.08)" : theme.bg.page,
        textAlign: "left",
        cursor: "pointer",
        color: active ? theme.text.primary : theme.text.secondary,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: theme.text.primary }}>{title}</div>
      <div style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>{desc}</div>
    </button>
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
