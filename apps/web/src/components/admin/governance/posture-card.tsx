import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, MissionNumber, MonoLabel } from '@levelup/ui';
import { cn } from '@/lib/utils';

interface PostureCardProps {
  title: string;
  value: number | string;
  sublabel?: string;
  icon?: LucideIcon;
  format?: 'integer' | 'percent';
  tone?: 'default' | 'signal' | 'danger' | 'success';
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<PostureCardProps['tone']>, string> = {
  default: 'text-paper-100',
  signal: 'text-signal',
  danger: 'text-danger',
  success: 'text-success',
};

export function PostureCard({
  title,
  value,
  sublabel,
  icon: Icon,
  format = 'integer',
  tone = 'default',
  className,
}: PostureCardProps) {
  const numeric = typeof value === 'number' ? value : Number.NaN;
  const isNumeric = Number.isFinite(numeric);

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <MonoLabel className="block">{title.toUpperCase()}</MonoLabel>
          {Icon && <Icon className="h-4 w-4 shrink-0 text-paper-500" aria-hidden="true" />}
        </div>
        <div
          className={cn(
            'font-serif text-display-md tabular-nums',
            TONE_CLASSES[tone],
          )}
        >
          {isNumeric ? <MissionNumber value={numeric} format={format} /> : value}
        </div>
        {sublabel && (
          <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
            {sublabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
