import type { Metadata } from 'next';
import { MonoLabel, NumberedSection } from '@levelup/ui';
import { paths as pathsApi } from '@/lib/api';
import { PlaybookSection } from '@/components/learn/playbooks/playbook-section';
import type { LearningPath } from '@/lib/api/paths';

export const metadata: Metadata = {
  title: 'Playbooks — LevelUp AI Academy',
};

// ---------------------------------------------------------------------------
// Role → display section mapping
// The targetRole field on LearningPath is a free-form string; we normalise it
// to one of our canonical section keys via a case-insensitive lookup.
// ---------------------------------------------------------------------------

const ROLE_SECTIONS: Array<{
  key: string;
  label: string;
  description: string;
  matchers: string[];
}> = [
  {
    key: 'sales',
    label: 'For Sales',
    description:
      'Close more deals with AI-assisted prospecting, objection handling, and follow-ups.',
    matchers: ['sales'],
  },
  {
    key: 'marketing',
    label: 'For Marketing',
    description: 'Generate campaigns, copy, and insights faster.',
    matchers: ['marketing'],
  },
  {
    key: 'support',
    label: 'For Customer Support',
    description: 'Resolve tickets faster and draft empathetic responses at scale.',
    matchers: ['support', 'customer support', 'cx'],
  },
  {
    key: 'hr',
    label: 'For HR',
    description: 'Streamline hiring, onboarding, and employee communications.',
    matchers: ['hr', 'human resources', 'people ops'],
  },
  {
    key: 'finance',
    label: 'For Finance',
    description: 'Automate analysis, reporting, and scenario planning.',
    matchers: ['finance', 'financial'],
  },
  {
    key: 'manager',
    label: 'For Managers',
    description: 'Coach your team, run better 1-on-1s, and write performance reviews.',
    matchers: ['manager', 'management'],
  },
  {
    key: 'exec',
    label: 'For Executives',
    description: 'Drive strategy, synthesise reports, and communicate decisions clearly.',
    matchers: ['exec', 'executive', 'c-suite', 'leadership'],
  },
  {
    key: 'engineering',
    label: 'For Software Engineers',
    description: 'Ship faster with AI pair-programming, code review, and documentation.',
    matchers: ['engineer', 'engineering', 'developer', 'dev'],
  },
];

function matchesSection(path: LearningPath, matchers: string[]): boolean {
  if (!path.targetRole) return false;
  const role = path.targetRole.toLowerCase();
  return matchers.some((m) => role.includes(m));
}

function groupPaths(pathList: LearningPath[]): {
  sections: Array<{ key: string; label: string; description: string; paths: LearningPath[] }>;
  foundational: LearningPath[];
} {
  const assigned = new Set<string>();

  const sections = ROLE_SECTIONS.map((section) => {
    const matched = pathList.filter(
      (p) => !assigned.has(p.id) && matchesSection(p, section.matchers),
    );
    matched.forEach((p) => assigned.add(p.id));
    return { ...section, paths: matched };
  });

  const foundational = pathList.filter((p) => !assigned.has(p.id));

  return { sections, foundational };
}

export default async function PlaybooksPage() {
  const [pathsResult] = await Promise.allSettled([pathsApi.listPaths({ published: true })]);

  const allPaths: LearningPath[] = pathsResult.status === 'fulfilled' ? pathsResult.value : [];

  const { sections, foundational } = groupPaths(allPaths);

  const hasContent = allPaths.length > 0;

  // Show only sections that have at least one path
  const populatedSections = sections.filter((s) => s.paths.length > 0);

  return (
    <div className="mx-auto max-w-content space-y-12 px-6 py-10">
      <header className="space-y-2">
        <MonoLabel>DIRECTORY</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">Playbooks</h1>
        <p className="max-w-reading text-body text-paper-300">
          AI workflows organised by role. Browse, then assign yourself or ask your manager to
          assign.
        </p>
      </header>

      {!hasContent && (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-ink-600 py-20 text-center">
          <MonoLabel className="mb-2 block">NO PLAYBOOKS PUBLISHED YET</MonoLabel>
          <p className="text-body-sm text-paper-300">
            Your admin is still setting things up. Check back soon.
          </p>
        </div>
      )}

      {populatedSections.map((section, idx) => (
        <NumberedSection
          key={section.key}
          numeral={String(idx + 1).padStart(2, '0')}
          eyebrow={section.label.replace(/^For\s+/, '').toUpperCase()}
        >
          <p className="mb-6 max-w-reading text-body text-paper-300">{section.description}</p>
          <PlaybookSection title="" description="" paths={section.paths} />
        </NumberedSection>
      ))}

      {foundational.length > 0 && (
        <NumberedSection
          numeral={String(populatedSections.length + 1).padStart(2, '0')}
          eyebrow="FOUNDATIONAL"
        >
          <p className="mb-6 max-w-reading text-body text-paper-300">
            Core AI skills every team member benefits from, regardless of role.
          </p>
          <PlaybookSection title="" description="" paths={foundational} />
        </NumberedSection>
      )}
    </div>
  );
}
