import { Queue, type Job, type JobsOptions } from 'bullmq';
import { getConnection } from './connection.js';
import { JOBS } from './jobs.js';
import type {
  JobMap,
  JobName,
  CertPdfInput,
  ReportAggregateInput,
  EmbedContentInput,
  SendEmailInput,
  DataExportInput,
  AuditCleanupInput,
  ManagerDigestCronInput,
  PathGenerationInput,
  AnomalyScanInput,
  GovernanceReportInput,
  TrialExpiryCheckInput,
  GenerateSceneAssetInput,
  GenerateLessonImageInput,
  ComputeIndustryBenchmarksInput,
  GenerateCoachNudgesInput,
  AggregateUserSkillsInput,
} from './types.js';

// ---------------------------------------------------------------------------
// Generic queue factory (singleton-per-job-name)
// ---------------------------------------------------------------------------

const _queues = new Map<JobName, Queue>();

/**
 * Return (or create) the BullMQ `Queue` for a given job name.
 * The queue is fully typed: `Queue<Input, Output>` where Input/Output are
 * inferred from `JobMap`.
 */
export function getQueue<K extends JobName>(
  name: K,
): Queue<JobMap[K]['input'], JobMap[K]['output']> {
  let q = _queues.get(name);
  if (!q) {
    const reg = JOBS[name];
    q = new Queue<JobMap[K]['input'], JobMap[K]['output']>(reg.queue, {
      connection: getConnection(),
      defaultJobOptions: reg.defaultOpts,
    });
    _queues.set(name, q);
  }
  // Safe cast: the Map is always keyed by job name with matching generics.
  return q as Queue<JobMap[K]['input'], JobMap[K]['output']>;
}

// ---------------------------------------------------------------------------
// Per-job typed enqueue helpers
// ---------------------------------------------------------------------------

/**
 * Enqueue a `cert-pdf` job.
 * Generates a signed PDF certificate; input must include `certificateId`.
 */
export function enqueueCertPdf(
  input: CertPdfInput,
  overrides?: JobsOptions,
): Promise<Job<CertPdfInput, JobMap['cert-pdf']['output']>> {
  return getQueue('cert-pdf').add('cert-pdf', input, {
    ...JOBS['cert-pdf'].defaultOpts,
    ...overrides,
  });
}

/**
 * Enqueue a `report-aggregate` job.
 * Recomputes a department report snapshot for the given organisation/period.
 */
export function enqueueReportAggregate(
  input: ReportAggregateInput,
  overrides?: JobsOptions,
): Promise<Job<ReportAggregateInput, JobMap['report-aggregate']['output']>> {
  return getQueue('report-aggregate').add('report-aggregate', input, {
    ...JOBS['report-aggregate'].defaultOpts,
    ...overrides,
  });
}

/**
 * Enqueue an `embed-content` job.
 * Embeds a lesson body and upserts the result into `LessonEmbedding`.
 */
export function enqueueEmbedContent(
  input: EmbedContentInput,
  overrides?: JobsOptions,
): Promise<Job<EmbedContentInput, JobMap['embed-content']['output']>> {
  return getQueue('embed-content').add('embed-content', input, {
    ...JOBS['embed-content'].defaultOpts,
    ...overrides,
  });
}

/**
 * Enqueue a `send-email` job.
 * Sends a transactional email via Resend using the specified template.
 */
export function enqueueEmail(
  input: SendEmailInput,
  overrides?: JobsOptions,
): Promise<Job<SendEmailInput, JobMap['send-email']['output']>> {
  return getQueue('send-email').add('send-email', input, {
    ...JOBS['send-email'].defaultOpts,
    ...overrides,
  });
}

/**
 * Enqueue a `data-export` job.
 * Builds a zip archive of all user-owned data and stores it on disk.
 */
