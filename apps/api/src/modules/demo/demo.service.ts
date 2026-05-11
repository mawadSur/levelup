/**
 * DemoService — demo data reset (CR.20)
 *
 * POST /demo/reset — wipes and reseeds an org-scoped demo snapshot.
 *
 * Security constraints (all enforced here as well as in the controller):
 *   1. DEMO_RESET_ENABLED env var must be 'true'.
 *   2. The calling admin's org must either:
 *      a) have a name starting with "[Demo]" or containing "Demo", OR
 *      b) appear in DEMO_ORG_ALLOWLIST (comma-separated org IDs).
 *
 * The reset is STRICTLY org-scoped — no other org's rows are touched.
 * The wipe + reseed runs inside a single Prisma interactive transaction so
 * partial failures cannot leave the org half-wiped.
 */

import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma';
import type { SessionPayload } from '@levelup/auth-client';
import { AiLevel, Role, AssessmentType, XpEventKind } from '@levelup/db';
import type { DemoResetInput, DemoResetResponse } from '@levelup/types';

// ---------------------------------------------------------------------------
// Mulberry32 — seedable PRNG so each call is internally consistent.
// Keyed on companyName + Date.now() at call time.
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convert a string key to a 32-bit seed integer. */
function strToSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/** Pick a random integer in [min, max]. */
function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick a random element from an array. */
function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

// ---------------------------------------------------------------------------
// Persona name list
// ---------------------------------------------------------------------------
const PERSONA_NAMES = [
  'Alex Chen',
  'Maya Patel',
  'Sam Rivera',
  'Riley Park',
  'Jordan Lee',
  'Drew Suzuki',
  'Cameron Reyes',
  'Avery Kim',
  'Morgan Tran',
  'Quinn Okafor',
  'Blake Nakamura',
  'Casey Santos',
  'Skyler Osei',
  'Devon Ito',
  'Rowan Diaz',
  'Sage Williams',
] as const;

const DEPT_NAMES_DEFAULT = ['Sales', 'Marketing', 'Customer Support', 'Engineering'] as const;

// Industry-tailored department overrides
const INDUSTRY_DEPTS: Record<string, readonly [string, string, string, string]> = {
  healthcare: ['Clinical Operations', 'Patient Services', 'Billing & Compliance', 'Technology'],
  finance: ['Advisory', 'Risk & Compliance', 'Operations', 'Technology'],
  retail: ['Merchandising', 'Customer Experience', 'Supply Chain', 'Technology'],
  legal: ['Litigation', 'Corporate', 'Compliance', 'Operations'],
};

function deptNamesFor(industry?: string): readonly [string, string, string, string] {
  if (!industry) return DEPT_NAMES_DEFAULT;
  const key = industry.toLowerCase();
  for (const [k, v] of Object.entries(INDUSTRY_DEPTS)) {
    if (key.includes(k)) return v;
  }
  return DEPT_NAMES_DEFAULT;
}

/** Derive a clean domain stub from a company name. */
function companyDomain(companyName: string): string {
  return (
    companyName
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '') + '.demo'
  );
}

/** Map 0-100 score to AiLevel. */
function scoreToLevel(score: number): AiLevel {
  if (score >= 80) return AiLevel.CHAMPION;
  if (score >= 60) return AiLevel.POWER_USER;
  if (score >= 40) return AiLevel.PRACTITIONER;
  return AiLevel.BEGINNER;
}

/** Seed-size multiplier table. */
const SEED_CONFIG = {
  small: { userCount: 4, pathCompletions: 1, xpEventsPerUser: 5 },
  medium: { userCount: 8, pathCompletions: 2, xpEventsPerUser: 15 },
  large: { userCount: 16, pathCompletions: 4, xpEventsPerUser: 30 },
} as const;

// ---------------------------------------------------------------------------
// Sample prompt library entries
// ---------------------------------------------------------------------------
const SAMPLE_PROMPTS = [
  {
    title: 'Weekly status summariser',
    promptText:
      'You are a clear, concise executive assistant. Summarise the following status updates into three bullet points: accomplishments, blockers, next steps.\n\nUpdates:\n{{updates}}',
    category: 'Productivity',
  },
  {
    title: 'Job description writer',
    promptText:
      'Write a compelling job description for the role of {{jobTitle}} at a {{industry}} company. Include responsibilities, requirements, and a short company blurb. Tone: professional but friendly.',
    category: 'HR',
  },
  {
    title: 'Customer email responder',
    promptText:
      'You are a friendly customer support agent. Reply to the following customer email in under 150 words, acknowledge their frustration, and provide a clear next step.\n\nEmail:\n{{email}}',
    category: 'Customer Support',
  },
  {
    title: 'Meeting notes formatter',
    promptText:
      'Format the following raw meeting transcript into: (1) Key Decisions, (2) Action Items with owner and due date, (3) Open Questions.\n\nTranscript:\n{{transcript}}',
    category: 'Productivity',
  },
  {
    title: 'Risk assessment helper',
    promptText:
      'You are a risk analyst. Given the following proposal, identify top-3 risks, their likelihood (High/Medium/Low), impact (High/Medium/Low), and a one-line mitigation for each.\n\nProposal:\n{{proposal}}',
    category: 'Strategy',
  },
] as const;

