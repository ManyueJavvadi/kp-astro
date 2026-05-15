"use client";

/**
 * ChartSnapshot — at-a-glance chart card for the right panel.
 *
 * Shows the user the foundational facts of their chart in one quick read:
 *   - Lagna (sign + degree + nakshatra)
 *   - Current Mahadasha → Antardasha lord chain
 *   - Active period dates
 */

import React from "react";

interface Props {
  birthDetails: { name: string; date: string };
  chartData: any;
  currentDasha: any;
}

export function ChartSnapshot({ birthDetails, chartData, currentDasha }: Props) {
  // Lagna info comes from chart_summary.cusps.House_1
  const lagna = chartData?.chart?.cusps?.House_1 || chartData?.cusps?.House_1;
  const lagnaDeg = lagna ? (lagna.cusp_longitude ?? lagna.longitude ?? 0) % 30 : 0;

  const md = currentDasha?.mahadasha || currentDasha?.current_mahadasha;
  const ad = currentDasha?.antardasha || currentDasha?.current_antardasha;

  return (
    <section className="user-card user-snapshot">
      <h3 className="user-card-title">Your Chart</h3>

      {lagna && (
        <div className="user-snapshot-row">
          <span className="user-snapshot-key">Lagna</span>
          <div className="user-snapshot-val">
            <span className="user-snapshot-primary">
              {lagna.sign} {lagnaDeg.toFixed(2)}°
            </span>
            {lagna.nakshatra && (
              <span className="user-snapshot-secondary">{lagna.nakshatra}</span>
            )}
          </div>
        </div>
      )}

      {md?.lord && (
        <div className="user-snapshot-row">
          <span className="user-snapshot-key">Now in</span>
          <div className="user-snapshot-val">
            <span className="user-snapshot-primary user-snapshot-glow">
              {md.lord}
              {ad?.antardasha_lord && (
                <>
                  <span className="user-snapshot-arrow">→</span>
                  {ad.antardasha_lord}
                </>
              )}
            </span>
            {ad?.start && ad?.end && (
              <span className="user-snapshot-secondary">
                Until {fmtDate(ad.end)}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  // YYYY-MM-DD → "Jan 21, 2029"
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mo = parseInt(m[2], 10) - 1;
  const dy = parseInt(m[3], 10);
  return `${months[mo]} ${dy}, ${m[1]}`;
}
