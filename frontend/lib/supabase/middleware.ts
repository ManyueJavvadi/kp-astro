import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh + route protection middleware.
 * Keeps Supabase auth cookies fresh on every navigation and redirects
 * unauthenticated visitors away from protected routes.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

  // Protected path prefixes
  const PROTECTED_PREFIXES = ["/pro", "/app/chat", "/app/family", "/app/reports", "/settings"];
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
    // Role-based landing. We don't have profile role in middleware yet;
    // consumer /app is a safe default. Role-aware routing happens in the page.
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
