import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / email-confirmation callback.
 * Supabase redirects here with ?code=… after:
 * - email confirmation
 * - OAuth provider completion
 * - magic link click
 *
 * We exchange the code for a session cookie and bounce to the role-appropriate home.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Role-aware landing after email confirmation / OAuth
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const role =
        (user?.user_metadata?.role as string | undefined) ?? "consumer";
      const home = role === "astrologer" ? "/pro" : "/app";
      return NextResponse.redirect(new URL(next || home, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=callback_failed", url.origin));
}
