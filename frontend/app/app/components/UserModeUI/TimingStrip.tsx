"use client";

/**
 * TimingStrip — horizontal dasha timeline visualization.
 *
 * Shows the user's life arc as a strip: current AD prominently
 * highlighted in gold, next 2-3 ADs faintly visible. Hovering a
 * segment shows tooltip with lord + dates.
 *
 * Conceptually: the chart's "weather forecast" at-a-glance.
 */

import React from "react";

interface Props {
  currentDasha: any;
  upcomingAntardashas?: any[]; // optional — when present, renders next ADs after current
}

export function TimingStrip({ currentDasha, upcomingAntardashas }: Props) {
  const md = currentDasha?.mahadasha || currentDasha?.current_mahadasha;
  const ad = currentDasha?.antardasha || currentDasha?.current_antardasha;

  if (!ad?.antardasha_lord) {
    return null;
  }

  // Build the segment list — current AD first, then next 3 if available
  const segments: Array<{ lord: string; start: string; end: string; isCurrent: boolean }> = [];
  segments.push({
    lord: ad.antardasha_lord,
    start: ad.start,
    end: ad.end,
    isCurrent: true,
  });

  if (upcomingAntardashas?.length) {
    const curIdx = upcomingAntardashas.findIndex(
      (a: any) => a.antardasha_lord === ad.antardasha_lord && a.start === ad.start
    );
    if (curIdx >= 0) {
      for (let i = 1; i <= 3; i++) {
        const nx = upcomingAntardashas[curIdx + i];
        if (nx) segments.push({ lord: nx.antardasha_lord, start: nx.start, end: nx.end, isCurrent: false });
      }
    }
  }

  // Compute proportional widths based on duration
  const durations = segments.map(s => durationDays(s.start, s.end));
  const total = durations.reduce((a, b) => a + b, 0) || 1;
  const widths = durations.map(d => (d / total) * 100);

  // Compute progress through current segment
  const curDur = durationDays(ad.start, ad.end) || 1;
  const elapsed = durationDays(ad.start, todayISO());
  const progress = Math.max(0, Math.min(100, (elapsed / curDur) * 100));

  return (
    <section className="user-card user-timing">
      <h3 className="user-card-title">Timing Horizon</h3>

      <div className="user-timing-strip" role="img" aria-label="Life timeline">
        {segments.map((seg, idx) => (
          <div
            key={`${seg.lord}-${seg.start}`}
            className={`user-timing-seg ${seg.isCurrent ? "is-current" : ""}`}
            style={{ width: `${widths[idx]}%` }}
            title={`${seg.lord}: ${fmtShort(seg.start)} → ${fmtShort(seg.end)}`}
          >
            <span className="user-timing-seg-label">{seg.lord}</span>
            {seg.isCurrent && (
              <div className="user-timing-progress" style={{ width: `${progress}%` }} />
            )}
          </div>
        ))}
      </div>

      <div className="user-timing-caption">
        <span className="user-timing-pulse" />
        You are <strong>{Math.round(progress)}%</strong> through {ad.antardasha_lord} sub-period
        {ad.end && <> · ends {fmtShort(ad.end)}</>}
      </div>

      {md?.lord && (
        <div className="user-timing-md">
          Within <strong>{md.lord}</strong>'s long cycle
          {md.end && <> until {fmtShort(md.end)}</>}
        </div>
      )}
    </section>
  );
}

function durationDays(startISO: string, endISO: string): number {
  if (!startISO || !endISO) return 0;
  const a = new Date(startISO).getTime();
  const b = new Date(endISO).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(0, (b - a) / (1000 * 60 * 60 * 24));
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtShort(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
}
