"use client";

/**
 * AuthContext (Phase 1, ADR-002 + ADR-004).
 *
 * One Context provider mounted in /app/layout.tsx. Subscribes to Supabase
 * auth state changes and exposes:
 *
 *   useAuth() = {
 *     status: "loading" | "anonymous" | "authenticated" | "unconfigured"
 *     session: Session | null     — Supabase session (has user, jwt, etc.)
 *     user: User | null            — convenience: session?.user
 *     signIn(email, password)      — login
 *     signUp(email, password, opts) — create account
 *     signOut()                    — sign out
 *     requestPasswordReset(email)  — email reset link
 *     getAccessToken()             — Promise<string|null> for API calls
 *   }
 *
 * Use cases:
 *   - Components that need to gate UI on login state
 *   - The API client uses getAccessToken() to inject Authorization headers
 *   - Auth pages use signIn/signUp/requestPasswordReset
 *
 * NOT in this context:
 *   - The Astrologer DB row (that's fetched via /me using TanStack Query)
 *   - Profile editing (POST /me, also TanStack Query)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  getSupabase,
  isSupabaseConfigured,
  maybeGetSupabase,
} from "./supabase-client";

export type AuthStatus =
  | "loading"        // first mount, waiting on getSession()
  | "anonymous"      // no session
  | "authenticated"  // session present
  | "unconfigured";  // Supabase env vars missing (dev / pre-setup)

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;

  /** Sign in with email + password. */
  signIn(email: string, password: string): Promise<{ error: Error | null }>;

  /** Create a new account. `displayName` is stored in user_metadata so the
   *  backend can pick it up on first login. */
  signUp(
    email: string,
    password: string,
    opts?: { displayName?: string },
  ): Promise<{ error: Error | null; needsEmailConfirm: boolean }>;

  signOut(): Promise<void>;

  /** Send a password reset email. Reset link lands at /auth/reset-password. */
  requestPasswordReset(email: string): Promise<{ error: Error | null }>;

  /** Update the user's password after they click the reset link. Requires
   *  an active recovery session (Supabase puts that in URL hash after the
   *  email link). */
  updatePassword(newPassword: string): Promise<{ error: Error | null }>;

  /** Return the current JWT, refreshed if needed. null if anonymous. */
  getAccessToken(): Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? "loading" : "unconfigured",
  );
  const [session, setSession] = useState<Session | null>(null);

  // Subscribe to Supabase auth state changes ONCE on mount.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus("unconfigured");
      return;
    }
    const supabase = getSupabase();

    // First hydration — read whatever session is persisted in localStorage.
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) {
        // Treat as anonymous; surface a console warning so devtools shows
        // something but the app keeps working.
        // eslint-disable-next-line no-console
        console.warn("[auth] getSession error:", error);
        setSession(null);
        setStatus("anonymous");
        return;
      }
      setSession(data.session);
      setStatus(data.session ? "authenticated" : "anonymous");
    })();

    // Ongoing subscription — Supabase fires this on signIn, signOut,
    // token refresh, password update. We mirror state.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "anonymous");
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (email, password) => {
      const supabase = maybeGetSupabase();
      if (!supabase) return { error: new Error("Supabase not configured") };
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    },
    [],
  );

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (email, password, opts) => {
      const supabase = maybeGetSupabase();
      if (!supabase) {
        return {
          error: new Error("Supabase not configured"),
          needsEmailConfirm: false,
        };
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: opts?.displayName
            ? { display_name: opts.displayName }
            : undefined,
          // After email confirm, Supabase redirects here. The /auth/confirm
          // page detects the URL hash session and shows a "you're signed
          // in" affordance.
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/confirm`
              : undefined,
        },
      });
      // When Supabase has "confirm email" enabled (it should), data.session
      // is null until the user clicks the email link.
      return {
        error,
        needsEmailConfirm: !error && !data.session,
      };
    },
    [],
  );

  const signOut = useCallback<AuthContextValue["signOut"]>(async () => {
    const supabase = maybeGetSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const requestPasswordReset = useCallback<
    AuthContextValue["requestPasswordReset"]
  >(async (email) => {
    const supabase = maybeGetSupabase();
    if (!supabase) return { error: new Error("Supabase not configured") };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/reset-password`
          : undefined,
    });
    return { error };
  }, []);

  const updatePassword = useCallback<AuthContextValue["updatePassword"]>(
    async (newPassword) => {
      const supabase = maybeGetSupabase();
      if (!supabase) return { error: new Error("Supabase not configured") };
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    },
    [],
  );

  const getAccessToken = useCallback<AuthContextValue["getAccessToken"]>(
    async () => {
      const supabase = maybeGetSupabase();
      if (!supabase) return null;
      // Cheaper than getSession() — supabase-js caches the JWT until
      // ~60s before expiry, then auto-refreshes.
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) return null;
      return data.session.access_token;
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      getAccessToken,
    }),
    [
      status,
      session,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      getAccessToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      "useAuth() must be called inside <AuthProvider/>. " +
        "Mount the provider in /app/layout.tsx (or root layout).",
    );
  }
  return ctx;
}
