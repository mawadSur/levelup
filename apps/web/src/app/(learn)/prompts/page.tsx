import type { Metadata } from 'next';
import { Suspense } from 'react';
import { prompts as promptsApi, auth, departments as deptsApi } from '@/lib/api';
import { getSessionUser } from '@/lib/auth-client';
import { PromptFilters } from '@/components/learn/prompts/prompt-filters';
import { PromptCard } from '@/components/learn/prompts/prompt-card';
import { NewPromptDialog } from '@/components/learn/prompts/new-prompt-dialog';
import { MonoLabel, Skeleton } from '@levelup/ui';
import type { Prompt } from '@/lib/api/prompts';
import { brand } from '@/lib/client';

export const metadata: Metadata = {
  title: 'Prompts',
};

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; scope?: string }>;
}

function filterByScope(
  promptList: Prompt[],
  scope: string,
  currentUserId: string,
  userDepartmentId?: string | null,
): Prompt[] {
  if (scope === 'mine') return promptList.filter((p) => p.authorId === currentUserId);
  if (scope === 'dept') {
    return promptList.filter(
      (p) => p.isShared && p.departmentId !== null && p.departmentId === (userDepartmentId ?? null),
    );
  }
  if (scope === 'org') {
    return promptList.filter(
      (p) => p.isShared && p.departmentId === null && p.authorId !== currentUserId,
    );
  }
  if (scope === 'library')
    return promptList.filter((p) => !p.isShared && p.authorId !== currentUserId);
  return promptList;
}

function PromptGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-ink-600 bg-ink-800 p-5 space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-20 w-full rounded-md" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function PromptGrid({
  q,
  category,
  scope,
  currentUserId,
  canShare,
  userDepartmentId,
  departmentName,
}: {
  q: string;
  category: string;
  scope: string;
  currentUserId: string;
  canShare: boolean;
  userDepartmentId?: string | null;
  departmentName?: string | null;
}) {
  const [allPrompts] = await Promise.allSettled([
    promptsApi.listPrompts({
      q: q || undefined,
      category: category && category !== 'all' ? category : undefined,
    }),
  ]);

  const promptList = allPrompts.status === 'fulfilled' ? allPrompts.value : [];
  const filtered = filterByScope(promptList, scope, currentUserId, userDepartmentId);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-ink-600 py-16 text-center">
        <MonoLabel className="mb-2 block">NO PROMPTS FOUND</MonoLabel>
        <p className="max-w-md text-body-sm text-paper-300">
          {scope === 'mine'
            ? 'You have no prompts yet. Create one to get started.'
            : scope === 'org'
              ? 'No org-shared prompts yet. Managers can share prompts with the team.'
              : scope === 'library'
                ? 'The library is empty — add a prompt or clone one from the org.'
                : 'Try a different search or category, or create a new prompt.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filtered.map((prompt) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          currentUserId={currentUserId}
          canShare={canShare}
          departmentName={prompt.departmentId ? departmentName : null}
        />
      ))}
    </div>
  );
}

export default async function PromptsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q ?? '';
  const category = params.category ?? '';
  const scope = params.scope ?? '';

  const [session, meResult, deptsResult] = await Promise.allSettled([
    getSessionUser(),
    auth.me(),
    deptsApi.listDepts(),
  ]);
  const sessionUser = session.status === 'fulfilled' ? session.value : null;
  const me = meResult.status === 'fulfilled' ? meResult.value : null;
  const depts = deptsResult.status === 'fulfilled' ? deptsResult.value : [];

  const currentUserId = sessionUser?.userId ?? '';
  const role = sessionUser?.role ?? 'EMPLOYEE';
  const canShare = role === 'ADMIN' || role === 'MANAGER';

  // Resolve department info for dept-scope features
  const userDepartmentId = me?.departmentId ?? null;
  const departmentName = userDepartmentId
    ? (depts.find((d) => d.id === userDepartmentId)?.name ?? null)
    : null;
  const hasDepartment = userDepartmentId !== null;

  return (
    <div className="mx-auto max-w-content space-y-10 px-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <MonoLabel>PROMPT LIBRARY</MonoLabel>
          <h1 className="font-serif text-display-md italic text-paper-100">Prompts</h1>
          <p className="max-w-reading text-body text-paper-300">
            Reusable prompts that work — yours, your team&apos;s, and the {brand.shortName} library.
          </p>
        </div>
        <div className="shrink-0">
          <NewPromptDialog
            canShare={canShare}
            departmentId={userDepartmentId}
            departmentName={departmentName}
          />
        </div>
      </header>

      {/* Filters */}
      <PromptFilters q={q} category={category} scope={scope} hasDepartment={hasDepartment} />

      {/* Grid */}
      <Suspense fallback={<PromptGridSkeleton />}>
        <PromptGrid
          q={q}
          category={category}
          scope={scope}
          currentUserId={currentUserId}
          canShare={canShare}
          userDepartmentId={userDepartmentId}
          departmentName={departmentName}
        />
      </Suspense>
    </div>
  );
}
