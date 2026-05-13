import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import {
  verifyAccessToken,
  signStubAccessToken,
  claimsToProfile,
  devBypass,
  isStubMode,
  type SupabaseProfile,
  type SessionPayload,
} from '@levelup/auth-client';
import { InvitationStatus, Role } from '@levelup/db';
import type { User, Organization, Prisma } from '@levelup/db';
import type { AcceptInvitationInput } from './dto/sign-in.dto';

export interface UpsertResult {
  user: User;
  organization: Organization;
}

export interface DevBypassResult {
  accessToken: string;
  redirectTo: string;
  user: User;
  organization: Organization;
}

export interface AcceptInvitationResult {
  redirect: string;
  /** Email of the user; the client uses this to drive the Supabase sign-in. */
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // JWT → SessionPayload
  // ---------------------------------------------------------------------------

  /**
   * Validate an Authorization: Bearer <jwt> token. Returns a SessionPayload the
   * rest of the API consumes, or throws Unauthorized.
   *
   * Sync strategy: looks up the local user by `supabaseUserId`. On miss, falls
   * back to email lookup and populates `supabaseUserId` on the existing row
   * (handles the case where an admin pre-provisioned the user before they ever
   * signed in). On a fresh user with no matching row, bootstraps a personal
   * org — same shape as the previous WorkOS-on-first-login flow.
   */
  async sessionFromAccessToken(token: string): Promise<SessionPayload> {
    const claims = await verifyAccessToken(token);
    if (claims === null) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const profile = claimsToProfile(claims);
    if (profile.email === '') {
      throw new UnauthorizedException('Token missing email claim');
    }

    const { user, organization } = await this.upsertUserFromProfile(profile);

    return {
      userId: user.id,
      organizationId: organization.id,
      role: user.role,
      email: user.email,
      iat: claims.iat,
      exp: claims.exp,
    };
  }

  // ---------------------------------------------------------------------------
  // Dev bypass (stub mode only)
  // ---------------------------------------------------------------------------

  async handleDevBypass(email: string): Promise<DevBypassResult> {
    if (!isStubMode()) {
      throw new NotFoundException('Dev bypass is not available in this environment');
    }
    const profile = devBypass(email);
    const { user, organization } = await this.upsertUserFromProfile(profile);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await signStubAccessToken(profile, {
      ttlSeconds: 60 * 60 * 8,
    });

    await this.writeAuditLog({
      organizationId: organization.id,
      actorId: user.id,
      action: 'auth.dev_bypass',
      metadata: { email: user.email, role: user.role },
    });

    const redirectTo = user.role === Role.EMPLOYEE ? '/learn' : '/admin';
    return { accessToken, redirectTo, user, organization };
  }

  // ---------------------------------------------------------------------------
  // Profile → User row sync
  // ---------------------------------------------------------------------------

