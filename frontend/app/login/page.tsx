"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Mail, Lock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }
    router.push(redirectTo);
    router.refresh();
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
            <h1 className="font-display text-h1 font-semibold text-text-primary mb-2">
              Welcome back
            </h1>
            <p className="text-small text-text-muted">
              Sign in to continue your practice
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-error/10 border border-error/30 text-error text-small flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
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
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="text-tiny uppercase tracking-wider text-text-muted font-medium">
                  Password
                </label>
                <Link
                  href="/forgot"
                  className="text-tiny text-gold hover:text-gold-bright"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
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
              Sign in
            </Button>
          </form>

          <div className="text-center mt-6 text-small text-text-muted">
            New to DevAstroAI?{" "}
            <Link href="/signup" className="text-gold hover:text-gold-bright font-medium">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary" />}>
      <LoginForm />
    </Suspense>
  );
}
