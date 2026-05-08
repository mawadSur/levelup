import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@levelup/db';
import { PrismaService } from '../prisma/prisma.service';
import { GameService } from '../game/game.service';
import type { SessionPayload } from '@levelup/auth-client';
import type { Prompt } from '@levelup/db';
import type { SavePromptDto } from './dto/save-prompt.dto';
import { track } from '@levelup/analytics';

/** Cap on how many PROMPT_CLONED awards a single original prompt can earn. */
const PROMPT_CLONE_AWARD_CAP = 5;

export interface ListPromptsQuery {
  category?: string;
  q?: string;
  limit?: string;
  cursor?: string;
}

export interface PromptPage {
  data: Prompt[];
  nextCursor: string | null;
}

@Injectable()
export class PromptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameService: GameService,
  ) {}

  // ─── helpers ──────────────────────────────────────────────────────────────

  private isManagerOrAbove(role: SessionPayload['role']): boolean {
    return role === 'MANAGER' || role === 'ADMIN';
  }

  private async writeAuditLog(
    organizationId: string,
    actorId: string,
    action: string,
    targetId: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId,
        action,
        targetType: 'Prompt',
        targetId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Fetches a prompt and throws NotFoundException unless the caller is allowed
   * to see it:
   *   - owner (userId match)
   *   - org-shared (same org + isShared + departmentId IS NULL)
   *   - dept-shared (same org + isShared + departmentId === caller's dept)
   *   - global library (organizationId IS NULL + isShared)
   *   - ADMIN same org (moderation access)
   */
  private async findAccessible(
    id: string,
    user: SessionPayload & { departmentId?: string | null },
  ): Promise<Prompt> {
    const prompt = await this.prisma.prompt.findUnique({ where: { id } });
    if (!prompt) throw new NotFoundException('Prompt not found');

    const isOwner = prompt.userId === user.userId;
    const orgId = prompt.organizationId;
    const promptDeptId = prompt.departmentId;

    const isOrgShared = orgId === user.organizationId && prompt.isShared && promptDeptId === null;
    const isDeptShared =
      orgId === user.organizationId &&
      prompt.isShared &&
      promptDeptId !== null &&
      promptDeptId === (user.departmentId ?? null);
    const isGlobal = orgId === null && prompt.isShared;
    const isAdminSameOrg = user.role === 'ADMIN' && orgId === user.organizationId;

    if (!isOwner && !isOrgShared && !isDeptShared && !isGlobal && !isAdminSameOrg) {
      throw new NotFoundException('Prompt not found');
    }

    return prompt;
  }

  // ─── list ─────────────────────────────────────────────────────────────────

  async listPrompts(
    user: SessionPayload & { departmentId?: string | null },
    query: ListPromptsQuery,
  ): Promise<PromptPage> {
    const take = Math.min(Math.max(parseInt(query.limit ?? '20', 10), 1), 100);

    // Build optional cursor filter (createdAt DESC, id DESC keyset pagination)
    let cursorFilter: Prisma.PromptWhereInput | undefined;
    if (query.cursor) {
      const sepIdx = query.cursor.lastIndexOf('__');
      if (sepIdx > 0) {
        const tsRaw = query.cursor.slice(0, sepIdx);
        const cursorId = query.cursor.slice(sepIdx + 2);
        const ts = new Date(tsRaw);
        if (!isNaN(ts.getTime())) {
          cursorFilter = {
            OR: [{ createdAt: { lt: ts } }, { createdAt: { equals: ts }, id: { lt: cursorId } }],
          };
        }
      }
    }

    const textFilter: Prisma.PromptWhereInput | undefined = query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' } },
            { promptText: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const categoryFilter: Prisma.PromptWhereInput | undefined = query.category
      ? { category: { equals: query.category, mode: 'insensitive' } }
      : undefined;

    // Visibility union:
    //   1. Own personal prompts
    //   2. Org-shared prompts (same org + isShared + departmentId IS NULL)
    //   3. Dept-shared prompts (same org + isShared + departmentId === caller's dept)
    //   4. Global library prompts (organizationId IS NULL + isShared)
    const deptId = user.departmentId ?? null;
    const visibilityOrClauses: Prisma.PromptWhereInput[] = [
      { userId: user.userId },
      // Org-wide shared (no dept restriction)
      { organizationId: user.organizationId, isShared: true, departmentId: null },
      // Global library
      { organizationId: null, isShared: true },
    ];

    // Add dept-shared clause only when the caller has a department
    if (deptId !== null) {
      visibilityOrClauses.push({
        organizationId: user.organizationId,
        isShared: true,
        departmentId: deptId,
      });
    }

    const visibilityFilter: Prisma.PromptWhereInput = {
      OR: visibilityOrClauses,
    };

    const andClauses: Prisma.PromptWhereInput[] = [visibilityFilter];
    if (textFilter) andClauses.push(textFilter);
    if (categoryFilter) andClauses.push(categoryFilter);
    if (cursorFilter) andClauses.push(cursorFilter);

    const rows = await this.prisma.prompt.findMany({
      where: { AND: andClauses },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });

    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;
    const last = data.at(-1);
    const nextCursor = hasMore && last ? `${last.createdAt.toISOString()}__${last.id}` : null;

    return { data, nextCursor };
  }

  // ─── get one ──────────────────────────────────────────────────────────────

  async getPromptById(
    id: string,
    user: SessionPayload & { departmentId?: string | null },
  ): Promise<Prompt> {
    return this.findAccessible(id, user);
  }

  // ─── create ───────────────────────────────────────────────────────────────

  async createPrompt(user: SessionPayload, dto: SavePromptDto): Promise<Prompt> {
    // EMPLOYEE may not share to the org — silently downgrade isShared to false.
    const isShared = dto.isShared && this.isManagerOrAbove(user.role);

    // EMPLOYEE may not set a departmentId — silently downgrade to undefined.
    // If the caller is MANAGER+ and provided a departmentId, validate that the
    // department belongs to the same org.
    let departmentId: string | null = null;
    if (dto.departmentId && this.isManagerOrAbove(user.role)) {
      const dept = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, organizationId: user.organizationId },
        select: { id: true },
      });
      if (dept) {
        departmentId = dept.id;
      }
      // If dept not found in org, silently fall back to null (org-wide)
    }

    const prompt = await this.prisma.prompt.create({
      data: {
        title: dto.title,
        promptText: dto.promptText,
        category: dto.category,
        isShared,
        userId: user.userId,
        organizationId: user.organizationId,
        ...(departmentId !== null ? { departmentId } : {}),
      },
    });

    await this.writeAuditLog(user.organizationId, user.userId, 'prompt.create', prompt.id, {
      title: prompt.title,
      isShared,
      ...(departmentId ? { departmentId } : {}),
    });

    // Fire-and-forget analytics capture — must never throw into the caller.
    track.promptSaved({
      organizationId: user.organizationId,
      userId: user.userId,
      promptId: prompt.id,
      category: prompt.category,
      isShared,
      departmentId: departmentId,
    });

    // Saving a prompt counts toward the daily "save / practice prompts"
    // quest. Best-effort — if the gamification path fails the prompt is
    // already persisted and we don't want to roll the user back.
    try {
      await this.gameService.incrementQuestProgress(user.userId, 'prompt', 1);
    } catch {
      // swallow — gamification is non-critical
    }

    return prompt;
  }

  // ─── update ───────────────────────────────────────────────────────────────

  async updatePrompt(
    id: string,
    user: SessionPayload,
    dto: Partial<SavePromptDto>,
  ): Promise<Prompt> {
    const existing = await this.prisma.prompt.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prompt not found');

    const isOwner = existing.userId === user.userId;
    const isAdminSameOrg = user.role === 'ADMIN' && existing.organizationId === user.organizationId;

    if (!isOwner && !isAdminSameOrg) {
      throw new ForbiddenException('You do not own this prompt');
    }

    // Honour isShared change, but enforce MANAGER+ rule
    let isShared = existing.isShared;
    if (dto.isShared !== undefined) {
      isShared = dto.isShared && this.isManagerOrAbove(user.role);
    }

    // Honour departmentId change; EMPLOYEE cannot set it.
    let departmentId: string | null | undefined = undefined; // undefined = no change
    if ('departmentId' in dto) {
      if (this.isManagerOrAbove(user.role)) {
        if (dto.departmentId === null || dto.departmentId === undefined) {
          departmentId = null; // explicitly clearing
        } else {
          const dept = await this.prisma.department.findFirst({
            where: { id: dto.departmentId, organizationId: user.organizationId },
            select: { id: true },
          });
          departmentId = dept ? dept.id : null; // fall back to null if not found
        }
      }
      // EMPLOYEE: ignore the field (departmentId stays undefined = no change)
    }

    const updated = await this.prisma.prompt.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.promptText !== undefined && { promptText: dto.promptText }),
        ...(dto.category !== undefined && { category: dto.category }),
        isShared,
        ...(departmentId !== undefined && { departmentId }),
      },
    });

    await this.writeAuditLog(user.organizationId, user.userId, 'prompt.update', id, {
      changes: dto,
      ...(departmentId !== undefined ? { departmentId } : {}),
    });

    return updated;
  }

  // ─── delete ───────────────────────────────────────────────────────────────

  async deletePrompt(id: string, user: SessionPayload): Promise<{ deleted: true }> {
    const existing = await this.prisma.prompt.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prompt not found');

    const isOwner = existing.userId === user.userId;
    const isAdminSameOrg = user.role === 'ADMIN' && existing.organizationId === user.organizationId;

    if (!isOwner && !isAdminSameOrg) {
      throw new ForbiddenException('You do not own this prompt');
    }

    await this.prisma.prompt.delete({ where: { id } });

    await this.writeAuditLog(user.organizationId, user.userId, 'prompt.delete', id, {
      title: existing.title,
    });

    return { deleted: true };
  }

  // ─── clone ────────────────────────────────────────────────────────────────

  async clonePrompt(
    id: string,
    user: SessionPayload & { departmentId?: string | null },
  ): Promise<Prompt> {
    const source = await this.findAccessible(id, user);

    const cloned = await this.prisma.prompt.create({
      data: {
        title: `${source.title} (copy)`,
        promptText: source.promptText,
        category: source.category,
        isShared: false,
        userId: user.userId,
        organizationId: user.organizationId,
      },
    });

    await this.writeAuditLog(user.organizationId, user.userId, 'prompt.clone', cloned.id, {
      sourceId: source.id,
      sourceTitle: source.title,
    });

    // Reward the *original* author for being cloned by another user. Self-
    // clones don't count. Org-of-the-original is used as the org for the
    // XP event so the leaderboard scopes correctly. The sourceId is
    // `${originalId}:${cloningUserId}` so re-cloning by the same user is a
    // no-op (the XpEvent @@unique catches it). Cap at PROMPT_CLONE_AWARD_CAP
    // total awards per original prompt so one viral prompt can't infinitely
    // mint XP for its author.
    if (source.userId !== user.userId && source.organizationId) {
      try {
        const awardsSoFar = await this.prisma.xpEvent.count({
          where: {
            userId: source.userId,
            kind: 'PROMPT_CLONED',
            sourceType: 'Prompt',
            sourceId: { startsWith: `${source.id}:` },
          },
        });
        if (awardsSoFar < PROMPT_CLONE_AWARD_CAP) {
          await this.gameService.awardXp({
            userId: source.userId,
            organizationId: source.organizationId,
            kind: 'PROMPT_CLONED',
            sourceType: 'Prompt',
            sourceId: `${source.id}:${user.userId}`,
            meta: { cloningUserId: user.userId, originalPromptId: source.id },
          });
        }
      } catch {
        // swallow — gamification is non-critical
      }
    }

    // Fire-and-forget analytics capture — must never throw into the caller.
    track.promptCloned({
      organizationId: user.organizationId,
      userId: user.userId,
      originalPromptId: source.id,
      cloningUserId: user.userId,
    });

    // The cloning user's daily "prompt" quest progresses too — they did a
    // prompt-related action even though they didn't author the original.
    try {
      await this.gameService.incrementQuestProgress(user.userId, 'prompt', 1);
    } catch {
      // swallow
    }

    return cloned;
  }

  // ─── share / unshare ──────────────────────────────────────────────────────

  async toggleShare(id: string, user: SessionPayload): Promise<Prompt> {
    const existing = await this.prisma.prompt.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prompt not found');

    if (existing.userId !== user.userId) {
      throw new ForbiddenException('Only the owner can toggle sharing');
    }

    if (!this.isManagerOrAbove(user.role)) {
      throw new ForbiddenException('Only MANAGER or ADMIN can share prompts to the organisation');
    }

    const updated = await this.prisma.prompt.update({
      where: { id },
      // Preserve the existing departmentId so toggling share on/off
      // does not lose a dept-scoped prompt's scope.
      data: { isShared: !existing.isShared },
    });

    const promptDeptId = updated.departmentId;
    await this.writeAuditLog(user.organizationId, user.userId, 'prompt.share', id, {
      isShared: updated.isShared,
      ...(promptDeptId ? { departmentId: promptDeptId } : {}),
    });

    return updated;
  }
}
