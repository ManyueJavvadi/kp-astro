"use client";

/**
 * TaraChakraWidget — Navatara Chakra display (PR A1.3-fix-20).
 *
 * Compact widget showing today's Tara for the native + an expand button
 * that opens a full modal with the 27-nakshatra chakra and (when
 * available) transit-planet Taras.
 *
 * Backend payload shape (from /astrologer/workspace .tara_chakra):
 *   {
 *     chakra: {
 *       janma_nakshatra: string,
 *       janma_nakshatra_te: string,
 *       nakshatras: [
 *         { name, name_te, index, position_from_janma, cycle,
 *           tara_name, tara_name_te, tara_index, nature, effect, is_janma }
 *         ... 27 entries
 *       ]
 *     },
 *     today_tara?: { ...same shape as one entry }   // optional, from /analyze
 *     transit_taras?: [{ planet, current_nakshatra, tara_name, nature, effect }]
 *   }
 */

import React, { useState } from "react";
import { X, ChevronUp, Sparkles } from "lucide-react";

interface TaraEntry {
  name: string;
  name_te?: string;
  index: number;
  position_from_janma: number;
  cycle: number;
  tara_name: string;
  tara_name_te?: string;
  tara_index: number;
  nature: "favorable" | "unfavorable" | "neutral";
  effect: string;
  is_janma: boolean;
}

interface TaraTransit {
  planet: string;
  current_nakshatra: string;
  tara_name: string;
  nature: "favorable" | "unfavorable" | "neutral";
  effect: string;
}

interface Props {
  taraData: {
    chakra?: {
      janma_nakshatra?: string;
      janma_nakshatra_te?: string;
      nakshatras?: TaraEntry[];
    };
    today_tara?: TaraEntry;
    transit_taras?: TaraTransit[];
  };
  todayMoonNakshatra?: string;  // optional fallback if today_tara not in payload
}

function natureClass(n: string): string {
  if (n === "favorable") return "tara-favorable";
  if (n === "unfavorable") return "tara-unfavorable";
  return "tara-neutral";
}

export default function TaraChakraWidget({ taraData, todayMoonNakshatra }: Props) {
  const [expanded, setExpanded] = useState(false);

  const chakra = taraData?.chakra;
  if (!chakra?.nakshatras?.length) return null;

  const janma = chakra.janma_nakshatra || "Unknown";

  // Compute today's tara from local fallback if backend didn't provide one
  let today: TaraEntry | undefined = taraData.today_tara;
  if (!today && todayMoonNakshatra && chakra.nakshatras) {
    today = chakra.nakshatras.find((n) => n.name === todayMoonNakshatra);
  }

  return (
    <>
      <section className="tara-widget">
        <h3 className="tara-widget-title">Today&apos;s Tara · For You</h3>

        {today ? (
          <>
            <div className="tara-widget-row">
              <div>
                <span className="tara-widget-key">Moon in</span>{" "}
                <span className="tara-widget-value">{today.name}</span>
              </div>
              <span className={`tara-widget-tara ${natureClass(today.nature)}`}>
                <Sparkles size={14} /> {today.tara_name}
              </span>
            </div>
            <p className="tara-widget-effect">{today.effect}</p>
          </>
        ) : (
          <p className="tara-widget-effect">
            Today&apos;s Moon nakshatra not available. Showing your full Tara Chakra below.
          </p>
        )}

        <button
          type="button"
          className="tara-widget-expand"
          onClick={() => setExpanded(true)}
        >
          ▾ View full chakra · 27 nakshatras
        </button>
      </section>

      {expanded && (
        <div className="tara-modal-backdrop" onClick={() => setExpanded(false)}>
          <div
            className="tara-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="tara-modal-title"
          >
            <button
              type="button"
              className="tara-modal-close"
              onClick={() => setExpanded(false)}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <h2 id="tara-modal-title" className="tara-modal-title">
              Your Navatara Chakra
            </h2>
            <p className="tara-modal-sub">
              Janma Nakshatra: <strong>{janma}</strong>
              {chakra.janma_nakshatra_te ? ` (${chakra.janma_nakshatra_te})` : null}
              {" — 27 nakshatras grouped into 9 Tara categories"}
            </p>

            <div className="tara-grid">
              {chakra.nakshatras.map((n) => (
                <div
                  key={n.index}
                  className={`tara-cell ${natureClass(n.nature)}${n.is_janma ? " is-janma" : ""}${
                    today && n.index === today.index ? " is-current" : ""
                  }`}
                  title={n.effect}
                >
                  <div className="tara-cell-nakshatra">
                    {n.name}
                    {n.is_janma ? " ★" : ""}
                  </div>
                  <div className="tara-cell-tara">
                    {n.tara_name} · cycle {n.cycle}
                  </div>
                </div>
              ))}
            </div>

            {taraData.transit_taras && taraData.transit_taras.length > 0 && (
              <div className="tara-section">
                <h3 className="tara-section-title">Transit Taras (Right Now)</h3>
                <table className="tara-transit-table">
                  <thead>
                    <tr>
                      <th>Planet</th>
                      <th>Currently In</th>
                      <th>Tara</th>
                      <th>Nature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taraData.transit_taras.map((t) => (
                      <tr key={t.planet}>
                        <td>{t.planet}</td>
                        <td>{t.current_nakshatra}</td>
                        <td>
                          <span className={`tara-widget-tara ${natureClass(t.nature)}`}>
                            {t.tara_name}
                          </span>
                        </td>
                        <td style={{ color: "var(--muted)" }}>{t.nature}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="tara-section">
              <h3 className="tara-section-title">How to read your chakra</h3>
              <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                The 9 Taras divide the 27 nakshatras into recurring groups, repeating 3 times around the
                zodiac. Counting from your Janma Nakshatra ({janma}), each subsequent nakshatra falls
                into one of 9 categories: <strong>Janma</strong> (neutral), <strong>Sampat</strong> /{" "}
                <strong>Kshema</strong> / <strong>Sadhana</strong> / <strong>Mitra</strong> /{" "}
                <strong>Atimitra</strong> (favorable), and <strong>Vipat</strong> /{" "}
                <strong>Pratyari</strong> / <strong>Naidhana</strong> (unfavorable).
              </p>
              <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginTop: 8 }}>
                When the transiting Moon (or any planet) lands in a favorable Tara nakshatra for you, that
                day or period is generally auspicious for actions related to that planet&apos;s domain. Avoid
                major decisions when key planets transit through Vipat / Pratyari / Naidhana nakshatras.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
