import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionPayload } from '@levelup/auth-client';
import type { OnboardingState } from '@levelup/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { OnboardingService } from './onboarding.service';
import { type AdvanceStepDto, advanceStepSchema } from './dto/advance-step.dto';

@ApiTags('onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  /**
   * GET /onboarding/state
   * Returns the current onboarding state for the authenticated user.
   */
  @Get('state')
  async getState(@CurrentUser() user: SessionPayload): Promise<OnboardingState> {
    return this.onboarding.getState(user.userId);
  }

  /**
   * POST /onboarding/advance
   * Body: { step: number }
   * Advances the tour by one step. Validates that `step` matches `currentStep`
   * to prevent skip-to-end exploits.
   */
  @Post('advance')
  async advance(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(advanceStepSchema)) body: AdvanceStepDto,
  ): Promise<OnboardingState> {
    return this.onboarding.advanceStep(user.userId, body.step);
  }

  /**
   * POST /onboarding/dismiss
   * Dismisses the tour (sets dismissedAt). Also writes an audit log.
   */
  @Post('dismiss')
  async dismiss(@CurrentUser() user: SessionPayload): Promise<OnboardingState> {
    return this.onboarding.dismiss(user.userId, user.organizationId);
  }

  /**
   * POST /onboarding/restart
   * Resets the tour to step 0 and clears dismissed/completed flags.
   */
  @Post('restart')
  async restart(@CurrentUser() user: SessionPayload): Promise<OnboardingState> {
    return this.onboarding.restart(user.userId, user.organizationId);
  }
}
