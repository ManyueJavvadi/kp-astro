"use client";
import React, { useState } from "react";
import { PLANET_COLORS } from "../constants";
import { CSLChain, HOUSE_TOPICS } from "../../types/workspace";

interface CSLChainViewProps {
  houseNum: number;
  chain: CSLChain;
}

function PlanetTag({ name, house, rules }: { name: string; house: number; rules: number[] }) {
  const color = PLANET_COLORS[name] ?? "#c9a96e";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ color, fontWeight: 600 }}>{name}</span>
      <span style={{
        fontSize: 9, color: "#888899", background: "rgba(255,255,255,0.06)",
        border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "1px 4px",
      }}>
        H{house}
      </span>
      {rules.length > 0 && (
        <span style={{ fontSize: 10, color: "#666677" }}>
          owns {rules.map(r => `H${r}`).join(", ")}
        </span>
      )}
    </span>
  );
}

export default function CSLChainView({ houseNum, chain }: CSLChainViewProps) {
  const [expanded, setExpanded] = useState(true);
  const topic = HOUSE_TOPICS[houseNum] ?? "";

  const isSignified = chain.all_significations.includes(houseNum);

  return (
    <div style={{
      background: "var(--elevated)",
      border: "0.5px solid rgba(201,169,110,0.2)",
      borderRadius: 12,
      padding: "12px 14px",
      fontSize: 13,
    }}>
      {/* Header */}
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          cursor: "pointer", marginBottom: expanded ? 10 : 0,
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <div>
          <span style={{ fontWeight: 700, color: "#c9a96e" }}>H{houseNum}</span>
          {topic && (
            <span style={{ fontSize: 11, color: "#666677", marginLeft: 8 }}>
              — {topic}
            </span>
          )}
        </div>
        <span style={{ color: "#666677", fontSize: 11 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="fade-in">
          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 10 }} />

          {/* CSL Level 1 */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: "#888899", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              CSL (Sub-Lord)
            </span>
            <div style={{ marginTop: 4, fontSize: 12 }}>
              <PlanetTag name={chain.csl} house={chain.csl_house} rules={chain.csl_rules} />
            </div>
          </div>

          {/* Star Lord (level 2) */}
          <div style={{ marginBottom: 8, paddingLeft: 14, borderLeft: "2px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 10, color: "#666677" }}>↳ Star Lord</span>
            <div style={{ marginTop: 4, fontSize: 12 }}>
              <PlanetTag
                name={chain.csl_star_lord}
                house={chain.csl_star_lord_house}
                rules={chain.csl_star_lord_rules}
              />
            </div>
          </div>

          {/* Sub Lord (level 3) */}
          <div style={{ marginBottom: 10, paddingLeft: 28, borderLeft: "2px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 10, color: "#555566" }}>↳ Sub Lord</span>
            <div style={{ marginTop: 4, fontSize: 12 }}>
              <PlanetTag
                name={chain.csl_sub_lord}
                house={chain.csl_sub_lord_house}
                rules={chain.csl_sub_lord_rules}
              />
            </div>
          </div>

          {/* All significations */}
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: "#888899" }}>All Significations: </span>
            <span style={{ fontSize: 11, color: "#b0b0c0" }}>
              {chain.all_significations.sort((a, b) => a - b).map(h => `H${h}`).join(", ")}
            </span>
          </div>

          {/* Verdict */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 8,
            background: isSignified ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
            border: `0.5px solid ${isSignified ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
          }}>
            <span style={{ fontSize: 13 }}>{isSignified ? "✓" : "✗"}</span>
            <span style={{ fontSize: 11, color: isSignified ? "#34d399" : "#f87171", fontWeight: 600 }}>
              H{houseNum} {isSignified ? "SIGNIFIED" : "NOT SIGNIFIED"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
