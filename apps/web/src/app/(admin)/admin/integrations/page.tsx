import type { Metadata } from 'next';
import { Alert, AlertDescription, MonoLabel } from '@levelup/ui';
import { integrations as integrationsApi } from '@/lib/api';
import { InstallCard } from '@/components/admin/integrations/install-card';
import { SlackMonitoredChannels } from '@/components/admin/integrations/slack-monitored-channels';
import type { IntegrationSummary } from '@levelup/types';
import { brand } from '@/lib/client';

export const metadata: Metadata = {
  title: 'Integrations',
};

interface IntegrationsPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function IntegrationsPage({ searchParams }: IntegrationsPageProps) {
  const { error } = await searchParams;

  let integrationList: IntegrationSummary[] = [];
  try {
    integrationList = await integrationsApi.list();
  } catch {
    // Show empty state — user can still attempt install
  }

  const slackIntegration = integrationList.find((i) => i.provider === 'SLACK') ?? null;

  return (
    <div className="mx-auto max-w-content space-y-8 px-6 py-10">
      <header className="space-y-2">
        <MonoLabel>OPS / INTEGRATIONS</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">Integrations</h1>
        <p className="max-w-reading text-body text-paper-300">
          Connect {brand.shortName} to where your team already works.
        </p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error === 'slack_install_failed'
              ? 'Slack installation failed. Please try again or contact support.'
              : error === 'slack_not_configured'
                ? 'Slack integration is not configured on this server.'
                : `Something went wrong: ${error}`}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InstallCard provider="SLACK" integration={slackIntegration} />
        <InstallCard provider="MS_TEAMS" integration={null} comingSoon />
      </div>

      {slackIntegration?.status === 'ACTIVE' && <SlackMonitoredChannels />}
    </div>
  );
}
