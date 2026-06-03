"use client";

/**
 * TanStack Query hooks for the Phase 1 backend endpoints.
 *
 * Centralized here so every consumer (page.tsx, sidebar, profile screen)
 * uses the same query keys + same auth wiring. Renaming a key or moving
 * an endpoint then touches one file.
 *
 * Query keys are tuples — TanStack convention. The first element is
 * the resource ("me", "chart-sessions"), the rest are scopes.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useAuth } from "../auth/auth-context";
import { apiFetch } from "./client";

// ─── Types (hand-written; will be replaced by openapi-typescript generated
//      file in P1.6) ─────────────────────────────────────────────────

export interface AstrologerPublic {
  id: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  photo_url: string | null;
  phone: string | null;
  years_practicing: number | null;
  is_verified: boolean;
  default_language: string;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AstrologerUpdate {
  display_name?: string;
  bio?: string;
  photo_url?: string;
  phone?: string;
  years_practicing?: number;
  default_language?: "en" | "te" | "te_en";
}

export interface ChartSessionPublic {
  id: string;
  astrologer_id: string;
  client_id: string | null;
  name: string;

  birth_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_ampm: string | null;
  birth_place_name: string | null;
  birth_latitude: number | null;
  birth_longitude: number | null;
  birth_timezone_offset: number | null;
  birth_gender: string | null;

  chart_data: Record<string, unknown> | null;
  workspace_data: Record<string, unknown> | null;
  analysis_messages: Array<Record<string, unknown>> | null;
  ui_state: Record<string, unknown> | null;
  session_notes: string | null;

  created_at: string;
  updated_at: string;
}

export interface ChartSessionCreate {
  name: string;
  client_id?: string;

  birth_name?: string;
  birth_date?: string;
  birth_time?: string;
  birth_ampm?: string;
  birth_place_name?: string;
  birth_latitude?: number;
  birth_longitude?: number;
  birth_timezone_offset?: number;
  birth_gender?: string;

  chart_data?: Record<string, unknown>;
  workspace_data?: Record<string, unknown>;
  analysis_messages?: Array<Record<string, unknown>>;
  ui_state?: Record<string, unknown>;
  session_notes?: string;
}

export type ChartSessionUpdate = Partial<ChartSessionCreate>;

export interface ChartSessionList {
  items: ChartSessionPublic[];
  total: number;
}

export interface ChartSessionMigrateRequest {
  sessions: ChartSessionCreate[];
}

export interface ChartSessionMigrateResult {
  imported: number;
  skipped: number;
  total_in_db_after: number;
}

// ─── Clients (Phase 2 Slice 2) ────────────────────────────────────────

export interface ClientPublic {
  id: string;
  astrologer_id: string;
  name: string;
  portal_slug: string;

  phone: string | null;
  email: string | null;
  gender: string | null;

  birth_date: string | null;
  birth_time: string | null;
  birth_place_name: string | null;
  birth_latitude: number | null;
  birth_longitude: number | null;
  birth_timezone_offset: number | null;

  matching_opt_in: boolean | null;
  summary: string | null;

  /** Convenience counts populated by the backend. */
  chart_session_count: number;
  note_count: number;
  last_session_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface ClientCreate {
  name: string;
  phone?: string;
  email?: string;
  gender?: string;

  birth_date?: string;
  birth_time?: string;
  birth_place_name?: string;
  birth_latitude?: number;
  birth_longitude?: number;
  birth_timezone_offset?: number;

  matching_opt_in?: boolean;
  summary?: string;
}

export type ClientUpdate = Partial<ClientCreate>;

export interface ClientList {
  items: ClientPublic[];
  total: number;
}

// ─── Query keys ───────────────────────────────────────────────────────

export const queryKeys = {
  me: ["me"] as const,
  chartSessions: ["chart-sessions"] as const,
  chartSession: (id: string) => ["chart-sessions", id] as const,
  clients: ["clients"] as const,
  client: (id: string) => ["clients", id] as const,
  clientNotes: (clientId: string) => ["clients", clientId, "notes"] as const,
  clientAiDrafts: (clientId: string) =>
    ["clients", clientId, "ai-drafts"] as const,
  portal: (slug: string) => ["portal", slug] as const,
};

// ─── Client notes (Phase 3 Slice 1) ───────────────────────────────────

export interface NotePublic {
  id: string;
  client_id: string;
  text: string;
  language: string;
  note_type: string;
  is_private: boolean;
  expected_resolution_date: string | null;
  resolved: boolean | null;
  resolved_at: string | null;
  resolution_note: string | null;
  /** Phase 2 polish (2026-06-02) — prediction outcome enum. */
  outcome: "pending" | "confirmed" | "partial" | "disconfirmed" | "na";
  /** Phase 2 polish (2026-06-02) — origin tracking. */
  source: "astrologer" | "ai_draft";
  created_at: string;
  updated_at: string;
}

