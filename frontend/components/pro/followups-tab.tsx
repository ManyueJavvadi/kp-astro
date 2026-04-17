"use client";

import { useState } from "react";
import { Plus, Loader2, Bell, Trash2, CheckCircle2 } from "lucide-react";
import { theme, styles } from "@/lib/theme";
import { ContentCard, SectionLabel, SectionHeading } from "@/components/ui/content-card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useFollowupsList,
  useCreateFollowup,
  useUpdateFollowup,
  useDeleteFollowup,
  type FollowupRow,
} from "@/hooks/use-followups";
import { toast } from "sonner";

export function FollowupsTab({ clientId }: { clientId: string }) {
  const { data, isLoading } = useFollowupsList({ client_id: clientId });
  const items = data?.items ?? [];
  const now = new Date();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <SectionLabel>
            {items.length} {items.length === 1 ? "item" : "items"}
            {(data?.overdue ?? 0) > 0 && (
              <span style={{ color: theme.warning, marginLeft: 8 }}>
                · {data!.overdue} overdue
              </span>
            )}
          </SectionLabel>
          <SectionHeading>Follow-ups</SectionHeading>
        </div>
        <NewFollowupDialog clientId={clientId} />
      </div>

      {isLoading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            color: theme.text.muted,
          }}
        >
          <Loader2 size={16} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} />
          Loading…
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
              <Bell size={20} />
            </div>
            <SectionHeading>No follow-ups yet</SectionHeading>
            <div
              style={{
                fontSize: 13,
                color: theme.text.muted,
                maxWidth: 420,
                margin: "8px auto 16px",
                lineHeight: 1.5,
              }}
            >
              Add reminders like &ldquo;check if Saturn MD ended as predicted&rdquo; or &ldquo;
              call Ravi about the July window.&rdquo;
            </div>
            <NewFollowupDialog clientId={clientId} />
          </div>
        </ContentCard>
      )}

      {items.map((f) => (
        <FollowupCard key={f.id} followup={f} now={now} />
      ))}
    </div>
  );
}

function FollowupCard({ followup: f, now }: { followup: FollowupRow; now: Date }) {
  const update = useUpdateFollowup();
  const remove = useDeleteFollowup();
  const due = new Date(f.due_at);
  const overdue = due < now && !f.completed_at;
  const completed = !!f.completed_at;

  return (
    <ContentCard>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <button
          onClick={() => update.mutate({ id: f.id, body: { completed: !completed } })}
          title={completed ? "Mark incomplete" : "Mark complete"}
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            border: completed
              ? `2px solid ${theme.success}`
              : `2px solid rgba(255,255,255,0.2)`,
            backgroundColor: completed ? theme.success : "transparent",
            color: "#07070d",
            cursor: "pointer",
            flexShrink: 0,
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {completed && <CheckCircle2 size={11} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              color: completed ? theme.text.muted : theme.text.primary,
              lineHeight: 1.5,
              textDecoration: completed ? "line-through" : "none",
            }}
          >
            {f.note}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 6,
              fontSize: 11,
              color: theme.text.muted,
            }}
          >
            <span>
              {due.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span style={{ color: theme.text.dim }}>·</span>
            <span style={{ textTransform: "capitalize" }}>{f.source}</span>
            {overdue && (
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 3,
                  backgroundColor: "rgba(248,113,113,0.12)",
                  color: theme.error,
                  fontWeight: 600,
                }}
              >
                Overdue
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm("Delete this follow-up?")) remove.mutate(f.id);
          }}
          title="Delete"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "none",
            backgroundColor: "transparent",
            color: theme.text.dim,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </ContentCard>
  );
}

function NewFollowupDialog({ clientId }: { clientId: string }) {
  const create = useCreateFollowup();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [dueAt, setDueAt] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || !dueAt) {
      toast.error("Note and due date are required");
      return;
    }
    try {
      const dueIso = new Date(dueAt).toISOString();
      await create.mutateAsync({
        client_id: clientId,
        note: note.trim(),
        due_at: dueIso,
        source: "manual",
      });
      setOpen(false);
      setNote("");
      setDueAt("");
    } catch {
      /* handled */
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button style={styles.primaryButton}>
          <Plus size={14} /> Add follow-up
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New follow-up</DialogTitle>
          <DialogDescription>
            A reminder tied to this client. Due date triggers dashboard alert.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} style={{ display: "contents" }}>
          <DialogBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={styles.sectionLabel}>Reminder note</div>
                <textarea
                  rows={3}
                  placeholder="e.g. Check if the July job prediction came true"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{
                    ...styles.input,
                    height: 80,
                    padding: "10px 12px",
                    resize: "vertical",
                    fontFamily: "inherit",
                    lineHeight: 1.5,
                  }}
                />
              </div>
              <div>
                <div style={styles.sectionLabel}>Due date</div>
                <input
                  type="date"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={styles.ghostButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              style={{ ...styles.primaryButton, opacity: create.isPending ? 0.6 : 1 }}
            >
              {create.isPending ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Plus size={14} />
              )}
              Create follow-up
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
