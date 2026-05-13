import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@levelup/db';
import { PrismaService } from '../prisma';
import { SessionPayload } from '@levelup/auth-client';
import { AiLevel, Badge, Role } from '@levelup/db';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SetAiLevelDto } from './dto/set-ai-level.dto';
import { ActivityEvent, LeaderboardOptOutInput } from '@levelup/types';

interface ListUsersQuery {
  role?: Role;
  departmentId?: string;
  aiLevel?: AiLevel;
  q?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(sessionUser: SessionPayload, query: ListUsersQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      organizationId: sessionUser.organizationId,
      ...(query.role && { role: query.role }),
      ...(query.departmentId && { departmentId: query.departmentId }),
      ...(query.aiLevel && { aiLevel: query.aiLevel }),
      ...(query.q && {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { email: { contains: query.q, mode: 'insensitive' } },
          { jobTitle: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          jobTitle: true,
          aiLevel: true,
          avatarUrl: true,
          departmentId: true,
          lastLoginAt: true,
          createdAt: true,
          department: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async getMyProfile(sessionUser: SessionPayload) {
    const user = await this.prisma.user.findFirst({
      where: { id: sessionUser.userId, organizationId: sessionUser.organizationId },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMyProfile(sessionUser: SessionPayload, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: sessionUser.userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: sessionUser.organizationId,
        actorId: sessionUser.userId,
        action: 'user.update_self',
        targetType: 'User',
        targetId: sessionUser.userId,
        metadata: { changes: dto },
      },
    });

    return user;
  }

  async updateLeaderboardOptOut(sessionUser: SessionPayload, dto: LeaderboardOptOutInput) {
    const user = await this.prisma.user.update({
      where: { id: sessionUser.userId },
      data: { leaderboardOptOut: dto.optOut },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: sessionUser.organizationId,
          actorId: sessionUser.userId,
          action: 'user.leaderboard_opt_out_changed',
          targetType: 'User',
          targetId: sessionUser.userId,
          metadata: { optOut: dto.optOut },
        },
      });
    } catch {
      // Audit writes never block the parent op.
    }

    return user;
  }

  async getUserById(sessionUser: SessionPayload, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: sessionUser.organizationId },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserRole(sessionUser: SessionPayload, userId: string, dto: UpdateRoleDto) {
    const target = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: sessionUser.organizationId },
    });
    if (!target) throw new NotFoundException('User not found');

