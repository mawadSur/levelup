import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { runCoach, type SensitiveResult } from '@levelup/llm';
import {
  IntegrationProvider,
  IntegrationStatus,
  Prisma,
  type OrganizationIntegration,
} from '@levelup/db';
import {
  buildCoachResponseBlocks,
  createSlackClient,
  encrypt,
  exchangeCode,
  handleSlackMessageEvent,
  type KnownBlock,
  type SlackConversation,
  type SlackEventAction,
  type SlackMessageEvent,
} from '@levelup/integrations-slack';
import { PrismaService } from '../prisma';
import { IntegrationsService } from './integrations.service';
import { IncidentsService } from '../incidents/incidents.service';
import { SlashCommandPayload } from './dto';

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
  // DLP inline scanner — required to receive `message.channels` / `message.im`
  // events and to list channels the bot can see in the admin UI.
  'channels:read',
  'channels:history',
  'groups:history',
  'im:history',
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
    // IncidentsService is owned by a separate module that may not yet be
    // wired into AppModule at this point in the build. `@Optional()` lets
    // the slack module boot regardless; when the incidents module is
    // imported we automatically forward HIGH-severity DLP hits.
    @Optional() @Inject(IncidentsService) private readonly incidents?: IncidentsService,
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

  // ---------------------------------------------------------------------
  // Inline DLP scanner (Slack Events API → message.channels / message.im)
  // ---------------------------------------------------------------------

  /**
   * Read the monitored-channel list out of the integration's metadata blob.
   * Returns an empty set when nothing is configured (the safe default — we
   * never scan a channel until an admin opts it in).
   */
  private readMonitoredChannels(integration: OrganizationIntegration): Set<string> {
    const meta = integration.metadata as Prisma.JsonValue | null;
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return new Set();
    const list = (meta as Record<string, unknown>)['monitoredChannels'];
    if (!Array.isArray(list)) return new Set();
    return new Set(list.filter((c): c is string => typeof c === 'string'));
  }

  /**
   * Process a single `message.*` event from the Slack Events API.
   *
   * Latency contract
   * ----------------
   * The HTTP controller acknowledges Slack within ~10ms and schedules this
   * method via `setImmediate`. The scanner itself targets <200ms end-to-end
   * for the ephemeral reply (the warning has to arrive while the sender is
   * still looking at the thread). Hard caps:
   *   - regex stage in `classifySensitive` is O(text length × patterns),
   *     well under 5ms for realistic message sizes;
   *   - LLM stage already has a 1s AbortController timeout in
   *     `@levelup/llm/sensitive.ts`;
   *   - `chat.postEphemeral` round-trip is ~50–150ms p50.
   *
   * Side effects: writes one `slack.sensitive_data_warned` audit row per
   * flagged message; on HIGH/CRITICAL severity, also forwards to
   * `IncidentsService.maybeOpenIncident` when that service is wired.
   */
  async processIncomingMessageEvent(args: {
    teamId: string;
    event: SlackMessageEvent;
  }): Promise<SlackEventAction> {
    const integration = await this.integrations.findByTeamId(
      IntegrationProvider.SLACK,
      args.teamId,
    );
    if (!integration) {
      return { action: 'ignored', reason: 'no_integration' };
    }

    const monitored = this.readMonitoredChannels(integration);
    // Short-circuit before reading tokens when nothing is opted in. This is
    // the common case and keeps the warm path off the DB-decrypt hot loop.
    if (monitored.size === 0) {
      return { action: 'ignored', reason: 'no_channels_monitored' };
    }

    const { botToken } = this.integrations.getDecryptedTokens(integration);
    if (!botToken) {
      this.logger.warn(`processIncomingMessageEvent: missing bot token for team ${args.teamId}`);
      return { action: 'ignored', reason: 'missing_bot_token' };
    }

    const client = createSlackClient(botToken);
    const result = await handleSlackMessageEvent({
      event: args.event,
      monitoredChannels: monitored,
      botUserId: integration.botUserId ?? null,
      client,
    });

    if (result.action === 'warned') {
      await this.recordSlackWarning(integration, args.event, result);
    }

    return result;
  }

  /**
   * Write the audit row for a flagged message and (HIGH/CRITICAL only)
   * forward to the incidents pipeline.
   *
   * Privacy invariant: NEVER persist the raw message text. We hash it with
   * SHA-256 and store only the digest — enough to dedupe / cross-reference
   * a Slack message ts without leaking content.
   */
  private async recordSlackWarning(
    integration: OrganizationIntegration,
    event: SlackMessageEvent,
    action: Extract<SlackEventAction, { action: 'warned' }>,
  ): Promise<void> {
    const messageHash = createHash('sha256')
      .update(event.text ?? '')
      .digest('hex');

    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: integration.organizationId,
          actorId: null, // Slack user_id ≠ LevelUp user_id; we keep it in metadata.
          action: 'slack.sensitive_data_warned',
          targetType: 'OrganizationIntegration',
          targetId: integration.id,
          metadata: {
            provider: 'SLACK',
            channel: event.channel ?? null,
            channelType: event.channel_type ?? null,
            slackUserId: event.user ?? null,
            ts: event.ts ?? null,
            messageHash,
            severity: action.scan.severity,
            categories: action.scan.categories,
            ephemeralPosted: action.ephemeralPosted,
            ephemeralError: action.ephemeralError ?? null,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.warn(
        `slack.sensitive_data_warned audit failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // HIGH or CRITICAL → escalate to the incidents pipeline if available.
    if (action.scan.severity === 'HIGH' || action.scan.severity === 'CRITICAL') {
      if (this.incidents) {
        const slackUser = event.user;
        const member = slackUser
          ? await this.lookupLevelUpUserBySlackId(integration, slackUser)
          : null;
        if (member) {
          // The Slack scanner returns a coarser type than the LLM
          // `SensitiveResult`; rebuild a minimal shape so the severity-rules
          // pipeline gets the categories it expects.
          const signal: SensitiveResult = {
            triggered: true,
            categories: action.scan.categories.filter(
              (c): c is SensitiveResult['categories'][number] =>
                c === 'pii' ||
                c === 'phi' ||
                c === 'payment' ||
                c === 'credentials' ||
                c === 'customer_data',
            ),
          };
          if (action.scan.primaryReason) {
            signal.reason = action.scan.primaryReason;
          }
          await this.incidents.maybeOpenIncident({
            organizationId: integration.organizationId,
            userId: member.id,
            signal,
            // We never persist raw Slack text; pass an empty input snippet so
            // the incident's `signal.inputSnippet` records "redacted by policy".
            userInput: '[slack message — content redacted by DLP policy]',
            triggeredBy: 'slack',
          });
        }
      } else {
        // TODO(integrations): IncidentsService isn't wired here yet — agent
        // #3 owns wiring it into AppModule. Once that's done, the @Optional()
        // injection above starts forwarding HIGH/CRITICAL Slack hits.
        this.logger.warn(
          'IncidentsService not injected — HIGH-severity Slack DLP hit was warned but not opened as an incident',
        );
      }
    }
  }

  /**
   * Resolve a Slack user_id → LevelUp user via email lookup. Returns null
   * when the Slack user has no LevelUp account or email isn't visible.
   */
  private async lookupLevelUpUserBySlackId(
    integration: OrganizationIntegration,
    slackUserId: string,
  ): Promise<{ id: string } | null> {
    const { botToken } = this.integrations.getDecryptedTokens(integration);
    if (!botToken) return null;
    const email = await this.lookupSlackUserEmail(botToken, slackUserId);
    if (!email) return null;
    return this.prisma.user.findFirst({
      where: {
        organizationId: integration.organizationId,
        email: email.toLowerCase(),
        deactivatedAt: null,
      },
      select: { id: true },
    });
  }

  // ---------------------------------------------------------------------
  // Monitored-channels admin endpoints
  // ---------------------------------------------------------------------

  /**
   * List public + private channels the bot can see in the workspace.
   * Used by the admin UI to populate the opt-in checkbox list. Includes
   * a `monitored` flag so the UI can pre-check the boxes.
   */
  async listAvailableChannels(
    organizationId: string,
  ): Promise<
    Array<{ id: string; name: string; isPrivate: boolean; isMember: boolean; monitored: boolean }>
  > {
    const integration = await this.integrations.getOrThrow(
      organizationId,
      IntegrationProvider.SLACK,
    );
    const monitored = this.readMonitoredChannels(integration);

    const { botToken } = this.integrations.getDecryptedTokens(integration);
    if (!botToken) {
      throw new BadRequestException('Slack integration is missing a bot token; please reinstall.');
    }
    const client = createSlackClient(botToken);

    const collected: SlackConversation[] = [];
    let cursor: string | undefined;
    // Defensive cap — Slack workspaces with thousands of channels would
    // exhaust the request budget; the UI surfaces 1000 max.
    for (let page = 0; page < 10; page++) {
      const resp = await client.conversations.list({
        types: 'public_channel,private_channel',
        limit: 200,
        exclude_archived: true,
        ...(cursor ? { cursor } : {}),
      });
      if (!resp.ok) {
        this.logger.warn(`Slack conversations.list error: ${resp.error ?? 'unknown'}`);
        break;
      }
      for (const c of resp.channels ?? []) collected.push(c);
      cursor = resp.response_metadata?.next_cursor;
      if (!cursor) break;
    }

    return collected.map((c) => ({
      id: c.id,
      name: c.name ?? c.id,
      isPrivate: Boolean(c.is_private),
      isMember: Boolean(c.is_member),
      monitored: monitored.has(c.id),
    }));
  }

  async setMonitoredChannels(
    organizationId: string,
    actorId: string,
    channelIds: string[],
  ): Promise<{ monitoredChannels: string[] }> {
    const integration = await this.integrations.getOrThrow(
      organizationId,
      IntegrationProvider.SLACK,
    );

    // Replace, don't merge — admin sends the full desired list.
    const next = Array.from(new Set(channelIds));
    const previous = Array.from(this.readMonitoredChannels(integration));
    const meta = (integration.metadata as Record<string, unknown> | null) ?? {};
    const nextMeta: Record<string, unknown> = { ...meta, monitoredChannels: next };

    await this.prisma.organizationIntegration.update({
      where: { id: integration.id },
      data: { metadata: nextMeta as Prisma.InputJsonValue },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId,
        action: 'slack.monitored_channels_updated',
        targetType: 'OrganizationIntegration',
        targetId: integration.id,
        metadata: {
          provider: 'SLACK',
          previousCount: previous.length,
          nextCount: next.length,
          added: next.filter((c) => !previous.includes(c)),
          removed: previous.filter((c) => !next.includes(c)),
        } as Prisma.InputJsonValue,
      },
    });

    return { monitoredChannels: next };
  }

  async getMonitoredChannels(organizationId: string): Promise<{
    monitoredChannels: string[];
    consentVersion: string | null;
  }> {
    const integration = await this.integrations.findActive(
      organizationId,
      IntegrationProvider.SLACK,
    );
    if (!integration) {
      return { monitoredChannels: [], consentVersion: null };
    }
    const meta = (integration.metadata as Record<string, unknown> | null) ?? {};
    const consent =
      typeof meta['consentVersion'] === 'string' ? (meta['consentVersion'] as string) : null;
    return {
      monitoredChannels: Array.from(this.readMonitoredChannels(integration)),
      consentVersion: consent,
    };
  }

  async recordConsent(
    organizationId: string,
    actorId: string,
    consentVersion: string,
  ): Promise<{ consentVersion: string }> {
    const integration = await this.integrations.getOrThrow(
      organizationId,
      IntegrationProvider.SLACK,
    );
    const meta = (integration.metadata as Record<string, unknown> | null) ?? {};
    const nextMeta: Record<string, unknown> = {
      ...meta,
      consentVersion,
      consentedAt: new Date().toISOString(),
      consentedBy: actorId,
    };
    await this.prisma.organizationIntegration.update({
      where: { id: integration.id },
      data: { metadata: nextMeta as Prisma.InputJsonValue },
    });
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId,
        action: 'slack.scanner_consent_accepted',
        targetType: 'OrganizationIntegration',
        targetId: integration.id,
        metadata: { provider: 'SLACK', consentVersion } as Prisma.InputJsonValue,
      },
    });
    return { consentVersion };
  }
}
