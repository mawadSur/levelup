import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  type Role,
  type UserGameState,
  type XpEventKind as PrismaXpEventKind,
} from '@levelup/db';
import type {
  DailyQuestKind,
  DailyQuests,
  GameState,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardScope,
} from '@levelup/types';
import { PrismaService } from '../prisma';
import { levelFromXp, xpToNextLevel } from './level-curve';
import { xpForKind } from './xp-rules';
import { applyDailyActivity, crossedThreshold, startOfUtcDay } from './streak';
import { generateDailyQuests, isoDateUtc } from './quest-generator';

/**
 * Anything written to AuditLog.metadata must satisfy Prisma.InputJsonValue.
 * We accept loose `Record<string, unknown>` from callers and cast safely.
 */
function toJson(value: Record<string, unknown> | undefined): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}

const WEEKLY_RESET_MS = 7 * 24 * 60 * 60 * 1000;

export interface AwardXpInput {
  userId: string;
  organizationId: string;
  kind: PrismaXpEventKind;
  sourceType?: string;
  sourceId?: string;
  meta?: Record<string, unknown>;
  xpOverride?: number;
}

export interface AwardXpResult {
  awarded: number;
  previousLevel?: number;
  newLevel?: number;
  streakUpdated: boolean;
}

interface StoredQuest {
  slug: string;
  title: string;
  kind: DailyQuestKind;
  target: number;
  progress: number;
  claimed: boolean;
  xpReward: number;
}

function parseQuests(raw: Prisma.JsonValue | null): StoredQuest[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredQuest[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const q = entry as Record<string, Prisma.JsonValue>;
    out.push({
      slug: typeof q['slug'] === 'string' ? q['slug'] : '',
      title: typeof q['title'] === 'string' ? q['title'] : '',
      kind: (typeof q['kind'] === 'string' ? q['kind'] : 'lesson') as DailyQuestKind,
      target: typeof q['target'] === 'number' ? q['target'] : 1,
      progress: typeof q['progress'] === 'number' ? q['progress'] : 0,
      claimed: q['claimed'] === true,
      xpReward: typeof q['xpReward'] === 'number' ? q['xpReward'] : 0,
    });
  }
  return out;
}

