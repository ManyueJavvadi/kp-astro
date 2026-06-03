"use client";

/**
 * AddClientModal — form for creating a new client.
 *
 * Phase 2 Slice 3 (2026-06-02), mobile redesign 2026-06-02b.
 *
 * Desktop: centered modal (520px max width, 90vh max height, blurred backdrop).
 * Mobile: bottom sheet (92vh, drag-to-dismiss handle, swipe-down close,
 *         safe-area padding for iPhone notch). Matches the CommandOrb /
 *         HousePanel sheet pattern documented in CLAUDE.md.
 *
 * Flow on submit:
 *   1. POST /clients   — create client row (only the metadata)
 *   2. POST /astrologer/workspace  — compute chart from birth details
 *   3. POST /chart-sessions  — persist the computed workspace_data
 *      tied to the new client_id
 *   4. Callback onCreated(client, chartSession) — parent decides nav
 *      (CRM home navigates to that client's workspace)
 *
 * If steps 2 or 3 fail, the client row still exists (which is OK —
 * astrologer can retry chart computation later from the client's
 * page). Errors surface inline.
 *
 * Form fields:
 *   - Name (required)
 *   - Date of birth (required) — DD/MM/YYYY (matches existing form)
 *   - Time of birth (required) — HH:MM AM/PM (matches existing form)
 *   - Place of birth (required) — uses PlacePicker → sets lat/lng
 *   - Gender (required) — male/female (some KP rules differ by gender)
 *   - Phone, email (optional)
 *
 * Reuses PlacePicker + masked input helpers from existing form so
 * the field behavior matches what astrologers already know.
 */

import { useState, useEffect } from "react";
import { X, Loader2, ArrowRight } from "lucide-react";
import { PlacePicker } from "@/components/ui/place-picker";
// C1 fix (2026-06-02): use transactional combined endpoint instead of
// the 3-step axios sequence (POST /clients → POST /astrologer/workspace
// → POST /chart-sessions) that produced orphan client rows on failure.
import { useCreateClientWithChart } from "@/lib/api/hooks";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSheetDrag } from "@/hooks/useSheetDrag";
import { theme } from "@/lib/theme";
import {
  formatMaskedDate,
  formatMaskedTime,
} from "../lib/maskedInput";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://devastroai.up.railway.app";

export interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful 3-step create flow. Parent navigates
   *  (typically to the new client's workspace). */
  onCreated: (clientId: string, chartSessionId: string) => void;
}

