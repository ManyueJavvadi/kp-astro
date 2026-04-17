"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { TrendingUp, Loader2, Users } from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useClientsList } from "@/hooks/use-clients";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function TransitPage() {
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { data: clients } = useClientsList();

  const run = async () => {
    if (!clientId) {
      toast.error("Pick a client first");
      return;
    }
    const client = clients?.items.find((c) => c.id === clientId);
    if (!client) return;
    setLoading(true);
    try {
      const ws = await api.get(`/clients/${clientId}/workspace`);
      const res = await api.post("/transit/analyze", {
        natal: ws.data,
        transit_date: date,
      });
      setResult(res.data);
    } catch {
      toast.error("Transit analysis failed");
    }
    setLoading(false);
  };

  return (
    <>
      <TopBar title="Transit · Gochar" tabs={[]} />
      <main className="px-6 pb-12 pt-6 max-w-[1100px] mx-auto">
        <div className="mb-6">
          <div className="text-tiny uppercase tracking-wider text-gold mb-1">
            GOCHAR · CURRENT SKY
          </div>
          <h1 className="font-display text-h1 font-semibold text-text-primary">
            Transit analysis
          </h1>
        </div>

        <div className="rounded-xl bg-bg-surface border border-border p-5 mb-6 flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
              Client
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-bg-surface-2 border border-border text-text-primary text-body focus:outline-none focus:border-border-accent focus:ring-1 focus:ring-gold"
            >
              <option value="">— pick a client —</option>
              {(clients?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
              Transit date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button
            variant="primary"
            leftIcon={<TrendingUp />}
            loading={loading}
            onClick={run}
            size="md"
          >
            Analyze
          </Button>
        </div>

        {!clientId && !result && (
          <div className="p-10 rounded-xl border-2 border-dashed border-border-strong text-center">
            <div className="size-14 mx-auto mb-3 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-gold">
              <Users className="size-6" />
            </div>
            <div className="font-display text-h3 font-semibold text-text-primary mb-1">
              Pick a client
            </div>
            <div className="text-body text-text-secondary max-w-md mx-auto">
              Transit analysis ranks current sky planets against a natal chart
              — select a client to begin.
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-10 text-text-muted">
            <Loader2 className="size-5 animate-spin mr-2" /> Analyzing…
          </div>
        )}

        {result && (
          <div className="rounded-xl bg-bg-surface border border-border p-5">
            <div className="text-tiny uppercase tracking-wider text-gold mb-3">
              TRANSIT RESULT · {date}
            </div>
            {result.sade_sati_active && (
              <Badge variant="warning" size="md" className="mb-3">
                Sade Sati active
              </Badge>
            )}
            <pre className="text-tiny font-mono text-text-secondary whitespace-pre-wrap break-words overflow-auto max-h-[600px]">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </>
  );
}
