"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import RasiChart from "../RasiChart";
import { useLanguage } from "@/lib/i18n";
import { PLANET_COLORS } from "../constants";

type Planet = {
  planet_en: string;
  planet_te?: string;
  planet_short: string;
  house?: string | number;
  sign_en?: string;
  sign_te?: string;
  degree_in_sign?: number;
  nakshatra_en?: string;
  star_lord_en?: string;
  sub_lord_en?: string;
  retrograde?: boolean;
};

type Cusp = {
  house?: number;
  sign_en?: string;
  sign_te?: string;
  degree_in_sign?: number;
};

interface MobileChartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  planets: Planet[];
  cusps: Cusp[];
  onHouseClick?: (h: number) => void;
  selectedHouse?: number | null;
}

export default function MobileChartSheet({
  isOpen,
  onClose,
  planets,
  cusps,
  onHouseClick,
  selectedHouse,
}: MobileChartSheetProps) {
  const { t, lang } = useLanguage();

  // Escape key support to close sheet
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scrolling when overlay is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter planets in selected house
  const planetsHere = selectedHouse
    ? planets.filter((p) => String(p.house) === String(selectedHouse))
    : [];

  const cusp = selectedHouse
    ? cusps.find((c) => c.house === selectedHouse)
    : null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="mobile-chart-sheet-backdrop" 
        onClick={onClose} 
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(9, 9, 15, 0.75)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 100,
          animation: "mobile-fade-in 200ms ease-out",
        }}
      />

      {/* Slide-up bottom sheet */}
      <div 
        className="mobile-chart-sheet"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: "85vh",
          background: "rgba(18, 18, 28, 0.96)",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTop: "1px solid rgba(201, 169, 110, 0.35)",
          boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.5)",
          padding: "1rem",
          zIndex: 101,
          overflowY: "auto",
          animation: "mobile-slide-up 240ms cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Swipe indicator handle */}
        <div 
          onClick={onClose}
          style={{
            width: 40,
            height: 4,
            background: "rgba(255, 255, 255, 0.15)",
            borderRadius: 2,
            margin: "0 auto 4px",
            cursor: "pointer",
          }}
        />

        {/* Header section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)", paddingBottom: 8 }}>
          <span style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
            {t("Natal Placements Overlay", "జన్మ జాతక పటం ఓవర్లే")}
          </span>
          <button 
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Chart frame */}
        <div style={{ flex: 1, padding: "0.25rem 0", display: "flex", justifyContent: "center" }}>
          <RasiChart
            planets={planets}
            cusps={cusps}
            onHouseClick={(h) => {
              if (onHouseClick) onHouseClick(h);
            }}
            selectedHouse={selectedHouse}
          />
        </div>

        {/* House details container at the bottom */}
        {selectedHouse && (
          <div style={{
            marginTop: 4,
            padding: "10px 12px",
            background: "rgba(201, 169, 110, 0.08)",
            border: "0.5px solid rgba(201, 169, 110, 0.25)",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            animation: "mobile-fade-in 180ms ease-out"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>
                {t(`House ${selectedHouse} Placements`, `భావం ${selectedHouse} గ్రహాలు`)}
              </span>
              {cusp && (
                <span style={{ fontSize: 9, color: "var(--muted)" }}>
                  {t("Sign:", "రాశి:")} <b>{lang === "en" ? cusp.sign_en : (cusp.sign_te || cusp.sign_en)}</b> · {Math.round(cusp.degree_in_sign ?? 0)}°
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {planetsHere.length === 0 ? (
                <span style={{ fontSize: 10.5, color: "var(--muted)", fontStyle: "italic" }}>
                  {t("No planets in this house", "ఈ భావంలో గ్రహాలు లేవు")}
                </span>
              ) : (
                planetsHere.map((p) => (
                  <span 
                    key={p.planet_en}
                    style={{
                      fontSize: 10.5,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: "rgba(255, 255, 255, 0.03)",
                      border: `0.5px solid ${PLANET_COLORS[p.planet_en] || "rgba(255,255,255,0.08)"}`,
                      color: PLANET_COLORS[p.planet_en] || "var(--text)",
                      fontWeight: 600
                    }}
                  >
                    {lang === "en" ? p.planet_en : (p.planet_te || p.planet_en)}{p.retrograde ? "℞" : ""} · {Math.round(p.degree_in_sign ?? 0)}°
                  </span>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Simple animations injection directly in component */}
      <style jsx global>{`
        @keyframes mobile-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mobile-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
