'use client';

import { MarkdownView } from '@/components/learn/markdown-view';

interface MarkdownPreviewProps {
  content: string;
}

/**
 * Thin wrapper so policy pages import from the policy component directory,
 * while the actual rendering is shared with the learner MarkdownView.
 */
export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return <p className="text-sm text-muted-foreground italic">Start typing to see a preview…</p>;
  }
  return <MarkdownView content={content} />;
}
