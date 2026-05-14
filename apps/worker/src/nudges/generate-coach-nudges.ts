/**
 * generate-coach-nudges job handler — Expansion #2 Proactive Coach.
 *
 * Runs daily at 06:00 UTC. For every user with at least one AiCoachSession in
 * the last 14 days, computes four signals and writes 0..N `CoachNudge` rows.
 *
 * Signals (in priority order — REPEATED_SENSITIVE_PASTE is the headline one):
 *   1. REPEATED_SENSITIVE_PASTE  — >= 2 sensitive-data triggers in 14d
 *   2. PROMPT_PATTERN_STUCK      — same opening reused 5+ times in 14d
 *   3. UNTOUCHED_SKILL_AFTER_LESSON — exposure > 0.5 but practice = 0
 *   4. STREAK_AT_RISK            — currentStreak >= 3 and lastActive yesterday
 *
 * Idempotency: same (userId, kind) within 24h is a no-op.
 * Per-user cap: COACH_NUDGE_VISIBLE_CAP=3 — when a fresh insert would push us
 * over, the oldest active nudge for that user is auto-dismissed.
 *
 * Template generation: uses @levelup/llm when OPENAI_API_KEY is configured;
 * otherwise falls back to deterministic stub templates so the handler runs
 * cleanly in stub mode.
 */

import type { Job } from 'bullmq';
import type { GenerateCoachNudgesInput, GenerateCoachNudgesOutput } from '@levelup/queue';
import { prisma } from '@levelup/db';
import type { CoachNudgeKind, Prisma } from '@levelup/db';
import { chatComplete, isStubMode } from '@levelup/llm';
import { track } from '@levelup/analytics';
import { COACH_NUDGE_VISIBLE_CAP } from '@levelup/types';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 14-day rolling window — most signals look back this far. */
const ACTIVE_WINDOW_DAYS = 14;
const ACTIVE_WINDOW_MS = ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Idempotency window for "don't generate the same kind for the same user". */
const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Cap on how many users to process in one run (memory ceiling). */
const MAX_USERS_PER_RUN = 5000;

// Signal thresholds
const SENSITIVE_PASTE_THRESHOLD = 2;
const PATTERN_STUCK_THRESHOLD = 5;
const PATTERN_STUCK_OPENING_TOKENS = 6;
const SKILL_EXPOSURE_FLOOR = 0.5;
const STREAK_AT_RISK_MIN = 3;

// LLM call envelope — kept small because we run this for many users at once.
const LLM_MAX_TOKENS = 220;
const LLM_TEMPERATURE = 0.4;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NudgeCandidate {
  userId: string;
  organizationId: string;
  kind: CoachNudgeKind;
  body: string;
  suggestedTemplate: string | null;
}

interface UserSignals {
  userId: string;
  organizationId: string;
  sensitiveSamples: string[];
  recentOpenings: string[];
  hasUserSkillTable: boolean;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function handleGenerateCoachNudges(
  job: Job<GenerateCoachNudgesInput>,
): Promise<GenerateCoachNudgesOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const triggeredAt = job.data.triggeredAt ?? new Date().toISOString();
  log.info('generate-coach-nudges: starting', { triggeredAt });

  const start = Date.now();
  const windowStart = new Date(Date.now() - ACTIVE_WINDOW_MS);

  // 1. Active users — anyone with a coach session in the last 14 days.
  const activeRows = await prisma.aiCoachSession.findMany({
    where: { createdAt: { gte: windowStart } },
    select: { userId: true, organizationId: true },
    distinct: ['userId'],
    take: MAX_USERS_PER_RUN,
  });

  log.info('generate-coach-nudges: active users loaded', { count: activeRows.length });

  if (activeRows.length === 0) {
    return { usersScanned: 0, nudgesCreated: 0 };
  }