  /**
   * Upsert order:
   *   1. By `supabaseUserId` — canonical for returning users.
   *   2. By email — first hit attaches `supabaseUserId`, handles invitation
   *      pre-provisioning where the User row exists before Supabase sign-up.
   *   3. Otherwise bootstrap a fresh personal org.
   */
  private async upsertUserFromProfile(profile: SupabaseProfile): Promise<UpsertResult> {
    const emailLower = profile.email.toLowerCase();

    const bySupabaseId = await this.prisma.user.findUnique({
      where: { supabaseUserId: profile.supabaseUserId },
      include: { organization: true },
    });
    if (bySupabaseId) {
      if (bySupabaseId.email !== emailLower) {
        const updated = await this.prisma.user.update({
          where: { id: bySupabaseId.id },
          data: { email: emailLower },
          include: { organization: true },
        });
        return { user: updated, organization: updated.organization };
      }
      return { user: bySupabaseId, organization: bySupabaseId.organization };
    }

    // Email is unique within an org but not globally — pick the oldest match.
    // Supabase identity is one user-per-email globally, so post-cutover there
    // should be at most one; the fallback is defensive.
    const byEmail = await this.prisma.user.findFirst({
      where: { email: emailLower },
      orderBy: { createdAt: 'asc' },
      include: { organization: true },
    });
    if (byEmail) {
      const updated = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          supabaseUserId: profile.supabaseUserId,
          name: this.resolveName(byEmail.name, profile, emailLower),
        },
        include: { organization: true },
      });
      return { user: updated, organization: updated.organization };
    }

    return this.createUserWithPersonalOrg(profile, emailLower);
  }

  private resolveName(
    existing: string | null,
    profile: SupabaseProfile,
    emailLower: string,
  ): string {
    const profileName =
      [profile.firstName, profile.lastName].filter(Boolean).join(' ') || emailLower;
    if (existing && existing !== '' && existing !== emailLower) return existing;
    return profileName;
  }

  private async createUserWithPersonalOrg(
    profile: SupabaseProfile,
    emailLower: string,
  ): Promise<UpsertResult> {
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || emailLower;

    // White-label single-tenant mode: under CLIENT=kapitus every employee is
    // an EMPLOYEE in one shared "kapitus" org (seeded with the academy content)
    // instead of bootstrapping a personal org. The seeded org is found by its
    // stable slug so we don't hardcode an internal id.
    const sharedSlug = (process.env.CLIENT ?? '').toLowerCase() === 'kapitus' ? 'kapitus' : null;
    if (sharedSlug) {
      const sharedOrg = await this.prisma.organization.findUnique({
        where: { slug: sharedSlug },
      });
      if (sharedOrg) {
        const user = await this.prisma.user.create({
          data: {
            organizationId: sharedOrg.id,
            supabaseUserId: profile.supabaseUserId,
            email: emailLower,
            name,
            role: Role.EMPLOYEE,
          },
        });
        return { user, organization: sharedOrg };
      }
      // Fall through to personal-org bootstrap if the seed hasn't run yet —
      // better to onboard the user into a recoverable state than to 500.
    }

    const organization = await this.prisma.organization.create({
      data: { name: `${name}'s Organization` },
    });

    const user = await this.prisma.user.create({
      data: {
        organizationId: organization.id,
        supabaseUserId: profile.supabaseUserId,
        email: emailLower,
        name,
        role: Role.ADMIN,
      },
    });

    return { user, organization };
  }

  // ---------------------------------------------------------------------------
  // /auth/me
  // ---------------------------------------------------------------------------

  async getMe(sessionUser: SessionPayload): Promise<{
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
    organizationId: string;
    departmentId: string | null;
    aiLevel: string;
    organizationName: string;
    leaderboardOptOut: boolean;
  }> {
    const [org, dbUser] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({
        where: { id: sessionUser.organizationId },
        select: { name: true },
      }),
      this.prisma.user.findUnique({
        where: { id: sessionUser.userId },
        select: {
          aiLevel: true,
          name: true,
          departmentId: true,
          leaderboardOptOut: true,
        },
      }),
    ]);
    const aiLevel = dbUser?.aiLevel ?? 'BEGINNER';
    const name = dbUser?.name ?? sessionUser.email;
    const departmentId = dbUser?.departmentId ?? null;
    const leaderboardOptOut = dbUser?.leaderboardOptOut ?? false;
    return {
      id: sessionUser.userId,
      email: sessionUser.email,
      name,
      role: sessionUser.role,
      organizationId: sessionUser.organizationId,
      departmentId,
      aiLevel,
      organizationName: org.name,
      leaderboardOptOut,
    };
  }

  // ---------------------------------------------------------------------------
  // Invitations
  // ---------------------------------------------------------------------------

  /**
   * Accept an invitation. The web client calls this BEFORE running the Supabase
   * sign-up step — that way the User row exists for the invited org keyed on
   * the email, and the next Supabase login attaches `supabaseUserId` to it via
   * the normal upsert path.
   */
  async acceptInvitation(
    body: AcceptInvitationInput,
    ipAddress?: string,
  ): Promise<AcceptInvitationResult> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: body.token },
      include: { organization: true },
    });

    if (
      !invitation ||
      invitation.status !== InvitationStatus.PENDING ||
      invitation.expiresAt < new Date()
    ) {
      throw new NotFoundException('Invitation not found or has expired');
    }

    const emailLower = invitation.email.toLowerCase();

    let user = await this.prisma.user.findUnique({
      where: {
        organizationId_email: {
          organizationId: invitation.organizationId,
          email: emailLower,
        },
      },
    });

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: body.name ?? user.name,
          departmentId: invitation.departmentId ?? user.departmentId,
          role: invitation.role,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          organizationId: invitation.organizationId,
          departmentId: invitation.departmentId ?? undefined,
          email: emailLower,
          name: body.name ?? emailLower,
          role: invitation.role,
        },
      });
    }

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedById: user.id,
      },
    });

    await this.writeAuditLog({
      organizationId: invitation.organizationId,
      actorId: user.id,
      action: 'auth.invitation_accepted',
      metadata: {
        email: user.email,
        invitationId: invitation.id,
        ipAddress: ipAddress ?? null,
      },
    });

    const redirect = user.role === Role.EMPLOYEE ? '/learn' : '/admin';
    return { redirect, email: emailLower };
  }

  async writeSignOutAuditLog(sessionUser: SessionPayload): Promise<void> {
    await this.writeAuditLog({
      organizationId: sessionUser.organizationId,
      actorId: sessionUser.userId,
      action: 'auth.signout',
      metadata: { email: sessionUser.email },
    });
  }

  private async writeAuditLog(entry: {
    organizationId: string;
    actorId: string | null;
    action: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: entry.organizationId,
          actorId: entry.actorId ?? undefined,
          action: entry.action,
          metadata: entry.metadata as Prisma.InputJsonValue,
        },
      });
    } catch (err: unknown) {
      this.logger.error(
        `Failed to write audit log for action ${entry.action}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
