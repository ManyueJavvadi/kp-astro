"use client";

import { useState } from "react";
import { Zap, Sparkles, Clock, CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { theme, styles } from "@/lib/theme";
import { ContentCard, SectionLabel, SectionHeading } from "@/components/ui/content-card";
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
  const [queryText, setQueryText] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const sessions = data?.items ?? [];
  const inProgress = sessions.find((s) => s.status === "in_progress");

  const handleStart = async () => {
    await createSession.mutateAsync({
      client_id: clientId,
      session_type: "walkin",
      query_text: queryText || undefined,
    });
    setQueryText("");
    setShowCreate(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <SectionLabel>
            {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
          </SectionLabel>
          <SectionHeading>Consultation history</SectionHeading>
        </div>
        {!inProgress && (
          <button
            onClick={() => setShowCreate(true)}
            style={styles.primaryButton}
          >
            <Zap size={14} /> Start walk-in
          </button>
        )}
      </div>

      {inProgress && <LiveSessionCard session={inProgress} />}

      {isLoading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: theme.text.muted }}>
          <Loader2 size={16} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} /> Loading…
        </div>
      )}

      {!isLoading && sessions.length === 0 && (
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
              <MessageCircle size={20} />
            </div>
            <SectionHeading>No sessions yet</SectionHeading>
            <div style={{ fontSize: 13, color: theme.text.muted, maxWidth: 420, margin: "8px auto 16px", lineHeight: 1.5 }}>
              When a client calls or walks in, start a session here. Timer +
              notes → AI summary at end.
            </div>
            <button onClick={() => setShowCreate(true)} style={styles.primaryButton}>
              <Zap size={14} /> Start first session
            </button>
          </div>
        </ContentCard>
      )}

      {sessions
        .filter((s) => s.status !== "in_progress")
        .map((s) => (
          <PastSessionCard key={s.id} session={s} />
        ))}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a walk-in session</DialogTitle>
            <DialogDescription>
              Timer starts now. Take notes during the consult, then end it — AI summarizes.
            </DialogDescription>
          </DialogHeader>
          <div>
            <div style={styles.sectionLabel}>What did the client ask? (optional)</div>
            <textarea
              rows={3}
              placeholder="e.g. Career change — should I take the new job?"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              style={{ ...styles.input, height: 80, padding: "10px 12px", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
            />
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} style={styles.ghostButton}>
              Cancel
            </button>
            <button onClick={handleStart} disabled={createSession.isPending} style={styles.primaryButton}>
              {createSession.isPending ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Zap size={14} />
              )}
              Start now
            </button>
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

  const save = async () => {
    await updateSession.mutateAsync({
      id: session.id,
      body: { transcript } as Partial<SessionRow>,
    });
  };

  const handleEnd = async () => {
    if (transcript.trim().length > 10) {
      await summarize.mutateAsync({ id: session.id, transcript });
    }
    await endSession.mutateAsync(session.id);
  };

  const started = session.started_at ? new Date(session.started_at) : new Date();
  const elapsed = Math.floor((Date.now() - started.getTime()) / 60000);

  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${theme.gold}50`,
        background: `linear-gradient(135deg, rgba(201,169,110,0.06), transparent)`,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            padding: "3px 10px",
            borderRadius: 999,
            backgroundColor: "rgba(201,169,110,0.15)",
            color: theme.gold,
            fontWeight: 600,
          }}
        >
          ● LIVE
        </span>
        <span style={{ fontSize: 11, color: theme.text.muted }}>
          <Clock size={10} style={{ display: "inline", marginRight: 3 }} />
          {elapsed}m elapsed
        </span>
        {session.query_text && (
          <span style={{ fontSize: 12, color: theme.text.muted, fontStyle: "italic" }}>
            “{session.query_text}”
          </span>
        )}
      </div>

      <div style={styles.sectionLabel}>Live notes / transcript</div>
      <textarea
        rows={6}
        placeholder="Key points, client's questions, your analysis, predictions…"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        onBlur={save}
        style={{
          ...styles.input,
          height: 150,
          padding: 12,
          resize: "vertical",
          fontFamily: "inherit",
          lineHeight: 1.5,
          marginBottom: 12,
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, color: theme.text.muted }}>
          Notes auto-save on blur. AI summarizes when you end.
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} style={styles.ghostButton}>
            Save draft
          </button>
          <button
            onClick={handleEnd}
            disabled={endSession.isPending || summarize.isPending}
            style={{
              ...styles.primaryButton,
              opacity: endSession.isPending || summarize.isPending ? 0.6 : 1,
            }}
          >
            {endSession.isPending || summarize.isPending ? (
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Sparkles size={14} />
            )}
            End & summarize
          </button>
        </div>
      </div>
    </div>
  );
}

function PastSessionCard({ session: s }: { session: SessionRow }) {
  const d = new Date(s.started_at ?? s.scheduled_at);
  return (
    <ContentCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: theme.gold, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            {d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ·{" "}
            {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </div>
          {s.query_text && (
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.text.primary, marginTop: 4 }}>
              {s.query_text}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {s.duration_minutes !== null && (
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                backgroundColor: "rgba(255,255,255,0.05)",
                color: theme.text.muted,
              }}
            >
              <Clock size={10} style={{ display: "inline", marginRight: 3 }} />
              {s.duration_minutes}m
            </span>
          )}
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor:
                s.status === "completed" ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)",
              color: s.status === "completed" ? theme.success : theme.text.muted,
            }}
          >
            {s.status === "completed" ? (
              <>
                <CheckCircle2 size={10} style={{ display: "inline", marginRight: 3 }} />
                Done
              </>
            ) : (
              s.status
            )}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: "rgba(255,255,255,0.05)",
              color: theme.text.muted,
              textTransform: "capitalize",
            }}
          >
            {s.session_type}
          </span>
        </div>
      </div>

      {s.ai_summary && (
        <div
          style={{
            borderRadius: 6,
            backgroundColor: "rgba(167,139,250,0.05)",
            border: "1px solid rgba(167,139,250,0.2)",
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: theme.ai,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 600,
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Sparkles size={11} /> AI summary
          </div>
          <div style={{ fontSize: 13, color: theme.text.secondary, lineHeight: 1.5, whiteSpace: "pre-line" }}>
            {s.ai_summary}
          </div>
        </div>
      )}

      {!s.ai_summary && s.transcript && (
        <div style={{ fontSize: 12, color: theme.text.muted, fontStyle: "italic" }}>
          {s.transcript.slice(0, 200)}
          {s.transcript.length > 200 ? "…" : ""}
        </div>
      )}
    </ContentCard>
  );
}
