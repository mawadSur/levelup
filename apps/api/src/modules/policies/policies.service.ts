import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionPayload } from '@levelup/auth-client';
import type { CompanyPolicy } from '@levelup/db';
import { Prisma } from '@levelup/db';
import type { PublishPolicyDto } from './dto/update-policy.dto';

@Injectable()
export class PoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── helpers ──────────────────────────────────────────────────────────────

  private async auditLog(
    organizationId: string,
    actorId: string,
    action: string,
    targetId: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId,
        action,
        targetType: 'CompanyPolicy',
        targetId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  // ─── current policy ───────────────────────────────────────────────────────

  /**
   * Returns the policy with the highest version for the caller's org.
   * Throws NotFoundException with { error: { code: 'NO_POLICY' } } if none.
   */
  async getCurrentPolicy(user: SessionPayload): Promise<CompanyPolicy> {
    const policy = await this.prisma.companyPolicy.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { version: 'desc' },
    });

    if (!policy) {
      throw new NotFoundException({ error: { code: 'NO_POLICY' } });
    }

    return policy;
  }

  // ─── list all versions ────────────────────────────────────────────────────

  async listPolicies(user: SessionPayload): Promise<CompanyPolicy[]> {
    return this.prisma.companyPolicy.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { version: 'desc' },
    });
  }

  // ─── get by version ───────────────────────────────────────────────────────

  async getPolicyByVersion(user: SessionPayload, version: number): Promise<CompanyPolicy> {
    const policy = await this.prisma.companyPolicy.findFirst({
      where: { organizationId: user.organizationId, version },
    });

    if (!policy) {
      throw new NotFoundException(`Policy version ${version} not found`);
    }

    return policy;
  }

  // ─── publish new version ──────────────────────────────────────────────────

  /**
   * Creates a new policy version (current max + 1, or 1 if none).
   * Past versions are read-only; only roll-forward is permitted.
   */
  async publishPolicy(user: SessionPayload, dto: PublishPolicyDto): Promise<CompanyPolicy> {
    const latest = await this.prisma.companyPolicy.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (latest?.version ?? 0) + 1;

    const policy = await this.prisma.companyPolicy.create({
      data: {
        organizationId: user.organizationId,
        version: nextVersion,
        policyText: dto.policyText,
        approvedTools: (dto.approvedTools ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        ...(dto.uploadedFileUrl !== undefined && { uploadedFileUrl: dto.uploadedFileUrl }),
        createdById: user.userId,
      },
    });

    await this.auditLog(user.organizationId, user.userId, 'policy.publish', policy.id, {
      version: nextVersion,
    });

    return policy;
  }

  // ─── delete / revoke version ──────────────────────────────────────────────

  /**
   * Hard-deletes the policy row for the given version.
   *
   * Decision: We perform a hard delete (DELETE row) rather than a soft-delete
   * (overwriting policyText with '[REVOKED]') because:
   *
   *  1. The CompanyPolicy schema has no `deletedAt` / `isRevoked` column, so
   *     a soft-delete would repurpose `policyText` as a status flag — mixing
   *     data and state in the same column is a worse semantic than a clean row
   *     removal.
   *  2. The audit log (policy.delete_version) provides the evidentiary trail
   *     that compliance requires without leaving a zombie row in the DB.
   *  3. Cascade: the org relation uses onDelete: Cascade so there are no
   *     orphaned FK references to worry about.
   *
   * If a future requirement demands version tombstoning, add a `revokedAt`
   * column in a migration and change this method to a partial update.
   */
  async deleteVersion(user: SessionPayload, version: number): Promise<{ deleted: true }> {
    const policy = await this.prisma.companyPolicy.findFirst({
      where: { organizationId: user.organizationId, version },
    });

    if (!policy) {
      throw new NotFoundException(`Policy version ${version} not found`);
    }

    await this.prisma.companyPolicy.delete({ where: { id: policy.id } });

    await this.auditLog(user.organizationId, user.userId, 'policy.delete_version', policy.id, {
      version,
    });

    return { deleted: true };
  }
}
