import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SessionPayload } from '@levelup/auth-client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { FlagsService } from './flags.service';
import type { EvaluatedFlag } from './flags.service';
import { upsertFlagSchema } from './dto/upsert-flag.dto';
import type { UpsertFlagDto } from './dto/upsert-flag.dto';

@ApiTags('flags')
@Controller('flags')
export class FlagsController {
  constructor(private readonly flagsService: FlagsService) {}

  /**
   * GET /flags/me — Authenticated. Returns evaluated Record<string, boolean>
   * for the current user. Frontend uses this to populate the FlagsProvider.
   */
  @Get('me')
  @ApiOperation({ summary: 'Evaluate all flags for the current user' })
  async getMyFlags(@CurrentUser() user: SessionPayload): Promise<Record<string, boolean>> {
    return this.flagsService.evaluateAll(user.organizationId, user.userId);
  }

  /**
   * GET /flags — ADMIN. Lists all flags for current org + global defaults
   * not overridden at the org level.
   */
  @Get()
  @Roles('ADMIN')
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'List all flags for the current org (admin only)' })
  async listFlags(@CurrentUser() user: SessionPayload): Promise<EvaluatedFlag[]> {
    return this.flagsService.listFlagsForOrg(user.organizationId);
  }

  /**
   * POST /flags — ADMIN. Upserts an org-specific flag override.
   */
  @Post()
  @Roles('ADMIN')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert an org-specific flag override (admin only)' })
  async upsertFlag(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(upsertFlagSchema)) body: UpsertFlagDto,
  ): Promise<EvaluatedFlag> {
    const flag = await this.flagsService.upsertFlag(user.organizationId, body, user.userId);
    return {
      key: flag.key,
      enabled: flag.enabled,
      rolloutPercent: flag.rolloutPercent ?? null,
      source: 'org',
      metadata: flag.metadata != null ? (flag.metadata as Record<string, unknown>) : null,
    };
  }

  /**
   * DELETE /flags/:key — ADMIN. Removes the org-specific override for a key,
   * causing it to fall back to the global default.
   */
  @Delete(':key')
  @Roles('ADMIN')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove org-specific flag override (admin only)' })
  async deleteFlag(@CurrentUser() user: SessionPayload, @Param('key') key: string): Promise<void> {
    await this.flagsService.deleteFlag(user.organizationId, key, user.userId);
  }
}
