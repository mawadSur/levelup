'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Badge, Input } from '@levelup/ui';
import { searchAll } from '@/lib/api/search';
import type { SearchHit } from '@levelup/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Highlight all case-insensitive occurrences of `term` inside `text` using
 * a <mark> element. This is intentionally simple — no regex injection risk
 * because we escape the term before building the regex.
 */
function HighlightedText({ text, query }: { text: string; query: string }): React.ReactElement {
  if (!query.trim()) return <span>{text}</span>;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-100 text-yellow-900 rounded-sm px-0.5 dark:bg-yellow-800 dark:text-yellow-100"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [stub, setStub] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on open
  useEffect(() => {
    if (open) {
      // Small delay to allow the Dialog animation to complete
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setLoading(false);
      setStub(false);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await searchAll(query.trim(), 10);
        setResults(response.hits);
        setStub(response.stub ?? false);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleHitClick(hit: SearchHit) {
    onOpenChange(false);
    if (hit.type === 'lesson' && hit.pathSlug && hit.slug) {
      router.push(`/learn/${hit.pathSlug}/${hit.slug}`);
    } else if (hit.type === 'lesson' && hit.pathSlug) {
      router.push(`/learn/${hit.pathSlug}`);
    } else if (hit.type === 'prompt') {
      router.push(`/prompts?id=${hit.id}`);
    }
  }

  const hasResults = results.length > 0;
  const showEmpty = query.trim().length >= 2 && !loading && !hasResults;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="sr-only">Search lessons and prompts</DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="flex items-center border-b px-4 py-2 gap-2">
          <svg
            className="h-4 w-4 shrink-0 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lessons and prompts…"
            className="border-0 shadow-none focus-visible:ring-0 text-base px-0"
            aria-label="Search"
          />
          {loading && (
            <svg
              className="h-4 w-4 animate-spin text-muted-foreground shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
        </div>

        {/* Stub-mode banner */}
        {stub && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950 border-b text-xs text-amber-700 dark:text-amber-300">
            Search relevance is limited without semantic search.
          </div>
        )}

        {/* Results */}
        <div className="max-h-[24rem] overflow-y-auto py-2">
          {/* Empty state — only shown when query is long enough and no results */}
          {showEmpty && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {/* Default hint when query is too short */}
          {query.trim().length < 2 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Search lessons and prompts. Try &ldquo;cold email&rdquo;.
            </p>
          )}

          {/* Hit list */}
          {hasResults &&
            results.map((hit) => (
              <button
                key={`${hit.type}-${hit.id}`}
                className="w-full text-left px-4 py-3 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none transition-colors"
                onClick={() => handleHitClick(hit)}
              >
                <div className="flex items-start gap-2">
                  <Badge
                    variant="secondary"
                    className="mt-0.5 shrink-0 capitalize text-[10px] px-1.5"
                  >
                    {hit.type}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight truncate">
                      <HighlightedText text={hit.title} query={query} />
                    </p>
                    {hit.pathTitle && (
                      <p className="text-xs text-muted-foreground mt-0.5">{hit.pathTitle}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      <HighlightedText text={hit.snippet} query={query} />
                    </p>
                  </div>
                </div>
              </button>
            ))}
        </div>

        {/* Footer hint */}
        <div className="border-t px-4 py-2 flex justify-end">
          <span className="text-xs text-muted-foreground">
            Press <kbd className="rounded border px-1 text-[10px]">Esc</kbd> to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
