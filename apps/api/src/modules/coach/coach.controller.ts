import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { SessionPayload } from '@levelup/auth-client';
import { CoachOutput, CoachStreamChunk } from '@levelup/llm';
import { transcribeAudio, synthesizeSpeech } from '@levelup/llm';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CoachService } from './coach.service';
import { RateLimitGuard } from './rate-limit.guard';
import { coachInvokeBodySchema, type CoachInvokeBody } from './dto/coach-request.dto';

/** Shape of an Express/Multer uploaded file with memory storage. */
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@ApiTags('coach')
@Controller('coach')
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  /**
   * Non-streaming coach invocation. The global AuthGuard runs first
   * (registered as APP_GUARD by AuthModule), then RateLimitGuard enforces the
   * 30-req/min/user budget. Returning the parsed CoachOutput keeps parity
   * with the SSE final chunk so client code can share decoders.
   *
   * Body shape: `{ userInput, conversationId?, saveSession? }`. When
   * `conversationId` is omitted a new Conversation is created on the fly and
   * its id (plus the freshly-created assistant turn id) is returned to the
   * caller for client-side state pinning.
   */
  @Post()
  @UseGuards(RateLimitGuard)
  async invoke(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(coachInvokeBodySchema)) body: CoachInvokeBody,
  ): Promise<
    CoachOutput & {
      sessionId?: string;
      conversationId: string;
      turnId: string;
    }
  > {
    return this.coachService.invoke(
      user,
      body.userInput,
      body.saveSession,
      body.conversationId ?? null,
    );
  }

  /**
   * SSE streaming endpoint.
   *
   * We deliberately drive the response manually (rather than using Nest's
   * `@Sse()` decorator) because:
   *   1. `@Sse()` constrains event names to a fixed shape — we need named
   *      events (`delta`, `final`, `done`) so the client can switch on them.
   *   2. We need to set `X-Accel-Buffering: no` for nginx and flush every
   *      chunk so deltas appear in real time behind a reverse proxy.
   *   3. We have to react to `req.on('close')` to abort the upstream LLM
   *      stream when the user navigates away — `@Sse()` does not expose the
   *      raw response cleanly enough for that.
   *
   * Final-event payload includes `conversationId` and `turnId` so the client
   * can pin its `?c=<id>` URL and remember the assistant turn id.
   */
  @Post('stream')
  @UseGuards(RateLimitGuard)
  async stream(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(coachInvokeBodySchema)) body: CoachInvokeBody,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Disable proxy buffering — without this, nginx will hold deltas until
    // a buffer fills and the client sees the response in big chunks.
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const ctx = await this.coachService.buildContext(
      user,
      body.userInput,
      body.conversationId ?? null,
    );

    // Emit the conversation id up front — the client uses it to pin the URL
    // even before any LLM tokens arrive. Doing this first means a brand-new
    // conversation can have its `?c=<id>` query param updated immediately on
    // the very first user send.
    sendEvent(res, 'conversation', {
      conversationId: ctx.conversationId,
      isNew: ctx.isNewConversation,
    });

    // Mirror the sensitive-data classification result to the client up front
    // so the UI can render the warning banner before any LLM tokens arrive.
    if (ctx.sensitive.triggered) {
      sendEvent(res, 'sensitive', {
        triggered: true,
        categories: ctx.sensitive.categories,
        reason: ctx.sensitive.reason ?? null,
      });
    }

    let aborted = false;
    let finalOutput: CoachOutput | undefined;

    // Abort flag that the iterator loop checks between chunks. We can't
    // synchronously cancel an `AsyncIterable<CoachStreamChunk>` returned by
    // the llm package, but breaking the for-await loop drains the upstream
    // iterator's `return()` if implemented and at minimum stops us forwarding
    // bytes to a dead socket.
    const onClose = (): void => {
      aborted = true;
    };
    req.on('close', onClose);

    try {
      const stream = this.coachService.buildStream(ctx);
      for await (const chunk of stream) {
        if (aborted) break;
        forwardChunk(res, chunk);
        if (chunk.type === 'final') {
          finalOutput = chunk.output;
        }
      }
    } catch (err: unknown) {
      // Surface a structured error event to the client and stop. We do not
      // re-throw — the response is already streaming so a thrown exception
      // here would just produce a confusing partial body with no terminator.
      sendEvent(res, 'error', {
        message: err instanceof Error ? err.message : 'Coach stream failed',
      });
    } finally {
      req.off('close', onClose);
    }

    // Persist the session if we got a final output, even on abort — the user
    // got *some* of a response and the audit trail should record it.
    if (finalOutput) {
      try {
        const persisted = await this.coachService.finalizeStream(
          ctx,
          finalOutput,
          body.saveSession,
          aborted,
        );
        if (!aborted) {
          // Always emit the conversation/turn ids on the final commit so the
          // client knows the persisted handles, even when the legacy
          // sessionId is absent (saveSession === false).
          sendEvent(res, 'session', {
            sessionId: persisted.sessionId ?? null,
            conversationId: persisted.conversationId,
            turnId: persisted.assistantTurnId,
          });
        }
      } catch (err: unknown) {
        // If persistence fails after streaming we cannot recover the response
        // but we should let the client know its session wasn't saved.
        if (!aborted) {
          sendEvent(res, 'error', {
            message: err instanceof Error ? `Persist failed: ${err.message}` : 'Persist failed',
          });
        }
      }
    }

    if (!aborted) {
      sendEvent(res, 'done', {});
    }
    res.end();
  }

  // ===========================================================================
  // Voice — transcribe + synthesize
  // ===========================================================================

  /**
   * POST /coach/transcribe
   *
   * Accepts a multipart/form-data body with a single `audio` file field.
   * Returns `{ text, durationMs }`. Capped at 30 MB (slightly above Whisper's
   * 25 MB hard limit so we can return a friendly error rather than a raw 413).
   */
  @Post('transcribe')
  @UseGuards(RateLimitGuard)
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: 30 * 1024 * 1024 },
      storage: undefined, // uses MemoryStorage by default
    }),
  )
  async transcribe(
    @CurrentUser() user: SessionPayload,
    @UploadedFile() file: MulterFile | undefined,
  ): Promise<{ text: string; durationMs: number }> {
    if (!file?.buffer || file.buffer.byteLength === 0) {
      throw new BadRequestException('No audio file uploaded in field "audio".');
    }

    const result = await transcribeAudio({
      audio: file.buffer,
      filename: file.originalname || 'recording.webm',
      language: 'en',
    });

    // Audit log — fire-and-forget via the service's prisma instance.
    void this.coachService.auditVoice(user, 'coach.transcribe', {
      durationMs: result.durationMs,
      charCount: result.text.length,
    });

    return { text: result.text, durationMs: result.durationMs };
  }

  /**
   * POST /coach/synthesize
   *
   * Body: `{ text: string; voice?: string }`.
   * Returns raw audio bytes with the appropriate Content-Type.
   */
  @Post('synthesize')
  @UseGuards(RateLimitGuard)
  async synthesize(
    @CurrentUser() user: SessionPayload,
    @Body() body: { text?: unknown; voice?: unknown },
    @Res() res: Response,
  ): Promise<void> {
    const text = typeof body.text === 'string' && body.text.trim().length > 0 ? body.text : null;
    if (!text) {
      throw new BadRequestException(
        'Body field "text" is required and must be a non-empty string.',
      );
    }

    const voice =
      typeof body.voice === 'string' &&
      ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(body.voice)
        ? (body.voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer')
        : undefined;

    const result = await synthesizeSpeech({ text, voice });

    void this.coachService.auditVoice(user, 'coach.synthesize', {
      charCount: text.length,
      voice: voice ?? 'alloy',
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', String(result.audio.byteLength));
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.end(result.audio);
  }

  // ===========================================================================
  // Conversations — first-class API
  // ===========================================================================

  @Get('conversations')
  listConversations(
    @CurrentUser() user: SessionPayload,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.coachService.listConversations(user, {
      ...(limit ? { limit: parseInt(limit, 10) } : {}),
      ...(cursor ? { cursor } : {}),
    });
  }

  @Get('conversations/:id')
  getConversation(@CurrentUser() user: SessionPayload, @Param('id') id: string) {
    return this.coachService.getConversation(user, id);
  }

  @Post('conversations/:id/archive')
  archiveConversation(@CurrentUser() user: SessionPayload, @Param('id') id: string) {
    return this.coachService.archiveConversation(user, id);
  }

  @Delete('conversations/:id')
  deleteConversation(@CurrentUser() user: SessionPayload, @Param('id') id: string) {
    return this.coachService.deleteConversation(user, id);
  }

  // ===========================================================================
  // Legacy session aliases — kept for back-compat with existing web callers
  // and external API consumers. All three forward to the conversation API.
  // ===========================================================================

  /** @deprecated use `/coach/conversations`. */
  @Get('sessions')
  listSessions(
    @CurrentUser() user: SessionPayload,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.coachService.listSessions(user, {
      ...(limit ? { limit: parseInt(limit, 10) } : {}),
      ...(cursor ? { cursor } : {}),
    });
  }

  /** @deprecated use `/coach/conversations/:id`. */
  @Get('sessions/:id')
  getSession(@CurrentUser() user: SessionPayload, @Param('id') id: string) {
    return this.coachService.getSession(user, id);
  }

  /** @deprecated use `/coach/conversations/:id`. */
  @Delete('sessions/:id')
  deleteSession(@CurrentUser() user: SessionPayload, @Param('id') id: string) {
    return this.coachService.deleteSession(user, id);
  }
}

/**
 * Write a single named SSE event. Format:
 *   event: <name>\n
 *   data: <json>\n\n
 * The blank line is what tells the EventSource reader the event is complete.
 */
function sendEvent(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  // Force the chunk out past any compression / buffering middleware. `flush`
  // is provided by the `compression` middleware; guard so we don't crash if
  // it isn't installed.
  const maybeFlush = (res as Response & { flush?: () => void }).flush;
  if (typeof maybeFlush === 'function') maybeFlush.call(res);
}

/**
 * Translate a `CoachStreamChunk` from the llm package into our SSE wire
 * format. Per the API spec the delta event payload uses `text` (not
 * `content`) so we rename the field at the boundary.
 */
function forwardChunk(res: Response, chunk: CoachStreamChunk): void {
  switch (chunk.type) {
    case 'delta':
      sendEvent(res, 'delta', { field: chunk.field, text: chunk.content });
      return;
    case 'sensitive':
      // The controller already emitted the sensitive event up-front from the
      // service-side classification, but we forward any duplicate the llm
      // stream emits so the client never misses a warning.
      sendEvent(res, 'sensitive', chunk.warning);
      return;
    case 'final':
      sendEvent(res, 'final', { output: chunk.output });
      return;
    default: {
      // Exhaustiveness check — if @levelup/llm adds a new chunk variant TS
      // will fail this assignment and we'll know to handle it here.
      const _exhaustive: never = chunk;
      return _exhaustive;
    }
  }
}
