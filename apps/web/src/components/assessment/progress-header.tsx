'use client';

import Link from 'next/link';
import { Progress } from '@levelup/ui';

interface ProgressHeaderProps {
  current: number;
  total: number;
  pauseHref?: string;
}

export function ProgressHeader({ current, total, pauseHref = '/learn' }: ProgressHeaderProps) {
  const safeTotal = total > 0 ? total : 1;
  const value = Math.min(100, Math.round((current / safeTotal) * 100));

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-paper-100">
          Question {Math.min(current, total)} of {total}
        </span>
        <Link href={pauseHref} className="text-paper-300 hover:text-paper-100 hover:underline">
          Pause for now
        </Link>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}
