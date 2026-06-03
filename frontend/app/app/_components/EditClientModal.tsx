"use client";

/**
 * EditClientModal (Wave 13, 2026-06-03, item #2/#5).
 *
 * Sibling of AddClientModal — same mobile/desktop layout, same form
 * shape, but:
 *   - Prefills every field from the existing ClientPublic row
 *   - Calls useUpdateClient (PATCH /clients/{id}) instead of
 *     useCreateClientWithChart
 *   - Does NOT touch the chart_session — astrologers can rectify
 *     birth time / fix typos in metadata without recomputing the
 *     chart. To recompute, they regenerate via the workspace
 *     "Time shift" controls (chart engine path) — different flow.
 *   - Does NOT have the chart_iso_date / chart_time_24h fields
 *     (those are only for the create-with-chart path)
 *
 * Why a separate component (not a "mode" prop on AddClientModal):
 *   - Form behavior differs (no chart compute on submit)
 *   - Header copy differs ("Edit client" vs "Add new client")
 *   - Slightly different validation (some fields required to add
 *     a new chart, optional to edit metadata)
 *   - Cleaner to delete / refactor each independently
 *
 * Sacred-region note: pure CRUD on the client row. No engine call,
 * no AI call, no portal mutation.
 */

import { useEffect, useState } from "react";
import { X, Loader2, Check } from "lucide-react";
import { PlacePicker } from "@/components/ui/place-picker";
import { PhoneField } from "@/components/ui/phone-field";
import {
  useUpdateClientByIdFactory,
  type ClientPublic,
  type ClientUpdate,
} from "@/lib/api/hooks";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSheetDrag } from "@/hooks/useSheetDrag";
import { theme } from "@/lib/theme";
import {
  formatMaskedDate,
  formatMaskedTime,
} from "../lib/maskedInput";

export interface EditClientModalProps {
  open: boolean;
  onClose: () => void;
  /** Client to edit. Modal prefills from this on open. */
  client: ClientPublic | null;
  /** Called after a successful PATCH (parent can refresh / toast). */
  onSaved?: (updated: ClientPublic) => void;
}

