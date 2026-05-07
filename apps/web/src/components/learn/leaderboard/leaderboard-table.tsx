'use client';

import * as React from 'react';
import { Crown, Trophy, Award } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@levelup/ui';
import { cn } from '@levelup/ui';
import { Stagger, ScrollItem } from '@/lib/motion/stagger';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import type { LeaderboardEntry } from '@levelup/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  highlightUserId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatXp(xp: number): string {
  return new Intl.NumberFormat().format(xp);
}

/** Rank medal icon for top 3. */
function RankMedal({ rank }: { rank: number }) {
  if (rank === 1)
    return <Crown className="h-5 w-5 text-[hsl(var(--accent-warm))]" aria-label="1st place" />;
  if (rank === 2)
    return <Trophy className="h-4 w-4 text-muted-foreground" aria-label="2nd place" />;
  if (rank === 3)
    return <Award className="h-4 w-4 text-muted-foreground/70" aria-label="3rd place" />;
  return null;
}

// ---------------------------------------------------------------------------
// Podium card (top 3)
// ---------------------------------------------------------------------------
function PodiumCard({
  entry,
  isMe,
  size = 'sm',
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
  size?: 'lg' | 'sm';
}) {
  const isFirst = entry.rank === 1;
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border bg-background p-4 text-center transition-shadow hover:shadow-md',
        isFirst ? 'border-[hsl(var(--accent-warm))]/60 shadow-sm' : 'border-border',
        isMe ? 'ring-1 ring-primary' : '',
        size === 'lg' ? 'flex-1 py-6' : 'flex-1',
      )}
    >
      {/* Medal */}
      <RankMedal rank={entry.rank} />

      {/* Avatar */}
      <Avatar className={cn(isFirst ? 'h-14 w-14' : 'h-11 w-11')}>
        {entry.avatarUrl && <AvatarImage src={entry.avatarUrl} alt={entry.name} />}
        <AvatarFallback
          className={cn(
            'font-semibold',
            isFirst
              ? 'bg-[hsl(var(--accent-warm))]/20 text-[hsl(var(--accent-warm))] text-base'
              : 'bg-primary/10 text-primary text-sm',
          )}
        >
          {getInitials(entry.name)}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <p
        className={cn(
          'font-display font-semibold leading-tight',
          isFirst ? 'text-base' : 'text-sm',
        )}
      >
        {entry.name}
        {isMe && (
          <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary font-sans not-italic">
            You
          </span>
        )}
      </p>

      {/* Level */}
      {entry.departmentName && (
        <p className="text-[11px] text-muted-foreground">{entry.departmentName}</p>
      )}

      {/* XP */}
      <p
        className={cn(
          'font-semibold tabular-nums',
          isFirst ? 'text-base text-[hsl(var(--accent-warm))]' : 'text-sm text-primary',
        )}
      >
        {formatXp(entry.xp)} XP
      </p>

      {/* Level badge */}
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-medium">
        Lv {entry.level}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table row (rank 4+)
