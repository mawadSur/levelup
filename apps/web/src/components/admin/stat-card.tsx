'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@levelup/ui';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { CountUp } from '@/lib/motion/count-up';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import { fadeUp, easeStandard } from '@/lib/motion/variants';

interface StatCardProps {
  title: string;
  value: string | number;
  sublabel?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  cta?: ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  sublabel,
  icon: Icon,
  iconClassName,
  trend,
  cta,
  className,
}: StatCardProps) {
  const prefersReduced = useReducedMotion();

  // Determine whether we can animate the value as a number.
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  const isNumeric = !isNaN(numericValue) && typeof value === 'number';

  const cardContent = (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-paper-300">{title}</CardTitle>
        {Icon && (
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              iconClassName ?? 'bg-signal/10 text-signal',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
      </CardHeader>
      <CardContent className="pb-4">
        <div className="text-3xl font-bold tracking-tight text-paper-100">
          {isNumeric ? <CountUp value={numericValue} duration={1.2} /> : value}
        </div>
        {sublabel && <p className="mt-1 text-xs text-paper-300">{sublabel}</p>}
        {trend && (
          <motion.p
            className={cn(
              'mt-1 text-xs font-medium',
              trend.direction === 'up' && 'text-emerald-600 dark:text-emerald-400',
              trend.direction === 'down' && 'text-red-600 dark:text-red-400',
              trend.direction === 'neutral' && 'text-paper-300',
            )}
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={easeStandard}
          >
            {trend.label}
          </motion.p>
        )}
        {cta && <div className="mt-2">{cta}</div>}
      </CardContent>
    </Card>
  );

  if (prefersReduced) {
    return cardContent;
  }

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible">
      {cardContent}
    </motion.div>
  );
}
