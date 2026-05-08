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
  MonoLabel,
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
    <div className="mx-auto max-w-content px-6 py-10">
      <header className="mb-8 space-y-2">
        <MonoLabel>GOVERNANCE</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">Company AI Policy</h1>
        <p className="max-w-reading text-body text-paper-300">
          Publish your AI policy. Define which tools are approved for which data classes.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — current policy + editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current policy card */}
          {current ? (
            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <FileText className="h-5 w-5 shrink-0 text-signal" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <MonoLabel>CURRENT POLICY · v{current.version}</MonoLabel>
                  <CardTitle className="mt-1 font-serif text-h2 italic text-paper-100">
                    Active rules of engagement
                  </CardTitle>
                  <p className="mt-1 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    PUBLISHED {formatDate(current.publishedAt).toUpperCase()}
                  </p>
                </div>
                <Badge variant="signal">ACTIVE</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="line-clamp-3 text-body-sm text-paper-300">
                  {current.policyText.slice(0, 200)}
                  {current.policyText.length > 200 ? '…' : ''}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setViewVersion(current)}>
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setEditorOpen(true)}>
                    <ChevronRight className="h-4 w-4" />
                    Edit &amp; republish
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="space-y-4 py-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-paper-500" aria-hidden="true" />
                <MonoLabel>NO POLICY YET</MonoLabel>
                <p className="mx-auto max-w-xs text-body-sm text-paper-300">
                  Adopt the LevelUp sample policy to get started quickly.
                </p>
                <Button variant="primary" onClick={() => setEditorOpen(true)}>
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
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <Clock className="h-4 w-4 text-paper-500" aria-hidden="true" />
              <MonoLabel>VERSION HISTORY</MonoLabel>
            </CardHeader>
            <CardContent>
              <PolicyHistoryList policies={allVersions} currentId={current?.id ?? null} />
              {allVersions.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <p className="text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    SELECT A VERSION TO VIEW (READ-ONLY)
                  </p>
                  <ul className="mt-2 space-y-1">
                    {[...allVersions]
                      .sort((a, b) => b.version - a.version)
                      .map((v) => (
                        <li key={v.id}>
                          <button
                            type="button"
                            onClick={() => setViewVersion(v)}
                            className="w-full rounded-sm px-2 py-1 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-signal transition-colors hover:bg-ink-700 hover:text-paper-100"
                          >
                            VIEW v{v.version} →
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
                <span className="ml-2 text-sm font-normal text-paper-300">
                  — {formatDate(viewVersion.publishedAt)}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-md border border-ink-600 bg-ink-700/30 p-4">
            <MarkdownPreview content={viewVersion?.policyText ?? ''} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
