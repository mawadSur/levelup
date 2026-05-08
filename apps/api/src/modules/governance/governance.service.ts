/**
 * GovernanceService — CISO-positioning surface.
 *
 * Aggregates the existing AuditLog + AiCoachSession + AnomalyAlert + UserProgress
 * data into the four lenses the CISO dashboard needs:
 *   1. POSTURE         — top-row KPI strip (4 numbers)
 *   2. RISK BY DEPT    — table rows (one per department)
 *   3. TRIGGER FEED    — chronological list of sensitive-data triggers (redacted)
 *   4. EVIDENCE EXPORT — kicks off the PDF report worker job
 *
 * All numbers are computed against the caller's organization (`SessionPayload.organizationId`).
 * No new tables — re-uses the existing AuditLog + AiCoachSession schema so we
 * could ship this without a migration.
 *
 * Privacy-by-default rules baked in here:
 *   - Trigger feed redacts users to `USER_<6chars>`. Real names stay server-side.
 *   - Trigger feed truncates the prompt to first 60 chars. Full content is never
 *     returned by the API surface.
 *   - Reading the trigger feed writes a `governance.feed_viewed` AuditLog row
 *     so the watchers themselves are watched.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@levelup/db';
import { enqueueGovernanceReport, getQueue } from '@levelup/queue';
import { randomUUID } from 'node:crypto';
import { getGovernanceReportSignedUrl } from '@levelup/storage';
import { PrismaService } from '../prisma';
import type { SessionPayload } from '@levelup/auth-client';
import type { GenerateReportDto, TriggerFeedQueryDto } from './dto/governance-query.dto';

// ---------------------------------------------------------------------------
// Response types — kept local so the API compile does not depend on the
// types package dist being up to date (mirrors the InsightsService pattern).
// ---------------------------------------------------------------------------

export interface PostureResponse {
  totalAiInteractions: number;
  sensitiveDataTriggers: number;
  highRiskUsers: number;
  policyCoveragePct: number;
  windowDays: number;
}

export interface DeptRiskRow {
  departmentId: string | null;
  departmentName: string;
  headcount: number;
  coachDau30: number;
  sensitiveTriggers: number;
  policyCompletionPct: number;
  riskScore: number;
  trend: 'up' | 'down' | 'flat';
}

export interface RiskByDeptResponse {
  rows: DeptRiskRow[];
  windowDays: number;
}

export interface TriggerFeedItem {
  id: string;
  occurredAt: string;
  userMask: string;
  departmentName: string | null;
  category: string;
  trained: boolean;
  promptPreview: string;
  policySection: string | null;
  /** Suggested remediation lesson (id + title) — `null` when no path matches. */
  suggestedLesson: { lessonId: string; lessonTitle: string; pathId: string } | null;
}

export interface TriggerFeedResponse {
  items: TriggerFeedItem[];
}

export type ReportStatus = 'queued' | 'generating' | 'ready' | 'failed';

export interface ReportRequestResponse {
  requestId: string;
}

export interface ReportStatusResponse {
  requestId: string;
  status: ReportStatus;
  signedUrl: string | null;
  error: string | null;
  createdAt: string | null;
  completedAt: string | null;
}

export interface PolicyCoverageCell {
  departmentId: string | null;
  departmentName: string;
  policySection: string;
  completionPct: number;
}

