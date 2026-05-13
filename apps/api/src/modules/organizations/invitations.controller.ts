import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { InvitationsService } from './invitations.service';
import { inviteUserSchema } from './dto/invite-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';

@Controller('invitations')
@UseGuards(AuthGuard, RoleGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('preview/:token')
  @Public()
  previewInvitation(@Param('token') token: string) {
    return this.invitationsService.previewInvitation(token);
  }

  @Post()
  @Roles('ADMIN')
  createInvitation(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(inviteUserSchema)) dto: InviteUserDto,
  ) {
    return this.invitationsService.createInvitation(user, dto);
  }

  @Get()
  @Roles('MANAGER')
  listInvitations(@CurrentUser() user: SessionPayload) {
    return this.invitationsService.listInvitations(user);
  }

  @Post(':id/resend')
  @Roles('ADMIN')
  resendInvitation(@CurrentUser() user: SessionPayload, @Param('id') id: string) {
    return this.invitationsService.resendInvitation(user, id);
  }

  @Post(':id/revoke')
  @Roles('ADMIN')
  revokeInvitation(@CurrentUser() user: SessionPayload, @Param('id') id: string) {
    return this.invitationsService.revokeInvitation(user, id);
  }
}
