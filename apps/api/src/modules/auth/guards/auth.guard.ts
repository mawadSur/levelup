import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { LEVELUP_SESSION, type SessionPayload } from '@levelup/auth-client';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private static cookieDeprecationWarned = false;

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: SessionPayload }>();

    const token = this.extractToken(request);
    if (token === null) {
      throw new UnauthorizedException('No access token');
    }

    request.user = await this.authService.sessionFromAccessToken(token);
    return true;
  }

  /**
   * Pull the access token from either:
   *   1. `Authorization: Bearer <jwt>` — preferred (Supabase SSR clients send
   *      this when calling cross-origin APIs).
   *   2. The Supabase auth cookie (`sb-<ref>-auth-token`) — set by
   *      `@supabase/ssr` on same-site requests. The cookie value is a JSON
   *      array `[access_token, refresh_token, ...]`; long values are split
   *      across `name.0` / `name.1` chunks. We reassemble before parsing.
   *
   * The legacy `LEVELUP_SESSION` JWE cookie is no longer accepted — the
   * cutover is hard and pre-launch. We log once per process when a request
   * still carries one so the migration progress is visible.
   */
  private extractToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      const token = auth.slice('Bearer '.length).trim();
      if (token !== '') return token;
    }

    if (req.cookies !== undefined && req.cookies !== null) {
      const cookies = req.cookies as Record<string, unknown>;
      const reassembled = this.reassembleSupabaseCookie(cookies);
      if (reassembled !== null) {
        const accessToken = this.parseSupabaseCookie(reassembled);
        if (accessToken !== null) return accessToken;
      }

      if (typeof cookies[LEVELUP_SESSION] === 'string') {
        if (!AuthGuard.cookieDeprecationWarned) {
          AuthGuard.cookieDeprecationWarned = true;
          this.logger.warn(
            `Deprecated ${LEVELUP_SESSION} cookie received — clients must migrate to Supabase Auth.`,
          );
        }
      }
    }

    return null;
  }

  private reassembleSupabaseCookie(cookies: Record<string, unknown>): string | null {
    const directKey = Object.keys(cookies).find(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token'),
    );
    if (directKey !== undefined && typeof cookies[directKey] === 'string') {
      return cookies[directKey] as string;
    }

    const chunkKeys = Object.keys(cookies)
      .filter((k) => /^sb-.+-auth-token\.\d+$/.test(k))
      .sort((a, b) => {
        const ai = parseInt(a.split('.').pop() ?? '0', 10);
        const bi = parseInt(b.split('.').pop() ?? '0', 10);
        return ai - bi;
      });
    if (chunkKeys.length === 0) return null;
    return chunkKeys
      .map((k) => (typeof cookies[k] === 'string' ? (cookies[k] as string) : ''))
      .join('');
  }

  private parseSupabaseCookie(raw: string): string | null {
    let value = raw;
    if (value.startsWith('base64-')) {
      try {
        value = Buffer.from(value.slice('base64-'.length), 'base64').toString('utf8');
      } catch {
        return null;
      }
    }
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
        return parsed[0];
      }
      if (typeof parsed === 'object' && parsed !== null && 'access_token' in parsed) {
        const at = (parsed as Record<string, unknown>)['access_token'];
        if (typeof at === 'string') return at;
      }
    } catch {
      if (value.split('.').length === 3) return value;
    }
    return null;
  }
}
