"use client";

/**
 * /app/profile — astrologer profile editor.
 *
 * Phase 2 Slice 3 (2026-06-02). Minimal stub: read current /me +
 * allow editing display_name, bio, phone, default_language.
 * Slice 7 will polish it (photo upload, years_practicing, etc.)
 *
 * Why ship this now instead of waiting for Slice 7:
 *   - Sidebar nav has a Profile link; it shouldn't 404
 *   - The /me PATCH endpoint already exists from Phase 1
 *   - Read+save flow proves out the TanStack mutation pattern
 *     for the rest of the slices
 */

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { CrmShell } from "../_components/CrmShell";
import { useMe, useUpdateMe } from "@/lib/api/hooks";
import { theme } from "@/lib/theme";

export default function ProfilePage() {
  const { data: me, isLoading } = useMe();
  const updateMe = useUpdateMe();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState<
    "en" | "te" | "te_en"
  >("en");
  const [saved, setSaved] = useState(false);

  // Hydrate form from /me once data arrives
  useEffect(() => {
    if (!me) return;
    setDisplayName(me.display_name || "");
    setBio(me.bio || "");
    setPhone(me.phone || "");
    setDefaultLanguage(
      (me.default_language as "en" | "te" | "te_en") || "en",
    );
  }, [me]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    await updateMe.mutateAsync({
      display_name: displayName,
      bio,
      phone,
      default_language: defaultLanguage,
    });
    setSaved(true);
    // Hide the success indicator after 2s
    setTimeout(() => setSaved(false), 2000);
  }

  if (isLoading || !me) {
    return (
      <CrmShell pageTitle="Profile">
        <div
          style={{
            padding: 40,
            textAlign: "center",
            fontSize: 13,
            color: theme.text.muted,
          }}
        >
          <Loader2
            size={16}
            style={{
              animation: "spin 1s linear infinite",
              display: "inline-block",
              marginRight: 8,
              verticalAlign: "middle",
            }}
          />
          Loading profile…
        </div>
      </CrmShell>
    );
  }

  return (
    <CrmShell pageTitle="Profile">
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 560,
          background: "rgba(7,11,20,0.5)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          padding: 24,
        }}
      >
        {/* Email — read-only (managed by Supabase Auth) */}
        <FormRow label="Email" hint="Managed via Supabase Auth — cannot be changed here.">
          <input
            type="email"
            value={me.email}
            disabled
            style={{
              ...inputStyle,
              cursor: "not-allowed",
              color: theme.text.muted,
            }}
          />
        </FormRow>

        <FormRow label="Display name" hint="Shown on client portal pages + AI Companion sidebar.">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Manyue Javvadi"
            style={inputStyle}
          />
        </FormRow>

        <FormRow label="Bio" hint="Short paragraph shown on your astrologer profile (future feature).">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="20 years of KP practice. Specializing in marriage compatibility…"
            rows={4}
            style={{ ...inputStyle, height: "auto", padding: "8px 12px", resize: "vertical" }}
          />
        </FormRow>

        <FormRow label="Phone" hint="E.164 format (e.g., +919876543210). Used for WhatsApp client portal consult-back link.">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91…"
            style={inputStyle}
          />
        </FormRow>

        <FormRow label="Default language" hint="UI default; per-tab toggle still available.">
          <select
            value={defaultLanguage}
            onChange={(e) =>
              setDefaultLanguage(e.target.value as "en" | "te" | "te_en")
            }
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="en">English</option>
            <option value="te_en">Telugu + English</option>
            <option value="te">Telugu</option>
          </select>
        </FormRow>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 20,
          }}
        >
          <button
            type="submit"
            disabled={updateMe.isPending}
            style={{
              padding: "10px 18px",
              background: updateMe.isPending
                ? "rgba(201,169,110,0.4)"
                : "linear-gradient(180deg, #c9a96e 0%, #b8985d 100%)",
              color: "#09090f",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: updateMe.isPending ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {updateMe.isPending && (
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            )}
            Save changes
          </button>
          {saved && (
            <span style={{ fontSize: 12, color: "#34d399" }}>✓ Saved</span>
          )}
          {updateMe.isError && (
            <span style={{ fontSize: 12, color: "#f87171" }}>
              Save failed — try again.
            </span>
          )}
        </div>
      </form>
    </CrmShell>
  );
}

function FormRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 10,
          fontWeight: 600,
          color: theme.text.muted,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <div
          style={{
            fontSize: 11,
            color: theme.text.muted,
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  background: "rgba(9,9,15,0.7)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 7,
  color: theme.text.primary,
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
