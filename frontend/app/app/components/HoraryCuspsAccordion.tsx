"use client";
/**
 * PR A1.1d — All 12 cusps in one scrollable accordion.
 * Gives the astrologer the CSL of every house in one glance so they can
 * verify or challenge the primary-house-only Layer-2 analysis.
 *
 * Data source: `cusps[]` field in horary response (each entry already has
 * sign, nakshatra, star_lord, sub_lord, sub_lord_significations).
 */
import { useState } from "react";
import { PLANET_COLORS } from "./constants";

type CuspRow = {
  house: number;
  longitude: number;
  sign: string;
  nakshatra?: string;
  star_lord?: string;
  sub_lord?: string;
  sub_lord_significations?: number[];
};

export default function HoraryCuspsAccordion({ cusps }: { cusps: CuspRow[] }) {
  const [open, setOpen] = useState(false);
  if (!cusps || cusps.length === 0) return null;

  return (
    <div className="horary-cusps-card">
      <button
        type="button"
        className="horary-cusps-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="horary-cusps-eyebrow">All 12 cusps · full CSL chain</span>
        <span className="horary-cusps-chev" aria-hidden>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="horary-cusps-body">
          <div className="horary-cusps-sub">
            The sub-lord of every cusp drives that house&apos;s KP verdict.
            Useful when the primary-house CSL is weak and you want to check
            secondary gates.
          </div>
          <div className="horary-cusps-tablewrap">
            <table className="horary-cusps-table">
              <thead>
                <tr>
                  <th>House</th>
                  <th>Sign</th>
                  <th>Degree</th>
                  <th>Nakshatra</th>
                  <th>Star Lord</th>
                  <th>Sub Lord (CSL)</th>
                  <th>CSL signifies</th>
                </tr>
              </thead>
              <tbody>
                {cusps.map(c => (
                  <tr key={c.house}>
                    <td className="num">H{c.house}</td>
                    <td>{c.sign}</td>
                    <td className="num">{c.longitude?.toFixed(2)}°</td>
                    <td>{c.nakshatra ?? "—"}</td>
                    <td style={{ color: PLANET_COLORS[c.star_lord ?? ""] ?? "var(--text)" }}>
                      {c.star_lord ?? "—"}
                    </td>
                    <td style={{ color: PLANET_COLORS[c.sub_lord ?? ""] ?? "var(--accent)", fontWeight: 600 }}>
                      {c.sub_lord ?? "—"}
                    </td>
                    <td className="num">
                      {(c.sub_lord_significations ?? []).length > 0
                        ? `H${(c.sub_lord_significations ?? []).join(", H")}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
