"use client";
/**
 * PR A1.1d — Moon analysis callout.
 * KP treats Moon as the "chief significator of the mind". Her star lord
 * represents what the querent's attention is caught on; her sub lord
 * represents the subtle texture of that focus. Both have their own
 * signification chains worth surfacing.
 *
 * Data source: `moon_analysis` field in horary response.
 */
import { PLANET_COLORS } from "./constants";

type MoonAnalysis = {
  moon_house?: number;
  moon_sign?: string;
  moon_nakshatra?: string;
  star_lord?: string;
  star_lord_significations?: number[];
  sub_lord?: string;
  sub_lord_significations?: number[];
};

export default function HoraryMoonCard({ moon }: { moon: MoonAnalysis }) {
  if (!moon) return null;
  const slColor = PLANET_COLORS[moon.star_lord ?? ""] ?? "var(--accent)";
  const subColor = PLANET_COLORS[moon.sub_lord ?? ""] ?? "var(--accent)";

  return (
    <div className="horary-moon-card">
      <div className="horary-moon-head">
        <div className="horary-moon-eyebrow">Moon · Chief significator of the mind</div>
        <div className="horary-moon-title">
          {moon.moon_sign}
          {moon.moon_nakshatra && (
            <span className="horary-moon-nak"> · {moon.moon_nakshatra}</span>
          )}
          {moon.moon_house != null && (
            <span className="horary-moon-house"> · H{moon.moon_house}</span>
          )}
        </div>
      </div>
      <div className="horary-moon-grid">
        <div className="horary-moon-cell">
          <div className="horary-moon-cell-label">Star Lord</div>
          <div className="horary-moon-cell-planet" style={{ color: slColor }}>
            {moon.star_lord ?? "—"}
          </div>
          <div className="horary-moon-cell-sub">
            What the mind is focused on:
          </div>
          <div className="horary-moon-cell-sigs">
            {(moon.star_lord_significations ?? []).map(h => (
              <span key={h} className="horary-moon-sig-pill">H{h}</span>
            ))}
            {(moon.star_lord_significations ?? []).length === 0 && (
              <span className="horary-moon-sig-empty">—</span>
            )}
          </div>
        </div>
        <div className="horary-moon-cell">
          <div className="horary-moon-cell-label">Sub Lord</div>
          <div className="horary-moon-cell-planet" style={{ color: subColor }}>
            {moon.sub_lord ?? "—"}
          </div>
          <div className="horary-moon-cell-sub">
            Subtle texture of that focus:
          </div>
          <div className="horary-moon-cell-sigs">
            {(moon.sub_lord_significations ?? []).map(h => (
              <span key={h} className="horary-moon-sig-pill">H{h}</span>
            ))}
            {(moon.sub_lord_significations ?? []).length === 0 && (
              <span className="horary-moon-sig-empty">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