  // 2. Build a dedup map of (userId, kind) → latest generatedAt within the
  //    idempotency window so we can skip same-kind submissions.
  const idempWindowStart = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);
  const recentNudges = await prisma.coachNudge.findMany({
    where: {
      userId: { in: activeRows.map((r) => r.userId) },
      generatedAt: { gte: idempWindowStart },
    },
    select: { userId: true, kind: true },
  });
  const recentlySeen = new Set<string>(recentNudges.map((r) => `${r.userId}::${r.kind}`));

  // 3. Process each user. A failure on one user must not abort the whole run.
  let nudgesCreated = 0;
  for (const row of activeRows) {
    try {
      const created = await processUser(row.userId, row.organizationId, recentlySeen, log);
      nudgesCreated += created;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('generate-coach-nudges: per-user error', {
        userId: row.userId,
        error: message,
      });
    }
  }

  const durationMs = Date.now() - start;
  log.info('generate-coach-nudges: completed', {
    usersScanned: activeRows.length,
    nudgesCreated,
    durationMs,
  });

  return { usersScanned: activeRows.length, nudgesCreated };
}

// ---------------------------------------------------------------------------
// Per-user pipeline
// ---------------------------------------------------------------------------

async function processUser(
  userId: string,
  organizationId: string,
  recentlySeen: Set<string>,
  log: ReturnType<typeof logger.withJobId>,
): Promise<number> {
  const signals = await loadSignalsForUser(userId, organizationId);
  const candidates: NudgeCandidate[] = [];

  // --- REPEATED_SENSITIVE_PASTE (priority signal) -------------------------
  if (signals.sensitiveSamples.length >= SENSITIVE_PASTE_THRESHOLD) {
    const template = await safeSuggestTemplate(
      'redact-customer-data',
      signals.sensitiveSamples,
      log,
    );
    candidates.push({
      userId,
      organizationId,
      kind: 'REPEATED_SENSITIVE_PASTE',
      body: makeRepeatedSensitivePasteBody(signals.sensitiveSamples.length),
      suggestedTemplate: template,
    });
  }

  // --- PROMPT_PATTERN_STUCK -----------------------------------------------
  const stuck = pickStuckOpening(signals.recentOpenings);
  if (stuck) {
    const template = await safeSuggestTemplate('vary-prompt-shape', [stuck.opening], log);
    candidates.push({
      userId,
      organizationId,
      kind: 'PROMPT_PATTERN_STUCK',
      body: makePromptPatternStuckBody(stuck.opening, stuck.count),
      suggestedTemplate: template,
    });
  }

  // --- UNTOUCHED_SKILL_AFTER_LESSON ---------------------------------------
  // Optional: requires UserSkill rows from expansion #1. We try the query;
  // if the table is missing or empty for this user we simply skip the signal.
  try {
    const untouched = await findUntouchedSkill(userId);
    if (untouched) {
      candidates.push({
        userId,
        organizationId,
        kind: 'UNTOUCHED_SKILL_AFTER_LESSON',
        body: `You learned about ${untouched.skillName} in a recent lesson but haven't tried the lab yet — practice locks the skill in.`,
        suggestedTemplate: null,
      });
    }
  } catch (err) {
    // UserSkill table not present (expansion #1 not migrated yet) — log once
    // at debug-level and continue.
    const message = err instanceof Error ? err.message : String(err);
    log.info('UNTOUCHED_SKILL_AFTER_LESSON: skipped (UserSkill not available)', {
      userId,
      detail: message,
    });
  }

  // --- STREAK_AT_RISK -----------------------------------------------------
  const streakSignal = await loadStreakSignal(userId);
  if (streakSignal) {
    candidates.push({
      userId,
      organizationId,
      kind: 'STREAK_AT_RISK',
      body: `Your ${streakSignal.currentStreak}-day streak is on the line — a single lesson today keeps it alive.`,
      suggestedTemplate: null,
    });
  }

  if (candidates.length === 0) return 0;

  // Filter idempotent duplicates (same kind within 24h).
  const fresh = candidates.filter((c) => !recentlySeen.has(`${c.userId}::${c.kind}`));
  if (fresh.length === 0) return 0;

  // Enforce per-user cap: count current active nudges, and for any overflow
  // auto-dismiss the oldest active rows.
  await trimActiveNudgesIfNeeded(userId, organizationId, fresh.length);

  // Insert fresh rows one at a time so we can fire per-row analytics.
  let created = 0;
  for (const c of fresh) {
    try {
      const row = await prisma.coachNudge.create({
        data: {
          userId: c.userId,
          organizationId: c.organizationId,
          kind: c.kind,
          body: c.body,
          suggestedTemplate: c.suggestedTemplate,
        },
        select: { id: true, kind: true },
      });
      recentlySeen.add(`${c.userId}::${c.kind}`);

      await safeAudit(c.organizationId, c.userId, 'nudge.generated', row.id, {
        kind: row.kind,
        hasTemplate: c.suggestedTemplate !== null,
      });

      track.coachNudgeGenerated({
        organizationId: c.organizationId,
        userId: c.userId,
        nudgeId: row.id,
        kind: row.kind,
        templateProvided: c.suggestedTemplate !== null,
      });
      created += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.warn('generate-coach-nudges: insert failed', {
        userId: c.userId,
        kind: c.kind,
        error: message,
      });
    }
  }

  return created;
}

