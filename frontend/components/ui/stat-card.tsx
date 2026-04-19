import * as React from "react";

/**
 * Stat card — exact spec (no creative decisions).
 *
 * bg:             #111827
 * border:         1px solid rgba(255,255,255,0.08)
 * border-radius:  8px
 * padding:        16px
 * shadow:         0 1px 3px rgba(0,0,0,0.3)
 *
 * Label:  10px / weight 500 / color #64748B / letter-spacing 0.08em / uppercase
 * Value:  28px / weight 600 / color #F1F5F9
 * Sub:    12px / color #475569
 *
 * Label + Value + Sub are ALL inside the card container (siblings of each other,
 * not siblings of the card).
 */
export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: "#111827",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "8px",
        padding: "16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 500,
          color: "#64748B",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "28px",
          fontWeight: 600,
          color: "#F1F5F9",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "12px",
            color: "#475569",
            marginTop: "6px",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
