'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plug, CheckCircle2, Clock } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@levelup/ui';
import { integrations } from '@/lib/api';
import type { IntegrationSummary } from '@levelup/types';

interface InstallCardProps {
  provider: 'SLACK' | 'MS_TEAMS';
  integration: IntegrationSummary | null;
  comingSoon?: boolean;
}

const PROVIDER_LABELS: Record<'SLACK' | 'MS_TEAMS', string> = {
  SLACK: 'Slack',
  MS_TEAMS: 'Microsoft Teams',
};

const PROVIDER_DESCRIPTIONS: Record<'SLACK' | 'MS_TEAMS', string> = {
  SLACK: 'Deliver weekly manager digests and respond to `/levelup` prompts directly in Slack.',
  MS_TEAMS: 'Deliver weekly manager digests and respond to prompts directly in Microsoft Teams.',
};

function ProviderIcon({ provider, size = 28 }: { provider: 'SLACK' | 'MS_TEAMS'; size?: number }) {
  if (provider === 'SLACK') {
    // Simplified Slack hashtag logo in brand colours
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="24" height="24" rx="5" fill="#4A154B" />
        <path
          d="M6.5 14.5a1.5 1.5 0 1 1-1.5-1.5H6.5v1.5zm.75 0a1.5 1.5 0 0 1 3 0v3.75a1.5 1.5 0 0 1-3 0V14.5z"
          fill="#E01E5A"
        />
        <path
          d="M9.5 6.5a1.5 1.5 0 1 1 1.5-1.5V6.5H9.5zm0 .75a1.5 1.5 0 0 1 0 3H5.75a1.5 1.5 0 0 1 0-3H9.5z"
          fill="#36C5F0"
        />
        <path
          d="M17.5 9.5a1.5 1.5 0 1 1 1.5 1.5H17.5V9.5zm-.75 0a1.5 1.5 0 0 1-3 0V5.75a1.5 1.5 0 0 1 3 0V9.5z"
          fill="#2EB67D"
        />
        <path
          d="M14.5 17.5a1.5 1.5 0 1 1-1.5 1.5V17.5h1.5zm0-.75a1.5 1.5 0 0 1 0-3h3.75a1.5 1.5 0 0 1 0 3H14.5z"
          fill="#ECB22E"
        />
      </svg>
    );
  }

  return <Plug size={size} className="text-muted-foreground" />;
}

export function InstallCard({ provider, integration, comingSoon }: InstallCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [disconnecting, setDisconnecting] = useState(false);

  const label = PROVIDER_LABELS[provider];
  const description = PROVIDER_DESCRIPTIONS[provider];

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await integrations.remove(provider);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      // surface error state; re-enable button
    } finally {
      setDisconnecting(false);
    }
  }

  if (comingSoon) {
    return (
      <Card className="relative opacity-60">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
          <ProviderIcon provider={provider} />
          <CardTitle className="text-base font-semibold">{label}</CardTitle>
          <Badge variant="outline" className="ml-auto text-xs">
            <Clock className="mr-1 h-3 w-3" />
            Coming soon
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    );
  }

  if (!integration) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
          <ProviderIcon provider={provider} />
          <CardTitle className="text-base font-semibold">{label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          <a
            href="/api/integrations/slack/install"
            className="inline-flex items-center gap-2 rounded-md bg-[#4A154B] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ProviderIcon provider="SLACK" size={18} />
            Add to Slack
          </a>
        </CardContent>
      </Card>
    );
  }

  // Connected state
  const installedDate = integration.installedAt
    ? new Date(integration.installedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        <ProviderIcon provider={provider} />
        <div className="flex-1">
          <CardTitle className="text-base font-semibold">{label}</CardTitle>
          {integration.externalTeamName && (
            <p className="text-xs text-muted-foreground">
              Connected to{' '}
              <span className="font-medium text-foreground">{integration.externalTeamName}</span>
            </p>
          )}
        </div>
        <Badge
          variant={integration.status === 'ACTIVE' ? 'default' : 'secondary'}
          className="flex items-center gap-1"
        >
          {integration.status === 'ACTIVE' && <CheckCircle2 className="h-3 w-3" />}
          {integration.status === 'ACTIVE' ? 'Connected' : integration.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 text-xs text-muted-foreground">
          {integration.installedByName && (
            <p>
              Installed by{' '}
              <span className="font-medium text-foreground">{integration.installedByName}</span>
              {installedDate ? ` on ${installedDate}` : ''}
            </p>
          )}
          {integration.scopes.length > 0 && (
            <p>
              Scopes: <span className="font-mono">{integration.scopes.join(', ')}</span>
            </p>
          )}
        </div>
        <Button
          variant="destructive"
          size="sm"
          disabled={disconnecting || isPending}
          onClick={() => void handleDisconnect()}
        >
          {disconnecting ? 'Disconnecting…' : 'Disconnect'}
        </Button>
      </CardContent>
    </Card>
  );
}
