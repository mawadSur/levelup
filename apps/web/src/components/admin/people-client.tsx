'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, UserPlus, RefreshCcw, Trash2, Pencil, Plus } from 'lucide-react';
import { toast } from '@levelup/ui';
import {
  Button,
  Input,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@levelup/ui';
import { cn } from '@/lib/utils';
import { invitations, departments as deptsApi } from '@/lib/api';
import type { User } from '@/lib/api/users';
import type { Invitation } from '@/lib/api/invitations';
import type { Department } from '@/lib/api/departments';
import { UserRow, UserCard } from './user-row';
import { InviteDialog } from './invite-dialog';
import { AddDepartmentDialog, EditDepartmentDialog } from './add-department-dialog';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function inviteStatusClass(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700';
    case 'ACCEPTED':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'EXPIRED':
      return 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400';
    case 'REVOKED':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'bg-ink-700 text-paper-300 border-ink-600';
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/* Members tab                                                          */
/* ------------------------------------------------------------------ */
interface MembersTabProps {
  users: User[];
  departments: Department[];
  isAdmin: boolean;
  adminCount: number;
}

function MembersTab({ users, departments, isAdmin, adminCount }: MembersTabProps) {
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('ALL');
  const [deptFilter, setDeptFilter] = React.useState('ALL');
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 15;

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q || u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesDept = deptFilter === 'ALL' || u.departmentId === deptFilter;
    return matchesSearch && matchesRole && matchesDept;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-300" />
          <Input
            placeholder="Search members…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="EMPLOYEE">Employee</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={deptFilter}
          onValueChange={(v) => {
            setDeptFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-paper-300">
          {filtered.length} {filtered.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border border-ink-600 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-700/50">
            <tr>
              <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-paper-300">
                Member
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-paper-300">
                Role
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-paper-300">
                Department
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-paper-300">
                AI Level
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-paper-300">
                Last active
              </th>
              <th className="py-2.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-paper-300">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-ink-800">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-paper-300">
                  {search || roleFilter !== 'ALL' || deptFilter !== 'ALL'
                    ? 'No members match your filters.'
                    : 'No members yet.'}
                </td>
              </tr>
            ) : (
              paginated.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  departments={departments}
                  isCurrentUserAdmin={isAdmin}
                  adminCount={adminCount}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="flex flex-col gap-2 md:hidden">
        {paginated.length === 0 ? (
          <p className="py-8 text-center text-sm text-paper-300">No members found.</p>
        ) : (
          paginated.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              departments={departments}
              isCurrentUserAdmin={isAdmin}
              adminCount={adminCount}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-paper-300">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Invitations tab                                                      */
/* ------------------------------------------------------------------ */
interface InvitationsTabProps {
  invites: Invitation[];
  isAdmin: boolean;
}

function InvitationsTab({ invites, isAdmin }: InvitationsTabProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  async function handleResend(id: string) {
    setLoadingId(id);
    try {
      await invitations.resendInvite(id);
      toast.success('Invitation resent');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRevoke(id: string, email: string) {
    if (!confirm(`Revoke invitation to ${email}?`)) return;
    setLoadingId(id);
    try {
      await invitations.revokeInvite(id);
      toast.success('Invitation revoked');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke');
    } finally {
      setLoadingId(null);
    }
  }

  if (invites.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-ink-600 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-700">
          <UserPlus className="h-6 w-6 text-paper-300" />
        </div>
        <div>
          <p className="text-sm font-medium text-paper-100">No invitations yet</p>
          <p className="mt-1 text-sm text-paper-300">
            Send one to get started — use the &quot;Invite teammate&quot; button above.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink-600">
      <table className="w-full text-sm">
        <thead className="bg-ink-700/50">
          <tr>
            <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-paper-300">
              Email
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-paper-300 hidden sm:table-cell">
              Role
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-paper-300">
              Status
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-paper-300 hidden lg:table-cell">
              Sent
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-paper-300 hidden lg:table-cell">
              Expires
            </th>
            {isAdmin && (
              <th className="py-2.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-paper-300">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-ink-800">
          {invites.map((inv) => (
            <tr key={inv.id} className="hover:bg-ink-700/30 transition-colors">
              <td className="py-3 pl-4 pr-3 font-medium text-paper-100">{inv.email}</td>
              <td className="px-3 py-3 text-paper-300 hidden sm:table-cell capitalize">
                {inv.role.toLowerCase()}
              </td>
              <td className="px-3 py-3">
                <Badge
                  variant="outline"
                  className={cn('text-xs font-medium', inviteStatusClass(inv.status))}
                >
                  {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                </Badge>
              </td>
              <td className="px-3 py-3 text-paper-300 hidden lg:table-cell">
                {formatDate(inv.createdAt)}
              </td>
              <td className="px-3 py-3 text-paper-300 hidden lg:table-cell">
                {formatDate(inv.expiresAt)}
              </td>
              {isAdmin && (
                <td className="py-3 pl-3 pr-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {inv.status === 'PENDING' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={loadingId === inv.id}
                          onClick={() => handleResend(inv.id)}
                        >
                          <RefreshCcw className="h-3 w-3" />
                          <span className="hidden sm:inline">Resend</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-danger hover:text-danger gap-1"
                          disabled={loadingId === inv.id}
                          onClick={() => handleRevoke(inv.id, inv.email)}
                        >
                          <Trash2 className="h-3 w-3" />
                          <span className="hidden sm:inline">Revoke</span>
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Departments tab                                                      */
/* ------------------------------------------------------------------ */
interface DepartmentsTabProps {
  depts: Department[];
  isAdmin: boolean;
}

function DepartmentsTab({ depts, isAdmin }: DepartmentsTabProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Department | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function handleDelete(dept: Department) {
    if (!confirm(`Delete department "${dept.name}"? This cannot be undone.`)) return;
    setDeletingId(dept.id);
    try {
      await deptsApi.deleteDept(dept.id);
      toast.success(`Department "${dept.name}" deleted`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete department');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="space-y-4">
        {isAdmin && (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add department
            </Button>
          </div>
        )}

        {depts.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-ink-600 py-16 text-center">
            <p className="text-sm text-paper-300">No departments yet.</p>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add your first department
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-ink-600">
            <table className="w-full text-sm">
              <thead className="bg-ink-700/50">
                <tr>
                  <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-paper-300">
                    Department
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-paper-300">
                    Members
                  </th>
                  {isAdmin && (
                    <th className="py-2.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-paper-300">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-ink-800">
                {depts.map((dept) => (
                  <tr key={dept.id} className="hover:bg-ink-700/30 transition-colors">
                    <td className="py-3 pl-4 pr-3 font-medium text-paper-100">{dept.name}</td>
                    <td className="px-3 py-3 text-paper-300">
                      {dept.memberCount} {dept.memberCount === 1 ? 'member' : 'members'}
                    </td>
                    {isAdmin && (
                      <td className="py-3 pl-3 pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => setEditTarget(dept)}
                          >
                            <Pencil className="h-3 w-3" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs text-danger hover:text-danger"
                            disabled={deletingId === dept.id}
                            onClick={() => handleDelete(dept)}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddDepartmentDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditDepartmentDialog
        dept={editTarget}
        open={editTarget !== null}
        onOpenChange={(v) => {
          if (!v) setEditTarget(null);
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Main people client component                                         */
/* ------------------------------------------------------------------ */
interface PeopleClientProps {
  memberList: User[];
  inviteList: Invitation[];
  deptList: Department[];
  orgName: string;
  isAdmin: boolean;
}

export function PeopleClient({
  memberList,
  inviteList,
  deptList,
  orgName,
  isAdmin,
}: PeopleClientProps) {
  const searchParams = useSearchParams();
  const [inviteOpen, setInviteOpen] = React.useState(searchParams.get('invite') === 'open');

  const adminCount = memberList.filter((u) => u.role === 'ADMIN').length;

  return (
    <>
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-paper-100">People</h1>
          <p className="mt-1 text-sm text-paper-300">
            {memberList.length} {memberList.length === 1 ? 'member' : 'members'} in {orgName}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite teammate
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="border border-ink-600 bg-ink-700/40">
          <TabsTrigger value="members">
            Members
            <span className="ml-1.5 rounded-full bg-ink-700 px-1.5 py-0.5 text-xs font-medium text-paper-300">
              {memberList.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations
            {inviteList.filter((i) => i.status === 'PENDING').length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {inviteList.filter((i) => i.status === 'PENDING').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-0">
          <MembersTab
            users={memberList}
            departments={deptList}
            isAdmin={isAdmin}
            adminCount={adminCount}
          />
        </TabsContent>

        <TabsContent value="invitations" className="mt-0">
          <InvitationsTab invites={inviteList} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="departments" className="mt-0">
          <DepartmentsTab depts={deptList} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>

      {/* Invite dialog */}
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} departments={deptList} />
    </>
  );
}
