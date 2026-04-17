"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Check, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/input";
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
      toast.error("Failed to save notes");
      setStatus("idle");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(e.target.value), 1000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-tiny uppercase tracking-wider text-gold mb-1">
            PRIVATE NOTES
          </div>
          <h2 className="font-display text-h2 font-semibold text-text-primary">
            Astrologer-only jottings
          </h2>
          <p className="text-small text-text-secondary mt-1 max-w-2xl">
            Notes are never shown to the client. Auto-save kicks in 1 second
            after you stop typing.
          </p>
        </div>
        <div className="text-tiny text-text-muted flex items-center gap-1.5">
          {status === "saving" && (
            <>
              <Loader2 className="size-3 animate-spin" /> Saving…
            </>
          )}
          {status === "saved" && (
            <>
              <Check className="size-3 text-success" /> Saved
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-bg-surface border border-border p-5">
        <Textarea
          rows={16}
          value={notes}
          onChange={handleChange}
          placeholder="Observations, theories, unresolved questions, things to research, chart anomalies, client's unique circumstances…"
          className="resize-y font-mono text-small leading-relaxed"
        />
      </div>

      <div className="flex items-start gap-2 text-tiny text-text-muted">
        <FileText className="size-3 shrink-0 mt-0.5" />
        <div>
          Notes are stored encrypted at rest via Supabase. Only you (the
          astrologer who created this client) can read them — enforced by
          row-level security.
        </div>
      </div>
    </div>
  );
}
