"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface PredictionRow {
  id: string;
  client_id: string;
  session_id: string | null;
  prediction_text: string;
  domain: string;
  target_window_start: string | null;
  target_window_end: string | null;
  kp_basis: Record<string, unknown> | null;
  outcome: "pending" | "correct" | "partial" | "wrong" | "unverifiable";
  outcome_notes: string | null;
  outcome_recorded_at: string | null;
  created_at: string;
}

export interface PredictionCreateBody {
  client_id: string;
  session_id?: string;
  prediction_text: string;
  domain: string;
  target_window_start?: string;
  target_window_end?: string;
  kp_basis?: Record<string, unknown>;
}

export interface AccuracyDomain {
  domain: string;
  total: number;
  correct: number;
  partial: number;
  wrong: number;
  pending: number;
  accuracy_pct: number;
}

export interface AccuracySummary {
  total: number;
  correct: number;
  partial: number;
  wrong: number;
  pending: number;
  unverifiable: number;
  accuracy_pct: number;
  by_domain: AccuracyDomain[];
}

export function usePredictionsList(params?: {
  client_id?: string;
  outcome?: string;
  domain?: string;
}) {
  return useQuery({
    queryKey: ["predictions", params],
    queryFn: async () => {
      const res = await api.get<{ items: PredictionRow[]; total: number }>(
        "/predictions",
        { params }
      );
      return res.data;
    },
  });
}

export function useAccuracySummary() {
  return useQuery({
    queryKey: ["predictions", "accuracy"],
    queryFn: async () => {
      const res = await api.get<AccuracySummary>("/predictions/accuracy/summary");
      return res.data;
    },
  });
}

export function useCreatePrediction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: PredictionCreateBody) => {
      const res = await api.post<PredictionRow>("/predictions", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["predictions"] });
      toast.success("Prediction logged");
    },
    onError: () => toast.error("Failed to log prediction"),
  });
}

export function useUpdatePrediction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: { outcome?: string; outcome_notes?: string };
    }) => {
      const res = await api.put<PredictionRow>(`/predictions/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["predictions"] });
      toast.success("Outcome recorded");
    },
  });
}

export function useDeletePrediction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/predictions/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["predictions"] });
      toast.success("Prediction removed");
    },
  });
}
