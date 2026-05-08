import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma';
import { getPlanLimit, getPlanConfig } from '@levelup/billing';
import { Plan } from '@levelup/db';
import { enqueueEmail } from '@levelup/queue';
import type { SessionPayload } from '@levelup/auth-client';
import type { UpdateOrgDto } from './dto/update-org.dto';
import type { CreateOrganizationInput } from '@levelup/types';

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

    // Send welcome email (fire-and-forget — do not block org creation)
    await enqueueEmail({
      to: dto.adminEmail,
      templateKey: 'welcome',
      data: { orgName: org.name, adminName: dto.adminName },
    });

    // Audit log — emit both signup and trial-started so analytics can
    // distinguish between the two events.
    await this.prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorId: org.id, // system actor — no user record yet
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
        actorId: org.id,
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

    const [totalUsers, activeUserCount, byRoleRaw, byDepartmentRaw, completionRaw] =
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
      ]);

    const completedCount = await this.prisma.userProgress.count({
      where: {
        status: 'COMPLETED',
        user: { organizationId: user.organizationId },
      },
    });

    // byRole: a flat Record<Role, number>. Roles with zero members are
    // included so the UI can render zeros without an undefined fallback.
    const byRole: Record<'ADMIN' | 'MANAGER' | 'EMPLOYEE', number> = {
      ADMIN: 0,
      MANAGER: 0,
      EMPLOYEE: 0,
    };
    for (const row of byRoleRaw) {
      byRole[row.role] = row._count._all;
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

    // byDepartment: Array<{ name, count }> sorted desc by count for stable
    // dashboard rendering. Departments with zero members are omitted.
    const byDepartment: Array<{ name: string; count: number }> = byDepartmentRaw
      .filter((row): row is typeof row & { departmentId: string } => row.departmentId !== null)
      .map((row) => ({
        name: deptNameMap.get(row.departmentId) ?? row.departmentId,
        count: row._count._all,
      }))
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
}
