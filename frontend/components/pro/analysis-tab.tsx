"use client";

import { useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import { theme, styles } from "@/lib/theme";
import { ContentCard, SectionLabel, SectionHeading } from "@/components/ui/content-card";
import { api } from "@/lib/api";
import { toast } from "sonner";

const TOPICS = [
  { key: "marriage", label: "Marriage" },
  { key: "job", label: "Career" },
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
      const res = await api.post<{ answer: string }>("/astrologer/analyze", {
        ...input,
        topic: t,
        question: "",
        history: turns.map((x) => ({ question: x.q, answer: x.a })),
        language: "english",
      });
      setTurns((prev) => [...prev, { q: `Analyze ${t}`, a: res.data.answer, topic: t }]);
    } catch {
      toast.error("Analysis failed");
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
      const res = await api.post<{ answer: string }>("/astrologer/analyze", {
        ...input,
        topic,
        question: q,
        history: turns.map((x) => ({ question: x.q, answer: x.a })),
        language: "english",
      });
      setTurns((prev) => [...prev, { q, a: res.data.answer, topic: topic ?? undefined }]);
    } catch {
      toast.error("Analysis failed");
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentCard>
        <SectionLabel>Pick a topic — Claude reasons from this chart</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {TOPICS.map((t) => {
            const active = topic === t.key;
            return (
              <button
                key={t.key}
                onClick={() => askTopic(t.key)}
                disabled={loading}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  border: active ? theme.border.accent : theme.border.default,
                  backgroundColor: active ? "rgba(201,169,110,0.1)" : theme.bg.page,
                  color: active ? theme.gold : theme.text.secondary,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </ContentCard>

      {turns.length === 0 && !loading && (
        <ContentCard>
          <div style={{ textAlign: "center", padding: 24 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                backgroundColor: "rgba(167,139,250,0.12)",
                color: theme.ai,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Sparkles size={20} />
            </div>
            <SectionHeading>Pick a topic to begin</SectionHeading>
            <div style={{ fontSize: 13, color: theme.text.muted, maxWidth: 440, margin: "8px auto 0", lineHeight: 1.5 }}>
              Claude reads the computed KP chart (CSLs, dashas, significators, RPs)
              and returns a rigorous analysis in plain language.
            </div>
          </div>
        </ContentCard>
      )}

      {turns.map((t, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: theme.gold,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
            }}
          >
            {t.topic && (
              <span
                style={{
                  padding: "2px 8px",
                  backgroundColor: "rgba(201,169,110,0.12)",
                  borderRadius: 4,
                  fontSize: 10,
                }}
              >
                {t.topic}
              </span>
            )}
            {t.q}
          </div>
          <div
            style={{
              padding: 20,
              borderRadius: 8,
              backgroundColor: "rgba(167,139,250,0.04)",
              border: "1px solid rgba(167,139,250,0.2)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: theme.ai,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 600,
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sparkles size={11} /> Claude · KP analysis
            </div>
            <div
              style={{
                fontSize: 13,
                color: theme.text.primary,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {t.a}
            </div>
          </div>
        </div>
      ))}

      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            color: theme.text.muted,
            fontSize: 13,
          }}
        >
          <Loader2 size={16} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} />
          Claude is reading the chart…
        </div>
      )}

      {topic && (
        <div
          style={{
            position: "sticky",
            bottom: 16,
            padding: 12,
            backgroundColor: theme.bg.elevated,
            border: theme.border.strong,
            borderRadius: 10,
            boxShadow: theme.shadow.md,
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          <textarea
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
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              color: theme.text.primary,
              fontSize: 13,
              lineHeight: 1.5,
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={askQuestion}
            disabled={loading || !question.trim()}
            style={{ ...styles.primaryButton, opacity: loading || !question.trim() ? 0.5 : 1 }}
          >
            <Send size={14} /> Ask
          </button>
        </div>
      )}
    </div>
  );
}