export function enqueueDataExport(
  input: DataExportInput,
  overrides?: JobsOptions,
): Promise<Job<DataExportInput, JobMap['data-export']['output']>> {
  return getQueue('data-export').add('data-export', input, {
    ...JOBS['data-export'].defaultOpts,
    ...overrides,
  });
}

/**
 * Enqueue an `audit-cleanup` job.
 * Deletes audit log rows older than the given threshold (defaults to 13 months).
 */
export function enqueueAuditCleanup(
  input?: AuditCleanupInput,
  overrides?: JobsOptions,
): Promise<Job<AuditCleanupInput, JobMap['audit-cleanup']['output']>> {
  return getQueue('audit-cleanup').add('audit-cleanup', input ?? {}, {
    ...JOBS['audit-cleanup'].defaultOpts,
    ...overrides,
  });
}

/**
 * Enqueue a `manager-digest-cron` job.
 * Fans out per-manager send-email jobs for the weekly digest.
 */
export function enqueueManagerDigestCron(
  input?: ManagerDigestCronInput,
  overrides?: JobsOptions,
): Promise<Job<ManagerDigestCronInput, JobMap['manager-digest-cron']['output']>> {
  return getQueue('manager-digest-cron').add('manager-digest-cron', input ?? {}, {
    ...JOBS['manager-digest-cron'].defaultOpts,
    ...overrides,
  });
}

/**
 * Enqueue a `path-generation` job.
 * Generates a 6-lesson learning path from an admin's prompt via the LLM and
 * stores the draft on the matching `PathGenerationRequest` row.
 */
export function enqueuePathGeneration(
  input: PathGenerationInput,
  overrides?: JobsOptions,
): Promise<Job<PathGenerationInput, JobMap['path-generation']['output']>> {
  return getQueue('path-generation').add('path-generation', input, {
    ...JOBS['path-generation'].defaultOpts,
    ...overrides,
  });
}

/**
 * Enqueue an `anomaly-scan` job.
 * Scans all active orgs for anomalous usage patterns and writes AnomalyAlert rows.
 */
export function enqueueAnomalyScan(
  input?: AnomalyScanInput,
  overrides?: JobsOptions,
): Promise<Job<AnomalyScanInput, JobMap['anomaly-scan']['output']>> {
  return getQueue('anomaly-scan').add('anomaly-scan', input ?? {}, {
    ...JOBS['anomaly-scan'].defaultOpts,
    ...overrides,
  });
}

/**
 * Enqueue a `governance-report` job.
 * Builds a PDF AI-governance evidence report for the given period and uploads
 * it to the `governance-reports` bucket. Producer (the API) hands the worker
 * a stable `requestId` so subsequent status polls can locate the result.
 */
export function enqueueGovernanceReport(
  input: GovernanceReportInput,
  overrides?: JobsOptions,
): Promise<Job<GovernanceReportInput, JobMap['governance-report']['output']>> {
  return getQueue('governance-report').add('governance-report', input, {
    ...JOBS['governance-report'].defaultOpts,
    // jobId mirrors requestId so getJob(requestId) is a one-liner from the
    // status endpoint, and BullMQ deduplicates concurrent same-id submits.
    jobId: input.requestId,
    ...overrides,
  });
}

/**
 * Enqueue a `trial-expiry-check` job.
 *
 * Daily scan: emits 3-day warning emails (day 11), records the trial
 * expired audit event (day 14), and archives orgs that never upgraded
 * (day 21+). Producer is the worker's recurring-cron registration.
 */
export function enqueueTrialExpiryCheck(
  input?: TrialExpiryCheckInput,
  overrides?: JobsOptions,
): Promise<Job<TrialExpiryCheckInput, JobMap['trial-expiry-check']['output']>> {
  return getQueue('trial-expiry-check').add('trial-expiry-check', input ?? {}, {
    ...JOBS['trial-expiry-check'].defaultOpts,
    ...overrides,
  });
}

