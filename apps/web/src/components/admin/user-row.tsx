'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, ShieldCheck, Building2, Sliders, UserX } from 'lucide-react';
import { toast } from '@levelup/ui';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@levelup/ui';
import { cn } from '@/lib/utils';
import { users } from '@/lib/api';
import type { User } from '@/lib/api/users';
import type { Department } from '@/lib/api/departments';
import { ChangeRoleDialog } from './change-role-dialog';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                       */
/* ------------------------------------------------------------------ */
export function getInitials(name: string, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0] ?? '';
    const last = parts[parts.length - 1] ?? '';
    if (parts.length >= 2 && first && last) {
      return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
    }
    return first.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function roleBadgeClass(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700';
    case 'MANAGER':
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600';
    default:
      return 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
  }
}

export function aiLevelBadgeClass(level: string | null): string {
  switch (level) {
    case 'BEGINNER':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'INTERMEDIATE':
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300';
    case 'ADVANCED':
      return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/* Shared actions hook                                                  */
/* ------------------------------------------------------------------ */
interface UserActionsState {
  roleDialogOpen: boolean;
  setRoleDialogOpen: (v: boolean) => void;
  changingDept: boolean;
  setChangingDept: (v: boolean) => void;
  deptValue: string;
  setDeptValue: (v: string) => void;
  changingLevel: boolean;
  setChangingLevel: (v: boolean) => void;
  levelValue: string;
  setLevelValue: (v: string) => void;
  handleDeptChange: (newDeptId: string) => Promise<void>;
  handleLevelChange: (newLevel: string) => Promise<void>;
  handleDeactivate: () => Promise<void>;
}

function useUserActions(user: User, router: ReturnType<typeof useRouter>): UserActionsState {
  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false);
  const [changingDept, setChangingDept] = React.useState(false);
  const [deptValue, setDeptValue] = React.useState<string>(user.departmentId ?? '__none__');
  const [changingLevel, setChangingLevel] = React.useState(false);
  const [levelValue, setLevelValue] = React.useState<string>(user.aiLevel ?? '__none__');

  async function handleDeptChange(newDeptId: string) {
    setDeptValue(newDeptId);
    try {
      await users.updateUserDept(user.id, {
        departmentId: newDeptId === '__none__' ? null : newDeptId,
      });
      toast.success('Department updated');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update department';
      toast.error(message);
      setDeptValue(user.departmentId ?? '__none__');
    } finally {
      setChangingDept(false);
    }
  }

  async function handleLevelChange(newLevel: string) {
    setLevelValue(newLevel);
    const level = newLevel === '__none__' ? null : newLevel;
    try {
      if (level) {
        await users.updateAiLevel(user.id, { aiLevel: level });
        toast.success('AI level updated');
      }
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update AI level';
      toast.error(message);
      setLevelValue(user.aiLevel ?? '__none__');
    } finally {
      setChangingLevel(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm(`Deactivate ${user.name ?? user.email}? They will lose access immediately.`))
      return;
    try {
      await users.deactivate(user.id);
      toast.success(`${user.name ?? user.email} deactivated`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate user';
      toast.error(message);
    }
  }

  return {
    roleDialogOpen,
    setRoleDialogOpen,
    changingDept,
    setChangingDept,
    deptValue,
    setDeptValue,
    changingLevel,
    setChangingLevel,
    levelValue,
    setLevelValue,
    handleDeptChange,
    handleLevelChange,
    handleDeactivate,
  };
}

/* ------------------------------------------------------------------ */
/* ActionsMenu (shared)                                                 */
/* ------------------------------------------------------------------ */
interface ActionsMenuProps {
  onChangeRole: () => void;
  onChangeDept: () => void;
  onChangeLevel: () => void;
  onDeactivate: () => void;
}

function ActionsMenu({
  onChangeRole,
  onChangeDept,
  onChangeLevel,
  onDeactivate,
}: ActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="User actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={onChangeRole}>
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Change role
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={onChangeDept}>
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Change department
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer"
          onClick={onChangeLevel}
        >
          <Sliders className="h-4 w-4 text-muted-foreground" />
          Set AI level
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
          onClick={onDeactivate}
        >
          <UserX className="h-4 w-4" />
          Deactivate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ */
/* UserRow — renders a <tr> for the desktop table                      */
/* ------------------------------------------------------------------ */
interface UserRowProps {
  user: User;
  departments: Department[];
  isCurrentUserAdmin: boolean;
  adminCount: number;
}

export function UserRow({ user, departments, isCurrentUserAdmin, adminCount }: UserRowProps) {
  const router = useRouter();
  const actions = useUserActions(user, router);

  const deptName = departments.find((d) => d.id === user.departmentId)?.name ?? '—';

  return (
    <>
      <tr className="group border-b border-border transition-colors hover:bg-muted/30">
        {/* Name + email */}
        <td className="py-3 pl-4 pr-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </td>

        {/* Role */}
        <td className="px-3 py-3">
          <Badge variant="outline" className={cn('text-xs font-medium', roleBadgeClass(user.role))}>
            {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
          </Badge>
        </td>

        {/* Department */}
        <td className="px-3 py-3">
          {actions.changingDept ? (
            <Select value={actions.deptValue} onValueChange={actions.handleDeptChange}>
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No department</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm text-foreground">{deptName}</span>
          )}
        </td>

        {/* AI Level */}
        <td className="px-3 py-3">
          {actions.changingLevel ? (
            <Select value={actions.levelValue} onValueChange={actions.handleLevelChange}>
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not set</SelectItem>
                <SelectItem value="BEGINNER">Beginner</SelectItem>
                <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                <SelectItem value="ADVANCED">Advanced</SelectItem>
              </SelectContent>
            </Select>
          ) : user.aiLevel ? (
            <Badge
              variant="outline"
              className={cn('text-xs font-medium', aiLevelBadgeClass(user.aiLevel))}
            >
              {user.aiLevel.charAt(0) + user.aiLevel.slice(1).toLowerCase()}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Not set</span>
          )}
        </td>

        {/* Last active */}
        <td className="px-3 py-3 text-sm text-muted-foreground">{formatDate(user.lastActiveAt)}</td>

        {/* Actions */}
        <td className="py-3 pl-3 pr-4 text-right">
          {isCurrentUserAdmin && (
            <div className="opacity-0 transition-opacity group-hover:opacity-100">
              <ActionsMenu
                onChangeRole={() => actions.setRoleDialogOpen(true)}
                onChangeDept={() => actions.setChangingDept(true)}
                onChangeLevel={() => actions.setChangingLevel(true)}
                onDeactivate={actions.handleDeactivate}
              />
            </div>
          )}
        </td>
      </tr>

      {/* Dialogs are portaled — safe outside the tr */}
      <ChangeRoleDialog
        user={user}
        open={actions.roleDialogOpen}
        onOpenChange={actions.setRoleDialogOpen}
        adminCount={adminCount}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* UserCard — renders a card div for the mobile layout                 */
/* ------------------------------------------------------------------ */
export function UserCard({ user, departments, isCurrentUserAdmin, adminCount }: UserRowProps) {
  const router = useRouter();
  const actions = useUserActions(user, router);

  const deptName = departments.find((d) => d.id === user.departmentId)?.name;

  return (
    <>
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          {isCurrentUserAdmin && (
            <ActionsMenu
              onChangeRole={() => actions.setRoleDialogOpen(true)}
              onChangeDept={() => actions.setChangingDept(true)}
              onChangeLevel={() => actions.setChangingLevel(true)}
              onDeactivate={actions.handleDeactivate}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={cn('text-xs font-medium', roleBadgeClass(user.role))}>
            {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
          </Badge>
          {user.aiLevel && (
            <Badge
              variant="outline"
              className={cn('text-xs font-medium', aiLevelBadgeClass(user.aiLevel))}
            >
              {user.aiLevel.charAt(0) + user.aiLevel.slice(1).toLowerCase()}
            </Badge>
          )}
          {deptName && (
            <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {deptName}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Last active: {formatDate(user.lastActiveAt)}
        </p>
      </div>

      <ChangeRoleDialog
        user={user}
        open={actions.roleDialogOpen}
        onOpenChange={actions.setRoleDialogOpen}
        adminCount={adminCount}
      />
    </>
  );
}
