'use client';

import * as React from 'react';
import { FileText, Clock, Eye, ChevronRight } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Separator,
} from '@levelup/ui';
import type { PolicyVersion } from '@/lib/api/policies';
import { PolicyEditor } from '@/components/admin/policy/policy-editor';
import { PolicyHistoryList } from '@/components/admin/policy/policy-history-list';
import { MarkdownPreview } from '@/components/admin/policy/markdown-preview';

interface PolicyPageClientProps {
  current: PolicyVersion | null;
  allVersions: PolicyVersion[];
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PolicyPageClient({
  current: initialCurrent,
  allVersions: initialVersions,
}: PolicyPageClientProps) {
  const [current, setCurrent] = React.useState(initialCurrent);
  const [allVersions, setAllVersions] = React.useState<PolicyVersion[]>(initialVersions);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [viewVersion, setViewVersion] = React.useState<PolicyVersion | null>(null);

  function handlePublished(policy: PolicyVersion) {
    setCurrent(policy);
    setAllVersions((prev) => {
      const idx = prev.findIndex((p) => p.id === policy.id);
      if (idx >= 0) {
        return prev.map((p) => (p.id === policy.id ? policy : p));
      }
      return [policy, ...prev];
    });
    setEditorOpen(false);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Company AI Policy</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish your AI policy. Define which tools are approved for which data classes.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — current policy + editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current policy card */}
          {current ? (
            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <FileText className="h-5 w-5 text-indigo-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">Current policy — v{current.version}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Published {formatDate(current.publishedAt)}
                  </p>
                </div>
                <Badge variant="secondary">Active</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {current.policyText.slice(0, 200)}
                  {current.policyText.length > 200 ? '…' : ''}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setViewVersion(current)}
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={() => setEditorOpen(true)}>
                    <ChevronRight className="h-4 w-4" />
                    Edit & republish
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Empty state */
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <h2 className="text-base font-semibold text-foreground">No policy yet</h2>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                  Adopt the LevelUp sample policy to get started quickly.
                </p>
                <Button className="mt-4" onClick={() => setEditorOpen(true)}>
                  Create AI policy
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Policy editor (rendered inline when open on large screens) */}
          {editorOpen && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {current ? `Edit policy (new version)` : 'Create policy'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PolicyEditor initialPolicy={current} onPublished={handlePublished} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — history */}
        <div>
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Version history</CardTitle>
            </CardHeader>
            <CardContent>
              <PolicyHistoryList policies={allVersions} currentId={current?.id ?? null} />
              {allVersions.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <p className="text-xs text-muted-foreground text-center">
                    Click a version below to view (read-only)
                  </p>
                  <ul className="mt-2 space-y-1">
                    {[...allVersions]
                      .sort((a, b) => b.version - a.version)
                      .map((v) => (
                        <li key={v.id}>
                          <button
                            type="button"
                            onClick={() => setViewVersion(v)}
                            className="w-full text-left rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
                          >
                            View v{v.version} &rarr;
                          </button>
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View version modal */}
      <Dialog open={!!viewVersion} onOpenChange={(o) => !o && setViewVersion(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Policy v{viewVersion?.version}
              {viewVersion?.publishedAt && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — {formatDate(viewVersion.publishedAt)}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <MarkdownPreview content={viewVersion?.policyText ?? ''} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
