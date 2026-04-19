"use client";
import { useLanguage } from "@/lib/i18n";

export default function PanchangamCard({ data, title }: { data: any; title: string }) {
  const { lang, t } = useLanguage();
  const pickField = (base: string) =>
    lang === "en" ? (data?.[`${base}_en`] ?? data?.[base] ?? "") : (data?.[`${base}_te`] ?? data?.[base] ?? "");

  const varaV   = pickField("vara");
  const tithiV  = pickField("tithi");
  const nakV    = pickField("nakshatra");
  const yogaV   = pickField("yoga");
  const karanaV = pickField("karana");
  // Hora stays on the lord name; data.hora_lord is already localised (te default).
  const horaV   = lang === "en" ? (data?.hora_lord_en ?? data?.hora_lord ?? "") : (data?.hora_lord ?? data?.hora_lord_en ?? "");

  const items: { l: string; v: string; sub: string }[] = [
    { l: t("Weekday", "వారం"),  v: varaV,   sub: data?.vara_en ?? "" },
    { l: t("Tithi", "తిథి"),    v: tithiV,  sub: data?.tithi_num != null ? `#${data.tithi_num}` : "" },
    { l: t("Nakshatra", "నక్షత్రం"), v: nakV, sub: data?.nakshatra_en ?? "" },
    { l: t("Yoga", "యోగం"),     v: yogaV,   sub: data?.yoga_en ?? "" },
    { l: t("Karana", "కరణం"),  v: karanaV, sub: data?.karana_en ?? data?.karana ?? "" },
    { l: t("Hora", "హోర"),     v: horaV,   sub: t("Current hora", "ప్రస్తుత హోర") },
  ];

  return (
    <div style={{ background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "1rem" }}>
      <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.75rem" }}>
        {title} · {data?.date} · {data?.time}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {items.map(item => (
          <div key={item.l} style={{ background: "rgba(201,169,110,0.03)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "0.625rem" }}>
            <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 2 }}>{item.l}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{item.v}</div>
            <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 1 }}>{item.sub}</div>
          </div>
        ))}
      </div>
      {(data?.sunrise || data?.sunset) && (
        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
          {data.sunrise && (
            <div style={{ flex: 1, padding: "5px 8px", background: "rgba(251,191,36,0.06)", border: "0.5px solid rgba(251,191,36,0.2)", borderRadius: 6, textAlign: "center" as const }}>
              <div style={{ fontSize: 9, color: "#fbbf24", marginBottom: 1 }}>{t("Sunrise", "సూర్యోదయం")}</div>
              <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 500 }}>{data.sunrise}</div>
            </div>
          )}
          {data.sunset && (
            <div style={{ flex: 1, padding: "5px 8px", background: "rgba(251,191,36,0.06)", border: "0.5px solid rgba(251,191,36,0.2)", borderRadius: 6, textAlign: "center" as const }}>
              <div style={{ fontSize: 9, color: "#fbbf24", marginBottom: 1 }}>{t("Sunset", "సూర్యాస్తమయం")}</div>
              <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 500 }}>{data.sunset}</div>
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(248,113,113,0.08)", border: "0.5px solid rgba(248,113,113,0.2)", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#f87171" }}>{t("Rahu Kalam", "రాహుకాలం")}</span>
        <span style={{ fontSize: 12, color: "#f87171", fontWeight: 500 }}>{data?.rahu_kalam}</span>
        <span style={{ fontSize: 9, color: "rgba(248,113,113,0.6)" }}>{t("Avoid", "నివారించండి")}</span>
      </div>
    </div>
  );
}
