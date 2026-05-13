import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PromptsService } from './prompts.service';
import { savePromptSchema } from './dto/save-prompt.dto';
import { SavePromptDto } from './dto/save-prompt.dto';

@Controller('prompts')
@UseGuards(AuthGuard, RoleGuard)
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  /**
   * GET /prompts
   * Returns union: own + org-shared + global library prompts.
   * Supports cursor pagination by createdAt+id.
   */
  @Get()
  listPrompts(
    @CurrentUser() user: SessionPayload,
    @Query('category') category?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.promptsService.listPrompts(user, { category, q, limit, cursor });
  }

  /**
   * GET /prompts/:id
   * Single prompt — accessible if owner, org-shared, or global.
   */
  @Get(':id')
  getPromptById(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.promptsService.getPromptById(id, user);
  }

  /**
   * POST /prompts
   * Create a new prompt scoped to current user + org.
   * isShared downgraded to false for EMPLOYEE role.
   */
  @Post()
  createPrompt(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(savePromptSchema)) dto: SavePromptDto,
  ) {
    return this.promptsService.createPrompt(user, dto);
  }

  /**
   * PATCH /prompts/:id
   * Owner or ADMIN (same org) may update.
   */
  @Patch(':id')
  updatePrompt(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(savePromptSchema.partial())) dto: Partial<SavePromptDto>,
  ) {
    return this.promptsService.updatePrompt(id, user, dto);
  }

  /**
   * DELETE /prompts/:id
   * Owner or ADMIN (same org) may delete.
   */
  @Delete(':id')
  deletePrompt(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.promptsService.deletePrompt(id, user);
  }

  /**
   * POST /prompts/:id/clone
   * Fork any accessible prompt into the caller's own library (isShared=false).
   */
  @Post(':id/clone')
  clonePrompt(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.promptsService.clonePrompt(id, user);
  }

  /**
   * POST /prompts/:id/share
   * Owner-only. Toggles isShared. Requires MANAGER+.
   */
  @Post(':id/share')
  toggleShare(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.promptsService.toggleShare(id, user);
  }
}
