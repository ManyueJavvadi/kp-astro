"use client";

/**
 * DeleteClientDialog (Wave 13, 2026-06-03, item #2).
 *
 * Typed-DELETE confirmation for hard-delete of a client. Per the
 * 2026-06-03 product discussion, this is the high-friction path —
 * the user must literally type "DELETE" before the button enables.
 * Prevents accidental clicks; reads as serious-business; matches
 * GitHub's repo-delete UX which most technical users know.
 *
 * Cascade behavior (backend FK ON DELETE CASCADE):
 *   - All chart_sessions for the client → deleted
 *   - All client_notes for the client → deleted
 *   - All client_interactions for the client → deleted (when wired
 *     post-launch; the cascade is already in migration 0004)
 *   - The client's portal_slug becomes invalid → public /c/{slug}
 *     returns 404
 *
 * NOT in this dialog (deferred):
 *   - Soft-delete with 30-day undo. Would require a `deleted_at`
 *     column + a Trash view + cron purge. Discussed and deferred —
 *     for v1, hard-delete with serious confirmation is fine for the
 *     astrologer-only audience (they own the data, they understand
 *     the consequence).
 */

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, X } from "lucide-react";
import {
  useDeleteClient,
  type ClientPublic,
} from "@/lib/api/hooks";
import { theme } from "@/lib/theme";

export interface DeleteClientDialogProps {
  open: boolean;
  onClose: () => void;
  client: ClientPublic | null;
  /** Called after a successful delete. Parent typically navigates
   *  back to the CRM home + shows a toast. */
  onDeleted?: () => void;
}

export function DeleteClientDialog({
  open,
  onClose,
  client,
  onDeleted,
}: DeleteClientDialogProps) {
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteClient = useDeleteClient();

  // Reset on close so a re-open starts fresh.
  useEffect(() => {
    if (!open) {
      setTyped("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  // Esc to close (unless mid-submit)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open || !client) return null;

  const canDelete = typed === "DELETE";
  const sessionCount = client.chart_session_count ?? 0;
  const noteCount = client.note_count ?? 0;

  async function handleDelete() {
    if (!canDelete || !client) return;
    setError(null);
    setSubmitting(true);
    try {
      await deleteClient.mutateAsync(client.id);
      onDeleted?.();
      onClose();
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("[DeleteClientDialog] delete failed:", err);
      const status = (err as { status?: number } | null)?.status;
      setError(
        status === 401
          ? "Your session expired. Sign back in and try again."
          : status === 404
            ? "This client was already deleted."
            : "Couldn't delete. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="del-client-title"
      onClick={() => {
        if (!submitting) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(6px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          background: "rgba(22,22,31,0.97)",
          border: "1px solid rgba(248,113,113,0.25)",
          borderRadius: 14,
          padding: 24,
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "rgba(248,113,113,0.12)",
              border: "1px solid rgba(248,113,113,0.3)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f87171",
            }}
          >
            <AlertTriangle size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              id="del-client-title"
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 18,
                margin: 0,
                color: theme.text.primary,
                lineHeight: 1.25,
              }}
            >
              Delete {client.name}?
            </h2>
            <div style={{ fontSize: 11, color: theme.text.muted, marginTop: 4 }}>
              This cannot be undone.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: theme.text.muted,
              cursor: submitting ? "not-allowed" : "pointer",
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Cascade summary */}
        <div
          style={{
            background: "rgba(7,11,20,0.6)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 14,
            fontSize: 12.5,
            color: theme.text.primary,
            lineHeight: 1.55,
          }}
        >
          The following will be permanently removed:
          <ul style={{ margin: "8px 0 0 0", paddingLeft: 18, color: theme.text.muted }}>
            <li>The client&apos;s profile + birth details</li>
            <li>
              {sessionCount} chart session{sessionCount === 1 ? "" : "s"}
              {sessionCount === 0 ? " (none)" : ""}
            </li>
            <li>
              {noteCount} note{noteCount === 1 ? "" : "s"}
              {noteCount === 0 ? " (none)" : ""}
            </li>
            <li>The client&apos;s public portal URL ({" "}
              <code style={{ fontSize: 11, opacity: 0.85 }}>
                /c/{client.portal_slug.slice(0, 8)}…
              </code>
              {" "}stops working)
            </li>
          </ul>
        </div>

        {/* Typed-DELETE input */}
        <label
          htmlFor="del-client-typed"
          style={{
            display: "block",
            fontSize: 10,
            fontWeight: 600,
            color: theme.text.muted,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginBottom: 6,
          }}
        >
          Type <code style={{ color: "#f87171" }}>DELETE</code> to confirm
        </label>
        <input
          id="del-client-typed"
          type="text"
          value={typed}
          // HOTFIX (2026-06-03): uppercase the stored value, not just
          // the CSS rendering. Previously textTransform:uppercase made
          // "delete" LOOK like "DELETE" but state held "delete" — so
          // `typed === "DELETE"` was always false and the button stayed
          // disabled forever. autoCapitalize doesn't help on desktop
          // typing (only mobile keyboards).
          onChange={(e) => setTyped(e.target.value.toUpperCase())}
          disabled={submitting}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          style={{
            width: "100%",
            height: 38,
            padding: "0 12px",
            background: "rgba(9,9,15,0.7)",
            border: canDelete
              ? "1px solid rgba(248,113,113,0.5)"
              : "1px solid rgba(255,255,255,0.08)",
            borderRadius: 7,
            color: theme.text.primary,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 1.5,
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
            textTransform: "uppercase",
          }}
        />

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 10,
              padding: "8px 12px",
              background: "rgba(248,113,113,0.06)",
              border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: 6,
              fontSize: 12,
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "8px 16px",
              borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: theme.text.primary,
              fontSize: 13,
              fontWeight: 500,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete || submitting}
            style={{
              padding: "8px 16px",
              borderRadius: 7,
              border: "none",
              background:
                !canDelete || submitting
                  ? "rgba(248,113,113,0.3)"
                  : "linear-gradient(180deg, #f87171 0%, #dc2626 100%)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: !canDelete || submitting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              minWidth: 130,
              justifyContent: "center",
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                Deleting…
              </>
            ) : (
              "Delete forever"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