export function AddClientModal({ open, onClose, onCreated }: AddClientModalProps) {
  const isMobile = useIsMobile();
  const { dragProps, sheetStyle } = useSheetDrag({ onClose });

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [place, setPlace] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createClientWithChart = useCreateClientWithChart();

  // Reset form when modal closes (so reopening starts fresh).
  useEffect(() => {
    if (!open) {
      setName("");
      setDate("");
      setTime("");
      setAmpm("AM");
      setPlace("");
      setLatitude(null);
      setLongitude(null);
      setGender("");
      setPhone("");
      setEmail("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  // ─── Submit ───────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter the client's name.");
      return;
    }
    if (!date || date.length !== 10) {
      setError("Please enter a date of birth (DD/MM/YYYY).");
      return;
    }
    if (!time || time.length !== 5) {
      setError("Please enter a time of birth (HH:MM).");
      return;
    }
    if (!latitude || !longitude) {
      setError("Please pick a place of birth from the suggestions.");
      return;
    }
    if (!gender) {
      setError("Please select gender (Male/Female).");
      return;
    }

    setSubmitting(true);

    try {
      // C1 fix (2026-06-02): single transactional call. Backend handles
      // client INSERT + chart compute + chart_session INSERT atomically.
      // If anything fails server-side, the client row is rolled back so
      // we never get duplicate-row orphans in the CRM.
      const [dd, mm, yyyy] = date.split("/");
      const isoDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;

      let [hh, mn] = time.split(":").map((x) => parseInt(x, 10));
      if (ampm === "PM" && hh !== 12) hh += 12;
      if (ampm === "AM" && hh === 12) hh = 0;
      const time24 = `${String(hh).padStart(2, "0")}:${String(mn).padStart(2, "0")}`;

      // C7 fix: send browser-detected offset as the fallback. Backend
      // still resolves DST-correct offset from lat/lon+date itself; this
      // just covers cases where historical-DST resolution can't find a
      // match (e.g., obscure pre-1970 dates).
      const browserOffset = -new Date().getTimezoneOffset() / 60;

      const result = await createClientWithChart.mutateAsync({
        name: name.trim(),
        gender,
        birth_date: date,            // keep DD/MM/YYYY format the UI uses
        birth_time: time,            // keep HH:MM format
        birth_place_name: place,
        birth_latitude: latitude,
        birth_longitude: longitude,
        birth_timezone_offset: browserOffset,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        // Chart-compute fields the new endpoint requires
        chart_iso_date: isoDate,
        chart_time_24h: time24,
        chart_ampm: ampm,
      });

      onCreated(result.client.id, result.chart_session_id);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Couldn't create client. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Shared form body (used by both desktop modal + mobile sheet) ──
  const formBody = (
    <>
      {/* Name */}
      <Field label="Full name *" htmlFor="ac-name">
        <input
          id="ac-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          autoFocus={!isMobile /* autofocus on mobile pops keyboard immediately, hides the form */}
          style={inputStyle}
        />
      </Field>

      {/* Date + Time + AM/PM row */}
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Date of birth *" htmlFor="ac-date" hint="DD/MM/YYYY" style={{ flex: 1 }}>
          <input
            id="ac-date"
            type="text"
            value={date}
            onChange={(e) =>
              setDate(formatMaskedDate(e.target.value, date))
            }
            placeholder="DD/MM/YYYY"
            disabled={submitting}
            style={inputStyle}
            inputMode="numeric"
          />
        </Field>
        <Field label="Time *" htmlFor="ac-time" hint="HH:MM" style={{ width: 110 }}>
          <input
            id="ac-time"
            type="text"
            value={time}
            onChange={(e) =>
              setTime(formatMaskedTime(e.target.value, time))
            }
            placeholder="HH:MM"
            disabled={submitting}
            style={inputStyle}
            inputMode="numeric"
          />
        </Field>
        <Field label="—" htmlFor="ac-ampm" style={{ width: 76 }}>
          <select
            id="ac-ampm"
            value={ampm}
            onChange={(e) => setAmpm(e.target.value as "AM" | "PM")}
            disabled={submitting}
            style={{
              ...inputStyle,
              paddingRight: 6,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </Field>
      </div>

      {/* Place picker */}
      <Field
        label="Place of birth *"
        htmlFor="ac-place"
        hint={
          latitude && longitude
            ? `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
            : "Start typing city / village name (3+ chars)"
        }
      >
        <PlacePicker
          value={place}
          onChange={(val, pick) => {
            setPlace(val);
            if (pick) {
              setLatitude(pick.lat);
              setLongitude(pick.lon);
            } else {
              setLatitude(null);
              setLongitude(null);
            }
          }}
          placeholder="Tenali, Andhra Pradesh, India"
        />
      </Field>

      {/* Gender pills */}
      <Field label="Gender *" htmlFor="ac-gender-pills">
        <div id="ac-gender-pills" style={{ display: "flex", gap: 8 }}>
          <GenderPill
            active={gender === "male"}
            onClick={() => setGender("male")}
            disabled={submitting}
          >
            ♂ Male
          </GenderPill>
          <GenderPill
            active={gender === "female"}
            onClick={() => setGender("female")}
            disabled={submitting}
          >
            ♀ Female
          </GenderPill>
        </div>
      </Field>

      {/* Optional contact info — single column on mobile so each
          field gets full width and isn't squashed. */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 4,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <Field label="Phone (optional)" htmlFor="ac-phone" style={{ flex: 1 }}>
          <input
            id="ac-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91…"
            disabled={submitting}
            style={inputStyle}
          />
        </Field>
        <Field label="Email (optional)" htmlFor="ac-email" style={{ flex: 1 }}>
          <input
            id="ac-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            style={inputStyle}
          />
        </Field>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: 12,
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

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        style={{
          marginTop: 20,
          width: "100%",
          height: isMobile ? 50 : 44,
          border: "none",
          borderRadius: 10,
          background: submitting
            ? "rgba(201,169,110,0.4)"
            : "linear-gradient(180deg, #e8c98a 0%, #c9a96e 60%, #b8985d 100%)",
          color: "#09090f",
          fontSize: isMobile ? 15 : 14,
          fontWeight: 600,
          cursor: submitting ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: submitting
            ? "none"
            : "0 0 0 1px rgba(231,201,138,0.45), 0 4px 14px rgba(0,0,0,0.4), 0 0 22px rgba(231,201,138,0.18)",
        }}
      >
        {submitting ? (
          <>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            Computing chart…
          </>
        ) : (
          <>
            Add client &amp; generate chart
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </>
  );

  // ═══════════════ MOBILE: bottom sheet ═══════════════
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          onClick={() => {
            if (!submitting) onClose();
          }}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 999,
          }}
        />

        {/* Sheet */}
        <form
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleSubmit}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            maxHeight: "92vh",
            height: "92vh",
            display: "flex",
            flexDirection: "column",
            background: "rgba(14,14,22,0.98)",
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            borderTop: "1px solid rgba(201,169,110,0.18)",
            boxShadow: "0 -12px 40px rgba(0,0,0,0.6)",
            ...sheetStyle,
          }}
        >
          {/* Drag handle + title bar */}
          <div
            {...dragProps}
            style={{
              padding: "10px 20px 12px",
              ...dragProps.style,
              flexShrink: 0,
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div
              aria-hidden
              style={{
                width: 40,
                height: 4,
                background: "rgba(255,255,255,0.22)",
                borderRadius: 2,
                margin: "0 auto 12px",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: "#c9a96e",
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                    marginBottom: 3,
                  }}
                >
                  New client
                </div>
                <h2
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: 22,
                    margin: 0,
                    color: theme.text.primary,
                    lineHeight: 1.15,
                  }}
                >
                  Birth details
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: theme.text.muted,
                  cursor: submitting ? "not-allowed" : "pointer",
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 20px calc(28px + env(safe-area-inset-bottom, 0px))",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {formBody}
          </div>
        </form>
      </>
    );
  }

  // ═══════════════ DESKTOP: centered modal ═══════════════
  return (
    <div
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
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "rgba(22,22,31,0.95)",
          border: "1px solid rgba(201,169,110,0.15)",
          borderRadius: 14,
          padding: 28,
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 22,
              margin: 0,
              color: theme.text.primary,
            }}
          >
            Add new client
          </h2>
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
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {formBody}
      </form>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  hint,
  children,
  style,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label
        htmlFor={htmlFor}
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
        <div style={{ fontSize: 10, color: theme.text.muted, marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 12px",
  background: "rgba(9,9,15,0.7)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  color: theme.text.primary,
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

function GenderPill({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        height: 44,
        background: active ? "rgba(201,169,110,0.15)" : "rgba(9,9,15,0.7)",
        border: active
          ? "1px solid rgba(201,169,110,0.45)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        color: active ? "#c9a96e" : theme.text.muted,
        fontSize: 14,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
