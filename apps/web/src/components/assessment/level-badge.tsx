import { Sprout, Compass, Rocket, Crown, type LucideIcon } from 'lucide-react';
import { cn } from '@levelup/ui';

export type AiLevel = 'BEGINNER' | 'PRACTITIONER' | 'POWER_USER' | 'CHAMPION';

interface LevelMeta {
  label: string;
  icon: LucideIcon;
  /** Mission Brief intensity scale: default → success → signal-dim → signal */
  classes: string;
}

const LEVELS: Record<AiLevel, LevelMeta> = {
  BEGINNER: {
    label: 'Beginner',
    icon: Sprout,
    classes: 'border-ink-500 text-paper-100',
  },
  PRACTITIONER: {
    label: 'Practitioner',
    icon: Compass,
    classes: 'border-success/40 text-success',
  },
  POWER_USER: {
    label: 'Power user',
    icon: Rocket,
    classes: 'border-signal-dim text-signal-dim',
  },
  CHAMPION: {
    label: 'Champion',
    icon: Crown,
    classes: 'border-signal text-signal',
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
      ? 'text-mono px-3.5 py-1.5 gap-2'
      : size === 'sm'
        ? 'text-mono-sm px-2 py-0.5 gap-1'
        : 'text-mono-sm px-2.5 py-1 gap-1.5';

  const iconSize = size === 'lg' ? 16 : size === 'sm' ? 12 : 14;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-data border bg-transparent font-mono uppercase tracking-[0.05em]',
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