export interface PolicyCoverageResponse {
  sections: string[];
  cells: PolicyCoverageCell[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const SENSITIVE_BURST_WINDOW_DAYS = 30;
const HIGH_RISK_TRIGGER_THRESHOLD = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

interface DeptRow {
  id: string;
  name: string;
}

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // I. POSTURE
  // -------------------------------------------------------------------------

  async getPosture(user: SessionPayload, windowDays = 30): Promise<PostureResponse> {
    const since = new Date(Date.now() - windowDays * DAY_MS);
    const orgId = user.organizationId;

    const [coachInteractions, sensitiveAuditCount, highRiskUserGroups, totalEmployees, completers] =
      await Promise.all([
        this.prisma.aiCoachSession.count({
          where: { organizationId: orgId, createdAt: { gte: since } },
        }),
        this.prisma.auditLog.count({
          where: {
            organizationId: orgId,
            action: 'coach.sensitive_data_detected',
            createdAt: { gte: since },
          },
        }),
        this.prisma.auditLog.groupBy({
          by: ['actorId'],
          where: {
            organizationId: orgId,
            action: 'coach.sensitive_data_detected',
            createdAt: { gte: since },
            actorId: { not: null },
          },
          _count: { id: true },
          having: { id: { _count: { gte: HIGH_RISK_TRIGGER_THRESHOLD } } },
        }),
        this.prisma.user.count({ where: { organizationId: orgId, deactivatedAt: null } }),
        this.prisma.user.count({
          where: {
            organizationId: orgId,
            deactivatedAt: null,
            progress: { some: { status: 'COMPLETED' } },
          },
        }),
      ]);

    const policyCoveragePct =
      totalEmployees === 0 ? 0 : Math.round((completers / totalEmployees) * 100);

    return {
      totalAiInteractions: coachInteractions,
      sensitiveDataTriggers: sensitiveAuditCount,
      highRiskUsers: highRiskUserGroups.length,
      policyCoveragePct,
      windowDays,
    };
  }

  // -------------------------------------------------------------------------
  // II. RISK BY DEPARTMENT
  //
  // Risk-score formula (documented per spec):
  //   triggers_per_interaction = triggers / max(interactions, 1)
  //   inverse_completion       = 1 - completion_pct
  //   size_weight              = log10(headcount + 10)        // muted by team size
  //   raw                      = triggers_per_interaction × inverse_completion × size_weight
  //   normalized               = clamp(raw × 100, 0, 100)     // human-readable 0–100
  //
  // Why this shape:
  //   - Frequency normalizes for active teams: a 50-person sales team firing 10
  //     triggers across 1,000 prompts is healthier than a 5-person finance team
  //     firing 5 triggers across 30 prompts.
  //   - Inverse-completion weights orgs that haven't trained yet — same volume of
  //     triggers, but the team that has been through the curriculum is lower risk.
  //   - log10(headcount + 10) gently up-weights bigger teams (a 200-person team
  //     with 20 triggers is a real org-wide problem; a 2-person team with 2
  //     triggers can be coached individually).
  // -------------------------------------------------------------------------

  async getRiskByDept(user: SessionPayload, windowDays = 30): Promise<RiskByDeptResponse> {
    const since = new Date(Date.now() - windowDays * DAY_MS);
    const priorSince = new Date(since.getTime() - windowDays * DAY_MS);
    const orgId = user.organizationId;

    const departments = await this.prisma.department.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    // Always include the "(unassigned)" pseudo-row when relevant.
    const allDepts: Array<DeptRow | { id: null; name: '(Unassigned)' }> = [
      ...departments,
      { id: null, name: '(Unassigned)' },
    ];

    // Headcount per dept (single grouped query — plus null bucket).
    const userGroups = await this.prisma.user.groupBy({
      by: ['departmentId'],
      where: { organizationId: orgId, deactivatedAt: null },
      _count: { id: true },
    });
    const headcountByDept = new Map<string | null, number>(
      userGroups.map((g) => [g.departmentId, g._count.id]),
    );

    // For per-dept stats we have to JOIN through users since AiCoachSession and
    // AuditLog both store userId/actorId, not departmentId. Doing a single raw
    // SQL roll-up is dramatically faster than N round-trips per dept; the
    // `Prisma.sql` template tags everything as parameters so this is safe.
    interface DeptStatsRow {
      department_id: string | null;
      coach_dau_30: bigint;
      sensitive_triggers: bigint;
      sensitive_triggers_prior: bigint;
      policy_completion_pct: number;
    }

    const stats = await this.prisma.$queryRaw<DeptStatsRow[]>`
      WITH dept_users AS (
        SELECT u.id AS user_id, u."departmentId" AS department_id
        FROM users u
        WHERE u."organizationId" = ${orgId} AND u."deactivatedAt" IS NULL
      ),
      coach_recent AS (
        SELECT du.department_id, COUNT(DISTINCT (s."userId", date_trunc('day', s."createdAt")))::bigint AS dau
        FROM ai_coach_sessions s
        JOIN dept_users du ON du.user_id = s."userId"
        WHERE s."organizationId" = ${orgId}
          AND s."createdAt" >= ${since}
        GROUP BY du.department_id
      ),
      sensitive_recent AS (
        SELECT du.department_id, COUNT(*)::bigint AS triggers
        FROM audit_logs al
        JOIN dept_users du ON du.user_id = al."actorId"
        WHERE al."organizationId" = ${orgId}
          AND al.action = 'coach.sensitive_data_detected'
          AND al."createdAt" >= ${since}
        GROUP BY du.department_id
      ),
      sensitive_prior AS (
        SELECT du.department_id, COUNT(*)::bigint AS triggers
        FROM audit_logs al
        JOIN dept_users du ON du.user_id = al."actorId"
        WHERE al."organizationId" = ${orgId}
          AND al.action = 'coach.sensitive_data_detected'
          AND al."createdAt" >= ${priorSince}
          AND al."createdAt" < ${since}
        GROUP BY du.department_id
      ),
      policy_completion AS (
        SELECT du.department_id,
               -- ratio of users in the dept with at least one COMPLETED progress row
               (
                 COUNT(DISTINCT CASE WHEN up.status = 'COMPLETED' THEN du.user_id END)::float /
                 NULLIF(COUNT(DISTINCT du.user_id), 0)::float
               ) AS pct
        FROM dept_users du
        LEFT JOIN user_progress up ON up."userId" = du.user_id
        GROUP BY du.department_id
      )
      SELECT
        d.department_id,
        COALESCE(cr.dau, 0)::bigint AS coach_dau_30,
        COALESCE(sr.triggers, 0)::bigint AS sensitive_triggers,
        COALESCE(sp.triggers, 0)::bigint AS sensitive_triggers_prior,
        COALESCE(pc.pct, 0)::float AS policy_completion_pct
      FROM (
        SELECT DISTINCT department_id FROM dept_users
      ) d
      LEFT JOIN coach_recent      cr ON cr.department_id IS NOT DISTINCT FROM d.department_id
      LEFT JOIN sensitive_recent  sr ON sr.department_id IS NOT DISTINCT FROM d.department_id
      LEFT JOIN sensitive_prior   sp ON sp.department_id IS NOT DISTINCT FROM d.department_id
      LEFT JOIN policy_completion pc ON pc.department_id IS NOT DISTINCT FROM d.department_id
    `;

    const statsByDept = new Map<string | null, DeptStatsRow>(
      stats.map((s) => [s.department_id, s]),
    );

    // Total interactions for risk denominator: count of coach sessions in the
    // dept window. We compute this from coach_dau_30 as a *proxy* (DAU*30 sets
    // an upper bound), but for accuracy we re-issue a fast groupBy on userId.
    const interactionsByUser = await this.prisma.aiCoachSession.groupBy({
      by: ['userId'],
      where: { organizationId: orgId, createdAt: { gte: since } },
      _count: { id: true },
    });
    const usersByDept = await this.prisma.user.findMany({
      where: { organizationId: orgId, deactivatedAt: null },
      select: { id: true, departmentId: true },
    });
    const userToDept = new Map<string, string | null>(
      usersByDept.map((u) => [u.id, u.departmentId]),
    );
    const interactionsByDept = new Map<string | null, number>();
    for (const row of interactionsByUser) {
      const d = userToDept.get(row.userId) ?? null;
      interactionsByDept.set(d, (interactionsByDept.get(d) ?? 0) + row._count.id);
    }

    const rows: DeptRiskRow[] = allDepts
      .map((dept) => {
        const headcount = headcountByDept.get(dept.id) ?? 0;
        if (headcount === 0) return null;

        const stat = statsByDept.get(dept.id);
        const triggers = stat ? Number(stat.sensitive_triggers) : 0;
        const triggersPrior = stat ? Number(stat.sensitive_triggers_prior) : 0;
        const coachDau30 = stat ? Number(stat.coach_dau_30) : 0;
        const policyCompletionPct = stat
          ? Math.max(0, Math.min(1, Number(stat.policy_completion_pct)))
          : 0;
        const interactions = interactionsByDept.get(dept.id) ?? 0;
        const score = computeRiskScore({
          triggers,
          interactions,
          policyCompletion: policyCompletionPct,
          headcount,
        });
        const trend: 'up' | 'down' | 'flat' =
          triggers > triggersPrior ? 'up' : triggers < triggersPrior ? 'down' : 'flat';

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          headcount,
          coachDau30,
          sensitiveTriggers: triggers,
          policyCompletionPct: Math.round(policyCompletionPct * 100),
          riskScore: Math.round(score),
          trend,
        };
      })
      .filter((r): r is DeptRiskRow => r !== null)
      .sort((a, b) => b.riskScore - a.riskScore);

    return { rows, windowDays };
  }