export function EditClientModal({
  open,
  onClose,
  client,
  onSaved,
}: EditClientModalProps) {
  const isMobile = useIsMobile();
  const { dragProps, sheetStyle } = useSheetDrag({ onClose });

  // Form state — initialized empty, hydrated from `client` on open.
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [place, setPlace] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // HOTFIX (2026-06-03): switched from `useUpdateClient(client?.id ?? "")`
  // to the factory pattern. The previous version captured `id=""` at
  // first render when `client` was null; later client arrivals couldn't
  // refresh the hook's internal closure, so the PATCH went to
  // `/clients/` (no id) → 405 Method Not Allowed → "Couldn't save changes".
  // useUpdateClientByIdFactory is the factory variant designed for
  // exactly this case — call it with the live id at mutate time.
  const updateClientFactory = useUpdateClientByIdFactory();

  // Hydrate form when client changes / modal opens.
  useEffect(() => {
    if (!open || !client) {
      // Reset on close so reopening a different client doesn't show
      // the previous one's data while hydrating.
      if (!open) {
        setName("");
        setDate("");
        setTime("");
        setAmpm("AM");
        setPlace("");
        setLatitude(null);
        setLongitude(null);
        setGender("");
        setPhone(undefined);
        setEmail("");
        setError(null);
      }
      return;
    }
    setName(client.name || "");
    // Backend stores DD/MM/YYYY (legacy frontend) or YYYY-MM-DD.
    // Normalize to DD/MM/YYYY for our masked input.
    const bd = client.birth_date || "";
    if (bd.includes("-")) {
      const [y, m, d] = bd.split("-");
      if (y && m && d) setDate(`${d}/${m}/${y}`);
      else setDate(bd);
    } else {
      setDate(bd);
    }
    setTime(client.birth_time || "");
    // birth_ampm isn't on ClientPublic — keep current "AM" default.
    setPlace(client.birth_place_name || "");
    setLatitude(client.birth_latitude);
    setLongitude(client.birth_longitude);
    setGender(
      (client.gender as "male" | "female" | "") || "",
    );
    setPhone(client.phone || undefined);
    setEmail(client.email || "");
    setError(null);
  }, [client, open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open || !client) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Refresh TS narrowing — the early `if (!open || !client) return null`
    // narrowed `client` to non-null at the render guard, but this submit
    // handler runs in its own scope where TS lost that. Re-check.
    if (!client) {
      setError("Client data is missing.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter the client's name.");
      return;
    }
    if (date && date.length !== 10) {
      setError("Date of birth should be DD/MM/YYYY (or leave empty).");
      return;
    }
    if (time && time.length !== 5) {
      setError("Time of birth should be HH:MM (or leave empty).");
      return;
    }

    setSubmitting(true);
    try {
      // HOTFIX (2026-06-03): build the updater with the LIVE client.id
      // at mutate time, not at first-render-and-cached-via-closure.
      const updater = updateClientFactory(client.id);
      const patch: ClientUpdate = {
        name: name.trim(),
        gender: gender || undefined,
        birth_date: date || undefined,
        birth_time: time || undefined,
        birth_place_name: place || undefined,
        birth_latitude: latitude ?? undefined,
        birth_longitude: longitude ?? undefined,
        phone: phone || undefined,
        email: email.trim() || undefined,
      };
      const updated = await new Promise<ClientPublic>((resolve, reject) => {
        updater.mutate(patch, {
          onSuccess: (data) => resolve(data),
          onError: (err) => reject(err),
        });
      });
      onSaved?.(updated);
      onClose();
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("[EditClientModal] update failed:", err);
      const status = (err as { status?: number } | null)?.status;
      setError(
        status === 401
          ? "Your session expired. Sign back in and try again."
          : status === 429
            ? "You're going a bit fast. Wait a moment and try again."
            : "Couldn't save changes. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Shared form body ──
  const formBody = (
    <>
      <Field label="Full name *" htmlFor="ec-name">
        <input
          id="ec-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          autoFocus={!isMobile}
          style={inputStyle}
        />
      </Field>

      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Date of birth" htmlFor="ec-date" hint="DD/MM/YYYY" style={{ flex: 1 }}>
          <input
            id="ec-date"
            type="text"
            value={date}
            onChange={(e) => setDate(formatMaskedDate(e.target.value, date))}
            placeholder="DD/MM/YYYY"
            disabled={submitting}
            style={inputStyle}
            inputMode="numeric"
          />
        </Field>
        <Field label="Time" htmlFor="ec-time" hint="HH:MM" style={{ width: 110 }}>
          <input
            id="ec-time"
            type="text"
            value={time}
            onChange={(e) => setTime(formatMaskedTime(e.target.value, time))}
            placeholder="HH:MM"
            disabled={submitting}
            style={inputStyle}
            inputMode="numeric"
          />
        </Field>
        <Field label="—" htmlFor="ec-ampm" style={{ width: 76 }}>
          <select
            id="ec-ampm"
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

      <Field
        label="Place of birth"
        htmlFor="ec-place"
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

      <Field label="Gender" htmlFor="ec-gender-pills">
        <div id="ec-gender-pills" style={{ display: "flex", gap: 8 }}>
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

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 4,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <Field
          label="Phone (optional)"
          htmlFor="ec-phone"
          style={{ flex: 1 }}
          hint="Default country: India. Pick the flag to change."
        >
          <PhoneField
            value={phone}
            onChange={setPhone}
            disabled={submitting}
            placeholder="9876543210"
          />
        </Field>
        <Field label="Email (optional)" htmlFor="ec-email" style={{ flex: 1 }}>
          <input
            id="ec-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            style={inputStyle}
          />
        </Field>
      </div>

      {error && (
        <div
          role="alert"
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
        }}
      >
        {submitting ? (
          <>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            Saving…
          </>
        ) : (
          <>
            <Check size={16} />
            Save changes
          </>
        )}
      </button>
    </>
  );

  // Mobile bottom sheet vs desktop centered modal — mirrors AddClientModal.
  if (isMobile) {
    return (
      <>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
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
                  Edit client
                </div>
                <h2
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: 20,
                    margin: 0,
                    color: theme.text.primary,
                    lineHeight: 1.15,
                  }}
                >
                  {client.name}
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

  // Desktop centered modal.
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
            Edit {client.name}
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

// ─── Sub-components (mirrors AddClientModal — kept local for now) ───

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
        height: 38,
        background: active ? "rgba(201,169,110,0.15)" : "rgba(9,9,15,0.7)",
        border: active
          ? "1px solid rgba(201,169,110,0.45)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 7,
        color: active ? "#c9a96e" : theme.text.muted,
        fontSize: 13,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
