/**
 * API client (Phase 1) — wraps fetch with auth header injection.
 *
 * Why a custom wrapper instead of axios:
 *   - axios is already a dep but its interceptor model makes auth header
 *     injection awkward when the JWT comes from an async source
 *     (Supabase getSession).
 *   - fetch is native, smaller, and the wrapper is ~50 lines.
 *
 * Auth header injection:
 *   apiFetch() takes an optional `getToken` callback. If provided AND it
 *   resolves to a non-null string, we send `Authorization: Bearer <jwt>`.
 *   Callers from TanStack Query mutations pass the AuthContext's
 *   getAccessToken() function.
 *
 * Error handling:
 *   Non-2xx responses throw `ApiError` with the body parsed (if JSON).
 *   This is what TanStack Query expects — failed mutations call onError.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://devastroai.up.railway.app";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly requestId: string | null;

  constructor(status: number, body: unknown, requestId: string | null) {
    // Try to surface a meaningful message from common backend shapes.
    const fallback = `Request failed with status ${status}`;
    let msg = fallback;
    if (body && typeof body === "object") {
      const b = body as Record<string, unknown>;
      if (typeof b.detail === "string") msg = b.detail;
      else if (typeof b.error === "string") msg = b.error;
      else if (b.detail && typeof b.detail === "object") {
        const det = b.detail as Record<string, unknown>;
        if (typeof det.error === "string") msg = det.error;
      }
    }
    super(msg);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.requestId = requestId;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  /** Parsed JSON body (or omitted). */
  body?: unknown;
  /** Async function returning the JWT (e.g., AuthContext.getAccessToken). */
  getToken?: () => Promise<string | null>;
  /** If true, do NOT throw on non-2xx — return the Response unchanged
   *  (caller handles status). Default false. */
  raw?: boolean;
}

/**
 * Make a JSON API call to the backend.
 *
 * Usage:
 *   const data = await apiFetch<MeResponse>('/me', { getToken: auth.getAccessToken });
 *   await apiFetch('/chart-sessions', {
 *     method: 'POST',
 *     body: { name: 'Manyue', birth_date: '2000-09-09' },
 *     getToken: auth.getAccessToken,
 *   });
 */
export async function apiFetch<T = unknown>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  const { body, getToken, raw, headers: incomingHeaders, ...rest } = opts;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((incomingHeaders as Record<string, string>) || {}),
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (getToken) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...rest,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (raw) {
    // Caller wants raw Response (e.g., streaming, file downloads).
    return response as unknown as T;
  }

  // Try to parse JSON for both success and error responses.
  let parsed: unknown = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      parsed,
      response.headers.get("x-request-id"),
    );
  }

  // 204 No Content has no body
  return (parsed ?? (undefined as unknown)) as T;
}
