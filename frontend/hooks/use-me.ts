"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface Me {
  id: string;
  email: string;
  full_name: string | null;
  role: "consumer" | "astrologer" | "admin";
  tier: "free" | "consumer_pro" | "astrologer_pro" | "team";
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await api.get<Me>("/auth/me");
      return res.data;
    },
  });
}

export function useLogout() {
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      toast.success("Signed out");
      router.push("/login");
      router.refresh();
    },
  });
}