    // Guard: cannot demote yourself if you're the only ADMIN
    if (userId === sessionUser.userId && target.role === 'ADMIN' && dto.role !== 'ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: { organizationId: sessionUser.organizationId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot demote yourself — you are the only ADMIN in the organization',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: sessionUser.organizationId,
        actorId: sessionUser.userId,
        action: 'user.update_role',
        targetType: 'User',
        targetId: userId,
        metadata: { previousRole: target.role, newRole: dto.role },
      },
    });

    return updated;
  }

  async updateUserDepartment(sessionUser: SessionPayload, userId: string, departmentId: string) {
    const target = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: sessionUser.organizationId },
    });
    if (!target) throw new NotFoundException('User not found');

    // Verify department belongs to same org
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId: sessionUser.organizationId },
    });
    if (!department) throw new NotFoundException('Department not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { departmentId },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: sessionUser.organizationId,
        actorId: sessionUser.userId,
        action: 'user.update_department',
        targetType: 'User',
        targetId: userId,
        metadata: {
          previousDepartmentId: target.departmentId,
          newDepartmentId: departmentId,
        },
      },
    });

    return updated;
  }

  async updateUserAiLevel(sessionUser: SessionPayload, userId: string, dto: SetAiLevelDto) {
    // Allowed if: caller is ADMIN or MANAGER, OR caller is the target user
    const isSelf = sessionUser.userId === userId;
    const isAdminOrManager = sessionUser.role === 'ADMIN' || sessionUser.role === 'MANAGER';

    if (!isSelf && !isAdminOrManager) {
      throw new ForbiddenException(
        'Only ADMIN, MANAGER, or the user themselves can update AI level',
      );
    }

    const target = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: sessionUser.organizationId },
    });
    if (!target) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { aiLevel: dto.aiLevel },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: sessionUser.organizationId,
        actorId: sessionUser.userId,
        action: 'user.update_ai_level',
        targetType: 'User',
        targetId: userId,
        metadata: { previousAiLevel: target.aiLevel, newAiLevel: dto.aiLevel },
      },
    });

    return updated;
  }

  async listMyBadges(userId: string): Promise<Badge[]> {
    return this.prisma.badge.findMany({
      where: { userId },
      orderBy: { awardedAt: 'desc' },
    });
  }

  async listUserActivity(
    sessionUser: SessionPayload,
    targetUserId: string,
  ): Promise<ActivityEvent[]> {
    // Authorization: EMPLOYEE can only view their own activity
    if (targetUserId !== sessionUser.userId && sessionUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('You can only view your own activity');
    }

    // For ADMIN/MANAGER: ensure the target user belongs to their org
    if (targetUserId !== sessionUser.userId) {
      const target = await this.prisma.user.findFirst({
        where: { id: targetUserId, organizationId: sessionUser.organizationId },
        select: { id: true },
      });
      if (!target) throw new NotFoundException('User not found');
    }

    const TAKE = 50;

    const [progressRows, quizRows, certRows, badgeRows] = await Promise.all([
      this.prisma.userProgress.findMany({
        where: { userId: targetUserId, status: 'COMPLETED' },
        select: {
          id: true,
          completedAt: true,
          lesson: {
            select: {
              title: true,
              learningPath: { select: { title: true } },
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: TAKE,
      }),
      this.prisma.quizAttempt.findMany({
        where: { userId: targetUserId },
        select: {
          id: true,
          score: true,
          passed: true,
          completedAt: true,
          quiz: { select: { title: true } },
        },
        orderBy: { completedAt: 'desc' },
        take: TAKE,
      }),
      this.prisma.certificate.findMany({
        where: { userId: targetUserId },
        select: {
          id: true,
          issuedAt: true,
          learningPath: { select: { title: true } },
        },
        orderBy: { issuedAt: 'desc' },
        take: TAKE,
      }),
      this.prisma.badge.findMany({
        where: { userId: targetUserId },
        select: {
          id: true,
          slug: true,
          label: true,
          awardedAt: true,
          rarity: true,
          xpReward: true,
        },
        orderBy: { awardedAt: 'desc' },
        take: TAKE,
      }),
    ]);

    const events: ActivityEvent[] = [];

    for (const p of progressRows) {
      events.push({
        id: p.id,
        type: 'lesson_completed',
        occurredAt: (p.completedAt ?? new Date(0)).toISOString(),
        title: `Completed lesson: ${p.lesson.title}`,
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
        meta: {
          quizTitle: q.quiz.title,
          score: q.score,
          passed: q.passed,
        },
      });
    }

    for (const c of certRows) {
      events.push({
        id: c.id,
        type: 'certificate_earned',
        occurredAt: c.issuedAt.toISOString(),
        title: `Earned certificate: ${c.learningPath.title}`,
        meta: { pathTitle: c.learningPath.title },
      });
    }

    for (const b of badgeRows) {
      events.push({
        id: b.id,
        type: 'badge_earned',
        occurredAt: b.awardedAt.toISOString(),
        title: `Earned badge: ${b.label}`,
        meta: {
          slug: b.slug,
          rarity: b.rarity,
          xpReward: b.xpReward,
        },
      });
    }

    // Sort combined timeline descending and return top 50
    events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    return events.slice(0, TAKE);
  }

  async deactivateUser(sessionUser: SessionPayload, userId: string) {
    const target = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: sessionUser.organizationId },
    });
    if (!target) throw new NotFoundException('User not found');

    // Stamp the deactivation timestamp and sever the Supabase link so the user
    // can no longer authenticate. Account row stays for audit history.
    const deactivatedAt = new Date();
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        deactivatedAt,
        supabaseUserId: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: sessionUser.organizationId,
        actorId: sessionUser.userId,
        action: 'user.deactivate',
        targetType: 'User',
        targetId: userId,
        metadata: { email: target.email, deactivatedAt: deactivatedAt.toISOString() },
      },
    });

    return { deactivated: true, userId, deactivatedAt: updated.deactivatedAt };
  }
}
