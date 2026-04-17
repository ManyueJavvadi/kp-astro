"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Filter,
  Download,
  MoreHorizontal,
  Clock,
  Tag,
  ChevronDown,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Users,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { NewClientDialog } from "@/components/pro/new-client-dialog";
import { useClientsList, type ClientRow } from "@/hooks/use-clients";
import { cn } from "@/lib/utils";

const TAGS = ["all", "career", "marriage", "health", "muhurtha", "horary", "foreign", "family", "priority", "property"];

export default function ClientsListPage() {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [view, setView] = useState<"grid" | "table">("grid");

  const { data, isLoading, isError, refetch } = useClientsList({
    q: query || undefined,
    tag: activeTag === "all" ? undefined : activeTag,
  });

  return (
    <>
      <TopBar title="Clients" tabs={[]} />
      <main className="px-6 pb-12 pt-6 max-w-[1400px] mx-auto">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="text-tiny uppercase tracking-wider text-gold mb-1">
              YOUR CLIENT DIRECTORY · {data?.total ?? 0} ACTIVE
            </div>
            <h1 className="font-display text-h2 font-semibold text-text-primary">
              All clients
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" leftIcon={<Download />}>
              Export CSV
            </Button>
            <NewClientDialog />
          </div>
        </div>

        {/* Search + filters bar */}
        <div className="flex flex-col lg:flex-row gap-3 mb-5">
          <div className="flex-1">
            <Input
              placeholder="Search by name, phone, email, or place..."
              leftIcon={<Search />}
              rightIcon={<Kbd>⌘K</Kbd>}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" leftIcon={<Filter />} rightIcon={<ChevronDown />}>
              Dasha state
            </Button>
            <Button variant="secondary" size="md" leftIcon={<SlidersHorizontal />} rightIcon={<ChevronDown />}>
              Sort: Recent
            </Button>
            <div className="flex items-center gap-0 p-0.5 rounded-md bg-bg-surface-2 border border-border">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "size-8 rounded flex items-center justify-center transition-colors",
                  view === "grid" ? "bg-bg-elevated text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
                )}
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                onClick={() => setView("table")}
                className={cn(
                  "size-8 rounded flex items-center justify-center transition-colors",
                  view === "table" ? "bg-bg-elevated text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
                )}
              >
                <List className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tag filter strip */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hidden">
          <Tag className="size-3.5 text-text-muted shrink-0" />
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTag(t)}
              className={cn(
                "px-3 py-1.5 rounded-full text-tiny font-medium whitespace-nowrap transition-colors border",
                activeTag === t
                  ? "bg-gold-glow text-gold border-border-accent"
                  : "bg-bg-surface-2 text-text-secondary border-border hover:text-text-primary hover:border-border-strong"
              )}
            >
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>

        {/* States */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 text-text-muted">
            <Loader2 className="size-6 animate-spin mb-3" />
            <div className="text-small">Loading your clients…</div>
          </div>
        )}

        {isError && (
          <div className="p-6 rounded-xl bg-error/10 border border-error/30 text-center">
            <AlertCircle className="size-6 text-error mx-auto mb-2" />
            <div className="text-body text-text-primary font-medium mb-1">
              Couldn&apos;t load clients
            </div>
            <div className="text-small text-text-muted mb-4">
              The backend may be unreachable. Make sure FastAPI is running on :8000.
            </div>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && data && data.items.length === 0 && <EmptyState />}

        {!isLoading && !isError && data && data.items.length > 0 && (
          <>
            {view === "grid" ? <ClientGrid clients={data.items} /> : <ClientTable clients={data.items} />}
          </>
        )}
      </main>
    </>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-2xl border-2 border-dashed border-border-strong p-12 text-center max-w-2xl mx-auto">
      <div className="size-16 mx-auto mb-4 rounded-2xl bg-gold-glow border border-border-accent flex items-center justify-center text-gold">
        <Users className="size-7" />
      </div>
      <h2 className="font-display text-h2 font-semibold text-text-primary mb-2">
        Your client directory is empty
      </h2>
      <p className="text-body text-text-secondary max-w-md mx-auto mb-6">
        Add your first client to start tracking consultations, predictions, and
        follow-ups. Every detail stays private and encrypted — only you can see
        them.
      </p>
      <div className="flex items-center justify-center gap-3">
        <NewClientDialog
          trigger={
            <Button variant="primary" size="lg" leftIcon={<Plus />}>
              Add your first client
            </Button>
          }
        />
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3 text-left max-w-2xl mx-auto">
        {[
          {
            title: "Birth data",
            body: "Date + time + place (with coordinates) for KP chart precision.",
          },
          {
            title: "Tags",
            body: "Organize by topic — career, marriage, health, priority.",
          },
          {
            title: "Private notes",
            body: "Astrologer-only jottings never shown to the client.",
          },
        ].map((x) => (
          <div
            key={x.title}
            className="p-3 rounded-lg bg-bg-surface border border-border"
          >
            <div className="text-tiny uppercase tracking-wider text-gold mb-1">
              {x.title}
            </div>
            <div className="text-small text-text-secondary leading-snug">
              {x.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientGrid({ clients }: { clients: ClientRow[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {clients.map((c) => (
        <Link
          key={c.id}
          href={`/pro/clients/${c.id}`}
          className="group p-5 rounded-xl bg-bg-surface border border-border hover:border-border-accent transition-all"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="size-12 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-h3 font-semibold text-gold shrink-0">
              {c.full_name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-body font-semibold text-text-primary truncate">
                {c.full_name}
              </div>
              <div className="text-tiny text-text-muted truncate">
                {c.birth_place}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="size-7 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover flex items-center justify-center"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-3 text-tiny text-text-secondary">
            <Clock className="size-3 text-text-muted" />
            Created {formatRelative(c.created_at)}
          </div>

          <div className="flex items-center gap-1 flex-wrap mb-3 min-h-[20px]">
            {c.tags.map((t) => (
              <span
                key={t}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-sm font-medium",
                  t === "priority"
                    ? "bg-warning/15 text-warning"
                    : "bg-bg-surface-2 text-text-muted border border-border"
                )}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between text-tiny">
            <div className="text-text-muted">
              {c.phone || c.email || "—"}
            </div>
            <div className="text-text-muted group-hover:text-gold transition-colors">
              Open →
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ClientTable({ clients }: { clients: ClientRow[] }) {
  return (
    <div className="rounded-xl border border-border bg-bg-surface overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-bg-surface-2 border-b border-border">
            <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Client</th>
            <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Birth place</th>
            <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Contact</th>
            <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Tags</th>
            <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Created</th>
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clients.map((c) => (
            <tr key={c.id} className="hover:bg-bg-hover transition-colors cursor-pointer">
              <td className="px-4 py-3">
                <Link href={`/pro/clients/${c.id}`} className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-small font-semibold text-gold">
                    {c.full_name[0].toUpperCase()}
                  </div>
                  <div className="text-small font-medium text-text-primary">{c.full_name}</div>
                </Link>
              </td>
              <td className="px-4 py-3 text-small text-text-secondary">{c.birth_place}</td>
              <td className="px-4 py-3 text-tiny text-text-muted">
                <div>{c.phone || "—"}</div>
                <div className="truncate max-w-[200px]">{c.email || "—"}</div>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1 flex-wrap max-w-[200px]">
                  {c.tags.map((t) => (
                    <span
                      key={t}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-sm font-medium",
                        t === "priority"
                          ? "bg-warning/15 text-warning"
                          : "bg-bg-surface-2 text-text-muted border border-border"
                      )}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-tiny text-text-muted">{formatRelative(c.created_at)}</td>
              <td className="px-4 py-3">
                <button className="size-7 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover flex items-center justify-center">
                  <MoreHorizontal className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffSec = (Date.now() - d.getTime()) / 1000;
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return d.toLocaleDateString();
}
