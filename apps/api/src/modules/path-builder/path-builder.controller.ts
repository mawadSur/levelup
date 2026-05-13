/**
 * PathBuilderController — /path-builder/*
 *
 * AI-generated learning path management. ADMIN/MANAGER-only.
 *
 * Routes:
 *   POST   /path-builder/requests           Create + enqueue a generation
 *   GET    /path-builder/requests           List recent (last 50, org-scoped)
 *   GET    /path-builder/requests/:id       Read one (org-owner check)
 *   POST   /path-builder/requests/:id/accept   Materialize draft into a path
 *   POST   /path-builder/requests/:id/cancel   Cancel a pending generation
 */

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  acceptPathRequestSchema,
  createPathRequestSchema,
  type AcceptPathRequestInput,
  type CreatePathRequestInput,
} from '@levelup/types';
import { PathBuilderService } from './path-builder.service';

@Controller('path-builder')
@UseGuards(RoleGuard)
@Roles('MANAGER')
export class PathBuilderController {
  constructor(private readonly service: PathBuilderService) {}

  @Post('requests')
  createRequest(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(createPathRequestSchema))
    dto: CreatePathRequestInput,
  ) {
    return this.service.createRequest(user, dto);
  }

  @Get('requests')
  listRequests(@CurrentUser() user: SessionPayload) {
    return this.service.listRequests(user.organizationId);
  }

  @Get('requests/:id')
  getRequest(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.service.getRequest(id, user);
  }

  @Post('requests/:id/accept')
  async acceptRequest(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(acceptPathRequestSchema))
    dto: AcceptPathRequestInput,
  ) {
    return this.service.acceptDraft(id, user, dto.edits);
  }

  @Post('requests/:id/cancel')
  cancelRequest(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.service.cancelRequest(id, user);
  }
}
