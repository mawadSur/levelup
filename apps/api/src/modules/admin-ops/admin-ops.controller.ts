/**
 * AdminOpsController — /admin/ops/*
 *
 * All endpoints require ADMIN role (role guard is globally registered).
 * Base path: /admin/ops
 */

import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminOpsService } from './admin-ops.service';
import { dlqListParamsSchema, auditListParamsSchema } from '@levelup/types';
import type { DlqListParams, AuditListParams } from '@levelup/types';
@Controller('admin/ops')
@UseGuards(AuthGuard, RoleGuard)
@Roles('ADMIN')
export class AdminOpsController {
  constructor(private readonly adminOpsService: AdminOpsService) {}

  // -------------------------------------------------------------------------
  // GET /admin/ops/dlq
  // -------------------------------------------------------------------------

  @Get('dlq')
  listDlq(@Query(new ZodValidationPipe(dlqListParamsSchema)) params: DlqListParams) {
    return this.adminOpsService.listDlq(params);
  }

  // -------------------------------------------------------------------------
  // GET /admin/ops/dlq/:id
  // -------------------------------------------------------------------------

  @Get('dlq/:id')
  getDlqRow(@Param('id') id: string) {
    return this.adminOpsService.getDlqRow(id);
  }

  // -------------------------------------------------------------------------
  // POST /admin/ops/dlq/:id/retry
  // -------------------------------------------------------------------------

  @Post('dlq/:id/retry')
  retryDlqRow(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.adminOpsService.retryDlqRow(id, user);
  }

  // -------------------------------------------------------------------------
  // DELETE /admin/ops/dlq/:id
  // -------------------------------------------------------------------------

  @Delete('dlq/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDlqRow(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    await this.adminOpsService.deleteDlqRow(id, user);
  }

  // -------------------------------------------------------------------------
  // GET /admin/ops/audit/actions
  // Must be declared before /audit (NestJS literal-first matching)
  // -------------------------------------------------------------------------

  @Get('audit/actions')
  listAuditActions(@CurrentUser() user: SessionPayload) {
    return this.adminOpsService.listAuditActions(user);
  }

  // -------------------------------------------------------------------------
  // GET /admin/ops/audit
  // -------------------------------------------------------------------------

  @Get('audit')
  listAudit(
    @CurrentUser() user: SessionPayload,
    @Query(new ZodValidationPipe(auditListParamsSchema)) params: AuditListParams,
  ) {
    return this.adminOpsService.listAudit(user, params);
  }
}

// ---------------------------------------------------------------------------
// AdminOrgController — /admin/org/*
// ---------------------------------------------------------------------------
//
// Carved into its own controller (rather than overloading AdminOpsController)
// so the URL surface stays scoped: `/admin/org/<resource>` for org-level
// settings, `/admin/ops/<resource>` for ops surfaces (DLQ, audit).

import { z } from 'zod';

const managerDigestSettingsSchema = z.object({
  enabled: z.boolean(),
  cadence: z.enum(['weekly', 'biweekly']),
});

type ManagerDigestSettingsDto = z.infer<typeof managerDigestSettingsSchema>;

@Controller('admin/org')
@UseGuards(AuthGuard, RoleGuard)
@Roles('ADMIN')
export class AdminOrgController {
  constructor(private readonly adminOpsService: AdminOpsService) {}

  @Get('manager-digest-settings')
  getManagerDigestSettings(
    @CurrentUser() user: SessionPayload,
  ): Promise<{ enabled: boolean; cadence: 'weekly' | 'biweekly' }> {
    return this.adminOpsService.getManagerDigestSettings(user.organizationId);
  }

  @Patch('manager-digest-settings')
  @HttpCode(HttpStatus.OK)
  updateManagerDigestSettings(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(managerDigestSettingsSchema)) body: ManagerDigestSettingsDto,
  ): Promise<{ enabled: boolean; cadence: 'weekly' | 'biweekly' }> {
    return this.adminOpsService.updateManagerDigestSettings(user, body);
  }
}
