import type { Metadata } from 'next';
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

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-paper-100">Playbooks</h1>
        <p className="mt-1 text-paper-300">
          AI workflows organised by role. Browse, then assign yourself or ask your manager to
          assign.
        </p>
      </div>

      {!hasContent && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-600 py-20 text-center">
          <svg
            className="mb-4 h-12 w-12 text-paper-300/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
          <p className="text-sm font-medium text-paper-100">No playbooks published yet</p>
          <p className="mt-1 text-sm text-paper-300">
            Your admin is still setting things up. Check back soon.
          </p>
        </div>
      )}

      {/* Role sections */}
      {sections.map((section) => (
        <PlaybookSection
          key={section.key}
          title={section.label}
          description={section.description}
          paths={section.paths}
        />
      ))}

      {/* Foundational (catch-all) */}
      {foundational.length > 0 && (
        <PlaybookSection
          title="Foundational"
          description="Core AI skills every team member benefits from, regardless of role."
          paths={foundational}
        />
      )}
    </div>
  );
}
