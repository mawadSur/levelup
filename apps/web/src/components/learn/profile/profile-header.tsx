import { Avatar, AvatarFallback, Badge, Card, CardContent } from '@levelup/ui';
import type { SessionUser } from '@/lib/auth-client';

interface ProfileHeaderProps {
  user: SessionUser;
  aiLevel?: string | null;
  department?: string | null;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'ADMIN') return 'default';
  if (role === 'MANAGER') return 'secondary';
  return 'outline';
}

function aiLevelBadgeVariant(level: string): 'default' | 'secondary' | 'outline' {
  if (level === 'ADVANCED') return 'default';
  if (level === 'INTERMEDIATE') return 'secondary';
  return 'outline';
}

function aiLevelLabel(level: string): string {
  const map: Record<string, string> = {
    BEGINNER: 'AI Beginner',
    INTERMEDIATE: 'AI Intermediate',
    ADVANCED: 'AI Advanced',
  };
  return map[level] ?? level;
}

export function ProfileHeader({ user, aiLevel, department }: ProfileHeaderProps) {
  const displayName = user.name ?? user.email;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 shrink-0">
            <AvatarFallback className="bg-signal/15 text-signal text-xl font-semibold">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-paper-100">{displayName}</h1>
              <Badge variant={roleBadgeVariant(user.role)} className="text-xs capitalize">
                {user.role.toLowerCase()}
              </Badge>
              {aiLevel && (
                <Badge variant={aiLevelBadgeVariant(aiLevel)} className="text-xs">
                  {aiLevelLabel(aiLevel)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-paper-300">{user.email}</p>
            {department && <p className="text-sm text-paper-300">{department}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
