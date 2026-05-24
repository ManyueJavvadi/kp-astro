"use client";
import React, { useState } from "react";
import { PLANET_COLORS } from "../constants";
import { CSLChain, HOUSE_TOPICS } from "../../types/workspace";
import { ChevronRight, Award, AlertCircle, Sparkles } from "lucide-react";

interface CSLChainViewProps {
  houseNum: number;
  chain: CSLChain;
}

export default function CSLChainView({ houseNum, chain }: CSLChainViewProps) {
  const [expanded, setExpanded] = useState(true);
  const topic = HOUSE_TOPICS[houseNum] ?? "";
  const isSignified = chain.all_significations.includes(houseNum);

  // Define house groups for visual favorability / denial colors (traditional KP significations)
  // E.g., Career (H10) is favored by H2, H6, H10, H11, denied by H5, H8, H12.
  // Marriage (H7) is favored by H2, H7, H11, denied by H1, H6, H10.
  // We can color code based on these rules dynamically!
  const getHouseRole = (h: number) => {
    if (houseNum === 7) {
      if ([2, 7, 11].includes(h)) return "favorable";
      if ([1, 6, 10].includes(h)) return "denial";
    } else if (houseNum === 10) {
      if ([2, 6, 10, 11].includes(h)) return "favorable";
      if ([5, 8, 12].includes(h)) return "denial";
    } else if (houseNum === 11) {
      if ([2, 11].includes(h)) return "favorable";
      if ([8, 12].includes(h)) return "denial";
    }
    return "neutral";
  };

  const getPlanetColor = (name: string) => PLANET_COLORS[name] ?? "#c9a96e";

  return (
    <div className="celestial-panel" style={{
      borderRadius: 14,
      padding: "16px 18px",
      fontSize: 13,
      marginBottom: 12,
      background: "rgba(18, 18, 28, 0.45)",
      border: "0.5px solid rgba(201, 169, 110, 0.15)",
    }}>
      {/* Header */}
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          cursor: "pointer", marginBottom: expanded ? 14 : 0,
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: "rgba(201, 169, 110, 0.12)",
            border: "1px solid rgba(201, 169, 110, 0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#c9a96e"
          }}>
            H{houseNum}
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
              {topic || `House ${houseNum}`}
            </span>
            <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 6 }}>
              CSL Chain
            </span>
          </div>
        </div>
        <span style={{ color: "#666677", fontSize: 11 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="fade-in">
          {/* 4-Step CSL Chain Flowchart */}
          <div style={{ overflowX: "auto", paddingBottom: 10, margin: "10px 0" }}>
            <div className="csl-node-row" style={{ minWidth: 460 }}>
              
              {/* Step 1: CSL Planet */}
              <div className="csl-node-box is-active-cusp">
                <span className="csl-node-title">Step 1: CSL</span>
                <span className="csl-node-value" style={{ color: getPlanetColor(chain.csl) }}>
                  {chain.csl}
                </span>
                <span className="csl-node-sub">
                  Pos: H{chain.csl_house}
                </span>
                {chain.csl_rules.length > 0 && (
                  <span style={{ fontSize: 8, color: "var(--muted)", marginTop: 2 }}>
                    Owns: {chain.csl_rules.map(r => `H${r}`).join(",")}
                  </span>
                )}
              </div>

              <ChevronRight size={14} className="csl-node-arrow" />

              {/* Step 2: Star Lord */}
              <div className="csl-node-box">
                <span className="csl-node-title">Step 2: Star Lord</span>
                <span className="csl-node-value" style={{ color: getPlanetColor(chain.csl_star_lord) }}>
                  {chain.csl_star_lord}
                </span>
                <span className="csl-node-sub">
                  Pos: H{chain.csl_star_lord_house}
                </span>
                {chain.csl_star_lord_rules.length > 0 && (
                  <span style={{ fontSize: 8, color: "var(--muted)", marginTop: 2 }}>
                    Owns: {chain.csl_star_lord_rules.map(r => `H${r}`).join(",")}
                  </span>
                )}
              </div>

              <ChevronRight size={14} className="csl-node-arrow" />

              {/* Step 3: Sub Lord */}
              <div className="csl-node-box">
                <span className="csl-node-title">Step 3: Sub Lord</span>
                <span className="csl-node-value" style={{ color: getPlanetColor(chain.csl_sub_lord) }}>
                  {chain.csl_sub_lord}
                </span>
                <span className="csl-node-sub">
                  Pos: H{chain.csl_sub_lord_house}
                </span>
                {chain.csl_sub_lord_rules.length > 0 && (
                  <span style={{ fontSize: 8, color: "var(--muted)", marginTop: 2 }}>
                    Owns: {chain.csl_sub_lord_rules.map(r => `H${r}`).join(",")}
                  </span>
                )}
              </div>

              <ChevronRight size={14} className="csl-node-arrow" />

              {/* Step 4: CSL Verdict */}
              <div className={`csl-node-box ${isSignified ? "is-favorable" : "is-denial"}`}>
                <span className="csl-node-title">Step 4: Verdict</span>
                <span className="csl-node-value" style={{ 
                  color: isSignified ? "#10B981" : "#F59E0B",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  marginTop: 4
                }}>
                  {isSignified ? <Sparkles size={12} /> : <AlertCircle size={12} />}
                  {isSignified ? "Promised" : "Weak"}
                </span>
                <span className="csl-node-sub" style={{ opacity: 0.8, color: isSignified ? "#34d399" : "#f87171" }}>
                  {isSignified ? "CSL connects H" + houseNum : "No direct link"}
                </span>
              </div>

            </div>
          </div>

          {/* All significations with favorable/denial highlights */}
          <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "0.5px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              All Activated Houses via CSL
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {chain.all_significations.sort((a, b) => a - b).map(h => {
                const role = getHouseRole(h);
                let badgeStyle: React.CSSProperties = {
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                  color: "var(--text)",
                };
                if (role === "favorable") {
                  badgeStyle = {
                    ...badgeStyle,
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "0.5px solid rgba(16, 185, 129, 0.4)",
                    color: "#34d399",
                    fontWeight: 600,
                  };
                } else if (role === "denial") {
                  badgeStyle = {
                    ...badgeStyle,
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "0.5px solid rgba(239, 68, 68, 0.4)",
                    color: "#f87171",
                    fontWeight: 600,
                  };
                }
                return (
                  <span key={h} style={badgeStyle} title={role !== "neutral" ? `${role} house for H${houseNum}` : ""}>
                    H{h}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Verdict description text */}
          <div style={{ 
            marginTop: 12, 
            display: "flex", 
            gap: 8, 
            alignItems: "flex-start",
            padding: "8px 10px", 
            borderRadius: 8, 
            background: isSignified ? "rgba(52,211,153,0.05)" : "rgba(245,158,11,0.05)",
            border: `0.5px solid ${isSignified ? "rgba(52,211,153,0.15)" : "rgba(245,158,11,0.15)"}`,
            fontSize: 11,
            color: "var(--text)"
          }}>
            {isSignified ? (
              <>
                <Award size={14} style={{ color: "#34d399", flexShrink: 0, marginTop: 1 }} />
                <span>
                  <b>Strong Promise:</b> CSL {chain.csl} is connected to H{houseNum} via Star Lord {chain.csl_star_lord}. This guarantees positive events related to {topic.toLowerCase()} during favorable dasha periods.
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={14} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                <span>
                  <b>Weak/Conditional:</b> CSL does not directly signify H{houseNum} through its star lord. Any promise for {topic.toLowerCase()} is conditional and requires strong transits or secondary RPs to activate.
                </span>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
