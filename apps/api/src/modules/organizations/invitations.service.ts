import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { InvitationPreview } from '@levelup/types';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma';
import { planSeatsFor, isWithinSeatLimit } from '@levelup/billing';
import { enqueueEmail } from '@levelup/queue';
import type { SessionPayload } from '@levelup/auth-client';
import { InviteUserDto } from './dto/invite-user.dto';

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private expiresInDays(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  async createInvitation(user: SessionPayload, dto: InviteUserDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const currentCount = await this.prisma.user.count({
      where: { organizationId: user.organizationId },
    });

    const seatCap = org.planSeats > 0 ? org.planSeats : planSeatsFor(org.plan);

    if (!isWithinSeatLimit(org.plan, currentCount + 1)) {
      throw new BadRequestException(
        `Seat limit reached for plan ${org.plan}: maximum ${seatCap} seats allowed`,
      );
    }

    const token = this.generateToken();
    const expiresAt = this.expiresInDays(7);

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId: user.organizationId,
        email: dto.email,
        role: dto.role,
        departmentId: dto.departmentId ?? null,
        token,
        expiresAt,
        invitedById: user.userId,
        status: 'PENDING',
      },
    });

    await enqueueEmail({
      to: dto.email,
      templateKey: 'invitation',
      data: {
        organizationName: org.name,
        invitedByEmail: user.email,
        role: dto.role,
        inviteUrl: `${process.env['WEB_ORIGIN'] ?? 'http://localhost:3000'}/accept-invitation?token=${token}`,
        expiresAt: expiresAt.toISOString(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'invitation.create',
        targetType: 'Invitation',
        targetId: invitation.id,
        metadata: { email: dto.email, role: dto.role, departmentId: dto.departmentId ?? null },
      },
    });

    // Return invitation without the token to avoid leaking it
    const { token: _token, ...safeInvitation } = invitation;
    void _token;
    return safeInvitation;
  }

  async listInvitations(user: SessionPayload) {
    return this.prisma.invitation.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        email: true,
        role: true,
        departmentId: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        invitedById: true,
        acceptedById: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resendInvitation(user: SessionPayload, invitationId: string) {
    const existing = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Invitation not found');

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    });

    const token = this.generateToken();
    const expiresAt = this.expiresInDays(7);

    const updated = await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { token, expiresAt, status: 'PENDING' },
    });

    await enqueueEmail({
      to: existing.email,
      templateKey: 'invitation',
      data: {
        organizationName: org?.name ?? '',
        invitedByEmail: user.email,
        role: existing.role,
        inviteUrl: `${process.env['WEB_ORIGIN'] ?? 'http://localhost:3000'}/accept-invitation?token=${token}`,
        expiresAt: expiresAt.toISOString(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'invitation.resend',
        targetType: 'Invitation',
        targetId: invitationId,
        metadata: { email: existing.email },
      },
    });

    const { token: _token, ...safeInvitation } = updated;
    void _token;
    return safeInvitation;
  }

  async previewInvitation(token: string): Promise<InvitationPreview> {
    const invite = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: { select: { name: true } },
        invitedBy: { select: { name: true } },
      },
    });

    if (!invite) throw new NotFoundException('Invitation not found');

    const now = new Date();
    const status: InvitationPreview['status'] =
      invite.expiresAt < now ? 'EXPIRED' : (invite.status as InvitationPreview['status']);

    return {
      inviterName: invite.invitedBy?.name ?? 'a teammate',
      orgName: invite.organization.name,
      email: invite.email,
      role: invite.role as InvitationPreview['role'],
      expiresAt: invite.expiresAt.toISOString(),
      status,
    };
  }

  async revokeInvitation(user: SessionPayload, invitationId: string) {
    const existing = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Invitation not found');

    const updated = await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'invitation.revoke',
        targetType: 'Invitation',
        targetId: invitationId,
        metadata: { email: existing.email },
      },
    });

    const { token: _token, ...safeInvitation } = updated;
    void _token;
    return safeInvitation;
  }
}
