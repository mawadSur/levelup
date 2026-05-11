import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { runCoach } from '@levelup/llm';
import { IntegrationProvider, IntegrationStatus, type OrganizationIntegration } from '@levelup/db';
import {
  buildCoachResponseBlocks,
  createSlackClient,
  encrypt,
  exchangeCode,
  type KnownBlock,
} from '@levelup/integrations-slack';
import type { PrismaService } from '../prisma';
import type { IntegrationsService } from './integrations.service';
import type { SlashCommandPayload } from './dto';

/**
 * Scopes requested at install time.
 *
 * Each is required for a specific v1 feature:
 *   - chat:write          — post DMs / digests
 *   - commands            — receive `/levelup` slash commands
 *   - im:write            — open DM channels with users
 *   - users:read          — required for users:read.email
 *   - users:read.email    — map Slack user_id ↔ LevelUp user via email
 *   - team:read           — read workspace name for the install card
 */
export const SLACK_DEFAULT_SCOPES = [
  'chat:write',
  'commands',
  'im:write',
  'users:read',
  'users:read.email',
  'team:read',
];

interface CachedLookup {
  slackUserId: string | null;
  expiresAt: number;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  // 1-hour TTL on email→userId lookups. Slack rate limits users.lookupByEmail
  // aggressively (T2 — ~20/min) so the cache prevents thrash on the digest
  // fan-out path.
  private readonly LOOKUP_TTL_MS = 60 * 60 * 1000;
  private readonly emailLookupCache = new Map<string, CachedLookup>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
  ) {}

  // ---------------------------------------------------------------------
  // Install / revoke
  // ---------------------------------------------------------------------

  async installFromCallback(
    code: string,
    organizationId: string,
    installedById: string,
  ): Promise<OrganizationIntegration> {
    const clientId = this.requireEnv('SLACK_CLIENT_ID');
    const clientSecret = this.requireEnv('SLACK_CLIENT_SECRET');
    const redirectUri = this.installRedirectUri();

    const result = await exchangeCode({
      code,
      clientId,
      clientSecret,
      redirectUri,
    });

    // Encrypt tokens at the boundary — the DB never sees plaintext.
    const accessTokenEnc = encrypt(result.accessToken);
    const botTokenEnc = encrypt(result.botToken);

    const row = await this.prisma.organizationIntegration.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider: IntegrationProvider.SLACK,
        },
      },
      create: {
        organizationId,
        provider: IntegrationProvider.SLACK,
        status: IntegrationStatus.ACTIVE,
        externalTeamId: result.teamId,
        externalTeamName: result.teamName,
        accessToken: accessTokenEnc,
        botToken: botTokenEnc,
        botUserId: result.botUserId,
        scopes: result.scopes.join(','),
        installedById,
      },
      update: {
        status: IntegrationStatus.ACTIVE,
        externalTeamId: result.teamId,
        externalTeamName: result.teamName,
        accessToken: accessTokenEnc,
        botToken: botTokenEnc,
        botUserId: result.botUserId,
        scopes: result.scopes.join(','),
        installedById,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: installedById,
        action: 'integration.install',
        targetType: 'OrganizationIntegration',
        targetId: row.id,
        metadata: {
          provider: 'SLACK',
          teamId: result.teamId,
          teamName: result.teamName ?? null,
          scopes: result.scopes,
        },
      },
    });

    return row;
  }

  /**
   * Mark the integration for a given Slack team as REVOKED. Called when Slack
   * sends an `app_uninstalled` event — we may not know the organizationId
   * directly, so we look up by external team id.
   */
  async markRevoked(teamId: string): Promise<void> {
    const integration = await this.integrations.findByTeamId(IntegrationProvider.SLACK, teamId);
    if (!integration) {
      this.logger.warn(`markRevoked: no active Slack integration for team ${teamId}`);
      return;
    }
    await this.integrations.markStatus(integration.id, IntegrationStatus.REVOKED);
    await this.prisma.auditLog.create({
      data: {
        organizationId: integration.organizationId,
        actorId: null,
        action: 'integration.revoke',
        targetType: 'OrganizationIntegration',
        targetId: integration.id,
        metadata: { provider: 'SLACK', trigger: 'app_uninstalled' },
      },
    });
  }

  async revoke(organizationId: string, actorId: string): Promise<void> {
    const integration = await this.integrations.getOrThrow(
      organizationId,
      IntegrationProvider.SLACK,
    );

    // Best-effort token revoke at Slack — even if it fails we still mark
    // ours as REVOKED so the org isn't stuck.
    try {
      const { botToken, accessToken } = this.integrations.getDecryptedTokens(integration);
      const tokenForRevoke = botToken ?? accessToken;
      const client = createSlackClient(tokenForRevoke);
      const resp = await client.auth.revoke();
      if (!resp.ok) {
        this.logger.warn(`Slack auth.revoke returned not-ok: ${resp.error ?? 'unknown'}`);
      }
    } catch (err) {
      this.logger.warn(
        `Slack auth.revoke failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    await this.integrations.markStatus(integration.id, IntegrationStatus.REVOKED);

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId,
        action: 'integration.revoke',
        targetType: 'OrganizationIntegration',
        targetId: integration.id,
        metadata: { provider: 'SLACK' },
      },
    });
  }

  // ---------------------------------------------------------------------
  // Lookups & messaging
  // ---------------------------------------------------------------------

  async getIntegration(organizationId: string): Promise<OrganizationIntegration | null> {
    return this.integrations.findActive(organizationId, IntegrationProvider.SLACK);
  }

  async findSlackUserByEmail(
    organizationId: string,
    email: string,
  ): Promise<{ slackUserId: string } | null> {
    const cacheKey = `${organizationId}:${email.toLowerCase()}`;
    const cached = this.emailLookupCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.slackUserId ? { slackUserId: cached.slackUserId } : null;
    }

    const integration = await this.getIntegration(organizationId);
    if (!integration) return null;

    const { botToken } = this.integrations.getDecryptedTokens(integration);
    if (!botToken) return null;

    const client = createSlackClient(botToken);
    const resp = await client.users.lookupByEmail({ email });

    let resolved: string | null = null;
    if (resp.ok && resp.user?.id) {
      resolved = resp.user.id;
    } else if (resp.error && resp.error !== 'users_not_found') {
      // Don't cache transport-style errors — let the next call retry.
      this.logger.warn(`Slack users.lookupByEmail error: ${resp.error}`);
      return null;
    }

    this.emailLookupCache.set(cacheKey, {
      slackUserId: resolved,
      expiresAt: Date.now() + this.LOOKUP_TTL_MS,
    });

    return resolved ? { slackUserId: resolved } : null;
  }

  async sendMessage(
    organizationId: string,
    slackUserId: string,
    blocks: KnownBlock[],
    fallbackText?: string,
  ): Promise<{ messageId: string }> {
    const integration = await this.getIntegration(organizationId);
    if (!integration) {
      throw new NotFoundException('No active Slack integration for this org');
    }
    const { botToken } = this.integrations.getDecryptedTokens(integration);
    if (!botToken) {
      throw new NotFoundException('Slack integration is missing a bot token');
    }

    const client = createSlackClient(botToken);

    // Open a DM with the user. Slack requires us to first call
    // conversations.open to get a channel id for the IM channel.
    const openResp = await client.conversations.open({ users: slackUserId });
    if (!openResp.ok || !openResp.channel?.id) {
      throw new BadRequestException(
        `Could not open Slack DM: ${openResp.error ?? 'unknown error'}`,
      );
    }

    const postResp = await client.chat.postMessage({
      channel: openResp.channel.id,
      blocks,
      // `text` is REQUIRED by Slack as the notification fallback even when
      // blocks are present — without it, the notification preview is empty.
      text: fallbackText ?? 'Update from LevelUp AI Academy',
    });

    if (!postResp.ok || !postResp.ts) {
      throw new BadRequestException(
        `Slack chat.postMessage failed: ${postResp.error ?? 'unknown error'}`,
      );
    }
    return { messageId: postResp.ts };
  }

  // ---------------------------------------------------------------------
  // Slash command (`/levelup <prompt>`)
  // ---------------------------------------------------------------------

  /**
   * Handle a verified slash command and return the blocks to post back.
   *
   * Sync-vs-async tradeoff: Slack expects a 200 within 3 seconds. We accept
   * that cap rather than introducing a BullMQ round-trip because the coach
   * response in stub mode is <100ms and in real mode usually <2s. If we
   * start exceeding the cap regularly (production telemetry), the controller
   * will need to ack 200 immediately and POST to `response_url` async.
   */
  async handleSlashCommand(input: SlashCommandPayload): Promise<{ blocks: KnownBlock[] }> {
    const integration = await this.integrations.findByTeamId(
      IntegrationProvider.SLACK,
      input.team_id,
    );

    if (!integration) {
      return {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                ':x: This Slack workspace is not connected to a LevelUp organisation. ' +
                'An admin must install the LevelUp app first.',
            },
          },
        ],
      };
    }

    // Resolve the Slack user → LevelUp user via email.
    const { botToken } = this.integrations.getDecryptedTokens(integration);
    if (!botToken) {
      return this.simpleResponse(
        'LevelUp Slack integration is missing a bot token; please reinstall.',
      );
    }

    // We need users.info (lookupByEmail goes the other direction). The
    // helper below reads users.info with the bot token and returns the
    // profile email if visible.
    const slackUserEmail = await this.lookupSlackUserEmail(botToken, input.user_id);
    if (!slackUserEmail) {
      return this.simpleResponse(
        "I couldn't read your email from Slack — make sure the LevelUp app has the `users:read.email` scope.",
      );
    }

    const member = await this.prisma.user.findFirst({
      where: {
        organizationId: integration.organizationId,
        email: slackUserEmail.toLowerCase(),
        deactivatedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        jobTitle: true,
        aiLevel: true,
        department: { select: { name: true } },
      },
    });

    if (!member) {
      return this.simpleResponse(
        "You're not a LevelUp user yet — please sign in at https://app.levelup.example first.",
      );
    }

    const trimmed = input.text.trim();
    if (!trimmed) {
      return this.simpleResponse(
        'Usage: `/levelup <your prompt>`. Example: `/levelup How should I summarise this customer call?`',
      );
    }

    const policy = await this.prisma.companyPolicy.findFirst({
      where: { organizationId: integration.organizationId },
      orderBy: { version: 'desc' },
      select: { policyText: true },
    });

    const aiLevel =
      member.aiLevel === 'BEGINNER'
        ? 'beginner'
        : member.aiLevel === 'PRACTITIONER'
          ? 'intermediate'
          : 'advanced';

    const output = await runCoach({
      userInput: trimmed,
      jobTitle: member.jobTitle ?? 'Employee',
      department: member.department?.name ?? 'General',
      aiLevel,
      companyPolicy: policy?.policyText ?? '',
      userId: member.id,
    });

    // Audit — slash command produced a coach response.
    await this.prisma.auditLog.create({
      data: {
        organizationId: integration.organizationId,
        actorId: member.id,
        action: 'integration.slack_slash_command',
        targetType: 'OrganizationIntegration',
        targetId: integration.id,
        metadata: {
          provider: 'SLACK',
          command: input.command,
          model: output.model,
          stub: output.stub,
        },
      },
    });

    return { blocks: buildCoachResponseBlocks(output) };
  }

  /**
   * Fetch a Slack user's email via users.info. Implemented inline because
   * our minimal WebClient surface only exposes lookupByEmail; users.info is
   * a one-liner against the Slack REST API.
   */
  private async lookupSlackUserEmail(
    botToken: string,
    slackUserId: string,
  ): Promise<string | null> {
    const params = new URLSearchParams({ user: slackUserId });
    const res = await fetch(`https://slack.com/api/users.info?${params.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${botToken}` },
    });
    const json = (await res.json()) as {
      ok: boolean;
      error?: string;
      user?: { profile?: { email?: string } };
    };
    if (!json.ok) {
      this.logger.warn(`Slack users.info error: ${json.error ?? 'unknown'}`);
      return null;
    }
    return json.user?.profile?.email?.toLowerCase() ?? null;
  }

  private simpleResponse(text: string): { blocks: KnownBlock[] } {
    return {
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }],
    };
  }

  // ---------------------------------------------------------------------
  // Misc helpers
  // ---------------------------------------------------------------------

  private installRedirectUri(): string {
    const apiBase =
      process.env['API_PUBLIC_URL'] ?? `http://localhost:${process.env['API_PORT'] ?? '4000'}`;
    return `${apiBase}/api/integrations/slack/callback`;
  }

  private requireEnv(key: string): string {
    const v = process.env[key];
    if (!v || v.length === 0) {
      throw new BadRequestException(`Slack integration not configured: missing ${key} env var`);
    }
    return v;
  }
}
