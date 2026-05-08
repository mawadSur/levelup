import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  GridLines,
  Input,
  Label,
  MissionNumber,
  MonoLabel,
  NumberedSection,
  Progress,
  Separator,
  Skeleton,
} from '@levelup/ui';

export const metadata = {
  title: 'Mission Brief / Design System',
};

const swatches: Array<{ name: string; token: string; rgb: string; bg: string; fg: string }> = [
  {
    name: 'ink-900',
    token: '--ink-900',
    rgb: 'rgb(8 9 14)',
    bg: 'bg-ink-900',
    fg: 'text-paper-100',
  },
  {
    name: 'ink-800',
    token: '--ink-800',
    rgb: 'rgb(14 16 25)',
    bg: 'bg-ink-800',
    fg: 'text-paper-100',
  },
  {
    name: 'ink-700',
    token: '--ink-700',
    rgb: 'rgb(22 26 38)',
    bg: 'bg-ink-700',
    fg: 'text-paper-100',
  },
  {
    name: 'ink-600',
    token: '--ink-600',
    rgb: 'rgb(34 40 56)',
    bg: 'bg-ink-600',
    fg: 'text-paper-100',
  },
  {
    name: 'ink-500',
    token: '--ink-500',
    rgb: 'rgb(58 66 86)',
    bg: 'bg-ink-500',
    fg: 'text-paper-100',
  },
  {
    name: 'paper-100',
    token: '--paper-100',
    rgb: 'rgb(244 241 234)',
    bg: 'bg-paper-100',
    fg: 'text-ink-900',
  },
  {
    name: 'paper-300',
    token: '--paper-300',
    rgb: 'rgb(169 166 160)',
    bg: 'bg-paper-300',
    fg: 'text-ink-900',
  },
  {
    name: 'paper-500',
    token: '--paper-500',
    rgb: 'rgb(92 90 86)',
    bg: 'bg-paper-500',
    fg: 'text-paper-100',
  },
  { name: 'signal', token: '--signal', rgb: 'rgb(255 179 0)', bg: 'bg-signal', fg: 'text-ink-900' },
  {
    name: 'signal-dim',
    token: '--signal-dim',
    rgb: 'rgb(167 122 35)',
    bg: 'bg-signal-dim',
    fg: 'text-ink-900',
  },
  {
    name: 'success',
    token: '--success',
    rgb: 'rgb(61 206 171)',
    bg: 'bg-success',
    fg: 'text-ink-900',
  },
  {
    name: 'warning',
    token: '--warning',
    rgb: 'rgb(230 138 46)',
    bg: 'bg-warning',
    fg: 'text-ink-900',
  },
  {
    name: 'danger',
    token: '--danger',
    rgb: 'rgb(230 57 70)',
    bg: 'bg-danger',
    fg: 'text-paper-100',
  },
];

