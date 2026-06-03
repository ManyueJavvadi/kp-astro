"use client";

/**
 * CuspsTable — the 12-row house-cusps table.
 *
 * Wave 15 (2026-06-03, item #7). Extracted from HousesTab so the same
 * functionality can be mirrored on the Chart tab's new Cusps pill —
 * astrologers see this view from BOTH tabs without losing either entry
 * point. Per the 2026-06-03 product discussion: "the whole cusps pill
 * functionality lets keep it here too."
 *
 * Pure presentational — no state of its own beyond what's passed.
 * Click any row → setSelectedHouse(houseNum). Tap-to-toggle: clicking
 * the already-selected row deselects it.
 *
 * Sacred-region note: pure JSX extraction. No engine call, no AI call,
 * no data shape change — reads the same `workspaceData.cusps` array
 * that HousesTab reads from.
 */

import { useLanguage } from "@/lib/i18n";
import { PLANET_COLORS } from "./constants";

interface CuspRow {
  house_num: number;
  house_te?: string;
  sign_en: string;
  sign_te?: string;
  degree_in_sign: number;
  nakshatra_en: string;
  nakshatra_te?: string;
  star_lord_en: string;
  star_lord_te?: string;
  sub_lord_en: string;
  sub_lord_te?: string;
}

export interface CuspsTableProps {
  cusps: CuspRow[];
  selectedHouse: number | null;
  setSelectedHouse: (
    h: number | null | ((prev: number | null) => number | null),
  ) => void;
}

export function CuspsTable({
  cusps,
  selectedHouse,
  setSelectedHouse,
}: CuspsTableProps) {
  const { t, lang } = useLanguage();
  return (
    <div style={{ flex: 1, overflowX: "auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--accent)",
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
          }}
        >
          {t("House cusps · KP key", "భావ కస్పాల పట్టిక · KP కీలకం")}
        </div>
        <div style={{ fontSize: 9, color: "var(--muted)" }}>
          {t("Click any row → house panel", "ఏదైనా అడ్డంగా నొక్కండి → భావ వివరాలు")}
        </div>
      </div>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12,
          minWidth: 500,
        }}
      >
        <thead>
          <tr>
            {[
              t("House", "భావం"),
              t("Sign", "రాశి"),
              t("Degree", "అంశం"),
              t("Nakshatra", "నక్షత్రం"),
              t("Star lord", "నక్షత్రాధిపతి"),
              t("Sub lord", "సబ్ లార్డ్"),
            ].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  color: "var(--muted)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  borderBottom: "0.5px solid var(--border)",
                  fontWeight: 400,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cusps.map((c) => {
            const signV = lang === "en" ? c.sign_en : c.sign_te ?? c.sign_en;
            const nakV =
              lang === "en"
                ? c.nakshatra_en
                : c.nakshatra_te ?? c.nakshatra_en;
            const starV =
              lang === "en"
                ? c.star_lord_en
                : c.star_lord_te ?? c.star_lord_en;
            const subV =
              lang === "en"
                ? c.sub_lord_en
                : c.sub_lord_te ?? c.sub_lord_en;
            const houseSub = lang === "en" ? "" : c.house_te ?? "";
            return (
              <tr
                key={c.house_num}
                onClick={() =>
                  setSelectedHouse(
                    selectedHouse === c.house_num ? null : c.house_num,
                  )
                }
                style={{
                  borderBottom: "0.5px solid rgba(201,169,110,.06)",
                  cursor: "pointer",
                  background:
                    selectedHouse === c.house_num
                      ? "rgba(201,169,110,0.08)"
                      : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (selectedHouse !== c.house_num)
                    e.currentTarget.style.background =
                      "rgba(201,169,110,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (selectedHouse !== c.house_num)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <td style={{ padding: "9px 10px" }}>
                  <span
                    style={{
                      color:
                        selectedHouse === c.house_num
                          ? "var(--accent2)"
                          : "var(--accent)",
                      fontWeight: 700,
                    }}
                  >
                    H{c.house_num}
                  </span>
                  {houseSub && (
                    <span
                      style={{
                        color: "var(--muted)",
                        fontSize: 10,
                        marginLeft: 4,
                      }}
                    >
                      {houseSub}
                    </span>
                  )}
                </td>
                <td style={{ padding: "9px 10px", color: "var(--text)" }}>
                  {signV}
                </td>
                <td
                  style={{
                    padding: "9px 10px",
                    color: "var(--muted)",
                    fontSize: 11,
                  }}
                >
                  {c.degree_in_sign.toFixed(2)}°
                </td>
                <td style={{ padding: "9px 10px", color: "var(--text)" }}>
                  {nakV}
                </td>
                <td
                  style={{
                    padding: "9px 10px",
                    color: PLANET_COLORS[c.star_lord_en] || "var(--text)",
                  }}
                >
                  {starV}
                </td>
                <td style={{ padding: "9px 10px" }}>
                  <span
                    style={{
                      background: "rgba(201,169,110,.1)",
                      color: "var(--accent)",
                      border: "0.5px solid var(--border2)",
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: 11,
                    }}
                  >
                    {subV}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
