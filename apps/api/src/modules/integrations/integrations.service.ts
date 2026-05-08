import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { IntegrationProvider } from '@levelup/db';
import { IntegrationStatus, type OrganizationIntegration } from '@levelup/db';
import type { IntegrationSummary } from '@levelup/types';
import { decrypt } from '@levelup/integrations-slack';
import { PrismaService } from '../prisma';

/**
 * IntegrationsService
 *
 * Provider-agnostic helpers for the OrganizationIntegration table:
 *   - listing for the admin UI (with masked tokens)
 *   - fetching a single row
 *   - decrypting the access/bot tokens for downstream use
 *
 * Slack-specific install/revoke flows live in SlackService.
 */
@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listForOrg(organizationId: string): Promise<IntegrationSummary[]> {
    const rows = await this.prisma.organizationIntegration.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        installedBy: { select: { name: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      status: row.status,
      externalTeamId: row.externalTeamId,
      externalTeamName: row.externalTeamName,
      installedAt: row.createdAt.toISOString(),
      installedByName: row.installedBy?.name ?? null,
      scopes: (row.scopes ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }));
  }

  async findActive(
    organizationId: string,
    provider: IntegrationProvider,
  ): Promise<OrganizationIntegration | null> {
    return this.prisma.organizationIntegration.findFirst({
      where: { organizationId, provider, status: IntegrationStatus.ACTIVE },
    });
  }

  async findByTeamId(
    provider: IntegrationProvider,
    externalTeamId: string,
  ): Promise<OrganizationIntegration | null> {
    return this.prisma.organizationIntegration.findFirst({
      where: { provider, externalTeamId, status: IntegrationStatus.ACTIVE },
    });
  }

  async getOrThrow(
    organizationId: string,
    provider: IntegrationProvider,
  ): Promise<OrganizationIntegration> {
    const found = await this.prisma.organizationIntegration.findFirst({
      where: { organizationId, provider },
    });
    if (!found) {
      throw new NotFoundException(`No ${provider} integration for this org`);
    }
    return found;
  }

  /**
   * Decrypt the stored OAuth tokens for an integration row. Bot token may be
   * absent for legacy/manual rows; callers must handle null.
   *
   * NEVER log the returned values — they're equivalent to passwords.
   */
  getDecryptedTokens(integration: OrganizationIntegration): {
    accessToken: string;
    botToken: string | null;
  } {
    return {
      accessToken: decrypt(integration.accessToken),
      botToken: integration.botToken ? decrypt(integration.botToken) : null,
    };
  }

  async markStatus(integrationId: string, status: IntegrationStatus): Promise<void> {
    await this.prisma.organizationIntegration.update({
      where: { id: integrationId },
      data: { status },
    });
  }
}
