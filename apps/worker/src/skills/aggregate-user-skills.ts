/**
 * aggregate-user-skills job handler — EXPANSION #1 Skill mastery aggregator.
 *
 * Runs daily (04:00 UTC). Recomputes UserSkill rows for every user across
 * three dimensions:
 *   - exposure: completed lessons that teach this skill (weighted)
 *   - practice: passed lab attempts that teach this skill (weighted)
 *   - transfer: recent (30d) coach sessions WITHOUT sensitive-data detection,
 *               applied to skills tagged on the lessons/labs the user has
 *               touched, with exponential decay favouring fresh activity.
 *
 * Each dimension is normalised to 0..1 by dividing by the total
 * skill-weight available, then clamped. Upserts make a duplicate run safe.
 */

import type { Job } from 'bullmq';
import type { AggregateUserSkillsInput, AggregateUserSkillsOutput } from '@levelup/queue';
import { prisma } from '@levelup/db';
import { logger } from '../logger.js';

const TRANSFER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const TRANSFER_BUMP_PER_SESSION = 0.1;
const TRANSFER_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_USERS_PER_RUN = 10_000;

function clamp01(v: number): number {
  if (Number.isNaN(v) || !Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

interface SkillWeightTotals {
  /** Total LessonSkill.weight across the entire (global ∪ org) catalog per skillId. */
  lessonTotalsBySkill: Map<string, number>;
  /** Total LabSkill.weight across the entire catalog per skillId. */
  labTotalsBySkill: Map<string, number>;
  /** Map lessonId -> array of (skillId, weight) for fast user-loop joins. */
  lessonSkillMap: Map<string, Array<{ skillId: string; weight: number }>>;
  /** Map labId -> array of (skillId, weight). */
  labSkillMap: Map<string, Array<{ skillId: string; weight: number }>>;
}

async function loadSkillWeightTotals(organizationId: string): Promise<SkillWeightTotals> {
  const lessonSkills = await prisma.lessonSkill.findMany({
    where: {
      OR: [{ skill: { organizationId: null } }, { skill: { organizationId } }],
    },
    select: { lessonId: true, skillId: true, weight: true },
  });

  const labSkills = await prisma.labSkill.findMany({
    where: {
      OR: [{ skill: { organizationId: null } }, { skill: { organizationId } }],
    },
    select: { labId: true, skillId: true, weight: true },
  });

  const lessonTotalsBySkill = new Map<string, number>();
  const labTotalsBySkill = new Map<string, number>();
  const lessonSkillMap = new Map<string, Array<{ skillId: string; weight: number }>>();
  const labSkillMap = new Map<string, Array<{ skillId: string; weight: number }>>();

  for (const row of lessonSkills) {
    lessonTotalsBySkill.set(row.skillId, (lessonTotalsBySkill.get(row.skillId) ?? 0) + row.weight);
    const arr = lessonSkillMap.get(row.lessonId) ?? [];
    arr.push({ skillId: row.skillId, weight: row.weight });
    lessonSkillMap.set(row.lessonId, arr);
  }
  for (const row of labSkills) {
    labTotalsBySkill.set(row.skillId, (labTotalsBySkill.get(row.skillId) ?? 0) + row.weight);
    const arr = labSkillMap.get(row.labId) ?? [];
    arr.push({ skillId: row.skillId, weight: row.weight });
    labSkillMap.set(row.labId, arr);
  }

  return { lessonTotalsBySkill, labTotalsBySkill, lessonSkillMap, labSkillMap };
}

interface AggregateResult {
  rowsWritten: number;
  skillsTouched: Set<string>;
}

async function aggregateForUser(
  userId: string,
  organizationId: string,
  now: Date,
  totals: SkillWeightTotals,
): Promise<AggregateResult> {
  const completed = await prisma.userProgress.findMany({
    where: { userId, status: 'COMPLETED' },
    select: { lessonId: true },
  });

  const passedLabs = await prisma.labAttempt.findMany({
    where: { userId, passed: true },
    select: { labId: true },
    distinct: ['labId'],
  });

  const since = new Date(now.getTime() - TRANSFER_WINDOW_MS);
  const coachSessions = await prisma.aiCoachSession.findMany({
    where: {
      userId,
      organizationId,
      sensitiveDataDetected: false,
      createdAt: { gte: since },
    },
    select: { createdAt: true },
  });

  const exposureScore = new Map<string, number>();
  for (const p of completed) {
    const tags = totals.lessonSkillMap.get(p.lessonId);
    if (!tags) continue;
    for (const t of tags) {
      exposureScore.set(t.skillId, (exposureScore.get(t.skillId) ?? 0) + t.weight);
    }
  }

  const practiceScore = new Map<string, number>();
  for (const a of passedLabs) {
    const tags = totals.labSkillMap.get(a.labId);
    if (!tags) continue;
    for (const t of tags) {
      practiceScore.set(t.skillId, (practiceScore.get(t.skillId) ?? 0) + t.weight);
    }
  }

  // Transfer: skills the user has even touched (exposure ∪ practice) are
  // candidates. Each non-sensitive coach session adds a decayed bump to all
  // candidates, capped at 1.0.
  const touchedSkills = new Set<string>([...exposureScore.keys(), ...practiceScore.keys()]);
  let transferRaw = 0;
  for (const s of coachSessions) {
    const ageMs = now.getTime() - s.createdAt.getTime();
    const decay = Math.pow(0.5, ageMs / TRANSFER_HALF_LIFE_MS);
    transferRaw += TRANSFER_BUMP_PER_SESSION * decay;
  }
  const transferPerSkill = clamp01(transferRaw);

  const skillIds = new Set<string>([
    ...exposureScore.keys(),
    ...practiceScore.keys(),
    ...(touchedSkills.size > 0 ? touchedSkills : []),
  ]);

  if (skillIds.size === 0) {
    return { rowsWritten: 0, skillsTouched: new Set() };
  }

  let rowsWritten = 0;
  const skillsTouched = new Set<string>();

  for (const skillId of skillIds) {
    const lessonTotal = totals.lessonTotalsBySkill.get(skillId) ?? 0;
    const labTotal = totals.labTotalsBySkill.get(skillId) ?? 0;

    const exposure = lessonTotal > 0 ? clamp01((exposureScore.get(skillId) ?? 0) / lessonTotal) : 0;
    const practice = labTotal > 0 ? clamp01((practiceScore.get(skillId) ?? 0) / labTotal) : 0;
    const transfer = touchedSkills.has(skillId) ? transferPerSkill : 0;

    if (exposure === 0 && practice === 0 && transfer === 0) continue;

    await prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId } },
      create: { userId, skillId, exposure, practice, transfer },
      update: { exposure, practice, transfer },
    });
    rowsWritten += 1;
    skillsTouched.add(skillId);
  }

  return { rowsWritten, skillsTouched };
}

