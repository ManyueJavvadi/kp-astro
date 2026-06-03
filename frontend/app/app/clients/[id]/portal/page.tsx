"use client";

/**
 * /app/clients/[id]/portal — astrologer's view of the per-client portal.
 *
 * Phase 3 Slice 3 (2026-06-02). Two purposes on this page:
 *   1. Composer panel — astrologer writes / edits / deletes notes that
 *      appear on the client's public portal page.
 *   2. Preview panel — shows what the client sees when they open
 *      /c/<portal_slug> (with private notes filtered out, just like
 *      the real public endpoint).
 *
 * Plus a "Copy portal URL" button so the astrologer can paste the
 * URL into WhatsApp/SMS.
 *
 * Layout:
 *   Desktop: two-column (composer left ~60%, preview right ~40%)
 *   Mobile: stacked (composer first, preview below)
 *
 * Data flow:
 *   - useClient(clientId) — astrologer-side info (incl portal_slug)
 *   - useClientNotes(clientId) — ALL notes (private + public) for editing
 *   - usePortal(portal_slug) — public preview payload (private notes filtered)
 *   - useCreateNote / useUpdateNote / useDeleteNote — mutations
 *
 * Sacred: no AI/engine code touched. Pure CRUD + presentation.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Link2,
  Loader2,
  Send,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Languages,
  MessageCircle,
  Share2,
  Sparkles,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import { CrmShell } from "../../../_components/CrmShell";
import {
  useClient,
  useClientNotes,
  useClientAiDrafts,
  useCreateNote,
  useDeleteNote,
  usePortal,
  type AiDraft,
  type NotePublic,
} from "@/lib/api/hooks";
import { useIsMobile } from "@/hooks/useIsMobile";
import { theme } from "@/lib/theme";

export default function ClientPortalAdminPage() {
  const params = useParams();
  const clientId = (params?.id as string) ?? "";
  const isMobile = useIsMobile();

  const { data: client, isLoading: clientLoading } = useClient(clientId);
  const { data: notes, isLoading: notesLoading } = useClientNotes(clientId);

  if (clientLoading || !client) {
    return (
      <CrmShell pageTitle="Loading…">
        <Centered>
          <Loader2
            size={16}
            style={{ animation: "spin 1s linear infinite", marginRight: 8, verticalAlign: "middle" }}
          />
          Loading client portal…
        </Centered>
      </CrmShell>
    );
  }

  const portalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/c/${client.portal_slug}`
      : `/c/${client.portal_slug}`;

  // Mobile: keep the page title short (just "Portal") — the client
  // name + birth details appear in the PortalPreview card below.
  // Cramming "bablu — Portal" into the mobile top bar produced the
  // line-break + collision the user screenshotted.
  // Mobile primary action: copy URL via the gold FAB.
  return (
    <CrmShell
      pageTitle={isMobile ? "Portal" : `${client.name} — Portal`}
      pageActions={!isMobile ? <CopyUrlButton url={portalUrl} /> : null}
      mobilePrimaryAction={{
        label: "Copy portal URL",
        icon: <Share2 size={20} />,
        onClick: async () => {
          try {
            // Prefer native share sheet on mobile if available
            // (better UX — astrologer can share to WhatsApp directly).
            if (
              typeof navigator !== "undefined" &&
              typeof (navigator as Navigator & {
                share?: (d: ShareData) => Promise<void>;
              }).share === "function"
            ) {
              await (
                navigator as Navigator & {
                  share: (d: ShareData) => Promise<void>;
                }
              ).share({
                title: `${client.name} — DevAstroAI portal`,
                text: `Your private chart portal from your KP astrologer`,
                url: portalUrl,
              });
              return;
            }
            await navigator.clipboard.writeText(portalUrl);
            window.alert("Portal URL copied to clipboard.");
          } catch {
            window.prompt("Copy this URL:", portalUrl);
          }
        },
      }}
    >
      {/* Mobile-only: client name banner since the page title is just "Portal" */}
      {isMobile && (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            background: "rgba(201,169,110,0.06)",
            border: "1px solid rgba(201,169,110,0.18)",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "#c9a96e",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            Portal for
          </div>
          <div
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 22,
              color: theme.text.primary,
              lineHeight: 1.15,
            }}
          >
            {client.name}
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 360px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* ─── LEFT (or top on mobile): composer + AI drafts + notes ─── */}
        <div>
          <ComposerPanel clientId={clientId} />
          <AiDraftsLane
            clientId={clientId}
            existingNotes={notes?.items ?? []}
          />
          <NotesList
            clientId={clientId}
            notes={notes?.items ?? []}
            loading={notesLoading}
          />
        </div>

        {/* ─── RIGHT (or bottom on mobile): portal preview ─── */}
        <PortalPreview
          portalSlug={client.portal_slug}
          portalUrl={portalUrl}
          isMobile={isMobile}
        />
      </div>
    </CrmShell>
  );
}

