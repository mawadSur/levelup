/**
 * CertificatesService — T2.15
 *
 * Handles certificate retrieval, issuance, verification and PDF download logic.
 * PDF generation itself is delegated to the cert-pdf BullMQ worker; this
 * service only enqueues the job and updates pdfUrl once the worker completes.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import type { SessionPayload } from '@levelup/auth-client';
import { enqueueCertPdf } from '@levelup/queue';
import type { IssueCertificateDto } from './dto/issue-certificate.dto';
import { signCertificate, verifyCertificate } from './cert-signing';

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export interface MyCertificate {
  id: string;
  learningPathId: string;
  signedHash: string;
  pdfUrl: string | null;
  issuedAt: Date;
  learningPath: { title: string };
}

export interface CertificateDetail {
  id: string;
  userId: string;
  learningPathId: string;
  signedHash: string;
  pdfUrl: string | null;
  issuedAt: Date;
  learningPath: { title: string };
  verificationUrl: string;
}

export interface DownloadResult {
  status: 'generating' | 'ready';
  pdfUrl?: string;
  tryAgainIn?: number;
}

export interface VerifyResult {
  valid: boolean;
  certificate?: {
    holderName: string;
    pathTitle: string;
    issuedAt: Date;
    organizationName: string;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VERIFY_BASE_URL = 'https://app.levelup.example/certificates/verify';
const DOWNLOAD_RETRY_SECONDS = 5;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // GET /certificates/me
  // --------------------------------------------------------------------------

  async getMyCertificates(user: SessionPayload): Promise<MyCertificate[]> {
    const certs = await this.prisma.certificate.findMany({
      where: { userId: user.userId },
      orderBy: { issuedAt: 'desc' },
      include: {
        learningPath: { select: { title: true } },
      },
    });

    return certs.map((c) => ({
      id: c.id,
      learningPathId: c.learningPathId,
      signedHash: c.signedHash,
      pdfUrl: c.pdfUrl,
      issuedAt: c.issuedAt,
      learningPath: { title: c.learningPath.title },
    }));
  }

  // --------------------------------------------------------------------------
  // GET /certificates/:id
  // --------------------------------------------------------------------------

  async getCertificate(certificateId: string, user: SessionPayload): Promise<CertificateDetail> {
    const cert = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        learningPath: { select: { title: true } },
        user: {
          select: {
            id: true,
            organizationId: true,
            departmentId: true,
          },
        },
      },
    });

    if (!cert) throw new NotFoundException('Certificate not found');

    // Org scope check
    if (cert.user.organizationId !== user.organizationId) {
      throw new ForbiddenException('Certificate is outside your organization');
    }

    // Access check: owner OR manager-of-user's-dept OR admin
    const isOwner = cert.userId === user.userId;
    const isAdmin = user.role === 'ADMIN';
    let isManagerOfDept = false;

    if (!isOwner && !isAdmin && user.role === 'MANAGER') {
      // Manager can access if the certificate holder is in a dept managed by them.
      // Heuristic: manager is in the same department as the cert holder.
      const manager = await this.prisma.user.findUnique({
        where: { id: user.userId },
        select: { departmentId: true },
      });
      isManagerOfDept =
        manager?.departmentId !== null &&
        manager?.departmentId !== undefined &&
        manager.departmentId === cert.user.departmentId;
    }

    if (!isOwner && !isAdmin && !isManagerOfDept) {
      throw new ForbiddenException('You do not have access to this certificate');
    }

    return {
      id: cert.id,
      userId: cert.userId,
      learningPathId: cert.learningPathId,
      signedHash: cert.signedHash,
      pdfUrl: cert.pdfUrl,
      issuedAt: cert.issuedAt,
      learningPath: { title: cert.learningPath.title },
      verificationUrl: `${VERIFY_BASE_URL}/${cert.signedHash}`,
    };
  }

  // --------------------------------------------------------------------------
  // GET /certificates/:id/download  (owner only)
  // --------------------------------------------------------------------------

  async getCertificateDownload(
    certificateId: string,
    user: SessionPayload,
  ): Promise<DownloadResult> {
    const cert = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
    });

    if (!cert) throw new NotFoundException('Certificate not found');

    // Owner-only
    if (cert.userId !== user.userId) {
      throw new ForbiddenException('Only the certificate owner can download it');
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'certificate.download',
        targetType: 'Certificate',
        targetId: cert.id,
        metadata: { hasPdf: cert.pdfUrl !== null },
      },
    });

    if (cert.pdfUrl === null) {
      // Enqueue generation
      const job = await enqueueCertPdf({ certificateId: cert.id });
      this.logger.log(`Enqueued cert-pdf job ${job.id} for certificate ${cert.id}`);
      return { status: 'generating', tryAgainIn: DOWNLOAD_RETRY_SECONDS };
    }

    return { status: 'ready', pdfUrl: cert.pdfUrl };
  }

  // --------------------------------------------------------------------------
  // GET /certificates/verify/:hash  (@Public — no auth)
  // --------------------------------------------------------------------------

  async verifyCertificate(signedHash: string): Promise<VerifyResult> {
    const cert = await this.prisma.certificate.findFirst({
      where: { signedHash },
      include: {
        user: { select: { name: true, organizationId: true } },
        learningPath: { select: { title: true } },
      },
    });

    if (!cert) {
      await this.auditVerifyCheck(null, signedHash, false);
      return { valid: false };
    }

    // Defense-in-depth: even though the signedHash matched a row, recompute
    // the HMAC from the row's canonical inputs and compare. If the column
    // were ever polluted (e.g. legacy SHA-256 values from before the SEV-5
    // fix, or a manual DB write), the keyed check still fails closed.
    const hmacOk = verifyCertificate(
      {
        userId: cert.userId,
        learningPathId: cert.learningPathId,
        issuedAt: cert.issuedAt,
      },
      cert.signedHash,
    );

    if (!hmacOk) {
      await this.auditVerifyCheck(cert.user.organizationId, signedHash, false);
      return { valid: false };
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: cert.user.organizationId },
      select: { name: true },
    });

    await this.auditVerifyCheck(cert.user.organizationId, signedHash, true);

    return {
      valid: true,
      certificate: {
        holderName: cert.user.name,
        pathTitle: cert.learningPath.title,
        issuedAt: cert.issuedAt,
        organizationName: org?.name ?? 'LevelUp AI Academy',
      },
    };
  }

  private async auditVerifyCheck(
    orgId: string | null,
    signedHash: string,
    valid: boolean,
  ): Promise<void> {
    if (!orgId) return; // Cannot write audit log without an org
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: orgId,
          actorId: null,
          action: 'certificate.verify_check',
          targetType: 'Certificate',
          metadata: { signedHash, valid },
        },
      });
    } catch (err) {
      // Non-critical; swallow errors in audit path
      this.logger.warn(`Failed to write verify audit log: ${String(err)}`);
    }
  }

  // --------------------------------------------------------------------------
  // POST /certificates/issue  (ADMIN only)
  // --------------------------------------------------------------------------

  async issueCertificate(user: SessionPayload, dto: IssueCertificateDto): Promise<MyCertificate> {
    // Validate target user exists within the same org
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, organizationId: true, name: true },
    });
    if (!targetUser) throw new NotFoundException('User not found');
    if (targetUser.organizationId !== user.organizationId) {
      throw new ForbiddenException('User is outside your organization');
    }

    // Validate learning path exists and belongs to this org (or is global)
    const learningPath = await this.prisma.learningPath.findFirst({
      where: {
        id: dto.learningPathId,
        OR: [{ organizationId: user.organizationId }, { organizationId: null }],
      },
      select: { id: true, title: true },
    });
    if (!learningPath) throw new NotFoundException('Learning path not found');

    // SEV-5 fix: keyed HMAC over (userId, learningPathId, issuedAt). We choose
    // `issuedAt` ourselves so the row's persisted timestamp matches the bytes
    // we signed — `@default(now())` would otherwise risk a clock-skew mismatch.
    const issuedAt = new Date();
    const signedHash = signCertificate({
      userId: dto.userId,
      learningPathId: dto.learningPathId,
      issuedAt,
    });

    let cert;
    try {
      cert = await this.prisma.certificate.create({
        data: {
          userId: dto.userId,
          learningPathId: dto.learningPathId,
          signedHash,
          issuedAt,
        },
        include: { learningPath: { select: { title: true } } },
      });
    } catch {
      // Unique constraint: certificate already exists for this user+path
      throw new ConflictException('A certificate for this user and learning path already exists');
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'certificate.manual_issue',
        targetType: 'Certificate',
        targetId: cert.id,
        metadata: {
          targetUserId: dto.userId,
          targetUserName: targetUser.name,
          learningPathId: dto.learningPathId,
          learningPathTitle: learningPath.title,
        },
      },
    });

    return {
      id: cert.id,
      learningPathId: cert.learningPathId,
      signedHash: cert.signedHash,
      pdfUrl: cert.pdfUrl,
      issuedAt: cert.issuedAt,
      learningPath: { title: cert.learningPath.title },
    };
  }
}
