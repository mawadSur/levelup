import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionPayload } from '@levelup/auth-client';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: SessionPayload }>();
    return request.user;
  },
);
