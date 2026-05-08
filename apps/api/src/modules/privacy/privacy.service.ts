/**
 * PrivacyService — CR.15 GDPR / CCPA Self-Service
 *
 * Handles data export requests and account deletion requests.
 * Data export jobs are processed by the worker; deletion is a 30-day grace
 * period flow that requires email confirmation.
 */

import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { DataExportRequest, DeletionRequest, Prisma } from '@levelup/db';
import { PrismaService } from '../prisma';
import type { SessionPayload } from '@levelup/auth-client';
import { enqueueDataExport, enqueueEmail } from '@levelup/queue';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPORT_EXPIRY_DAYS = 7;
const DELETION_GRACE_DAYS = 30;

const APP_URL = process.env['APP_URL'] ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Data Export
  // --------------------------------------------------------------------------

  /**
   * Create a new data-export request.
   * Cap: 1 active (PENDING or PROCESSING) request per user at a time.
   */
  async requestDataExport(user: SessionPayload): Promise<DataExportRequest> {
    // Enforce cap: one active export at a time.
    const active = await this.prisma.dataExportRequest.findFirst({
      where: {
        userId: user.userId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (active) {
      throw new ConflictException(
        'You already have an export in progress. Please wait for it to complete before requesting another.',
      );
    }

    const request = await this.prisma.dataExportRequest.create({
      data: {
        userId: user.userId,
        status: 'PENDING',
      },
    });

    // Enqueue the worker job
    const job = await enqueueDataExport({ requestId: request.id, userId: user.userId });
    this.logger.log(`Enqueued data-export job ${job.id} for request ${request.id}`);

    // Audit log
    await this.audit(user, 'privacy.export_requested', 'DataExportRequest', request.id, {});

    return request;
  }

  async getDataExportStatus(id: string, user: SessionPayload): Promise<DataExportRequest> {
    const request = await this.prisma.dataExportRequest.findUnique({ where: { id } });

    if (!request) throw new NotFoundException('Export request not found');
    if (request.userId !== user.userId) {
      throw new ForbiddenException('You do not own this export request');
    }

    return request;
  }

  async listDataExports(userId: string): Promise<DataExportRequest[]> {
    return this.prisma.dataExportRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  // --------------------------------------------------------------------------
  // Deletion
  // --------------------------------------------------------------------------

  /**
   * Create a new deletion request with a 30-day grace period.
   * Sends a confirmation email to the user.
   */
  async requestDeletion(user: SessionPayload, reason?: string): Promise<DeletionRequest> {
    // Only one active (PENDING) deletion request allowed at a time.
    const active = await this.prisma.deletionRequest.findFirst({
      where: {
        userId: user.userId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (active) {
      throw new ConflictException(
        'You already have a pending deletion request. You can cancel it first if you want to restart.',
      );
    }

    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + DELETION_GRACE_DAYS);

    const deletionRequest = await this.prisma.deletionRequest.create({
      data: {
        userId: user.userId,
        status: 'PENDING',
        scheduledFor,
        reason: reason ?? null,
      },
    });

    // Look up user email for notification
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { email: true, organizationId: true },
    });

    if (dbUser) {
      const confirmUrl = `${APP_URL}/privacy?confirm=${deletionRequest.id}`;
      await enqueueEmail({
        to: dbUser.email,
        templateKey: 'account-deletion-confirmation',
        data: {
          confirmUrl,
          scheduledFor: scheduledFor.toISOString(),
          organizationId: dbUser.organizationId,
        },
      });
    }

    await this.audit(user, 'privacy.deletion_requested', 'DeletionRequest', deletionRequest.id, {
      scheduledFor: scheduledFor.toISOString(),
    });

    return deletionRequest;
  }

  /**
   * Flip a PENDING deletion request to CONFIRMED (user clicks email link).
   */
  async confirmDeletion(id: string, user: SessionPayload): Promise<DeletionRequest> {
    const deletionRequest = await this.findOwnedDeletion(id, user.userId);

    if (deletionRequest.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot confirm a deletion request with status ${deletionRequest.status}`,
      );
    }

    const updated = await this.prisma.deletionRequest.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    await this.audit(user, 'privacy.deletion_confirmed', 'DeletionRequest', id, {
      scheduledFor: deletionRequest.scheduledFor.toISOString(),
    });

    return updated;
  }

  /**
   * Cancel a PENDING or CONFIRMED deletion request before the grace period ends.
   */
  async cancelDeletion(id: string, user: SessionPayload): Promise<DeletionRequest> {
    const deletionRequest = await this.findOwnedDeletion(id, user.userId);

    if (!['PENDING', 'CONFIRMED'].includes(deletionRequest.status)) {
      throw new BadRequestException(
        `Cannot cancel a deletion request with status ${deletionRequest.status}`,
      );
    }

    // Confirmed requests can only be cancelled while still within grace period
    if (deletionRequest.status === 'CONFIRMED' && deletionRequest.scheduledFor <= new Date()) {
      throw new BadRequestException(
        'The grace period has already passed — deletion cannot be cancelled',
      );
    }

    const updated = await this.prisma.deletionRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    await this.audit(user, 'privacy.deletion_cancelled', 'DeletionRequest', id, {});

    return updated;
  }

  async listDeletions(userId: string): Promise<DeletionRequest[]> {
    return this.prisma.deletionRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private async findOwnedDeletion(id: string, userId: string): Promise<DeletionRequest> {
    const deletionRequest = await this.prisma.deletionRequest.findUnique({ where: { id } });
    if (!deletionRequest) throw new NotFoundException('Deletion request not found');
    if (deletionRequest.userId !== userId) {
      throw new ForbiddenException('You do not own this deletion request');
    }
    return deletionRequest;
  }

  private async audit(
    user: SessionPayload,
    action: string,
    targetType: string,
    targetId: string,
    metadata: Prisma.InputJsonValue,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          actorId: user.userId,
          action,
          targetType,
          targetId,
          metadata,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write audit log for ${action}: ${String(err)}`);
    }
  }
}
