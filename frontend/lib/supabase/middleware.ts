import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh + route protection middleware.
 * Keeps Supabase auth cookies fresh on every navigation and redirects
 * unauthenticated visitors away from protected routes.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Bail gracefully when Supabase env vars are missing (e.g. Vercel preview
  // deploys without secrets set). Without this the `!` assertions blow up
  // and the whole site returns 500 MIDDLEWARE_INVOCATION_FAILED.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.warn(
      "[middleware] Supabase env vars missing — skipping auth middleware"
    );
    return supabaseResponse;
  }

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() verifies with Supabase Auth server — never use getSession()
  // server-side (it reads unverified cookies).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Protected path prefixes — require login, else redirect to /login
  const PROTECTED_PREFIXES = ["/pro", "/app", "/settings"];
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  // Auth pages — if already logged in, bounce to /pro or /app
  const AUTH_PAGES = ["/login", "/signup", "/forgot"];
  const isAuthPage = AUTH_PAGES.includes(path);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    // Role-aware landing: astrologer → /pro, consumer → /app
    // Role is stashed in user_metadata during signup, available without DB roundtrip.
    const role = (user.user_metadata?.role as string | undefined) ?? "consumer";
    url.pathname = role === "astrologer" ? "/pro" : "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