export interface NoteCreate {
  text: string;
  language?: "en" | "te" | "te_en";
  note_type?: string;
  is_private?: boolean;
  expected_resolution_date?: string;
  resolved?: boolean;
  resolved_at?: string;
  resolution_note?: string;
  outcome?: "pending" | "confirmed" | "partial" | "disconfirmed" | "na";
  source?: "astrologer" | "ai_draft";
}

export type NoteUpdate = Partial<NoteCreate>;

export interface NoteList {
  items: NotePublic[];
  total: number;
}

/** Phase 2 polish (2026-06-02) — one AI Q&A from the chart_session
 *  analysis_messages, projected as a draft candidate for the portal
 *  notes lane. NOT a persisted row — derived on the fly. */
export interface AiDraft {
  key: string;
  session_id: string;
  message_index: number;
  question: string;
  answer: string;
  is_topic: boolean;
  approx_created_at: string;
}

export interface AiDraftList {
  items: AiDraft[];
  total: number;
}

// ─── Client portal public response (Phase 3 Slice 1) ──────────────────

export interface PortalKpSnapshot {
  lagna_en: string | null;
  moon_sign_en: string | null;
  moon_nakshatra_en: string | null;
  sun_sign_en: string | null;
  current_mahadasha_lord: string | null;
  current_antardasha_lord: string | null;
  current_mahadasha_period_end: string | null;
}

export interface PortalNote {
  text: string;
  language: string;
  note_type: string;
  created_at: string;
}

export interface PortalAstrologer {
  display_name: string | null;
  years_practicing: number | null;
  is_verified: boolean;
  whatsapp_consult_url: string | null;
}

export interface PortalResponse {
  client_name: string;
  client_birth_date: string | null;
  client_birth_time: string | null;
  client_birth_place: string | null;
  client_gender: string | null;
  snapshot: PortalKpSnapshot | null;
  notes: PortalNote[];
  astrologer: PortalAstrologer;
}

// ─── /me ─────────────────────────────────────────────────────────────

/**
 * Fetch the current astrologer's profile. Auto-disabled while not
 * authenticated (returns idle status, no network call).
 */
export function useMe(
  options?: Omit<
    UseQueryOptions<AstrologerPublic, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const { status, getAccessToken } = useAuth();
  return useQuery<AstrologerPublic, Error>({
    queryKey: queryKeys.me,
    queryFn: () => apiFetch<AstrologerPublic>("/me", { getToken: getAccessToken }),
    enabled: status === "authenticated",
    ...options,
  });
}

export function useUpdateMe() {
  const { getAccessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: AstrologerUpdate) =>
      apiFetch<AstrologerPublic>("/me", {
        method: "PATCH",
        body: patch,
        getToken: getAccessToken,
      }),
    onSuccess: (data) => {
      // Replace the cached /me with the server's response so the UI
      // reflects the canonical row (incl. updated_at).
      qc.setQueryData(queryKeys.me, data);
    },
  });
}

// ─── /chart-sessions ──────────────────────────────────────────────────

export function useChartSessions(
  options?: Omit<
    UseQueryOptions<ChartSessionList, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const { status, getAccessToken } = useAuth();
  return useQuery<ChartSessionList, Error>({
    queryKey: queryKeys.chartSessions,
    queryFn: () =>
      apiFetch<ChartSessionList>("/chart-sessions", {
        getToken: getAccessToken,
      }),
    enabled: status === "authenticated",
    ...options,
  });
}

export function useChartSession(id: string | null | undefined) {
  const { status, getAccessToken } = useAuth();
  return useQuery<ChartSessionPublic, Error>({
    queryKey: id ? queryKeys.chartSession(id) : ["chart-sessions", "noop"],
    queryFn: () =>
      apiFetch<ChartSessionPublic>(`/chart-sessions/${id}`, {
        getToken: getAccessToken,
      }),
    enabled: Boolean(id) && status === "authenticated",
  });
}

export function useCreateChartSession() {
  const { getAccessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChartSessionCreate) =>
      apiFetch<ChartSessionPublic>("/chart-sessions", {
        method: "POST",
        body: payload,
        getToken: getAccessToken,
      }),
    onSuccess: (data) => {
      // Prepend to the list cache for immediate UI feedback, then
      // invalidate so the next read pulls authoritative ordering.
      qc.setQueryData<ChartSessionList | undefined>(
        queryKeys.chartSessions,
        (prev) =>
          prev
            ? { items: [data, ...prev.items], total: prev.total + 1 }
            : { items: [data], total: 1 },
      );
      qc.setQueryData(queryKeys.chartSession(data.id), data);
      qc.invalidateQueries({ queryKey: queryKeys.chartSessions });
    },
  });
}

