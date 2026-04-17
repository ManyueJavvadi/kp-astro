"use client";

import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { createClient } from "@/lib/supabase/client";

/**
 * Axios client for FastAPI backend.
 * Automatically attaches the Supabase JWT as Bearer token on every request.
 */
export function createApiClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    timeout: 30_000,
  });

  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return instance;
}

/** Module-level singleton for convenience in client components. */
export const api = createApiClient();
