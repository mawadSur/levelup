import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@levelup/db';
import { type Lab, type LabAttempt } from '@levelup/db';
import { chatComplete, isStubMode } from '@levelup/llm';
import {
  labCriterionResultSchema,
  labRubricSchema,
  labSeededContextSchema,
  labSpecSchema,
  labUpdateSpecSchema,
  type LabAttemptHistoryItem,
  type LabAttemptResponse,
  type LabAttemptSummary,
  type LabCriterionResult,
  type LabDetail,
  type LabRubric,
  type LabRunResponse,
  type LabSpec,
  type LabSummary,
  type LabTranscript,
  type LabUpdateSpec,
  type StuckLearner,
} from '@levelup/types';
import type { SessionPayload } from '@levelup/auth-client';
import { PrismaService } from '../prisma';
import { GameService } from '../game/game.service';
import { IncidentsService } from '../incidents/incidents.service';
import { gradeAttempt } from './grader';

const LAB_MODEL = 'gpt-4o-mini';
const MAX_TRANSCRIPT_TURNS = 40;

function parseRubric(raw: Prisma.JsonValue): LabRubric {
  const parsed = labRubricSchema.safeParse(raw);
  if (!parsed.success) {
    throw new BadRequestException(`Lab rubric is malformed: ${parsed.error.message}`);
  }
  return parsed.data;
}

function parseSeededContext(raw: Prisma.JsonValue): Record<string, unknown> {
  const parsed = labSeededContextSchema.safeParse(raw);
  if (!parsed.success) return {};
  return parsed.data;
}

function parseCriteria(raw: Prisma.JsonValue): LabCriterionResult[] {
  const parsed = labCriterionResultSchema.array().safeParse(raw);
  return parsed.success ? parsed.data : [];
}

function toSummary(lab: Lab): LabSummary {
  return {
    id: lab.id,
    slug: lab.slug,
    title: lab.title,
    brief: lab.brief,
    estimatedMinutes: lab.estimatedMinutes,
    learningPathId: lab.learningPathId,
    isGlobal: lab.organizationId === null,
  };
}

function toDetail(lab: Lab): LabDetail {
  return {
    ...toSummary(lab),
    seededContext: parseSeededContext(lab.seededContext),
  };
}

