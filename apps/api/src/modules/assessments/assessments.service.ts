import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { PrismaService } from '../prisma';
import type { SessionPayload } from '@levelup/auth-client';
import { AssessmentType, AiLevel } from '@levelup/db';
import type { AssessmentItem, Prisma } from '@levelup/db';
import { sampleItems } from './sampling';
import { scoreAssessment } from './scoring';
import type { StartAssessmentDto } from './dto/start-assessment.dto';
import type { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { track } from '@levelup/analytics';

/** Fields returned per item on /start — correctIndex is intentionally excluded. */
interface PublicAssessmentItem {
  id: string;
  prompt: string;
  choices: unknown;
  level: AiLevel;
  category: string;
}

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // POST /assessments/start
  // ---------------------------------------------------------------------------
  async startAssessment(
    sessionUser: SessionPayload,
    dto: StartAssessmentDto,
  ): Promise<{ assessmentSessionId: string; items: PublicAssessmentItem[] }> {
    const type = dto.type ?? AssessmentType.BASELINE;

    const allItems = await this.fetchItemBank(sessionUser.organizationId);

    const { items, sessionId } = sampleItems(allItems, sessionUser.userId, type);

    await this.createAuditLog(sessionUser, 'assessment.start', {
      type,
      sessionId,
    });

    return {
      assessmentSessionId: sessionId,
      items: items.map((item) => ({
        id: item.id,
        prompt: item.prompt,
        choices: item.choices,
        level: item.level,
        category: item.category,
        // correctIndex is explicitly NOT included
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // POST /assessments/submit
  // ---------------------------------------------------------------------------
  async submitAssessment(sessionUser: SessionPayload, dto: SubmitAssessmentDto) {
    const { assessmentSessionId, type, itemResponses } = dto;

    // 1. Re-fetch the same item bank.
    const allItems = await this.fetchItemBank(sessionUser.organizationId);

    // 2. Re-derive the sample deterministically (same seed = same sample).
    const { items: sampledItems, sessionId: expectedSessionId } = sampleItems(
      allItems,
      sessionUser.userId,
      type,
    );

    // 3. Validate that the submitted sessionId matches what we'd generate today.
    if (assessmentSessionId !== expectedSessionId) {
      throw new BadRequestException(
        'assessmentSessionId does not match the expected sample for today. ' +
          'The item set may have been tampered with or the session has expired (started on a previous day).',
      );
    }

    // 4. Validate that all submitted itemIds belong to the sampled set.
    const sampledItemIds = new Set(sampledItems.map((i) => i.id));
    for (const r of itemResponses) {
      if (!sampledItemIds.has(r.itemId)) {
        throw new BadRequestException(
          `Item ${r.itemId} was not part of the sampled set for this session.`,
        );
      }
    }

    // 6. Idempotency check. If we already scored this session, return the
    // persisted attempt rather than creating a duplicate. A retry / double-
    // submit (network glitch, double-click) collapses to the same row instead
    // of fanning out audit logs + analytics + duplicate aiLevel updates.
    const existing = await this.prisma.assessment.findFirst({
      where: {
        userId: sessionUser.userId,
        type,
        assessmentSessionId,
      },
    });

    // Decide which response set to score. For a new attempt: the dto. For an
    // existing row: re-derive from the stored responses so the returned shape
    // always matches what was persisted, regardless of what the caller resent.
    const effectiveResponses = existing
      ? (existing.itemResponses as unknown as Array<{ itemId: string; choiceIndex: number }>)
      : itemResponses;
    const responseMap = new Map<string, number>(
      effectiveResponses.map((r) => [r.itemId, r.choiceIndex]),
    );
    const result = scoreAssessment(sampledItems, responseMap);

    let assessment = existing;
    if (!assessment) {
      try {
        assessment = await this.prisma.assessment.create({
          data: {
            organizationId: sessionUser.organizationId,
            userId: sessionUser.userId,
            type,
            score: result.correct,
            recommendedLevel: result.recommendedLevel,
            itemResponses: itemResponses as unknown as Prisma.InputJsonValue,
            assessmentSessionId,
          },
        });

        await this.createAuditLog(sessionUser, 'assessment.submit', {
          assessmentId: assessment.id,
          type,
          score: result.correct,
          total: result.total,
          recommendedLevel: result.recommendedLevel,
        });

        // Fire-and-forget analytics capture — must never throw into the caller.
        track.assessmentSubmitted({
          organizationId: sessionUser.organizationId,
          userId: sessionUser.userId,
          assessmentId: assessment.id,
          type: String(type),
          score: result.correct,
          total: result.total,
          recommendedLevel: String(result.recommendedLevel),
        });

        // 8. Auto-update aiLevel on first BASELINE only.
        if (type === AssessmentType.BASELINE) {
          await this.maybeUpdateAiLevel(sessionUser, result.recommendedLevel, assessment.id);
        }
      } catch (err: unknown) {
        // Concurrent submit raced past findFirst — the unique index caught the
        // duplicate. Refetch the winning row instead of bubbling P2002 to the
        // caller. Cast keeps the check loose so we don't drag in PrismaClientKnownRequestError.
        const code = (err as { code?: string } | null)?.code;
        if (code !== 'P2002') throw err;
        assessment = await this.prisma.assessment.findFirst({
          where: { userId: sessionUser.userId, type, assessmentSessionId },
        });
        if (!assessment) throw err;
      }
    }

    const message = buildMessage(result.recommendedLevel, result.correct, result.total);

    // Flatten the rich per-level breakdown to a numeric percentage for the
    // contract returned to the UI. The UI only needs a 0–100 number per level
    // (see ResultSummary's per-level Progress bars) — keeping correct/total/
    // ratio internal avoids exposing internals callers don't use.
    const scoreByLevel: Record<AiLevel, number> = {
      [AiLevel.BEGINNER]: Math.round(result.scoreByLevel[AiLevel.BEGINNER].ratio * 100),
      [AiLevel.PRACTITIONER]: Math.round(result.scoreByLevel[AiLevel.PRACTITIONER].ratio * 100),
      [AiLevel.POWER_USER]: Math.round(result.scoreByLevel[AiLevel.POWER_USER].ratio * 100),
      [AiLevel.CHAMPION]: Math.round(result.scoreByLevel[AiLevel.CHAMPION].ratio * 100),
    };

    return {
      assessmentId: assessment.id,
      score: result.correct,
      total: result.total,
      scoreByLevel,
      recommendedLevel: result.recommendedLevel,
      message,
    };
  }

  // ---------------------------------------------------------------------------
  // GET /assessments/me
  // ---------------------------------------------------------------------------
  async listMyAssessments(sessionUser: SessionPayload) {
    return this.prisma.assessment.findMany({
      where: {
        userId: sessionUser.userId,
        organizationId: sessionUser.organizationId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        score: true,
        recommendedLevel: true,
        createdAt: true,
        // itemResponses intentionally excluded
      },
    });
  }

  // ---------------------------------------------------------------------------
  // GET /assessments/me/:id
  // ---------------------------------------------------------------------------
  async getMyAssessment(sessionUser: SessionPayload, assessmentId: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: sessionUser.userId,
        organizationId: sessionUser.organizationId,
      },
    });
    if (!assessment) {
      throw new BadRequestException('Assessment not found or does not belong to you.');
    }
    return assessment;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Fetch all AssessmentItems accessible to this org:
   * items with no org (global bank) plus any org-specific items.
   */
  private async fetchItemBank(organizationId: string): Promise<AssessmentItem[]> {
    return this.prisma.assessmentItem.findMany({
      where: {
        OR: [{ organizationId: null }, { organizationId }],
      },
    });
  }

  /**
   * Update the user's aiLevel if this is their first BASELINE assessment.
   * Subsequent baselines do NOT auto-update.
   */
  private async maybeUpdateAiLevel(
    sessionUser: SessionPayload,
    recommendedLevel: AiLevel,
    assessmentId: string,
  ): Promise<void> {
    // Count previous BASELINE assessments (excluding the one we just created).
    const previousBaselineCount = await this.prisma.assessment.count({
      where: {
        userId: sessionUser.userId,
        organizationId: sessionUser.organizationId,
        type: AssessmentType.BASELINE,
        NOT: { id: assessmentId },
      },
    });

    if (previousBaselineCount > 0) {
      // Not the first baseline — skip auto-update.
      return;
    }

    const user = await this.prisma.user.findFirst({
      where: { id: sessionUser.userId },
      select: { aiLevel: true },
    });

    if (!user) {
      throw new InternalServerErrorException('User not found when updating AI level.');
    }

    if (user.aiLevel === recommendedLevel) {
      // No change needed.
      return;
    }

    await this.prisma.user.update({
      where: { id: sessionUser.userId },
      data: { aiLevel: recommendedLevel },
    });

    await this.createAuditLog(sessionUser, 'assessment.level_updated', {
      previousLevel: user.aiLevel,
      newLevel: recommendedLevel,
      reason: 'first_baseline',
    });
  }

  private async createAuditLog(
    sessionUser: SessionPayload,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId: sessionUser.organizationId,
        actorId: sessionUser.userId,
        action,
        targetType: 'Assessment',
        targetId: sessionUser.userId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function buildMessage(level: AiLevel, correct: number, total: number): string {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const labels: Record<AiLevel, string> = {
    [AiLevel.BEGINNER]: 'Beginner',
    [AiLevel.PRACTITIONER]: 'Practitioner',
    [AiLevel.POWER_USER]: 'Power User',
    [AiLevel.CHAMPION]: 'Champion',
  };
  return (
    `You answered ${correct} of ${total} questions correctly (${pct}%). ` +
    `Based on your results, we recommend starting at the ${labels[level]} level.`
  );
}
