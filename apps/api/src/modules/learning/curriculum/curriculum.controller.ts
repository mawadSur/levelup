import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoleGuard } from '../../auth/guards/role.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import type { CurriculumService } from './curriculum.service';

/**
 * /curriculum — denormalized 0-to-hero view for the visual progression page.
 *
 * Returns tiers → paths → lessons (with per-lesson kind + status) plus the
 * caller's game state in a single payload so the page can render in one fetch.
 */
@Controller('curriculum')
@UseGuards(RoleGuard)
export class CurriculumController {
  constructor(private readonly curriculum: CurriculumService) {}

  @Get('me')
  getMyCurriculum(@CurrentUser() user: SessionPayload) {
    return this.curriculum.getMyCurriculum(user);
  }
}
