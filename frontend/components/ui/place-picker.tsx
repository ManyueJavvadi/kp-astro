"use client";

/**
 * Place autocomplete — types a city name, fetches Nominatim, surfaces
 * suggestions, fills lat/lon/timezone into form state on select.
 *
 * Uses OpenStreetMap Nominatim (free, no API key). Respects their usage
 * policy by debouncing 400ms and setting a User-Agent identifier.
 */

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { theme, styles } from "@/lib/theme";

export type PlacePick = {
  display: string;
  lat: number;
  lon: number;
  timezone?: string;
};

export function PlacePicker({
  value,
  onChange,
  placeholder = "Hyderabad, Telangana, India",
  inputStyle,
}: {
  value: string;
  onChange: (place: string, pick: PlacePick | null) => void;
  placeholder?: string;
  inputStyle?: React.CSSProperties;
}) {
  const [suggestions, setSuggestions] = useState<PlacePick[]>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "searching" | "found" | "none">(
    "idle"
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const search = async (q: string) => {
    if (q.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      setStatus("idle");
      return;
    }
    setStatus("searching");
    try {
      const res = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q,
            format: "json",
            limit: 5,
            addressdetails: 1,
            "accept-language": "en",
          },
          headers: { "User-Agent": "DevAstroAI/1.0" },
        }
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: PlacePick[] = (res.data as any[]).map((f) => {
        const addr = f.address || {};
        const first =
          addr.suburb ||
          addr.city_district ||
          addr.city ||
          addr.town ||
          addr.village ||
          addr.county ||
          (f.display_name as string).split(",")[0];
        const display = [first, addr.state, addr.country]
          .filter(Boolean)
          .join(", ");
        return {
          display,
          lat: parseFloat(f.lat),
          lon: parseFloat(f.lon),
        };
      });
      setSuggestions(items);
      setOpen(items.length > 0);
      setStatus(items.length > 0 ? "idle" : "none");
    } catch {
      setStatus("none");
    }
  };

  const handleInput = (val: string) => {
    onChange(val, null);
    setStatus("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const pick = async (s: PlacePick) => {
    setOpen(false);
    setSuggestions([]);
    setStatus("found");
    // PR A1.3-fix-24 — was reading `res.data.timezone.ianaTimeId` which
    // bigdatacloud DOES NOT return — the actual field path is
    // `data.localityInfo.administrative[i].timeZone.name` (per
    // `frontend/hooks/useLiveLocation.ts` which uses it correctly).
    // The bug meant tz was ALWAYS undefined → every place pick fell back
    // to Asia/Kolkata regardless of where the user picked. Real chart-
    // accuracy bug for non-IST birthplaces.
    let tz: string | undefined;
    try {
      const res = await axios.get(
        "https://api.bigdatacloud.net/data/reverse-geocode-client",
        {
          params: {
            latitude: s.lat,
            longitude: s.lon,
            localityLanguage: "en",
          },
        }
      );
      const d = res.data;
      const resolved =
        (d?.localityInfo?.administrative || []).find(
          (a: { timeZone?: { name?: string } }) => a?.timeZone?.name
        )?.timeZone?.name
        || d?.timeZone?.name;
      if (typeof resolved === "string" && resolved.length > 0) {
        tz = resolved;
      }
    } catch {
      /* silent; caller can fall back to Asia/Kolkata */
    }
    onChange(s.display, { ...s, timezone: tz });
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        placeholder={placeholder}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
        style={{
          ...styles.input,
          paddingRight: 36,
          ...inputStyle,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: 10,
          transform: "translateY(-50%)",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          color: theme.text.muted,
        }}
      >
        {status === "searching" ? (
          <Loader2
            size={14}
            style={{ animation: "spin 1s linear infinite" }}
          />
        ) : status === "found" ? (
          <CheckCircle2 size={14} color={theme.success} />
        ) : (
          <MapPin size={14} />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 30,
            maxHeight: 240,
            overflowY: "auto",
            backgroundColor: theme.bg.elevated,
            border: theme.border.strong,
            borderRadius: theme.radius.md,
            boxShadow: theme.shadow.lg,
            padding: 4,
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={`${s.lat}-${s.lon}-${i}`}
              type="button"
              onClick={() => pick(s)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: theme.radius.sm,
                background: "transparent",
                border: "none",
                color: theme.text.primary,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.04)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <MapPin size={13} color={theme.gold} style={{ flexShrink: 0 }} />
              <span>{s.display}</span>
            </button>
          ))}
        </div>
      )}

      {status === "none" && value.length >= 3 && (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: theme.text.muted,
          }}
        >
          No matches — try adding the state or country (e.g. &quot;Tenali,
          Andhra Pradesh&quot;).
        </div>
      )}
    </div>
  );
}
