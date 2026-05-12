import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Lock, Star } from 'lucide-react';
import { Card, CardContent, MonoLabel } from '@levelup/ui';
import { ssrGet } from '@/lib/api/server-fetch';
import { ApiError } from '@/lib/api/errors';
import type {
  CurriculumMap,
  CurriculumPathCard,
  CurriculumTier,
  CurriculumTierKey,
  LearningPath,
} from '@/lib/api/paths';

export const metadata: Metadata = {
  title: 'Curriculum',
};

// Tier metadata mirrored from the API service so we can synthesize a curriculum
// view client-side if the optimized /paths/curriculum-map endpoint isn't on
// the deployed API yet (e.g. Render hasn't redeployed since 1b075e1 added it).
const TIER_META: Record<CurriculumTierKey, { label: string; tagline: string; order: number }> = {
  BEGINNER: { label: 'Apprentice', tagline: 'Start here. Get safe. Get oriented.', order: 0 },
  PRACTITIONER: {
    label: 'Practitioner',
    tagline: 'Apply AI to your daily Kapitus work.',
    order: 1,
  },
  POWER_USER: { label: 'Specialist', tagline: 'Repeatable patterns, deeper technique.', order: 2 },
  CHAMPION: { label: 'Hero', tagline: 'Lead AI culture for your team.', order: 3 },
};

const TIER_KEYS: CurriculumTierKey[] = ['BEGINNER', 'PRACTITIONER', 'POWER_USER', 'CHAMPION'];

interface ListPathRow extends LearningPath {
  tier?: CurriculumTierKey;
  isCore?: boolean;
  prerequisiteSlugs?: string[];
  isAssigned?: boolean;
  orderIndex?: number;
}

/** Build a CurriculumMap from `/paths` when the optimized endpoint is missing. */
function fallbackMapFromPaths(rows: ListPathRow[]): CurriculumMap {
  const cards: CurriculumPathCard[] = rows.map((p) => {
    const tier = (p.tier ?? p.targetLevel) as CurriculumTierKey;
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      tier: TIER_KEYS.includes(tier) ? tier : 'BEGINNER',
      isCore: p.isCore ?? false,
      prerequisiteSlugs: p.prerequisiteSlugs ?? [],
      blockingPrereqs: [],
      isUnlocked: true,
      lessonCount: p.lessonCount,
      completedLessons: 0,
      completionRate: 0,
      isComplete: false,
      isAssigned: p.isAssigned ?? false,
      orderIndex: p.orderIndex ?? 0,
    };
  });

  const tiers: CurriculumTier[] = TIER_KEYS.map((key) => ({
    key,
    label: TIER_META[key].label,
    tagline: TIER_META[key].tagline,
    paths: cards.filter((c) => c.tier === key).sort((a, b) => a.orderIndex - b.orderIndex),
  }));

  return {
    user: { id: '', tierKey: 'BEGINNER', tierLabel: TIER_META.BEGINNER.label },
    tiers,
  };
}

