/**
 * PathBuilderService — CR.33 AI-generated learning paths.
 *
 * Lifecycle:
 *   1. Admin POSTs prompt → createRequest() inserts a PENDING row and enqueues
 *      a `path-generation` job. Worker flips status → GENERATING → READY (or
 *      FAILED) and stores the draft on the row.
 *   2. Admin polls getRequest() until status is terminal.
 *   3. Admin POSTs to /accept → acceptDraft() materializes the draft into a
 *      real LearningPath + Lessons + Quizzes inside one Prisma transaction.
 *      The originating request keeps status READY but gains `generatedPathId`
 *      and `completedAt` (no ACCEPTED enum value to keep the migration small).
 *
 * Every mutation writes an audit log so SREs can trace exactly what an admin
 * generated and shipped.
 */

import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { enqueuePathGeneration } from '@levelup/queue';
import type { AiLevel, Prisma } from '@levelup/db';
import { type LearningPath, type PathGenerationRequest } from '@levelup/db';
import type { SessionPayload } from '@levelup/auth-client';
import {
  generatedPathSchema,
  type CreatePathRequestInput,
  type GeneratedPath,
  type GeneratedPathEdits,
  type PathGenerationRequestDto,
  type PathGenerationStatusValue,
} from '@levelup/types';

