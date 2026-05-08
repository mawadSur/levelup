'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Lightbulb,
  RotateCw,
  Save,
  Sparkles,
  User,
} from 'lucide-react';
import { Button, cn, toast } from '@levelup/ui';
import { SensitiveWarningBanner } from './sensitive-warning-banner';

// ---------------------------------------------------------------------------
// Per-character fade-in for the explanation field.
//
// When a new delta arrives, we wrap the *new* characters in a <span> that
// plays a short opacity+y-lift CSS animation.  We track the previous length
// so we know exactly which characters are new.  We avoid re-rendering the
// entire string per character — only the newest batch gets an animated span.
// ---------------------------------------------------------------------------

const CHAR_FADE_CSS = `
  @keyframes coachCharFadeIn {
    from { opacity: 0; transform: translateY(3px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: no-preference) {
    .coach-char-delta {
      animation: coachCharFadeIn 220ms ease forwards;
    }
  }
`;

/**
 * Wraps MiniMarkdown with the per-character delta animation for the
 * explanation field.  When not streaming, renders exactly as MiniMarkdown.
 * While streaming, the last committed paragraph is rendered normally and the
 * trailing new-character delta is appended as a fading <span>.
 */
function ExplanationRenderer({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const prevLenRef = useRef(0);
  // committed = text we've already animated in (or all text when not streaming)
  const [committed, setCommitted] = useState(text);
  const [delta, setDelta] = useState('');
  // Key is bumped each delta so the <span> re-mounts and replays the animation
  const deltaKeyRef = useRef(0);

  useEffect(() => {
    const prevLen = prevLenRef.current;
    if (text.length > prevLen) {
      const newDelta = text.slice(prevLen);
      setCommitted(text.slice(0, prevLen));
      setDelta(newDelta);
      deltaKeyRef.current += 1;
      prevLenRef.current = text.length;
    } else if (text.length < prevLen) {
      // Message reset — start fresh
      prevLenRef.current = 0;
      setCommitted('');
      setDelta(text);
      deltaKeyRef.current += 1;
    } else if (!isStreaming) {
      // Streaming finished — absorb delta into committed
      setCommitted(text);
      setDelta('');
    }
  }, [text, isStreaming]);

  if (!isStreaming) {
    return <MiniMarkdown text={text} />;
  }

  return (
    <>
      <style>{CHAR_FADE_CSS}</style>
      {committed && <MiniMarkdown text={committed} />}
      {delta && (
        <span
          key={deltaKeyRef.current}
          className="coach-char-delta whitespace-pre-wrap text-sm text-paper-100"
        >
          {delta}
        </span>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Lightweight markdown renderer
//
// Just enough to render paragraphs, lists, **bold**, and inline `code`. We
// intentionally avoid pulling in a full markdown lib for this single surface
// — the explanation field is short, plain prose.
// ---------------------------------------------------------------------------
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  // **bold** then `code`
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*)|(`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={`${keyPrefix}-b-${i++}`}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(
        <code
          key={`${keyPrefix}-c-${i++}`}
          className="rounded bg-ink-700 px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function MiniMarkdown({ text }: { text: string }) {
  if (!text.trim()) return null;
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let listBuf: string[] = [];

  function flushList() {
    if (listBuf.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-2 list-disc space-y-1 pl-5">
        {listBuf.map((item, idx) => (
          <li key={idx}>{renderInline(item, `li-${blocks.length}-${idx}`)}</li>
        ))}
      </ul>,
    );
    listBuf = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    const listMatch = /^\s*[-*]\s+(.+)$/.exec(line);
    if (listMatch) {
      listBuf.push(listMatch[1]!);
    } else {
      flushList();
      if (line.trim().length === 0) {
        // paragraph break — represented by a spacer
        blocks.push(<div key={`sp-${i++}`} className="h-2" />);
      } else {
        blocks.push(
          <p key={`p-${i++}`} className="leading-relaxed">
            {renderInline(line, `p-${i}`)}
          </p>,
        );
      }
    }
  }
  flushList();

  return <div className="space-y-1 text-sm text-paper-100">{blocks}</div>;
}

// ---------------------------------------------------------------------------
// Typing indicator (3-dot pulse). Only shown next to the section currently
// streaming.
// ---------------------------------------------------------------------------
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle" aria-label="Coach is typing">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal [animation-delay:300ms]" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section reveal wrapper — soft slide-down when first content arrives
// ---------------------------------------------------------------------------
function SectionReveal({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-[sectionReveal_280ms_ease-out]">
      <style jsx>{`
        @keyframes sectionReveal {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------
export interface UserMessage {
  id: string;
  role: 'user';
  content: string;
}

export interface AssistantMessage {
  id: string;
  role: 'assistant';
  explanation: string;
  improvedPrompt: string;
  whyItWorks: string;
  nextAction: string;
  sensitiveDataWarning?: { triggered: boolean; reason?: string };
  /** Which field is currently streaming, if any. */
  streamingField?: 'explanation' | 'improvedPrompt' | 'whyItWorks' | 'nextAction' | null;
  /** True while the request is still in flight. */
  isStreaming: boolean;
  /** Inline error to display. */
  errorMessage?: string;
}

export type ChatMessage = UserMessage | AssistantMessage;

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------
interface CoachMessageProps {
  message: ChatMessage;
  /** Manager+ users can share saved prompts to org. */
  canShare: boolean;
  onSavePrompt: (text: string) => void;
  onRetry?: () => void;
}

export function CoachMessage({ message, canShare, onSavePrompt, onRetry }: CoachMessageProps) {
  if (message.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          YOU
        </span>
        <div className="max-w-[85%] rounded-md border border-ink-600 bg-ink-700 px-4 py-2.5 text-body-sm text-paper-100">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  void canShare; // forwarded via onSavePrompt
  return <AssistantBubble message={message} onSavePrompt={onSavePrompt} onRetry={onRetry} />;
}

// ---------------------------------------------------------------------------
// Assistant bubble
// ---------------------------------------------------------------------------
interface AssistantBubbleProps {
  message: AssistantMessage;
  onSavePrompt: (text: string) => void;
  onRetry?: () => void;
}

function AssistantBubble({ message, onSavePrompt, onRetry }: AssistantBubbleProps) {
  const [showWhy, setShowWhy] = useState(false);

  const triggered = message.sensitiveDataWarning?.triggered === true;
  const hasExplanation = message.explanation.length > 0;
  const hasImproved = message.improvedPrompt.length > 0;
  const hasWhy = message.whyItWorks.length > 0;
  const hasNext = message.nextAction.length > 0;

  // While streaming, we may have nothing yet — show a small "thinking" bubble.
  const isEmpty = message.isStreaming && !hasExplanation && !hasImproved && !hasWhy && !hasNext;

  function handleCopy() {
    void navigator.clipboard
      .writeText(message.improvedPrompt)
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Could not copy'));
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="flex items-center gap-1.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">
        <Sparkles size={12} aria-hidden="true" />
        COACH
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        {message.errorMessage && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            <p className="font-medium">Something went wrong</p>
            <p className="mt-0.5 text-xs opacity-90">{message.errorMessage}</p>
            {onRetry && (
              <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
                <RotateCw className="mr-1.5 h-3 w-3" aria-hidden="true" />
                Retry
              </Button>
            )}
          </div>
        )}

        {triggered && (
          <SectionReveal>
            <SensitiveWarningBanner reason={message.sensitiveDataWarning?.reason} />
          </SectionReveal>
        )}

        {isEmpty && !message.errorMessage && (
          <div className="flex items-center gap-2 rounded-md border border-ink-600 bg-ink-800 px-4 py-3 text-body-sm text-paper-300">
            <TypingDots />
            <span className="font-mono text-mono-sm uppercase tracking-[0.05em]">
              COACH IS THINKING…
            </span>
          </div>
        )}

        {/* 1. Explanation — per-character fade reveal during streaming */}
        {hasExplanation && (
          <SectionReveal>
            <div className="rounded-md border border-ink-600 bg-ink-800 px-4 py-3">
              <ExplanationRenderer
                text={message.explanation}
                isStreaming={message.streamingField === 'explanation'}
              />
              {message.streamingField === 'explanation' && (
                <div className="mt-1 inline-block">
                  <TypingDots />
                </div>
              )}
            </div>
          </SectionReveal>
        )}

        {/* 2. Improved prompt */}
        {hasImproved && (
          <SectionReveal>
            <div className="overflow-hidden rounded-md border border-ink-600 bg-ink-800">
              <div className="flex items-center justify-between border-b border-ink-600 bg-ink-700 px-4 py-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">
                  <Sparkles size={12} aria-hidden="true" />
                  IMPROVED PROMPT
                </span>
                {message.streamingField === 'improvedPrompt' && <TypingDots />}
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-mono leading-relaxed text-paper-100">
                {message.improvedPrompt}
              </pre>
              <div className="flex flex-wrap items-center gap-2 border-t border-ink-600 bg-ink-900 px-3 py-2">
                <Button size="sm" variant="ghost" onClick={handleCopy}>
                  <Copy className="mr-1.5 h-3 w-3" aria-hidden="true" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSavePrompt(message.improvedPrompt)}
                >
                  <Save className="mr-1.5 h-3 w-3" aria-hidden="true" />
                  Save to library
                </Button>
              </div>
            </div>
          </SectionReveal>
        )}

        {/* 3. Why it works (collapsed) */}
        {hasWhy && (
          <SectionReveal>
            <div className="rounded-md border border-ink-600 bg-ink-800">
              <button
                type="button"
                onClick={() => setShowWhy((v) => !v)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300 hover:bg-ink-700"
                aria-expanded={showWhy}
              >
                {showWhy ? (
                  <ChevronDown size={14} aria-hidden="true" />
                ) : (
                  <ChevronRight size={14} aria-hidden="true" />
                )}
                <span className="flex-1">WHY IT WORKS</span>
                {message.streamingField === 'whyItWorks' && <TypingDots />}
              </button>
              {showWhy && (
                <div className="border-t border-ink-600 px-4 py-3">
                  <MiniMarkdown text={message.whyItWorks} />
                </div>
              )}
            </div>
          </SectionReveal>
        )}

        {/* 4. Next action */}
        {hasNext && (
          <SectionReveal>
            <div
              className={cn(
                'flex items-start gap-3 rounded-md border border-signal-dim bg-ink-800 px-4 py-3',
              )}
            >
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-data bg-signal/15 text-signal">
                <Lightbulb size={12} aria-hidden="true" />
              </span>
              <div className="flex-1 space-y-1">
                <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">
                  NEXT ACTION
                </p>
                <MiniMarkdown text={message.nextAction} />
                {message.streamingField === 'nextAction' && (
                  <div className="mt-1 inline-block">
                    <TypingDots />
                  </div>
                )}
              </div>
            </div>
          </SectionReveal>
        )}
      </div>
    </div>
  );
}
