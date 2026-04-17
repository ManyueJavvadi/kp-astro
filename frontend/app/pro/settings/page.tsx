"use client";

import { LogOut, User, Shield, Bell, Palette, CreditCard } from "lucide-react";
import { TopBar } from "@/components/pro/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMe, useLogout } from "@/hooks/use-me";

export default function SettingsPage() {
  const { data: me } = useMe();
  const logout = useLogout();

  return (
    <>
      <TopBar title="Settings" tabs={[]} />
      <main className="px-6 pb-12 pt-6 max-w-[900px] mx-auto">
        <div className="mb-6">
          <div className="text-tiny uppercase tracking-wider text-gold mb-1">
            ACCOUNT SETTINGS
          </div>
          <h1 className="font-display text-h1 font-semibold text-text-primary">
            Settings
          </h1>
        </div>

        <div className="flex flex-col gap-4">
          <Card icon={<User />} title="Profile">
            <Row label="Full name" value={me?.full_name ?? "—"} />
            <Row label="Email" value={me?.email ?? "—"} />
            <Row
              label="Role"
              value={
                <Badge variant="gold" size="sm" className="capitalize">
                  {me?.role ?? "—"}
                </Badge>
              }
            />
            <Row
              label="Tier"
              value={
                <Badge size="sm" className="capitalize">
                  {me?.tier?.replace("_", " ") ?? "—"}
                </Badge>
              }
            />
            <div className="pt-3 mt-3 border-t border-border">
              <Button variant="secondary" size="sm" disabled>
                Edit profile
              </Button>
              <span className="text-tiny text-text-muted ml-3">
                Profile editor coming soon
              </span>
            </div>
          </Card>

          <Card icon={<CreditCard />} title="Billing & plan">
            <div className="text-small text-text-secondary leading-relaxed mb-3">
              You&apos;re on the{" "}
              <strong className="text-text-primary">
                {me?.tier?.replace("_", " ") ?? "free"}
              </strong>{" "}
              plan.
              {me?.tier === "free" &&
                " Upgrade to Astrologer Pro to unlock unlimited clients, AI queries, and branded PDFs."}
            </div>
            <Button variant="primary" size="sm" disabled>
              Upgrade plan
            </Button>
            <span className="text-tiny text-text-muted ml-3">
              Stripe checkout coming in launch phase
            </span>
          </Card>

          <Card icon={<Palette />} title="Appearance">
            <Row
              label="Theme"
              value={<Badge size="sm">Dark (default)</Badge>}
            />
            <Row
              label="Language"
              value={<Badge size="sm">English</Badge>}
            />
            <div className="text-tiny text-text-muted mt-2">
              Light mode + Telugu UI translation shipping next phase.
            </div>
          </Card>

          <Card icon={<Bell />} title="Notifications">
            <Row label="Session reminders" value="Email enabled (default)" />
            <Row label="Follow-up alerts" value="Daily digest" />
            <Row label="Marketing" value="Disabled" />
            <div className="text-tiny text-text-muted mt-2">
              Notification preferences editor shipping next phase.
            </div>
          </Card>

          <Card icon={<Shield />} title="Security">
            <Row label="Password" value="Set via Supabase" />
            <Row label="Two-factor auth" value="Not enabled" />
            <div className="text-tiny text-text-muted mt-2">
              Change password via{" "}
              <a href="#" className="text-gold underline">
                forgot password flow
              </a>
              .
            </div>
          </Card>

          <div className="rounded-xl p-5 bg-bg-surface border border-error/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-lg bg-error/10 border border-error/30 flex items-center justify-center text-error">
                <LogOut className="size-5" />
              </div>
              <div>
                <div className="text-body font-semibold text-text-primary">
                  Sign out
                </div>
                <div className="text-small text-text-muted">
                  You&apos;ll need to log in again next time
                </div>
              </div>
            </div>
            <Button
              variant="danger"
              leftIcon={<LogOut />}
              loading={logout.isPending}
              onClick={() => logout.mutate()}
            >
              Sign out of this device
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-bg-surface border border-border p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-10 rounded-lg bg-gold-glow border border-border-accent flex items-center justify-center text-gold">
          {icon}
        </div>
        <div className="font-display text-h3 font-semibold text-text-primary">
          {title}
        </div>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-small">
      <div className="text-text-muted">{label}</div>
      <div className="text-text-primary">{value}</div>
    </div>
  );
}
