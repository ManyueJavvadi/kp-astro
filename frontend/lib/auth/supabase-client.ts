/**
 * Supabase client singleton (Phase 1, ADR-002).
 *
 * One client per browser tab. Reused everywhere via `getSupabase()`.
 * Subscribes to auth state changes (login/logout/refresh) so the
 * AuthContext can update React state in response.
 *
 * Env vars:
 *   NEXT_PUBLIC_SUPABASE_URL       — Supabase project URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  — anon (public) API key, safe to ship
 *                                     in the browser bundle. NEVER ship
 *                                     the service_role key.
 *
 * Both vars are NEXT_PUBLIC_* so they're inlined at build time. The
 * production values are set in Vercel project env vars.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * True if the build was compiled with Supabase env vars set.
 *
 * The frontend is allowed to render WITHOUT Supabase configured (e.g.,
 * the landing page, the general-user mode tools that don't need auth).
 * Auth-protected pages check this flag and show a clear setup message
 * instead of crashing with a cryptic "supabase is undefined".
 */
export const isSupabaseConfigured: boolean =
  Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY);

let _client: SupabaseClient | null = null;

/**
 * Get the singleton Supabase client.
 *
 * Throws if not configured — callers should check `isSupabaseConfigured`
 * first if they want to handle the "not yet wired up" case gracefully.
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel project env vars " +
        "(or .env.local for dev). See SETUP-PHASE-1.md for the full setup.",
    );
  }
  if (_client === null) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Persist the session across tabs + reloads using localStorage
        // (Supabase's default). We accept the trade-off vs httpOnly
        // cookies — Supabase has rate-limited refresh tokens and the
        // app already has rich client-side state that wouldn't survive
        // a server-only session model.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // for OAuth callbacks (future)
      },
    });
  }
  return _client;
}

/** Convenience: returns null instead of throwing if Supabase isn't configured. */
export function maybeGetSupabase(): SupabaseClient | null {
  return isSupabaseConfigured ? getSupabase() : null;
}
