import { Sprout, Compass, Rocket, Crown, type LucideIcon } from 'lucide-react';
import { cn } from '@levelup/ui';

export type AiLevel = 'BEGINNER' | 'PRACTITIONER' | 'POWER_USER' | 'CHAMPION';

interface LevelMeta {
  label: string;
  icon: LucideIcon;
  classes: string;
}

const LEVELS: Record<AiLevel, LevelMeta> = {
  BEGINNER: {
    label: 'Beginner',
    icon: Sprout,
    classes:
      'bg-emerald-100 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-400/20',
  },
  PRACTITIONER: {
    label: 'Practitioner',
    icon: Compass,
    classes:
      'bg-sky-100 text-sky-700 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-400/20',
  },
  POWER_USER: {
    label: 'Power User',
    icon: Rocket,
    classes:
      'bg-violet-100 text-violet-700 ring-violet-600/20 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-400/20',
  },
  CHAMPION: {
    label: 'Champion',
    icon: Crown,
    classes:
      'bg-amber-100 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-400/20',
  },
};

interface LevelBadgeProps {
  level: AiLevel | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LevelBadge({ level, size = 'md', className }: LevelBadgeProps) {
  const meta = LEVELS[level as AiLevel] ?? LEVELS.BEGINNER;
  const Icon = meta.icon;

  const sizeClasses =
    size === 'lg'
      ? 'text-base px-3.5 py-1.5 gap-2'
      : size === 'sm'
        ? 'text-xs px-2 py-0.5 gap-1'
        : 'text-sm px-2.5 py-1 gap-1.5';

  const iconSize = size === 'lg' ? 18 : size === 'sm' ? 12 : 14;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium ring-1 ring-inset',
        meta.classes,
        sizeClasses,
        className,
      )}
    >
      <Icon size={iconSize} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function levelDescription(level: string): string {
  switch (level) {
    case 'BEGINNER':
      return "You're getting started with AI. We'll start with the fundamentals — what AI tools can do, when to use them, and how to write your first prompts.";
    case 'PRACTITIONER':
      return "You've used AI tools and have a working sense of how they help. We'll sharpen your prompting and introduce role-specific workflows.";
    case 'POWER_USER':
      return "You're already getting real leverage from AI. We'll focus on advanced patterns: multi-step workflows, evaluation, and integrating AI into your team's processes.";
    case 'CHAMPION':
      return "You're operating at the frontier. We'll keep you ahead with the latest models, agentic workflows, and how to coach others.";
    default:
      return '';
  }
}