// ─── AI drafts lane (Project arch — 2026-06-02) ──────────────────────
//
// Reads every Q&A the astrologer has asked in the Analysis tab for
// this client and renders them as draft candidates the astrologer can
// promote into curated client_notes. Source of truth stays in
// chart_session.analysis_messages — we DON'T copy data into a notes
// table when AI fires. Promotion = explicit, manual, audit-trailed.
//
// Each draft has three actions:
//   • Make public  — one-tap promote: create public note with full
//                    answer text, source='ai_draft'
//   • Edit & publish — pre-fill the composer with the answer text so
//                      the astrologer can trim/translate before publishing
//   • Dismiss      — hide locally (per-device, localStorage). The
//                    underlying analysis_messages row is NEVER touched.
//
// Drafts that have already been promoted (we detect by substring
// match of the answer text inside any existing note) get a green
// "Published" badge instead of action buttons, so the astrologer
// doesn't double-publish.

function AiDraftsLane({
  clientId,
  existingNotes,
}: {
  clientId: string;
  existingNotes: NotePublic[];
}) {
  const { data, isLoading, isError } = useClientAiDrafts(clientId);
  const createNote = useCreateNote(clientId);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(
        `devastroai:dismissed-ai-drafts:${clientId}`,
      );
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });

  function persistDismissed(next: Set<string>) {
    setDismissed(new Set(next));
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          `devastroai:dismissed-ai-drafts:${clientId}`,
          JSON.stringify(Array.from(next)),
        );
      } catch {
        /* localStorage full / disabled — silent fallback to in-memory */
      }
    }
  }

  /**
   * Build a quick lookup of already-promoted drafts. Match by the
   * first 80 chars of the draft's answer being a substring of any
   * existing note text — good enough for v1 (collision risk is
   * negligible given answer length). A future migration could add a
   * `promoted_from_key` column on client_notes for exact matching.
   */
  const promotedKeys = useMemo(() => {
    const set = new Set<string>();
    if (!data) return set;
    for (const draft of data.items) {
      const needle = draft.answer.slice(0, 80).trim();
      if (!needle) continue;
      if (existingNotes.some((n) => n.text.includes(needle))) {
        set.add(draft.key);
      }
    }
    return set;
  }, [data, existingNotes]);

  if (isLoading) {
    return null; // silent — don't show empty loader (lane is opt-in info)
  }
  if (isError || !data || data.items.length === 0) {
    // No AI history for this client yet. Show a single hint card so
    // the astrologer KNOWS this lane exists (without it, the feature
    // is invisible until they happen to use AI for this client).
    return (
      <section
        style={{
          padding: 14,
          background: "rgba(0,200,255,0.04)",
          border: "1px dashed rgba(0,200,255,0.22)",
          borderRadius: 10,
          marginBottom: 20,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <Sparkles
          size={16}
          style={{ color: "#00C8FF", flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ fontSize: 12, color: theme.text.muted, lineHeight: 1.55 }}>
          <strong style={{ color: theme.text.primary, fontWeight: 600 }}>
            AI drafts will appear here.
          </strong>{" "}
          When you ask questions in the Analysis tab for this client, each
          Q&amp;A becomes a draft you can publish (or edit then publish) as
          a portal note — without retyping.
        </div>
      </section>
    );
  }

  const visible = data.items.filter((d) => !dismissed.has(d.key));

  return (
    <section style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <Sparkles size={13} style={{ color: "#00C8FF" }} />
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#00C8FF",
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          AI drafts ({visible.length})
        </div>
        <div
          style={{
            fontSize: 10,
            color: theme.text.muted,
            fontStyle: "italic",
          }}
        >
          · from your Analysis Q&amp;A — promote to public, or edit first
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map((draft) => (
          <AiDraftCard
            key={draft.key}
            draft={draft}
            promoted={promotedKeys.has(draft.key)}
            publishing={createNote.isPending}
            onMakePublic={async () => {
              await createNote.mutateAsync({
                text: draft.answer,
                note_type: draft.is_topic ? "observation" : "reading",
                is_private: false,
                source: "ai_draft",
                // language defaults to 'en' on backend; analysis answers
                // are English-language by default
              });
            }}
            onEditAndPublish={() => {
              // Pre-fill the composer textarea via custom event.
              // ComposerPanel listens and populates its text + flips
              // is_private off. Keeps the AiDraftsLane decoupled from
              // ComposerPanel internal state.
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("portal-prefill-composer", {
                    detail: {
                      text: draft.answer,
                      isPrivate: false,
                      noteType: draft.is_topic ? "observation" : "reading",
                      source: "ai_draft",
                    },
                  }),
                );
                // Scroll the page to top so the composer is in view.
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            onDismiss={() => {
              const next = new Set(dismissed);
              next.add(draft.key);
              persistDismissed(next);
            }}
          />
        ))}
        {visible.length === 0 && dismissed.size > 0 && (
          <button
            type="button"
            onClick={() => persistDismissed(new Set())}
            style={{
              padding: "8px 12px",
              fontSize: 11,
              color: theme.text.muted,
              background: "transparent",
              border: "1px dashed rgba(255,255,255,0.1)",
              borderRadius: 8,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Restore {dismissed.size} dismissed draft
            {dismissed.size === 1 ? "" : "s"}
          </button>
        )}
      </div>
    </section>
  );
}

function AiDraftCard({
  draft,
  promoted,
  publishing,
  onMakePublic,
  onEditAndPublish,
  onDismiss,
}: {
  draft: AiDraft;
  promoted: boolean;
  publishing: boolean;
  onMakePublic: () => Promise<void> | void;
  onEditAndPublish: () => void;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const answerPreview =
    !expanded && draft.answer.length > 260
      ? draft.answer.slice(0, 260) + "…"
      : draft.answer;

  return (
    <article
      style={{
        padding: 12,
        background: "rgba(0,200,255,0.03)",
        border: "1px solid rgba(0,200,255,0.18)",
        borderRadius: 10,
        position: "relative",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
          fontSize: 10,
          color: theme.text.muted,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "#00C8FF",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          <Sparkles size={10} /> AI draft
        </span>
        {draft.is_topic && (
          <span
            style={{
              padding: "1px 6px",
              borderRadius: 4,
              background: "rgba(201,169,110,0.1)",
              color: "#c9a96e",
              fontSize: 9,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Topic
          </span>
        )}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          <Calendar size={10} />
          {new Date(draft.approx_created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
        {promoted && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "1px 6px",
              borderRadius: 4,
              background: "rgba(52,211,153,0.12)",
              color: "#34d399",
              fontSize: 9,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            <CheckCircle2 size={10} />
            Published
          </span>
        )}
      </header>

      {/* Question — italic, muted */}
      <div
        style={{
          fontSize: 12,
          color: theme.text.muted,
          fontStyle: "italic",
          marginBottom: 6,
          lineHeight: 1.4,
        }}
      >
        Q: {draft.question}
      </div>

      {/* Answer */}
      <div
        style={{
          fontSize: 13,
          color: theme.text.primary,
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          marginBottom: 10,
        }}
      >
        {answerPreview}
        {draft.answer.length > 260 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              marginLeft: 6,
              fontSize: 11,
              color: "#c9a96e",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      {/* Actions — only when not already promoted */}
      {!promoted && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={onMakePublic}
            disabled={publishing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              background: publishing
                ? "rgba(52,211,153,0.3)"
                : "linear-gradient(180deg, #34d399 0%, #1aa371 100%)",
              border: "none",
              borderRadius: 6,
              color: "#0a1a12",
              fontSize: 11,
              fontWeight: 600,
              cursor: publishing ? "not-allowed" : "pointer",
            }}
          >
            <CheckCircle2 size={11} />
            Make public
          </button>
          <button
            type="button"
            onClick={onEditAndPublish}
            disabled={publishing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              background: "rgba(201,169,110,0.1)",
              border: "1px solid rgba(201,169,110,0.35)",
              borderRadius: 6,
              color: "#c9a96e",
              fontSize: 11,
              fontWeight: 600,
              cursor: publishing ? "not-allowed" : "pointer",
            }}
          >
            <Edit3 size={11} />
            Edit &amp; publish
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss this draft"
            title="Hide locally — the underlying AI Q&A in your history is unchanged"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 8px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              color: theme.text.muted,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </article>
  );
}

// ─── Composer panel ──────────────────────────────────────────────────

function ComposerPanel({ clientId }: { clientId: string }) {
  const [text, setText] = useState("");
  const [noteType, setNoteType] = useState<
    "reading" | "prediction" | "follow_up" | "observation"
  >("reading");
  const [language, setLanguage] = useState<"en" | "te" | "te_en">("en");
  const [isPrivate, setIsPrivate] = useState(false);
  // Set to "ai_draft" only after AiDraftsLane prefills the textarea via
  // the portal-prefill-composer event. Reverts to "astrologer" on the
  // next manual keystroke (we treat any edit as authorship change).
  // Phase 2 polish (2026-06-02) for source provenance.
  const [pendingSource, setPendingSource] = useState<
    "astrologer" | "ai_draft"
  >("astrologer");

  const createNote = useCreateNote(clientId);

  // Listen for "Edit & publish" clicks from the AI drafts lane.
  // The lane dispatches a CustomEvent with the prefill payload;
  // we populate state. Decoupled to avoid lifting state to parent.
  useEffect(() => {
    type PrefillDetail = {
      text: string;
      isPrivate?: boolean;
      noteType?: "reading" | "prediction" | "follow_up" | "observation";
      source?: "astrologer" | "ai_draft";
    };
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PrefillDetail>).detail;
      if (!detail) return;
      setText(detail.text ?? "");
      if (typeof detail.isPrivate === "boolean") setIsPrivate(detail.isPrivate);
      if (detail.noteType) setNoteType(detail.noteType);
      setPendingSource(detail.source ?? "astrologer");
    };
    window.addEventListener("portal-prefill-composer", handler);
    return () => window.removeEventListener("portal-prefill-composer", handler);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await createNote.mutateAsync({
      text: text.trim(),
      note_type: noteType,
      language,
      is_private: isPrivate,
      source: pendingSource,
    });
    setText("");
    // Reset provenance — next free-form note from this composer is
    // again astrologer-authored unless another prefill event fires.
    setPendingSource("astrologer");
  }

  return (
    <section
      style={{
        padding: 18,
        background: "rgba(7,11,20,0.5)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: theme.text.muted,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 12,
        }}
      >
        Add a note
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Reading notes, predictions, observations… Telugu OK."
          rows={4}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "rgba(9,9,15,0.7)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 7,
            color: theme.text.primary,
            fontSize: 13,
            fontFamily:
              language === "te" || language === "te_en"
                ? "'Noto Sans Telugu', 'DM Sans', sans-serif"
                : "'DM Sans', sans-serif",
            resize: "vertical",
            boxSizing: "border-box",
            outline: "none",
          }}
        />

        {/* Controls row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
            flexWrap: "wrap",
          }}
        >
          {/* Note type */}
          <select
            value={noteType}
            onChange={(e) =>
              setNoteType(e.target.value as typeof noteType)
            }
            style={selectStyle}
            title="Note type"
          >
            <option value="reading">Reading</option>
            <option value="prediction">Prediction</option>
            <option value="follow_up">Follow-up</option>
            <option value="observation">Observation</option>
          </select>

          {/* Language */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as typeof language)}
            style={selectStyle}
            title="Language"
          >
            <option value="en">English</option>
            <option value="te">తెలుగు</option>
            <option value="te_en">Telugu + English</option>
          </select>

          {/* Private toggle */}
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            title={
              isPrivate
                ? "Private — only you see this note"
                : "Public — visible on client portal"
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              height: 30,
              background: isPrivate
                ? "rgba(248,113,113,0.10)"
                : "rgba(52,211,153,0.10)",
              border: isPrivate
                ? "1px solid rgba(248,113,113,0.3)"
                : "1px solid rgba(52,211,153,0.3)",
              borderRadius: 6,
              color: isPrivate ? "#f87171" : "#34d399",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {isPrivate ? <EyeOff size={11} /> : <Eye size={11} />}
            {isPrivate ? "Private" : "Public"}
          </button>

          <div style={{ flex: 1 }} />

          {/* Submit */}
          <button
            type="submit"
            disabled={!text.trim() || createNote.isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              height: 30,
              background:
                !text.trim() || createNote.isPending
                  ? "rgba(201,169,110,0.4)"
                  : "linear-gradient(180deg, #c9a96e 0%, #b8985d 100%)",
              color: "#09090f",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor:
                !text.trim() || createNote.isPending ? "not-allowed" : "pointer",
            }}
          >
            {createNote.isPending ? (
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Send size={12} />
            )}
            Add note
          </button>
        </div>

        {createNote.isError && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "#f87171",
            }}
          >
            Couldn't save the note. Try again.
          </div>
        )}
      </form>
    </section>
  );
}

const selectStyle: React.CSSProperties = {
  height: 30,
  padding: "0 8px",
  background: "rgba(9,9,15,0.7)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  color: theme.text.primary,
  fontSize: 11,
  cursor: "pointer",
  fontFamily: "inherit",
};

// ─── Notes list ──────────────────────────────────────────────────────

function NotesList({
  clientId,
  notes,
  loading,
}: {
  clientId: string;
  notes: NotePublic[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <Centered>
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
      </Centered>
    );
  }

  if (notes.length === 0) {
    return (
      <Centered>
        No notes yet. Add the first one above ↑
      </Centered>
    );
  }

  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: theme.text.muted,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 8,
        }}
      >
        All notes ({notes.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {notes.map((n) => (
          <NoteRow key={n.id} note={n} clientId={clientId} />
        ))}
      </div>
    </div>
  );
}

function NoteRow({ note, clientId }: { note: NotePublic; clientId: string }) {
  const deleteNote = useDeleteNote(clientId);
  const dateStr = new Date(note.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function handleDelete() {
    if (!window.confirm("Delete this note?")) return;
    await deleteNote.mutateAsync(note.id);
  }

  return (
    <article
      style={{
        padding: 12,
        background: "rgba(7,11,20,0.5)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          fontSize: 10,
          color: theme.text.muted,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            color:
              note.note_type === "prediction"
                ? "#00C8FF"
                : note.note_type === "follow_up"
                ? "#fbbf24"
                : note.note_type === "observation"
                ? "#a78bfa"
                : "#c9a96e",
          }}
        >
          {note.note_type.replace("_", " ")}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          <Calendar size={10} />
          {dateStr}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          <Languages size={10} />
          {note.language.toUpperCase()}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            color: note.is_private ? "#f87171" : "#34d399",
            fontWeight: 500,
          }}
        >
          {note.is_private ? <EyeOff size={10} /> : <Eye size={10} />}
          {note.is_private ? "Private" : "Public"}
        </span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Delete note"
          style={{
            background: "transparent",
            border: "none",
            color: theme.text.muted,
            cursor: "pointer",
            padding: 4,
            borderRadius: 4,
          }}
        >
          <Trash2 size={12} />
        </button>
      </header>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: theme.text.primary,
          whiteSpace: "pre-wrap",
          fontFamily:
            note.language === "te" || note.language === "te_en"
              ? "'Noto Sans Telugu', 'DM Sans', sans-serif"
              : "'DM Sans', sans-serif",
        }}
      >
        {note.text}
      </div>
    </article>
  );
}

