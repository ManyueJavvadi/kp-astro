"use client";

/**
 * FastAPI backend client — fetch-based (not axios).
 *
 * We previously used axios, but an async request interceptor that awaited
 * `supabase.auth.getSession()` was stalling axios so hard the request
 * never reached the network, surfacing as ERR_NETWORK / "Network Error"
 * in production incognito sessions. Fetch gives us full control.
 *
 * Preserves the axios-compatible shape used by TanStack hooks:
 *   await api.post("/path", body) → { data, status }
 *   await api.get("/path")
 *   await api.put("/path", body)
 *   await api.delete("/path")
 *   await api.patch("/path", body)
 *
 * Rejections look like axios: `{ response: { status, data }, message, code }`
 * so existing .catch handlers keep working unchanged.
 */

import { createClient } from "@/lib/supabase/client";

/**
 * Base URL resolution order:
 *   1. NEXT_PUBLIC_API_BASE_PATH (relative, e.g. "/api/proxy") — uses the
 *      same-origin proxy route at app/api/proxy/[...path]. Picks this
 *      when set to avoid any possibility of cross-origin XHR being
 *      blocked by browser extensions / ISP / corporate firewall.
 *   2. NEXT_PUBLIC_API_URL (absolute Railway URL) — direct cross-origin.
 *   3. http://localhost:8000 — dev fallback.
 */
const BASE_URL = (() => {
  const proxy = process.env.NEXT_PUBLIC_API_BASE_PATH;
  if (proxy) return proxy.replace(/\/+$/, "");
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");
})();

if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.info("[api] baseURL =", BASE_URL);
}

type ApiResponse<T> = {
  data: T;
  status: number;
  headers: Headers;
};

type ApiError = {
  response?: { status: number; data: unknown; headers: Headers };
  message: string;
  code: string;
  config: { url: string; method: string };
};

/**
 * Pull the access_token from the Supabase auth cookie directly.
 *
 * Background: @supabase/ssr stores the session in a cookie whose value is
 * either plain JSON or `base64-<b64>`. The browser client's getSession()
 * is supposed to read it, but we've seen cases where it returns null even
 * though the cookie is present (cookie format mismatch between the
 * server-side writer and the client-side reader, common during version
 * upgrades). Reading the cookie directly is an order of magnitude more
 * reliable.
 */
function tokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => /^sb-[a-z0-9]+-auth-token=/.test(c));
  if (!match) return null;
  const rawValue = decodeURIComponent(match.split("=").slice(1).join("="));
  try {
    // Format 1: plain JSON — { access_token, refresh_token, ... }
    const parsed = JSON.parse(rawValue);
    if (parsed?.access_token) return parsed.access_token as string;
  } catch {
    // Format 2: "base64-<base64 string>"
    if (rawValue.startsWith("base64-")) {
      try {
        const decoded = atob(rawValue.slice(7));
        const parsed = JSON.parse(decoded);
        if (parsed?.access_token) return parsed.access_token as string;
      } catch {
        /* fall through */
      }
    }
  }
  return null;
}

async function getToken(): Promise<string | null> {
  // Fast path: read directly from the cookie. Always wins if present.
  const cookieToken = tokenFromCookie();
  if (cookieToken) return cookieToken;

  // Fallback: try the supabase-js session API with a hard timeout so we
  // never stall the request.
  try {
    const supabase = createClient();
    const sessionPromise = supabase.auth.getSession();
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 1_500)
    );
    const result = await Promise.race([sessionPromise, timeout]);
    if (!result || !("data" in result)) return null;
    return result.data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const token = await getToken();

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // 60 s abort controller — Railway cold starts need it.
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 60_000);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      // No credentials — bearer-only auth.
      credentials: "omit",
      signal: controller.signal,
      mode: "cors",
    });
  } catch (err) {
    clearTimeout(t);
    const e = err as Error;
    // eslint-disable-next-line no-console
    console.error("[api] fetch threw", { url, method, error: e });
    const wrapped: ApiError = {
      message: e.name === "AbortError" ? "Request timed out" : e.message,
      code: e.name === "AbortError" ? "ECONNABORTED" : "ERR_NETWORK",
      config: { url, method },
    };
    throw wrapped;
  }
  clearTimeout(t);

  // Try to parse body; fall back to text.
  const raw = await res.text();
  let data: unknown = raw;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      /* keep raw */
    }
  }

  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error("[api] request failed", {
      url,
      method,
      status: res.status,
      data,
    });
    const wrapped: ApiError = {
      response: { status: res.status, data, headers: res.headers },
      message: `Request failed with status ${res.status}`,
      code: `HTTP_${res.status}`,
      config: { url, method },
    };
    throw wrapped;
  }

  return { data: data as T, status: res.status, headers: res.headers };
}

// Axios-compatible public surface. The second arg on GET/DELETE is a
// no-op (axios allows an options object there); kept to avoid touching
// every caller.
export const api = {
  get: <T = unknown>(path: string, _opts?: unknown) => request<T>("GET", path),
  post: <T = unknown>(path: string, body?: unknown, _opts?: unknown) =>
    request<T>("POST", path, body ?? {}),
  put: <T = unknown>(path: string, body?: unknown, _opts?: unknown) =>
    request<T>("PUT", path, body ?? {}),
  patch: <T = unknown>(path: string, body?: unknown, _opts?: unknown) =>
    request<T>("PATCH", path, body ?? {}),
  delete: <T = unknown>(path: string, _opts?: unknown) => request<T>("DELETE", path),
};
