import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  classifySensitive,
  estimateTokens,
  recordUsage,
  runCoach,
  streamCoach,
} from '@levelup/llm';
import type {
  AiLevel as LlmAiLevel,
  CoachInput,
  CoachOutput,
  CoachPriorTurn,
  CoachStreamChunk,
  SensitiveResult,
} from '@levelup/llm';
import { AiLevel as PrismaAiLevel, TurnRole } from '@levelup/db';
import type { SessionPayload } from '@levelup/auth-client';
import type { PrismaService } from '../prisma';
import type { GameService } from '../game/game.service';
import type { RiskAlertsService } from '../risk-alerts/risk-alerts.service';
import { track } from '@levelup/analytics';

/**
 * The Prisma `AiLevel` enum (BEGINNER | PRACTITIONER | POWER_USER | CHAMPION)
 * does not line up 1:1 with the llm package's `AiLevel`
 * ('beginner' | 'intermediate' | 'advanced'). We collapse the four DB values
 * into the three coach buckets so the prompt template gets a value it knows
 * how to render. PRACTITIONER → intermediate, POWER_USER + CHAMPION → advanced.
 */
function toLlmAiLevel(level: PrismaAiLevel): LlmAiLevel {
  switch (level) {
    case PrismaAiLevel.BEGINNER:
      return 'beginner';
    case PrismaAiLevel.PRACTITIONER:
      return 'intermediate';
    case PrismaAiLevel.POWER_USER:
    case PrismaAiLevel.CHAMPION:
      return 'advanced';
    default: {
      // Exhaustiveness check — if a new DB enum value is added Prisma will
      // start typing this branch as the new value and TS will complain.
      const _exhaustive: never = level;
      return 'beginner' as LlmAiLevel;
    }
  }
}

/**
 * Classify the coach response into a stable category string for analytics.
 *
 * The taxonomy is intentionally small and is derived from which structured
 * fields the LLM produced:
 *
 *  - `prompt-improvement` — the model rewrote the user's prompt.
 *  - `next-action`        — the model didn't rewrite the prompt but did
 *                            recommend a next step.
 *  - `explanation`        — the model only explained / answered.
 *
 * This is also a useful filter dimension for the coach session list view.
 */
function classifyCategory(output: CoachOutput): string {
  if (output.improvedPrompt && output.improvedPrompt.trim().length > 0) {
    return 'prompt-improvement';
  }
  if (output.nextAction && output.nextAction.trim().length > 0) {
    return 'next-action';
  }
  return 'explanation';
}

/**
 * Number of prior turns to fetch from the conversation history before each
 * LLM call. The llm package will further cap this by token budget — see
 * `COACH_PRIOR_TURNS_MAX_COUNT` in @levelup/llm. We fetch exactly this many
 * (no extra) so the server-side query is bounded.
 */
const PRIOR_TURNS_FETCH_LIMIT = 10;

/**
 * Auto-generated conversation title length. The first user turn is truncated
 * to this many characters so the sidebar list stays readable.
 */
const CONVERSATION_TITLE_MAX_LEN = 60;

function makeTitleFromInput(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= CONVERSATION_TITLE_MAX_LEN) return trimmed;
  return `${trimmed.slice(0, CONVERSATION_TITLE_MAX_LEN - 1)}…`;
}

export interface CoachContext {
  input: CoachInput;
  sensitive: SensitiveResult;
  organizationId: string;
  userId: string;
  /** The conversation this turn belongs to. Always set — created if absent. */
  conversationId: string;
  /** True when this call is the FIRST turn of a freshly-created conversation. */
  isNewConversation: boolean;
}

interface PersistSessionArgs {
  ctx: CoachContext;
  output: CoachOutput;
  saveSession: boolean;
}

interface PersistedSession {
  sessionId: string | undefined;
  userTurnId: string;
  assistantTurnId: string;
  conversationId: string;
  category: string;
  tokensUsed: number;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  lastTurnPreview: string;
  turnCount: number;
  updatedAt: string;
}

