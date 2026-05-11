import Link from 'next/link';
import { UserPlus, GraduationCap, FileText, ArrowRight } from 'lucide-react';
import { Button, Card, CardContent, MonoLabel } from '@levelup/ui';

const ACTIONS = [
  {
    href: '/admin/people?invite=open',
    eyebrow: 'PEOPLE',
    title: 'Enroll an employee',
    description: 'Send a Kapitus employee an enrollment email.',
    icon: UserPlus,
  },
  {
    href: '/admin/learning',
    eyebrow: 'LEARNING',
    title: 'Assign a learning path',
    description: 'Distribute curated AI training to a department or role.',
    icon: GraduationCap,
  },
  {
    href: '/admin/policy',
    eyebrow: 'GOVERNANCE',
    title: 'Update AI policy',
    description: 'Publish the rules of engagement for AI usage.',
    icon: FileText,
  },
] as const;

export function QuickActions() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ACTIONS.map(({ href, eyebrow, title, description, icon: Icon }) => (
        <Link key={href} href={href} className="group block focus-visible:outline-none">
          <Card className="h-full">
            <CardContent className="flex h-full flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <MonoLabel>{eyebrow}</MonoLabel>
                <Icon className="h-4 w-4 text-paper-500" aria-hidden="true" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-serif text-h2 italic text-paper-100">{title}</h3>
                <p className="text-body-sm text-paper-300">{description}</p>
              </div>
              <div className="flex items-center gap-2 font-mono text-mono-sm uppercase tracking-[0.05em] text-signal transition-colors group-hover:text-paper-100">
                <span>OPEN</span>
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function QuickActionsButton() {
  return (
    <Button asChild variant="primary">
      <Link href="/admin/people?invite=open">
        <UserPlus className="mr-2 h-4 w-4" />
        Enroll employee
      </Link>
    </Button>
  );
}
