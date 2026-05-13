import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { SessionPayload } from '@levelup/auth-client';
import { checkRateLimit } from '@levelup/queue';

/**
 * Per-user sliding-window rate limiter for lab attempts.
 *
 * Window: 60 seconds. Limit: 10 attempts per minute per user.
 * Bucket key: `labs:<userId>`.
 *
 * Same fail-open-on-Redis-down behaviour as the coach guard — see
 * `@levelup/queue/checkRateLimit`.
 */
@Injectable()
export class LabsRateLimitGuard implements CanActivate {
  private static readonly WINDOW_SECONDS = 60;
  private static readonly MAX_REQUESTS = 10;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: SessionPayload }>();
    const response = http.getResponse<Response>();

    const userId = request.user?.userId;
    if (!userId) {
      throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const result = await checkRateLimit({
      key: `labs:${userId}`,
      limit: LabsRateLimitGuard.MAX_REQUESTS,
      windowSeconds: LabsRateLimitGuard.WINDOW_SECONDS,
    });

    if (!result.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));
      response.setHeader('Retry-After', String(retryAfterSec));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded: ${LabsRateLimitGuard.MAX_REQUESTS} requests per minute. Retry in ${retryAfterSec}s.`,
          retryAfter: retryAfterSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
