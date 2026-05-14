/**
 * Weekly Narrative Manager Digest — composer.
 *
 * Replaces the historical numbers-heavy digest body with a prose narrative
 * ("This week your team completed 14 lessons (+3 vs last week). Sara's PII
 * miss rate dropped from 18% to 5% after the redaction lab…").
 *
 * Two execution modes:
 *   - Real: when @levelup/llm is NOT in stub mode the structured stats payload
 *     is sent to the LLM (aggregated numbers + names ONLY — never raw PII)
 *     and we ask for a 4-paragraph narrative.
 *   - Stub: a deterministic prose template that fills in the stats. The output
 *     is byte-identical for the same input, so tests / snapshots are stable
 *     without ever calling OpenAI.
 *
 * Output is cached per `(orgId, weekOf)` so re-runs of the digest job within
 * the same week do not re-charge OpenAI. The cache is an in-process Map —
 * BullMQ workers are long-lived so this is sufficient for our single-worker
 * deployment; we can swap in Redis if we ever scale horizontally.
 */

import { chatComplete, isStubMode } from '@levelup/llm';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PeriodDelta {
  current: number;
  previous: number;
  /** current - previous; included so callers can present "+3" / "-2" without recomputing. */
  delta: number;
}

export interface DirectReportRolling {
  userId: string;
  name: string;
  lessonsCompleted: PeriodDelta;
  /** 0..1 — fraction of lab attempts that passed in the period. */
  labPassRate: PeriodDelta;
  /** 0..1 — fraction of coach sessions flagged sensitive in the period. */
  sensitiveTriggerRate?: PeriodDelta;
}

export interface WinSummary {
  userId: string;
  name: string;
  headline: string;
}

export interface ConcernSummary {
  userId: string;
  name: string;
  headline: string;
}

export interface IncidentSummary {
  /** Display label e.g. "PII leak in coach" */
  label: string;
  count: number;
}

export interface SkillGraphMover {
  userId: string;
  name: string;
  skill: string;
  /** -1..+1 — directional movement on a skill graph axis. */
  delta: number;
}

export interface ManagerDigestStats {
  /** Stable identifier — first half of the cache key. */
  organizationId: string;
  /** ISO date for the Monday of the digest week — second half of the cache key. */
  weekOf: string;
  managerName: string;
  orgName: string;
  /** Human-readable period label e.g. "May 5 – May 12, 2026". */
  periodLabel: string;
  teamSize: number;

  /** This-week vs last-week aggregates. */
  lessonsCompleted: PeriodDelta;
  labsPassed: PeriodDelta;
  coachSessions: PeriodDelta;
  sensitiveTriggers: PeriodDelta;

  /** Per-direct-report rolling stats. */
  directReports: DirectReportRolling[];

  /** Top wins (largest improvements). 0..3 items. */
  topWins: WinSummary[];
  /** Top concerns (streaks at risk, repeated sensitive triggers). 0..3 items. */
  topConcerns: ConcernSummary[];

  /** Optional surfaces — degrade gracefully when absent. */
  incidents?: IncidentSummary[];
  skillGraphMovers?: SkillGraphMover[];
}

export interface ComposedNarrative {
  subject: string;
  body: string;
  html: string;
}

// ---------------------------------------------------------------------------
// In-process cache: (orgId, weekOf) -> ComposedNarrative
// ---------------------------------------------------------------------------

const narrativeCache = new Map<string, ComposedNarrative>();

function cacheKey(stats: ManagerDigestStats): string {
  return `${stats.organizationId}::${stats.weekOf}::${stats.managerName}`;
}

