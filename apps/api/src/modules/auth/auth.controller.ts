import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { acceptInvitationSchema } from './dto/sign-in.dto';
import {
  AcceptInvitationInput,
  AcceptInvitationResponse,
  DevBypassResponse,
  MeResponse,
  SignOutResponse,
} from './dto/sign-in.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { isStubMode } from '@levelup/auth-client';
import type { SessionPayload } from '@levelup/auth-client';
import { AuthRateLimit, AuthRateLimitGuard } from './guards/auth-rate-limit.guard';

@ApiTags('auth')
@Controller('auth')
@UseGuards(AuthRateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Dev-only stub login. Mints a Supabase-shaped JWT and returns it; the
   * client stores it in localStorage for the Supabase JS client to consume.
   *
   * Disabled outside of stub mode (returns 404). Rate-limited 30/min/IP.
   */
  @Public()
  @Get('dev-bypass')
  @AuthRateLimit('dev-bypass', 30)
  @ApiOperation({ summary: 'Dev-only stub login (only active in stub mode)' })
  async devBypass(@Query('email') email: string): Promise<DevBypassResponse> {
    if (!isStubMode()) {
      throw new NotFoundException('Not found');
    }
    if (typeof email !== 'string' || email.length === 0) {
      throw new BadRequestException('Missing email query parameter');
    }
    const { accessToken, redirectTo } = await this.authService.handleDevBypass(email);
    return { accessToken, redirectTo };
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Audit-log sign-out (Supabase clears its own cookie)' })
  async signOut(@CurrentUser() user: SessionPayload): Promise<SignOutResponse> {
    await this.authService.writeSignOutAuditLog(user);
    return { ok: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Return the authenticated user and their org name' })
  async me(@CurrentUser() user: SessionPayload): Promise<MeResponse> {
    return this.authService.getMe(user);
  }

  /**
   * Accept an invitation. Creates/updates the User row inside the invited org
   * BEFORE the user runs Supabase sign-up — that way when their first JWT
   * arrives at the API, the email lookup finds the prepared row and attaches
   * the supabaseUserId.
   *
   * Public + IP rate-limited because the caller has no JWT yet.
   */
  @Public()
  @Post('accept-invitation')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit('accept-invitation', 5)
  @ApiOperation({ summary: 'Accept an invitation, creating/updating the User row' })
  async acceptInvitation(
    @Body(new ZodValidationPipe(acceptInvitationSchema)) body: AcceptInvitationInput,
    @Req() req: Request,
    @Res({ passthrough: true }) _res: Response,
  ): Promise<AcceptInvitationResponse> {
    const ipAddress = (req.headers['x-forwarded-for'] as string | undefined) ?? req.ip;
    const { redirect, email } = await this.authService.acceptInvitation(body, ipAddress);
    return { ok: true, redirect, email };
  }
}
