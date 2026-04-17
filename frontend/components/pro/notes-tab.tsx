"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Check, Loader2 } from "lucide-react";
import { theme, styles } from "@/lib/theme";
import { ContentCard, SectionLabel, SectionHeading } from "@/components/ui/content-card";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function NotesTab({
  clientId,
  initial,
}: {
  clientId: string;
  initial: string | null;
}) {
  const [notes, setNotes] = useState(initial ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNotes(initial ?? "");
  }, [initial]);

  const save = async (v: string) => {
    setStatus("saving");
    try {
      await api.put(`/clients/${clientId}`, { notes_private: v });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      toast.error("Failed to save");
      setStatus("idle");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(e.target.value), 1000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <SectionLabel>Private notes</SectionLabel>
          <SectionHeading>Astrologer-only jottings</SectionHeading>
          <div style={{ fontSize: 12, color: theme.text.muted, marginTop: 4, maxWidth: 600, lineHeight: 1.5 }}>
            Notes are never shown to the client. Auto-save kicks in 1 second after you stop typing.
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            color: theme.text.muted,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {status === "saving" && (
            <>
              <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Saving…
            </>
          )}
          {status === "saved" && (
            <>
              <Check size={11} color={theme.success} /> Saved
            </>
          )}
        </div>
      </div>

      <ContentCard>
        <textarea
          rows={18}
          value={notes}
          onChange={handleChange}
          placeholder="Observations, theories, unresolved questions, things to research, chart anomalies, client's unique circumstances…"
          style={{
            ...styles.input,
            height: 400,
            padding: 16,
            resize: "vertical",
            fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
            fontSize: 13,
            lineHeight: 1.6,
            backgroundColor: theme.bg.page,
          }}
        />
      </ContentCard>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11, color: theme.text.muted }}>
        <FileText size={11} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          Stored encrypted at rest via Supabase. Only you can read them — enforced by row-level security.
        </div>
      </div>
    </div>
  );
}