// ─── Portal preview panel ────────────────────────────────────────────

function PortalPreview({
  portalSlug,
  portalUrl,
  isMobile = false,
}: {
  portalSlug: string;
  portalUrl: string;
  isMobile?: boolean;
}) {
  const { data, isLoading } = usePortal(portalSlug);

  return (
    <aside
      style={{
        // Sticky preview on desktop only — on mobile it follows
        // normal flow below the composer + notes list.
        position: isMobile ? "static" : "sticky",
        top: isMobile ? undefined : 20,
        padding: 16,
        background: "rgba(7,11,20,0.5)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: theme.text.muted,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          Client sees this
        </div>
        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11,
            color: "#c9a96e",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Link2 size={10} />
          Open
        </a>
      </div>

      {isLoading ? (
        <div style={{ fontSize: 11, color: theme.text.muted, padding: 20, textAlign: "center" }}>
          Loading preview…
        </div>
      ) : !data ? (
        <div style={{ fontSize: 11, color: "#f87171", padding: 20, textAlign: "center" }}>
          Couldn't load preview.
        </div>
      ) : (
        <PreviewBody data={data} />
      )}

      {/* WhatsApp consult-back hint */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: 11,
          color: theme.text.muted,
          lineHeight: 1.55,
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#25D366", fontWeight: 500, marginBottom: 4 }}>
          <MessageCircle size={11} /> WhatsApp consult-back
        </div>
        {data?.astrologer.whatsapp_consult_url ? (
          "Client can tap the WhatsApp button to message you directly."
        ) : (
          <>
            Add your phone number on the <a href="/app/profile" style={{ color: "#c9a96e", textDecoration: "underline" }}>Profile page</a> to enable WhatsApp consult-back.
          </>
        )}
      </div>
    </aside>
  );
}

function PreviewBody({
  data,
}: {
  data: NonNullable<ReturnType<typeof usePortal>["data"]>;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 16,
          color: theme.text.primary,
          marginBottom: 2,
        }}
      >
        {data.client_name}
      </div>
      {data.client_birth_date && (
        <div style={{ fontSize: 10, color: theme.text.muted, marginBottom: 12 }}>
          {data.client_birth_date} · {data.client_birth_time ?? ""} · {data.client_birth_place ?? ""}
        </div>
      )}

      {data.snapshot && (data.snapshot.lagna_en || data.snapshot.moon_sign_en) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {data.snapshot.lagna_en && (
            <MiniStat label="Lagna" value={data.snapshot.lagna_en} />
          )}
          {data.snapshot.moon_sign_en && (
            <MiniStat label="Moon" value={data.snapshot.moon_sign_en} />
          )}
          {data.snapshot.sun_sign_en && (
            <MiniStat label="Sun" value={data.snapshot.sun_sign_en} />
          )}
          {data.snapshot.current_mahadasha_lord && (
            <MiniStat label="MD" value={data.snapshot.current_mahadasha_lord} />
          )}
        </div>
      )}

      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: theme.text.muted,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 6,
        }}
      >
        Public notes ({data.notes.length})
      </div>
      {data.notes.length === 0 ? (
        <div style={{ fontSize: 11, color: theme.text.muted, fontStyle: "italic" }}>
          No public notes yet. Add a non-private note to share with the
          client.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {data.notes.slice(0, 3).map((n, i) => (
            <div
              key={i}
              style={{
                padding: 8,
                background: "rgba(22,22,31,0.6)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 6,
                fontSize: 11,
                lineHeight: 1.5,
                color: theme.text.primary,
                fontFamily:
                  n.language === "te" || n.language === "te_en"
                    ? "'Noto Sans Telugu', 'DM Sans', sans-serif"
                    : "'DM Sans', sans-serif",
              }}
            >
              {n.text.length > 100 ? n.text.slice(0, 100) + "…" : n.text}
            </div>
          ))}
          {data.notes.length > 3 && (
            <div style={{ fontSize: 10, color: theme.text.muted, textAlign: "center" }}>
              + {data.notes.length - 3} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 6,
        background: "rgba(22,22,31,0.6)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 5,
      }}
    >
      <div
        style={{
          fontSize: 8,
          fontWeight: 600,
          color: theme.text.muted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 12, color: theme.text.primary, fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (insecure context, permissions).
      // Fallback: prompt the user with the URL.
      window.prompt("Copy this URL:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        background: copied
          ? "rgba(52,211,153,0.15)"
          : "linear-gradient(180deg, #c9a96e 0%, #b8985d 100%)",
        color: copied ? "#34d399" : "#09090f",
        border: copied ? "1px solid rgba(52,211,153,0.4)" : "none",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      <Link2 size={12} />
      {copied ? "Copied!" : "Copy portal URL"}
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 30,
        textAlign: "center",
        fontSize: 12,
        color: theme.text.muted,
      }}
    >
      {children}
    </div>
  );
}
