import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { getPlanLimit, getPlanConfig } from '@levelup/billing';
import { Plan } from '@levelup/db';
import { enqueueEmail } from '@levelup/queue';
import type { SessionPayload } from '@levelup/auth-client';
import { UpdateOrgDto } from './dto/update-org.dto';
import type { CreateOrganizationInput, OrgActivityEvent } from '@levelup/types';
// Trial duration drawn from PLAN_CONFIG so the billing package stays the
// single source of truth.
function trialDurationDays(): number {
  const cfg = getPlanConfig(Plan.TRIAL);
  return !cfg.perSeat && cfg.days ? cfg.days : 14;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter: 5 org creates per IP per hour.
// Production should replace this with a Redis-backed implementation.
// ---------------------------------------------------------------------------
const createOrgRateMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): void {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (createOrgRateMap.get(ip) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    throw new BadRequestException(
      'Too many organization sign-ups from this IP. Please try again later.',
    );
  }
  timestamps.push(now);
  createOrgRateMap.set(ip, timestamps);
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyOrg(user: SessionPayload) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const seatsUsed = await this.prisma.user.count({
      where: { organizationId: user.organizationId },
    });

    const seatsLimit = org.planSeats > 0 ? org.planSeats : getPlanLimit(org.plan);

    return {
      id: org.id,
      name: org.name,
      industry: org.industry,
      companySize: org.companySize,
      plan: org.plan,
      seatsUsed,
      seatsLimit,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  async updateMyOrg(user: SessionPayload, dto: UpdateOrgDto) {
    const org = await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.companySize !== undefined && { companySize: dto.companySize }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'org.update',
        targetType: 'Organization',
        targetId: org.id,
        metadata: { changes: dto },
      },
    });

    return org;
  }

  async createOrganization(
    dto: CreateOrganizationInput,
    ip: string,
  ): Promise<{ organizationId: string; signInUrl: string }> {
    // Rate limit check
    checkRateLimit(ip);

    // Anti-dupe: check if adminEmail is already the inviter on any pending invitation
    const existingInvite = await this.prisma.invitation.findFirst({
      where: {
        invitedBy: { email: dto.adminEmail },
        status: 'PENDING',
      },
    });
    if (existingInvite) {
      throw new BadRequestException(
        'An organization associated with this email already has pending invitations. Please check your inbox.',
      );
    }

    // New orgs land in TRIAL with 10 seats and a 14-day trialEndsAt.
    // Stripe is not involved at this stage — the trial-expiry worker job
    // will archive trials at day 21 if no upgrade happens.
    const trialEndsAt = new Date(Date.now() + trialDurationDays() * MS_PER_DAY);
    const trialSeats = getPlanLimit(Plan.TRIAL);

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        plan: Plan.TRIAL,
        planSeats: trialSeats,
        trialEndsAt,
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.companySize !== undefined && { companySize: dto.companySize }),
      },
    });

    // Send welcome email — TRULY fire-and-forget. The await was a bug; if
    // Redis (BullMQ) is unreachable, queue.add() hangs forever (ioredis
    // retries indefinitely under maxRetriesPerRequest:null) and signup
    // never completes. Losing a welcome email is far better than blocking
    // signup.
    enqueueEmail({
      to: dto.adminEmail,
      templateKey: 'welcome',
      data: { orgName: org.name, adminName: dto.adminName },
    }).catch((err) => {
      console.warn('[organizations] welcome email enqueue failed:', err);
    });

    // Audit log — emit both signup and trial-started so analytics can
    // distinguish between the two events.
    await this.prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorId: null, // system actor — no user row exists at trial-init time
        action: 'org.create_via_signup',
        targetType: 'Organization',
        targetId: org.id,
        metadata: {
          industry: dto.industry ?? null,
          companySize: dto.companySize ?? null,
          adminEmail: dto.adminEmail,
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorId: null,
        action: 'org.trial_started',
        targetType: 'Organization',
        targetId: org.id,
        metadata: {
          trialEndsAt: trialEndsAt.toISOString(),
          trialSeats,
          durationDays: trialDurationDays(),
        },
      },
    });

    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
    const signInUrl = `${appUrl}/sign-in?email=${encodeURIComponent(dto.adminEmail)}&orgId=${org.id}`;

    return { organizationId: org.id, signInUrl };
  }

  async getOrgStats(user: SessionPayload) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, activeUserCount, byRoleRaw, byDepartmentRaw, completionRaw, orgUsers] =
      await Promise.all([
        this.prisma.user.count({
          where: { organizationId: user.organizationId },
        }),
        this.prisma.user.count({
          where: {
            organizationId: user.organizationId,
            lastLoginAt: { gte: thirtyDaysAgo },
          },
        }),
        this.prisma.user.groupBy({
          by: ['role'],
          where: { organizationId: user.organizationId },
          _count: { _all: true },
        }),
        this.prisma.user.groupBy({
          by: ['departmentId'],
          where: {
            organizationId: user.organizationId,
            departmentId: { not: null },
          },
          _count: { _all: true },
        }),
        this.prisma.userProgress.aggregate({
          where: {
            user: { organizationId: user.organizationId },
          },
          _count: { _all: true },
        }),
        this.prisma.user.findMany({
          where: { organizationId: user.organizationId },
          select: { id: true, role: true, departmentId: true },
        }),
      ]);

    const completedCount = await this.prisma.userProgress.count({
      where: {
        status: 'COMPLETED',
        user: { organizationId: user.organizationId },
      },
    });

    // -----------------------------------------------------------------------
    // Per-group completion rate
    //
    // Strategy: one extra groupBy on UserProgress, joined with the in-memory
    // userId → (role, departmentId) map we already fetched. Cheaper than a
    // pair of groupBy-with-relation-filter queries and keeps the role/dept
    // axes consistent with the user counts above.
    //
    // The completion rate is defined as
    //     completed UserProgress rows / total UserProgress rows
    // restricted to users in the group. This mirrors the org-wide
    // `completionRate` already returned at the top level so the UI doesn't
    // have to reconcile two different formulas.
    // -----------------------------------------------------------------------
    const userRoleById = new Map(orgUsers.map((u) => [u.id, u.role]));
    const userDeptById = new Map(orgUsers.map((u) => [u.id, u.departmentId]));

    const progressByUser = await this.prisma.userProgress.groupBy({
      by: ['userId', 'status'],
      where: { user: { organizationId: user.organizationId } },
      _count: { _all: true },
    });

    type GroupTotals = { total: number; completed: number };
    const roleTotals = new Map<'ADMIN' | 'MANAGER' | 'EMPLOYEE', GroupTotals>([
      ['ADMIN', { total: 0, completed: 0 }],
      ['MANAGER', { total: 0, completed: 0 }],
      ['EMPLOYEE', { total: 0, completed: 0 }],
    ]);
    const deptTotals = new Map<string, GroupTotals>();

    for (const row of progressByUser) {
      const role = userRoleById.get(row.userId);
      const deptId = userDeptById.get(row.userId);
      const isCompleted = row.status === 'COMPLETED';
      const n = row._count._all;

      if (role) {
        const t = roleTotals.get(role)!;
        t.total += n;
        if (isCompleted) t.completed += n;
      }
      if (deptId) {
        const existing = deptTotals.get(deptId) ?? { total: 0, completed: 0 };
        existing.total += n;
        if (isCompleted) existing.completed += n;
        deptTotals.set(deptId, existing);
      }
    }

    // byRole: per-role { count, completionRate } so the admin dashboard can
    // surface "Employees: 42 (68% complete)" without falling back to the
    // CompletionReport endpoint. Roles with zero members still appear with
    // zeros so the UI doesn't need a missing-key fallback.
    const byRole: Record<
      'ADMIN' | 'MANAGER' | 'EMPLOYEE',
      { count: number; completionRate: number }
    > = {
      ADMIN: { count: 0, completionRate: 0 },
      MANAGER: { count: 0, completionRate: 0 },
      EMPLOYEE: { count: 0, completionRate: 0 },
    };
    for (const row of byRoleRaw) {
      const t = roleTotals.get(row.role)!;
      byRole[row.role] = {
        count: row._count._all,
        completionRate: t.total > 0 ? t.completed / t.total : 0,
      };
    }

    // Fetch department names for the byDepartment array.
    const deptIds = byDepartmentRaw
      .map((r) => r.departmentId)
      .filter((id): id is string => id !== null);

    const departments = await this.prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, name: true },
    });

    const deptNameMap = new Map(departments.map((d) => [d.id, d.name]));

    // byDepartment: { departmentId, name, count, completionRate } sorted
    // desc by count. The shape mirrors the CompletionReport's
    // `byDepartment` so the admin dashboard's `DeptBarList` can swap data
    // sources without changing its row mapping. Departments with zero
    // members are omitted (the user.groupBy filtered them out upstream).
    const byDepartment: Array<{
      departmentId: string;
      name: string;
      count: number;
      completionRate: number;
    }> = byDepartmentRaw
      .filter((row): row is typeof row & { departmentId: string } => row.departmentId !== null)
      .map((row) => {
        const totals = deptTotals.get(row.departmentId) ?? { total: 0, completed: 0 };
        return {
          departmentId: row.departmentId,
          name: deptNameMap.get(row.departmentId) ?? row.departmentId,
          count: row._count._all,
          completionRate: totals.total > 0 ? totals.completed / totals.total : 0,
        };
      })
      .sort((a, b) => b.count - a.count);

    const totalProgress = completionRaw._count._all;
    // completionRate is a 0–1 ratio so the UI can format with consistent
    // precision (Math.round(rate * 100) for percent display).
    const completionRate = totalProgress > 0 ? completedCount / totalProgress : 0;

    // Risk flags currently come from the reporting service; OrgStats stubs
    // it as 0 here to keep the dashboard query single-round-trip. A future
    // change can fold reporting risk flags in.
    const riskFlags = 0;

    return {
      totalUsers,
      activeUsers: activeUserCount,
      byRole,
      byDepartment,
      completionRate,
      riskFlags,
    };
  }

  // --------------------------------------------------------------------------
  // GET /organizations/:id/activity — org-wide activity stream (ADMIN only).
  //
  // Mirrors `UsersService.listUserActivity` but drops the per-user filter and
  // joins User so the actor's name comes back inline. Reads from
  // UserProgress / QuizAttempt / Certificate / Badge in parallel, sorts the
  // union descending by occurredAt, and slices to `limit`.
  //
  // The :id path param is validated against the caller's org so an ADMIN
  // can't peek into another tenant's stream — matches the same-org guard
  // used elsewhere (see UsersService).
  // --------------------------------------------------------------------------
  async listOrgActivity(
    sessionUser: SessionPayload,
    organizationId: string,
    limit: number,
  ): Promise<OrgActivityEvent[]> {
    if (organizationId !== sessionUser.organizationId) {
      throw new NotFoundException('Organization not found');
    }

    const TAKE = Math.min(Math.max(limit, 1), 50);

    const [progressRows, quizRows, certRows, badgeRows] = await Promise.all([
      this.prisma.userProgress.findMany({
        where: { status: 'COMPLETED', user: { organizationId } },
        select: {
          id: true,
          completedAt: true,
          userId: true,
          user: { select: { name: true } },
          lesson: {
            select: { title: true, learningPath: { select: { title: true } } },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: TAKE,
      }),
      this.prisma.quizAttempt.findMany({
        where: { user: { organizationId } },
        select: {
          id: true,
          score: true,
          passed: true,
          completedAt: true,
          userId: true,
          user: { select: { name: true } },
          quiz: { select: { title: true } },
        },
        orderBy: { completedAt: 'desc' },
        take: TAKE,
      }),
      this.prisma.certificate.findMany({
        where: { user: { organizationId } },
        select: {
          id: true,
          issuedAt: true,
          userId: true,
          user: { select: { name: true } },
          learningPath: { select: { title: true } },
        },
        orderBy: { issuedAt: 'desc' },
        take: TAKE,
      }),
      this.prisma.badge.findMany({
        where: { user: { organizationId } },
        select: {
          id: true,
          slug: true,
          label: true,
          awardedAt: true,
          rarity: true,
          xpReward: true,
          userId: true,
          user: { select: { name: true } },
        },
        orderBy: { awardedAt: 'desc' },
        take: TAKE,
      }),
    ]);

    const events: OrgActivityEvent[] = [];

    for (const p of progressRows) {
      events.push({
        id: p.id,
        type: 'lesson_completed',
        occurredAt: (p.completedAt ?? new Date(0)).toISOString(),
        title: `Completed lesson: ${p.lesson.title}`,
        userId: p.userId,
        userName: p.user.name,
        meta: {
          lessonTitle: p.lesson.title,
          pathTitle: p.lesson.learningPath.title,
        },
      });
    }

    for (const q of quizRows) {
      events.push({
        id: q.id,
        type: 'quiz_attempted',
        occurredAt: q.completedAt.toISOString(),
        title: `${q.passed ? 'Passed' : 'Attempted'} quiz: ${q.quiz.title}`,
        userId: q.userId,
        userName: q.user.name,
        meta: { quizTitle: q.quiz.title, score: q.score, passed: q.passed },
      });
    }

    for (const c of certRows) {
      events.push({
        id: c.id,
        type: 'certificate_earned',
        occurredAt: c.issuedAt.toISOString(),
        title: `Earned certificate: ${c.learningPath.title}`,
        userId: c.userId,
        userName: c.user.name,
        meta: { pathTitle: c.learningPath.title },
      });
    }

    for (const b of badgeRows) {
      events.push({
        id: b.id,
        type: 'badge_earned',
        occurredAt: b.awardedAt.toISOString(),
        title: `Earned badge: ${b.label}`,
        userId: b.userId,
        userName: b.user.name,
        meta: { slug: b.slug, rarity: b.rarity, xpReward: b.xpReward },
      });
    }

    events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    return events.slice(0, TAKE);
  }
}
