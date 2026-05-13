import { CanActivate, ExecutionContext } from '@nestjs/common';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import type { SessionPayload } from '@levelup/auth-client';
import { checkRateLimit } from '@levelup/queue';

/**
 * Per-user sliding-window rate limiter for the coach endpoints.
 *
 * - Window: 60 seconds, fixed bucket per `floor(now / window)`
 * - Limit: 30 requests per window per user
 * - Returns HTTP 429 with a `Retry-After` header (seconds until window resets)
 *   when the limit is exceeded.
 *
 * Production storage: Redis (via the BullMQ ioredis singleton). Multi-instance
 * safe — no per-process Map. On Redis failure we fail open (allow the request)
 * so a transient Redis hiccup never blocks legitimate users; the helper logs
 * the failure once per process so an alert is still surfaced.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private static readonly WINDOW_SECONDS = 60;
  private static readonly MAX_REQUESTS = 30;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: SessionPayload }>();
    const response = http.getResponse<Response>();

    const userId = request.user?.userId;
    if (!userId) {
      // AuthGuard runs first as a global APP_GUARD, so this is a defensive
      // fallback. If we cannot identify the caller we cannot rate-limit them
      // per-user, so refuse the request rather than silently letting it through.
      throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const result = await checkRateLimit({
      key: `coach:${userId}`,
      limit: RateLimitGuard.MAX_REQUESTS,
      windowSeconds: RateLimitGuard.WINDOW_SECONDS,
    });

    if (!result.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));
      response.setHeader('Retry-After', String(retryAfterSec));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded: ${RateLimitGuard.MAX_REQUESTS} requests per minute. Retry in ${retryAfterSec}s.`,
          retryAfter: retryAfterSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
