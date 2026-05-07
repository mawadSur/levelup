import { Body, Controller, Get, Patch, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { OrganizationsService } from './organizations.service';
import { updateOrgSchema } from './dto/update-org.dto';
import type { UpdateOrgDto } from './dto/update-org.dto';
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
}
