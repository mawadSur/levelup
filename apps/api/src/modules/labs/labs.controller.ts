import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionPayload } from '@levelup/auth-client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { LabsService } from './labs.service';
import { LabsRateLimitGuard } from './labs-rate-limit.guard';
import {
  labAttemptRequestSchema,
  labRunRequestSchema,
  labSpecSchema,
  labUpdateSpecSchema,
  type LabAttemptRequest,
  type LabRunRequest,
  type LabSpec,
  type LabUpdateSpec,
} from './dto/lab-request.dto';
import type {
  LabAttemptResponse,
  LabAttemptSummary,
  LabDetail,
  LabRunResponse,
  LabSummary,
} from '@levelup/types';

@ApiTags('labs')
@Controller()
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  // ---------------------------------------------------------------------------
  // Learner-facing routes
  // ---------------------------------------------------------------------------

  @Get('labs')
  list(@CurrentUser() user: SessionPayload): Promise<LabSummary[]> {
    return this.labsService.listVisibleLabs(user.organizationId);
  }

  @Get('labs/me/attempts')
  myAttempts(
    @CurrentUser() user: SessionPayload,
    @Query('slug') slug?: string,
  ): Promise<LabAttemptSummary[]> {
    return this.labsService.getMyAttempts(user.userId, slug);
  }

  @Get('labs/:slug')
  detail(@CurrentUser() user: SessionPayload, @Param('slug') slug: string): Promise<LabDetail> {
    return this.labsService.getLab(slug, user.organizationId);
  }

  @Post('labs/:slug/runs')
  @UseGuards(LabsRateLimitGuard)
  runTurn(
    @CurrentUser() user: SessionPayload,
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(labRunRequestSchema)) body: LabRunRequest,
  ): Promise<LabRunResponse> {
    return this.labsService.runChatbotTurn({
      slug,
      user,
      transcript: body.transcript,
      userInput: body.userInput,
    });
  }

  @Post('labs/:slug/attempts')
  @UseGuards(LabsRateLimitGuard)
  submit(
    @CurrentUser() user: SessionPayload,
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(labAttemptRequestSchema)) body: LabAttemptRequest,
  ): Promise<LabAttemptResponse> {
    return this.labsService.submitAttempt({
      slug,
      user,
      transcript: body.transcript,
    });
  }

  // ---------------------------------------------------------------------------
  // Admin CRUD — gated by RoleGuard (registered globally). @Roles('ADMIN')
  // restricts to admins; MANAGERs cannot author labs.
  // ---------------------------------------------------------------------------

  @Post('admin/labs')
  @Roles('ADMIN')
  createLab(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(labSpecSchema)) body: LabSpec,
  ): Promise<LabSummary> {
    return this.labsService.createLab(user, body);
  }

  @Patch('admin/labs/:slug')
  @Roles('ADMIN')
  updateLab(
    @CurrentUser() user: SessionPayload,
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(labUpdateSpecSchema)) body: LabUpdateSpec,
  ): Promise<LabSummary> {
    return this.labsService.updateLab(user, slug, body);
  }
}
