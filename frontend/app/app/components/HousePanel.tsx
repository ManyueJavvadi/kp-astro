"use client";
import { useLanguage } from "@/lib/i18n";
import { useSheetDrag } from "@/hooks/useSheetDrag";
import { useIsMobile } from "@/hooks/useIsMobile";
import { X } from "lucide-react";
// Phase 16 — Moment #4: dramatic morph + sacred geometry mandala + stagger
// reveal of CSL chain rows on house open.
import React from "react";
import { motion as m } from "motion/react";
// Phase 9.10b — shared content body so the mobile BottomDrawer can
// render the same KP-doctrine sections this panel shows on desktop.
import HousePanelContent, { houseTopicLabel } from "./workspace/HousePanelContent";

export default function HousePanel({ house, cusps, significators, planets, rulingPlanets, antardashas, onClose }: {
  house: number; cusps: any[]; significators: any;
  planets: any[]; rulingPlanets: string[]; antardashas: any[]; onClose: () => void;
}) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  // PR21 — mobile swipe-down-to-dismiss on the header drag zone.
  // Desktop keeps the close button only.
  const { dragProps, sheetStyle } = useSheetDrag({ onClose });

  return (
    // Phase 16 — Moment #4: HousePanel entrance is now a spring-scale +
    // fade, with a slowly-rotating sacred-geometry mandala behind the
    // header. key={house} forces remount on house change so the
    // entrance plays each time you click a different house.
    <m.div
      key={`house-panel-${house}`}
      className="house-panel-overlay"
      initial={{ opacity: 0, scale: 0.94, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 240,
        damping: 26,
        mass: 0.9,
      }}
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border2)",
        borderRadius: 12,
        overflow: "hidden",
        minWidth: 240,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        ...(isMobile ? sheetStyle : {}),
      }}
    >
      {/* Mobile drag handle — hidden on desktop via CSS. */}
      {isMobile && (
        <div className="house-panel-drag-zone" {...dragProps}>
          <div className="house-panel-handle" />
        </div>
      )}

      {/* Header — with the sacred geometry mandala behind it */}
      <div
        className="house-panel-header"
        {...(isMobile ? dragProps : {})}
        style={{
          position: "relative",
          padding: "14px 14px 12px",
          borderBottom: "0.5px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background:
            "linear-gradient(135deg, rgba(201,169,110,0.08) 0%, rgba(201,169,110,0.02) 100%)",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Sacred-geometry mandala — a slowly-rotating SVG with 12 spokes,
            sitting absolute behind the header text. Subtle gold opacity. */}
        <m.svg
          aria-hidden
          viewBox="-100 -100 200 200"
          width={140}
          height={140}
          initial={{ opacity: 0, rotate: -25 }}
          animate={{ opacity: 0.18, rotate: 0 }}
          transition={{
            opacity: { duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] },
            rotate: { duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] },
          }}
          style={{
            position: "absolute",
            right: -36,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        >
          {/* 12 spokes — one per zodiac house */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const x1 = Math.cos(angle) * 25;
            const y1 = Math.sin(angle) * 25;
            const x2 = Math.cos(angle) * 90;
            const y2 = Math.sin(angle) * 90;
            return (
              <m.line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#c9a96e"
                strokeWidth={0.6}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 0.5,
                  delay: 0.15 + i * 0.03,
                  ease: "easeOut",
                }}
              />
            );
          })}
          {/* Outer + inner rings */}
          <circle cx={0} cy={0} r={90} fill="none" stroke="#c9a96e" strokeWidth={0.5} />
          <circle cx={0} cy={0} r={60} fill="none" stroke="#c9a96e" strokeWidth={0.4} />
          <circle cx={0} cy={0} r={25} fill="none" stroke="#c9a96e" strokeWidth={0.5} />
        </m.svg>

        {/* Header content — BIG H{N} number with serif treatment */}
        <m.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: "relative", zIndex: 1 }}
        >
          <div
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 22,
              fontWeight: 400,
              color: "var(--accent)",
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            H{house}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--muted)",
              marginTop: 3,
              letterSpacing: "0.06em",
            }}
          >
            {houseTopicLabel(house)}
          </div>
        </m.div>
        <button
          onClick={onClose}
          className="house-panel-close"
          aria-label={t("Close", "మూసివేయండి")}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            padding: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Phase 16 — content fades + slides up after the mandala settles
          (delay 0.32s so it follows the sacred geometry reveal).
          Phase 9.10b — body content extracted to HousePanelContent so
          the mobile BottomDrawer can render the same sections. */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          delay: 0.32,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{ padding: "12px 14px", overflowY: "auto", flex: 1 }}
      >
        <HousePanelContent
          house={house}
          cusps={cusps}
          significators={significators}
          planets={planets}
          rulingPlanets={rulingPlanets}
          antardashas={antardashas}
          bottomPad={isMobile ? 80 : 24}
        />
      </m.div>
    </m.div>
  );
}
