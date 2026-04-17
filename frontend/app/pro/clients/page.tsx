"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Filter,
  Download,
  MoreHorizontal,
  TrendingUp,
  Clock,
  AlertCircle,
  Tag,
  ChevronDown,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Phone,
  Mail,
} from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

const MOCK_CLIENTS = [
  { name: "Ravi Kumar", initial: "R", lagna: "Scorpio", dasha: "Saturn · Mercury", lastSeen: "today", pending: 3, tags: ["career", "priority"], sessions: 12, phone: "+91 98765…", email: "ravi.k@mail.com" },
  { name: "Priya Sharma", initial: "P", lagna: "Libra", dasha: "Jupiter · Saturn", lastSeen: "today", pending: 1, tags: ["marriage"], sessions: 5, phone: "+91 98234…", email: "priya.s@mail.com" },
  { name: "Mohan Reddy", initial: "M", lagna: "Gemini", dasha: "Mars · Venus", lastSeen: "today", pending: 0, tags: ["horary"], sessions: 3, phone: "+91 91234…", email: "mohan.r@mail.com" },
  { name: "Lakshmi Devi", initial: "L", lagna: "Cancer", dasha: "Venus · Moon", lastSeen: "3 days ago", pending: 2, tags: ["family", "muhurtha"], sessions: 18, phone: "+91 99876…", email: "lakshmi.d@mail.com" },
  { name: "Sunita Patel", initial: "S", lagna: "Virgo", dasha: "Moon · Mars", lastSeen: "1 week ago", pending: 0, tags: ["health"], sessions: 7, phone: "+91 97654…", email: "sunita.p@mail.com" },
  { name: "Vijay Bhaskar", initial: "V", lagna: "Aquarius", dasha: "Mercury · Ketu", lastSeen: "2 weeks ago", pending: 4, tags: ["foreign", "priority"], sessions: 22, phone: "+91 96543…", email: "vijay.b@mail.com" },
  { name: "Anita Verma", initial: "A", lagna: "Leo", dasha: "Saturn · Jupiter", lastSeen: "3 weeks ago", pending: 0, tags: ["career"], sessions: 9, phone: "+91 95432…", email: "anita.v@mail.com" },
  { name: "Rakesh Iyer", initial: "R", lagna: "Pisces", dasha: "Jupiter · Mercury", lastSeen: "1 month ago", pending: 1, tags: ["property"], sessions: 4, phone: "+91 94321…", email: "rakesh.i@mail.com" },
  { name: "Deepa Rao", initial: "D", lagna: "Taurus", dasha: "Rahu · Venus", lastSeen: "1 month ago", pending: 0, tags: ["marriage"], sessions: 6, phone: "+91 93210…", email: "deepa.r@mail.com" },
  { name: "Karthik Menon", initial: "K", lagna: "Capricorn", dasha: "Ketu · Sun", lastSeen: "6 weeks ago", pending: 2, tags: ["career", "health"], sessions: 11, phone: "+91 92109…", email: "karthik.m@mail.com" },
];

const TAGS = ["all", "career", "marriage", "health", "muhurtha", "horary", "foreign", "family", "priority", "property"];

