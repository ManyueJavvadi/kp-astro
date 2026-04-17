"use client";

import { LogOut, User, Shield, Bell, Palette, CreditCard } from "lucide-react";
import { theme, styles } from "@/lib/theme";
import { useMe, useLogout } from "@/hooks/use-me";
import { ContentCard, SectionLabel } from "@/components/ui/content-card";

export default function SettingsPage() {
  const { data: me } = useMe();
  const logout = useLogout();

  return (
    <main
      style={{
        padding: "24px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        minHeight: "100vh",
        maxWidth: 800,
      }}
    >
      <header>
        <div style={styles.sectionLabel}>Account</div>
        <h1 style={styles.pageTitle}>Settings</h1>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SettingCard icon={<User size={18} />} label="Profile">
          <Row label="Full name" value={me?.full_name ?? "—"} />
          <Row label="Email" value={me?.email ?? "—"} />
          <Row
            label="Role"
            value={
              <span style={{ textTransform: "capitalize", color: theme.gold }}>
                {me?.role ?? "—"}
              </span>
            }
          />
          <Row
            label="Tier"
            value={
              <span style={{ textTransform: "capitalize" }}>
                {me?.tier?.replace("_", " ") ?? "—"}
              </span>
            }
          />
        </SettingCard>

        <SettingCard icon={<CreditCard size={18} />} label="Billing">
          <div style={{ fontSize: 13, color: theme.text.secondary, lineHeight: 1.5, marginBottom: 12 }}>
            You&apos;re on the{" "}
            <strong style={{ color: theme.text.primary }}>
              {me?.tier?.replace("_", " ") ?? "free"}
            </strong>{" "}
            plan.
          </div>
          <button disabled style={{ ...styles.primaryButton, opacity: 0.5, cursor: "not-allowed" }}>
            Upgrade plan
          </button>
          <div style={{ fontSize: 11, color: theme.text.dim, marginTop: 8 }}>
            Stripe checkout ships at launch.
          </div>
        </SettingCard>

        <SettingCard icon={<Palette size={18} />} label="Appearance">
          <Row label="Theme" value="Dark (default)" />
          <Row label="Language" value="English" />
        </SettingCard>

        <SettingCard icon={<Bell size={18} />} label="Notifications">
          <Row label="Session reminders" value="Email enabled (default)" />
          <Row label="Follow-up alerts" value="Daily digest" />
          <Row label="Marketing" value="Disabled" />
        </SettingCard>

        <SettingCard icon={<Shield size={18} />} label="Security">
          <Row label="Password" value="Set via Supabase" />
          <Row label="Two-factor auth" value="Not enabled" />
        </SettingCard>

        <ContentCard>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: "rgba(248,113,113,0.1)",
                color: theme.error,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LogOut size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary }}>
                Sign out
              </div>
              <div style={{ fontSize: 12, color: theme.text.muted }}>
                You&apos;ll need to log in again next time
              </div>
            </div>
          </div>
          <button
            onClick={() => logout.mutate()}
            style={{
              ...styles.secondaryButton,
              backgroundColor: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.25)",
              color: theme.error,
            }}
          >
            <LogOut size={14} /> Sign out of this device
          </button>
        </ContentCard>
      </div>
    </main>
  );
}

function SettingCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <ContentCard>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: "rgba(201,169,110,0.1)",
            color: theme.gold,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
        <SectionLabel>{label}</SectionLabel>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{children}</div>
    </ContentCard>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 13,
        padding: "6px 0",
        borderBottom: theme.border.default,
      }}
    >
      <div style={{ color: theme.text.muted }}>{label}</div>
      <div style={{ color: theme.text.primary }}>{value}</div>
    </div>
  );
}
