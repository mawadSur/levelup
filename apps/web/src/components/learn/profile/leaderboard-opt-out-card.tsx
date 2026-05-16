'use client';

import { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  toast,
} from '@levelup/ui';
import { users } from '@/lib/api';

interface LeaderboardOptOutCardProps {
  initialOptOut: boolean;
}

export function LeaderboardOptOutCard({ initialOptOut }: LeaderboardOptOutCardProps) {
  const [optOut, setOptOut] = useState(initialOptOut);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !optOut;
    startTransition(async () => {
      try {
        await users.updateLeaderboardOptOut({ optOut: next });
        setOptOut(next);
        toast({
          title: next ? 'Hidden from leaderboard' : 'Visible on leaderboard',
          description: next
            ? "You won't appear in org rankings."
            : "You'll appear in org rankings.",
        });
      } catch {
        toast({
          title: 'Update failed',
          description: 'Please try again.',
          variant: 'destructive',
        });
      }
    });
  }

  const showing = !optOut;

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Leaderboard visibility</CardTitle>
        <CardDescription>
          Show me on the leaderboard. When off, your name won&apos;t appear in your
          organization&apos;s rankings — you can still view the leaderboard yourself.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Button type="button" onClick={handleToggle} disabled={isPending}>
            {isPending ? 'Saving...' : showing ? 'Hide me' : 'Show me'}
          </Button>
          <span className="text-sm text-paper-300">
            {showing ? 'Currently visible to your org.' : 'Currently hidden from your org.'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
