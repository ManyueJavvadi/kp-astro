"use client";

import { useState } from "react";
import {
  ArrowRight,
  Search,
  Plus,
  Sparkles,
  User,
  Moon,
  Sun,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardLabel,
  CardContent,
  CardFooter,
  Input,
  Textarea,
  Badge,
  Kbd,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";

export default function V2PreviewPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12 border-b border-border pb-8">
          <div className="text-tiny uppercase tracking-wider text-gold font-medium mb-2">
            DevAstroAI v2 · Design System Preview
          </div>
          <h1 className="font-display text-hero font-bold text-text-primary mb-3">
            Design Primitives
          </h1>
          <p className="text-body-lg text-text-secondary max-w-2xl">
            Building blocks of the v2 interface — Button, Card, Input, Badge,
            Tabs, Dialog. All composable, accessible, and dark-first.
          </p>
        </div>

        {/* ── BUTTONS ── */}
        <Section title="Buttons" label="ATOMS · INTERACTIVE">
          <div className="flex flex-wrap gap-3 mb-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ai" leftIcon={<Sparkles />}>Ask AI</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Search"><Search /></Button>
            <Button size="icon-sm" variant="ghost"><Plus /></Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button leftIcon={<User />}>With Icon</Button>
            <Button rightIcon={<ArrowRight />}>Continue</Button>
          </div>
        </Section>

        {/* ── CARDS ── */}
        <Section title="Cards" label="SURFACES · CONTAINMENT">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardLabel className="mb-2">DEFAULT</CardLabel>
              <CardTitle className="mb-1">Ravi Kumar</CardTitle>
              <CardDescription>
                Sep 9, 2000 · Tenali, AP · Scorpio Lagna
              </CardDescription>
              <CardContent>
                <p className="text-small text-text-secondary mt-3">
                  Last consultation 14 days ago · 3 pending predictions
                </p>
              </CardContent>
            </Card>
            <Card variant="interactive">
              <CardLabel className="mb-2">INTERACTIVE</CardLabel>
              <CardTitle className="mb-1">Hover me</CardTitle>
              <CardDescription>
                Click card pattern — for list items
              </CardDescription>
            </Card>
            <Card variant="elevated">
              <CardLabel className="mb-2">ELEVATED</CardLabel>
              <CardTitle className="mb-1">Modal-like</CardTitle>
              <CardDescription>
                Higher surface + subtle shadow
              </CardDescription>
            </Card>
            <Card variant="glow">
              <CardLabel className="mb-2">HERO · GOLD GLOW</CardLabel>
              <CardTitle className="mb-1">🏆 Best Window</CardTitle>
              <CardDescription>
                Apr 22 · 07:14–07:38 · Venus SL · Score 98
              </CardDescription>
            </Card>
            <Card variant="ai">
              <CardLabel className="mb-2 text-ai">AI INSIGHT</CardLabel>
              <CardTitle className="mb-1">Saturn MD ending Aug 2027</CardTitle>
              <CardDescription>
                Career inflection point — ask about job stability
              </CardDescription>
            </Card>
            <Card>
              <CardHeader>
                <CardLabel>WITH HEADER + FOOTER</CardLabel>
                <CardTitle>Prediction Accuracy</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="font-display text-h1 text-gold">64%</div>
                <div className="text-small text-text-muted">87 predictions · 18 pending</div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight />}>View details</Button>
              </CardFooter>
            </Card>
          </div>
        </Section>

        {/* ── BADGES ── */}
        <Section title="Badges" label="ATOMS · METADATA">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge>Default</Badge>
            <Badge variant="gold">Promised</Badge>
            <Badge variant="success">Correct</Badge>
            <Badge variant="warning">Conditional</Badge>
            <Badge variant="error">Denied</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="ai"><Sparkles /> AI generated</Badge>
            <Badge variant="outline">Outlined</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge size="sm">Small</Badge>
            <Badge size="md">Medium</Badge>
            <Badge size="lg">Large</Badge>
          </div>
        </Section>

        {/* ── INPUTS ── */}
        <Section title="Inputs" label="ATOMS · FORM">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <div>
              <label className="text-small text-text-secondary mb-1.5 block">Default</label>
              <Input placeholder="Ravi Kumar" />
            </div>
            <div>
              <label className="text-small text-text-secondary mb-1.5 block">With icon</label>
              <Input placeholder="Search clients..." leftIcon={<Search />} />
            </div>
            <div>
              <label className="text-small text-text-secondary mb-1.5 block">With kbd hint</label>
              <Input placeholder="Search" leftIcon={<Search />} rightIcon={<Kbd>⌘K</Kbd>} />
            </div>
            <div>
              <label className="text-small text-text-secondary mb-1.5 block">Invalid</label>
              <Input placeholder="Invalid state" invalid defaultValue="bad data" />
            </div>
            <div>
              <label className="text-small text-text-secondary mb-1.5 block">Disabled</label>
              <Input placeholder="Disabled" disabled />
            </div>
            <div>
              <label className="text-small text-text-secondary mb-1.5 block">Sizes</label>
              <div className="flex flex-col gap-2">
                <Input size="sm" placeholder="Small" />
                <Input size="md" placeholder="Medium" />
                <Input size="lg" placeholder="Large" />
              </div>
            </div>
          </div>
          <div className="mt-4 max-w-3xl">
            <label className="text-small text-text-secondary mb-1.5 block">Textarea</label>
            <Textarea placeholder="Session notes — what did the client ask? What did you advise?" rows={3} />
          </div>
        </Section>

        {/* ── TABS ── */}
        <Section title="Tabs" label="NAVIGATION · VIEWS">
          <div className="mb-6">
            <div className="text-small text-text-muted mb-2">Underline (default)</div>
            <Tabs defaultValue="chart">
              <TabsList>
                <TabsTrigger value="chart"><Sun /> Chart</TabsTrigger>
                <TabsTrigger value="houses">Houses</TabsTrigger>
                <TabsTrigger value="dasha"><TrendingUp /> Dasha</TabsTrigger>
                <TabsTrigger value="analysis"><Sparkles /> Analysis</TabsTrigger>
              </TabsList>
              <TabsContent value="chart" className="p-4 bg-bg-surface rounded-md">
                Chart content — planet positions would go here
              </TabsContent>
              <TabsContent value="houses" className="p-4 bg-bg-surface rounded-md">
                Houses content
              </TabsContent>
              <TabsContent value="dasha" className="p-4 bg-bg-surface rounded-md">
                Dasha timeline
              </TabsContent>
              <TabsContent value="analysis" className="p-4 bg-bg-surface rounded-md">
                AI analysis
              </TabsContent>
            </Tabs>
          </div>
          <div className="mb-6">
            <div className="text-small text-text-muted mb-2">Pills</div>
            <Tabs defaultValue="today">
              <TabsList variant="pills">
                <TabsTrigger variant="pills" value="today">Today</TabsTrigger>
                <TabsTrigger variant="pills" value="week">This Week</TabsTrigger>
                <TabsTrigger variant="pills" value="month">This Month</TabsTrigger>
              </TabsList>
              <TabsContent value="today" className="p-4 bg-bg-surface rounded-md">Today's view</TabsContent>
              <TabsContent value="week" className="p-4 bg-bg-surface rounded-md">Weekly view</TabsContent>
              <TabsContent value="month" className="p-4 bg-bg-surface rounded-md">Monthly view</TabsContent>
            </Tabs>
          </div>
          <div>
            <div className="text-small text-text-muted mb-2">Segmented</div>
            <Tabs defaultValue="south">
              <TabsList variant="segmented">
                <TabsTrigger variant="segmented" value="north">North Indian</TabsTrigger>
                <TabsTrigger variant="segmented" value="south">South Indian</TabsTrigger>
                <TabsTrigger variant="segmented" value="east">East Indian</TabsTrigger>
              </TabsList>
              <TabsContent value="north" className="p-4 bg-bg-surface rounded-md">North chart</TabsContent>
              <TabsContent value="south" className="p-4 bg-bg-surface rounded-md">South chart</TabsContent>
              <TabsContent value="east" className="p-4 bg-bg-surface rounded-md">East chart</TabsContent>
            </Tabs>
          </div>
        </Section>

        {/* ── DIALOG ── */}
        <Section title="Dialog" label="OVERLAYS · FOCUS">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="primary" leftIcon={<Plus />}>Add Client</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add new client</DialogTitle>
                <DialogDescription>
                  Enter birth details. Chart will be auto-calculated.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <Input placeholder="Full name" />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="date" />
                  <Input type="time" />
                </div>
                <Input placeholder="Place of birth" leftIcon={<Search />} />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="primary">Create Client</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Section>

        {/* ── KBD ── */}
        <Section title="Keyboard Shortcuts" label="ATOMS · AFFORDANCES">
          <div className="flex flex-wrap gap-4 items-center text-small text-text-secondary">
            <span>Open palette <Kbd>⌘</Kbd><Kbd>K</Kbd></span>
            <span>New client <Kbd>c</Kbd></span>
            <span>New session <Kbd>n</Kbd></span>
            <span>Search <Kbd>/</Kbd></span>
            <span>Close <Kbd>Esc</Kbd></span>
            <span>Submit <Kbd>Enter</Kbd></span>
          </div>
        </Section>

        {/* ── TYPOGRAPHY ── */}
        <Section title="Typography" label="FOUNDATIONS · SCALE">
          <div className="space-y-4">
            <div>
              <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">HERO · 56/64 · 700</div>
              <div className="font-display text-hero font-bold">Ancient KP wisdom</div>
            </div>
            <div>
              <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">H1 · 36/44 · 600</div>
              <div className="font-display text-h1">Today's consultations</div>
            </div>
            <div>
              <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">H2 · 24/32 · 600</div>
              <div className="font-display text-h2">Client: Ravi Kumar</div>
            </div>
            <div>
              <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">H3 · 18/26 · 600</div>
              <div className="font-sans text-h3 font-semibold">Session notes</div>
            </div>
            <div>
              <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">BODY-LG · 16/24</div>
              <div className="text-body-lg">The Sub Lord of the 7th cusp signifies H2, H7, H11 — marriage is promised.</div>
            </div>
            <div>
              <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">BODY · 14/20 · (default)</div>
              <div className="text-body">Current Mahadasha: Saturn until Aug 2027. Antardasha: Mercury.</div>
            </div>
            <div>
              <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">SMALL · 12/16</div>
              <div className="text-small text-text-secondary">Birth Date: Sep 9, 2000 · Time: 12:31 PM</div>
            </div>
            <div>
              <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">TINY · 11/14 · label</div>
              <div className="text-tiny uppercase tracking-wider text-gold">PROMISED · 3 SIGNIFICATORS</div>
            </div>
            <div>
              <div className="text-tiny uppercase tracking-wider text-text-muted mb-1">MONO · tabular data</div>
              <div className="font-mono text-body">Moon: 2°03'24" Capricorn · Lat 16.24°N</div>
            </div>
          </div>
        </Section>

        {/* ── COLORS ── */}
        <Section title="Color Palette" label="FOUNDATIONS · TOKENS">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <Swatch name="bg-primary" color="bg-bg-primary" />
            <Swatch name="bg-surface" color="bg-bg-surface" />
            <Swatch name="bg-surface-2" color="bg-bg-surface-2" />
            <Swatch name="bg-elevated" color="bg-bg-elevated" />
            <Swatch name="bg-hover" color="bg-bg-hover" />
            <Swatch name="gold" color="bg-gold" dark />
            <Swatch name="gold-bright" color="bg-gold-bright" dark />
            <Swatch name="gold-dim" color="bg-gold-dim" dark />
            <Swatch name="ai" color="bg-ai" dark />
            <Swatch name="ai-bright" color="bg-ai-bright" dark />
            <Swatch name="success" color="bg-success" dark />
            <Swatch name="warning" color="bg-warning" dark />
            <Swatch name="error" color="bg-error" dark />
            <Swatch name="info" color="bg-info" dark />
          </div>
          <div className="mt-4 text-small text-text-muted">
            <AlertCircle className="inline size-3.5 mr-1" />
            All text colors pass WCAG AA contrast on bg-primary. Use <code className="font-mono text-gold">text-text-primary/secondary/muted/disabled</code>.
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  label,
  children,
}: {
  title: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-16">
      <div className="text-tiny uppercase tracking-wider text-gold font-medium mb-2">
        {label}
      </div>
      <h2 className="font-display text-h2 font-semibold text-text-primary mb-6 pb-2 border-b border-border">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatch({
  name,
  color,
  dark = false,
}: {
  name: string;
  color: string;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className={`${color} h-16 rounded-md border border-border`} />
      <div className="mt-2">
        <div className="font-mono text-tiny text-text-primary">{name}</div>
      </div>
    </div>
  );
}