/**
 * Enqueue a `generate-scene-asset` job.
 *
 * Generates (or reuses) the pre-rendered image for one scene in a scenario
 * lesson. The handler is idempotent on `promptHash` — re-enqueuing the same
 * payload returns the cached blob URL via `LessonSceneAsset`. We pin
 * `jobId` to the promptHash so BullMQ dedupes back-to-back submits from a
 * single seed run.
 */
export function enqueueGenerateSceneAsset(
  input: GenerateSceneAssetInput,
  overrides?: JobsOptions,
): Promise<Job<GenerateSceneAssetInput, JobMap['generate-scene-asset']['output']>> {
  return getQueue('generate-scene-asset').add('generate-scene-asset', input, {
    ...JOBS['generate-scene-asset'].defaultOpts,
    jobId: `scene:${input.promptHash}`,
    ...overrides,
  });
}

/**
 * Enqueue a `generate-lesson-image` job.
 *
 * Generates (or reuses) the pre-rendered image for one `[image]` directive
 * inside a READ-kind lesson's markdown body. Idempotent on `promptHash` —
 * pinning `jobId` to it dedupes back-to-back submits from a single seed run.
 */
export function enqueueGenerateLessonImage(
  input: GenerateLessonImageInput,
  overrides?: JobsOptions,
): Promise<Job<GenerateLessonImageInput, JobMap['generate-lesson-image']['output']>> {
  return getQueue('generate-lesson-image').add('generate-lesson-image', input, {
    ...JOBS['generate-lesson-image'].defaultOpts,
    jobId: `lesson-image:${input.promptHash}`,
    ...overrides,
  });
}

/**
 * Enqueue a `compute-industry-benchmarks` job.
 *
 * Weekly cross-tenant aggregation: collects opted-in orgs per industry,
 * computes per-metric quantiles (p25/p50/p75/p90), and upserts snapshots.
 * Honours a hard privacy floor (>= 10 orgs AND >= 100 active users per
 * industry slice) before any value is exposed.
 */
export function enqueueComputeIndustryBenchmarks(
  input?: ComputeIndustryBenchmarksInput,
  overrides?: JobsOptions,
): Promise<Job<ComputeIndustryBenchmarksInput, JobMap['compute-industry-benchmarks']['output']>> {
  return getQueue('compute-industry-benchmarks').add('compute-industry-benchmarks', input ?? {}, {
    ...JOBS['compute-industry-benchmarks'].defaultOpts,
    ...overrides,
  });
}

/**
 * Enqueue a `generate-coach-nudges` job.
 *
 * Daily scan: walks each user with coach activity in the last 14 days and
 * emits up to N proactive nudge cards. Idempotent — the handler skips
 * generating the same kind for the same user within 24 hours.
 */
export function enqueueGenerateCoachNudges(
  input?: GenerateCoachNudgesInput,
  overrides?: JobsOptions,
): Promise<Job<GenerateCoachNudgesInput, JobMap['generate-coach-nudges']['output']>> {
  return getQueue('generate-coach-nudges').add('generate-coach-nudges', input ?? {}, {
    ...JOBS['generate-coach-nudges'].defaultOpts,
    ...overrides,
  });
}

/**
 * Enqueue an `aggregate-user-skills` job.
 *
 * Daily aggregator: recomputes UserSkill mastery (exposure / practice / transfer)
 * for every user from completed lessons, passed lab attempts, and recent coach
 * sessions. Idempotent upserts mean callers may safely fire ad-hoc runs (e.g.
 * after seeding new content) on top of the scheduled cron.
 */
export function enqueueAggregateUserSkills(
  input?: AggregateUserSkillsInput,
  overrides?: JobsOptions,
): Promise<Job<AggregateUserSkillsInput, JobMap['aggregate-user-skills']['output']>> {
  return getQueue('aggregate-user-skills').add('aggregate-user-skills', input ?? {}, {
    ...JOBS['aggregate-user-skills'].defaultOpts,
    ...overrides,
  });
}
