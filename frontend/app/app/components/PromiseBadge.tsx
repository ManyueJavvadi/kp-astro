"use client";

export default function PromiseBadge({ analysis }: { analysis: any }) {
  if (!analysis?.promise_analysis) return null;
  const p = analysis.promise_analysis;
  const strength = (p.promise_strength || "").toLowerCase();
  const isPromised = p.is_promised;
  const isConditional = !isPromised && (strength.includes("conditional") || strength.includes("partial") || strength.includes("weak"));

  if (isPromised) return (
    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "rgba(52,211,153,0.1)", color: "var(--green)", border: "0.5px solid rgba(52,211,153,0.2)" }}>✓ Promised</span>
  );
  if (isConditional) return (
    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "0.5px solid rgba(251,191,36,0.2)" }}>⚡ Conditional</span>
  );
  return (
    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "rgba(248,113,113,0.1)", color: "var(--red)", border: "0.5px solid rgba(248,113,113,0.2)" }}>✗ Not Promised</span>
  );
}
