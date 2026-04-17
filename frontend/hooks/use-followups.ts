"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface FollowupRow {
  id: string;
  client_id: string;
  session_id: string | null;
  prediction_id: string | null;
  due_at: string;
  note: string;
  source: string;
  completed_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export interface FollowupCreateBody {
  client_id: string;
  due_at: string;
  note: string;
  source?: string;
}

export function useFollowupsList(params?: { client_id?: string }) {
  return useQuery({
    queryKey: ["followups", params],
    queryFn: async () => {
      const res = await api.get<{
        items: FollowupRow[];
        total: number;
        overdue: number;
      }>("/followups", { params });
      return res.data;
    },
  });
}

export function useCreateFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: FollowupCreateBody) => {
      const res = await api.post<FollowupRow>("/followups", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followups"] });
      toast.success("Follow-up added");
    },
  });
}

export function useUpdateFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Partial<{ completed: boolean; dismissed: boolean; note: string; due_at: string }>;
    }) => {
      const res = await api.put<FollowupRow>(`/followups/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followups"] });
    },
  });
}

export function useDeleteFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/followups/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["followups"] }),
  });
}
