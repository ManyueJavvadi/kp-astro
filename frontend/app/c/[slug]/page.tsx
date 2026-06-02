"use client";

/**
 * /c/[slug] — PUBLIC client portal page.
 *
 * Phase 3 Slice 2 (2026-06-02). The page a client opens on their
 * phone after the astrologer shares the URL via WhatsApp. No auth
 * required — the URL itself is the access token (UUID v4).
 *
 * Layout (single-column, mobile-first):
 *   1. Header — astrologer's name (hero), "Reading prepared by…"
 *   2. Client identity card — your name + birth details
 *   3. KP snapshot — Lagna / Moon / Sun / current MD-AD
 *      (Simplified, not the full chart. Per spec Q1 recommendation.)
 *   4. Notes timeline — astrologer's notes, newest first
 *   5. Consult-back WhatsApp button (sticky bottom on mobile)
 *   6. "Powered by DevAstroAI" footer (subtle, viral loop)
 *
 * What this page does NOT have:
 *   - Login / signup chrome (client doesn't have an account)
 *   - Sidebar / nav (single-purpose page)
 *   - Chart visualization (no RasiChart — simplified snapshot only)
 *   - Edit affordances (read-only by definition)
 *
 * Implementation note:
 *   Currently client-side rendered via TanStack usePortal hook.
 *   Phase 3 Slice 4 polish: consider SSR for first-paint speed +
 *   Schema.org markup. Not blocking the slice.
 */

import { useParams } from "next/navigation";
import { MapPin, Sparkles, MessageCircle, Calendar, Award } from "lucide-react";
import { usePortal, type PortalNote } from "@/lib/api/hooks";
import { theme } from "@/lib/theme";

export default function PublicPortalPage() {
  const params = useParams();
  const slug = (params?.slug as string) ?? "";
  const { data, isLoading, isError, error } = usePortal(slug);

  if (isLoading) {
    return (
      <PortalShell>
        <CenteredHint>Opening your reading…</CenteredHint>
      </PortalShell>
    );
  }

  if (isError) {
    // 404 = "portal_not_found" → show a clean "link not found" state.
    // Other errors → generic. Don't expose the error message verbatim
    // (could leak internal details).
    const status = (error as { status?: number } | null)?.status;
    return (
      <PortalShell>
        <CenteredHint>
          {status === 404 ? (
            <>
              <strong>This portal link isn't valid.</strong>
              <br />
              Please check with your astrologer for an updated link.
            </>
          ) : (
            <>
              <strong>Couldn't load this reading.</strong>
              <br />
              Please check your connection and refresh.
            </>
          )}
        </CenteredHint>
      </PortalShell>
    );
  }

  if (!data) {
    return null;
  }

  const { client_name, snapshot, notes, astrologer } = data;
  const astroDisplay = astrologer.display_name || "Your astrologer";

  return (
    <PortalShell>
      {/* ─── Hero — astrologer-first per spec Q7 ─── */}
      <header
        style={{
          textAlign: "center",
          padding: "32px 24px 20px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            borderRadius: 999,
            background: "rgba(201,169,110,0.08)",
            border: "1px solid rgba(201,169,110,0.2)",
            color: "#c9a96e",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          <Sparkles size={10} />
          Reading prepared by
        </div>
        <h1
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(1.8rem, 6vw, 2.5rem)",
            lineHeight: 1.15,
            margin: 0,
            color: theme.text.primary,
          }}
        >
          {astroDisplay}
        </h1>
        {(astrologer.years_practicing || astrologer.is_verified) && (
          <div
            style={{
              fontSize: 12,
              color: theme.text.muted,
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {astrologer.years_practicing && (
              <span>{astrologer.years_practicing}+ years of practice</span>
            )}
            {astrologer.is_verified && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Award size={12} color="#c9a96e" /> Verified astrologer
              </span>
            )}
          </div>
        )}
      </header>

      {/* ─── Client identity card ─── */}
      <Card>
        <CardEyebrow>For</CardEyebrow>
        <div
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 24,
            color: theme.text.primary,
            marginBottom: 10,
          }}
        >
          {client_name}
        </div>
        <BirthLine data={data} />
      </Card>

      {/* ─── Simplified KP snapshot ─── */}
      {snapshot && (
        <Card>
          <CardEyebrow>Your KP snapshot</CardEyebrow>
          <SnapshotGrid snapshot={snapshot} />
        </Card>
      )}

      {/* ─── Notes timeline ─── */}
      <section style={{ padding: "0 16px 100px" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: theme.text.muted,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginBottom: 12,
            padding: "12px 4px 0",
          }}
        >
          Reading notes ({notes.length})
        </div>

        {notes.length === 0 ? (
          <Card>
            <div
              style={{
                fontSize: 13,
                color: theme.text.muted,
                lineHeight: 1.6,
                textAlign: "center",
                padding: 20,
              }}
            >
              Your astrologer hasn't added any notes yet.
              <br />
              Notes will appear here after your consultation.
            </div>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notes.map((n, idx) => (
              <NoteCard key={idx} note={n} />
            ))}
          </div>
        )}
      </section>

      {/* ─── Sticky consult-back CTA ─── */}
      {astrologer.whatsapp_consult_url && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
            background: "linear-gradient(to top, rgba(9,9,15,1) 0%, rgba(9,9,15,0.95) 80%, transparent 100%)",
            display: "flex",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <a
            href={astrologer.whatsapp_consult_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              maxWidth: 420,
              height: 48,
              borderRadius: 10,
              background: "linear-gradient(180deg, #25D366 0%, #128C7E 100%)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(37,211,102,0.3)",
            }}
          >
            <MessageCircle size={16} />
            Consult back on WhatsApp
          </a>
        </div>
      )}

      {/* ─── Footer (viral loop) ─── */}
      <footer
        style={{
          textAlign: "center",
          padding: "40px 16px 120px",
          fontSize: 11,
          color: theme.text.muted,
        }}
      >
        <a
          href="https://devastroai.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: theme.text.muted,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          Powered by <span style={{ color: "#c9a96e", fontWeight: 600 }}>DevAstroAI</span>
        </a>
        <div style={{ marginTop: 6, fontSize: 10, opacity: 0.6 }}>
          KP astrology, modernized for practising astrologers.
        </div>
      </footer>
    </PortalShell>
  );
}

