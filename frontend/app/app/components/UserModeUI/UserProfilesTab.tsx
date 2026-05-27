"use client";

/**
 * UserProfilesTab — Orbital Saved Profiles Manager for General User Mode (v6 revamp).
 *
 * Visual Highlights:
 *   1. Solar System orbital grid: Central active profile with glowing corona.
 *   2. Orbiting profile cards floating gently via CSS keyframes.
 *   3. Instant chart recomputations with warp animations.
 */

import React from "react";
import { User, Plus, Trash2, Edit, Check, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface ChartSession {
  id: string;
  name: string;
  date: string;
  time: string;
  ampm: string;
  place: string;
  gender: string;
  chartData?: any;
}

interface Props {
  savedSessions: ChartSession[];
  currentSessionId: string;
  onSwitchSession: (s: any) => Promise<void> | void;
  onRemoveSession: (id: string) => void;
  onAddSession: () => void;
}

export function UserProfilesTab({ savedSessions, currentSessionId, onSwitchSession, onRemoveSession, onAddSession }: Props) {
  const { t } = useLanguage();

  const handleEdit = (s: ChartSession) => {
    onSwitchSession(s);
    setTimeout(() => {
      const editBtn = document.querySelector(".user-hero-name button");
      if (editBtn) (editBtn as HTMLButtonElement).click();
    }, 200);
  };

  const activeProfile = savedSessions.find(s => s.id === currentSessionId);
  const orbitingProfiles = savedSessions.filter(s => s.id !== currentSessionId);

  return (
    <div style={{ maxWidth: 850, margin: "0 auto", paddingBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: "#f0f0f0", margin: "0 0 4px 0" }}>
            {t("Your Cosmic Circle", "నా కాస్మిక్ సర్కిల్")}
          </h2>
          <p style={{ fontSize: 12, color: "#888899", margin: 0 }}>
            {t("Add and manage up to 4 saved profiles in a floating orbital solar layout for instant chart switches.", "సర్కిల్‌లో 4 ప్రొఫైల్స్ వరకు సేవ్ చేసుకోవచ్చు. క్లిక్ చేసి వెంటనే చార్ట్ మార్చుకోండి.")}
          </p>
        </div>

        {savedSessions.length < 4 && (
          <button
            type="button"
            onClick={onAddSession}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8,
              fontSize: 12.5, fontWeight: 700,
              color: "#09090f", background: "#c9a96e",
              border: "none", cursor: "pointer", transition: "all 140ms ease",
              boxShadow: "0 4px 14px -4px rgba(201,169,110,0.5)"
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>{t("Add Member", "ప్రొఫైల్ జతచేయి")}</span>
          </button>
        )}
      </div>

      {/* ── SOLAR SYSTEM LAYOUT CONTAINER ── */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 24, alignItems: "center",
        padding: "24px 16px", background: "rgba(255,255,255,0.01)",
        border: "0.5px solid rgba(255,255,255,0.03)", borderRadius: 16, position: "relative"
      }} className="celestial-glass">
        
        {/* SVG background orbit tracks */}
        <svg style={{ position: "absolute", width: "90%", height: "90%", pointerEvents: "none", opacity: 0.15 }}>
          <ellipse cx="50%" cy="50%" rx="35%" ry="35%" stroke="#c9a96e" strokeWidth="0.75" fill="none" strokeDasharray="3 4" />
          <ellipse cx="50%" cy="50%" rx="48%" ry="48%" stroke="#c9a96e" strokeWidth="0.75" fill="none" strokeDasharray="3 4" />
        </svg>

        {/* 1. CENTRAL ACTIVE SUN PROFILE */}
        {activeProfile && (
          <div style={{
            zIndex: 10, textAlign: "center", position: "relative",
            background: "radial-gradient(circle, rgba(201,169,110,0.12) 0%, rgba(10,10,15,0.6) 80%)",
            border: "1.5px solid rgba(201,169,110,0.55)", borderRadius: 16, padding: "20px 32px",
            boxShadow: "0 0 32px rgba(201,169,110,0.15), inset 0 0 12px rgba(255,255,255,0.02)",
            maxWidth: 320, width: "100%"
          }}>
            {/* Glowing Sun Corona indicator */}
            <div style={{
              position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
              background: "rgba(16,185,129,0.15)", border: "0.5px solid rgba(16,185,129,0.4)",
              color: "#10b981", padding: "2px 8px", borderRadius: 4, fontSize: 8.5, fontWeight: 800,
              letterSpacing: "0.08em", display: "inline-flex", alignItems: "center", gap: 3
            }}>
              <Check size={10} strokeWidth={3} />
              {t("ACTIVE SOURCE", "సజీవ జాతకం")}
            </div>

            <div style={{
              width: 52, height: 52, borderRadius: "50%", background: "rgba(201,169,110,0.22)",
              border: "2px solid #c9a96e", display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Cinzel', serif", fontSize: 20, fontWeight: "bold", color: "#c9a96e",
              margin: "12px auto 10px", boxShadow: "0 0 16px rgba(201,169,110,0.25)"
            }}>
              {activeProfile.name[0]?.toUpperCase()}
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0", margin: "0 0 4px 0" }}>{activeProfile.name}</h3>
            <span style={{ fontSize: 9.5, color: "#888899", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {activeProfile.gender === "female" ? t("Female", "స్త్రీ") : t("Male", "పురుషుడు")}
            </span>

            <div style={{ fontSize: 11.5, color: "#a0a0b0", lineHeight: 1.4, margin: "10px 0 0", borderTop: "0.5px solid rgba(255,255,255,0.04)", paddingTop: 8 }}>
              <div>📅 {activeProfile.date} · ⏰ {activeProfile.time} {activeProfile.ampm}</div>
              <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginTop: 2 }}>📍 {activeProfile.place}</div>
            </div>

            {/* Quick Edit */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => handleEdit(activeProfile)}
                style={{
                  background: "transparent", border: "0.5px solid rgba(201,169,110,0.3)",
                  borderRadius: 6, padding: "3px 10px", fontSize: 10, color: "#c9a96e",
                  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3
                }}
              >
                <Edit size={10} />
                {t("Edit details", "సవరించు")}
              </button>
            </div>
          </div>
        )}

        {/* 2. ORBITING FAMILY & PARTNER PROFILE CARDS */}
        {orbitingProfiles.length > 0 || savedSessions.length < 4 ? (
          <div style={{
            width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16, marginTop: 14, zIndex: 11
          }}>
            {orbitingProfiles.map((s) => {
              const initials = s.name[0]?.toUpperCase() || "?";
              return (
                <div
                  key={s.id}
                  className="celestial-glass celestial-panel orbital-float-card"
                  style={{
                    borderRadius: 12, padding: "14px 18px",
                    border: "0.5px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.01)",
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                    minHeight: 140
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.03)",
                          border: "1.5px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: "bold", color: "#888899"
                        }}>
                          {initials}
                        </div>
                        <div>
                          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#f0f0f0", margin: 0 }}>{s.name}</h4>
                          <span style={{ fontSize: 9, color: "#888899", textTransform: "uppercase" }}>
                            {s.gender === "female" ? t("Female", "స్త్రీ") : t("Male", "పురుషుడు")}
                          </span>
                        </div>
                      </div>

                      {/* Deletion actions */}
                      <button
                        type="button"
                        onClick={() => onRemoveSession(s.id)}
                        style={{
                          background: "transparent", border: "none", color: "#555566", cursor: "pointer",
                          transition: "color 140ms"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = "#f43f5e"}
                        onMouseLeave={(e) => e.currentTarget.style.color = "#555566"}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div style={{ fontSize: 11, color: "#888899", lineHeight: 1.35, marginBottom: 8 }}>
                      <div>📅 {s.date} · ⏰ {s.time} {s.ampm}</div>
                      <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginTop: 1 }}>📍 {s.place}</div>
                    </div>
                  </div>

                  {/* Switch trigger */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "0.5px solid rgba(255,255,255,0.03)", paddingTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleEdit(s)}
                      style={{ background: "none", border: "none", color: "#888899", fontSize: 10, cursor: "pointer" }}
                    >
                      {t("Edit", "సవరించు")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSwitchSession(s)}
                      style={{
                        background: "transparent", border: "none", color: "#c9a96e",
                        fontSize: 10.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3
                      }}
                    >
                      {t("Switch", "చార్ట్ మార్చు")} →
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Symmetrical Orbit Add Member card */}
            {savedSessions.length < 4 && (
              <button
                type="button"
                onClick={onAddSession}
                className="celestial-glass orbital-float-card"
                style={{
                  borderRadius: 12, padding: "14px 18px",
                  border: "1px dashed rgba(201, 169, 110, 0.2)",
                  background: "rgba(201, 169, 110, 0.01)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 8, minHeight: 140, cursor: "pointer", transition: "all 140ms ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(201,169,110,0.4)";
                  e.currentTarget.style.background = "rgba(201,169,110,0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(201,169,110,0.2)";
                  e.currentTarget.style.background = "rgba(201,169,110,0.01)";
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", border: "1px dashed rgba(201,169,110,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#c9a96e"
                }}>
                  <Plus size={14} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e2e7", display: "block" }}>
                    {t("Add Family / Friend", "సర్కిల్‌లో జతచేయి")}
                  </span>
                  <span style={{ fontSize: 9.5, color: "#666677", display: "block", marginTop: 2 }}>
                    {t("Extend Cosmic Circle", "నూతన ప్రొఫైల్ జతచేయండి")}
                  </span>
                </div>
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
