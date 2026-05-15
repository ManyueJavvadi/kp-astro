"use client";

/**
 * TrustBand — engine info footer.
 *
 * Compact visible-on-trust signals. KP-strict, KP-New ayanamsa,
 * Placidus houses. No cost claims, no marketing — just credibility
 * markers a discerning user expects to see.
 */

import React from "react";
import { ShieldCheck } from "lucide-react";

export function TrustBand() {
  return (
    <section className="user-trust">
      <div className="user-trust-row">
        <ShieldCheck size={12} />
        <span>KP New (VP291) · Placidus · KSK-strict</span>
      </div>
      <div className="user-trust-sub">
        Calibrated against published KP literature. Not a fortune-teller —
        the chart shows structural inclinations, not certainties.
      </div>
    </section>
  );
}
