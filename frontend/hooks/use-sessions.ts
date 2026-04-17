"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface SessionRow {
  id: string;
  client_id: string;
  session_type: string;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  status: string;
  query_text: string | null;
  horary_number: number | null;
  summary: string | null;
  transcript: string | null;
  ai_summary: string | null;
  fee_charged: number | null;
  currency: string;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionCreateBody {
  client_id: string;
  session_type:
    | "natal"
    | "horary"
    | "transit"
    | "muhurtha"
    | "marriage"
    | "followup"
    | "walkin";
  scheduled_at?: string; // omit to start immediately (walk-in)
  query_text?: string;
  horary_number?: number;
}

export function useSessionsList(params?: {
  client_id?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["sessions", params],
    queryFn: async () => {
      const res = await api.get<{ items: SessionRow[]; total: number }>(
        "/sessions",
        { params }
      );
      return res.data;
    },
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: SessionCreateBody) => {
      const res = await api.post<SessionRow>("/sessions", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session started");
    },
    onError: () => toast.error("Failed to create session"),
  });
}

export function useEndSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<SessionRow>(`/sessions/${id}/end`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session ended");
    },
  });
}

export function useSummarizeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, transcript }: { id: string; transcript: string }) => {
      const res = await api.post<SessionRow>(`/sessions/${id}/summarize`, {
        transcript,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("AI summary generated");
    },
    onError: () => toast.error("Summarization failed"),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<SessionRow> }) => {
      const res = await api.put<SessionRow>(`/sessions/${id}`, body);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}
