import { Body, Controller, Get, HttpCode, Post, Query, Redirect, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SessionPayload } from '@levelup/auth-client';
import { getInstallUrl } from '@levelup/integrations-slack';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { SlackSignatureGuard } from './slack-signature.guard';
import { SlackService } from './slack.service';
import { SLACK_DEFAULT_SCOPES } from './slack.service';
import {
  slashCommandPayloadSchema,
  slackEventEnvelopeSchema,
  type SlashCommandPayload,
} from './dto';
import { KnownBlock } from '@levelup/integrations-slack';

// ---------------------------------------------------------------------------
// State HMAC helpers
// ---------------------------------------------------------------------------

function signState(payload: string): string {
  const secret = process.env['SESSION_SECRET'] ?? 'dev-fallback-secret';
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function verifySignedState(state: string): { organizationId: string; userId: string } | null {
  // state format: <orgId>:<userId>:<sig>
  const parts = state.split(':');
  if (parts.length !== 3) return null;
  const [orgId, userId, sig] = parts as [string, string, string];
  const expected = signState(`${orgId}:${userId}`);
  try {
    if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null;
    return { organizationId: orgId, userId };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@ApiTags('integrations')
@Controller('integrations/slack')
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  // -------------------------------------------------------------------------
  // GET /integrations/slack/install — Admin-only; redirects to Slack OAuth
  // -------------------------------------------------------------------------

  @Get('install')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('ADMIN')
  @Redirect()
  install(@CurrentUser() user: SessionPayload): { url: string; statusCode: number } {
    const clientId = process.env['SLACK_CLIENT_ID'];
    if (!clientId) {
      // Redirect back with a human-readable error rather than a 500 stack
      return {
        url: '/admin/integrations?error=slack_not_configured',
        statusCode: 302,
      };
    }

    const apiBase =
      process.env['API_PUBLIC_URL'] ?? `http://localhost:${process.env['API_PORT'] ?? '4000'}`;

    const redirectUri = `${apiBase}/api/integrations/slack/callback`;

    // Sign state so callback can verify the initiating admin without a server
    // session store. Format: orgId:userId:sig
    const statePayload = `${user.organizationId}:${user.userId}`;
    const sig = signState(statePayload);
    const state = `${statePayload}:${sig}`;

    const url = getInstallUrl({
      clientId,
      scopes: SLACK_DEFAULT_SCOPES,
      redirectUri,
      state,
    });

    return { url, statusCode: 302 };
  }

  // -------------------------------------------------------------------------
  // GET /integrations/slack/callback — Public (Slack redirect target)
  // -------------------------------------------------------------------------

  @Get('callback')
  @Public()
  @Redirect()
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
  ): Promise<{ url: string; statusCode: number }> {
    const errorRedirect = {
      url: '/admin/integrations?error=slack_install_failed',
      statusCode: 302,
    };

    if (!code || !state) return errorRedirect;

    const verified = verifySignedState(state);
    if (!verified) return errorRedirect;

    try {
      await this.slackService.installFromCallback(code, verified.organizationId, verified.userId);
      return {
        url: '/admin/integrations/connected?provider=slack',
        statusCode: 302,
      };
    } catch {
      return errorRedirect;
    }
  }

  // -------------------------------------------------------------------------
  // POST /integrations/slack/events — Public (Slack Events API)
  // -------------------------------------------------------------------------

  @Post('events')
  @Public()
  @UseGuards(SlackSignatureGuard)
  @HttpCode(200)
  async events(@Body() body: unknown): Promise<unknown> {
    const parsed = slackEventEnvelopeSchema.safeParse(body);
    if (!parsed.success) {
      // Ack silently — malformed events we can't handle
      return { ok: true };
    }

    const envelope = parsed.data;

    // URL verification challenge (one-shot during app configuration)
    if (envelope.type === 'url_verification') {
      return { challenge: envelope.challenge };
    }

    // event_callback — branch on inner event type
    if (envelope.type === 'event_callback') {
      if (envelope.event.type === 'app_uninstalled') {
        await this.slackService.markRevoked(envelope.team_id);
      }
      // All other events: ack 200 silently
    }

    return { ok: true };
  }

  // -------------------------------------------------------------------------
  // POST /integrations/slack/commands — Public (Slack slash commands)
  // -------------------------------------------------------------------------

  @Post('commands')
  @Public()
  @UseGuards(SlackSignatureGuard)
  @HttpCode(200)
  async commands(@Body() body: unknown): Promise<{ blocks: KnownBlock[] }> {
    const parsed = slashCommandPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return {
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: ':x: Invalid slash command payload.' },
          },
        ],
      };
    }

    const payload: SlashCommandPayload = parsed.data;
    return this.slackService.handleSlashCommand(payload);
  }

  // -------------------------------------------------------------------------
  // POST /integrations/slack/interactivity — Public (Slack interactivity)
  // -------------------------------------------------------------------------

  @Post('interactivity')
  @Public()
  @UseGuards(SlackSignatureGuard)
  @HttpCode(200)
  interactivity(): { ok: boolean } {
    // v1: ack all interactive payloads; specific flows will be added here.
    return { ok: true };
  }
}
