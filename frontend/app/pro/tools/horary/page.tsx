"use client";

import { useState } from "react";
import { Wand2, Sparkles, Loader2 } from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function HoraryPage() {
  const [number, setNumber] = useState<number | "">("");
  const [question, setQuestion] = useState("");
  const [topic, setTopic] = useState("general");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (number === "" || number < 1 || number > 249) {
      toast.error("Pick a number 1 to 249");
      return;
    }
    if (!question.trim()) {
      toast.error("Type your question");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/horary/analyze", {
        number,
        question,
        topic,
        latitude: 17.385,
        longitude: 78.4867,
        timezone_offset: 5.5,
      });
      setResult(res.data);
    } catch {
      toast.error("Horary failed — check backend");
    }
    setLoading(false);
  };

  const verdict = result?.verdict ?? result?.overall_verdict;

  return (
    <>
      <TopBar title="Horary · Prashna" tabs={[]} />
      <main className="px-6 pb-12 pt-6 max-w-[1000px] mx-auto">
        <div className="mb-6">
          <div className="text-tiny uppercase tracking-wider text-gold mb-1">
            KRISHNAMURTI PADDHATI · 1–249
          </div>
          <h1 className="font-display text-h1 font-semibold text-text-primary">
            Ask a question
          </h1>
        </div>

        <div className="rounded-xl bg-bg-surface border border-border p-5 flex flex-col gap-4 mb-6">
          <div>
            <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
              Your question
            </label>
            <Textarea
              rows={2}
              placeholder="Will my visa arrive this month?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Number (1–249)
              </label>
              <Input
                type="number"
                min={1}
                max={249}
                value={number}
                onChange={(e) => setNumber(e.target.value === "" ? "" : parseInt(e.target.value))}
                placeholder="Random between 1 and 249"
              />
            </div>
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Topic
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-bg-surface-2 border border-border text-text-primary text-body focus:outline-none focus:border-border-accent focus:ring-1 focus:ring-gold"
              >
                {[
                  "general",
                  "marriage",
                  "career",
                  "health",
                  "travel",
                  "wealth",
                  "litigation",
                  "property",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            variant="primary"
            leftIcon={<Wand2 />}
            loading={loading}
            onClick={run}
          >
            Compute verdict
          </Button>
        </div>

        {result && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl p-8 bg-gradient-to-br from-bg-surface to-bg-surface-2 border-2 border-gold text-center">
              <div className="text-tiny uppercase tracking-wider text-gold mb-2">
                VERDICT
              </div>
              <div className="font-display text-[clamp(3rem,6vw,5rem)] leading-none font-bold text-gold mb-2">
                {verdict ?? "—"}
              </div>
              <div className="text-small text-text-secondary">
                Number {number} · Lagna-CSL chain analysis
              </div>
            </div>

            <div className="rounded-xl p-5 bg-[color-mix(in_srgb,var(--color-ai)_5%,var(--color-bg-surface))] border border-[color-mix(in_srgb,var(--color-ai)_25%,transparent)]">
              <div className="text-tiny uppercase tracking-wider text-ai mb-2 flex items-center gap-1.5">
                <Sparkles className="size-3" /> RAW KP ANALYSIS
              </div>
              <pre className="text-tiny font-mono text-text-secondary whitespace-pre-wrap break-words overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-10 text-text-muted">
            <Loader2 className="size-5 animate-spin mr-2" /> Computing…
          </div>
        )}

        {!result && !loading && (
          <div className="mt-4 p-5 rounded-lg bg-bg-surface-2 border border-border">
            <div className="text-small text-text-secondary leading-relaxed">
              <strong className="text-text-primary">KP Horary</strong> uses the
              Lagna sub-lord at query time (mapped from your chosen number
              1–249) to deliver a YES/NO verdict. The result will show
              Layer 1 (Lagna CSL), Layer 2 (topic cusp CSL), and Layer 3
              (Ruling Planets confirmation).
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export const Badge_unused = Badge; // keep import