export function useUpdateChartSession(id: string) {
  const { getAccessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ChartSessionUpdate) =>
      apiFetch<ChartSessionPublic>(`/chart-sessions/${id}`, {
        method: "PATCH",
        body: patch,
        getToken: getAccessToken,
      }),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.chartSession(id), data);
      qc.invalidateQueries({ queryKey: queryKeys.chartSessions });
    },
  });
}

/**
 * Factory variant: returns a function that, given a session id, returns
 * an update mutation for that id. Use when the id is only known at call
 * time (e.g., looping over sessions to sync edits to the DB).
 *
 * Caller pattern:
 *   const updateFactory = useUpdateChartSessionByIdFactory();
 *   const mutation = updateFactory("uuid-of-the-session");
 *   mutation.mutate({ name: "renamed", ... });
 *
 * Each call to `updateFactory(id)` creates a fresh useMutation under
 * the hood (via the inner hook below). React's rules of hooks are
 * satisfied because we always call useMutation() in the factory
 * function body, not inside the useCallback returned to consumers.
 */
export function useUpdateChartSessionByIdFactory() {
  const { getAccessToken } = useAuth();
  const qc = useQueryClient();
  // Return a stable function that, when invoked, runs the same fetch
  // logic but for any id. We don't use useMutation here because the
  // factory pattern needs to be id-agnostic; instead we replicate the
  // mutation shape using a plain async function that invalidates the
  // cache on success.
  return (id: string) => ({
    mutate: (
      patch: ChartSessionUpdate,
      options?: {
        onSuccess?: (data: ChartSessionPublic) => void;
        onError?: (error: unknown) => void;
      },
    ) => {
      apiFetch<ChartSessionPublic>(`/chart-sessions/${id}`, {
        method: "PATCH",
        body: patch,
        getToken: getAccessToken,
      })
        .then((data) => {
          qc.setQueryData(queryKeys.chartSession(id), data);
          qc.invalidateQueries({ queryKey: queryKeys.chartSessions });
          options?.onSuccess?.(data);
        })
        .catch((err) => {
          options?.onError?.(err);
        });
    },
  });
}

export function useDeleteChartSession() {
  const { getAccessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/chart-sessions/${id}`, {
        method: "DELETE",
        getToken: getAccessToken,
      }),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: queryKeys.chartSession(id) });
      qc.invalidateQueries({ queryKey: queryKeys.chartSessions });
    },
  });
}

/**
 * One-time bulk import from localStorage. Frontend pulls the user's
 * `devastroai:savedSessions` array, transforms each entry to a
 * ChartSessionCreate, and posts the whole batch. Idempotent on the
 * backend (dedups by name + birth fields).
 */
export function useMigrateChartSessions() {
  const { getAccessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChartSessionMigrateRequest) =>
      apiFetch<ChartSessionMigrateResult>("/chart-sessions/migrate", {
        method: "POST",
        body: payload,
        getToken: getAccessToken,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.chartSessions });
    },
  });
}

// ─── /clients (Phase 2 Slice 2) ───────────────────────────────────────

/**
 * List the current astrologer's clients, most-recently-touched first.
 * Auto-disabled while not authenticated.
 */
export function useClients(
  options?: Omit<UseQueryOptions<ClientList, Error>, "queryKey" | "queryFn">,
) {
  const { status, getAccessToken } = useAuth();
  return useQuery<ClientList, Error>({
    queryKey: queryKeys.clients,
    queryFn: () =>
      apiFetch<ClientList>("/clients", { getToken: getAccessToken }),
    enabled: status === "authenticated",
    ...options,
  });
}

/**
 * Read one client by id. Disabled while id is null/undefined OR not
 * authenticated.
 */
export function useClient(id: string | null | undefined) {
  const { status, getAccessToken } = useAuth();
  return useQuery<ClientPublic, Error>({
    queryKey: id ? queryKeys.client(id) : ["clients", "noop"],
    queryFn: () =>
      apiFetch<ClientPublic>(`/clients/${id}`, { getToken: getAccessToken }),
    enabled: Boolean(id) && status === "authenticated",
  });
}

export function useCreateClient() {
  const { getAccessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClientCreate) =>
      apiFetch<ClientPublic>("/clients", {
        method: "POST",
        body: payload,
        getToken: getAccessToken,
      }),
    onSuccess: (data) => {
      // Prepend to the list cache for instant UI feedback, then
      // invalidate so the next read pulls authoritative ordering +
      // counts.
      qc.setQueryData<ClientList | undefined>(queryKeys.clients, (prev) =>
        prev
          ? { items: [data, ...prev.items], total: prev.total + 1 }
          : { items: [data], total: 1 },
      );
      qc.setQueryData(queryKeys.client(data.id), data);
      qc.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });
}

export function useUpdateClient(id: string) {
  const { getAccessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ClientUpdate) =>
      apiFetch<ClientPublic>(`/clients/${id}`, {
        method: "PATCH",
        body: patch,
        getToken: getAccessToken,
      }),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.client(id), data);
      qc.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });
}

/**
 * Factory variant for client updates — id known at call time, not
 * hook-construction time. Same pattern as useUpdateChartSessionByIdFactory.
 */
export function useUpdateClientByIdFactory() {
  const { getAccessToken } = useAuth();
  const qc = useQueryClient();
  return (id: string) => ({
    mutate: (
      patch: ClientUpdate,
      options?: {
        onSuccess?: (data: ClientPublic) => void;
        onError?: (error: unknown) => void;
      },
    ) => {
      apiFetch<ClientPublic>(`/clients/${id}`, {
        method: "PATCH",
        body: patch,
        getToken: getAccessToken,
      })
        .then((data) => {
          qc.setQueryData(queryKeys.client(id), data);
          qc.invalidateQueries({ queryKey: queryKeys.clients });
          options?.onSuccess?.(data);
        })
        .catch((err) => {
          options?.onError?.(err);
        });
    },
  });
}

export function useDeleteClient() {
  const { getAccessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/clients/${id}`, {
        method: "DELETE",
        getToken: getAccessToken,
      }),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: queryKeys.client(id) });
      qc.invalidateQueries({ queryKey: queryKeys.clients });
      // Chart sessions are cascade-deleted; invalidate that cache too.
      qc.invalidateQueries({ queryKey: queryKeys.chartSessions });
    },
  });
}

