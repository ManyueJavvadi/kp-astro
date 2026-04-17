"use client";

import { useState } from "react";
import { Plus, Target, CheckCircle2, Circle, XCircle, HelpCircle, Loader2 } from "lucide-react";
import { theme, styles } from "@/lib/theme";
import { ContentCard, SectionLabel, SectionHeading } from "@/components/ui/content-card";
import { StatCard } from "@/components/ui/stat-card";
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

const DOMAINS = [
  "career", "marriage", "health", "finance", "education",
  "travel", "foreign", "property", "children", "litigation", "spiritual", "other",
];

const OUTCOMES = [
  { value: "pending", label: "Pending", icon: Circle, color: "#64748B" },
  { value: "correct", label: "Correct", icon: CheckCircle2, color: "#34d399" },
  { value: "partial", label: "Partial", icon: HelpCircle, color: "#fbbf24" },
  { value: "wrong", label: "Wrong", icon: XCircle, color: "#f87171" },
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
  const accuracy = verified.length > 0 ? Math.round(((correct + 0.5 * partial) / verified.length) * 100) : 0;

  const submit = async () => {
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatCard label="Total" value={String(items.length)} />
        <StatCard label="Correct" value={String(correct)} sub={items.length ? `${Math.round((correct / items.length) * 100)}% of all` : ""} />
        <StatCard label="Pending" value={String(pending)} sub="Awaiting outcome" />
        <StatCard label="Accuracy" value={`${accuracy}%`} sub={`${verified.length} verified`} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 8 }}>
        <div>
          <SectionLabel>Prediction Ledger</SectionLabel>
          <SectionHeading>What you&apos;ve predicted</SectionHeading>
        </div>
        <button onClick={() => setShowCreate(true)} style={styles.primaryButton}>
          <Plus size={14} /> Log prediction
        </button>
      </div>

      {isLoading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: theme.text.muted }}>
          <Loader2 size={16} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} /> Loading…
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <ContentCard>
          <div style={{ textAlign: "center", padding: 24 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                backgroundColor: "rgba(201,169,110,0.1)",
                color: theme.gold,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Target size={20} />
            </div>
            <SectionHeading>No predictions logged</SectionHeading>
            <div style={{ fontSize: 13, color: theme.text.muted, maxWidth: 420, margin: "8px auto 16px", lineHeight: 1.5 }}>
              Log every prediction with a target window. Mark outcomes later to
              build a reliable accuracy record.
            </div>
            <button onClick={() => setShowCreate(true)} style={styles.primaryButton}>
              <Plus size={14} /> Log first prediction
            </button>
          </div>
        </ContentCard>
      )}

      {items.length > 0 && (
        <ContentCard padding="none">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr auto",
              gap: 12,
              padding: "10px 20px",
              borderBottom: theme.border.default,
              fontSize: 10,
              color: theme.text.dim,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 500,
            }}
          >
            <span>Prediction</span>
            <span>Domain</span>
            <span>Window</span>
            <span style={{ textAlign: "center" }}>Outcome</span>
          </div>
          {items.map((p) => (
            <PredictionRowDisplay
              key={p.id}
              prediction={p}
              onOutcome={(outcome) => update.mutate({ id: p.id, body: { outcome } })}
            />
          ))}
        </ContentCard>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a prediction</DialogTitle>
            <DialogDescription>
              Be specific. Set a target window — easiest to verify later.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={styles.sectionLabel}>Prediction</div>
              <textarea
                rows={3}
                placeholder="Job offer by June 2026"
                value={form.prediction_text}
                onChange={(e) => setForm({ ...form, prediction_text: e.target.value })}
                style={{ ...styles.input, height: 80, padding: "10px 12px", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
              />
            </div>
            <div>
              <div style={styles.sectionLabel}>Domain</div>
              <select
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                style={{ ...styles.input, textTransform: "capitalize" }}
              >
                {DOMAINS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={styles.sectionLabel}>Window start</div>
                <input
                  type="date"
                  value={form.target_window_start}
                  onChange={(e) => setForm({ ...form, target_window_start: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div>
                <div style={styles.sectionLabel}>Window end</div>
                <input
                  type="date"
                  value={form.target_window_end}
                  onChange={(e) => setForm({ ...form, target_window_end: e.target.value })}
                  style={styles.input}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} style={styles.ghostButton}>Cancel</button>
            <button onClick={submit} disabled={create.isPending} style={styles.primaryButton}>
              {create.isPending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
              Log
            </button>
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
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr auto",
        gap: 12,
        padding: "12px 20px",
        borderTop: theme.border.default,
        fontSize: 13,
        alignItems: "center",
      }}
    >
      <div style={{ color: theme.text.primary }}>{prediction.prediction_text}</div>
      <div style={{ color: theme.text.secondary, textTransform: "capitalize" }}>{prediction.domain}</div>
      <div style={{ color: theme.text.muted, fontSize: 11, fontFamily: "monospace" }}>
        {prediction.target_window_start || "—"} → {prediction.target_window_end || "—"}
      </div>
      <div style={{ display: "inline-flex", gap: 2 }}>
        {OUTCOMES.map((o) => {
          const Icon = o.icon;
          const active = o.value === prediction.outcome;
          return (
            <button
              key={o.value}
              onClick={() => onOutcome(o.value)}
              title={o.label}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: active ? "rgba(255,255,255,0.06)" : "transparent",
                color: active ? o.color : theme.text.dim,
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
