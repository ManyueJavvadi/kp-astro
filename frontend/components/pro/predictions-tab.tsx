"use client";

import { useState } from "react";
import {
  Plus,
  Target,
  CheckCircle2,
  Circle,
  XCircle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  usePredictionsList,
  useCreatePrediction,
  useUpdatePrediction,
  type PredictionRow,
} from "@/hooks/use-predictions";
import { cn } from "@/lib/utils";

const DOMAINS = [
  "career",
  "marriage",
  "health",
  "finance",
  "education",
  "travel",
  "foreign",
  "property",
  "children",
  "litigation",
  "spiritual",
  "other",
];

const OUTCOMES = [
  { value: "pending", label: "Pending", icon: Circle, color: "text-text-muted" },
  { value: "correct", label: "Correct", icon: CheckCircle2, color: "text-success" },
  { value: "partial", label: "Partial", icon: HelpCircle, color: "text-warning" },
  { value: "wrong", label: "Wrong", icon: XCircle, color: "text-error" },
] as const;

export function PredictionsTab({ clientId }: { clientId: string }) {
  const { data, isLoading } = usePredictionsList({ client_id: clientId });
  const create = useCreatePrediction();
  const update = useUpdatePrediction();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    prediction_text: "",
    domain: "career",
    target_window_start: "",
    target_window_end: "",
  });

  const items = data?.items ?? [];
  const verified = items.filter((p) => p.outcome !== "pending" && p.outcome !== "unverifiable");
  const correct = items.filter((p) => p.outcome === "correct").length;
  const partial = items.filter((p) => p.outcome === "partial").length;
  const pending = items.filter((p) => p.outcome === "pending").length;
  const accuracy =
    verified.length > 0 ? Math.round(((correct + 0.5 * partial) / verified.length) * 100) : 0;

  const handleCreate = async () => {
    if (!form.prediction_text.trim()) return;
    await create.mutateAsync({
      client_id: clientId,
      prediction_text: form.prediction_text.trim(),
      domain: form.domain,
      target_window_start: form.target_window_start || undefined,
      target_window_end: form.target_window_end || undefined,
    });
    setForm({ prediction_text: "", domain: "career", target_window_start: "", target_window_end: "" });
    setShowCreate(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Total" value={String(items.length)} />
        <MiniStat label="Correct" value={String(correct)} color="success" />
        <MiniStat label="Pending" value={String(pending)} />
        <MiniStat label="Accuracy" value={`${accuracy}%`} color="gold" />
      </div>

      <div className="flex items-center justify-between mt-2 mb-1">
        <div>
          <div className="text-tiny uppercase tracking-wider text-gold mb-1">
            PREDICTION LEDGER
          </div>
          <h2 className="font-display text-h2 font-semibold text-text-primary">
            What you&apos;ve predicted
          </h2>
        </div>
        <Button variant="primary" leftIcon={<Plus />} onClick={() => setShowCreate(true)}>
          Log prediction
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10 text-text-muted">
          <Loader2 className="size-5 animate-spin mr-2" /> Loading…
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="p-10 rounded-xl border-2 border-dashed border-border-strong text-center">
          <div className="size-14 mx-auto mb-3 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-gold">
            <Target className="size-6" />
          </div>
          <div className="font-display text-h3 font-semibold text-text-primary mb-1">
            No predictions logged
          </div>
          <div className="text-body text-text-secondary max-w-md mx-auto mb-5">
            Log every prediction you make with a target window. Mark outcomes
            later — this builds your accuracy scoreboard over time.
          </div>
          <Button variant="primary" leftIcon={<Plus />} onClick={() => setShowCreate(true)}>
            Log first prediction
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-xl bg-bg-surface border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-surface-2 border-b border-border">
                <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Prediction</th>
                <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Domain</th>
                <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Window</th>
                <th className="text-center text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((p) => (
                <PredictionRowDisplay
                  key={p.id}
                  prediction={p}
                  onOutcome={(outcome) =>
                    update.mutate({ id: p.id, body: { outcome } })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a prediction</DialogTitle>
            <DialogDescription>
              Specific predictions with target windows are easiest to verify
              later. Mark the outcome when the window passes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Prediction
              </label>
              <Textarea
                rows={3}
                placeholder="Job offer by June 2026"
                value={form.prediction_text}
                onChange={(e) => setForm({ ...form, prediction_text: e.target.value })}
              />
            </div>
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Domain
              </label>
              <select
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-bg-surface-2 border border-border text-text-primary text-body focus:outline-none focus:border-border-accent focus:ring-1 focus:ring-gold"
              >
                {DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                  Window start
                </label>
                <Input
                  type="date"
                  value={form.target_window_start}
                  onChange={(e) => setForm({ ...form, target_window_start: e.target.value })}
                />
              </div>
              <div>
                <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                  Window end
                </label>
                <Input
                  type="date"
                  value={form.target_window_end}
                  onChange={(e) => setForm({ ...form, target_window_end: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" loading={create.isPending} onClick={handleCreate}>
              Log prediction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PredictionRowDisplay({
  prediction,
  onOutcome,
}: {
  prediction: PredictionRow;
  onOutcome: (outcome: string) => void;
}) {
  const outcomeInfo = OUTCOMES.find((o) => o.value === prediction.outcome) ?? OUTCOMES[0];
  const OutIcon = outcomeInfo.icon;
  return (
    <tr className="hover:bg-bg-hover transition-colors">
      <td className="px-4 py-3 text-small text-text-primary max-w-md">
        {prediction.prediction_text}
      </td>
      <td className="px-4 py-3 text-small text-text-secondary capitalize">
        {prediction.domain}
      </td>
      <td className="px-4 py-3 text-tiny text-text-muted font-mono">
        {prediction.target_window_start || "—"} → {prediction.target_window_end || "—"}
      </td>
      <td className="px-4 py-3 text-center">
        <div className="inline-flex items-center gap-1">
          {OUTCOMES.map((o) => {
            const Icon = o.icon;
            const active = o.value === prediction.outcome;
            return (
              <button
                key={o.value}
                onClick={() => onOutcome(o.value)}
                className={cn(
                  "size-7 rounded flex items-center justify-center transition-all",
                  active
                    ? `${o.color} bg-bg-hover`
                    : "text-text-muted hover:text-text-primary hover:bg-bg-hover"
                )}
                title={o.label}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "gold" | "success";
}) {
  return (
    <div className="p-4 rounded-lg bg-bg-surface border border-border">
      <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">
        {label}
      </div>
      <div
        className={cn(
          "font-display text-h2 leading-none font-semibold",
          color === "success"
            ? "text-success"
            : color === "gold"
              ? "text-gold"
              : "text-text-primary"
        )}
      >
        {value}
      </div>
    </div>
  );
}
