"use client";

import { useState } from "react";
import {
  Plus,
  Sparkles,
  Clock,
  CheckCircle2,
  MessageCircle,
  Play,
  Loader2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useSessionsList,
  useCreateSession,
  useEndSession,
  useSummarizeSession,
  useUpdateSession,
  type SessionRow,
} from "@/hooks/use-sessions";

export function SessionsTab({ clientId }: { clientId: string }) {
  const { data, isLoading } = useSessionsList({ client_id: clientId });
  const createSession = useCreateSession();
  const [typeToCreate, setTypeToCreate] = useState<"walkin" | "scheduled">("walkin");
  const [queryText, setQueryText] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const handleStart = async () => {
    await createSession.mutateAsync({
      client_id: clientId,
      session_type: "walkin",
      query_text: queryText || undefined,
    });
    setQueryText("");
    setShowCreate(false);
  };

  const sessions = data?.items ?? [];
  const inProgress = sessions.find((s) => s.status === "in_progress");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-tiny uppercase tracking-wider text-gold mb-1">
            {sessions.length} {sessions.length === 1 ? "SESSION" : "SESSIONS"}
          </div>
          <h2 className="font-display text-h2 font-semibold text-text-primary">
            Consultation history
          </h2>
        </div>
        {!inProgress && (
          <Button variant="primary" leftIcon={<Zap />} onClick={() => setShowCreate(true)}>
            Start walk-in session
          </Button>
        )}
      </div>

      {inProgress && <LiveSessionCard session={inProgress} />}

      {isLoading && (
        <div className="flex items-center justify-center py-10 text-text-muted">
          <Loader2 className="size-5 animate-spin mr-2" /> Loading…
        </div>
      )}

      {!isLoading && sessions.length === 0 && (
        <div className="p-10 rounded-xl border-2 border-dashed border-border-strong text-center">
          <div className="size-14 mx-auto mb-3 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-gold">
            <MessageCircle className="size-6" />
          </div>
          <div className="font-display text-h3 font-semibold text-text-primary mb-1">
            No sessions yet
          </div>
          <div className="text-body text-text-secondary max-w-md mx-auto mb-5">
            Start a walk-in when a client arrives. The session records time, notes,
            and an AI-generated summary you can reference later.
          </div>
          <Button variant="primary" leftIcon={<Zap />} onClick={() => setShowCreate(true)}>
            Start first session
          </Button>
        </div>
      )}

      {sessions
        .filter((s) => s.status !== "in_progress")
        .map((s) => (
          <SessionCard key={s.id} session={s} />
        ))}

      {/* Walk-in start dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a walk-in session</DialogTitle>
            <DialogDescription>
              Timer starts now. Add notes during the consult, then end it when
              done — AI will summarize.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
              What did the client ask? (optional)
            </label>
            <Textarea
              rows={3}
              placeholder="e.g. Career change decision — should I take the new job?"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={<Zap />}
              loading={createSession.isPending}
              onClick={handleStart}
            >
              Start session now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LiveSessionCard({ session }: { session: SessionRow }) {
  const [transcript, setTranscript] = useState(session.transcript ?? "");
  const endSession = useEndSession();
  const summarize = useSummarizeSession();
  const updateSession = useUpdateSession();

  const saveTranscript = async () => {
    await updateSession.mutateAsync({
      id: session.id,
      body: { transcript } as Partial<SessionRow>,
    });
  };

  const handleEndAndSummarize = async () => {
    if (transcript.trim().length > 10) {
      await summarize.mutateAsync({ id: session.id, transcript });
    }
    await endSession.mutateAsync(session.id);
  };

  const startedAt = session.started_at
    ? new Date(session.started_at)
    : new Date();
  const elapsedMin = Math.floor(
    (Date.now() - startedAt.getTime()) / 60000
  );

  return (
    <div className="rounded-xl p-[1px] bg-gradient-to-b from-gold to-transparent">
      <div className="rounded-xl bg-bg-surface p-5 border border-border-accent">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="gold" size="md">
            <Play className="size-3" /> LIVE SESSION
          </Badge>
          <Badge size="md">
            <Clock className="size-3" /> {elapsedMin}m elapsed
          </Badge>
          {session.query_text && (
            <div className="text-tiny text-text-muted">“{session.query_text}”</div>
          )}
        </div>
        <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
          Live notes / transcript
        </label>
        <Textarea
          rows={6}
          placeholder="Key points, client's questions, your analysis, predictions…"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          onBlur={saveTranscript}
          className="mb-3"
        />
        <div className="flex items-center justify-between gap-3">
          <div className="text-tiny text-text-muted">
            Notes auto-save on blur. AI will summarize when you end.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={saveTranscript}>
              Save draft
            </Button>
            <Button
              variant="primary"
              leftIcon={<Sparkles />}
              loading={endSession.isPending || summarize.isPending}
              onClick={handleEndAndSummarize}
            >
              End & summarize
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionCard({ session }: { session: SessionRow }) {
  const d = new Date(session.started_at ?? session.scheduled_at);
  return (
    <div className="p-5 rounded-xl bg-bg-surface border border-border hover:border-border-strong transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-tiny uppercase tracking-wider text-gold">
              {d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              · {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </div>
            {session.duration_minutes !== null && (
              <Badge size="sm">
                <Clock className="size-3" /> {session.duration_minutes}m
              </Badge>
            )}
            <Badge
              variant={
                session.status === "completed" ? "success" : "default"
              }
              size="sm"
            >
              {session.status === "completed" ? (
                <>
                  <CheckCircle2 className="size-3" /> Completed
                </>
              ) : (
                session.status
              )}
            </Badge>
            <Badge size="sm">{session.session_type}</Badge>
          </div>
          {session.query_text && (
            <div className="font-display text-h3 font-semibold text-text-primary">
              {session.query_text}
            </div>
          )}
        </div>
      </div>
      {session.ai_summary && (
        <div className="rounded-lg bg-[color-mix(in_srgb,var(--color-ai)_5%,transparent)] border border-[color-mix(in_srgb,var(--color-ai)_20%,transparent)] p-3">
          <div className="text-tiny uppercase tracking-wider text-ai mb-1 flex items-center gap-1">
            <Sparkles className="size-3" /> AI SUMMARY
          </div>
          <div className="text-small text-text-secondary leading-relaxed whitespace-pre-line">
            {session.ai_summary}
          </div>
        </div>
      )}
      {!session.ai_summary && session.transcript && (
        <div className="text-small text-text-secondary italic">
          {session.transcript.slice(0, 200)}
          {session.transcript.length > 200 ? "…" : ""}
        </div>
      )}
    </div>
  );
}

/* unused import placeholder */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unused = Plus;
