import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { OrganizationsService } from './organizations.service';
import { updateOrgSchema } from './dto/update-org.dto';
import { UpdateOrgDto } from './dto/update-org.dto';
import { createOrganizationSchema } from '@levelup/types';
import type { CreateOrganizationInput } from '@levelup/types';
@Controller('organizations')
@UseGuards(AuthGuard, RoleGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Public()
  createOrganization(
    @Body(new ZodValidationPipe(createOrganizationSchema)) dto: CreateOrganizationInput,
    @Req() req: Request,
  ) {
    const ip = req.ip ?? '0.0.0.0';
    return this.organizationsService.createOrganization(dto, ip);
  }

  @Get('me')
  getMyOrg(@CurrentUser() user: SessionPayload) {
    return this.organizationsService.getMyOrg(user);
  }

  @Patch('me')
  @Roles('ADMIN')
  updateMyOrg(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(updateOrgSchema)) dto: UpdateOrgDto,
  ) {
    return this.organizationsService.updateMyOrg(user, dto);
  }

  @Get('me/stats')
  @Roles('MANAGER')
  getOrgStats(@CurrentUser() user: SessionPayload) {
    return this.organizationsService.getOrgStats(user);
  }

  // GET /organizations/:id/activity?limit=20 — admin-only org-wide stream.
  // The path id is validated against the caller's org inside the service so
  // an ADMIN cannot peek into another tenant's events.
  @Get(':id/activity')
  @Roles('ADMIN')
  getOrgActivity(
    @CurrentUser() user: SessionPayload,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? parseInt(limit, 10) : 20;
    const clamped = Number.isFinite(parsed) ? parsed : 20;
    return this.organizationsService.listOrgActivity(user, id, clamped);
  }
}
