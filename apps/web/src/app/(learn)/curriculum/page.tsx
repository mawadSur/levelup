import type { Metadata } from 'next';
import { Card, CardContent, MonoLabel } from '@levelup/ui';
import { ssrGet } from '@/lib/api/server-fetch';
import { ApiError } from '@/lib/api/errors';
import type { CurriculumMe } from '@/lib/api/curriculum';
import type {
  CurriculumMap,
  CurriculumPathCard,
  CurriculumTier,
  CurriculumTierKey,
  LearningPath,
} from '@/lib/api/paths';
import { CurriculumView } from './curriculum-view';

export const metadata: Metadata = {
  title: 'Curriculum',
};

const TIER_META: Record<CurriculumTierKey, { label: string; tagline: string; order: number }> = {
  BEGINNER: { label: 'Apprentice', tagline: 'Start here. Get safe. Get oriented.', order: 0 },
  PRACTITIONER: {
    label: 'Practitioner',
    tagline: 'Apply AI to your daily work.',
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

/**
 * If the API hasn't redeployed yet and /curriculum/me is missing, fall back
 * to building the visual from /paths/curriculum-map (no lessons) or /paths
 * (no progress overlay). The visualization still renders, with empty lesson
 * rows, instead of an outright error.
 */
function fallbackFromCurriculumMap(map: CurriculumMap): CurriculumMe {
  return {
    tiers: map.tiers.map((tier) => ({
      tier: tier.key,
      label: tier.label,
      tagline: tier.tagline,
      paths: tier.paths.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        tier: p.tier,
        isCore: p.isCore,
        prerequisiteSlugs: p.prerequisiteSlugs,
        blockingPrereqs: p.blockingPrereqs,
        isUnlocked: p.isUnlocked,
        isComplete: p.isComplete,
        progress: { completed: p.completedLessons, total: p.lessonCount },
        lessons: [],
      })),
    })),
    gameState: {
      level: 0,
      xp: 0,
      xpAtCurrentLevel: 0,
      xpForNextLevel: 0,
      xpToNextLevel: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
    meta: {
      prereqTitles: Object.fromEntries(
        map.tiers.flatMap((t) => t.paths.map((p) => [p.slug, p.title])),
      ),
    },
  };
}

function fallbackFromPaths(rows: ListPathRow[]): CurriculumMe {
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

  return fallbackFromCurriculumMap({
    user: { id: '', tierKey: 'BEGINNER', tierLabel: TIER_META.BEGINNER.label },
    tiers,
  });
}

export default async function CurriculumPage() {
  let data: CurriculumMe | null = null;
  let loadError: { status: number; message: string; requestId?: string } | null = null;

  try {
    data = await ssrGet<CurriculumMe>('/curriculum/me');
  } catch (err) {
    const isApiError = err instanceof ApiError;
    loadError = {
      status: isApiError ? err.status : 0,
      message: err instanceof Error ? err.message : 'Unknown error',
      requestId: isApiError ? err.requestId : undefined,
    };
    console.error('[curriculum] /curriculum/me failed', loadError);

    if (isApiError && err.status === 404) {
      try {
        const map = await ssrGet<CurriculumMap>('/paths/curriculum-map');
        data = fallbackFromCurriculumMap(map);
        loadError = null;
      } catch (mapErr) {
        console.error('[curriculum] /paths/curriculum-map fallback failed', mapErr);
        try {
          const list = await ssrGet<ListPathRow[]>('/paths');
          data = fallbackFromPaths(list);
          loadError = null;
        } catch (listErr) {
          console.error('[curriculum] /paths fallback also failed', listErr);
        }
      }
    }
  }

  return (
    <div className="mx-auto max-w-content space-y-10 px-6 py-10">
      <header className="space-y-3">
        <MonoLabel>LEVELUP ACADEMY · CURRICULUM</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">
          From zero to hero, step by step.
        </h1>
        <p className="max-w-reading text-body-lg text-paper-300">
          Every lesson, every checkpoint, mapped end-to-end. Start at Apprentice, work through
          role-specific practice, and graduate as a Hero who coaches the next cohort.
        </p>
      </header>

      {!data ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-body-sm text-paper-300">
              {loadError?.status === 401
                ? 'You need to sign in to view your curriculum.'
                : loadError && loadError.status >= 500
                  ? 'The curriculum service hit an error. Refresh in a moment — the server may still be deploying.'
                  : 'Curriculum unavailable. Please refresh or check back shortly.'}
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
        <CurriculumView data={data} />
      )}
    </div>
  );
}
