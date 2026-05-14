import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Skill, type UserSkill, type SkillTier } from '@levelup/db';
import type { SessionPayload } from '@levelup/auth-client';
import type {
  CreateSkillInput,
  SkillSummary,
  TeamSkillHeatmap,
  UserSkillRow,
} from '@levelup/types';
import { PrismaService } from '../prisma/prisma.service';

const COMPOSITE_WEIGHTS = { exposure: 0.3, practice: 0.4, transfer: 0.3 } as const;

function composite(row: Pick<UserSkill, 'exposure' | 'practice' | 'transfer'>): number {
  return (
    row.exposure * COMPOSITE_WEIGHTS.exposure +
    row.practice * COMPOSITE_WEIGHTS.practice +
    row.transfer * COMPOSITE_WEIGHTS.transfer
  );
}

function toSummary(skill: Skill): SkillSummary {
  const rawPrereq = skill.prerequisites as Prisma.JsonValue;
  const prerequisites = Array.isArray(rawPrereq)
    ? rawPrereq.filter((v): v is string => typeof v === 'string')
    : [];
  return {
    id: skill.id,
    organizationId: skill.organizationId,
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    tier: skill.tier as SkillTier,
    prerequisites,
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
  };
}

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  private async writeAuditLog(
    organizationId: string,
    actorId: string,
    action: string,
    targetId: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          actorId,
          action,
          targetType: 'Skill',
          targetId,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    } catch {
      // Audit failures must never block the parent operation.
    }
  }

  async listVisibleSkills(user: SessionPayload): Promise<SkillSummary[]> {
    const rows = await this.prisma.skill.findMany({
      where: {
        OR: [{ organizationId: null }, { organizationId: user.organizationId }],
      },
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toSummary);
  }

  async listMySkills(user: SessionPayload): Promise<UserSkillRow[]> {
    const rows = await this.prisma.userSkill.findMany({
      where: { userId: user.userId },
      include: { skill: true },
    });

    return rows
      .filter(
        (r) => r.skill.organizationId === null || r.skill.organizationId === user.organizationId,
      )
      .map((r) => ({
        skillId: r.skillId,
        slug: r.skill.slug,
        name: r.skill.name,
        tier: r.skill.tier as SkillTier,
        exposure: r.exposure,
        practice: r.practice,
        transfer: r.transfer,
        composite: composite(r),
        updatedAt: r.updatedAt.toISOString(),
      }))
      .sort((a, b) => b.composite - a.composite);
  }

  async getTeamHeatmap(
    user: SessionPayload,
    options?: { limit?: number },
  ): Promise<TeamSkillHeatmap> {
    const limit = Math.min(Math.max(options?.limit ?? 200, 1), 500);

    const users = await this.prisma.user.findMany({
      where: { organizationId: user.organizationId, deactivatedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
      take: limit,
    });

    const userIds = users.map((u) => u.id);

    const skillRows = await this.prisma.skill.findMany({
      where: {
        OR: [{ organizationId: null }, { organizationId: user.organizationId }],
      },
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
    });

    const skills = skillRows.map((s) => ({
      skillId: s.id,
      slug: s.slug,
      name: s.name,
      tier: s.tier as SkillTier,
    }));

    if (userIds.length === 0 || skillRows.length === 0) {
      return {
        users: users.map((u) => ({
          userId: u.id,
          userName: u.name,
          email: u.email,
          departmentId: u.departmentId,
          departmentName: u.department?.name ?? null,
        })),
        skills,
        cells: [],
      };
    }

    const userSkills = await this.prisma.userSkill.findMany({
      where: {
        userId: { in: userIds },
        skill: {
          OR: [{ organizationId: null }, { organizationId: user.organizationId }],
        },
      },
      include: { skill: true },
    });

    const cells = userSkills.map((row) => {
      const u = users.find((x) => x.id === row.userId);
      return {
        userId: row.userId,
        userName: u?.name ?? '',
        email: u?.email ?? '',
        departmentId: u?.departmentId ?? null,
        departmentName: u?.department?.name ?? null,
        skillId: row.skillId,
        skillSlug: row.skill.slug,
        skillName: row.skill.name,
        tier: row.skill.tier as SkillTier,
        exposure: row.exposure,
        practice: row.practice,
        transfer: row.transfer,
        composite: composite(row),
      };
    });

    return {
      users: users.map((u) => ({
        userId: u.id,
        userName: u.name,
        email: u.email,
        departmentId: u.departmentId,
        departmentName: u.department?.name ?? null,
      })),
      skills,
      cells,
    };
  }

  async createOrgSkill(user: SessionPayload, dto: CreateSkillInput): Promise<SkillSummary> {
    const existing = await this.prisma.skill.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Skill with slug "${dto.slug}" already exists`);
    }

    const created = await this.prisma.skill.create({
      data: {
        organizationId: user.organizationId,
        slug: dto.slug,
        name: dto.name,
        description: dto.description ?? null,
        tier: dto.tier,
        prerequisites: dto.prerequisites as Prisma.InputJsonValue,
      },
    });

    await this.writeAuditLog(user.organizationId, user.userId, 'skill.created', created.id, {
      slug: created.slug,
      tier: created.tier,
    });

    return toSummary(created);
  }

  async getSkillBySlug(user: SessionPayload, slug: string): Promise<SkillSummary> {
    const skill = await this.prisma.skill.findUnique({ where: { slug } });
    if (!skill) throw new NotFoundException('Skill not found');
    if (skill.organizationId !== null && skill.organizationId !== user.organizationId) {
      throw new NotFoundException('Skill not found');
    }
    return toSummary(skill);
  }
}
