"use client";

import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { createClient } from "@/lib/supabase/client";

/**
 * Axios client for FastAPI backend.
 * Automatically attaches the Supabase JWT as Bearer token on every request.
 */
export function createApiClient(): AxiosInstance {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Log baseURL once per page so production issues can be diagnosed from
  // the console.
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.info("[api] baseURL =", baseURL);
  }

  const instance = axios.create({
    baseURL,
    timeout: 60_000, // Railway cold starts can take 30+s; was 30s
    // Don't send cookies — auth is Bearer token only. withCredentials must
    // stay false so CORS treats this as a "simple" credentialed request
    // and doesn't require allow_credentials reflection on *every* origin.
    withCredentials: false,
  });

  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    // supabase.auth.getSession() has been observed to hang indefinitely on
    // some browsers/extensions, which silently stalls every axios request
    // and surfaces as ERR_NETWORK. Guard it with a 3s timeout — if we
    // can't get the session fast, send the request unauthenticated and
    // let the 401 come back cleanly instead of looking like a network
    // failure.
    const getToken = async (): Promise<string | null> => {
      try {
        const supabase = createClient();
        const sessionPromise = supabase.auth.getSession();
        const timeout = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 3_000)
        );
        const result = await Promise.race([sessionPromise, timeout]);
        if (!result || !("data" in result)) return null;
        return result.data.session?.access_token ?? null;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[api] Session lookup failed:", e);
        return null;
      }
    };

    const token = await getToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    } else if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn("[api] No Supabase session — request will be unauthenticated:", config.url);
    }
    return config;
  });

  instance.interceptors.response.use(
    (r) => r,
    (error) => {
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-console
        console.error("[api] request failed:", {
          url: error?.config?.url,
          method: error?.config?.method,
          status: error?.response?.status,
          data: error?.response?.data,
          code: error?.code,
          message: error?.message,
        });
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

/** Module-level singleton for convenience in client components. */
export const api = createApiClient();