// ─── Layout primitives ───────────────────────────────────────────────

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg.page,
        color: theme.text.primary,
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{
        margin: "0 16px 14px",
        padding: 18,
        background: "rgba(22,22,31,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
      }}
    >
      {children}
    </section>
  );
}

function CardEyebrow({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  );
}

function CenteredHint({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: theme.text.muted,
          textAlign: "center",
          maxWidth: 320,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function BirthLine({
  data,
}: {
  data: {
    client_birth_date: string | null;
    client_birth_time: string | null;
    client_birth_place: string | null;
    client_gender: string | null;
  };
}) {
  const bits: React.ReactNode[] = [];
  if (data.client_birth_date) {
    bits.push(<span key="d">{formatDate(data.client_birth_date)}</span>);
  }
  if (data.client_birth_time) {
    bits.push(<span key="t">{data.client_birth_time}</span>);
  }
  if (data.client_birth_place) {
    bits.push(
      <span key="p" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        <MapPin size={11} /> {data.client_birth_place}
      </span>,
    );
  }
  if (data.client_gender) {
    bits.push(
      <span key="g" style={{ opacity: 0.7 }}>
        {data.client_gender === "male" ? "♂ Male" : data.client_gender === "female" ? "♀ Female" : data.client_gender}
      </span>,
    );
  }
  if (bits.length === 0) return null;
  return (
    <div
      style={{
        fontSize: 12,
        color: theme.text.muted,
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      {bits}
    </div>
  );
}

function formatDate(s: string): string {
  let d: Date | null = null;
  if (s.includes("-")) {
    d = new Date(s);
  } else if (s.includes("/")) {
    const [dd, mm, yyyy] = s.split("/");
    if (yyyy && mm && dd) {
      d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }
  }
  if (!d || isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function SnapshotGrid({
  snapshot,
}: {
  snapshot: {
    lagna_en: string | null;
    moon_sign_en: string | null;
    moon_nakshatra_en: string | null;
    sun_sign_en: string | null;
    current_mahadasha_lord: string | null;
    current_antardasha_lord: string | null;
    current_mahadasha_period_end: string | null;
  };
}) {
  // Items only rendered if they exist
  const items: Array<{ label: string; value: string; sub?: string }> = [];
  if (snapshot.lagna_en) {
    items.push({ label: "Ascendant", value: snapshot.lagna_en });
  }
  if (snapshot.moon_sign_en) {
    items.push({
      label: "Moon sign",
      value: snapshot.moon_sign_en,
      sub: snapshot.moon_nakshatra_en ?? undefined,
    });
  }
  if (snapshot.sun_sign_en) {
    items.push({ label: "Sun sign", value: snapshot.sun_sign_en });
  }
  if (snapshot.current_mahadasha_lord) {
    items.push({
      label: "Current major period",
      value: snapshot.current_mahadasha_lord,
      sub: snapshot.current_antardasha_lord
        ? `+ ${snapshot.current_antardasha_lord} (sub)`
        : undefined,
    });
  }

  if (items.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 10,
      }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            padding: 10,
            background: "rgba(7,11,20,0.5)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: theme.text.muted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 3,
            }}
          >
            {it.label}
          </div>
          <div
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 16,
              color: theme.text.primary,
            }}
          >
            {it.value}
          </div>
          {it.sub && (
            <div
              style={{
                fontSize: 10,
                color: theme.text.muted,
                marginTop: 2,
              }}
            >
              {it.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function NoteCard({ note }: { note: PortalNote }) {
  const date = new Date(note.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  // Note type → display label + accent
  const typeMeta: Record<string, { label: string; accent: string }> = {
    reading: { label: "Reading", accent: "#c9a96e" },
    prediction: { label: "Prediction", accent: "#00C8FF" },
    follow_up: { label: "Follow-up", accent: "#fbbf24" },
    observation: { label: "Observation", accent: "#a78bfa" },
  };
  const meta = typeMeta[note.note_type] || { label: note.note_type, accent: theme.text.muted };

  return (
    <article
      style={{
        padding: 14,
        background: "rgba(22,22,31,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: meta.accent,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          {meta.label}
        </span>
        <span
          style={{
            fontSize: 10,
            color: theme.text.muted,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Calendar size={10} />
          {date}
        </span>
      </div>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.65,
          color: theme.text.primary,
          whiteSpace: "pre-wrap",
          // Telugu rendering — Noto Sans Telugu font loaded at root layout
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
