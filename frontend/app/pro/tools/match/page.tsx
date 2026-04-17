"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { HeartHandshake, Loader2, Users } from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClientsList } from "@/hooks/use-clients";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function MatchPage() {
  const [id1, setId1] = useState("");
  const [id2, setId2] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { data: clients } = useClientsList();

  const run = async () => {
    if (!id1 || !id2) {
      toast.error("Pick both clients");
      return;
    }
    if (id1 === id2) {
      toast.error("Pick two different clients");
      return;
    }
    setLoading(true);
    try {
      // Fetch both clients + compute match using legacy endpoint
      const c1 = (await api.get(`/clients/${id1}`)).data;
      const c2 = (await api.get(`/clients/${id2}`)).data;
      const person1 = {
        name: c1.full_name,
        date: c1.birth_dt_local_str.split("T")[0],
        time: c1.birth_dt_local_str.split("T")[1].slice(0, 5),
        latitude: c1.birth_lat,
        longitude: c1.birth_lon,
        timezone_offset: 5.5,
        gender: c1.gender,
      };
      const person2 = {
        name: c2.full_name,
        date: c2.birth_dt_local_str.split("T")[0],
        time: c2.birth_dt_local_str.split("T")[1].slice(0, 5),
        latitude: c2.birth_lat,
        longitude: c2.birth_lon,
        timezone_offset: 5.5,
        gender: c2.gender,
      };
      const res = await api.post("/compatibility/match", { person1, person2 });
      setResult(res.data);
    } catch {
      toast.error("Match failed");
    }
    setLoading(false);
  };

  const clientOptions = clients?.items ?? [];

  return (
    <>
      <TopBar title="Kundli Match" tabs={[]} />
      <main className="px-6 pb-12 pt-6 max-w-[1200px] mx-auto">
        <div className="mb-6">
          <div className="text-tiny uppercase tracking-wider text-gold mb-1">
            KP + ASHTAKOOTA COMPATIBILITY
          </div>
          <h1 className="font-display text-h1 font-semibold text-text-primary">
            Kundli matching
          </h1>
        </div>

        <div className="rounded-xl bg-bg-surface border border-border p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Person 1
              </label>
              <select
                value={id1}
                onChange={(e) => setId1(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-bg-surface-2 border border-border text-text-primary focus:outline-none focus:border-border-accent focus:ring-1 focus:ring-gold"
              >
                <option value="">— pick client —</option>
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Person 2
              </label>
              <select
                value={id2}
                onChange={(e) => setId2(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-bg-surface-2 border border-border text-text-primary focus:outline-none focus:border-border-accent focus:ring-1 focus:ring-gold"
              >
                <option value="">— pick client —</option>
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            variant="primary"
            leftIcon={<HeartHandshake />}
            loading={loading}
            onClick={run}
            size="lg"
          >
            Compute match
          </Button>
        </div>

        {clientOptions.length < 2 && !result && (
          <div className="p-10 rounded-xl border-2 border-dashed border-border-strong text-center">
            <div className="size-14 mx-auto mb-3 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-gold">
              <Users className="size-6" />
            </div>
            <div className="font-display text-h3 font-semibold text-text-primary mb-1">
              Need at least 2 clients
            </div>
            <div className="text-body text-text-secondary max-w-md mx-auto">
              Add both the bride and groom as clients on the Clients page,
              then return here to compute match.
            </div>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-bg-surface border border-border p-6">
              <div className="text-tiny uppercase tracking-wider text-gold mb-2">
                OVERALL VERDICT
              </div>
              <div className="font-display text-h1 font-semibold text-text-primary mb-2">
                {result.overall_verdict}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {result.ashtakoota && (
                  <Badge variant="gold" size="md">
                    {result.ashtakoota.total_score}/{result.ashtakoota.max_score} Gunas
                  </Badge>
                )}
                {result.kuja_dosha?.mutual_cancellation && (
                  <Badge variant="success" size="md">Mangal Dosha cancelled</Badge>
                )}
              </div>
            </div>
            <div className="rounded-xl bg-bg-surface border border-border p-5">
              <div className="text-tiny uppercase tracking-wider text-gold mb-3">
                FULL ANALYSIS (JSON)
              </div>
              <pre className="text-tiny font-mono text-text-secondary whitespace-pre-wrap break-words overflow-auto max-h-[500px]">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