// ---------------------------------------------------------------------------
// Signal loaders
// ---------------------------------------------------------------------------

async function loadSignalsForUser(userId: string, organizationId: string): Promise<UserSignals> {
  const windowStart = new Date(Date.now() - ACTIVE_WINDOW_MS);

  // Sensitive-data triggers — sourced from the AiCoachSession.sensitiveDataDetected
  // flag (which mirrors the audit event 1:1).
  const sensitiveRows = await prisma.aiCoachSession.findMany({
    where: {
      userId,
      organizationId,
      sensitiveDataDetected: true,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { inputText: true },
  });

  // Recent prompt openings — used for PROMPT_PATTERN_STUCK detection.
  const recentSessions = await prisma.aiCoachSession.findMany({
    where: { userId, organizationId, createdAt: { gte: windowStart } },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { inputText: true },
  });

  return {
    userId,
    organizationId,
    sensitiveSamples: sensitiveRows.map((r) => r.inputText),
    recentOpenings: recentSessions.map((r) => r.inputText),
    hasUserSkillTable: false,
  };
}

async function findUntouchedSkill(
  userId: string,
): Promise<{ skillId: string; skillName: string } | null> {
  // UserSkill is added by expansion #1. We access it through the dynamically
  // typed Prisma model surface so a missing model fails gracefully via the
  // surrounding try/catch.
  const dynamicPrisma = prisma as unknown as {
    userSkill?: {
      findFirst: (args: unknown) => Promise<{
        skillId: string;
        skill: { name: string };
      } | null>;
    };
  };
  if (!dynamicPrisma.userSkill) return null;

  const row = await dynamicPrisma.userSkill.findFirst({
    where: {
      userId,
      exposure: { gt: SKILL_EXPOSURE_FLOOR },
      practice: { equals: 0 },
    },
    orderBy: { updatedAt: 'desc' },
    select: { skillId: true, skill: { select: { name: true } } },
  });
  if (!row) return null;
  return { skillId: row.skillId, skillName: row.skill.name };
}

async function loadStreakSignal(userId: string): Promise<{ currentStreak: number } | null> {
  const state = await prisma.userGameState.findUnique({
    where: { userId },
    select: { currentStreak: true, lastActiveDate: true },
  });
  if (!state) return null;
  if (state.currentStreak < STREAK_AT_RISK_MIN) return null;
  if (!state.lastActiveDate) return null;

  // "Yesterday" = lastActiveDate is between 22 and 30 hours ago. We use a
  // small window rather than a strict calendar-day check so timezone drift
  // doesn't make us miss legitimate at-risk streaks.
  const ageMs = Date.now() - state.lastActiveDate.getTime();
  const hours = ageMs / (60 * 60 * 1000);
  if (hours < 22 || hours > 30) return null;

  return { currentStreak: state.currentStreak };
}

// ---------------------------------------------------------------------------
// Pattern detection
// ---------------------------------------------------------------------------

/**
 * Group recent openings (first N tokens) and pick the most-repeated one if
 * it crossed the threshold. Returns the canonical opening + the repeat count.
 */
function pickStuckOpening(openings: string[]): { opening: string; count: number } | null {
  if (openings.length < PATTERN_STUCK_THRESHOLD) return null;

  const counts = new Map<string, number>();
  for (const raw of openings) {
    const key = normaliseOpening(raw);
    if (key.length === 0) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: { opening: string; count: number } | null = null;
  for (const [opening, count] of counts) {
    if (count >= PATTERN_STUCK_THRESHOLD && (!best || count > best.count)) {
      best = { opening, count };
    }
  }
  return best;
}

function normaliseOpening(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, PATTERN_STUCK_OPENING_TOKENS)
    .join(' ');
}

// ---------------------------------------------------------------------------
// Body templates (deterministic — used for body always; LLM only fills in
// the suggestedTemplate field).
// ---------------------------------------------------------------------------

function makeRepeatedSensitivePasteBody(count: number): string {
  return `${count} times this week you pasted sensitive data into a generic prompt. Try a redaction template instead.`;
}

function makePromptPatternStuckBody(opening: string, count: number): string {
  const preview = opening.length > 40 ? `${opening.slice(0, 37)}…` : opening;
  return `Your last ${count} prompts started with "${preview}". A small shape change usually unlocks much better answers.`;
}

// ---------------------------------------------------------------------------
// Template suggestion via LLM (fire-and-forget; falls back to a stub on error)
// ---------------------------------------------------------------------------

const STUB_TEMPLATES: Record<string, string> = {
  'redact-customer-data':
    'Act as a privacy-aware assistant. Help me [TASK]. I will provide [GENERIC DESCRIPTION] — never include customer names, emails, or account numbers. If I do, ask me to redact them first.',
  'vary-prompt-shape':
    'Frame your request as a constraint problem: "Given [CONSTRAINTS], produce [OUTPUT FORMAT]. Optimise for [METRIC]." Vary the constraints, not the opener.',
};

async function safeSuggestTemplate(
  kind: 'redact-customer-data' | 'vary-prompt-shape',
  samples: string[],
  log: ReturnType<typeof logger.withJobId>,
): Promise<string | null> {
  // Stub mode: always return the deterministic stub. Never throws.
  if (isStubMode()) return STUB_TEMPLATES[kind] ?? null;

  const systemPrompt =
    kind === 'redact-customer-data'
      ? 'You are a prompt coach. Output a single reusable prompt template (1-3 sentences) that redacts customer-identifying data using square-bracket placeholders. Plain text only — no JSON, no preamble.'
      : 'You are a prompt coach. Output a single short prompt template (1-3 sentences) that helps the user vary the SHAPE of their requests — different framing, constraints, or output format. Plain text only — no JSON, no preamble.';

  try {
    const result = await chatComplete({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Recent samples from the user (verbatim, do not echo them):\n${samples
            .slice(0, 3)
            .map((s) => `- ${s.slice(0, 240)}`)
            .join('\n')}\n\nReturn the template now.`,
        },
      ],
      temperature: LLM_TEMPERATURE,
      maxTokens: LLM_MAX_TOKENS,
    });
    const text = result.content.trim();
    if (text.length === 0) return STUB_TEMPLATES[kind] ?? null;
    return text;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn('safeSuggestTemplate: LLM failed, falling back to stub', {
      kind,
      error: message,
    });
    return STUB_TEMPLATES[kind] ?? null;
  }
}

// ---------------------------------------------------------------------------
// Per-user cap + audit helper
// ---------------------------------------------------------------------------

async function trimActiveNudgesIfNeeded(
  userId: string,
  organizationId: string,
  incoming: number,
): Promise<void> {
  const activeCount = await prisma.coachNudge.count({
    where: { userId, organizationId, dismissedAt: null },
  });
  const overflow = activeCount + incoming - COACH_NUDGE_VISIBLE_CAP;
  if (overflow <= 0) return;

  const oldest = await prisma.coachNudge.findMany({
    where: { userId, organizationId, dismissedAt: null },
    orderBy: { generatedAt: 'asc' },
    take: overflow,
    select: { id: true },
  });
  if (oldest.length === 0) return;

  const now = new Date();
  await prisma.coachNudge.updateMany({
    where: { id: { in: oldest.map((o) => o.id) } },
    data: { dismissedAt: now },
  });
}

async function safeAudit(
  organizationId: string,
  actorId: string,
  action: string,
  targetId: string,
  metadata: Prisma.InputJsonValue,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorId,
        action,
        targetType: 'CoachNudge',
        targetId,
        metadata,
      },
    });
  } catch {
    // Audit writes must never block the parent operation.
  }
}
