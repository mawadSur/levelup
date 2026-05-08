import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { checkRateLimit } from '@levelup/queue';

/**
 * Per-IP rate limiter for unauthenticated auth endpoints (sign-in, sign-up,
 * accept-invitation, dev-bypass). Uses the same Redis sliding-window backend
 * as the coach guard so deployments share one rate-limit substrate.
 *
 * The decorator below configures the bucket name and limit per route. We
 * deliberately key by IP instead of user id — by definition the caller is
 * not yet authenticated.
 */

interface AuthRateLimitOptions {
  bucket: string;
  limit: number;
  windowSeconds?: number;
}

const META_KEY = 'auth-rate-limit';

export const AuthRateLimit = (
  bucket: string,
  limit: number,
  windowSeconds = 60,
): ReturnType<typeof SetMetadata> =>
  SetMetadata<string, AuthRateLimitOptions>(META_KEY, {
    bucket,
    limit,
    windowSeconds,
  });

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.getAllAndOverride<AuthRateLimitOptions | undefined>(META_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!opts) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const ip = this.resolveIp(request);
    const result = await checkRateLimit({
      key: `auth:${opts.bucket}:${ip}`,
      limit: opts.limit,
      windowSeconds: opts.windowSeconds ?? 60,
    });

    if (!result.allowed) {
      const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));
      response.setHeader('Retry-After', String(retryAfter));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many ${opts.bucket} attempts. Retry in ${retryAfter}s.`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private resolveIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      const first = forwarded.split(',')[0]?.trim();
      if (first !== undefined && first !== '') return first;
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0] ?? 'unknown';
    }
    return req.ip ?? 'unknown';
  }
}
