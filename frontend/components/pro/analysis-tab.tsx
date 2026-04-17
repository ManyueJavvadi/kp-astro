"use client";

import { useState } from "react";
import { Sparkles, Loader2, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";

const TOPICS = [
  { key: "marriage", label: "Marriage" },
  { key: "job", label: "Career / Job" },
  { key: "health", label: "Health" },
  { key: "foreign_travel", label: "Foreign Travel" },
  { key: "children", label: "Children" },
  { key: "property", label: "Property" },
  { key: "wealth", label: "Wealth" },
  { key: "education", label: "Education" },
];

interface Turn {
  q: string;
  a: string;
  topic?: string;
}

interface AnalysisInput {
  name: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  timezone_offset: number;
}

export function AnalysisTab({ input }: { input: AnalysisInput }) {
  const [topic, setTopic] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);

  const askTopic = async (t: string) => {
    setLoading(true);
    setTopic(t);
    try {
      const res = await api.post<{ topic: string; answer: string }>(
        "/astrologer/analyze",
        {
          ...input,
          topic: t,
          question: "",
          history: turns.map((x) => ({ question: x.q, answer: x.a })),
          language: "english",
        }
      );
      setTurns((prev) => [...prev, { q: `Analyze ${t}`, a: res.data.answer, topic: t }]);
    } catch {
      toast.error("Analysis failed — check backend");
    }
    setLoading(false);
  };

  const askQuestion = async () => {
    if (!question.trim() || !topic) {
      toast.error("Pick a topic first, then type a follow-up");
      return;
    }
    const q = question;
    setQuestion("");
    setLoading(true);
    try {
      const res = await api.post<{ topic: string; answer: string }>(
        "/astrologer/analyze",
        {
          ...input,
          topic,
          question: q,
          history: turns.map((x) => ({ question: x.q, answer: x.a })),
          language: "english",
        }
      );
      setTurns((prev) => [...prev, { q, a: res.data.answer, topic }]);
    } catch {
      toast.error("Analysis failed");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-tiny uppercase tracking-wider text-gold mb-2">
          TOPIC ANALYSIS — pick any, Claude will reason from this chart
        </div>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t.key}
              onClick={() => askTopic(t.key)}
              disabled={loading}
              className={
                topic === t.key
                  ? "px-4 py-2 rounded-full text-small font-medium bg-gold-glow text-gold border border-border-accent"
                  : "px-4 py-2 rounded-full text-small font-medium bg-bg-surface-2 text-text-secondary border border-border hover:text-text-primary hover:border-border-strong transition-colors"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {turns.length === 0 && !loading && (
        <div className="p-10 rounded-xl border-2 border-dashed border-border-strong text-center">
          <div className="size-14 mx-auto mb-3 rounded-full bg-[color-mix(in_srgb,var(--color-ai)_15%,transparent)] border border-[color-mix(in_srgb,var(--color-ai)_30%,transparent)] flex items-center justify-center text-ai">
            <Sparkles className="size-6" />
          </div>
          <div className="font-display text-h3 font-semibold text-text-primary mb-1">
            Pick a topic to begin
          </div>
          <div className="text-body text-text-secondary max-w-md mx-auto">
            Claude reads the computed KP chart (CSLs, dashas, significators)
            and returns a rigorous analysis in plain language.
          </div>
        </div>
      )}

      {turns.map((t, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="text-tiny text-gold flex items-center gap-2">
            <MessageCircle className="size-3" /> {t.topic && <Badge size="sm">{t.topic}</Badge>}
            {t.q}
          </div>
          <div className="rounded-xl p-5 bg-[color-mix(in_srgb,var(--color-ai)_5%,var(--color-bg-surface))] border border-[color-mix(in_srgb,var(--color-ai)_25%,transparent)]">
            <div className="text-tiny uppercase tracking-wider text-ai mb-2 flex items-center gap-1.5">
              <Sparkles className="size-3" /> CLAUDE · KP ANALYSIS
            </div>
            <div className="text-small text-text-primary leading-relaxed whitespace-pre-wrap">
              {t.a}
            </div>
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex items-center justify-center py-10 text-text-muted">
          <Loader2 className="size-5 animate-spin mr-2" />
          Claude is reading the chart…
        </div>
      )}

      {topic && (
        <div className="sticky bottom-6 z-20">
          <div className="rounded-xl bg-bg-elevated border border-border-strong shadow-xl p-3 flex items-end gap-2">
            <Textarea
              rows={2}
              placeholder={`Follow-up about ${topic}…`}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  askQuestion();
                }
              }}
              className="resize-none"
            />
            <Button
              variant="primary"
              leftIcon={<Send />}
              loading={loading}
              onClick={askQuestion}
              disabled={!question.trim()}
            >
              Ask
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