export interface ConversationDetail {
  id: string;
  title: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  turns: Array<{
    id: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    sensitiveDataDetected: boolean;
    createdAt: string;
  }>;
}

@Injectable()
export class CoachService {
  private readonly logger = new Logger(CoachService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gameService: GameService,
    private readonly riskAlertsService: RiskAlertsService,
  ) {}

  /**
   * Resolve everything the coach needs (user profile + latest org policy +
   * sensitive-data classification + conversation context) in one go. Used by
   * both the streaming and non-streaming code paths so the heavy lifting is
   * shared.
   *
   * Conversation handling:
   *  - If `conversationId` is null/undefined, a fresh Conversation row is
   *    created (titled from the user's first input on persist).
   *  - If a `conversationId` is provided, the conversation is fetched,
   *    authorised (owner-only), and the most recent N turns are loaded into
   *    `priorTurns` for the LLM.
   */
  async buildContext(
    sessionUser: SessionPayload,
    userInput: string,
    conversationId?: string | null,
  ): Promise<CoachContext> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: sessionUser.userId,
        organizationId: sessionUser.organizationId,
      },
      select: {
        id: true,
        organizationId: true,
        jobTitle: true,
        aiLevel: true,
        department: { select: { name: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const policy = await this.prisma.companyPolicy.findFirst({
      where: { organizationId: sessionUser.organizationId },
      orderBy: { version: 'desc' },
      select: { policyText: true },
    });

    // ALWAYS run the sensitive-data classifier — even in stub mode (the
    // classifier itself decides whether to short-circuit). Doing this in the
    // service guarantees the audit log is written exactly once per request.
    const sensitive = await classifySensitive(userInput);

    if (sensitive.triggered) {
      await this.prisma.auditLog.create({
        data: {
          organizationId: sessionUser.organizationId,
          actorId: sessionUser.userId,
          action: 'coach.sensitive_data_detected',
          targetType: 'AiCoachSession',
          metadata: {
            categories: sensitive.categories,
            reason: sensitive.reason ?? null,
          },
        },
      });

      // Fire-and-forget risk alert check. Never blocks the coach response.
      void this.riskAlertsService
        .checkAndNotify(sessionUser.userId)
        .catch((err: unknown) => this.logger.error('RiskAlertsService.checkAndNotify failed', err));
    }

    // -----------------------------------------------------------------------
    // Resolve / create the conversation. We do this BEFORE invoking the LLM
    // so the conversationId is always available to echo in the response.
    // -----------------------------------------------------------------------
    let resolvedConversationId: string;
    let isNewConversation = false;
    let priorTurns: CoachPriorTurn[] = [];

    if (conversationId) {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          id: conversationId,
          organizationId: sessionUser.organizationId,
        },
        select: { id: true, userId: true, archivedAt: true },
      });
      if (!existing) throw new NotFoundException('Conversation not found');
      if (existing.userId !== sessionUser.userId) {
        // Owner-only — same convention as session access. cuids are not
        // enumerable so leaking 'exists but not yours' vs '404' is fine.
        throw new ForbiddenException('Not the owner of this conversation');
      }

      // Pull the most recent N turns (descending so we get the *latest*
      // history if there are more than the cap) then reverse to ascending so
      // the LLM sees them in chronological order.
      const rows = await this.prisma.conversationTurn.findMany({
        where: { conversationId: existing.id },
        orderBy: { createdAt: 'desc' },
        take: PRIOR_TURNS_FETCH_LIMIT,
        select: { role: true, content: true },
      });
      priorTurns = rows
        .slice()
        .reverse()
        .map((r) => ({
          role: r.role === TurnRole.USER ? 'user' : 'assistant',
          content: r.content,
        }));
      resolvedConversationId = existing.id;
    } else {
      // Create the conversation up front. Title stays null until the first
      // turn is persisted — see `persistSession` for the title-from-input
      // logic. We deliberately do NOT seed a title here because the input
      // hasn't been sanitised / committed yet.
      const created = await this.prisma.conversation.create({
        data: {
          organizationId: sessionUser.organizationId,
          userId: sessionUser.userId,
        },
        select: { id: true },
      });
      resolvedConversationId = created.id;
      isNewConversation = true;

      await this.prisma.auditLog.create({
        data: {
          organizationId: sessionUser.organizationId,
          actorId: sessionUser.userId,
          action: 'coach.create_conversation',
          targetType: 'Conversation',
          targetId: resolvedConversationId,
          metadata: {},
        },
      });
    }

    const aiLevel = toLlmAiLevel(user.aiLevel);
    const jobTitle = user.jobTitle ?? 'Employee';
    const department = user.department?.name ?? 'General';
    const companyPolicy = policy?.policyText ?? '';

    const input: CoachInput = {
      userInput,
      jobTitle,
      department,
      aiLevel,
      companyPolicy,
      userId: sessionUser.userId,
      ...(priorTurns.length > 0 ? { priorTurns } : {}),
    };

    return {
      input,
      sensitive,
      organizationId: sessionUser.organizationId,
      userId: sessionUser.userId,
      conversationId: resolvedConversationId,
      isNewConversation,
    };
  }

  /**
   * Non-streaming invocation. Mirrors the contract of the SSE endpoint so the
   * web client can degrade gracefully when SSE is unavailable.
   */
  async invoke(
    sessionUser: SessionPayload,
    userInput: string,
    saveSession: boolean,
    conversationId?: string | null,
  ): Promise<
    CoachOutput & {
      sessionId?: string;
      conversationId: string;
      turnId: string;
    }
  > {
    const ctx = await this.buildContext(sessionUser, userInput, conversationId);
    const output = await runCoach(ctx.input);
    this.recordUsageSafe(ctx, output);

    const persisted = await this.persistSession({ ctx, output, saveSession });
    await this.writeInvokeAudit(ctx, output, persisted, {
      saveSession,
      stream: false,
      aborted: false,
    });

    const response: CoachOutput & {
      sessionId?: string;
      conversationId: string;
      turnId: string;
    } = {
      ...output,
      conversationId: persisted.conversationId,
      turnId: persisted.assistantTurnId,
    };
    if (persisted.sessionId !== undefined) {
      response.sessionId = persisted.sessionId;
    }
    return response;
  }

  /**
   * Returns the underlying llm stream iterator. The controller forwards each
   * chunk as an SSE event, then must call `finalizeStream(...)` so the audit
   * log + session row are always written — even if the client disconnects.
   */
  buildStream(ctx: CoachContext): AsyncIterable<CoachStreamChunk> {
    return streamCoach(ctx.input);
  }

  /**
   * Persist the session and write the audit log after the stream drains
   * (either fully or because the client hung up).
   */
  async finalizeStream(
    ctx: CoachContext,
    finalOutput: CoachOutput,
    saveSession: boolean,
    aborted: boolean,
  ): Promise<PersistedSession> {
    this.recordUsageSafe(ctx, finalOutput);
    const persisted = await this.persistSession({
      ctx,
      output: finalOutput,
      saveSession,
    });
    await this.writeInvokeAudit(ctx, finalOutput, persisted, {
      saveSession,
      stream: true,
      aborted,
    });
    return persisted;
  }

  private recordUsageSafe(ctx: CoachContext, output: CoachOutput): void {
    // Best-effort usage accounting. Failures here must not bubble up — the
    // user already got their coach response and a degraded metric is better
    // than a 500. Fire-and-forget; the .catch() prevents unhandled-rejection
    // crashes if the recordUsage hook is wired to a flaky sink.
    void recordUsage({
      userId: ctx.userId,
      model: output.model,
      promptTokens: output.usage.promptTokens,
      completionTokens: output.usage.completionTokens,
    }).catch(() => {
      // swallow — accounting is non-critical
    });
  }

  private async writeInvokeAudit(
    ctx: CoachContext,
    output: CoachOutput,
    persisted: PersistedSession,
    flags: { saveSession: boolean; stream: boolean; aborted: boolean },
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorId: ctx.userId,
        action: 'coach.invoke',
        targetType: 'AiCoachSession',
        ...(persisted.sessionId ? { targetId: persisted.sessionId } : {}),
        metadata: {
          model: output.model,
          tokensUsed: persisted.tokensUsed,
          sensitiveDataDetected: ctx.sensitive.triggered,
          category: persisted.category,
          saved: flags.saveSession,
          stub: output.stub,
          stream: flags.stream,
          aborted: flags.aborted,
          conversationId: persisted.conversationId,
          userTurnId: persisted.userTurnId,
          assistantTurnId: persisted.assistantTurnId,
        },
      },
    });
  }

  /**
   * Persistence policy decision (locked in here for clarity):
   *  - The USER turn `content` is the raw `userInput` text.
   *  - The ASSISTANT turn `content` is just the `output.explanation` text —
   *    the structured fields (improvedPrompt, whyItWorks, nextAction) live in
   *    the legacy AiCoachSession.aiResponse JSON for now. This keeps turns
   *    grep-able and round-trippable as plain conversation history while the
   *    AiCoachSession dual-write preserves the rich structured payload for
   *    older callers / analytics.
   *  - We DUAL-WRITE: AiCoachSession is still inserted (with its new
   *    `conversationId` FK populated) so the legacy `/coach/sessions/*`
   *    routes and the gamification XP detection keep working unchanged.
   */
  private async persistSession(args: PersistSessionArgs): Promise<PersistedSession> {
    const { ctx, output, saveSession } = args;
    const category = classifyCategory(output);
    const tokensUsed =
      estimateTokens(ctx.input.userInput) +
      estimateTokens(output.explanation + (output.improvedPrompt ?? ''));

    // -----------------------------------------------------------------------
    // gamification hooks — unchanged in semantics, but the "previous coach
    // session sensitive?" lookup now scopes to the SAME conversation so the
    // 'fixed-prompt' detection only fires on revisions of an in-flight thread
    // rather than firing across unrelated past sessions. The old global
    // lookup occasionally produced false positives when a user opened a fresh
    // chat right after a sensitive one.
    // -----------------------------------------------------------------------
    try {
      // Every coach invocation counts toward the daily "talk to your coach"
      // quest, even when the session is not saved.
      await this.gameService.incrementQuestProgress(ctx.userId, 'coach', 1);

      if (saveSession && !ctx.sensitive.triggered) {
        const prevAssistantTurn = await this.prisma.conversationTurn.findFirst({
          where: {
            conversationId: ctx.conversationId,
            role: TurnRole.ASSISTANT,
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, sensitiveDataDetected: true },
        });
        if (prevAssistantTurn?.sensitiveDataDetected === true) {
          await this.gameService.awardXp({
            userId: ctx.userId,
            organizationId: ctx.organizationId,
            kind: 'COACH_PROMPT_FIXED',
            sourceType: 'ConversationTurn',
            sourceId: prevAssistantTurn.id,
          });
        }
      }
    } catch {
      // Swallow — gamification is non-critical and must never break the
      // coach response path.
    }
    // -----------------------------------------------------------------------

    // Persist the two ConversationTurn rows for THIS round. We always write
    // the turns (even when saveSession === false) so the conversation thread
    // is complete — `saveSession` only governs the legacy AiCoachSession row
    // dual-write to preserve back-compat with the old "save this exchange"
    // toggle.
    const userTurn = await this.prisma.conversationTurn.create({
      data: {
        conversationId: ctx.conversationId,
        role: TurnRole.USER,
        content: ctx.input.userInput,
        sensitiveDataDetected: ctx.sensitive.triggered,
        modelUsed: output.model,
        tokensUsed: estimateTokens(ctx.input.userInput),
      },
      select: { id: true },
    });

    const assistantTurn = await this.prisma.conversationTurn.create({
      data: {
        conversationId: ctx.conversationId,
        role: TurnRole.ASSISTANT,
        content: output.explanation,
        // Assistant outputs themselves don't carry a "sensitive data was in
        // the user's input" flag — that lives on the user turn. We persist
        // false here; the gamification lookup keys off the assistant turn's
        // flag, which is the trigger flag that came WITH the response (i.e.
        // the user's input that produced this assistant turn).
        sensitiveDataDetected: ctx.sensitive.triggered,
        modelUsed: output.model,
        tokensUsed: estimateTokens(output.explanation + (output.improvedPrompt ?? '')),
      },
      select: { id: true },
    });

    // Auto-title the conversation from the very first user input. We do this
    // INSIDE the persistSession path (rather than eagerly at create) so the
    // title only sticks if the round actually completes — a stream that
    // errors out before producing a final output won't leave us with a
    // titled-but-empty conversation.
    if (ctx.isNewConversation) {
      await this.prisma.conversation.update({
        where: { id: ctx.conversationId },
        data: { title: makeTitleFromInput(ctx.input.userInput) },
      });
    } else {
      // Bump updatedAt explicitly so list views resort to the top. Prisma's
      // @updatedAt only fires on field changes; nothing else changes here.
      await this.prisma.conversation.update({
        where: { id: ctx.conversationId },
        data: { updatedAt: new Date() },
      });
    }

    // Fire-and-forget analytics capture — must never throw into the caller.
    track.coachInvoked({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      sensitiveDataDetected: ctx.sensitive.triggered,
      tokensUsed,
      modelUsed: output.model,
    });

    if (!saveSession) {
      return {
        sessionId: undefined,
        userTurnId: userTurn.id,
        assistantTurnId: assistantTurn.id,
        conversationId: ctx.conversationId,
        category,
        tokensUsed,
      };
    }

    const row = await this.prisma.aiCoachSession.create({
      data: {
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        conversationId: ctx.conversationId,
        inputText: ctx.input.userInput,
        aiResponse: JSON.stringify(output),
        category,
        sensitiveDataDetected: ctx.sensitive.triggered,
        tokensUsed,
        modelUsed: output.model,
      },
      select: { id: true },
    });

    return {
      sessionId: row.id,
      userTurnId: userTurn.id,
      assistantTurnId: assistantTurn.id,
      conversationId: ctx.conversationId,
      category,
      tokensUsed,
    };
  }

  // ===========================================================================
  // Conversation management — the new first-class API.
  // ===========================================================================

  async listConversations(
    sessionUser: SessionPayload,
    opts: { limit?: number; cursor?: string },
  ): Promise<{ items: ConversationSummary[]; nextCursor: string | null }> {
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));

    const rows = await this.prisma.conversation.findMany({
      where: {
        userId: sessionUser.userId,
        organizationId: sessionUser.organizationId,
        archivedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        updatedAt: true,
        _count: { select: { turns: true } },
        turns: {
          where: { role: TurnRole.USER },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true },
        },
      },
    });

    const sliced = rows.slice(0, limit);
    const items: ConversationSummary[] = sliced.map((r) => {
      const lastUser = r.turns[0]?.content ?? '';
      return {
        id: r.id,
        title: r.title,
        lastTurnPreview: makePreview(lastUser),
        turnCount: r._count.turns,
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    let nextCursor: string | null = null;
    if (rows.length > limit) {
      const last = items[items.length - 1];
      nextCursor = last ? last.id : null;
    }
    return { items, nextCursor };
  }

  async getConversation(sessionUser: SessionPayload, id: string): Promise<ConversationDetail> {
    const row = await this.prisma.conversation.findFirst({
      where: { id, organizationId: sessionUser.organizationId },
      select: {
        id: true,
        userId: true,
        title: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        turns: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            sensitiveDataDetected: true,
            createdAt: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Conversation not found');
    if (row.userId !== sessionUser.userId) {
      throw new ForbiddenException('Not the owner of this conversation');
    }
    return {
      id: row.id,
      title: row.title,
      archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      turns: row.turns.map((t) => ({
        id: t.id,
        role: t.role === TurnRole.USER ? 'USER' : 'ASSISTANT',
        content: t.content,
        sensitiveDataDetected: t.sensitiveDataDetected,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  async archiveConversation(
    sessionUser: SessionPayload,
    id: string,
  ): Promise<{ archived: true; id: string }> {
    const existing = await this.prisma.conversation.findFirst({
      where: { id, organizationId: sessionUser.organizationId },
      select: { id: true, userId: true, archivedAt: true },
    });
    if (!existing) throw new NotFoundException('Conversation not found');
    if (existing.userId !== sessionUser.userId) {
      throw new ForbiddenException('Not the owner of this conversation');
    }

    await this.prisma.conversation.update({
      where: { id },
      data: { archivedAt: existing.archivedAt ?? new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        organizationId: sessionUser.organizationId,
        actorId: sessionUser.userId,
        action: 'coach.archive_conversation',
        targetType: 'Conversation',
        targetId: id,
        metadata: {},
      },
    });
    return { archived: true, id };
  }

  async deleteConversation(
    sessionUser: SessionPayload,
    id: string,
  ): Promise<{ deleted: true; id: string }> {
    const existing = await this.prisma.conversation.findFirst({
      where: { id, organizationId: sessionUser.organizationId },
      select: { id: true, userId: true },
    });
    if (!existing) throw new NotFoundException('Conversation not found');
    if (existing.userId !== sessionUser.userId) {
      throw new ForbiddenException('Not the owner of this conversation');
    }

    // ConversationTurn cascades on Conversation delete (Cascade), and the
    // legacy AiCoachSession FK is SetNull so those rows stay around but lose
    // their conversationId. We DON'T delete the AiCoachSession rows here —
    // they double as the analytics archive and have their own DELETE route.
    await this.prisma.conversation.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        organizationId: sessionUser.organizationId,
        actorId: sessionUser.userId,
        action: 'coach.delete_conversation',
        targetType: 'Conversation',
        targetId: id,
        metadata: {},
      },
    });
    return { deleted: true, id };
  }

  // ===========================================================================
  // Voice audit helper — called from the controller for transcribe + synthesize
  // ===========================================================================

  /**
   * Fire-and-forget audit log write for voice endpoints. Failures are swallowed
   * so a flaky DB write never breaks the audio response already in flight.
   */
  auditVoice(
    sessionUser: SessionPayload,
    action: 'coach.transcribe' | 'coach.synthesize',
    metadata: Record<string, number | string>,
  ): void {
    void this.prisma.auditLog
      .create({
        data: {
          organizationId: sessionUser.organizationId,
          actorId: sessionUser.userId,
          action,
          targetType: 'AiCoachSession',
          metadata,
        },
      })
      .catch((err: unknown) => {
        this.logger.error(`auditVoice(${action}) failed`, err);
      });
  }

  // ===========================================================================
  // Legacy session API — kept for back-compat. Internally these now delegate
  // to the conversation methods so the data only lives in one place.
  // ===========================================================================

  /** @deprecated use `listConversations`. */
  async listSessions(
    sessionUser: SessionPayload,
    opts: { limit?: number; cursor?: string },
  ): Promise<{ items: ConversationSummary[]; nextCursor: string | null }> {
    return this.listConversations(sessionUser, opts);
  }

  /** @deprecated use `getConversation`. */
  async getSession(sessionUser: SessionPayload, id: string): Promise<ConversationDetail> {
    return this.getConversation(sessionUser, id);
  }

  /** @deprecated use `deleteConversation`. */
  async deleteSession(
    sessionUser: SessionPayload,
    id: string,
  ): Promise<{ deleted: true; id: string }> {
    return this.deleteConversation(sessionUser, id);
  }
}

function makePreview(text: string, n = 60): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length === 0) return '';
  if (trimmed.length <= n) return trimmed;
  return `${trimmed.slice(0, n - 1)}…`;
}