@Injectable()
export class LabsService {
  private readonly logger = new Logger(LabsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gameService: GameService,
    private readonly incidentsService: IncidentsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Listing / fetching
  // ---------------------------------------------------------------------------

  async listVisibleLabs(organizationId: string): Promise<LabSummary[]> {
    const labs = await this.prisma.lab.findMany({
      where: {
        isPublished: true,
        OR: [{ organizationId }, { organizationId: null }],
      },
      orderBy: [{ organizationId: 'asc' }, { title: 'asc' }],
    });
    return labs.map(toSummary);
  }

  async getLab(slug: string, organizationId: string): Promise<LabDetail> {
    const lab = await this.prisma.lab.findFirst({
      where: {
        slug,
        isPublished: true,
        OR: [{ organizationId }, { organizationId: null }],
      },
    });
    if (!lab) throw new NotFoundException('Lab not found');
    return toDetail(lab);
  }

  private async loadLabForRuntime(slug: string, organizationId: string): Promise<Lab> {
    const lab = await this.prisma.lab.findFirst({
      where: {
        slug,
        isPublished: true,
        OR: [{ organizationId }, { organizationId: null }],
      },
    });
    if (!lab) throw new NotFoundException('Lab not found');
    return lab;
  }

  // ---------------------------------------------------------------------------
  // Chatbot turn — one assistant reply per call
  // ---------------------------------------------------------------------------

  async runChatbotTurn(args: {
    slug: string;
    user: SessionPayload;
    transcript: LabTranscript;
    userInput: string;
  }): Promise<LabRunResponse> {
    const { slug, user, transcript, userInput } = args;
    if (transcript.length >= MAX_TRANSCRIPT_TURNS) {
      throw new BadRequestException(
        `Transcript reached the per-attempt cap of ${MAX_TRANSCRIPT_TURNS} turns.`,
      );
    }

    const lab = await this.loadLabForRuntime(slug, user.organizationId);
    const seeded = parseSeededContext(lab.seededContext);

    // Prefix-cache invariant: the lab's `systemPrompt` is the FIRST message
    // and is byte-identical across every turn of the same lab. Per-turn data
    // (the learner's new input + the running transcript) attaches AFTER the
    // stable prefix. Never mutate the prefix.
    const messages = [
      { role: 'system' as const, content: lab.systemPrompt },
      {
        role: 'system' as const,
        content: `Seeded scenario context (immutable, treat as ground truth):\n${JSON.stringify(seeded)}`,
      },
      ...transcript.map((t) => ({ role: t.role, content: t.content })),
      { role: 'user' as const, content: userInput },
    ];

    const out = await chatComplete({
      model: LAB_MODEL,
      temperature: 0.4,
      userId: user.userId,
      messages,
    });

    await this.prisma.auditLog
      .create({
        data: {
          organizationId: user.organizationId,
          actorId: user.userId,
          action: 'lab.run',
          targetType: 'Lab',
          targetId: lab.id,
          metadata: {
            slug: lab.slug,
            model: out.model,
            tokensUsed: out.usage.totalTokens,
            stub: out.stub,
            transcriptTurns: transcript.length + 1,
          },
        },
      })
      .catch((err: unknown) => this.logger.error('lab.run audit failed', err));

    return {
      assistantReply: out.content,
      model: out.model,
      stub: out.stub,
    };
  }

  // ---------------------------------------------------------------------------
  // Submit attempt — grade, persist, award XP
  // ---------------------------------------------------------------------------

  async submitAttempt(args: {
    slug: string;
    user: SessionPayload;
    transcript: LabTranscript;
  }): Promise<LabAttemptResponse> {
    const { slug, user, transcript } = args;
    if (transcript.length === 0) {
      throw new BadRequestException('Transcript must contain at least one turn.');
    }

    const lab = await this.loadLabForRuntime(slug, user.organizationId);
    const rubric = parseRubric(lab.rubric);

    const graded = await gradeAttempt(rubric, transcript);

    const attempt = await this.prisma.labAttempt.create({
      data: {
        labId: lab.id,
        userId: user.userId,
        organizationId: user.organizationId,
        transcript: transcript as unknown as Prisma.InputJsonValue,
        graderRaw: graded.raw as unknown as Prisma.InputJsonValue,
        score: graded.score,
        criteria: graded.criteria as unknown as Prisma.InputJsonValue,
        passed: graded.passed,
        tokensUsed: graded.tokensUsed,
      },
    });

    await this.prisma.auditLog
      .create({
        data: {
          organizationId: user.organizationId,
          actorId: user.userId,
          action: 'lab.attempt',
          targetType: 'LabAttempt',
          targetId: attempt.id,
          metadata: {
            labId: lab.id,
            slug: lab.slug,
            score: graded.score,
            passed: graded.passed,
            tokensUsed: graded.tokensUsed,
          },
        },
      })
      .catch((err: unknown) => this.logger.error('lab.attempt audit failed', err));

    let xpAwarded = 0;
    if (graded.passed) {
      try {
        const result = await this.gameService.awardXp({
          userId: user.userId,
          organizationId: user.organizationId,
          kind: 'LAB_PASSED',
          sourceType: 'Lab',
          // Use the lab id (not the attempt id) so re-passing the same lab is
          // a no-op at the XP layer — we still persist the new LabAttempt row
          // so the learner can see the higher score, but XP doesn't compound.
          sourceId: lab.id,
          meta: { slug: lab.slug, attemptId: attempt.id, score: graded.score },
        });
        xpAwarded = result.awarded;

        await this.gameService.incrementQuestProgress(user.userId, 'lab', 1);

        await this.prisma.auditLog
          .create({
            data: {
              organizationId: user.organizationId,
              actorId: user.userId,
              action: 'lab.passed',
              targetType: 'LabAttempt',
              targetId: attempt.id,
              metadata: {
                labId: lab.id,
                slug: lab.slug,
                score: graded.score,
                xpAwarded,
              },
            },
          })
          .catch((err: unknown) => this.logger.error('lab.passed audit failed', err));
      } catch (err: unknown) {
        // XP/quest plumbing must never break the attempt result.
        this.logger.error('Lab XP award failed', err);
      }

      // Incident auto-resolution — any OPEN/ACKNOWLEDGED/SUGGESTED incident
      // assigned to this lab + actor is marked REMEDIATED. Fire-and-forget;
      // failures must never break the attempt response.
      void this.incidentsService
        .tryAutoResolveFromLabAttempt({
          organizationId: user.organizationId,
          userId: user.userId,
          labId: lab.id,
        })
        .catch((err: unknown) =>
          this.logger.error('IncidentsService.tryAutoResolveFromLabAttempt failed', err),
        );
    }

    return {
      attemptId: attempt.id,
      score: graded.score,
      passed: graded.passed,
      criteria: graded.criteria,
      xpAwarded,
    };
  }

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------

  async getMyAttempts(userId: string, labSlug?: string): Promise<LabAttemptSummary[]> {
    const rows = await this.prisma.labAttempt.findMany({
      where: {
        userId,
        ...(labSlug ? { lab: { slug: labSlug } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        labId: true,
        score: true,
        passed: true,
        createdAt: true,
        lab: { select: { slug: true, title: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      labId: r.labId,
      labSlug: r.lab.slug,
      labTitle: r.lab.title,
      score: r.score,
      passed: r.passed,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getMyLabAttemptHistory(
    userId: string,
    organizationId: string,
    slug: string,
  ): Promise<LabAttemptHistoryItem[]> {
    const lab = await this.prisma.lab.findFirst({
      where: {
        slug,
        isPublished: true,
        OR: [{ organizationId }, { organizationId: null }],
      },
      select: { id: true },
    });
    if (!lab) throw new NotFoundException('Lab not found');

    const rows = await this.prisma.labAttempt.findMany({
      where: { userId, labId: lab.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: {
        id: true,
        score: true,
        passed: true,
        criteria: true,
        tokensUsed: true,
        createdAt: true,
      },
    });

    return rows.map((r) => ({
      id: r.id,
      score: r.score,
      passed: r.passed,
      criteria: parseCriteria(r.criteria),
      tokensUsed: r.tokensUsed,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getStuckLearners(slug: string, organizationId: string): Promise<StuckLearner[]> {
    const lab = await this.prisma.lab.findFirst({
      where: {
        slug,
        isPublished: true,
        OR: [{ organizationId }, { organizationId: null }],
      },
      select: { id: true },
    });
    if (!lab) throw new NotFoundException('Lab not found');

    const attempts = await this.prisma.labAttempt.findMany({
      where: { labId: lab.id, organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        score: true,
        passed: true,
        criteria: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const byUser = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        attempts: Array<{
          score: number;
          passed: boolean;
          criteria: LabCriterionResult[];
          createdAt: Date;
        }>;
      }
    >();

    for (const a of attempts) {
      const entry = byUser.get(a.userId) ?? {
        userId: a.userId,
        name: a.user.name,
        email: a.user.email,
        attempts: [],
      };
      entry.attempts.push({
        score: a.score,
        passed: a.passed,
        criteria: parseCriteria(a.criteria),
        createdAt: a.createdAt,
      });
      byUser.set(a.userId, entry);
    }

    const stuck: StuckLearner[] = [];
    for (const entry of byUser.values()) {
      if (entry.attempts.length < 3) continue;
      if (entry.attempts.some((a) => a.passed)) continue;

      const latest = entry.attempts[0];
      if (!latest) continue;
      const failCounts = new Map<string, number>();
      for (const att of entry.attempts) {
        for (const c of att.criteria) {
          if (!c.pass) failCounts.set(c.id, (failCounts.get(c.id) ?? 0) + 1);
        }
      }
      const weakestCriteria = Array.from(failCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id);

      stuck.push({
        userId: entry.userId,
        name: entry.name,
        email: entry.email,
        attemptCount: entry.attempts.length,
        latestScore: latest.score,
        latestAt: latest.createdAt.toISOString(),
        weakestCriteria,
      });
    }

    stuck.sort((a, b) => b.attemptCount - a.attemptCount);
    return stuck;
  }

  // ---------------------------------------------------------------------------
  // Admin CRUD (organizationId always the actor's org — global labs are
  // seed-only and not editable through the runtime API)
  // ---------------------------------------------------------------------------

  async createLab(user: SessionPayload, body: unknown): Promise<LabSummary> {
    const spec = labSpecSchema.parse(body);
    const existing = await this.prisma.lab.findUnique({ where: { slug: spec.slug } });
    if (existing) throw new ConflictException(`Lab with slug "${spec.slug}" already exists`);

    const lab = await this.prisma.lab.create({
      data: this.specToCreateData(user.organizationId, spec),
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'lab.created',
        targetType: 'Lab',
        targetId: lab.id,
        metadata: { slug: lab.slug, title: lab.title },
      },
    });

    return toSummary(lab);
  }

  async updateLab(user: SessionPayload, slug: string, body: unknown): Promise<LabSummary> {
    const patch = labUpdateSpecSchema.parse(body);
    const existing = await this.prisma.lab.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('Lab not found');
    // Org-owned only — admins cannot mutate global labs through the API.
    if (existing.organizationId !== user.organizationId) {
      throw new ForbiddenException('Lab is not owned by your organization');
    }

    const updated = await this.prisma.lab.update({
      where: { id: existing.id },
      data: this.specToUpdateData(patch),
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'lab.updated',
        targetType: 'Lab',
        targetId: updated.id,
        metadata: { slug: updated.slug, fieldsChanged: Object.keys(patch) },
      },
    });

    return toSummary(updated);
  }

  private specToCreateData(organizationId: string, spec: LabSpec): Prisma.LabUncheckedCreateInput {
    return {
      organizationId,
      learningPathId: spec.learningPathId ?? null,
      slug: spec.slug,
      title: spec.title,
      brief: spec.brief,
      systemPrompt: spec.systemPrompt,
      seededContext: spec.seededContext as Prisma.InputJsonValue,
      rubric: spec.rubric as unknown as Prisma.InputJsonValue,
      estimatedMinutes: spec.estimatedMinutes,
      isPublished: spec.isPublished ?? true,
    };
  }

  private specToUpdateData(patch: LabUpdateSpec): Prisma.LabUncheckedUpdateInput {
    const data: Prisma.LabUncheckedUpdateInput = {};
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.brief !== undefined) data.brief = patch.brief;
    if (patch.systemPrompt !== undefined) data.systemPrompt = patch.systemPrompt;
    if (patch.seededContext !== undefined)
      data.seededContext = patch.seededContext as Prisma.InputJsonValue;
    if (patch.rubric !== undefined) data.rubric = patch.rubric as unknown as Prisma.InputJsonValue;
    if (patch.estimatedMinutes !== undefined) data.estimatedMinutes = patch.estimatedMinutes;
    if (patch.learningPathId !== undefined) data.learningPathId = patch.learningPathId;
    if (patch.isPublished !== undefined) data.isPublished = patch.isPublished;
    return data;
  }

  // Accessor used only by tests / health-checks — surfaces the runtime
  // model identifier so callers don't hardcode it.
  static get model(): string {
    return LAB_MODEL;
  }
}

// Re-exported for test fixtures.
export type { Lab, LabAttempt };
// Silence unused-import warning when stub mode is the only thing referencing
// it indirectly — `isStubMode` is exported from grader.ts but lives in the
// llm package. This keeps the runtime import graph stable.
void isStubMode;
