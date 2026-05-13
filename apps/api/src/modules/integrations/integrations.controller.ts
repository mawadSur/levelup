import { Controller, Delete, Get, HttpCode, Param, ParseEnumPipe, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SessionPayload } from '@levelup/auth-client';
import { IntegrationProvider } from '@levelup/db';
import { IntegrationSummary } from '@levelup/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { IntegrationsService } from './integrations.service';
import { SlackService } from './slack.service';

/**
 * Generic integration listing/management endpoints.
 *
 * Slack-specific OAuth flow + webhooks live in `SlackController`.
 */
@ApiTags('integrations')
@Controller('integrations')
@UseGuards(AuthGuard, RoleGuard)
export class IntegrationsController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly slackService: SlackService,
  ) {}

  /**
   * GET /integrations — return active + revoked integrations for the org.
   * Tokens are NEVER serialized; the service maps to a masked summary.
   */
  @Get()
  @Roles('ADMIN')
  async list(@CurrentUser() user: SessionPayload): Promise<IntegrationSummary[]> {
    return this.integrations.listForOrg(user.organizationId);
  }

  /**
   * DELETE /integrations/:provider — revoke and mark REVOKED.
   *
   * For SLACK we additionally call auth.revoke at Slack to invalidate the
   * bot token even if the row never gets deleted. Other providers may add
   * their own revoke flows (MS Teams: TBD).
   */
  @Delete(':provider')
  @Roles('ADMIN')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: SessionPayload,
    @Param('provider', new ParseEnumPipe(IntegrationProvider))
    provider: IntegrationProvider,
  ): Promise<void> {
    if (provider === IntegrationProvider.SLACK) {
      await this.slackService.revoke(user.organizationId, user.userId);
      return;
    }
    // For now MS_TEAMS is "coming soon" — we still expose a 204 path so the
    // UI can render a uniform card without a special-case.
    const integration = await this.integrations.getOrThrow(user.organizationId, provider);
    await this.integrations.markStatus(integration.id, 'REVOKED');
  }
}