// Typical audit actions for generated history
const AUDIT_ACTIONS = [
  'user.login',
  'lesson.completed',
  'path.assigned',
  'quiz.passed',
  'assessment.submitted',
  'prompt.created',
] as const;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class DemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // --------------------------------------------------------------------------
  // Public entry-point
  // --------------------------------------------------------------------------

  async resetDemo(actor: SessionPayload, input: DemoResetInput): Promise<DemoResetResponse> {
    const t0 = Date.now();

    this.assertDemoEnabled();
    await this.assertDemoOrg(actor.organizationId);

    const { companyName, industry, seedSize } = input;
    const cfg = SEED_CONFIG[seedSize];
    const rng = mulberry32(strToSeed(companyName + String(Date.now())));
    const domain = companyDomain(companyName);

    // -------------------------------------------------------------------------
    // Single interactive transaction: wipe → reseed
    // -------------------------------------------------------------------------
    const result = await this.prisma.$transaction(async (tx) => {
      // -----------------------------------------------------------------------
      // 1. Collect users in this org (excluding the calling admin)
      // -----------------------------------------------------------------------
      const existingUsers = await tx.user.findMany({
        where: { organizationId: actor.organizationId },
        select: { id: true },
      });
      const nonAdminUserIds = existingUsers.map((u) => u.id).filter((id) => id !== actor.userId);

      // -----------------------------------------------------------------------
      // 2. Wipe all org-scoped activity data
      // -----------------------------------------------------------------------

      // User-level tables (scoped via userId IN nonAdminUserIds union adminUser)
      const allOrgUserIds = existingUsers.map((u) => u.id);

      await tx.userProgress.deleteMany({ where: { userId: { in: allOrgUserIds } } });
      await tx.quizAttempt.deleteMany({ where: { userId: { in: allOrgUserIds } } });
      await tx.certificate.deleteMany({ where: { userId: { in: allOrgUserIds } } });
      await tx.badge.deleteMany({ where: { userId: { in: allOrgUserIds } } });
      await tx.assessment.deleteMany({ where: { organizationId: actor.organizationId } });
      await tx.prompt.deleteMany({ where: { organizationId: actor.organizationId } });
      await tx.xpEvent.deleteMany({ where: { organizationId: actor.organizationId } });
      await tx.dailyQuest.deleteMany({ where: { organizationId: actor.organizationId } });
      await tx.userGameState.deleteMany({ where: { userId: { in: allOrgUserIds } } });
      await tx.aiCoachSession.deleteMany({ where: { organizationId: actor.organizationId } });
      // ConversationTurns cascade from Conversations
      await tx.conversation.deleteMany({ where: { organizationId: actor.organizationId } });
      // Org-specific paths only (NOT global paths where organizationId IS NULL)
      await tx.learningPathAssignment.deleteMany({
        where: { user: { organizationId: actor.organizationId } },
      });
      await tx.learningPath.deleteMany({
        where: {
          organizationId: actor.organizationId,
          // Extra safety: never touch null-org (global) paths
        },
      });
      await tx.department.deleteMany({ where: { organizationId: actor.organizationId } });
      await tx.invitation.deleteMany({ where: { organizationId: actor.organizationId } });
      await tx.companyPolicy.deleteMany({ where: { organizationId: actor.organizationId } });
      await tx.auditLog.deleteMany({ where: { organizationId: actor.organizationId } });

      // -----------------------------------------------------------------------
      // 3. Delete non-admin users (admin session is preserved)
      // -----------------------------------------------------------------------
      if (nonAdminUserIds.length > 0) {
        await tx.user.deleteMany({ where: { id: { in: nonAdminUserIds } } });
      }

      // -----------------------------------------------------------------------
      // 4. Reset org metadata
      // -----------------------------------------------------------------------
      await tx.organization.update({
        where: { id: actor.organizationId },
        data: {
          name: companyName,
          ...(industry !== undefined ? { industry } : {}),
        },
      });

      // -----------------------------------------------------------------------
      // 5. Create departments
      // -----------------------------------------------------------------------
      const deptNames = deptNamesFor(industry);
      const departments = await Promise.all(
        deptNames.map((name) =>
          tx.department.create({
            data: { organizationId: actor.organizationId, name },
          }),
        ),
      );

      // -----------------------------------------------------------------------
      // 6. Create users
      // -----------------------------------------------------------------------
      // We need at least 4 names for the managers; total cfg.userCount.
      const namePool = [...PERSONA_NAMES];
      // Remove name collision with calling admin by email later; shuffle pool.
      for (let i = namePool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [namePool[i], namePool[j]] = [namePool[j]!, namePool[i]!];
      }

      const roles: Role[] = [
        // 1 manager per dept (4 total)
        Role.MANAGER,
        Role.MANAGER,
        Role.MANAGER,
        Role.MANAGER,
      ];
      // Fill remaining slots with EMPLOYEE
      while (roles.length < cfg.userCount - 1) {
        roles.push(Role.EMPLOYEE);
      }

      const levels: AiLevel[] = [
        AiLevel.PRACTITIONER,
        AiLevel.POWER_USER,
        AiLevel.BEGINNER,
        AiLevel.PRACTITIONER,
      ];
      while (levels.length < cfg.userCount - 1) {
        levels.push(pick(rng, [AiLevel.BEGINNER, AiLevel.PRACTITIONER, AiLevel.POWER_USER]));
      }

      const createdUsers: { id: string; name: string }[] = [];
      for (let i = 0; i < cfg.userCount - 1; i++) {
        const name = namePool[i] ?? `User ${i + 1}`;
        const firstName = name.split(' ')[0]!.toLowerCase();
        const email = `${firstName}@${domain}`;
        const dept = departments[i % departments.length]!;
        const role = roles[i] ?? Role.EMPLOYEE;
        const aiLevel = levels[i] ?? AiLevel.BEGINNER;

        const user = await tx.user.create({
          data: {
            organizationId: actor.organizationId,
            email,
            name,
            role,
            aiLevel,
            departmentId: dept.id,
            jobTitle: role === Role.MANAGER ? `${dept.name} Manager` : `${dept.name} Specialist`,
          },
        });
        createdUsers.push({ id: user.id, name: user.name });
      }

      // -----------------------------------------------------------------------
      // 7. Fetch global learning paths to assign
      // -----------------------------------------------------------------------
      const globalPaths = await tx.learningPath.findMany({
        where: { organizationId: null, isPublished: true },
        include: { lessons: { select: { id: true } } },
        take: 6,
      });

      // -----------------------------------------------------------------------
      // 8. Assign paths and create progress
      // -----------------------------------------------------------------------
      let totalLessonsCompleted = 0;

      for (const user of createdUsers) {
        // Assign 2 paths per user (or as many as available)
        const assignedPaths = globalPaths.slice(0, Math.min(2, globalPaths.length));

        for (const path of assignedPaths) {
          await tx.learningPathAssignment.create({
            data: {
              learningPathId: path.id,
              userId: user.id,
              assignedById: actor.userId,
            },
          });

          // Random 0-80% completion
          const completionPct = rng() * 0.8;
          const lessonCount = path.lessons.length;
          const completedCount = Math.floor(completionPct * lessonCount);

          for (let li = 0; li < completedCount; li++) {
            const lesson = path.lessons[li];
            if (!lesson) continue;
            await tx.userProgress.create({
              data: {
                userId: user.id,
                lessonId: lesson.id,
                status: 'COMPLETED',
                score: randInt(rng, 60, 100),
                completedAt: new Date(Date.now() - randInt(rng, 0, 13) * 86_400_000),
              },
            });
            totalLessonsCompleted++;
          }
        }
      }

      // -----------------------------------------------------------------------
      // 9. XP events
      // -----------------------------------------------------------------------
      const xpKinds = [
        XpEventKind.LESSON_COMPLETED,
        XpEventKind.QUIZ_PASSED_FIRST_TRY,
        XpEventKind.COACH_PROMPT_FIXED,
        XpEventKind.DAILY_QUEST,
      ] as const;

      for (const user of createdUsers) {
        const eventCount = randInt(rng, 0, cfg.xpEventsPerUser);
        for (let e = 0; e < eventCount; e++) {
          const kind = pick(rng, xpKinds);
          const daysAgo = randInt(rng, 0, 13);
          const createdAt = new Date(Date.now() - daysAgo * 86_400_000);
          const xp = randInt(rng, 10, 50);
          // sourceId must be unique per (userId, kind, sourceId) — use a counter
          const sourceId = `demo-${e}-${user.id.slice(-6)}`;

          await tx.xpEvent.create({
            data: {
              userId: user.id,
              organizationId: actor.organizationId,
              kind,
              xp,
              sourceType: 'demo',
              sourceId,
              createdAt,
            },
          });

          // Keep game state in sync (upsert)
          await tx.userGameState.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              xp,
              level: 1,
              weeklyXp: xp,
              weeklyXpResetAt: new Date(),
              currentStreak: randInt(rng, 0, 7),
              longestStreak: randInt(rng, 0, 14),
            },
            update: {
              xp: { increment: xp },
              weeklyXp: { increment: xp },
            },
          });
        }
      }

      // -----------------------------------------------------------------------
      // 10. Sample prompts (org-shared)
      // -----------------------------------------------------------------------
      for (const p of SAMPLE_PROMPTS) {
        await tx.prompt.create({
          data: {
            organizationId: actor.organizationId,
            userId: actor.userId,
            title: p.title,
            promptText: p.promptText,
            category: p.category,
            isShared: true,
          },
        });
      }

      // -----------------------------------------------------------------------
      // 11. Baseline assessments
      // -----------------------------------------------------------------------
      for (const user of createdUsers) {
        const score = randInt(rng, 20, 95);
        await tx.assessment.create({
          data: {
            organizationId: actor.organizationId,
            userId: user.id,
            type: AssessmentType.BASELINE,
            score,
            recommendedLevel: scoreToLevel(score),
            itemResponses: [],
            createdAt: new Date(Date.now() - randInt(rng, 7, 14) * 86_400_000),
          },
        });
      }

      // -----------------------------------------------------------------------
      // 12. Certificates for path-completed users
      // -----------------------------------------------------------------------
      let certCount = 0;
      for (const user of createdUsers.slice(0, cfg.pathCompletions)) {
        const path = globalPaths[0];
        if (!path) continue;
        const alreadyCert = await tx.certificate.findUnique({
          where: { userId_learningPathId: { userId: user.id, learningPathId: path.id } },
        });
        if (!alreadyCert) {
          await tx.certificate.create({
            data: {
              userId: user.id,
              learningPathId: path.id,
              signedHash: `demo-${user.id.slice(-8)}-${path.id.slice(-8)}`,
              issuedAt: new Date(Date.now() - randInt(rng, 0, 7) * 86_400_000),
            },
          });
          certCount++;
        }
      }

      // -----------------------------------------------------------------------
      // 13. Historical audit log (6 entries over last 14 days)
      // -----------------------------------------------------------------------
      for (let a = 0; a < 6; a++) {
        const action = pick(rng, AUDIT_ACTIONS);
        const targetUser = pick(rng, createdUsers);
        const daysAgo = randInt(rng, 0, 13);
        await tx.auditLog.create({
          data: {
            organizationId: actor.organizationId,
            actorId: actor.userId,
            action,
            targetType: 'User',
            targetId: targetUser.id,
            metadata: { context: 'demo.seed', daysAgo },
            createdAt: new Date(Date.now() - daysAgo * 86_400_000),
          },
        });
      }

      // -----------------------------------------------------------------------
      // 14. Final audit log entry for the reset itself
      // -----------------------------------------------------------------------
      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorId: actor.userId,
          action: 'demo.reset',
          targetType: 'Organization',
          targetId: actor.organizationId,
          metadata: {
            companyName,
            seedSize,
            usersCreated: createdUsers.length,
            lessonsCompleted: totalLessonsCompleted,
            certificates: certCount,
          },
        },
      });

      return {
        usersCreated: createdUsers.length,
        lessonsCompleted: totalLessonsCompleted,
      };
    });

    return {
      ok: true,
      companyName,
      seedSize,
      usersCreated: result.usersCreated,
      lessonsCompleted: result.lessonsCompleted,
      durationMs: Date.now() - t0,
    };
  }

  // --------------------------------------------------------------------------
  // Guards
  // --------------------------------------------------------------------------

  private assertDemoEnabled(): void {
    const enabled = this.config.get<string>('DEMO_RESET_ENABLED');
    if (enabled !== 'true') {
      throw new ServiceUnavailableException(
        'Demo reset is not enabled on this environment (DEMO_RESET_ENABLED)',
      );
    }
  }

  private async assertDemoOrg(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (!org) {
      throw new ForbiddenException('Organization not found');
    }

    // Allow orgs whose name starts with "[Demo]" or contains "Demo"
    const nameOk = org.name.includes('[Demo]') || org.name.includes('Demo');

    // Allow orgs explicitly in the allowlist
    const allowlistRaw = this.config.get<string>('DEMO_ORG_ALLOWLIST') ?? '';
    const allowlist = allowlistRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const allowlistOk = allowlist.includes(organizationId);

    if (!nameOk && !allowlistOk) {
      throw new ForbiddenException(
        'This organization is not eligible for a demo reset. ' +
          'Org name must contain "[Demo]" or "Demo", or the org ID must appear in DEMO_ORG_ALLOWLIST.',
      );
    }
  }
}