export default async function CurriculumPage() {
  let map: CurriculumMap | null = null;
  let loadError: { status: number; message: string; requestId?: string } | null = null;

  try {
    map = await ssrGet<CurriculumMap>('/paths/curriculum-map');
  } catch (err) {
    const isApiError = err instanceof ApiError;
    if (isApiError) {
      loadError = {
        status: err.status,
        message: err.message,
        requestId: err.requestId,
      };
    } else {
      loadError = {
        status: 0,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
    console.error('[curriculum] getCurriculumMap failed', loadError);

    // The 404 + "Learning path not found" signature means Nest matched the
    // `:slug` route — the API is on a deploy from before 1b075e1 where the
    // explicit `curriculum-map` route wasn't yet declared above `:slug`. Fall
    // back to /paths and build a curriculum view locally so the user isn't
    // stuck. Once Render redeploys, the optimized path takes over.
    if (isApiError && err.status === 404) {
      try {
        const list = await ssrGet<ListPathRow[]>('/paths');
        map = fallbackMapFromPaths(list);
        loadError = null;
      } catch (fallbackErr) {
        console.error('[curriculum] /paths fallback also failed', fallbackErr);
      }
    }
  }

  return (
    <div className="mx-auto max-w-content space-y-10 px-6 py-10">
      <header className="space-y-3">
        <MonoLabel>KAPITUS AI ACADEMY · CURRICULUM</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">
          From zero to hero, step by step.
        </h1>
        <p className="max-w-reading text-body-lg text-paper-300">
          Every Kapitus employee walks the same journey — starting at Apprentice, working through
          role electives, and graduating as a Hero who coaches the next cohort.
        </p>
        {map && (
          <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">
            YOUR CURRENT TIER · {map.user.tierLabel.toUpperCase()}
          </p>
        )}
      </header>

      {!map ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-body-sm text-paper-300">
              {loadError?.status === 401
                ? 'You need to sign in to view your curriculum.'
                : loadError && loadError.status >= 500
                  ? 'The curriculum service hit an error. Refresh in a moment — the server may still be deploying.'
                  : 'Curriculum map unavailable. Please refresh or check back shortly.'}
            </p>
            {loadError && (
              <p className="font-mono text-mono-sm text-paper-500">
                HTTP {loadError.status} · {loadError.message}
                {loadError.requestId && ` · req ${loadError.requestId.slice(0, 8)}`}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-12">
          {map.tiers.map((tier, idx) => (
            <TierColumn key={tier.key} tier={tier} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

function TierColumn({ tier, index }: { tier: CurriculumTier; index: number }) {
  const numeral = String(index + 1).padStart(2, '0');
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-mono-sm uppercase tracking-[0.1em] text-signal">
          TIER {numeral}
        </span>
        <h2 className="font-serif text-h1 italic text-paper-100">{tier.label}</h2>
      </div>
      <p className="max-w-reading text-body-sm text-paper-300">{tier.tagline}</p>

      {tier.paths.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              MORE PATHS COMING SOON
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tier.paths.map((path) => (
            <PathTile key={path.id} path={path} />
          ))}
        </div>
      )}
    </section>
  );
}

function PathTile({ path }: { path: CurriculumPathCard }) {
  const { isUnlocked, isComplete, completedLessons, lessonCount, isCore, blockingPrereqs } = path;

  const tone = !isUnlocked
    ? 'locked'
    : isComplete
      ? 'complete'
      : completedLessons > 0
        ? 'in-progress'
        : 'available';

  const Wrapper: React.ElementType = isUnlocked ? Link : 'div';
  const wrapperProps = isUnlocked
    ? { href: `/learn/${path.slug}` }
    : { 'aria-disabled': true as const };

  return (
    <Wrapper
      {...wrapperProps}
      className={`group block rounded-md border bg-ink-800 p-5 transition-colors ${
        tone === 'locked'
          ? 'cursor-not-allowed border-ink-700 opacity-60'
          : 'border-ink-700 hover:border-signal/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {isCore && <Star className="h-3.5 w-3.5 text-signal" aria-hidden />}
          <MonoLabel tone={isCore ? 'signal' : undefined}>
            {isCore ? 'CORE PATH' : 'ELECTIVE'}
          </MonoLabel>
        </div>
        <StatusBadge tone={tone} />
      </div>

      <h3 className="mt-4 font-serif text-h3 italic text-paper-100">{path.title}</h3>
      {path.description && <p className="mt-2 text-body-sm text-paper-300">{path.description}</p>}

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          <span>
            {completedLessons} / {lessonCount} lessons
          </span>
          <span>{Math.round(path.completionRate * 100)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
          <div
            className="h-full bg-signal transition-all"
            style={{ width: `${Math.round(path.completionRate * 100)}%` }}
          />
        </div>
      </div>

      {!isUnlocked && blockingPrereqs.length > 0 && (
        <p className="mt-4 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          UNLOCKS AFTER · {blockingPrereqs.join(' · ')}
        </p>
      )}
    </Wrapper>
  );
}

function StatusBadge({ tone }: { tone: 'locked' | 'complete' | 'in-progress' | 'available' }) {
  if (tone === 'locked') {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-ink-700 px-2 py-0.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
        <Lock className="h-3 w-3" aria-hidden /> Locked
      </span>
    );
  }
  if (tone === 'complete') {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm bg-signal/15 px-2 py-0.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">
        <Check className="h-3 w-3" aria-hidden /> Done
      </span>
    );
  }
  if (tone === 'in-progress') {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-signal/40 px-2 py-0.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">
        In progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-ink-700 px-2 py-0.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
      Open
    </span>
  );
}
