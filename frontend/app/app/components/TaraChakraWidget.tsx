"use client";

/**
 * TaraChakraWidget — Tara Bala + Chandra Bala display (PR A1.3-fix-20 / fix-21).
 *
 * fix-21 changes:
 *   - Inline expand/collapse (was modal — user feedback that modal felt disconnected)
 *   - Adds Chandra Bala (12-sign Moon transit favorability — paired with Tara Bala)
 *   - Adds Pariharam (remedies) for unfavorable Taras
 *
 * Backend payload shape (from /astrologer/workspace .tara_chakra):
 *   {
 *     chakra: { janma_nakshatra, janma_nakshatra_te, nakshatras: [...27] },
 *     natal_moon_sign?: string,
 *     today_tara?: { name, tara_name, nature, effect, ... },
 *     today_chandra_bala?: { position_from_natal_moon, nature, effect, ... },
 *     transit_taras?: [{ planet, current_nakshatra, tara_name, nature, effect }],
 *     pariharam?: Record<TaraName, string>
 *   }
 */

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, Info } from "lucide-react";

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

interface ChandraBala {
  natal_moon_sign?: string;
  target_sign?: string;
  position_from_natal_moon?: number;
  nature?: "favorable" | "unfavorable" | "mild_unfavor";
  effect?: string;
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
    natal_moon_sign?: string;
    today_tara?: TaraEntry;
    today_chandra_bala?: ChandraBala;
    transit_taras?: TaraTransit[];
    pariharam?: Record<string, string>;
  };
  todayMoonNakshatra?: string;
}

function natureClass(n: string | undefined): string {
  if (n === "favorable") return "tara-favorable";
  if (n === "unfavorable") return "tara-unfavorable";
  if (n === "mild_unfavor") return "tara-neutral";
  return "tara-neutral";
}

export default function TaraChakraWidget({ taraData, todayMoonNakshatra }: Props) {
  const [expanded, setExpanded] = useState(false);

  const chakra = taraData?.chakra;
  if (!chakra?.nakshatras?.length) return null;

  const janma = chakra.janma_nakshatra || "Unknown";

  let today: TaraEntry | undefined = taraData.today_tara;
  if (!today && todayMoonNakshatra && chakra.nakshatras) {
    today = chakra.nakshatras.find((n) => n.name === todayMoonNakshatra);
  }
  const cb = taraData.today_chandra_bala;
  const pariharam = taraData.pariharam || {};

  // Compute combined verdict (both Tara Bala and Chandra Bala favorable = strongest)
  const combinedVerdict = (() => {
    if (!today || !cb?.nature) return null;
    const tFav = today.nature === "favorable";
    const cFav = cb.nature === "favorable";
    if (tFav && cFav) return { tier: "Strongly Favorable", desc: "Both Tara Bala and Chandra Bala favor today.", tone: "go" };
    if (!tFav && !cFav) return { tier: "Avoid Major Action", desc: "Both Tara Bala and Chandra Bala unfavorable.", tone: "no" };
    if (tFav) return { tier: "Mixed (Tara favors)", desc: "Tara Bala favorable but Chandra Bala mild — proceed with care.", tone: "wait" };
    return { tier: "Mixed (Chandra favors)", desc: "Chandra Bala favorable but Tara Bala unfavorable — apply pariharam if action essential.", tone: "wait" };
  })();

  return (
    <section className="tara-widget">
      <h3 className="tara-widget-title">Today&apos;s Tara &amp; Chandra Bala · For You</h3>

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
            {cb?.nature && (
              <span className={`tara-widget-tara ${natureClass(cb.nature)}`}>
                Chandra Bala · pos {cb.position_from_natal_moon}
              </span>
            )}
          </div>
          <p className="tara-widget-effect">{today.effect}</p>
          {cb?.effect && (
            <p className="tara-widget-effect" style={{ marginTop: 4 }}>
              <strong>Chandra Bala:</strong> {cb.effect}
            </p>
          )}
          {combinedVerdict && (
            <div className={`tara-combined tara-combined-${combinedVerdict.tone}`}>
              <strong>{combinedVerdict.tier}</strong> — {combinedVerdict.desc}
            </div>
          )}
          {today.nature !== "favorable" && pariharam[today.tara_name] && (
            <div className="tara-pariharam">
              <strong>Pariharam (remedy):</strong> {pariharam[today.tara_name]}
            </div>
          )}
        </>
      ) : (
        <p className="tara-widget-effect">
          Today&apos;s Moon nakshatra not available. View full chakra below.
        </p>
      )}

      <button
        type="button"
        className="tara-widget-expand"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <><ChevronUp size={12} /> Hide full chakra</> : <><ChevronDown size={12} /> View full chakra · 27 nakshatras</>}
      </button>

      {expanded && (
        <div className="tara-inline-content">
          <p className="tara-inline-sub">
            <strong>Janma Nakshatra:</strong> {janma}
            {chakra.janma_nakshatra_te ? ` (${chakra.janma_nakshatra_te})` : null}
            {taraData.natal_moon_sign ? ` · Natal Moon: ${taraData.natal_moon_sign}` : null}
            {" — 27 nakshatras grouped into 9 Tara categories."}
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
              <h4 className="tara-section-title">Transit Taras (Right Now)</h4>
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
            <h4 className="tara-section-title">
              <Info size={11} style={{ display: "inline", verticalAlign: "middle" }} /> Pariharam (Remedies for unfavorable Taras)
            </h4>
            <ul className="tara-pariharam-list">
              {["Janma", "Vipat", "Pratyari", "Naidhana"].map((tara) => (
                pariharam[tara] && pariharam[tara] !== "Favorable. No remedy needed." ? (
                  <li key={tara}>
                    <strong>{tara}:</strong> {pariharam[tara]}
                  </li>
                ) : null
              ))}
            </ul>
          </div>

          <div className="tara-section">
            <h4 className="tara-section-title">How to read your chakra</h4>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
              The 9 Taras divide the 27 nakshatras into recurring groups, repeating 3 times around the
              zodiac. Counting from your Janma Nakshatra ({janma}), each subsequent nakshatra falls into
              one of 9 categories: <strong>Janma</strong> (neutral), <strong>Sampat</strong> /{" "}
              <strong>Kshema</strong> / <strong>Sadhana</strong> / <strong>Mitra</strong> /{" "}
              <strong>Atimitra</strong> (favorable), and <strong>Vipat</strong> /{" "}
              <strong>Pratyari</strong> / <strong>Naidhana</strong> (unfavorable).
            </p>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginTop: 8 }}>
              <strong>Chandra Bala</strong> is the second axis: 12-sign favorability of current Moon
              relative to natal Moon. Positions <strong>1, 3, 6, 7, 10, 11</strong> from natal Moon are
              favorable; <strong>2, 5, 9</strong> unfavorable; <strong>4, 8, 12</strong> mildly unfavorable.
              Strongest muhurtha = both Tara Bala AND Chandra Bala favorable on the same day.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