export default function DesignPreviewPage() {
  return (
    <div className="relative min-h-screen bg-ink-900 text-paper-100">
      <div className="mx-auto max-w-content px-8 py-16">
        <header className="mb-20 animate-mission-in">
          <MonoLabel className="mb-6 block text-paper-500">Mission Brief / Design System</MonoLabel>
          <h1 className="font-serif text-display-xl text-paper-100">LevelUp Mission Brief.</h1>
          <p className="mt-6 max-w-reading text-body-lg text-paper-300">
            Editorial gravity meets aerospace precision. A typographic instrument for serious
            operators training their teams to use AI safely.
          </p>
        </header>

        <div className="space-y-24">
          <NumberedSection
            numeral="I."
            eyebrow="Typography"
            className="animate-mission-in delay-75"
          >
            <div className="space-y-10">
              <div>
                <MonoLabel className="mb-3 block">display-xl · Instrument Serif</MonoLabel>
                <p className="font-serif text-display-xl">Train every operator.</p>
              </div>
              <div>
                <MonoLabel className="mb-3 block">display-lg · Instrument Serif</MonoLabel>
                <p className="font-serif text-display-lg">Mission ready in thirty days.</p>
              </div>
              <div>
                <MonoLabel className="mb-3 block">display-md · Instrument Serif</MonoLabel>
                <p className="font-serif text-display-md">Section opens.</p>
              </div>
              <Separator />
              <div>
                <MonoLabel className="mb-3 block">h1 · Geist Sans 500</MonoLabel>
                <p className="font-sans font-medium text-h1">Page heading</p>
              </div>
              <div>
                <MonoLabel className="mb-3 block">h2 · Geist Sans 500</MonoLabel>
                <p className="font-sans font-medium text-h2">Section heading</p>
              </div>
              <div>
                <MonoLabel className="mb-3 block">h3 · Geist Sans 500</MonoLabel>
                <p className="font-sans font-medium text-h3">Subsection heading</p>
              </div>
              <Separator />
              <div className="max-w-reading">
                <MonoLabel className="mb-3 block">body-lg · Geist Sans 400</MonoLabel>
                <p className="text-body-lg text-paper-100">
                  Long-form prose at 1.0625rem with line-height 1.7. Editorial cadence designed for
                  sustained reading on instructor briefs and policy documents.
                </p>
              </div>
              <div className="max-w-reading">
                <MonoLabel className="mb-3 block">body · Geist Sans 400</MonoLabel>
                <p className="text-body text-paper-100">
                  Standard interface body copy at 1rem. Used across forms, dialogs, and dense
                  console surfaces.
                </p>
              </div>
              <div className="max-w-reading">
                <MonoLabel className="mb-3 block">body-sm · Geist Sans 400</MonoLabel>
                <p className="text-body-sm text-paper-300">
                  Microcopy and helper text at 0.875rem. Sits on paper-300 for hierarchy.
                </p>
              </div>
              <Separator />
              <div>
                <MonoLabel className="mb-3 block">mono · Geist Mono 400</MonoLabel>
                <p className="font-mono text-mono uppercase tracking-[0.05em] text-paper-100">
                  PATH-001 · MISSION-CONTROL · 2026.05
                </p>
              </div>
              <div>
                <MonoLabel className="mb-3 block">mono-sm · Geist Mono 400</MonoLabel>
                <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
                  STATUS · ACTIVE · UPDATED 14:22 UTC
                </p>
              </div>
            </div>
          </NumberedSection>

          <NumberedSection numeral="II." eyebrow="Color" className="animate-mission-in delay-100">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {swatches.map((s) => (
                <div key={s.name} className="space-y-2">
                  <div
                    className={`flex h-20 w-20 items-end justify-start rounded-md border border-ink-600 p-2 ${s.bg} ${s.fg}`}
                  >
                    <span className="font-mono text-mono-sm uppercase tracking-[0.05em]">
                      {s.name}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-mono text-mono-sm text-paper-100">{s.token}</p>
                    <p className="font-mono text-mono-sm text-paper-500">{s.rgb}</p>
                  </div>
                </div>
              ))}
            </div>
          </NumberedSection>

          <NumberedSection
            numeral="III."
            eyebrow="Primitives"
            className="animate-mission-in delay-150"
          >
            <div className="space-y-12">
              <div>
                <MonoLabel className="mb-4 block">Button — variants</MonoLabel>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary">Primary action</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Destructive</Button>
                  <Button variant="primary" size="sm">
                    Small
                  </Button>
                  <Button variant="primary" size="lg">
                    Large
                  </Button>
                  <Button variant="primary" disabled>
                    Disabled
                  </Button>
                </div>
              </div>

              <div>
                <MonoLabel className="mb-4 block">
                  Card — hover lifts to signal-dim border
                </MonoLabel>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Path 01 — Foundations</CardTitle>
                      <CardDescription>Twelve lessons. Estimated 4h 20m.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Progress value={42} className="mb-4" />
                      <div className="flex items-center justify-between">
                        <MonoLabel>42% complete</MonoLabel>
                        <Badge variant="signal">Active</Badge>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Path 02 — Sensitive data</CardTitle>
                      <CardDescription>Six lessons. Estimated 2h 10m.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-sm bg-ink-700 p-4">
                        <MonoLabel tone="default">Subdivided block · ink-700</MonoLabel>
                        <p className="mt-2 text-body-sm text-paper-300">
                          Internal sections sit on ink-700 to create visual layering.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <MonoLabel className="mb-4 block">Input + Label</MonoLabel>
                <div className="grid max-w-reading gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Operator email</Label>
                    <Input id="email" type="email" placeholder="commander@levelup.ai" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Mission code</Label>
                    <Input id="code" placeholder="LU-2026-XXXX" />
                  </div>
                </div>
              </div>

              <div>
                <MonoLabel className="mb-4 block">Badge — variants</MonoLabel>
                <div className="flex flex-wrap gap-3">
                  <Badge>Default</Badge>
                  <Badge variant="signal">Signal</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="danger">Danger</Badge>
                </div>
              </div>

              <div>
                <MonoLabel className="mb-4 block">Progress — 2px track</MonoLabel>
                <div className="space-y-3">
                  <Progress value={20} />
                  <Progress value={60} />
                  <Progress value={92} />
                </div>
              </div>

              <div>
                <MonoLabel className="mb-4 block">Skeleton — shimmer between ink-700/600</MonoLabel>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>

              <div>
                <MonoLabel className="mb-4 block">Avatar — 4px chipped square</MonoLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>MA</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>MA</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>MA</AvatarFallback>
                  </Avatar>
                </div>
              </div>

              <div>
                <MonoLabel className="mb-4 block">MissionNumber — count-up on mount</MonoLabel>
                <div className="grid gap-6 md:grid-cols-4">
                  <div>
                    <MonoLabel className="mb-2 block">Operators</MonoLabel>
                    <p className="font-serif text-display-md text-paper-100">
                      <MissionNumber value={1248} format="integer" />
                    </p>
                  </div>
                  <div>
                    <MonoLabel className="mb-2 block">Completion</MonoLabel>
                    <p className="font-serif text-display-md text-signal">
                      <MissionNumber value={0.842} format="percent" />
                    </p>
                  </div>
                  <div>
                    <MonoLabel className="mb-2 block">ARR</MonoLabel>
                    <p className="font-serif text-display-md text-paper-100">
                      <MissionNumber value={184000} format="currency" />
                    </p>
                  </div>
                  <div>
                    <MonoLabel className="mb-2 block">Sessions</MonoLabel>
                    <p className="font-serif text-display-md text-paper-100">
                      <MissionNumber value={42100} format="compact" />
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <MonoLabel className="mb-4 block">MonoLabel — tones</MonoLabel>
                <div className="flex flex-wrap gap-6">
                  <MonoLabel>Default · paper-300</MonoLabel>
                  <MonoLabel tone="signal">Signal · amber</MonoLabel>
                  <MonoLabel tone="success">Success · teal</MonoLabel>
                  <MonoLabel tone="danger">Danger · red</MonoLabel>
                </div>
              </div>

              <div>
                <MonoLabel className="mb-4 block">Separator — plain + decorated</MonoLabel>
                <div className="space-y-6">
                  <Separator />
                  <Separator decorated />
                </div>
              </div>
            </div>
          </NumberedSection>

          <NumberedSection numeral="IV." eyebrow="Motion" className="animate-mission-in delay-200">
            <div className="space-y-8">
              <div>
                <MonoLabel className="mb-4 block">
                  Page entrance — translateY 8px, 240ms ease-mission
                </MonoLabel>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="animate-mission-in rounded-md border border-ink-600 bg-ink-800 p-4">
                    <MonoLabel>Item I</MonoLabel>
                  </div>
                  <div className="animate-mission-in rounded-md border border-ink-600 bg-ink-800 p-4 delay-75">
                    <MonoLabel>Item II</MonoLabel>
                  </div>
                  <div className="animate-mission-in rounded-md border border-ink-600 bg-ink-800 p-4 delay-150">
                    <MonoLabel>Item III</MonoLabel>
                  </div>
                </div>
              </div>
              <div>
                <MonoLabel className="mb-4 block">Hover — Card lift + signal-dim border</MonoLabel>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-body-sm text-paper-300">Hover me to feel the 2px lift.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-body-sm text-paper-300">
                        Border tracks signal-dim on hover.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </NumberedSection>

          <NumberedSection numeral="V." eyebrow="Layout" className="animate-mission-in delay-300">
            <div className="space-y-10">
              <div>
                <MonoLabel className="mb-4 block">
                  GridLines — blueprint backdrop, 64px cells
                </MonoLabel>
                <div className="relative h-48 overflow-hidden rounded-md border border-ink-600 bg-ink-800">
                  <GridLines />
                  <div className="relative flex h-full items-center justify-center">
                    <p className="font-serif text-display-md text-paper-100">Operator surface</p>
                  </div>
                </div>
              </div>
              <div>
                <MonoLabel className="mb-4 block">GridLines dense — 32px cells</MonoLabel>
                <div className="relative h-32 overflow-hidden rounded-md border border-ink-600 bg-ink-800">
                  <GridLines dense />
                </div>
              </div>
              <div>
                <MonoLabel className="mb-4 block">max-w-content — 1200px</MonoLabel>
                <div className="rounded-md border border-ink-600 bg-ink-800 p-6">
                  <div className="mx-auto h-12 max-w-content rounded-sm bg-ink-700" />
                </div>
              </div>
              <div>
                <MonoLabel className="mb-4 block">
                  max-w-reading — 760px (long-form prose)
                </MonoLabel>
                <div className="rounded-md border border-ink-600 bg-ink-800 p-6">
                  <div className="mx-auto h-12 max-w-reading rounded-sm bg-ink-700" />
                </div>
              </div>
            </div>
          </NumberedSection>
        </div>

        <footer className="mt-24 border-t border-ink-600 pt-8">
          <div className="flex items-center justify-between">
            <MonoLabel className="text-paper-500">END OF BRIEF</MonoLabel>
            <MonoLabel className="text-paper-500">v1 · 2026.05</MonoLabel>
          </div>
        </footer>
      </div>
    </div>
  );
}
