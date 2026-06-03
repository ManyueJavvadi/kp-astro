/**
 * authedAxiosPost — thin wrapper around axios.post that injects the
 * Supabase JWT into the Authorization header.
 *
 * Why this and not apiFetch:
 *   - Existing call sites in page.tsx use raw axios for historical
 *     reasons (the app shipped before apiFetch existed)
 *   - Migrating every callsite to apiFetch is a bigger refactor —
 *     they rely on the AxiosResponse shape and on axios's automatic
 *     JSON parsing of error bodies
 *   - This helper lets us add JWT to those calls TODAY without
 *     touching the surrounding flow logic
 *
 * Phase 2 hardening (S4, 2026-06-02): /astrologer/workspace is now
 * auth-required. All workspace-refresh / chart-generation callsites
 * must use this helper so the Authorization header lands on the
 * request.
 *
 * Anonymous fallback:
 *   If `getToken()` returns null (user not signed in), we still send
 *   the request — but WITHOUT the header. The backend will then 401.
 *   That's correct behavior — call sites in /app are inside AuthGate
 *   so anonymous shouldn't ever reach them. If somehow they do, the
 *   401 surfaces clearly in the network tab.
 */

import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

export async function authedAxiosPost<T = unknown>(
  url: string,
  body: unknown,
  getToken: () => Promise<string | null>,
  extraConfig: AxiosRequestConfig = {},
): Promise<AxiosResponse<T>> {
  const token = await getToken();
  const headers: Record<string, string> = {
    ...((extraConfig.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return axios.post<T>(url, body, { ...extraConfig, headers });
}
