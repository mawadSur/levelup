/**
 * InsightsService — CR.37
 *
 * Org-level prompt analytics: top cloned prompts, usage trends,
 * saves-prevented (sensitive-data detection), and category mix.
 *
 * Caching strategy:
 *   - 5-minute in-memory Map keyed by `${orgId}:${queryKey}`.
 *   - Per-process cache only — in production swap the `cache` Map for a
 *     Redis-backed solution (e.g. ioredis with JSON serialisation) to share
 *     state across API replicas.
 *
 * SQL strategy:
 *   - Time-bucketing uses `prisma.$queryRaw` with PostgreSQL `date_trunc()`.
 *     Prisma's `groupBy()` API does not support computed time-bucket columns,
 *     so raw SQL is the correct tool here.
 *   - All other lookups use the typed Prisma client API to retain type safety.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@levelup/db';
import { PrismaService } from '../prisma';
import { SessionPayload } from '@levelup/auth-client';
import {
  TopPromptsQueryDto,
  UsageTrendQueryDto,
  CategoryMixQueryDto,
} from './dto/insights-query.dto';

// ---------------------------------------------------------------------------
// Response types (mirrored from @levelup/types/insights — kept local so the
// API compile does not depend on the types package dist being up to date)
// ---------------------------------------------------------------------------

export interface TopPromptItem {
  promptId: string;
  title: string;
  category: string;
  authorName: string;
  departmentName: string | null;
  cloneCount: number;
  isShared: boolean;
}

export interface TopPromptsResponse {
  prompts: TopPromptItem[];
}

export interface TopSavedPromptItem {
  promptId: string;
  title: string;
  category: string;
  authorName: string;
  departmentName: string | null;
  saveCount: number;
  isShared: boolean;
}

export interface TopSavedPromptsResponse {
  prompts: TopSavedPromptItem[];
}

export interface UsageTrendBucket {
  bucketStart: string;
  coachInvocations: number;
  lessonsCompleted: number;
  promptsSaved: number;
  xpEarned: number;
}

export interface UsageTrendResponse {
  buckets: UsageTrendBucket[];
  totals: {
    coachInvocations: number;
    lessonsCompleted: number;
    promptsSaved: number;
    xpEarned: number;
  };
}

export interface SavesCategoryCount {
  category: string;
  count: number;
}

export interface SavesPreventedExample {
  occurredAt: string;
  userName: string;
  categories: string[];
}

export interface SavesPreventedResponse {
  totalDetections: number;
  uniqueUsersAffected: number;
  byCategory: SavesCategoryCount[];
  recentExamples: SavesPreventedExample[];
}

export interface CategoryMixSegment {
  category: string;
  count: number;
  pct: number;
}

export interface CategoryMixResponse {
  segments: CategoryMixSegment[];
}

// ---------------------------------------------------------------------------
// Internal cache types
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Raw SQL row shapes
// ---------------------------------------------------------------------------

interface TrendBucketRow {
  bucket: Date;
  coach_invocations: bigint;
  lessons_completed: bigint;
  prompts_saved: bigint;
  xp_earned: bigint;
}

interface CloneCountRow {
  prompt_id: string;
  clone_count: bigint;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function periodToStartDate(period: 'week' | 'month' | 'all'): Date | null {
  const now = new Date();
  if (period === 'week') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (period === 'month') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return null; // 'all' — no date filter
}

function safeNum(v: bigint | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'bigint' ? Number(v) : v;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  // Single cache map — keys are `${orgId}:${descriptor}` strings.
  // Production should replace this with a Redis-backed TTL cache.
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Cache helpers
  // --------------------------------------------------------------------------

  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (entry && entry.expiresAt > Date.now()) return entry.value;
    return null;
  }

  private setCache<T>(key: string, value: T): void {
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  // --------------------------------------------------------------------------
  // GET /insights/top-prompts
  // --------------------------------------------------------------------------

  async getTopPrompts(
    user: SessionPayload,
    query: TopPromptsQueryDto,
  ): Promise<TopPromptsResponse> {
    const cacheKey = `${user.organizationId}:top-prompts:${query.period}:${query.limit}`;
    const cached = this.getCache<TopPromptsResponse>(cacheKey);
    if (cached) return cached;

    const result = await this.computeTopPrompts(user.organizationId, query);
    this.setCache(cacheKey, result);
    return result;
  }

  private async computeTopPrompts(
    orgId: string,
    query: TopPromptsQueryDto,
  ): Promise<TopPromptsResponse> {
    const cap = Math.min(query.limit, 50);
    const startDate = periodToStartDate(query.period);

    // Count PROMPT_CLONED XpEvent rows per sourceId (format: `${promptId}:${cloningUserId}`)
    // We extract the promptId as the first segment before the colon.
    // Using raw SQL for efficient group-by on a substring expression.
    const dateFilter = startDate ? Prisma.sql`AND xe."createdAt" >= ${startDate}` : Prisma.sql``;

    const cloneRows = await this.prisma.$queryRaw<CloneCountRow[]>`
      SELECT
        split_part(xe."sourceId", ':', 1) AS prompt_id,
        COUNT(*)::bigint                  AS clone_count
      FROM xp_events xe
      WHERE
        xe."organizationId" = ${orgId}
        AND xe.kind = 'PROMPT_CLONED'
        AND xe."sourceType" = 'Prompt'
        AND xe."sourceId" IS NOT NULL
        ${dateFilter}
      GROUP BY split_part(xe."sourceId", ':', 1)
      ORDER BY clone_count DESC
      LIMIT ${cap}
    `;

    if (cloneRows.length === 0) {
      return { prompts: [] };
    }

    const promptIds = cloneRows.map((r) => r.prompt_id).filter(Boolean);
    const cloneCountMap = new Map(cloneRows.map((r) => [r.prompt_id, safeNum(r.clone_count)]));

    // Fetch prompt metadata
    const prompts = await this.prisma.prompt.findMany({
      where: { id: { in: promptIds }, organizationId: orgId },
      select: {
        id: true,
        title: true,
        category: true,
        isShared: true,
        user: { select: { name: true } },
        department: { select: { name: true } },
      },
    });

    const result = prompts
      .map((p) => ({
        promptId: p.id,
        title: p.title,
        category: p.category,
        authorName: p.user.name,
        departmentName: p.department?.name ?? null,
        cloneCount: cloneCountMap.get(p.id) ?? 0,
        isShared: p.isShared,
      }))
      .sort((a, b) => b.cloneCount - a.cloneCount)
      .slice(0, cap);

    return { prompts: result };
  }

  // --------------------------------------------------------------------------
  // GET /insights/top-saved-prompts
  // --------------------------------------------------------------------------

  async getTopSavedPrompts(
    user: SessionPayload,
    query: TopPromptsQueryDto,
  ): Promise<TopSavedPromptsResponse> {
    const cacheKey = `${user.organizationId}:top-saved:${query.period}:${query.limit}`;
    const cached = this.getCache<TopSavedPromptsResponse>(cacheKey);
    if (cached) return cached;

    const result = await this.computeTopSavedPrompts(user.organizationId, query);
    this.setCache(cacheKey, result);
    return result;
  }

  private async computeTopSavedPrompts(
    orgId: string,
    query: TopPromptsQueryDto,
  ): Promise<TopSavedPromptsResponse> {
    const cap = Math.min(query.limit, 50);
    const startDate = periodToStartDate(query.period);

    const where: Prisma.PromptWhereInput = {
      organizationId: orgId,
      ...(startDate ? { createdAt: { gte: startDate } } : {}),
    };

    // Group by user who saved to get "most saved by this user" — but the spec
    // says "most-recently-saved prompts in the org (raw count of new Prompt rows
    // in the period)". So: prompts ordered by creation time, most recent first,
    // capped at `limit`.
    const prompts = await this.prisma.prompt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: cap,
      select: {
        id: true,
        title: true,
        category: true,
        isShared: true,
        user: { select: { name: true } },
        department: { select: { name: true } },
      },
    });

    return {
      prompts: prompts.map((p, i) => ({
        promptId: p.id,
        title: p.title,
        category: p.category,
        authorName: p.user.name,
        departmentName: p.department?.name ?? null,
        saveCount: cap - i, // proxy rank: newest = highest
        isShared: p.isShared,
      })),
    };
  }

  // --------------------------------------------------------------------------
  // GET /insights/usage-trend
  // --------------------------------------------------------------------------

  async getUsageTrend(
    user: SessionPayload,
    query: UsageTrendQueryDto,
  ): Promise<UsageTrendResponse> {
    const cacheKey = `${user.organizationId}:usage-trend:${query.period}:${query.interval}`;
    const cached = this.getCache<UsageTrendResponse>(cacheKey);
    if (cached) return cached;

    const result = await this.computeUsageTrend(user.organizationId, query);
    this.setCache(cacheKey, result);
    return result;
  }

  private async computeUsageTrend(
    orgId: string,
    query: UsageTrendQueryDto,
  ): Promise<UsageTrendResponse> {
    const days = parseInt(query.period, 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const truncUnit = query.interval; // 'day' or 'week'

    // Single raw query fans out across 4 tables using CTEs for clarity.
    // date_trunc bucketing is done PG-side for efficiency.
    //
    // Note: UserProgress only has `completedAt` (not `createdAt`).
    //       We use `completedAt` for lessons_completed bucket.
    //       Prompts use `createdAt`.
    //       AiCoachSession uses `createdAt`.
    //       XpEvent uses `createdAt`.
    const rows = await this.prisma.$queryRaw<TrendBucketRow[]>`
      WITH
        coach_series AS (
          SELECT
            date_trunc(${truncUnit}, "createdAt") AS bucket,
            COUNT(*) AS cnt
          FROM ai_coach_sessions
          WHERE "organizationId" = ${orgId}
            AND "createdAt" >= ${startDate}
          GROUP BY 1
        ),
        lessons_series AS (
          SELECT
            date_trunc(${truncUnit}, up."completedAt") AS bucket,
            COUNT(*) AS cnt
          FROM user_progress up
          JOIN lessons l ON l.id = up."lessonId"
          JOIN learning_paths lp ON lp.id = l."learningPathId"
          WHERE lp."organizationId" = ${orgId}
            AND up.status = 'COMPLETED'
            AND up."completedAt" IS NOT NULL
            AND up."completedAt" >= ${startDate}
          GROUP BY 1
        ),
        prompts_series AS (
          SELECT
            date_trunc(${truncUnit}, "createdAt") AS bucket,
            COUNT(*) AS cnt
          FROM prompts
          WHERE "organizationId" = ${orgId}
            AND "createdAt" >= ${startDate}
          GROUP BY 1
        ),
        xp_series AS (
          SELECT
            date_trunc(${truncUnit}, "createdAt") AS bucket,
            SUM(xp) AS cnt
          FROM xp_events
          WHERE "organizationId" = ${orgId}
            AND "createdAt" >= ${startDate}
          GROUP BY 1
        ),
        all_buckets AS (
          SELECT bucket FROM coach_series
          UNION
          SELECT bucket FROM lessons_series
          UNION
          SELECT bucket FROM prompts_series
          UNION
          SELECT bucket FROM xp_series
        )
      SELECT
        ab.bucket,
        COALESCE(cs.cnt, 0)::bigint AS coach_invocations,
        COALESCE(ls.cnt, 0)::bigint AS lessons_completed,
        COALESCE(ps.cnt, 0)::bigint AS prompts_saved,
        COALESCE(xs.cnt, 0)::bigint AS xp_earned
      FROM all_buckets ab
      LEFT JOIN coach_series   cs ON cs.bucket = ab.bucket
      LEFT JOIN lessons_series ls ON ls.bucket = ab.bucket
      LEFT JOIN prompts_series ps ON ps.bucket = ab.bucket
      LEFT JOIN xp_series      xs ON xs.bucket = ab.bucket
      ORDER BY ab.bucket ASC
    `;

    const buckets = rows.map((r) => ({
      bucketStart: r.bucket.toISOString(),
      coachInvocations: safeNum(r.coach_invocations),
      lessonsCompleted: safeNum(r.lessons_completed),
      promptsSaved: safeNum(r.prompts_saved),
      xpEarned: safeNum(r.xp_earned),
    }));

    const totals = buckets.reduce(
      (acc, b) => ({
        coachInvocations: acc.coachInvocations + b.coachInvocations,
        lessonsCompleted: acc.lessonsCompleted + b.lessonsCompleted,
        promptsSaved: acc.promptsSaved + b.promptsSaved,
        xpEarned: acc.xpEarned + b.xpEarned,
      }),
      { coachInvocations: 0, lessonsCompleted: 0, promptsSaved: 0, xpEarned: 0 },
    );

    return { buckets, totals };
  }

  // --------------------------------------------------------------------------
  // GET /insights/saves-prevented
  // --------------------------------------------------------------------------

  async getSavesPrevented(user: SessionPayload): Promise<SavesPreventedResponse> {
    const cacheKey = `${user.organizationId}:saves-prevented`;
    const cached = this.getCache<SavesPreventedResponse>(cacheKey);
    if (cached) return cached;

    const result = await this.computeSavesPrevented(user.organizationId);
    this.setCache(cacheKey, result);
    return result;
  }

  private async computeSavesPrevented(orgId: string): Promise<SavesPreventedResponse> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all sensitive-data audit events in the last 30 days.
    // We use AuditLog.action = 'coach.sensitive_data_detected' as the signal.
    // Alternatively AiCoachSession.sensitiveDataDetected = true is a direct flag.
    // Both are queried; audit log used for the category breakdown (metadata),
    // coach sessions used for unique-user count since they're cleaner.
    const [auditRows, sensitiveSessionRows] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          organizationId: orgId,
          action: 'coach.sensitive_data_detected',
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          actorId: true,
          metadata: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Fallback: if audit log is empty, count coach sessions directly
      this.prisma.aiCoachSession.findMany({
        where: {
          organizationId: orgId,
          sensitiveDataDetected: true,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          userId: true,
          createdAt: true,
          user: { select: { name: true } },
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // If we have audit log rows, prefer them; otherwise use coach sessions
    const useAuditRows = auditRows.length > 0;
    const totalDetections = useAuditRows ? auditRows.length : sensitiveSessionRows.length;

    const uniqueUsersAffected = useAuditRows
      ? new Set(auditRows.map((r) => r.actorId).filter(Boolean)).size
      : new Set(sensitiveSessionRows.map((r) => r.userId)).size;

    // Category breakdown from audit log metadata or coach session category
    const categoryCount = new Map<string, number>();
    if (useAuditRows) {
      for (const row of auditRows) {
        const meta = row.metadata as Record<string, unknown> | null;
        const cats = meta?.categories;
        if (Array.isArray(cats)) {
          for (const cat of cats) {
            if (typeof cat === 'string') {
              categoryCount.set(cat, (categoryCount.get(cat) ?? 0) + 1);
            }
          }
        } else {
          // No structured category — use "general"
          const general = 'general';
          categoryCount.set(general, (categoryCount.get(general) ?? 0) + 1);
        }
      }
    } else {
      for (const s of sensitiveSessionRows) {
        const cat = s.category ?? 'general';
        categoryCount.set(cat, (categoryCount.get(cat) ?? 0) + 1);
      }
    }

    const byCategory = [...categoryCount.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Recent examples: top 10, first name only for privacy
    const recentExamples = useAuditRows
      ? auditRows.slice(0, 10).map((row) => {
          const firstName = (row.actor?.name ?? 'User').split(' ')[0] ?? 'User';
          const meta = row.metadata as Record<string, unknown> | null;
          const cats = Array.isArray(meta?.categories)
            ? (meta.categories as unknown[]).filter((c): c is string => typeof c === 'string')
            : ['general'];
          return {
            occurredAt: row.createdAt.toISOString(),
            userName: firstName,
            categories: cats,
          };
        })
      : sensitiveSessionRows.slice(0, 10).map((s) => {
          const firstName = s.user.name.split(' ')[0] ?? 'User';
          return {
            occurredAt: s.createdAt.toISOString(),
            userName: firstName,
            categories: s.category ? [s.category] : ['general'],
          };
        });

    return {
      totalDetections,
      uniqueUsersAffected,
      byCategory,
      recentExamples,
    };
  }

  // --------------------------------------------------------------------------
  // GET /insights/category-mix
  // --------------------------------------------------------------------------

  async getCategoryMix(
    user: SessionPayload,
    query: CategoryMixQueryDto,
  ): Promise<CategoryMixResponse> {
    const cacheKey = `${user.organizationId}:category-mix:${query.period}`;
    const cached = this.getCache<CategoryMixResponse>(cacheKey);
    if (cached) return cached;

    const result = await this.computeCategoryMix(user.organizationId, query);
    this.setCache(cacheKey, result);
    return result;
  }

  private async computeCategoryMix(
    orgId: string,
    query: CategoryMixQueryDto,
  ): Promise<CategoryMixResponse> {
    const startDate = periodToStartDate(query.period);

    const grouped = await this.prisma.prompt.groupBy({
      by: ['category'],
      where: {
        organizationId: orgId,
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
      },
      _count: { _all: true },
      orderBy: { _count: { category: 'desc' } },
    });

    const total = grouped.reduce((s, r) => s + r._count._all, 0);

    const segments = grouped.map((r) => ({
      category: r.category,
      count: r._count._all,
      pct: total === 0 ? 0 : Math.round((r._count._all / total) * 100),
    }));

    return { segments };
  }
}
