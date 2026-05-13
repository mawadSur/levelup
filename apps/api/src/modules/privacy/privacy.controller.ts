/**
 * PrivacyController — CR.15 GDPR / CCPA Self-Service
 *
 * Base path: /privacy
 *
 * All routes require authentication.
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  NotFoundException,
  GoneException,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PrivacyService } from './privacy.service';
import { requestDeletionSchema, type RequestDeletionInput } from '@levelup/types';

// Where the worker writes export zips (mirrors worker config)
const EXPORTS_DIR = path.resolve(process.cwd(), '.exports');

@Controller('privacy')
@UseGuards(AuthGuard, RoleGuard)
export class PrivacyController {
  private readonly logger = new Logger(PrivacyController.name);

  constructor(private readonly privacyService: PrivacyService) {}

  // --------------------------------------------------------------------------
  // Data Export
  // --------------------------------------------------------------------------

  /** POST /privacy/exports — create a new export request */
  @Post('exports')
  @HttpCode(HttpStatus.CREATED)
  requestExport(@CurrentUser() user: SessionPayload) {
    return this.privacyService.requestDataExport(user);
  }

  /** GET /privacy/exports — list user's export requests */
  @Get('exports')
  listExports(@CurrentUser() user: SessionPayload) {
    return this.privacyService.listDataExports(user.userId);
  }

  /** GET /privacy/exports/:id — single export status */
  @Get('exports/:id')
  getExport(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.privacyService.getDataExportStatus(id, user);
  }

  /**
   * GET /privacy/exports/:id/download — stream zip if READY, owned, not expired.
   * Must be declared BEFORE /:id to avoid NestJS matching "download" as an id.
   */
  @Get('exports/:id/download')
  async downloadExport(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Res() res: Response,
  ) {
    const request = await this.privacyService.getDataExportStatus(id, user);

    if (request.status === 'EXPIRED') {
      throw new GoneException('This export has expired. Please request a new one.');
    }

    if (request.status !== 'READY' || !request.fileUrl) {
      throw new NotFoundException('Export is not ready for download yet.');
    }

    // Check expiry
    if (request.expiresAt && request.expiresAt < new Date()) {
      throw new GoneException('This export has expired. Please request a new one.');
    }

    // Construct local file path from requestId
    const filePath = path.join(EXPORTS_DIR, `${request.id}.zip`);

    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      throw new NotFoundException('Export file not found on disk.');
    }

    const stat = await fs.promises.stat(filePath);
    const filename = `levelup-export-${request.id}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      this.logger.error(`Stream error for export ${id}: ${err.message}`);
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error streaming export' });
      }
    });

    stream.pipe(res);
  }

  // --------------------------------------------------------------------------
  // Deletion
  // --------------------------------------------------------------------------

  /** POST /privacy/deletions — create a deletion request */
  @Post('deletions')
  @HttpCode(HttpStatus.CREATED)
  requestDeletion(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(requestDeletionSchema)) dto: RequestDeletionInput,
  ) {
    return this.privacyService.requestDeletion(user, dto.reason);
  }

  /** GET /privacy/deletions — list user's deletion requests */
  @Get('deletions')
  listDeletions(@CurrentUser() user: SessionPayload) {
    return this.privacyService.listDeletions(user.userId);
  }

  /** POST /privacy/deletions/:id/confirm — user clicks email confirmation link */
  @Post('deletions/:id/confirm')
  @HttpCode(HttpStatus.OK)
  confirmDeletion(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.privacyService.confirmDeletion(id, user);
  }

  /** POST /privacy/deletions/:id/cancel — cancel before grace period ends */
  @Post('deletions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelDeletion(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.privacyService.cancelDeletion(id, user);
  }
}
