/**
 * DemoController — /demo/*
 *
 * POST /demo/reset
 *   - Requires ADMIN role.
 *   - Additional guard: DEMO_RESET_ENABLED env + demo-org allowlist (enforced in service).
 */

import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DemoService } from './demo.service';
import { demoResetSchema } from '@levelup/types';
import type { DemoResetInput, DemoResetResponse } from '@levelup/types';
@Controller('demo')
@UseGuards(AuthGuard, RoleGuard)
@Roles('ADMIN')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  // -------------------------------------------------------------------------
  // POST /demo/reset
  // -------------------------------------------------------------------------

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetDemo(
    @Body(new ZodValidationPipe(demoResetSchema)) body: DemoResetInput,
    @CurrentUser() user: SessionPayload,
  ): Promise<DemoResetResponse> {
    return this.demoService.resetDemo(user, body);
  }
}
