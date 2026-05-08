import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button, Card, CardContent } from '@levelup/ui';

export const metadata: Metadata = {
  title: 'Integration Connected',
};

interface ConnectedPageProps {
  searchParams: Promise<{ provider?: string }>;
}

const PROVIDER_LABELS: Record<string, string> = {
  slack: 'Slack',
  ms_teams: 'Microsoft Teams',
};

export default async function IntegrationConnectedPage({ searchParams }: ConnectedPageProps) {
  const { provider } = await searchParams;
  const providerLabel =
    PROVIDER_LABELS[(provider ?? '').toLowerCase()] ??
    (provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'Integration');

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="space-y-6 pt-8 pb-8">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-paper-100">{providerLabel} connected</h1>
            <p className="text-sm text-paper-300">
              Your workspace is now connected to LevelUp AI Academy.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/integrations">Back to integrations</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