function questsToJson(quests: StoredQuest[]): Prisma.InputJsonValue {
  return quests.map((q) => ({ ...q })) as unknown as Prisma.InputJsonValue;
}

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  async getOrCreateState(userId: string): Promise<UserGameState> {
    const existing = await this.prisma.userGameState.findUnique({
      where: { userId },
    });
    if (existing) return existing;
    return this.prisma.userGameState.create({ data: { userId } });
  }

  async getGameState(userId: string): Promise<GameState> {
    const state = await this.getOrCreateState(userId);
    const curve = xpToNextLevel(state.xp);
    return {
      level: state.level,
      xp: state.xp,
      xpAtCurrentLevel: curve.current,
      xpForNextLevel: curve.next,
      xpToNextLevel: Math.max(0, curve.next - state.xp),
      currentStreak: state.currentStreak,
      longestStreak: state.longestStreak,
      weeklyXp: state.weeklyXp,
      totalLessonsCompleted: state.totalLessonsCompleted,
      streakFreezes: state.streakFreezes,
    };
  }

  // ---------------------------------------------------------------------------
  // XP awarding
  // ---------------------------------------------------------------------------

  /**
   * Idempotent XP award. Re-awarding the same (userId, kind, sourceId) is a
   * no-op (returns awarded: 0). On every successful award we update the
   * UserGameState row, advance the streak if today is a new active day, and
   * possibly emit cascading STREAK_7 / STREAK_30 events.
   *
   * Side effects:
   *   - Inserts row in `xp_events`.
   *   - Upserts `user_game_state`.
   *   - Writes `audit_logs` with action `game.xp_awarded`.
   *   - May recursively call awardXp for STREAK_7 / STREAK_30.
   */
  async awardXp(input: AwardXpInput): Promise<AwardXpResult> {
    const xp =
      input.xpOverride !== undefined
        ? Math.max(0, Math.floor(input.xpOverride))
        : xpForKind(input.kind, input.meta);

    if (xp <= 0) {
      // Even with 0 xp we still want to fail silently (e.g. BADGE_BONUS with
      // no reward) — return early without touching state.
      return { awarded: 0, streakUpdated: false };
    }

    // 1) Insert XpEvent — idempotent via @@unique([userId, kind, sourceId]).
    try {
      await this.prisma.xpEvent.create({
        data: {
          userId: input.userId,
          organizationId: input.organizationId,
          kind: input.kind,
          xp,
          sourceType: input.sourceType ?? null,
          sourceId: input.sourceId ?? null,
          meta: input.meta ? (input.meta as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Already awarded — idempotent no-op.
        return { awarded: 0, streakUpdated: false };
      }
      throw err;
    }

    // 2) Update game state (xp, weeklyXp, level, streak).
    const state = await this.getOrCreateState(input.userId);

    // Roll the weekly window if it has expired.
    const now = new Date();
    const weeklyExpired = now.getTime() - state.weeklyXpResetAt.getTime() >= WEEKLY_RESET_MS;
    const weeklyXpBase = weeklyExpired ? 0 : state.weeklyXp;
    const weeklyXpNew = weeklyXpBase + xp;
    const weeklyXpResetAt = weeklyExpired ? now : state.weeklyXpResetAt;

    const previousLevel = state.level;
    const newXp = state.xp + xp;
    const newLevel = levelFromXp(newXp);

    // Streak: only advance for kinds that count as "engagement". STREAK_*
    // events themselves don't recursively re-trigger streak advancement.
    const streakBearing = input.kind !== 'STREAK_7' && input.kind !== 'STREAK_30';
    const streak = streakBearing
      ? applyDailyActivity(
          {
            currentStreak: state.currentStreak,
            longestStreak: state.longestStreak,
            streakFreezes: state.streakFreezes,
            lastActiveDate: state.lastActiveDate,
          },
          now,
        )
      : {
          currentStreak: state.currentStreak,
          longestStreak: state.longestStreak,
          streakFreezes: state.streakFreezes,
          streakFreezesUsed: 0,
          changed: false,
        };

    const lessonInc =
      input.kind === 'LESSON_COMPLETED' || input.kind === 'LESSON_FIRST_TIME' ? 1 : 0;

    const lastActiveDate = streakBearing ? startOfUtcDay(now) : state.lastActiveDate;

    await this.prisma.userGameState.update({
      where: { userId: input.userId },
      data: {
        xp: newXp,
        weeklyXp: weeklyXpNew,
        weeklyXpResetAt,
        level: newLevel,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        streakFreezes: streak.streakFreezes,
        ...(lastActiveDate ? { lastActiveDate } : {}),
        ...(lessonInc ? { totalLessonsCompleted: { increment: lessonInc } } : {}),
      },
    });

    // 3) Audit.
    await this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.userId,
        action: 'game.xp_awarded',
        targetType: input.sourceType ?? null,
        targetId: input.sourceId ?? null,
        metadata: toJson({
          kind: input.kind,
          xp,
          newLevel,
          previousLevel,
          ...(input.meta ?? {}),
        }),
      },
    });

    // 4) Streak threshold cascades. We fire these *after* persisting the
    // streak update so the recursive calls see the new streak length.
    if (streakBearing && streak.changed) {
      if (crossedThreshold(state.currentStreak, streak.currentStreak, 7)) {
        await this.awardXp({
          userId: input.userId,
          organizationId: input.organizationId,
          kind: 'STREAK_7',
          sourceType: 'Streak',
          sourceId: `${input.userId}:7`,
        });
      }
      if (crossedThreshold(state.currentStreak, streak.currentStreak, 30)) {
        await this.awardXp({
          userId: input.userId,
          organizationId: input.organizationId,
          kind: 'STREAK_30',
          sourceType: 'Streak',
          sourceId: `${input.userId}:30`,
        });
      }
    }

    return {
      awarded: xp,
      previousLevel,
      newLevel: newLevel !== previousLevel ? newLevel : undefined,
      streakUpdated: streak.changed,
    };
  }

  // ---------------------------------------------------------------------------
  // Daily quests
  // ---------------------------------------------------------------------------

  /**
   * Returns today's 3 quests for the user (creating them if missing).
   * Quests refresh tomorrow (because the unique key is `(userId, date)` and
   * `date` is the calendar day truncated to UTC).
   */
  async getDailyQuests(
    userId: string,
    organizationId: string,
    role: Role,
    jobTitle?: string | null,
  ): Promise<DailyQuests> {
    const today = startOfUtcDay(new Date());
    const existing = await this.prisma.dailyQuest.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (existing) {
      return {
        date: isoDateUtc(today),
        quests: parseQuests(existing.quests).slice(0, 3),
      };
    }

    const generated = generateDailyQuests({
      userId,
      role,
      jobTitle: jobTitle ?? null,
      date: today,
    });

    const stored: StoredQuest[] = generated.map((q) => ({ ...q }));

    await this.prisma.dailyQuest.create({
      data: {
        userId,
        organizationId,
        date: today,
        quests: questsToJson(stored),
      },
    });

    return {
      date: isoDateUtc(today),
      quests: generated.slice(0, 3),
    };
  }

  /**
   * Bump progress for any of today's quests matching a given activity kind.
   * If progress reaches the target, the quest becomes claimable but is NOT
   * auto-claimed — the user has to call POST /game/quests/claim to collect.
   */
  async incrementQuestProgress(userId: string, kind: DailyQuestKind, amount = 1): Promise<void> {
    if (amount <= 0) return;
    const today = startOfUtcDay(new Date());

    const row = await this.prisma.dailyQuest.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    if (!row) {
      // No quests row yet — silently skip. The next /game/quests/today call
      // will materialise them.
      return;
    }

    const quests = parseQuests(row.quests);
    let mutated = false;
    for (const q of quests) {
      if (q.kind !== kind) continue;
      if (q.claimed) continue;
      if (q.progress >= q.target) continue;
      q.progress = Math.min(q.target, q.progress + amount);
      mutated = true;
    }

    if (!mutated) return;

    await this.prisma.dailyQuest.update({
      where: { id: row.id },
      data: { quests: questsToJson(quests) },
    });
  }

  /**
   * Claim a completed quest. Verifies progress ≥ target, flips claimed=true,
   * awards DAILY_QUEST XP, increments totalQuestsCompleted, and writes an
   * audit log with action `game.quest_claimed`.
   */
  async claimQuest(
    userId: string,
    organizationId: string,
    slug: string,
  ): Promise<{ awarded: number }> {
    const today = startOfUtcDay(new Date());
    const row = await this.prisma.dailyQuest.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    if (!row) throw new NotFoundException('No quests for today yet');

    const quests = parseQuests(row.quests);
    const quest = quests.find((q) => q.slug === slug);
    if (!quest) throw new NotFoundException('Quest not found');
    if (quest.claimed) throw new BadRequestException('Quest already claimed');
    if (quest.progress < quest.target) {
      throw new BadRequestException('Quest is not yet completed');
    }

    quest.claimed = true;

    await this.prisma.dailyQuest.update({
      where: { id: row.id },
      data: { quests: questsToJson(quests) },
    });

    const result = await this.awardXp({
      userId,
      organizationId,
      kind: 'DAILY_QUEST',
      sourceType: 'DailyQuest',
      // sourceId pins idempotency to "this quest, this day" so re-claim is
      // impossible at the XP layer too.
      sourceId: `${isoDateUtc(today)}:${slug}`,
      meta: { slug },
    });

    if (result.awarded > 0) {
      await this.prisma.userGameState.update({
        where: { userId },
        data: { totalQuestsCompleted: { increment: 1 } },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: userId,
        action: 'game.quest_claimed',
        targetType: 'DailyQuest',
        targetId: row.id,
        metadata: toJson({ slug, awarded: result.awarded }),
      },
    });

    return { awarded: result.awarded };
  }

  // ---------------------------------------------------------------------------
  // Leaderboard
  // ---------------------------------------------------------------------------

  async getLeaderboard(opts: {
    organizationId: string;
    scope: LeaderboardScope;
    period: LeaderboardPeriod;
    departmentId?: string;
    userId: string;
  }): Promise<Leaderboard> {
    const since = this.periodStart(opts.period);

    // Department scope requires a department filter. If none is given we
    // fall back to the requesting user's own department.
    let departmentFilter: string | undefined;
    if (opts.scope === 'department') {
      if (opts.departmentId) {
        departmentFilter = opts.departmentId;
      } else {
        const me = await this.prisma.user.findUnique({
          where: { id: opts.userId },
          select: { departmentId: true },
        });
        departmentFilter = me?.departmentId ?? undefined;
      }
    }

    // Scope of users we'll consider — always inside the org.
    const userWhere: Prisma.UserWhereInput = {
      organizationId: opts.organizationId,
      ...(departmentFilter ? { departmentId: departmentFilter } : {}),
    };

    // Aggregate XpEvent.xp by user for the period (or use total xp from
    // game state when period === 'all' for cheaper reads).
    const entries: LeaderboardEntry[] = [];

    if (opts.period === 'all') {
      const states = await this.prisma.userGameState.findMany({
        where: { user: userWhere },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: [{ xp: 'desc' }, { userId: 'asc' }],
      });

      states.forEach((s, idx) => {
        entries.push({
          userId: s.user.id,
          name: s.user.name,
          avatarUrl: s.user.avatarUrl,
          departmentName: s.user.department?.name ?? null,
          xp: s.xp,
          level: s.level,
          rank: idx + 1,
        });
      });
    } else {
      // For 'week' / 'month' we sum XpEvent.xp in the window.
      const grouped = await this.prisma.xpEvent.groupBy({
        by: ['userId'],
        where: {
          organizationId: opts.organizationId,
          createdAt: { gte: since },
          user: userWhere,
        },
        _sum: { xp: true },
      });

      const userIds = grouped.map((g) => g.userId);
      if (userIds.length === 0) {
        return {
          scope: opts.scope === 'me' ? 'org' : opts.scope,
          period: opts.period,
          entries: [],
        };
      }

      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds }, ...userWhere },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          department: { select: { name: true } },
        },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      const states = await this.prisma.userGameState.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, level: true },
      });
      const levelMap = new Map(states.map((s) => [s.userId, s.level]));

      const sorted = grouped
        .map((g) => ({ userId: g.userId, xp: g._sum.xp ?? 0 }))
        .sort((a, b) => b.xp - a.xp || (a.userId < b.userId ? -1 : 1));

      sorted.forEach((row, idx) => {
        const u = userMap.get(row.userId);
        if (!u) return;
        entries.push({
          userId: u.id,
          name: u.name,
          avatarUrl: u.avatarUrl,
          departmentName: u.department?.name ?? null,
          xp: row.xp,
          level: levelMap.get(u.id) ?? 1,
          rank: idx + 1,
        });
      });
    }

    // Cap the public list at top 50, but if the requesting user falls
    // outside, append their own row so the client can render "you are #87".
    const TOP_N = 50;
    const top = entries.slice(0, TOP_N);
    const me = entries.find((e) => e.userId === opts.userId);
    if (me && !top.find((e) => e.userId === opts.userId)) {
      top.push(me);
    }

    return {
      // 'me' is a special client-side scope — at the API we collapse it to
      // 'org' for the actual aggregation but echo back the requested scope.
      scope: opts.scope,
      period: opts.period,
      entries: top,
    };
  }

  private periodStart(period: LeaderboardPeriod): Date {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'all':
      default:
        return new Date(0);
    }
  }
}
