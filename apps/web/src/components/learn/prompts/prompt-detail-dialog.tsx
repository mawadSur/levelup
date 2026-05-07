'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  toast,
} from '@levelup/ui';
import type { Prompt } from '@/lib/api/prompts';

interface PromptDetailDialogProps {
  prompt: Prompt;
  trigger: React.ReactNode;
}

export function PromptDetailDialog({ prompt, trigger }: PromptDetailDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt.promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-8">{prompt.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Badge variant="secondary" className="text-xs">
                {prompt.category}
              </Badge>
              {prompt.isShared && (
                <Badge variant="outline" className="text-xs">
                  Shared
                </Badge>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/40 p-4">
          <pre className="whitespace-pre-wrap font-mono text-sm text-foreground leading-relaxed">
            {prompt.promptText}
          </pre>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy text'}
          </Button>
          <Button asChild size="sm">
            <Link href={`/coach?prompt=${prompt.id}`}>Use in coach</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