@Injectable()
export class PathBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  async createRequest(
    user: SessionPayload,
    dto: CreatePathRequestInput,
  ): Promise<PathGenerationRequestDto> {
    // -----------------------------------------------------------------------
    // Abuse guards — prevent burning through OpenAI credits.
    // -----------------------------------------------------------------------
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [hourCount, dayCount] = await Promise.all([
      this.prisma.pathGenerationRequest.count({
        where: { organizationId: user.organizationId, createdAt: { gte: hourAgo } },
      }),
      this.prisma.pathGenerationRequest.count({
        where: { organizationId: user.organizationId, createdAt: { gte: dayAgo } },
      }),
    ]);

    if (hourCount >= 5) {
      const nextAllowedAt = new Date(hourAgo.getTime() + 60 * 60 * 1000);
      const minutesRemaining = Math.ceil((nextAllowedAt.getTime() - now.getTime()) / 60_000);
      await this.writeAudit(user, 'path_builder.rate_limited', 'none', {
        reason: 'hourly_limit',
        hourCount,
        minutesRemaining,
      });
      throw new HttpException(
        `Path generation rate limit hit. Try again in ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (dayCount >= 10) {
      await this.writeAudit(user, 'path_builder.rate_limited', 'none', {
        reason: 'daily_limit',
        dayCount,
      });
      throw new HttpException('Daily path generation limit reached.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // -----------------------------------------------------------------------

    const created = await this.prisma.pathGenerationRequest.create({
      data: {
        organizationId: user.organizationId,
        requestedById: user.userId,
        prompt: dto.prompt,
        audience: dto.audience ?? null,
        status: 'PENDING',
      },
    });

    // Fire-and-forget enqueue. If this throws (Redis down) we still want the
    // row visible to the admin — they can cancel it from the UI.
    try {
      await enqueuePathGeneration({ requestId: created.id });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await this.prisma.pathGenerationRequest.update({
        where: { id: created.id },
        data: { status: 'FAILED', failedReason: `Enqueue failed: ${reason}` },
      });
      throw err;
    }

    await this.writeAudit(user, 'path_builder.create', created.id, {
      prompt: dto.prompt,
      audience: dto.audience ?? null,
    });

    return this.toDto(
      await this.prisma.pathGenerationRequest.findUniqueOrThrow({
        where: { id: created.id },
      }),
    );
  }

  async getRequest(id: string, user: SessionPayload): Promise<PathGenerationRequestDto> {
    const row = await this.loadOwned(id, user);
    return this.toDto(row);
  }

  async listRequests(organizationId: string): Promise<PathGenerationRequestDto[]> {
    const rows = await this.prisma.pathGenerationRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => this.toDto(r));
  }

  async cancelRequest(id: string, user: SessionPayload): Promise<PathGenerationRequestDto> {
    const row = await this.loadOwned(id, user);
    if (row.status !== 'PENDING' && row.status !== 'GENERATING') {
      throw new BadRequestException(`Cannot cancel request in status ${row.status}`);
    }

    const updated = await this.prisma.pathGenerationRequest.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    await this.writeAudit(user, 'path_builder.cancel', id, {
      previousStatus: row.status,
    });

    return this.toDto(updated);
  }

  async acceptDraft(
    id: string,
    user: SessionPayload,
    edits?: GeneratedPathEdits,
  ): Promise<LearningPath> {
    const row = await this.loadOwned(id, user);
    if (row.status !== 'READY') {
      throw new BadRequestException(`Cannot accept request in status ${row.status}`);
    }
    if (row.generatedPathId) {
      throw new BadRequestException('This request has already been accepted into a learning path');
    }

    const draft = parseDraft(row.draft);
    if (!draft) {
      throw new BadRequestException('Stored draft is missing or invalid');
    }

    const merged = mergeEdits(draft, edits);
    const slug = await this.uniqueSlug(user.organizationId, merged.title);

    const path = await this.prisma.$transaction(async (tx) => {
      const created = await tx.learningPath.create({
        data: {
          organizationId: user.organizationId,
          title: merged.title,
          slug,
          description: merged.description,
          targetRole: null, // free-text from the LLM doesn't map to the Role enum
          targetLevel: merged.targetLevel as AiLevel,
          isPublished: false,
        },
      });

      for (let i = 0; i < merged.lessons.length; i++) {
        const lesson = merged.lessons[i];
        if (!lesson) continue;
        const lessonRow = await tx.lesson.create({
          data: {
            learningPathId: created.id,
            title: lesson.title,
            slug: lesson.slug,
            body: lesson.body,
            estimatedMinutes: lesson.estimatedMinutes,
            orderIndex: i,
          },
        });

        const quiz = await tx.quiz.create({
          data: {
            lessonId: lessonRow.id,
            title: lesson.quiz.title,
          },
        });

        for (let q = 0; q < lesson.quiz.questions.length; q++) {
          const question = lesson.quiz.questions[q];
          if (!question) continue;
          await tx.quizQuestion.create({
            data: {
              quizId: quiz.id,
              prompt: question.prompt,
              choices: question.choices,
              correctIndex: question.correctIndex,
              explanation: question.explanation,
              orderIndex: q,
            },
          });
        }
      }

      await tx.pathGenerationRequest.update({
        where: { id: row.id },
        data: { generatedPathId: created.id, completedAt: new Date() },
      });

      return created;
    });

    await this.writeAudit(user, 'path_builder.accepted', id, {
      requestId: id,
      pathId: path.id,
      lessonCount: merged.lessons.length,
    });

    return path;
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private async loadOwned(id: string, user: SessionPayload): Promise<PathGenerationRequest> {
    const row = await this.prisma.pathGenerationRequest.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Path generation request not found');
    if (row.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cannot access requests outside your organization');
    }
    return row;
  }

  /** Generate a unique kebab-case slug for the path within the organization. */
  private async uniqueSlug(organizationId: string, title: string): Promise<string> {
    const base = slugify(title) || 'ai-generated-path';
    let candidate = base;
    let counter = 1;
    // Cap iterations to avoid pathological loops; collisions are extremely rare.
    while (counter < 100) {
      const existing = await this.prisma.learningPath.findFirst({
        where: { organizationId, slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
      counter += 1;
      candidate = `${base}-${counter}`;
    }
    // Fallback: append a random suffix.
    return `${base}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private async writeAudit(
    user: SessionPayload,
    action: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action,
        targetType: 'PathGenerationRequest',
        targetId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  private toDto(row: PathGenerationRequest): PathGenerationRequestDto {
    return {
      id: row.id,
      organizationId: row.organizationId,
      requestedById: row.requestedById,
      prompt: row.prompt,
      audience: row.audience,
      status: row.status as PathGenerationStatusValue,
      failedReason: row.failedReason,
      generatedPathId: row.generatedPathId,
      draft: parseDraft(row.draft),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers (module-private)
// ---------------------------------------------------------------------------

function parseDraft(raw: Prisma.JsonValue | null): GeneratedPath | null {
  if (raw === null || raw === undefined) return null;
  const result = generatedPathSchema.safeParse(raw);
  return result.success ? result.data : null;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Apply optional edits over the stored draft.
 *
 * - Top-level fields (title, description, targetRole, targetLevel) are a
 *   shallow merge; any field absent from `edits` falls back to the draft.
 * - `edits.lessons` is matched by `slug`. Unknown slugs are ignored — we
 *   never insert new lessons through this path. Only `title`,
 *   `estimatedMinutes`, and `body` are editable; the quiz and slug are not
 *   editable through this endpoint to keep the contract small.
 */
function mergeEdits(draft: GeneratedPath, edits: GeneratedPathEdits | undefined): GeneratedPath {
  if (!edits) return draft;

  const lessonEditsBySlug = new Map<string, NonNullable<GeneratedPathEdits['lessons']>[number]>();
  if (edits.lessons) {
    for (const e of edits.lessons) lessonEditsBySlug.set(e.slug, e);
  }

  return {
    title: edits.title ?? draft.title,
    description: edits.description ?? draft.description,
    targetRole: edits.targetRole === undefined ? draft.targetRole : edits.targetRole,
    targetLevel: edits.targetLevel ?? draft.targetLevel,
    lessons: draft.lessons.map((lesson) => {
      const e = lessonEditsBySlug.get(lesson.slug);
      if (!e) return lesson;
      return {
        ...lesson,
        title: e.title ?? lesson.title,
        estimatedMinutes: e.estimatedMinutes ?? lesson.estimatedMinutes,
        body: e.body ?? lesson.body,
      };
    }),
  };
}
