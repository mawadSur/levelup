import { Injectable } from '@nestjs/common';
import { FeatureFlag } from '@levelup/db';
import { Prisma } from '@levelup/db';
import { PrismaService } from '../prisma';
import { UpsertFlagDto } from './dto/upsert-flag.dto';

export interface EvaluatedFlag {
  key: string;
  enabled: boolean;
  rolloutPercent: number | null;
  source: 'org' | 'global' | 'default';
  metadata: Record<string, unknown> | null;
}

/**
 * djb2-style 32-bit hash — deterministic per userId+flagKey combination.
 * Returns a value in 0..99 for rollout bucketing.
 */
function rolloutBucket(userId: string, flagKey: string): number {
  const str = `${userId}:${flagKey}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // djb2: hash = ((hash << 5) + hash) + charCode
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0; // keep 32-bit unsigned
  }
  return hash % 100;
}

function toEvaluatedFlag(flag: FeatureFlag, source: 'org' | 'global'): EvaluatedFlag {
  return {
    key: flag.key,
    enabled: flag.enabled,
    rolloutPercent: flag.rolloutPercent ?? null,
    source,
    metadata: flag.metadata != null ? (flag.metadata as Record<string, unknown>) : null,
  };
}

@Injectable()
export class FlagsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all flags relevant to an org: org-specific overrides + global
   * defaults that are NOT overridden at the org level.
   */
  async listFlagsForOrg(organizationId: string): Promise<EvaluatedFlag[]> {
    const [orgFlags, globalFlags] = await Promise.all([
      this.prisma.featureFlag.findMany({
        where: { organizationId },
      }),
      this.prisma.featureFlag.findMany({
        where: { organizationId: null },
      }),
    ]);

    const orgKeys = new Set(orgFlags.map((f) => f.key));

    const result: EvaluatedFlag[] = [
      ...orgFlags.map((f) => toEvaluatedFlag(f, 'org')),
      ...globalFlags.filter((f) => !orgKeys.has(f.key)).map((f) => toEvaluatedFlag(f, 'global')),
    ];

    return result.sort((a, b) => a.key.localeCompare(b.key));
  }

  /**
   * Upsert a flag for an org (or globally when organizationId is null).
   */
  async upsertFlag(
    organizationId: string | null,
    dto: UpsertFlagDto,
    actorId: string,
  ): Promise<FeatureFlag> {
    const flag = await this.prisma.featureFlag.upsert({
      where: {
        organizationId_key: {
          organizationId: organizationId as string,
          key: dto.key,
        },
      },
      create: {
        organizationId,
        key: dto.key,
        enabled: dto.enabled,
        rolloutPercent: dto.rolloutPercent ?? null,
        metadata: dto.metadata != null ? (dto.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      update: {
        enabled: dto.enabled,
        rolloutPercent: dto.rolloutPercent ?? null,
        metadata: dto.metadata != null ? (dto.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId: organizationId ?? flag.id, // use flag id for global flags as a stable ref
        actorId,
        action: 'flag.upsert',
        targetType: 'FeatureFlag',
        targetId: flag.id,
        metadata: {
          key: dto.key,
          enabled: dto.enabled,
          rolloutPercent: dto.rolloutPercent ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    return flag;
  }

  /**
   * Remove an org-specific override (falls back to global default thereafter).
   */
  async deleteFlag(organizationId: string | null, key: string, actorId: string): Promise<void> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: {
        organizationId_key: {
          organizationId: organizationId as string,
          key,
        },
      },
    });

    if (!flag) return; // idempotent

    await this.prisma.featureFlag.delete({
      where: { id: flag.id },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId: organizationId ?? flag.id,
        actorId,
        action: 'flag.delete',
        targetType: 'FeatureFlag',
        targetId: flag.id,
        metadata: {
          key,
          enabled: flag.enabled,
          rolloutPercent: flag.rolloutPercent ?? null,
        } as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Evaluate a single flag for a user.
   * 1. Look up org-specific row.
   * 2. Fall back to global row (organizationId IS NULL).
   * 3. Default: false.
   * If rolloutPercent is set, bucket the user deterministically.
   */
  async evaluate(organizationId: string, key: string, userId: string): Promise<boolean> {
    const [orgFlags, globalFlags] = await Promise.all([
      this.prisma.featureFlag.findMany({
        where: { organizationId, key },
      }),
      this.prisma.featureFlag.findMany({
        where: { organizationId: null, key },
      }),
    ]);
    const orgFlag = orgFlags[0] ?? null;
    const globalFlag = globalFlags[0] ?? null;

    const flag = orgFlag ?? globalFlag;
    if (!flag) return false;
    if (!flag.enabled) return false;

    if (flag.rolloutPercent != null) {
      return rolloutBucket(userId, key) < flag.rolloutPercent;
    }

    return true;
  }

  /**
   * Evaluate ALL known flags (org + global) for a user in one call.
   */
  async evaluateAll(organizationId: string, userId: string): Promise<Record<string, boolean>> {
    const [orgFlags, globalFlags] = await Promise.all([
      this.prisma.featureFlag.findMany({ where: { organizationId } }),
      this.prisma.featureFlag.findMany({ where: { organizationId: null } }),
    ]);

    const result: Record<string, boolean> = {};

    // Apply global defaults first, then org overrides win
    for (const flag of globalFlags) {
      if (!flag.enabled) {
        result[flag.key] = false;
      } else if (flag.rolloutPercent != null) {
        result[flag.key] = rolloutBucket(userId, flag.key) < flag.rolloutPercent;
      } else {
        result[flag.key] = true;
      }
    }

    for (const flag of orgFlags) {
      if (!flag.enabled) {
        result[flag.key] = false;
      } else if (flag.rolloutPercent != null) {
        result[flag.key] = rolloutBucket(userId, flag.key) < flag.rolloutPercent;
      } else {
        result[flag.key] = true;
      }
    }

    return result;
  }
}
