"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface ClientRow {
  id: string;
  full_name: string;
  preferred_name: string | null;
  gender: string | null;
  birth_place: string;
  tags: string[];
  phone: string | null;
  email: string | null;
  created_at: string;
  last_seen_at: string | null;
  is_archived: boolean;
}

export interface ClientListResponse {
  items: ClientRow[];
  total: number;
}

export interface ClientFull extends ClientRow {
  birth_dt_utc: string;
  birth_dt_local_str: string;
  birth_timezone: string;
  birth_lat: number;
  birth_lon: number;
  notes_private: string | null;
  relation_to_astrologer: string | null;
  updated_at: string;
}

export interface ClientCreateBody {
  full_name: string;
  preferred_name?: string;
  gender?: "male" | "female" | "other" | "unspecified";
  phone?: string;
  email?: string;
  birth_date: string; // YYYY-MM-DD
  birth_time: string; // HH:MM
  birth_timezone: string; // IANA
  birth_lat: number;
  birth_lon: number;
  birth_place: string;
  tags?: string[];
  notes_private?: string;
  relation_to_astrologer?: string;
}

export function useClientsList(params?: {
  q?: string;
  tag?: string;
  include_archived?: boolean;
}) {
  return useQuery({
    queryKey: ["clients", params],
    queryFn: async () => {
      const res = await api.get<ClientListResponse>("/clients", { params });
      return res.data;
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["clients", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<ClientFull>(`/clients/${id}`);
      return res.data;
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ClientCreateBody) => {
      const res = await api.post<ClientFull>("/clients", body);
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success(`Added ${data.full_name}`);
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail ??
            "Failed to add client")
          : "Failed to add client";
      toast.error(message);
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<ClientFull> }) => {
      const res = await api.put<ClientFull>(`/clients/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client updated");
    },
  });
}

export function useArchiveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client archived");
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WorkspaceData = any; // Existing chart_engine output shape — unionize later

export function useClientWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: ["workspace", id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // chart is deterministic, cache 5 min
    queryFn: async () => {
      const res = await api.get<WorkspaceData>(`/clients/${id}/workspace`);
      return res.data;
    },
  });
}
