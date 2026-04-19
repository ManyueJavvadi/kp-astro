import * as React from "react";

/**
 * ContentCard — exact spec.
 * bg:      #0F172A
 * border:  1px solid rgba(255,255,255,0.06)
 * radius:  8px
 * padding: 20px (configurable via `padding` prop; "none" for list-style cards)
 */
export function ContentCard({
  children,
  padding = "md",
  style,
}: {
  children: React.ReactNode;
  padding?: "none" | "md";
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        backgroundColor: "#0F172A",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
        padding: padding === "md" ? 20 : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Label shown above a section. 10px, uppercase, tracked.
 */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: "#475569",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 500,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Section heading. 16px / 600 / #F1F5F9.
 */
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 16,
        fontWeight: 600,
        color: "#F1F5F9",
        lineHeight: 1.3,
      }}
    >
      {children}
    </div>
  );
}
