/**
 * data-export job handler — CR.15 GDPR / CCPA
 *
 * Collects all data owned by a user, writes per-table CSV files plus a
 * manifest.json, zips them with `archiver`, and stores the result at
 * apps/api/.exports/<requestId>.zip.
 *
 * Returns: { fileUrl, sizeBytes }
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Job } from 'bullmq';
import type { DataExportInput, DataExportOutput } from '@levelup/queue';
import { prisma } from '@levelup/db';
import { logger } from '../logger.js';
import { exportsOutputDir } from '../config.js';

// ---------------------------------------------------------------------------
// Minimal interface for the archiver API surface we use.
// Full types come from @types/archiver once installed.
// ---------------------------------------------------------------------------
interface ArchiverInstance {
  append(source: string, options: { name: string }): void;
  pipe(destination: NodeJS.WritableStream): void;
  finalize(): Promise<void>;
  on(event: 'error', handler: (err: Error) => void): this;
}
interface ArchiverFactory {
  (format: string, options?: Record<string, unknown>): ArchiverInstance;
  default?: ArchiverFactory;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert an array of objects to a simple CSV string. */
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const keys = Object.keys(rows[0] as Record<string, unknown>);
  const header = keys.map((k) => JSON.stringify(k)).join(',');
  const body = rows
    .map((row) =>
      keys
        .map((k) => {
          const v = (row as Record<string, unknown>)[k];
          if (v === null || v === undefined) return '';
          if (typeof v === 'object') return JSON.stringify(JSON.stringify(v));
          return JSON.stringify(String(v));
        })
        .join(','),
    )
    .join('\n');
  return header + '\n' + body;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function dataExportHandler(job: Job<DataExportInput>): Promise<DataExportOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const { requestId, userId } = job.data;

  log.info('data-export: starting', { requestId, userId });
  const start = Date.now();

  // -------------------------------------------------------------------------
  // 1. Mark PROCESSING
  // -------------------------------------------------------------------------
  await prisma.dataExportRequest.update({
    where: { id: requestId },
    data: { status: 'PROCESSING' },
  });

  try {
    // -----------------------------------------------------------------------
    // 2. Collect all user-owned data
    // -----------------------------------------------------------------------
    const [
      user,
      progress,
      assessments,
      prompts,
      certificates,
      badges,
      coachSessions,
      conversations,
      conversationTurns,
      xpEvents,
      gameState,
      auditLogs,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.userProgress.findMany({ where: { userId } }),
      prisma.assessment.findMany({ where: { userId } }),
      prisma.prompt.findMany({ where: { userId } }),
      prisma.certificate.findMany({ where: { userId } }),
      prisma.badge.findMany({ where: { userId } }),
      prisma.aiCoachSession.findMany({ where: { userId } }),
      prisma.conversation.findMany({ where: { userId } }),
      // ConversationTurns: gather ids from user's conversations
      prisma.conversation.findMany({ where: { userId }, select: { id: true } }).then((convs) => {
        const convIds = convs.map((c) => c.id);
        return prisma.conversationTurn.findMany({
          where: { conversationId: { in: convIds } },
        });
      }),
      prisma.xpEvent.findMany({ where: { userId } }),
      prisma.userGameState.findFirst({ where: { userId } }),
      prisma.auditLog.findMany({ where: { actorId: userId } }),
    ]);

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Sanitize: drop internal auth identifiers from the export payload
    const { workosUserId: _dropWorkos, supabaseUserId: _dropSupabase, ...safeUser } = user;

    // -----------------------------------------------------------------------
    // 3. Build zip archive
    // -----------------------------------------------------------------------
    await fs.promises.mkdir(exportsOutputDir, { recursive: true });

    const zipPath = path.join(exportsOutputDir, `${requestId}.zip`);

    const manifest = {
      exportedAt: new Date().toISOString(),
      userId,
      tables: [
        'user',
        'progress',
        'assessments',
        'prompts',
        'certificates',
        'badges',
        'coachSessions',
        'conversations',
        'conversationTurns',
        'xpEvents',
        'gameState',
        'auditLogs',
      ],
    };

    // Use archiver dynamically to zip everything.
    // We cast through `unknown` because @types/archiver is a devDependency
    // that may not be installed at typecheck time. The ArchiverFactory /
    // ArchiverInstance interfaces above guard every call site we use.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const archiverFn = require('archiver') as ArchiverFactory;
    const archive = archiverFn('zip', { zlib: { level: 9 } });
    const output = fs.createWriteStream(zipPath);

    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);

      // manifest.json
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

      // Per-table CSV files
      const userRows = [safeUser as Record<string, unknown>];
      archive.append(toCsv(userRows), { name: 'user.csv' });
      archive.append(toCsv(progress as unknown as Record<string, unknown>[]), {
        name: 'progress.csv',
      });
      archive.append(toCsv(assessments as unknown as Record<string, unknown>[]), {
        name: 'assessments.csv',
      });
      archive.append(toCsv(prompts as unknown as Record<string, unknown>[]), {
        name: 'prompts.csv',
      });
      archive.append(toCsv(certificates as unknown as Record<string, unknown>[]), {
        name: 'certificates.csv',
      });
      archive.append(toCsv(badges as unknown as Record<string, unknown>[]), { name: 'badges.csv' });
      archive.append(toCsv(coachSessions as unknown as Record<string, unknown>[]), {
        name: 'coach_sessions.csv',
      });
      archive.append(toCsv(conversations as unknown as Record<string, unknown>[]), {
        name: 'conversations.csv',
      });
      archive.append(toCsv(conversationTurns as unknown as Record<string, unknown>[]), {
        name: 'conversation_turns.csv',
      });
      archive.append(toCsv(xpEvents as unknown as Record<string, unknown>[]), {
        name: 'xp_events.csv',
      });
      archive.append(toCsv(gameState ? [gameState as unknown as Record<string, unknown>] : []), {
        name: 'game_state.csv',
      });
      archive.append(toCsv(auditLogs as unknown as Record<string, unknown>[]), {
        name: 'audit_logs.csv',
      });

      archive.finalize();
    });

    const stat = await fs.promises.stat(zipPath);
    const sizeBytes = stat.size;

    const fileUrl = `/api/privacy/exports/${requestId}/download`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // -----------------------------------------------------------------------
    // 4. Mark READY
    // -----------------------------------------------------------------------
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: 'READY',
        fileUrl,
        fileSizeBytes: sizeBytes,
        readyAt: new Date(),
        expiresAt,
      },
    });

    // Audit log
    const exportReq = await prisma.dataExportRequest.findUnique({ where: { id: requestId } });
    if (exportReq) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (dbUser) {
        await prisma.auditLog.create({
          data: {
            organizationId: dbUser.organizationId,
            actorId: userId,
            action: 'privacy.export_ready',
            targetType: 'DataExportRequest',
            targetId: requestId,
            metadata: { fileUrl, sizeBytes, durationMs: Date.now() - start },
          },
        });
      }
    }

    const durationMs = Date.now() - start;
    log.info('data-export: completed', { requestId, sizeBytes, durationMs });

    return { fileUrl, sizeBytes };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    log.error('data-export: failed', { requestId, error: reason });

    // Mark FAILED with reason
    await prisma.dataExportRequest
      .update({
        where: { id: requestId },
        data: { status: 'FAILED', failedReason: reason },
      })
      .catch(() => {
        // Swallow secondary errors — re-throw original below
      });

    throw err;
  }
}
