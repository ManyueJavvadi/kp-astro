"use client";

/**
 * /app/tools — standalone astrologer tools that aren't client-scoped.
 *
 * Phase 2 Slice 3 (2026-06-02). Stub in this slice — the actual
 * tools (Today's Panchang, ad-hoc Muhurtha, ad-hoc Horary) get
 * built in Slice 6 as /app/tools/{panchang,muhurtha,horary}.
 * For now this page just lists what's coming.
 */

import { CrmShell } from "../_components/CrmShell";
import { theme } from "@/lib/theme";
import { Calendar, Target, HelpCircle, ChevronRight } from "lucide-react";

interface ToolCardProps {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
  comingSoon?: boolean;
}

const TOOLS: ToolCardProps[] = [
  {
    icon: Calendar,
    title: "Today's Panchang",
    description:
      "Tithi, Nakshatra, Yoga, Karana, Choghadiya, Rahu Kalam — for your current location.",
    comingSoon: true,
  },
  {
    icon: Target,
    title: "Muhurtha finder",
    description:
      "Find auspicious time windows for any event (wedding, business start, travel) — no client needed.",
    comingSoon: true,
  },
  {
    icon: HelpCircle,
    title: "Horary",
    description:
      "Ask a yes/no question right now from your location. Uses current moment chart, no birth data.",
    comingSoon: true,
  },
];

export default function ToolsPage() {
  return (
    <CrmShell pageTitle="Tools">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {TOOLS.map((t) => (
          <ToolCard key={t.title} {...t} />
        ))}
      </div>

      <div
        style={{
          marginTop: 28,
          padding: 16,
          background: "rgba(7,11,20,0.4)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          fontSize: 12,
          color: theme.text.muted,
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: theme.text.primary }}>About Tools:</strong>{" "}
        These are standalone utilities for ad-hoc questions — your own life
        decisions, walk-in clients without a saved record, or quick
        explorations. For client consultations, open the client from your
        roster and use the same tools inside their workspace (with their
        birth chart pre-loaded).
      </div>
    </CrmShell>
  );
}

function ToolCard({ icon: Icon, title, description, comingSoon }: ToolCardProps) {
  return (
    <div
      style={{
        padding: 18,
        background: "rgba(7,11,20,0.5)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "rgba(201,169,110,0.10)",
          color: "#c9a96e",
          marginBottom: 10,
        }}
      >
        <Icon size={18} />
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: theme.text.primary,
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {title}
        {comingSoon && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 500,
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(201,169,110,0.10)",
              color: "#c9a96e",
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            Soon
          </span>
        )}
      </div>
      <p
        style={{
          fontSize: 12,
          color: theme.text.muted,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}
