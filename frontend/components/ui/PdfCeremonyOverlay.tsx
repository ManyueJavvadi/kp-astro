// Phase 16 — Moment #5: PDF export ceremony.
//
// When the user clicks PDF download, the backend takes 5-15 seconds
// to compute the 14-section astrologer-grade report. Without this
// overlay, they stare at a tiny spinner in the corner. With it, the
// wait becomes a ritual: a parchment scroll unfurls, a wax seal stamps,
// and rotating subtitles describe what's happening.
//
// Choreography (loops while pdfLoading is true):
//   0.0s         Overlay fades in (radial dark gradient, backdrop blur)
//   0.0 - 0.8s   Parchment scroll unfurls horizontally (scaleX 0 -> 1)
//   0.8 - 1.4s   Gold wax seal stamps in center (scale 0 -> 1.15 -> 1)
//   1.4s+        Subtitle text rotates every 2s through phrases:
//                  "Drafting your chart..."
//                  "Computing 4-level significators..."
//                  "Sealing the report..."
//                  "Almost ready..."
//   N.Ns         When pdfLoading flips false, checkmark replaces seal,
//                overlay fades out over 0.6s
//
// Usage:
//   <PdfCeremonyOverlay show={pdfLoading} />
//
// The component is always mounted; it self-shows/hides based on `show`
// via AnimatePresence so the exit animation plays cleanly.

"use client";

import React, { useEffect, useState } from "react";
import { motion as m, AnimatePresence } from "motion/react";
import { useLanguage } from "@/lib/i18n";

const PHRASES: { en: string; te: string }[] = [
  { en: "Drafting your chart…", te: "మీ చార్ట్ తయారవుతోంది…" },
  { en: "Computing 4-level significators…", te: "4 స్థాయుల సూచకులు లెక్కిస్తోంది…" },
  { en: "Mapping CSL chains for every house…", te: "ప్రతి భావం CSL చైన్ మ్యాప్ చేస్తోంది…" },
  { en: "Sealing the report…", te: "నివేదికను ముద్రిస్తోంది…" },
  { en: "Almost ready…", te: "దాదాపు సిద్ధం…" },
];

interface PdfCeremonyOverlayProps {
  show: boolean;
}

export function PdfCeremonyOverlay({ show }: PdfCeremonyOverlayProps) {
  const { t } = useLanguage();
  const [phraseIdx, setPhraseIdx] = useState(0);

  // Rotate phrase every 2.4s while visible
  useEffect(() => {
    if (!show) {
      setPhraseIdx(0);
      return;
    }
    const id = window.setInterval(() => {
      setPhraseIdx((i) => (i + 1) % PHRASES.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <m.div
          key="pdf-ceremony"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 280,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(ellipse at center, rgba(7,11,20,0.85) 0%, rgba(7,11,20,0.96) 100%)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            pointerEvents: "none",
          }}
          aria-live="polite"
          aria-label={t("Generating PDF report", "PDF నివేదిక సిద్ధమవుతోంది")}
        >
          {/* Parchment scroll — unfurls horizontally with the wax seal in middle. */}
          <div
            style={{
              position: "relative",
              width: 320,
              height: 160,
              marginBottom: 32,
            }}
          >
            {/* Scroll body — radial gradient cream paper */}
            <m.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "absolute",
                top: 20,
                left: 0,
                right: 0,
                height: 120,
                background:
                  "linear-gradient(180deg, #2a221a 0%, #1f1812 50%, #2a221a 100%)",
                border: "1px solid rgba(201,169,110,0.3)",
                borderRadius: 4,
                boxShadow:
                  "inset 0 1px 0 rgba(231,201,138,0.15), 0 8px 32px rgba(0,0,0,0.6)",
                transformOrigin: "center",
                overflow: "hidden",
              }}
            >
              {/* Faint horizontal "lines of text" on the parchment */}
              {[20, 35, 55, 70, 90, 105].map((y, i) => (
                <m.div
                  key={i}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.7 + i * 0.08,
                    ease: "easeOut",
                  }}
                  style={{
                    position: "absolute",
                    top: y,
                    left: 24,
                    right: 76,
                    height: 1.5,
                    background: "rgba(201,169,110,0.18)",
                    transformOrigin: "left center",
                  }}
                />
              ))}
            </m.div>

            {/* Scroll spindles (rod ends) — left + right */}
            {(["left", "right"] as const).map((side, i) => (
              <m.div
                key={side}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.3,
                  delay: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  position: "absolute",
                  top: 12,
                  [side]: -8,
                  width: 14,
                  height: 136,
                  background:
                    "linear-gradient(90deg, #6b5938 0%, #c9a96e 50%, #6b5938 100%)",
                  borderRadius: 7,
                  boxShadow: "0 0 8px rgba(201,169,110,0.4)",
                }}
              />
            ))}

            {/* Gold wax seal — stamps on top after scroll unfurls */}
            <m.div
              initial={{ scale: 0, opacity: 0, rotate: -25 }}
              animate={{
                scale: [0, 1.18, 1],
                opacity: 1,
                rotate: 0,
              }}
              transition={{
                duration: 0.7,
                delay: 1.0,
                ease: [0.16, 1, 0.3, 1],
                scale: { times: [0, 0.55, 1] },
              }}
              style={{
                position: "absolute",
                top: 38,
                left: "50%",
                marginLeft: -42,
                width: 84,
                height: 84,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 35% 30%, #fde9a8 0%, #c9a96e 45%, #6b5938 100%)",
                border: "2px solid rgba(255, 230, 160, 0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'DM Serif Display', serif",
                fontSize: 26,
                fontWeight: 400,
                color: "#2a1f0a",
                boxShadow:
                  "0 4px 20px rgba(201,169,110,0.6), inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.4)",
                textShadow: "0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              ॐ
            </m.div>
          </div>

          {/* Rotating subtitle */}
          <AnimatePresence mode="wait">
            <m.div
              key={`phrase-${phraseIdx}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 18,
                color: "#f0e8d8",
                letterSpacing: "-0.005em",
                marginTop: 8,
                textAlign: "center",
                minHeight: 28,
              }}
            >
              {t(PHRASES[phraseIdx].en, PHRASES[phraseIdx].te)}
            </m.div>
          </AnimatePresence>

          {/* Eyebrow label */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.4 }}
            style={{
              fontSize: 10,
              color: "#c9a96e",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 500,
              marginTop: 14,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {t(
              "Astrologer-grade KP report · 14 sections",
              "ఆస్ట్రాలజర్ స్థాయి KP నివేదిక · 14 విభాగాలు"
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
