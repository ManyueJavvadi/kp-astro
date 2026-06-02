"use client";

/**
 * /app/billing — subscription state stub.
 *
 * Phase 2 Slice 3 (2026-06-02). Pure stub for now. Real billing UI
 * (Razorpay checkout, current subscription state, top-up packs,
 * invoice history) lands in Phase 4. This page exists so the sidebar
 * nav doesn't 404 and so we can hand-test the route structure.
 */

import { CrmShell } from "../_components/CrmShell";
import { theme } from "@/lib/theme";
import { CreditCard, Calendar } from "lucide-react";

export default function BillingPage() {
  return (
    <CrmShell pageTitle="Billing">
      <div
        style={{
          maxWidth: 640,
          padding: 24,
          background: "rgba(7,11,20,0.5)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            background: "rgba(201,169,110,0.10)",
            color: "#c9a96e",
            borderRadius: 10,
            margin: "0 auto 14px",
          }}
        >
          <CreditCard size={22} />
        </div>
        <h2
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 20,
            margin: "0 0 8px",
            color: theme.text.primary,
          }}
        >
          Free during early access
        </h2>
        <p
          style={{
            fontSize: 13,
            color: theme.text.muted,
            margin: "0 auto 16px",
            maxWidth: 460,
            lineHeight: 1.6,
          }}
        >
          Everything is free for early KP astrologers while we polish the
          product. Subscriptions launch alongside the public release.
        </p>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            padding: "6px 12px",
            background: "rgba(0,200,255,0.06)",
            border: "1px solid rgba(0,200,255,0.18)",
            borderRadius: 999,
            color: "#00C8FF",
            fontWeight: 500,
          }}
        >
          <Calendar size={12} />
          Public launch: Sept 9, 2026
        </div>
      </div>

      {/* Pricing preview — sets expectations for when billing turns on */}
      <div style={{ marginTop: 28, maxWidth: 640 }}>
        <h3
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.text.muted,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            margin: "0 0 12px",
          }}
        >
          What's coming
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <PriceCard
            tier="Plus"
            monthly="₹499"
            features={[
              "All deterministic features",
              "Client portal pages",
              "5 AI questions / month",
              "PDF exports",
            ]}
          />
          <PriceCard
            tier="Pro"
            monthly="₹1,499"
            features={[
              "Everything in Plus",
              "30 AI questions / month",
              "Priority support",
              "Early access to new features",
            ]}
          />
        </div>
        <p
          style={{
            marginTop: 12,
            fontSize: 11,
            color: theme.text.muted,
            textAlign: "center",
          }}
        >
          + top-up packs (₹200 / ₹500 / ₹1000) — questions never expire.
        </p>
      </div>
    </CrmShell>
  );
}

function PriceCard({
  tier,
  monthly,
  features,
}: {
  tier: string;
  monthly: string;
  features: string[];
}) {
  return (
    <div
      style={{
        padding: 18,
        background: "rgba(7,11,20,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: theme.text.muted,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {tier}
      </div>
      <div
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 24,
          color: theme.text.primary,
          marginBottom: 10,
        }}
      >
        {monthly}
        <span style={{ fontSize: 13, color: theme.text.muted }}> / month</span>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {features.map((f) => (
          <li
            key={f}
            style={{
              fontSize: 12,
              color: theme.text.muted,
              marginBottom: 4,
              paddingLeft: 14,
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                color: "#c9a96e",
              }}
            >
              ✓
            </span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