  // -------------------------------------------------------------------------
  // III. TRIGGER FEED (redacted)
  // -------------------------------------------------------------------------

  async getTriggerFeed(
    user: SessionPayload,
    query: TriggerFeedQueryDto,
  ): Promise<TriggerFeedResponse> {
    const orgId = user.organizationId;

    // Pull the most recent N sensitive-data audit events with the actor (so we
    // can resolve dept name and "trained?" status), then strip identifying info
    // before returning.
    const auditRows = await this.prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        action: 'coach.sensitive_data_detected',
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      include: {
        actor: {
          select: {
            id: true,
            departmentId: true,
            department: { select: { id: true, name: true } },
            progress: {
              where: { status: 'COMPLETED' },
              select: { lessonId: true },
              take: 1,
            },
          },
        },
      },
    });

    // Resolve a single "first published path lesson" we can suggest as remediation.
    // We pick whatever published path the org has — for the demo seed this is
    // sufficient; for a real install the operator can wire policy → path mapping.
    const remediationLesson = await this.prisma.lesson.findFirst({
      where: {
        learningPath: {
          isPublished: true,
          OR: [{ organizationId: orgId }, { organizationId: null }],
        },
      },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, title: true, learningPathId: true },
    });

    const items: TriggerFeedItem[] = auditRows.map((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const rawPrompt = typeof meta['inputText'] === 'string' ? meta['inputText'] : '';
      const promptPreview = rawPrompt.slice(0, 60) + (rawPrompt.length > 60 ? '[...]' : '');
      const category = readMetaCategory(meta);
      const policySection =
        typeof meta['policySection'] === 'string' ? (meta['policySection'] as string) : null;

      return {
        id: row.id,
        occurredAt: row.createdAt.toISOString(),
        userMask: row.actorId ? `USER_${row.actorId.slice(-6).toUpperCase()}` : 'USER_UNKNOWN',
        departmentName: row.actor?.department?.name ?? null,
        category,
        trained: (row.actor?.progress?.length ?? 0) > 0,
        promptPreview,
        policySection,
        suggestedLesson: remediationLesson
          ? {
              lessonId: remediationLesson.id,
              lessonTitle: remediationLesson.title,
              pathId: remediationLesson.learningPathId,
            }
          : null,
      };
    });

    // Audit the read (best-effort — never blocks the response).
    void this.prisma.auditLog
      .create({
        data: {
          organizationId: orgId,
          actorId: user.userId,
          action: 'governance.feed_viewed',
          targetType: null,
          targetId: null,
          metadata: { limit: query.limit, returned: items.length },
        },
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`governance.feed_viewed audit write failed: ${message}`);
      });

    return { items };
  }

  // -------------------------------------------------------------------------
  // IV. EVIDENCE EXPORT — kick a worker job
  // -------------------------------------------------------------------------

  async generateReport(
    user: SessionPayload,
    body: GenerateReportDto,
  ): Promise<ReportRequestResponse> {
    const requestId = randomUUID();
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - body.windowDays * DAY_MS);

    await enqueueGovernanceReport({
      requestId,
      organizationId: user.organizationId,
      actorId: user.userId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      periodLabel: body.periodLabel,
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'governance.report_requested',
        targetType: 'GovernanceReport',
        targetId: requestId,
        metadata: {
          requestId,
          windowDays: body.windowDays,
          periodLabel: body.periodLabel ?? null,
        },
      },
    });

    return { requestId };
  }

  async getReportStatus(user: SessionPayload, requestId: string): Promise<ReportStatusResponse> {
    const queue = getQueue('governance-report');
    const job = await queue.getJob(requestId);
    if (!job) {
      return {
        requestId,
        status: 'failed',
        signedUrl: null,
        error: 'Report request not found (it may have expired).',
        createdAt: null,
        completedAt: null,
      };
    }

    // Authz: refuse to leak job metadata across orgs.
    if (job.data?.organizationId !== user.organizationId) {
      return {
        requestId,
        status: 'failed',
        signedUrl: null,
        error: 'Report request not found.',
        createdAt: null,
        completedAt: null,
      };
    }

    const state = await job.getState();
    const createdAt = job.timestamp ? new Date(job.timestamp).toISOString() : null;
    const completedAt = job.finishedOn ? new Date(job.finishedOn).toISOString() : null;

    if (state === 'completed' && job.returnvalue) {
      // Re-mint a fresh signed URL so the dashboard's link is always valid.
      let signedUrl = job.returnvalue.signedUrl;
      try {
        signedUrl = await getGovernanceReportSignedUrl(job.returnvalue.storagePath);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`re-signing governance report URL failed: ${message}`);
      }
      return {
        requestId,
        status: 'ready',
        signedUrl,
        error: null,
        createdAt,
        completedAt,
      };
    }
    if (state === 'failed') {
      return {
        requestId,
        status: 'failed',
        signedUrl: null,
        error: job.failedReason ?? 'Job failed',
        createdAt,
        completedAt,
      };
    }
    if (state === 'active') {
      return {
        requestId,
        status: 'generating',
        signedUrl: null,
        error: null,
        createdAt,
        completedAt: null,
      };
    }
    return {
      requestId,
      status: 'queued',
      signedUrl: null,
      error: null,
      createdAt,
      completedAt: null,
    };
  }

  // -------------------------------------------------------------------------
  // VI. POLICY COVERAGE MAP
  // -------------------------------------------------------------------------

  async getPolicyCoverage(user: SessionPayload): Promise<PolicyCoverageResponse> {
    const orgId = user.organizationId;

    // Sections come from the most recent CompanyPolicy.approvedTools field —
    // we treat each approved tool / category as a "section" the org cares about.
    const policy = await this.prisma.companyPolicy.findFirst({
      where: { organizationId: orgId },
      orderBy: { version: 'desc' },
      select: { approvedTools: true },
    });

    let sections: string[] = [];
    if (policy && Array.isArray(policy.approvedTools)) {
      // Each entry is a JSON object — pick a sensible label.
      sections = (policy.approvedTools as unknown[])
        .map((entry) => readToolLabel(entry))
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
        .slice(0, 8);
    }
    if (sections.length === 0) {
      // Fallback: distinct lesson titles in published paths — gives the matrix
      // a meaningful column set even before a policy is uploaded.
      const lessons = await this.prisma.lesson.findMany({
        where: {
          learningPath: {
            isPublished: true,
            OR: [{ organizationId: orgId }, { organizationId: null }],
          },
        },
        select: { title: true },
        orderBy: { orderIndex: 'asc' },
        take: 6,
      });
      sections = lessons.map((l) => l.title);
    }

    const departments = await this.prisma.department.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    interface CompletionRow {
      department_id: string | null;
      lesson_title: string;
      pct: number;
    }
    // Cells: per (dept, section) compute the proportion of dept users who
    // completed any lesson whose title contains the section label (case-insensitive).
    // Substring match is intentional — it lets a "ChatGPT" policy section pick up
    // a "Using ChatGPT safely" lesson without a manual mapping table.
    const cells: PolicyCoverageCell[] = [];
    for (const section of sections) {
      const rows = await this.prisma.$queryRaw<CompletionRow[]>`
        WITH dept_users AS (
          SELECT u.id AS user_id, u."departmentId" AS department_id
          FROM users u
          WHERE u."organizationId" = ${orgId} AND u."deactivatedAt" IS NULL
        ),
        matched_lessons AS (
          SELECT l.id
          FROM lessons l
          JOIN learning_paths lp ON lp.id = l."learningPathId"
          WHERE (lp."organizationId" = ${orgId} OR lp."organizationId" IS NULL)
            AND lp."isPublished" = true
            AND lower(l.title) LIKE ${'%' + section.toLowerCase() + '%'}
        )
        SELECT
          du.department_id,
          ${section} AS lesson_title,
          (
            COUNT(DISTINCT CASE WHEN up.status = 'COMPLETED' THEN du.user_id END)::float /
            NULLIF(COUNT(DISTINCT du.user_id), 0)::float
          ) AS pct
        FROM dept_users du
        LEFT JOIN user_progress up ON up."userId" = du.user_id AND up."lessonId" IN (SELECT id FROM matched_lessons)
        GROUP BY du.department_id
      `;

      for (const dept of [
        ...departments,
        { id: null, name: '(Unassigned)' } as DeptRow | { id: null; name: string },
      ]) {
        const row = rows.find((r) => r.department_id === dept.id);
        const pct = row ? Math.max(0, Math.min(1, Number(row.pct))) : 0;
        cells.push({
          departmentId: dept.id,
          departmentName: dept.name,
          policySection: section,
          completionPct: Math.round(pct * 100),
        });
      }
    }

    return { sections, cells };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RiskInputs {
  triggers: number;
  interactions: number;
  policyCompletion: number; // 0..1
  headcount: number;
}

function computeRiskScore({
  triggers,
  interactions,
  policyCompletion,
  headcount,
}: RiskInputs): number {
  if (triggers === 0) return 0;
  const triggerRate = triggers / Math.max(interactions, 1);
  const inverseCompletion = 1 - policyCompletion;
  const sizeWeight = Math.log10(headcount + 10);
  const raw = triggerRate * inverseCompletion * sizeWeight;
  // The raw value is bounded by triggerRate (≤1), inverseCompletion (≤1), and
  // sizeWeight (~3 for a 1000-person team). Multiplying by 100 brings the most
  // common range into 0..100; we clamp to keep the surface honest.
  return Math.max(0, Math.min(100, raw * 100));
}

function readMetaCategory(meta: Record<string, unknown>): string {
  if (typeof meta['category'] === 'string') return meta['category'].toUpperCase();
  if (Array.isArray(meta['categories']) && typeof meta['categories'][0] === 'string') {
    return (meta['categories'][0] as string).toUpperCase();
  }
  return 'GENERAL';
}

function readToolLabel(entry: unknown): string | null {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') {
    const obj = entry as Record<string, unknown>;
    for (const key of ['name', 'title', 'tool', 'label']) {
      const value = obj[key];
      if (typeof value === 'string') return value;
    }
  }
  return null;
}

// Re-export Prisma for query template consumers; left here to satisfy the
// import linter without dragging the symbol into the public service surface.
export const _Prisma = Prisma;