export default function ClientsListPage() {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [view, setView] = useState<"grid" | "table">("grid");

  const filtered = MOCK_CLIENTS.filter((c) => {
    if (activeTag !== "all" && !c.tags.includes(activeTag)) return false;
    if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <TopBar title="Clients" tabs={[]} />
      <main className="px-6 pb-12 pt-6 max-w-[1400px] mx-auto">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="text-tiny uppercase tracking-wider text-gold mb-1">
              YOUR CLIENT DIRECTORY · 87 ACTIVE
            </div>
            <h1 className="font-display text-h2 font-semibold text-text-primary">
              All clients
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" leftIcon={<Download />}>
              Export CSV
            </Button>
            <Button variant="primary" size="md" leftIcon={<Plus />} asChild>
              <Link href="/pro/clients/new">Add client</Link>
            </Button>
          </div>
        </div>

        {/* Search + filters bar */}
        <div className="flex flex-col lg:flex-row gap-3 mb-5">
          <div className="flex-1">
            <Input
              placeholder="Search by name, phone, place, or semantic text..."
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
              Sort: Last seen
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
          <div className="ml-auto text-tiny text-text-muted whitespace-nowrap">
            Showing <span className="text-text-primary font-medium">{filtered.length}</span> of{" "}
            <span className="text-text-primary font-medium">87</span>
          </div>
        </div>

        {/* Content */}
        {view === "grid" ? <ClientGrid clients={filtered} /> : <ClientTable clients={filtered} />}
      </main>
    </>
  );
}

function ClientGrid({ clients }: { clients: typeof MOCK_CLIENTS }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {clients.map((c) => (
        <Link
          key={c.name}
          href={`/pro/clients/${c.name.toLowerCase().replace(/ /g, "-")}`}
          className="group p-5 rounded-xl bg-bg-surface border border-border hover:border-border-accent transition-all"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="size-12 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-h3 font-semibold text-gold shrink-0">
              {c.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-body font-semibold text-text-primary truncate">
                {c.name}
              </div>
              <div className="text-tiny text-text-muted truncate">
                {c.lagna} Lagna · {c.sessions} sessions
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

          <div className="flex items-center gap-2 mb-2 text-tiny text-text-secondary">
            <TrendingUp className="size-3 text-text-muted" />
            <span className="font-mono">{c.dasha}</span>
          </div>
          <div className="flex items-center gap-2 mb-3 text-tiny text-text-secondary">
            <Clock className="size-3 text-text-muted" />
            Last seen {c.lastSeen}
          </div>

          <div className="flex items-center gap-1 flex-wrap mb-3">
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
            <div className="flex items-center gap-1 text-text-muted">
              {c.pending > 0 ? (
                <>
                  <AlertCircle className="size-3 text-warning" />
                  <span className="text-warning">{c.pending} pending</span>
                </>
              ) : (
                <span className="text-success">Up to date</span>
              )}
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

function ClientTable({ clients }: { clients: typeof MOCK_CLIENTS }) {
  return (
    <div className="rounded-xl border border-border bg-bg-surface overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-bg-surface-2 border-b border-border">
            <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Client</th>
            <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Lagna</th>
            <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Current Dasha</th>
            <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Contact</th>
            <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Tags</th>
            <th className="text-center text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Sessions</th>
            <th className="text-left text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Last seen</th>
            <th className="text-center text-tiny uppercase tracking-wider text-text-muted px-4 py-3 font-medium">Status</th>
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clients.map((c) => (
            <tr key={c.name} className="hover:bg-bg-hover transition-colors cursor-pointer group">
              <td className="px-4 py-3">
                <Link
                  href={`/pro/clients/${c.name.toLowerCase().replace(/ /g, "-")}`}
                  className="flex items-center gap-3"
                >
                  <div className="size-8 rounded-full bg-gold-glow border border-border-accent flex items-center justify-center text-small font-semibold text-gold">
                    {c.initial}
                  </div>
                  <div className="text-small font-medium text-text-primary">{c.name}</div>
                </Link>
              </td>
              <td className="px-4 py-3 text-small text-text-secondary">{c.lagna}</td>
              <td className="px-4 py-3 text-small text-text-secondary font-mono">{c.dasha}</td>
              <td className="px-4 py-3 text-tiny text-text-muted">
                <div className="flex items-center gap-1.5">
                  <Phone className="size-3" /> {c.phone}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Mail className="size-3" /> <span className="truncate max-w-[180px]">{c.email}</span>
                </div>
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
              <td className="px-4 py-3 text-center text-small text-text-secondary">{c.sessions}</td>
              <td className="px-4 py-3 text-tiny text-text-muted">{c.lastSeen}</td>
              <td className="px-4 py-3 text-center">
                {c.pending > 0 ? (
                  <Badge variant="warning" size="sm">{c.pending}</Badge>
                ) : (
                  <Badge variant="success" size="sm">OK</Badge>
                )}
              </td>
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