export async function aggregateUserSkillsHandler(
  job: Job<AggregateUserSkillsInput>,
): Promise<AggregateUserSkillsOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const triggeredAt = job.data.triggeredAt ?? new Date().toISOString();
  log.info('aggregate-user-skills: starting', {
    triggeredAt,
    orgScope: job.data.organizationId ?? null,
    userScope: job.data.userId ?? null,
  });

  const start = Date.now();
  const now = new Date();

  const userFilter = job.data.userId ? { id: job.data.userId } : {};
  const orgFilter = job.data.organizationId ? { id: job.data.organizationId } : {};

  const orgs = await prisma.organization.findMany({
    where: orgFilter,
    select: { id: true },
    take: MAX_USERS_PER_RUN,
  });

  let usersScanned = 0;
  let rowsWritten = 0;
  const skillsTouchedAcrossOrgs = new Set<string>();

  for (const org of orgs) {
    let totals: SkillWeightTotals;
    try {
      totals = await loadSkillWeightTotals(org.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('aggregate-user-skills: load totals failed', { orgId: org.id, error: message });
      continue;
    }

    if (totals.lessonSkillMap.size === 0 && totals.labSkillMap.size === 0) {
      // No content tagged yet — nothing to aggregate for this org.
      continue;
    }

    const users = await prisma.user.findMany({
      where: { organizationId: org.id, deactivatedAt: null, ...userFilter },
      select: { id: true },
      take: MAX_USERS_PER_RUN,
    });

    for (const u of users) {
      try {
        const result = await aggregateForUser(u.id, org.id, now, totals);
        rowsWritten += result.rowsWritten;
        result.skillsTouched.forEach((s) => skillsTouchedAcrossOrgs.add(s));
        usersScanned += 1;
        if (result.rowsWritten > 0) {
          try {
            await prisma.auditLog.create({
              data: {
                organizationId: org.id,
                actorId: null,
                action: 'user.skill_updated_aggregate',
                targetType: 'User',
                targetId: u.id,
                metadata: {
                  rowsWritten: result.rowsWritten,
                  skillsTouched: Array.from(result.skillsTouched),
                },
              },
            });
          } catch {
            // Audit failures must never block aggregation.
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error('aggregate-user-skills: user error', { userId: u.id, error: message });
      }
    }
  }

  const durationMs = Date.now() - start;
  log.info('aggregate-user-skills: completed', {
    usersScanned,
    rowsWritten,
    skillsTouched: skillsTouchedAcrossOrgs.size,
    durationMs,
  });

  return {
    usersScanned,
    rowsWritten,
    skillsTouched: skillsTouchedAcrossOrgs.size,
  };
}