// ─── Client notes (Phase 3 Slice 1) ───────────────────────────────────

export function useClientNotes(clientId: string | null | undefined) {
  const { status, getAccessToken } = useAuth();
  return useQuery<NoteList, Error>({
    queryKey: clientId ? queryKeys.clientNotes(clientId) : ["notes", "noop"],
    queryFn: () =>
      apiFetch<NoteList>(`/clients/${clientId}/notes`, { getToken: getAccessToken }),
    enabled: Boolean(clientId) && status === "authenticated",
  });
}

export function useCreateNote(clientId: string) {
  const { getAccessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NoteCreate) =>
      apiFetch<NotePublic>(`/clients/${clientId}/notes`, {
        method: "POST",
        body: payload,
        getToken: getAccessToken,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clientNotes(clientId) });
      // note_count on the client row will be stale; invalidate clients
      // list + this client too
      qc.invalidateQueries({ queryKey: queryKeys.clients });
      qc.invalidateQueries({ queryKey: queryKeys.client(clientId) });
    },
  });
}

export function useUpdateNote(clientId: string, noteId: string) {
  const { getAccessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: NoteUpdate) =>
      apiFetch<NotePublic>(`/clients/${clientId}/notes/${noteId}`, {
        method: "PATCH",
        body: patch,
        getToken: getAccessToken,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clientNotes(clientId) });
    },
  });
}

export function useDeleteNote(clientId: string) {
  const { getAccessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      apiFetch<void>(`/clients/${clientId}/notes/${noteId}`, {
        method: "DELETE",
        getToken: getAccessToken,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clientNotes(clientId) });
      qc.invalidateQueries({ queryKey: queryKeys.clients });
      qc.invalidateQueries({ queryKey: queryKeys.client(clientId) });
    },
  });
}

/**
 * Phase 2 polish (2026-06-02) — fetch AI Q&A drafts derived from this
 * client's chart_session(s).analysis_messages. Used in the portal
 * admin "AI drafts" lane. Returns immutable projections — promoting
 * one to a public note happens via the regular useCreateNote with
 * source='ai_draft'.
 */
export function useClientAiDrafts(clientId: string | null | undefined) {
  const { status, getAccessToken } = useAuth();
  return useQuery<AiDraftList, Error>({
    queryKey: clientId
      ? queryKeys.clientAiDrafts(clientId)
      : ["ai-drafts", "noop"],
    queryFn: () =>
      apiFetch<AiDraftList>(`/clients/${clientId}/ai-drafts`, {
        getToken: getAccessToken,
      }),
    enabled: Boolean(clientId) && status === "authenticated",
  });
}

// ─── Public client portal (Phase 3 Slice 1) ───────────────────────────

/**
 * Fetch the public portal payload for a given slug. No auth required.
 * Used in the /c/[slug] public route (Slice 2).
 */
export function usePortal(slug: string | null | undefined) {
  return useQuery<PortalResponse, Error>({
    queryKey: slug ? queryKeys.portal(slug) : ["portal", "noop"],
    // Portal endpoint is public — don't send Authorization header
    // (would interfere with any future CSRF / origin guards).
    queryFn: () => apiFetch<PortalResponse>(`/c/${slug}`),
    enabled: Boolean(slug),
  });
}
