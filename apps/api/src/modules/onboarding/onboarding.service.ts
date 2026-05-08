import { BadRequestException, Injectable } from '@nestjs/common';
import type { UserOnboarding } from '@levelup/db';
import type { Prisma } from '@levelup/db';
import type { OnboardingState } from '@levelup/types';
import { PrismaService } from '../prisma';

/**
 * Total number of onboarding tour steps.
 * Matches the STEPS array in the frontend OnboardingTour component.
 */
export const TOTAL_STEPS = 4;

/** Cast arbitrary objects to Prisma JSON value. */
function toJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parseCompletedSteps(raw: Prisma.JsonValue): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (const item of raw) {
    if (typeof item === 'number' && Number.isInteger(item)) {
      out.push(item);
    }
  }
  return out;
}

function toState(row: UserOnboarding): OnboardingState {
  return {
    currentStep: row.currentStep,
    completedSteps: parseCompletedSteps(row.completedSteps),
    isDismissed: row.dismissedAt !== null,
    isComplete: row.completedAt !== null,
  };
}

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Fetches or creates the onboarding row for a user.
   */
  async getOrCreate(userId: string): Promise<UserOnboarding> {
    return this.prisma.userOnboarding.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Returns the public onboarding state shape.
   * If `dismissedAt` or `completedAt` is set, the tour will not auto-show.
   */
  async getState(userId: string): Promise<OnboardingState> {
    const row = await this.getOrCreate(userId);
    return toState(row);
  }

  /**
   * Advances the tour by one step.
   *
   * Rules:
   * - `step` must equal `currentStep` (no skipping).
   * - If this was the last step (`step >= TOTAL_STEPS - 1`), sets `completedAt`.
   * - The completed step is appended to `completedSteps`.
   */
  async advanceStep(userId: string, step: number): Promise<OnboardingState> {
    const row = await this.getOrCreate(userId);

    if (step !== row.currentStep) {
      throw new BadRequestException(
        `Cannot advance step ${step}: current step is ${row.currentStep}`,
      );
    }

    const existing = parseCompletedSteps(row.completedSteps);
    const updated = existing.includes(step) ? existing : [...existing, step];
    const isLast = step >= TOTAL_STEPS - 1;

    const next = await this.prisma.userOnboarding.update({
      where: { userId },
      data: {
        currentStep: isLast ? step + 1 : step + 1,
        completedSteps: updated as unknown as Prisma.InputJsonValue,
        ...(isLast ? { completedAt: new Date() } : {}),
      },
    });

    return toState(next);
  }

  /**
   * Dismisses the tour for this user.
   * Sets `dismissedAt` to now. Writes an audit log.
   */
  async dismiss(userId: string, organizationId: string): Promise<OnboardingState> {
    const row = await this.getOrCreate(userId);
    const next = await this.prisma.userOnboarding.update({
      where: { userId },
      data: { dismissedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: userId,
        action: 'onboarding.dismiss',
        targetType: 'UserOnboarding',
        targetId: userId,
        metadata: toJson({ currentStep: row.currentStep }),
      },
    });

    return toState(next);
  }

  /**
   * Restarts the tour for this user.
   * Clears `dismissedAt`, `completedAt`, resets `currentStep = 0` and
   * `completedSteps = []`. Writes an audit log.
   */
  async restart(userId: string, organizationId: string): Promise<OnboardingState> {
    const row = await this.getOrCreate(userId);
    const next = await this.prisma.userOnboarding.update({
      where: { userId },
      data: {
        currentStep: 0,
        completedSteps: [] as unknown as Prisma.InputJsonValue,
        dismissedAt: null,
        completedAt: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: userId,
        action: 'onboarding.restart',
        targetType: 'UserOnboarding',
        targetId: userId,
        metadata: toJson({ previousStep: row.currentStep }),
      },
    });

    return toState(next);
  }
}
