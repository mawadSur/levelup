import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionPayload } from '@levelup/auth-client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { NudgesService } from './nudges.service';
import {
  nudgeIdParamSchema,
  type ListCoachNudgesResponse,
  type NudgeIdParam,
} from './dto/nudge.dto';

/**
 * Proactive coach nudges — read + lifecycle.
 *
 * Generation runs in the BullMQ worker (`generate-coach-nudges`). The API
 * surface here is intentionally tiny — list active, mark dismissed, mark
 * acted-on — and all writes are owner-only via the calling session.
 */
@ApiTags('nudges')
@Controller('nudges')
@UseGuards(AuthGuard, RoleGuard)
export class NudgesController {
  constructor(private readonly nudgesService: NudgesService) {}

  /**
   * GET /api/nudges/me
   * Returns up to 3 active (not dismissed, < 7d old) nudges for the caller.
   */
  @Get('me')
  async listMyActive(@CurrentUser() user: SessionPayload): Promise<ListCoachNudgesResponse> {
    const items = await this.nudgesService.listMyActive(user);
    return { items };
  }

  /**
   * POST /api/nudges/:id/dismiss
   * Sets `dismissedAt = now()`. Idempotent.
   */
  @Post(':id/dismiss')
  dismiss(
    @CurrentUser() user: SessionPayload,
    @Param(new ZodValidationPipe(nudgeIdParamSchema)) params: NudgeIdParam,
  ): Promise<{ id: string; dismissedAt: string }> {
    return this.nudgesService.dismiss(user, params.id);
  }

  /**
   * POST /api/nudges/:id/acted-on
   * Sets `actedOnAt = now()`. Called when the user clicks "Try it" and we
   * navigate them into the coach with the suggested template prefilled.
   * Idempotent.
   */
  @Post(':id/acted-on')
  actedOn(
    @CurrentUser() user: SessionPayload,
    @Param(new ZodValidationPipe(nudgeIdParamSchema)) params: NudgeIdParam,
  ): Promise<{ id: string; actedOnAt: string }> {
    return this.nudgesService.actedOn(user, params.id);
  }
}
