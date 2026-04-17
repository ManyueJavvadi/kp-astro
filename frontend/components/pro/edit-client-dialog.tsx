"use client";

import { useState, useEffect } from "react";
import { Edit, Loader2, Save } from "lucide-react";
import { theme, styles } from "@/lib/theme";
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
import { useUpdateClient, type ClientFull } from "@/hooks/use-clients";
import { toast } from "sonner";

export function EditClientDialog({
  client,
  trigger,
}: {
  client: ClientFull;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateClient();
  const [form, setForm] = useState({
    full_name: client.full_name,
    preferred_name: client.preferred_name ?? "",
    gender: (client.gender ?? "") as "" | "male" | "female" | "other",
    phone: client.phone ?? "",
    email: client.email ?? "",
    notes_private: client.notes_private ?? "",
    tags: (client.tags ?? []).join(", "),
    relation_to_astrologer: client.relation_to_astrologer ?? "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        full_name: client.full_name,
        preferred_name: client.preferred_name ?? "",
        gender: (client.gender ?? "") as "" | "male" | "female" | "other",
        phone: client.phone ?? "",
        email: client.email ?? "",
        notes_private: client.notes_private ?? "",
        tags: (client.tags ?? []).join(", "),
        relation_to_astrologer: client.relation_to_astrologer ?? "",
      });
    }
  }, [open, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await update.mutateAsync({
        id: client.id,
        body: {
          full_name: form.full_name.trim(),
          preferred_name: form.preferred_name.trim() || undefined,
          gender: form.gender || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          notes_private: form.notes_private || undefined,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) as unknown as never,
          relation_to_astrologer: form.relation_to_astrologer.trim() || undefined,
        } as Partial<ClientFull>,
      });
      setOpen(false);
    } catch {
      /* handled */
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button style={styles.ghostButton}>
            <Edit size={14} /> Edit
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit client</DialogTitle>
          <DialogDescription>
            Update contact info, tags, and notes. Birth data is locked — create a
            new client if you need to correct a chart.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          <DialogBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Full name *">
                  <input
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    style={styles.input}
                  />
                </Field>
                <Field label="Preferred name">
                  <input
                    value={form.preferred_name}
                    onChange={(e) => setForm({ ...form, preferred_name: e.target.value })}
                    placeholder="Nickname"
                    style={styles.input}
                  />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <Field label="Gender">
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as typeof form.gender })}
                    style={styles.input}
                  >
                    <option value="">—</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Phone">
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    style={styles.input}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={styles.input}
                  />
                </Field>
              </div>
              <Field label="Relation">
                <input
                  value={form.relation_to_astrologer}
                  onChange={(e) => setForm({ ...form, relation_to_astrologer: e.target.value })}
                  placeholder="e.g. self, spouse, child, friend"
                  style={styles.input}
                />
              </Field>
              <Field label="Tags (comma-separated)">
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="career, priority"
                  style={styles.input}
                />
              </Field>
              <Field label="Private notes">
                <textarea
                  rows={4}
                  value={form.notes_private}
                  onChange={(e) => setForm({ ...form, notes_private: e.target.value })}
                  placeholder="Astrologer-only notes"
                  style={{
                    ...styles.input,
                    height: 90,
                    padding: "10px 12px",
                    resize: "vertical",
                    fontFamily: "inherit",
                    lineHeight: 1.5,
                  }}
                />
              </Field>

              <div
                style={{
                  marginTop: 4,
                  padding: 10,
                  borderRadius: 6,
                  backgroundColor: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  fontSize: 11,
                  color: theme.warning,
                  lineHeight: 1.4,
                }}
              >
                <strong>Note:</strong> Birth date/time/place/coordinates are not editable.
                If chart is wrong, delete and re-add the client with correct data.
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" onClick={() => setOpen(false)} style={styles.ghostButton}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={update.isPending}
              style={{ ...styles.primaryButton, opacity: update.isPending ? 0.6 : 1 }}
            >
              {update.isPending ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Save size={14} />
              )}
              Save changes
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: theme.text.dim,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 500,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
