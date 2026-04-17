"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, Lock, User, Sparkles, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    setSuccess(true);
    // If email confirmation is disabled in Supabase, signup session is created
    // immediately and we can redirect. If enabled, user needs to confirm via email first.
    setTimeout(() => {
      router.push(role === "astrologer" ? "/pro" : "/app");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans flex items-center justify-center px-6 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-gold-glow via-transparent to-transparent blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link href="/v2" className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="size-9 rounded-md bg-gradient-to-br from-gold to-gold-dim flex items-center justify-center font-display text-bg-primary text-lg font-bold">
            ♎
          </div>
          <div className="font-semibold text-h3">
            <span className="text-text-primary">DevAstro</span>
            <span className="text-gold">AI</span>
          </div>
        </Link>

        <div className="rounded-2xl bg-bg-surface border border-border p-6 md:p-8 shadow-xl">
          <div className="text-center mb-6">
            <Badge variant="gold" size="md" className="mb-3">
              <Sparkles className="size-3" /> 14-day free trial
            </Badge>
            <h1 className="font-display text-h1 font-semibold text-text-primary mb-2">
              Create your account
            </h1>
            <p className="text-small text-text-muted">
              No credit card required. Start exploring in 30 seconds.
            </p>
          </div>

          {/* Role selector */}
          <div className="mb-5">
            <label className="text-tiny uppercase tracking-wider text-text-muted mb-2 block font-medium">
              I am a
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("consumer")}
                className={
                  role === "consumer"
                    ? "p-3 rounded-lg border-2 border-gold bg-gold-glow text-text-primary"
                    : "p-3 rounded-lg border border-border bg-bg-surface-2 text-text-secondary hover:border-border-strong transition-colors"
                }
              >
                <div className="text-small font-medium">Consumer</div>
                <div className="text-tiny text-text-muted mt-1">Exploring my own chart</div>
              </button>
              <button
                type="button"
                onClick={() => setRole("astrologer")}
                className={
                  role === "astrologer"
                    ? "p-3 rounded-lg border-2 border-gold bg-gold-glow text-text-primary"
                    : "p-3 rounded-lg border border-border bg-bg-surface-2 text-text-secondary hover:border-border-strong transition-colors"
                }
              >
                <div className="text-small font-medium">KP Astrologer</div>
                <div className="text-tiny text-text-muted mt-1">Practicing with clients</div>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-error/10 border border-error/30 text-error text-small flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-md bg-success/10 border border-success/30 text-success text-small">
              Account created! Redirecting...
            </div>
          )}

          <form onSubmit={handleSignup} className="flex flex-col gap-3">
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Full Name
              </label>
              <Input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ravi Kumar"
                leftIcon={<User />}
                size="lg"
              />
            </div>
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Email
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                leftIcon={<Mail />}
                size="lg"
              />
            </div>
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Password
              </label>
              <Input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                leftIcon={<Lock />}
                size="lg"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              rightIcon={<ArrowRight />}
              loading={loading}
              className="mt-3"
            >
              Create account
            </Button>
          </form>

          <div className="text-center mt-6 text-small text-text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-gold hover:text-gold-bright font-medium">
              Sign in
            </Link>
          </div>
        </div>

        <div className="text-center mt-6 text-tiny text-text-muted">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-text-primary">Terms</Link> and{" "}
          <Link href="/privacy" className="underline hover:text-text-primary">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
