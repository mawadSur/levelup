'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@levelup/ui';
import { paths as pathsApi } from '@/lib/api';
import type { LearningPath } from '@/lib/api/paths';
import type { User } from '@/lib/api/users';
import type { Department } from '@/lib/api/departments';
import { PathCatalogCard } from '@/components/admin/learning/path-catalog-card';
import { AssignDialog } from '@/components/admin/learning/assign-dialog';
import { CreatePathDialog } from '@/components/admin/learning/create-path-dialog';
import { AssignmentsTable } from '@/components/admin/learning/assignments-table';

interface LearningPageClientProps {
  initialPaths: LearningPath[];
  users: User[];
  departments: Department[];
}

export function LearningPageClient({ initialPaths, users, departments }: LearningPageClientProps) {
  const [allPaths, setAllPaths] = React.useState<LearningPath[]>(initialPaths);
  const [assignTarget, setAssignTarget] = React.useState<LearningPath | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<LearningPath | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const catalogPaths = allPaths.filter((p) => p.isPublished);
  const customPaths = allPaths.filter((p) => !p.isPublished);

  function handleCreated(path: LearningPath) {
    setAllPaths((prev) => [path, ...prev]);
  }

  async function handleDelete(path: LearningPath) {
    setDeleting(true);
    try {
      await pathsApi.deletePath(path.id);
      setAllPaths((prev) => prev.filter((p) => p.id !== path.id));
      toast({ title: `"${path.title}" deleted.` });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleTogglePublish(path: LearningPath) {
    try {
      const updated = await pathsApi.updatePath(path.id, {
        isPublished: !path.isPublished,
      });
      setAllPaths((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-paper-100">Learning</h1>
          <p className="mt-1 text-sm text-paper-300">
            Assign paths, build custom paths, see who&apos;s learning what.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/admin/learning/build">
              <Sparkles className="h-4 w-4" />
              Build with AI
            </Link>
          </Button>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create custom path
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="catalog">
        <TabsList className="mb-6">
          <TabsTrigger value="catalog">Path catalog</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="custom">Custom paths</TabsTrigger>
        </TabsList>

        {/* ---- Path catalog ---- */}
        <TabsContent value="catalog">
          {catalogPaths.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-600 p-12 text-center">
              <p className="text-paper-300">No published paths yet.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {catalogPaths.map((path) => (
                <PathCatalogCard key={path.id} path={path} onAssign={(p) => setAssignTarget(p)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---- Assignments ---- */}
        <TabsContent value="assignments">
          <AssignmentsTable users={users} paths={allPaths} departments={departments} />
        </TabsContent>

        {/* ---- Custom paths ---- */}
        <TabsContent value="custom">
          {customPaths.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-600 p-12 text-center">
              <p className="text-paper-300">
                No custom paths yet.{' '}
                <button
                  type="button"
                  className="text-indigo-600 underline hover:no-underline"
                  onClick={() => setCreateOpen(true)}
                >
                  Create one
                </button>
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-ink-600">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-600 bg-ink-700/50">
                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                    <th className="px-4 py-3 text-left font-semibold">Lessons</th>
                    <th className="px-4 py-3 text-left font-semibold">Published</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customPaths.map((path) => (
                    <tr key={path.id} className="bg-ink-900 hover:bg-ink-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-paper-100">{path.title}</p>
                        {path.description && (
                          <p className="mt-0.5 text-xs text-paper-300 line-clamp-1">
                            {path.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-paper-300">{path.lessonCount}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={path.isPublished}
                          onClick={() => handleTogglePublish(path)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            path.isPublished ? 'bg-indigo-600' : 'bg-ink-700-foreground/30'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                              path.isPublished ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                          <span className="sr-only">
                            {path.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/admin/learning/${path.id}/edit`} className="gap-1">
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-danger hover:text-danger"
                            onClick={() => setDeleteTarget(path)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Assign dialog */}
      <AssignDialog
        path={assignTarget}
        users={users}
        departments={departments}
        open={!!assignTarget}
        onOpenChange={(open) => !open && setAssignTarget(null)}
      />

      {/* Create path dialog */}
      <CreatePathDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger" />
              Delete path?
            </DialogTitle>
            <DialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently removed. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