/** Exposed for tests — clears the in-process cache. */
export function _resetNarrativeCacheForTests(): void {
  narrativeCache.clear();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function signed(n: number): string {
  if (n === 0) return '0';
  return n > 0 ? `+${n}` : `${n}`;
}

function formatPct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function deltaPctLabel(delta: PeriodDelta): string {
  return `${formatPct(delta.current)} (prev ${formatPct(delta.previous)})`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function paragraphsToHtml(paragraphs: string[]): string {
  return paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1F2937;">${escapeHtml(p)}</p>`,
    )
    .join('\n');
}

// ---------------------------------------------------------------------------
// Subject line
// ---------------------------------------------------------------------------

function buildSubject(stats: ManagerDigestStats): string {
  const wins = stats.topWins.length;
  const concerns = stats.topConcerns.length;
  // "Your team's AI training: 3 wins, 1 concern, this week"
  const parts: string[] = [];
  if (wins > 0) parts.push(`${wins} win${wins === 1 ? '' : 's'}`);
  if (concerns > 0) parts.push(`${concerns} concern${concerns === 1 ? '' : 's'}`);
  if (parts.length === 0) parts.push('weekly recap');
  return `Your team's AI training: ${parts.join(', ')}, this week`;
}

// ---------------------------------------------------------------------------
// Stub-mode deterministic narrative
// ---------------------------------------------------------------------------

function composeStubParagraphs(stats: ManagerDigestStats): string[] {
  // --- Paragraph 1: overall team momentum ---
  const lessonsDelta = signed(stats.lessonsCompleted.delta);
  const labsDelta = signed(stats.labsPassed.delta);
  const p1 = `This week your team completed ${stats.lessonsCompleted.current} lessons (${lessonsDelta} vs last week) and passed ${stats.labsPassed.current} labs (${labsDelta} vs last week). Across ${stats.teamSize} learner${stats.teamSize === 1 ? '' : 's'}, the team logged ${stats.coachSessions.current} coach session${stats.coachSessions.current === 1 ? '' : 's'} (${signed(stats.coachSessions.delta)}).`;

  // --- Paragraph 2: wins ---
  let p2: string;
  if (stats.topWins.length === 0) {
    p2 =
      'No standout wins this week — encourage your team to push through their next lab to keep momentum.';
  } else {
    const winLines = stats.topWins.map((w) => `${w.name}: ${w.headline}`).join('. ');
    p2 = `Wins worth calling out: ${winLines}.`;
  }

  // --- Paragraph 3: concerns ---
  let p3: string;
  if (stats.topConcerns.length === 0 && stats.sensitiveTriggers.current === 0) {
    p3 =
      'Nothing on the watch list this week — sensitive-data triggers are clean and no streaks are at risk.';
  } else {
    const concernLines = stats.topConcerns.map((c) => `${c.name}: ${c.headline}`).join('. ');
    const sensitiveBit =
      stats.sensitiveTriggers.current > 0
        ? ` ${stats.sensitiveTriggers.current} sensitive-data trigger${stats.sensitiveTriggers.current === 1 ? '' : 's'} were flagged (${signed(stats.sensitiveTriggers.delta)} vs last week).`
        : '';
    p3 = `Watch list:${concernLines.length > 0 ? ` ${concernLines}.` : ''}${sensitiveBit}`.trim();
  }

  // --- Paragraph 4: incidents + skill movers + suggested next action ---
  const tail: string[] = [];
  if (stats.incidents && stats.incidents.length > 0) {
    const inc = stats.incidents.map((i) => `${i.label} (${i.count})`).join(', ');
    tail.push(`Incidents: ${inc}.`);
  }
  if (stats.skillGraphMovers && stats.skillGraphMovers.length > 0) {
    const movers = stats.skillGraphMovers
      .map((m) => `${m.name} moved ${signed(Math.round(m.delta * 100))}pp on ${m.skill}`)
      .join('; ');
    tail.push(`Skill movement: ${movers}.`);
  }
  if (tail.length === 0) {
    tail.push(
      'Suggested next action: review the detailed numbers below and assign one capstone to your highest mover.',
    );
  }
  const p4 = tail.join(' ');

  return [p1, p2, p3, p4];
}

// ---------------------------------------------------------------------------
// LLM prompt
// ---------------------------------------------------------------------------

const NARRATIVE_SYSTEM_PROMPT = `You are an enterprise manager-coaching assistant. You write short, useful, prose-form weekly digests for managers.

Rules:
- Output exactly 4 paragraphs of plain prose. No bullet lists. No markdown headings.
- Paragraph 1: overall team momentum (lessons, labs, coach sessions, week-over-week deltas).
- Paragraph 2: 1–3 wins worth calling out by name with a concrete data point.
- Paragraph 3: 1–3 concerns worth attention (sensitive-data triggers, at-risk streaks).
- Paragraph 4: 1–2 concrete next actions the manager should take.
- Use names exactly as given. Do not invent learners or numbers not in the payload.
- Never include raw PII. Only the aggregated stats and learner names provided.
- Keep total length under 220 words.`;

function buildUserPrompt(stats: ManagerDigestStats): string {
  return JSON.stringify(
    {
      managerName: stats.managerName,
      orgName: stats.orgName,
      periodLabel: stats.periodLabel,
      teamSize: stats.teamSize,
      lessonsCompleted: stats.lessonsCompleted,
      labsPassed: stats.labsPassed,
      coachSessions: stats.coachSessions,
      sensitiveTriggers: stats.sensitiveTriggers,
      directReports: stats.directReports,
      topWins: stats.topWins,
      topConcerns: stats.topConcerns,
      incidents: stats.incidents ?? [],
      skillGraphMovers: stats.skillGraphMovers ?? [],
    },
    null,
    2,
  );
}

async function composeWithLlm(stats: ManagerDigestStats): Promise<string[]> {
  const result = await chatComplete({
    messages: [
      { role: 'system', content: NARRATIVE_SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(stats) },
    ],
    temperature: 0.4,
    maxTokens: 600,
  });

  const raw = (result.content ?? '').trim();
  if (raw.length === 0) {
    // Fall back to deterministic prose so we never send an empty body.
    return composeStubParagraphs(stats);
  }

  // Split on blank lines; collapse to a clean array of paragraphs.
  const paragraphs = raw
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return composeStubParagraphs(stats);
  return paragraphs;
}

// ---------------------------------------------------------------------------
// Numbers appendix (kept for the "Detailed numbers below" requirement)
// ---------------------------------------------------------------------------

function buildAppendixText(stats: ManagerDigestStats): string {
  const lines: string[] = [];
  lines.push('Detailed numbers below');
  lines.push('---------------------');
  lines.push(
    `Lessons completed:   ${stats.lessonsCompleted.current} (${signed(stats.lessonsCompleted.delta)} vs prev ${stats.lessonsCompleted.previous})`,
  );
  lines.push(
    `Labs passed:         ${stats.labsPassed.current} (${signed(stats.labsPassed.delta)} vs prev ${stats.labsPassed.previous})`,
  );
  lines.push(
    `Coach sessions:      ${stats.coachSessions.current} (${signed(stats.coachSessions.delta)} vs prev ${stats.coachSessions.previous})`,
  );
  lines.push(
    `Sensitive triggers:  ${stats.sensitiveTriggers.current} (${signed(stats.sensitiveTriggers.delta)} vs prev ${stats.sensitiveTriggers.previous})`,
  );

  if (stats.directReports.length > 0) {
    lines.push('');
    lines.push('Per direct report');
    for (const r of stats.directReports) {
      lines.push(
        `  • ${r.name}: lessons ${r.lessonsCompleted.current} (${signed(r.lessonsCompleted.delta)}), lab pass rate ${deltaPctLabel(r.labPassRate)}`,
      );
    }
  }

  return lines.join('\n');
}

function buildAppendixHtml(stats: ManagerDigestStats): string {
  const rows: string[] = [];
  rows.push(
    `<tr><td style="padding:6px 12px;color:#374151;border-bottom:1px solid #F3F4F6;">Lessons completed</td><td style="padding:6px 12px;text-align:right;color:#111827;border-bottom:1px solid #F3F4F6;">${stats.lessonsCompleted.current} <span style="color:#6B7280;">(${escapeHtml(signed(stats.lessonsCompleted.delta))})</span></td></tr>`,
  );
  rows.push(
    `<tr><td style="padding:6px 12px;color:#374151;border-bottom:1px solid #F3F4F6;">Labs passed</td><td style="padding:6px 12px;text-align:right;color:#111827;border-bottom:1px solid #F3F4F6;">${stats.labsPassed.current} <span style="color:#6B7280;">(${escapeHtml(signed(stats.labsPassed.delta))})</span></td></tr>`,
  );
  rows.push(
    `<tr><td style="padding:6px 12px;color:#374151;border-bottom:1px solid #F3F4F6;">Coach sessions</td><td style="padding:6px 12px;text-align:right;color:#111827;border-bottom:1px solid #F3F4F6;">${stats.coachSessions.current} <span style="color:#6B7280;">(${escapeHtml(signed(stats.coachSessions.delta))})</span></td></tr>`,
  );
  rows.push(
    `<tr><td style="padding:6px 12px;color:#374151;border-bottom:1px solid #F3F4F6;">Sensitive triggers</td><td style="padding:6px 12px;text-align:right;color:#111827;border-bottom:1px solid #F3F4F6;">${stats.sensitiveTriggers.current} <span style="color:#6B7280;">(${escapeHtml(signed(stats.sensitiveTriggers.delta))})</span></td></tr>`,
  );

  const perReport = stats.directReports
    .map(
      (r) =>
        `<tr><td style="padding:6px 12px;color:#374151;border-bottom:1px solid #F3F4F6;">${escapeHtml(r.name)}</td><td style="padding:6px 12px;text-align:right;color:#111827;border-bottom:1px solid #F3F4F6;">${r.lessonsCompleted.current} lesson${r.lessonsCompleted.current === 1 ? '' : 's'} <span style="color:#6B7280;">(${escapeHtml(signed(r.lessonsCompleted.delta))})</span> · labs ${escapeHtml(deltaPctLabel(r.labPassRate))}</td></tr>`,
    )
    .join('\n');

  return `
    <h3 style="margin:28px 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;">Detailed numbers below</h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
      ${rows.join('\n')}
    </table>
    ${
      perReport
        ? `<h4 style="margin:18px 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;">Per direct report</h4>
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">${perReport}</table>`
        : ''
    }`;
}

// ---------------------------------------------------------------------------
// Public composer
// ---------------------------------------------------------------------------

/**
 * Compose the weekly narrative digest. Pure function in the sense that it
 * has no side effects beyond a per-process cache; given identical input it
 * returns identical output in stub mode.
 */
export async function composeNarrative(stats: ManagerDigestStats): Promise<ComposedNarrative> {
  const key = cacheKey(stats);
  const cached = narrativeCache.get(key);
  if (cached) return cached;

  let paragraphs: string[];
  if (isStubMode()) {
    paragraphs = composeStubParagraphs(stats);
  } else {
    try {
      paragraphs = await composeWithLlm(stats);
    } catch {
      // Defensive: never let the LLM block the digest.
      paragraphs = composeStubParagraphs(stats);
    }
  }

  const subject = buildSubject(stats);
  const body = `${paragraphs.join('\n\n')}\n\n${buildAppendixText(stats)}`;

  const html = `${paragraphsToHtml(paragraphs)}${buildAppendixHtml(stats)}`;

  const composed: ComposedNarrative = { subject, body, html };
  narrativeCache.set(key, composed);
  return composed;
}

/** Synchronous deterministic variant — used by sample generation and tests. */
export function composeNarrativeStub(stats: ManagerDigestStats): ComposedNarrative {
  const paragraphs = composeStubParagraphs(stats);
  const subject = buildSubject(stats);
  const body = `${paragraphs.join('\n\n')}\n\n${buildAppendixText(stats)}`;
  const html = `${paragraphsToHtml(paragraphs)}${buildAppendixHtml(stats)}`;
  return { subject, body, html };
}
