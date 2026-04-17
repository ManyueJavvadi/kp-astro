"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Sparkles } from "lucide-react";
import { theme, styles } from "@/lib/theme";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateClient, type ClientCreateBody } from "@/hooks/use-clients";
import { toast } from "sonner";

export function NewClientDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const create = useCreateClient();
  const [form, setForm] = useState({
    full_name: "",
    gender: "" as "" | "male" | "female" | "other",
    phone: "",
    email: "",
    birth_date: "",
    birth_time: "",
    birth_timezone: "Asia/Kolkata",
    birth_lat: "",
    birth_lon: "",
    birth_place: "",
    tags: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.full_name ||
      !form.birth_date ||
      !form.birth_time ||
      !form.birth_place ||
      !form.birth_lat ||
      !form.birth_lon
    ) {
      toast.error("Fill name, birth date/time, place, and coordinates");
      return;
    }
    const body: ClientCreateBody = {
      full_name: form.full_name.trim(),
      gender: (form.gender || undefined) as ClientCreateBody["gender"],
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      birth_date: form.birth_date,
      birth_time: form.birth_time,
      birth_timezone: form.birth_timezone.trim() || "Asia/Kolkata",
      birth_lat: parseFloat(form.birth_lat),
      birth_lon: parseFloat(form.birth_lon),
      birth_place: form.birth_place.trim(),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    try {
      const created = await create.mutateAsync(body);
      setOpen(false);
      setForm({
        full_name: "",
        gender: "",
        phone: "",
        email: "",
        birth_date: "",
        birth_time: "",
        birth_timezone: "Asia/Kolkata",
        birth_lat: "",
        birth_lon: "",
        birth_place: "",
        tags: "",
      });
      router.push(`/pro/clients/${created.id}`);
    } catch {
      /* handled by hook */
    }
  };

  const trig = trigger ?? (
    <button style={styles.primaryButton}>
      <Plus size={14} /> Add client
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trig}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add new client</DialogTitle>
          <DialogDescription>
            Birth data is required. Accurate time + coordinates = precise Lagna.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Full name *">
            <input
              required
              autoFocus
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Ravi Kumar"
              style={styles.input}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Birth date *">
              <input
                required
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                style={styles.input}
              />
            </Field>
            <Field label="Birth time *">
              <input
                required
                type="time"
                value={form.birth_time}
                onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
                style={styles.input}
              />
            </Field>
          </div>

          <Field label="Birth place *">
            <input
              required
              value={form.birth_place}
              onChange={(e) => setForm({ ...form, birth_place: e.target.value })}
              placeholder="Hyderabad, Telangana, India"
              style={styles.input}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Latitude *">
              <input
                required
                type="number"
                step="0.000001"
                value={form.birth_lat}
                onChange={(e) => setForm({ ...form, birth_lat: e.target.value })}
                placeholder="17.385"
                style={styles.input}
              />
            </Field>
            <Field label="Longitude *">
              <input
                required
                type="number"
                step="0.000001"
                value={form.birth_lon}
                onChange={(e) => setForm({ ...form, birth_lon: e.target.value })}
                placeholder="78.4867"
                style={styles.input}
              />
            </Field>
            <Field label="Timezone">
              <input
                value={form.birth_timezone}
                onChange={(e) => setForm({ ...form, birth_timezone: e.target.value })}
                placeholder="Asia/Kolkata"
                style={styles.input}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
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
                placeholder="+91 98765…"
                style={styles.input}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="client@mail.com"
                style={styles.input}
              />
            </Field>
          </div>

          <Field label="Tags (comma separated)">
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="career, priority"
              style={styles.input}
            />
          </Field>

          <DialogFooter style={{ marginTop: 8 }}>
            <button type="button" onClick={() => setOpen(false)} style={styles.ghostButton}>
              Cancel
            </button>
            <button type="submit" disabled={create.isPending} style={styles.primaryButton}>
              {create.isPending ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Sparkles size={14} />
              )}
              Create client
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