// ---------------------------------------------------------------------------
function TableRow({
  entry,
  isMe,
  isSeparator,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
  isSeparator?: boolean;
}) {
  const isTopTen = entry.rank <= 10;

  return (
    <>
      {isSeparator && (
        <tr>
          <td colSpan={5} className="py-2 text-center text-xs text-muted-foreground">
            · · ·
          </td>
        </tr>
      )}
      <tr
        className={cn(
          'border-b border-border/40 transition-colors hover:bg-muted/30',
          isMe ? 'bg-primary/5' : '',
        )}
      >
        {/* Rank */}
        <td className="py-3 pl-4 pr-2 w-12">
          <span
            className={cn(
              'font-display text-base italic tabular-nums',
              isTopTen ? 'text-primary font-bold' : 'text-muted-foreground',
            )}
          >
            {entry.rank}
          </span>
        </td>

        {/* Avatar + Name */}
        <td className="py-3 px-2">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 shrink-0">
              {entry.avatarUrl && <AvatarImage src={entry.avatarUrl} alt={entry.name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {getInitials(entry.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium leading-tight text-foreground">
              {entry.name}
              {isMe && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  You
                </span>
              )}
            </span>
          </div>
        </td>

        {/* Department */}
        <td className="hidden py-3 px-2 text-sm text-muted-foreground sm:table-cell">
          {entry.departmentName ?? '—'}
        </td>

        {/* Level */}
        <td className="py-3 px-2 text-sm text-muted-foreground text-center">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            Lv {entry.level}
          </span>
        </td>

        {/* XP */}
        <td className="py-3 pl-2 pr-4 text-right">
          <span
            className={cn(
              'text-sm font-semibold tabular-nums',
              isTopTen ? 'text-primary' : 'text-foreground',
            )}
          >
            {formatXp(entry.xp)}
          </span>
        </td>
      </tr>
    </>
  );
}

// ---------------------------------------------------------------------------
// LeaderboardTable
// ---------------------------------------------------------------------------
export function LeaderboardTable({ entries, highlightUserId }: LeaderboardTableProps) {
  const prefersReduced = useReducedMotion();

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="font-display text-lg text-muted-foreground">
          Be the first to earn XP this week.
        </p>
      </div>
    );
  }

  const top3 = entries.filter((e) => e.rank <= 3);
  // Sort podium: 2nd | 1st | 3rd for visual height effect
  const podiumOrder = [
    top3.find((e) => e.rank === 2),
    top3.find((e) => e.rank === 1),
    top3.find((e) => e.rank === 3),
  ].filter((e): e is LeaderboardEntry => e !== undefined);

  const tableRows = entries.filter((e) => e.rank > 3);

  // Determine if the highlighted user appears in the main list
  const userInList = highlightUserId ? entries.some((e) => e.userId === highlightUserId) : false;
  const userEntry = highlightUserId ? entries.find((e) => e.userId === highlightUserId) : undefined;
  // Show a "your rank" row only if the user exists but isn't in the visible top-50 slice
  // (i.e. if they're not already in tableRows or podium)
  const showUserRow = !!userEntry && !userInList;

  return (
    <div className="space-y-6">
      {/* Podium */}
      {podiumOrder.length > 0 && (
        <div className="flex items-end gap-3">
          {podiumOrder.map((entry) => (
            <PodiumCard
              key={entry.userId}
              entry={entry}
              isMe={entry.userId === highlightUserId}
              size={entry.rank === 1 ? 'lg' : 'sm'}
            />
          ))}
        </div>
      )}

      {/* Table (rank 4+) */}
      {tableRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="py-2.5 pl-4 pr-2 text-xs font-medium text-muted-foreground w-12">
                  #
                </th>
                <th className="py-2.5 px-2 text-xs font-medium text-muted-foreground">Learner</th>
                <th className="hidden py-2.5 px-2 text-xs font-medium text-muted-foreground sm:table-cell">
                  Department
                </th>
                <th className="py-2.5 px-2 text-xs font-medium text-muted-foreground text-center">
                  Level
                </th>
                <th className="py-2.5 pl-2 pr-4 text-xs font-medium text-muted-foreground text-right">
                  XP
                </th>
              </tr>
            </thead>
            <tbody>
              {prefersReduced ? (
                tableRows.map((entry) => (
                  <TableRow
                    key={entry.userId}
                    entry={entry}
                    isMe={entry.userId === highlightUserId}
                  />
                ))
              ) : (
                <Stagger className="contents" staggerAmount={0.03}>
                  {tableRows.map((entry) => (
                    <ScrollItem key={entry.userId} className="contents">
                      <TableRow entry={entry} isMe={entry.userId === highlightUserId} />
                    </ScrollItem>
                  ))}
                </Stagger>
              )}

              {/* User's own row if not in view */}
              {showUserRow && userEntry && <TableRow entry={userEntry} isMe isSeparator />}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
