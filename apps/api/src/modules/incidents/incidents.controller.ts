import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionPayload } from '@levelup/auth-client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { IncidentsService, type IncidentDetail, type IncidentDto } from './incidents.service';
import {
  incidentDismissSchema,
  incidentListQuerySchema,
  type IncidentDismissRequest,
  type IncidentListQuery,
} from './dto/incident-request.dto';

/**
 * IncidentsController.
 *
 * AuthGuard is registered globally (APP_GUARD) so every route here is
 * authenticated. MANAGER+ is enforced via `@Roles('MANAGER')` together with
 * `@UseGuards(RoleGuard)` on the listing + state-transition routes.
 *
 * The detail route `GET /:id` intentionally does NOT carry `@Roles` — the
 * actor user is also allowed to see their own incident, and that "actor OR
 * MANAGER+" decision is made inside the service.
 */
@ApiTags('incidents')
@Controller('incidents')
@UseGuards(RoleGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  @Roles('MANAGER')
  async list(
    @CurrentUser() user: SessionPayload,
    @Query(new ZodValidationPipe(incidentListQuerySchema)) query: IncidentListQuery,
  ): Promise<{ items: IncidentDto[] }> {
    return this.incidentsService.list(user, {
      severity: query.severity,
      status: query.status,
      includeResolvedSinceDays: query.includeResolvedSinceDays,
      limit: query.limit,
    });
  }

  @Get(':id')
  detail(@CurrentUser() user: SessionPayload, @Param('id') id: string): Promise<IncidentDetail> {
    return this.incidentsService.get(user, id);
  }

  @Post(':id/acknowledge')
  @Roles('MANAGER')
  acknowledge(@CurrentUser() user: SessionPayload, @Param('id') id: string): Promise<IncidentDto> {
    return this.incidentsService.acknowledge(user, id);
  }

  @Post(':id/promote')
  @Roles('MANAGER')
  promote(@CurrentUser() user: SessionPayload, @Param('id') id: string): Promise<IncidentDto> {
    return this.incidentsService.promote(user, id);
  }

  @Post(':id/dismiss')
  @Roles('MANAGER')
  dismiss(
    @CurrentUser() user: SessionPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(incidentDismissSchema)) body: IncidentDismissRequest,
  ): Promise<IncidentDto> {
    return this.incidentsService.dismiss(user, id, body.reason);
  }

  @Post(':id/remediated')
  @Roles('MANAGER')
  remediated(@CurrentUser() user: SessionPayload, @Param('id') id: string): Promise<IncidentDto> {
    return this.incidentsService.remediated(user, id);
  }
}
