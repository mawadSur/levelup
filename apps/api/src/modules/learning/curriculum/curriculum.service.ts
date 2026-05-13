import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../../prisma';
import type { GameService } from '../../game/game.service';
import type { SessionPayload } from '@levelup/auth-client';
import type { AiLevel, LessonKind, LessonStatus } from '@levelup/db';

const TIER_META: Record<AiLevel, { label: string; tagline: string; order: number }> = {
  BEGINNER: {
    label: 'Apprentice',
    tagline: 'Start here. Get safe. Get oriented.',
    order: 0,
  },
  PRACTITIONER: {
    label: 'Practitioner',
    tagline: 'Apply AI to your daily work.',
    order: 1,
  },
  POWER_USER: {
    label: 'Specialist',
    tagline: 'Repeatable patterns, deeper technique.',
    order: 2,
  },
  CHAMPION: {
    label: 'Hero',
    tagline: 'Lead AI culture for your team.',
    order: 3,
  },
};

const TIER_ORDER: AiLevel[] = ['BEGINNER', 'PRACTITIONER', 'POWER_USER', 'CHAMPION'];

export interface CurriculumLessonNode {
  id: string;
  slug: string;
  title: string;
  kind: LessonKind;
  orderIndex: number;
  estimatedMinutes: number;
  status: LessonStatus;
}

export interface CurriculumPathNode {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  tier: AiLevel;
  isCore: boolean;
  prerequisiteSlugs: string[];
  blockingPrereqs: string[];
  isUnlocked: boolean;
  isComplete: boolean;
  progress: { completed: number; total: number };
  lessons: CurriculumLessonNode[];
}

export interface CurriculumTierNode {
  tier: AiLevel;
  label: string;
  tagline: string;
  paths: CurriculumPathNode[];
}

@Injectable()
export class CurriculumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameService: GameService,
  ) {}

  /**
   * Denormalized payload for the /curriculum page.
   *
   * Returns every visible learning path (org-owned ∪ global, published only)
   * grouped by tier, with each path's lesson sequence, the caller's per-lesson
   * progress status, prerequisite-derived lock state, and the user's game
   * state in a single round-trip.
   */
  async getMyCurriculum(user: SessionPayload) {
    const paths = await this.prisma.learningPath.findMany({
      where: {
        OR: [{ organizationId: user.organizationId }, { organizationId: null }],
        isPublished: true,
      },
      orderBy: [{ tier: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
      include: {
        lessons: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            kind: true,
            orderIndex: true,
            estimatedMinutes: true,
          },
        },
      },
    });

    const allLessonIds = paths.flatMap((p) => p.lessons.map((l) => l.id));
    const progressRows = allLessonIds.length
      ? await this.prisma.userProgress.findMany({
          where: { userId: user.userId, lessonId: { in: allLessonIds } },
          select: { lessonId: true, status: true },
        })
      : [];
    const statusByLessonId = new Map<string, LessonStatus>(
      progressRows.map((r) => [r.lessonId, r.status]),
    );

    // First pass: compute completion ratio per slug so we can resolve prereq locks.
    const completionBySlug = new Map<string, number>();
    for (const p of paths) {
      const total = p.lessons.length;
      const done = p.lessons.filter((l) => statusByLessonId.get(l.id) === 'COMPLETED').length;
      completionBySlug.set(p.slug, total === 0 ? 0 : done / total);
    }

    const pathNodes: CurriculumPathNode[] = paths.map((p) => {
      const lessons: CurriculumLessonNode[] = p.lessons.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        kind: l.kind,
        orderIndex: l.orderIndex,
        estimatedMinutes: l.estimatedMinutes,
        status: statusByLessonId.get(l.id) ?? 'NOT_STARTED',
      }));

      const total = lessons.length;
      const completed = lessons.filter((l) => l.status === 'COMPLETED').length;
      const prereqs = (p.prerequisiteSlugs as string[]) ?? [];
      const blockingPrereqs = prereqs.filter((slug) => (completionBySlug.get(slug) ?? 0) < 1);

      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        tier: p.tier,
        isCore: p.isCore,
        prerequisiteSlugs: prereqs,
        blockingPrereqs,
        isUnlocked: blockingPrereqs.length === 0,
        isComplete: total > 0 && completed === total,
        progress: { completed, total },
        lessons,
      };
    });

    const byTier = new Map<AiLevel, CurriculumPathNode[]>();
    for (const node of pathNodes) {
      const list = byTier.get(node.tier) ?? [];
      list.push(node);
      byTier.set(node.tier, list);
    }

    const tiers: CurriculumTierNode[] = TIER_ORDER.map((tier) => ({
      tier,
      label: TIER_META[tier].label,
      tagline: TIER_META[tier].tagline,
      paths: byTier.get(tier) ?? [],
    }));

    // Resolve titles for blocking prereqs so the UI can render a human-readable
    // "complete X first" hint without a second round trip.
    const titleBySlug = new Map<string, string>(pathNodes.map((p) => [p.slug, p.title]));

    const gameState = await this.gameService.getGameState(user.userId);

    return {
      tiers,
      gameState: {
        level: gameState.level,
        xp: gameState.xp,
        xpAtCurrentLevel: gameState.xpAtCurrentLevel,
        xpForNextLevel: gameState.xpForNextLevel,
        xpToNextLevel: gameState.xpToNextLevel,
        currentStreak: gameState.currentStreak,
        longestStreak: gameState.longestStreak,
      },
      meta: {
        prereqTitles: Object.fromEntries(titleBySlug),
      },
    };
  }
}
