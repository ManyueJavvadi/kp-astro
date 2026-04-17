"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useCreateClient, type ClientCreateBody } from "@/hooks/use-clients";
import { Plus, User, Calendar, Clock, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function NewClientDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const createClient = useCreateClient();

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
    if (!form.full_name || !form.birth_date || !form.birth_time || !form.birth_place || !form.birth_lat || !form.birth_lon) {
      toast.error("Fill in name, birth date/time, and place with coordinates");
      return;
    }
    const body: ClientCreateBody = {
      full_name: form.full_name.trim(),
      gender: (form.gender || undefined) as ClientCreateBody["gender"],
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      birth_date: form.birth_date,
      birth_time: form.birth_time.length === 5 ? form.birth_time : form.birth_time,
      birth_timezone: form.birth_timezone.trim() || "Asia/Kolkata",
      birth_lat: parseFloat(form.birth_lat),
      birth_lon: parseFloat(form.birth_lon),
      birth_place: form.birth_place.trim(),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    try {
      const created = await createClient.mutateAsync(body);
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
      /* toast handled by hook */
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="primary" leftIcon={<Plus />}>
            Add client
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add new client</DialogTitle>
          <DialogDescription>
            Birth data is required for KP chart calculation. Coordinates are
            critical — imprecise birth time/place yields inaccurate Lagna.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
              Full name *
            </label>
            <Input
              required
              autoFocus
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Ravi Kumar"
              leftIcon={<User />}
            />
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Birth date *
              </label>
              <Input
                required
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                leftIcon={<Calendar />}
              />
            </div>
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Birth time *
              </label>
              <Input
                required
                type="time"
                value={form.birth_time}
                onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
                leftIcon={<Clock />}
              />
            </div>
          </div>

          <div>
            <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
              Birth place *
            </label>
            <Input
              required
              value={form.birth_place}
              onChange={(e) => setForm({ ...form, birth_place: e.target.value })}
              placeholder="Hyderabad, Telangana, India"
              leftIcon={<MapPin />}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Latitude *
              </label>
              <Input
                required
                type="number"
                step="0.000001"
                value={form.birth_lat}
                onChange={(e) => setForm({ ...form, birth_lat: e.target.value })}
                placeholder="17.385"
              />
            </div>
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Longitude *
              </label>
              <Input
                required
                type="number"
                step="0.000001"
                value={form.birth_lon}
                onChange={(e) => setForm({ ...form, birth_lon: e.target.value })}
                placeholder="78.4867"
              />
            </div>
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Timezone
              </label>
              <Input
                value={form.birth_timezone}
                onChange={(e) => setForm({ ...form, birth_timezone: e.target.value })}
                placeholder="Asia/Kolkata"
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr] gap-3">
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Gender
              </label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as typeof form.gender })}
                className={cn(
                  "w-full h-10 px-3 rounded-md text-body",
                  "bg-bg-surface-2 border border-border text-text-primary",
                  "focus:outline-none focus:border-border-accent focus:ring-1 focus:ring-gold"
                )}
              >
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Phone
              </label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765…"
              />
            </div>
            <div>
              <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
                Email
              </label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="client@mail.com"
              />
            </div>
          </div>

          <div>
            <label className="text-tiny uppercase tracking-wider text-text-muted mb-1.5 block font-medium">
              Tags (comma separated)
            </label>
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="career, priority"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createClient.isPending}
              leftIcon={<Sparkles />}
            >
              Create client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
