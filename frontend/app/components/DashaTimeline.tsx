"use client";
import { PLANET_COLORS } from "./constants";

export default function DashaTimeline({ mahadasha, antardashas }: { mahadasha: any; antardashas: any[] }) {
  const today = new Date();
  const mdStart = new Date(mahadasha.start);
  const mdEnd = new Date(mahadasha.end);
  const pct = Math.min(100, ((today.getTime() - mdStart.getTime()) / (mdEnd.getTime() - mdStart.getTime())) * 100);
  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{mahadasha.lord_te} మహాదశ</span>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>{mahadasha.start} → {mahadasha.end}</span>
        </div>
        <div style={{ background: "var(--surface2)", borderRadius: 4, height: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${PLANET_COLORS[mahadasha.lord_en] || "var(--accent)"}, transparent)`, width: `${pct}%`, transition: "width 0.5s" }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {antardashas.slice(0, 12).map((ad: any, i: number) => {
          const isPast = new Date(ad.end) < today;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: ad.is_current ? "rgba(201,169,110,0.12)" : isPast ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)", border: ad.is_current ? "0.5px solid rgba(201,169,110,0.4)" : "0.5px solid var(--border)", opacity: isPast ? 0.5 : 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: ad.is_current ? PLANET_COLORS[ad.lord_en] || "var(--accent)" : "var(--border2)", boxShadow: ad.is_current ? `0 0 8px ${PLANET_COLORS[ad.lord_en] || "var(--accent)"}` : "none", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: ad.is_current ? 600 : 400, color: ad.is_current ? PLANET_COLORS[ad.lord_en] || "var(--accent)" : "var(--text)", minWidth: 80 }}>{ad.lord_te}</span>
              <span style={{ fontSize: 10, color: "var(--muted)", flex: 1 }}>{ad.start} → {ad.end}</span>
              {ad.is_current && <span style={{ fontSize: 9, background: "rgba(201,169,110,0.2)", color: "var(--accent)", padding: "2px 6px", borderRadius: 3 }}>ప్రస్తుతం</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
