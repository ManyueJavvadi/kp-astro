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
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  getSupabase,
  isSupabaseConfigured,
  maybeGetSupabase,
} from "./supabase-client";

/**
 * P0-4 (deep-scan-2): when ANY apiFetch / authedAxiosPost call hits
 * a 401 from the backend, it dispatches this CustomEvent. AuthProvider
 * listens and triggers a clean sign-out + redirect to /auth/login,
 * so the user isn't stranded looking at "Couldn't load…" cards on
 * every panel when their token silently expired.
 *
 * Exported so the API client modules know the canonical event name.
 */
export const AUTH_INVALIDATED_EVENT = "devastroai:auth-invalidated";

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

  // P1-2 (deep-scan-2): cache the current access token + its expiry
  // so getAccessToken() doesn't roundtrip through supabase.auth
  // .getSession() on every API call. Supabase-js holds an internal
  // lock there; without the cache, parallel TanStack queries on the
  // CRM home (useMe, useClients, useChartSessions firing at once)
  // would serialize through that lock.
  // Invalidated whenever onAuthStateChange fires (token refresh,
  // sign-out, password update).
  const tokenCache = useRef<{ token: string | null; exp: number } | null>(
    null,
  );
  // P1-1 (deep-scan-2): generation counter to guard against the
  // hydration IIFE racing with onAuthStateChange. Without this, a
  // signOut() within ~50ms of page load could let a stale session
  // arrive AFTER the auth-state-change fired null — clobbering it.
  const stateGeneration = useRef(0);

  // Subscribe to Supabase auth state changes ONCE on mount.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus("unconfigured");
      return;
    }
    const supabase = getSupabase();
    const myGeneration = ++stateGeneration.current;

    // First hydration — read whatever session is persisted in localStorage.
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      // P1-1: only apply state if (a) effect wasn't cancelled AND
      // (b) no newer auth event has bumped the generation since.
      if (cancelled || stateGeneration.current !== myGeneration) return;
      if (error) {
        // eslint-disable-next-line no-console
        console.warn("[auth] getSession error:", error);
        setSession(null);
        setStatus("anonymous");
        tokenCache.current = null;
        return;
      }
      setSession(data.session);
      setStatus(data.session ? "authenticated" : "anonymous");
      tokenCache.current = null; // force re-read on first API call
    })();

    // Ongoing subscription — Supabase fires this on signIn, signOut,
    // token refresh, password update. We mirror state.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      stateGeneration.current++; // invalidate any in-flight hydration
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "anonymous");
      tokenCache.current = null; // next API call refreshes the token
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // P0-4 (deep-scan-2): listen for 401s from apiFetch/authedAxiosPost.
  // Sign the user out + redirect to /auth/login with ?reauth=1 so the
  // login page can show a "your session expired" banner.
  // Decoupled so any future API client just dispatches the same event.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onAuthInvalidated() {
      const supabase = maybeGetSupabase();
      tokenCache.current = null;
      if (supabase) {
        // Fire-and-forget — onAuthStateChange handler above will pick
        // up the state flip and update status/session.
        void supabase.auth.signOut();
      }
      // Hard redirect — Next router would also work but a full nav
      // guarantees no stale TanStack cache leaks into the login screen.
      const dest = `/auth/login?reauth=1${
        window.location.pathname.startsWith("/app")
          ? `&redirect=${encodeURIComponent(
              window.location.pathname + window.location.search,
            )}`
          : ""
      }`;
      if (window.location.pathname !== "/auth/login") {
        window.location.assign(dest);
      }
    }
    window.addEventListener(AUTH_INVALIDATED_EVENT, onAuthInvalidated);
    return () => {
      window.removeEventListener(AUTH_INVALIDATED_EVENT, onAuthInvalidated);
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
      // P1-2 (deep-scan-2): cache the token + serve from cache when
      // it's still valid (>=30s before expiry). Without this, every
      // parallel API call serializes on supabase.auth.getSession()'s
      // internal lock. Cache is invalidated by onAuthStateChange.
      const cached = tokenCache.current;
      const nowSec = Math.floor(Date.now() / 1000);
      if (cached && cached.token && cached.exp - nowSec > 30) {
        return cached.token;
      }
      const supabase = maybeGetSupabase();
      if (!supabase) {
        tokenCache.current = { token: null, exp: 0 };
        return null;
      }
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        tokenCache.current = { token: null, exp: 0 };
        return null;
      }
      // expires_at is unix-seconds; expires_in is delta-seconds — both
      // optional in supabase-js types. Prefer expires_at.
      const exp =
        data.session.expires_at ??
        (data.session.expires_in
          ? nowSec + data.session.expires_in
          : nowSec + 60); // pessimistic fallback so we re-check in 1 min
      tokenCache.current = { token: data.session.access_token, exp };
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
