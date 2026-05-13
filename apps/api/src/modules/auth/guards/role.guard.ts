import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { hasRole } from '@levelup/auth-client';
import { SessionPayload } from '@levelup/auth-client';
import { Role } from '@levelup/db';
import { RolePriority } from '@levelup/auth-client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator — any authenticated user is allowed through.
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: SessionPayload }>();
    const user = request.user;

    if (!user) {
      // AuthGuard should have already rejected unauthenticated requests, but
      // guard against unexpected ordering.
      throw new ForbiddenException('Not authenticated');
    }

    // The array is treated as "minimum required level": pick the highest-priority
    // role from the list. A user satisfies the requirement if their role is at
    // or above that minimum (e.g. ADMIN satisfies a MANAGER requirement).
    // We've already guarded required.length === 0 above, but `noUncheckedIndexedAccess`
    // still types required[0] as Role | undefined — the non-null assertion is safe here.

    const minimumRequired = required.reduce<Role>(
      (highest, r) =>
        RolePriority[r as keyof typeof RolePriority] >
        RolePriority[highest as keyof typeof RolePriority]
          ? r
          : highest,
      required[0]!,
    );

    if (!hasRole(user.role, minimumRequired)) {
      throw new ForbiddenException(
        `Requires role ${minimumRequired} or higher; user has ${user.role}`,
      );
    }

    return true;
  }
}
