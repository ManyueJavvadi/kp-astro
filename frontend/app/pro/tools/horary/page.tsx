"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { Wand2, Loader2, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { theme, styles } from "@/lib/theme";
import { ContentCard, SectionLabel, SectionHeading } from "@/components/ui/content-card";
import { api } from "@/lib/api";
import { toast } from "sonner";

const TOPICS = ["general", "marriage", "career", "health", "travel", "wealth", "litigation", "property"];

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

  const pickRandom = () => setNumber(Math.floor(Math.random() * 249) + 1);

  const verdict = result?.verdict ?? result?.overall_verdict;
  const verdictColor =
    verdict === "YES" ? theme.success : verdict === "NO" ? theme.error : theme.warning;
  const VerdictIcon = verdict === "YES" ? CheckCircle2 : verdict === "NO" ? XCircle : HelpCircle;

  return (
    <main
      style={{
        padding: "24px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        minHeight: "100vh",
        maxWidth: 900,
      }}
    >
      <header>
        <div style={styles.sectionLabel}>Krishnamurti Paddhati · 1–249</div>
        <h1 style={styles.pageTitle}>Horary · Prashna</h1>
        <p style={{ fontSize: 13, color: theme.text.muted, margin: "4px 0 0", maxWidth: 600 }}>
          Ask a question, pick a number between 1 and 249, get a YES/NO verdict based on
          Lagna Sub-Lord + topic cusp CSL + Ruling Planets confirmation.
        </p>
      </header>

      <ContentCard>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={styles.sectionLabel}>Your question</div>
            <textarea
              rows={2}
              placeholder="Will my visa arrive this month?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{
                ...styles.input,
                height: 72,
                padding: "10px 12px",
                lineHeight: 1.5,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={styles.sectionLabel}>Number (1–249)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  min={1}
                  max={249}
                  value={number}
                  onChange={(e) =>
                    setNumber(e.target.value === "" ? "" : Math.min(249, Math.max(1, parseInt(e.target.value) || 1)))
                  }
                  placeholder="Pick or random"
                  style={{ ...styles.input, flex: 1 }}
                />
                <button onClick={pickRandom} style={styles.secondaryButton}>
                  Random
                </button>
              </div>
            </div>
            <div>
              <div style={styles.sectionLabel}>Topic</div>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                style={{ ...styles.input, textTransform: "capitalize" }}
              >
                {TOPICS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={run}
            disabled={loading}
            style={{
              ...styles.primaryButton,
              height: 40,
              fontSize: 13,
              alignSelf: "flex-start",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Wand2 size={14} />}
            Compute verdict
          </button>
        </div>
      </ContentCard>

      {/* Verdict */}
      {result && verdict && (
        <div
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.02), transparent)`,
            border: `1px solid ${verdictColor}40`,
            borderRadius: 10,
            padding: 32,
            textAlign: "center",
          }}
        >
          <SectionLabel>Verdict</SectionLabel>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              marginTop: 8,
              marginBottom: 8,
            }}
          >
            <VerdictIcon size={40} color={verdictColor} />
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: verdictColor,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {verdict}
            </div>
          </div>
          <div style={{ fontSize: 13, color: theme.text.muted }}>
            Number {number} · Lagna-CSL analysis · topic: {topic}
          </div>
        </div>
      )}

      {/* Details */}
      {result && (
        <ContentCard>
          <SectionHeading>KP analysis</SectionHeading>
          <div
            style={{
              marginTop: 12,
              padding: 12,
              backgroundColor: theme.bg.page,
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "monospace",
              color: theme.text.secondary,
              whiteSpace: "pre-wrap",
              maxHeight: 500,
              overflow: "auto",
              lineHeight: 1.5,
            }}
          >
            {JSON.stringify(result, null, 2)}
          </div>
        </ContentCard>
      )}

      {!result && !loading && (
        <ContentCard>
          <SectionLabel>How KP Horary works</SectionLabel>
          <div style={{ fontSize: 13, color: theme.text.secondary, lineHeight: 1.6, marginTop: 8 }}>
            The chosen number (1–249) maps to a Lagna Sub-Lord. Layer 1 checks whether the
            Lagna CSL is fruitful. Layer 2 checks whether the topic cusp CSL (e.g. H7 for
            marriage) signifies favorable houses. Layer 3 confirms with Ruling Planets at
            query time. All three aligning = a strong YES.
          </div>
        </ContentCard>
      )}
    </main>
  );
}
