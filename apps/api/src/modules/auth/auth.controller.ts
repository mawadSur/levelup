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
import { acceptInvitationSchema, signInRequestSchema } from './dto/sign-in.dto';
import {
  AcceptInvitationInput,
  AcceptInvitationResponse,
  DevBypassResponse,
  MeResponse,
  SignInRequest,
  SignInResponse,
  SignOutResponse,
} from './dto/sign-in.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { isStubMode, serializeCookie } from '@levelup/auth-client';
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

  /**
   * Password sign-in proxy. The web client used to call
   * `supabase.auth.signInWithPassword` from the browser, which left no place
   * for our rate-limit substrate to gate brute-force attempts. This route
   * sits behind `AuthRateLimitGuard` (10 attempts/min/IP, Redis-backed) and
   * forwards to Supabase under the anon key. OAuth and magic-link flows stay
   * client-side — they have negligible brute-force risk and Supabase already
   * rate-limits them on the other side.
   */
  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit('sign-in', 10)
  @ApiOperation({ summary: 'Password sign-in (rate-limited per IP)' })
  async signIn(
    @Body(new ZodValidationPipe(signInRequestSchema)) body: SignInRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SignInResponse> {
    const result = await this.authService.signInWithPassword(body.email, body.password);

    // Additive hardening (lane H): alongside returning the access/refresh
    // tokens in the response body — which the web client still hands to
    // `supabase.auth.setSession(...)` to populate the SDK cookies — also
    // set the API-layer `levelup_session` cookie directly via
    // `Set-Cookie`. That gives the API a server-set, HttpOnly cookie
    // that's resistant to the Supabase SDK race conditions some users
    // hit when the page navigates before the SDK has finished writing
    // its own cookies. The response body shape is unchanged.
    //
    // `serializeCookie` already applies the right defaults (HttpOnly,
    // SameSite=Lax, Path=/, Secure in production, COOKIE_DOMAIN). We
    // pass an explicit `maxAge` of 8 hours to match the LevelUp session
    // TTL contract.
    res.setHeader('Set-Cookie', serializeCookie(result.accessToken, { maxAge: 60 * 60 * 8 }));

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
      redirectTo: result.redirectTo,
    };
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
