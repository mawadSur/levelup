'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Send, Square } from 'lucide-react';
import { Button, MonoLabel, Textarea, toast } from '@levelup/ui';
import { coach } from '@/lib/api';
import type { ConversationDetail, CoachStreamEvent } from '@/lib/api/coach';
import {
  CoachMessage,
  type AssistantMessage,
  type ChatMessage,
  type UserMessage,
} from './coach-message';
import { PromptSuggestionCard } from './prompt-suggestion-card';
import { SavePromptDialog } from './save-prompt-dialog';
import { VoiceControls } from './voice-controls';
import { useXpState } from '@/components/learn/hud/xp-context';
import { usePostHog } from '@/lib/analytics/posthog-provider';

// ---------------------------------------------------------------------------
// Suggestion library — picked by department / role.
// ---------------------------------------------------------------------------
const DEFAULT_SUGGESTIONS = [
  'Help me draft a polite email declining a meeting.',
  'Summarise the key points from this transcript and list action items.',
  'Rewrite this paragraph to be clearer and more concise.',
  'Brainstorm 5 angles for a blog post on remote team productivity.',
];

const SUGGESTIONS_BY_DEPT: Record<string, string[]> = {
  sales: [
    'Help me draft a cold email to a CMO who just announced layoffs.',
    'Rewrite this discovery question to sound more consultative.',
    'Generate 3 follow-up subject lines after a missed demo.',
    "Summarise this prospect's LinkedIn into a 2-line opener.",
  ],
  manager: [
    'Summarize this meeting transcript into decisions, owners, and risks.',
    'Help me write a 1:1 prep doc for an underperforming report.',
    'Draft a kickoff message for a new cross-team project.',
    'Rewrite this performance feedback to be specific and kind.',
  ],
  management: [
    'Summarize this meeting transcript into decisions, owners, and risks.',
    'Help me write a 1:1 prep doc for an underperforming report.',
    'Draft a kickoff message for a new cross-team project.',
    'Rewrite this performance feedback to be specific and kind.',
  ],
  support: [
    'Rewrite this reply to sound less corporate and more human.',
    'Turn this customer complaint into a calm, empathetic response.',
    'Summarise this support thread for an internal handoff.',
    'Draft a macro for a refund request with edge cases noted.',
  ],
  hr: [
    'Help me write a JD for a senior engineer.',
    "Draft a sensitive message to a candidate we're not moving forward with.",
    'Summarise this exit interview into themes I can action.',
    'Rewrite this benefits announcement to feel warmer.',
  ],
  people: [
    'Help me write a JD for a senior engineer.',
    "Draft a sensitive message to a candidate we're not moving forward with.",
    'Summarise this exit interview into themes I can action.',
    'Rewrite this benefits announcement to feel warmer.',
  ],
  engineering: [
    'Explain this stack trace and propose a fix.',
    'Write a clear PR description from this diff.',
    'Help me draft an RFC for moving from REST to GraphQL.',
    'Review this function for clarity and edge cases.',
  ],
  marketing: [
    'Brainstorm 10 hooks for a launch announcement.',
    'Rewrite this landing page above-the-fold to be punchier.',
    'Turn this product update into a Twitter/X thread.',
    'Generate a comparison page outline vs our top competitor.',
  ],
};

function pickSuggestions(department: string | null | undefined): string[] {
  if (!department) return DEFAULT_SUGGESTIONS;
  const key = department.trim().toLowerCase();
  // Exact match first, then substring
  if (SUGGESTIONS_BY_DEPT[key]) return SUGGESTIONS_BY_DEPT[key]!;
  for (const k of Object.keys(SUGGESTIONS_BY_DEPT)) {
    if (key.includes(k) || k.includes(key)) {
      return SUGGESTIONS_BY_DEPT[k]!;
    }
  }
  return DEFAULT_SUGGESTIONS;
}

// ---------------------------------------------------------------------------
// Auto-grow textarea hook
// ---------------------------------------------------------------------------
function useAutoGrow(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  maxRows = 12,
): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Use line-height ~1.5 * font-size 14px = 21px per row.
    const lineHeight = 21;
    const padding = 16; // top+bottom 8px each (py-2 in component)
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, maxRows * lineHeight + padding);
    el.style.height = `${next}px`;
  }, [ref, value, maxRows]);
}

// ---------------------------------------------------------------------------
// Convert a server-side ConversationDetail into the chat surface's ChatMessage
// shape. ASSISTANT turns persist only the explanation text (see
// coach.service's persistence policy), so the structured fields are empty
// strings when rendered from history. Live rounds populate them via stream
// events as before.
// ---------------------------------------------------------------------------
function hydrateFromConversation(conversation: ConversationDetail): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const t of conversation.turns) {
    if (t.role === 'USER') {
      const u: UserMessage = {
        id: t.id,
        role: 'user',
        content: t.content,
      };
      out.push(u);
    } else {
      const a: AssistantMessage = {
        id: t.id,
        role: 'assistant',
        explanation: t.content,
        improvedPrompt: '',
        whyItWorks: '',
        nextAction: '',
        isStreaming: false,
        streamingField: null,
      };
      out.push(a);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface CoachChatProps {
  user: {
    name?: string;
    role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
    department?: string | null;
  };
  /** When set, the chat resumes that conversation (URL param `?c=<id>`). */
  conversationId?: string | null;
  /**
   * Server-fetched conversation detail (when `conversationId` is set).
   * Pre-rendered on the page so we don't flash an empty thread on load.
   */
  initialConversation?: ConversationDetail | null;
}

export function CoachChat({
  user,
  conversationId: initialConversationIdProp,
  initialConversation,
}: CoachChatProps) {
  const router = useRouter();

  // Hydrate initial messages from server-fetched conversation.
  const initialMessages = useMemo<ChatMessage[]>(() => {
    if (initialConversation) return hydrateFromConversation(initialConversation);
    return [];
  }, [initialConversation]);

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Tracks the conversation we're currently appending to. May come in via
  // prop (resuming a thread) or be set when the server tells us a fresh one
  // was created on the first send.
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    initialConversationIdProp ?? null,
  );

  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  // Track whether the immediately-prior user message triggered a sensitive-data
  // warning, so we can detect the "fixed prompt" pattern and award XP.
  const prevTurnWasSensitiveRef = useRef(false);
  // Debounce flag: only fire the XP toast once per conversation turn.
  const xpToastFiredThisTurnRef = useRef(false);

  const { notifyAction } = useXpState();
  const phog = usePostHog();

  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [promptToSave, setPromptToSave] = useState('');

  // ---------------------------------------------------------------------------
  // Voice: speak-responses toggle — persisted in localStorage per browser.
  // ---------------------------------------------------------------------------
  const SPEAK_RESPONSES_KEY = 'levelup:coach-speak-responses';

  const [speakResponses, setSpeakResponses] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(SPEAK_RESPONSES_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const stopTtsPlayback = useCallback(() => {
    const el = audioElRef.current;
    if (el) {
      el.pause();
      el.src = '';
    }
  }, []);

  const canShare = user.role === 'MANAGER' || user.role === 'ADMIN';
  const suggestions = useMemo(() => pickSuggestions(user.department), [user.department]);

  useAutoGrow(textareaRef, input, 12);

  // Re-hydrate messages and reset ids when the URL conversation changes
  // (e.g. user clicked a different sidebar entry). We compare on the prop
  // value so the component re-renders cleanly when Next navigates.
  useEffect(() => {
    setCurrentConversationId(initialConversationIdProp ?? null);
    if (initialConversation) {
      setMessages(hydrateFromConversation(initialConversation));
    } else if (initialConversationIdProp == null) {
      // Brand-new chat surface (clicked "+ New conversation"): reset.
      setMessages([]);
    }
    // The sensitive-fix detector resets when the conversation changes too —
    // it shouldn't carry over across threads.
    prevTurnWasSensitiveRef.current = false;
    xpToastFiredThisTurnRef.current = false;
  }, [initialConversationIdProp, initialConversation]);

  // -------------------------------------------------------------------------
  // Auto-scroll: stay pinned to bottom unless the user scrolled up.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distFromBottom < 80;
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // -------------------------------------------------------------------------
  // Send a message — open a stream and append deltas as they arrive.
  // -------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      // Client-side funnel event — fires at click time, before the server
      // responds. Pairs with the server-side `coach_invoked` event for
      // latency analysis.
      phog?.capture('coach_message_sent', {
        messageLength: trimmed.length,
        conversationId: currentConversationId ?? undefined,
      });

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
      };
      const assistantId = `a-${Date.now()}`;
      const assistantMsg: AssistantMessage = {
        id: assistantId,
        role: 'assistant',
        explanation: '',
        improvedPrompt: '',
        whyItWorks: '',
        nextAction: '',
        sensitiveDataWarning: undefined,
        streamingField: null,
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput('');
      setIsStreaming(true);
      stickToBottomRef.current = true;
      // Stop any in-progress TTS so the new response doesn't overlap
      stopTtsPlayback();

      const controller = new AbortController();
      abortRef.current = controller;
      const startedAt = Date.now();

      // Capture the conversation id for THIS request — falls back to null
      // (server creates one and echoes it back via the conversation event).
      const sendConversationId = currentConversationId;

      try {
        const stream = coach.streamCoach(
          {
            inputText: trimmed,
            ...(sendConversationId ? { conversationId: sendConversationId } : {}),
          },
          { signal: controller.signal },
        );

        for await (const event of stream as AsyncGenerator<CoachStreamEvent>) {
          if (event.type === 'conversation') {
            // Server confirmed the conversation id (newly created or echoed).
            // Pin it locally and bump the URL so a refresh keeps the thread.
            if (event.conversationId !== currentConversationId) {
              setCurrentConversationId(event.conversationId);
              try {
                router.replace(`/coach?c=${encodeURIComponent(event.conversationId)}`, {
                  scroll: false,
                });
              } catch {
                // Best-effort URL pin; routing failures shouldn't break the
                // chat surface.
              }
            }
          } else if (event.type === 'session') {
            // Final commit; nothing else to do — the URL pin already
            // happened on the conversation event.
          } else if (event.type === 'delta') {
            const field = event.field;
            const text = event.text;
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantId || m.role !== 'assistant') return m;
                const next: AssistantMessage = {
                  ...m,
                  streamingField: field,
                };
                if (field === 'explanation') {
                  next.explanation = m.explanation + text;
                } else if (field === 'improvedPrompt') {
                  next.improvedPrompt = m.improvedPrompt + text;
                } else if (field === 'whyItWorks') {
                  next.whyItWorks = m.whyItWorks + text;
                } else if (field === 'nextAction') {
                  next.nextAction = m.nextAction + text;
                }
                return next;
              }),
            );
          } else if (event.type === 'final') {
            // The final event's output may include richer fields than
            // CoachOutput's nominal shape (e.g. sensitiveDataWarning). Cast
            // through unknown to read those defensively.
            const rawOut = event.output as unknown as {
              explanation?: string;
              improvedPrompt?: string;
              whyItWorks?: string;
              nextAction?: string;
              sensitiveDataWarning?: { triggered: boolean; reason?: string };
            };
            const triggered = rawOut.sensitiveDataWarning?.triggered === true;
            if (triggered) {
              toast.warning('Sensitive data detected in your prompt.');
            }

            // Sensitive-data fix detection: previous turn flagged sensitive data
            // AND this response is clean — award XP once per turn.
            if (prevTurnWasSensitiveRef.current && !triggered && !xpToastFiredThisTurnRef.current) {
              xpToastFiredThisTurnRef.current = true;
              toast.success({
                title: '+20 XP — Saved your team from a leak',
                description: 'Your revised prompt is clean.',
              });
              notifyAction('coach');
            }

            // Update the prev-turn flag for the next round
            prevTurnWasSensitiveRef.current = triggered;
            // Reset the per-turn debounce flag after committing
            xpToastFiredThisTurnRef.current = false;

            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantId || m.role !== 'assistant') return m;
                return {
                  ...m,
                  explanation: rawOut.explanation ?? m.explanation,
                  improvedPrompt: rawOut.improvedPrompt ?? m.improvedPrompt,
                  whyItWorks: rawOut.whyItWorks ?? m.whyItWorks,
                  nextAction: rawOut.nextAction ?? m.nextAction,
                  sensitiveDataWarning: rawOut.sensitiveDataWarning,
                  streamingField: null,
                  isStreaming: false,
                };
              }),
            );

            // TTS playback — only when feature is on and there's explanation text.
            const explanationText = rawOut.explanation?.trim() ?? '';
            if (speakResponses && explanationText.length > 0 && !controller.signal.aborted) {
              void (async () => {
                try {
                  const audioBlob = await coach.synthesizeSpeech(explanationText);
                  const url = URL.createObjectURL(audioBlob);
                  let el = audioElRef.current;
                  if (!el) {
                    el = new Audio();
                    audioElRef.current = el;
                  }
                  el.src = url;
                  el.onended = () => URL.revokeObjectURL(url);
                  await el.play();
                } catch {
                  // TTS failure is non-critical — swallow silently
                }
              })();
            }
          }
        }

        const elapsed = Date.now() - startedAt;
        if (elapsed > 3000) {
          toast.success('Coach response complete');
        }
      } catch (err) {
        const aborted =
          (err instanceof DOMException && err.name === 'AbortError') || controller.signal.aborted;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId || m.role !== 'assistant') return m;
            return {
              ...m,
              isStreaming: false,
              streamingField: null,
              errorMessage: aborted
                ? undefined
                : err instanceof Error
                  ? err.message
                  : 'Stream failed.',
            };
          }),
        );
      } finally {
        // Always settle isStreaming on the assistant message.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.role === 'assistant'
              ? { ...m, isStreaming: false, streamingField: null }
              : m,
          ),
        );
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [
      isStreaming,
      currentConversationId,
      router,
      notifyAction,
      phog,
      speakResponses,
      stopTtsPlayback,
    ],
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    stopTtsPlayback();
  }, [stopTtsPlayback]);

  const handleNewConversation = useCallback(() => {
    // Abort an in-flight stream, clear local state, and route back to the
    // bare /coach url so the next send creates a fresh conversation.
    abortRef.current?.abort();
    stopTtsPlayback();
    setMessages([]);
    setCurrentConversationId(null);
    setInput('');
    prevTurnWasSensitiveRef.current = false;
    xpToastFiredThisTurnRef.current = false;
    try {
      router.replace('/coach', { scroll: false });
    } catch {
      // tolerate routing failures (preview, jest, etc.)
    }
  }, [router, stopTtsPlayback]);

  const handleRetry = useCallback(
    (assistantId: string) => {
      // Find the immediately-preceding user message, drop the failed assistant
      // bubble, and re-send.
      const idx = messages.findIndex((m) => m.id === assistantId);
      if (idx <= 0) return;
      const prior = messages[idx - 1];
      if (!prior || prior.role !== 'user') return;
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      void sendMessage(prior.content);
    },
    [messages, sendMessage],
  );

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  function openSavePrompt(text: string) {
    setPromptToSave(text);
    setSavePromptOpen(true);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="flex-none border-b border-ink-600 bg-ink-900/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <MonoLabel>AI COACH · ACTIVE</MonoLabel>
            <h1 className="font-serif text-h2 italic text-paper-100">
              Ask anything. I&apos;ll sharpen your prompt.
            </h1>
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              SENSITIVE INPUTS ARE FLAGGED — NEVER BLOCKED
            </p>
          </div>
          {(messages.length > 0 || currentConversationId) && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleNewConversation}
              className="flex-none"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              New conversation
            </Button>
          )}
        </div>
      </header>

      {/* Scroll area */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <div className="py-8">
              <MonoLabel className="mb-3 block">EXAMPLE PROMPTS</MonoLabel>
              <h2 className="mb-1 font-serif text-h1 italic text-paper-100">Try asking…</h2>
              <p className="mb-6 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                {user.department
                  ? `TAILORED FOR ${user.department.toUpperCase()}`
                  : 'PICK ONE TO BEGIN'}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <PromptSuggestionCard
                    key={s}
                    text={s}
                    onPick={(t) => {
                      setInput(t);
                      textareaRef.current?.focus();
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m) => (
                <CoachMessage
                  key={m.id}
                  message={m}
                  canShare={canShare}
                  onSavePrompt={openSavePrompt}
                  onRetry={
                    m.role === 'assistant' && m.errorMessage ? () => handleRetry(m.id) : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="flex-none border-t border-ink-600 bg-ink-900 px-4 py-3 sm:px-6">
        <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-3xl items-end gap-2">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isStreaming
                  ? 'Coach is responding...'
                  : 'Ask the coach anything... (Cmd/Ctrl + Enter to send)'
              }
              disabled={isStreaming}
              rows={1}
              maxLength={8000}
              className="resize-none py-2 text-sm leading-relaxed"
            />
            <p className="mt-1.5 px-0.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              ⌘/CTRL + ENTER · NEVER PASTE PII OR SECRETS
            </p>
          </div>
          <VoiceControls
            onTranscript={(t) => setInput((cur) => (cur ? `${cur} ${t}` : t))}
            speakResponses={speakResponses}
            onToggleSpeak={() => {
              setSpeakResponses((s) => {
                const next = !s;
                try {
                  localStorage.setItem(SPEAK_RESPONSES_KEY, String(next));
                } catch {
                  // ignore storage errors (private browsing, etc.)
                }
                return next;
              });
            }}
          />
          {isStreaming ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleStop}
              className="h-10 px-3"
              aria-label="Stop"
            >
              <Square className="h-4 w-4" aria-hidden="true" fill="currentColor" />
              <span className="ml-1.5 hidden sm:inline">Stop</span>
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              disabled={input.trim().length === 0}
              className="h-10 px-3"
              aria-label="Send"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span className="ml-1.5 hidden sm:inline">Send</span>
            </Button>
          )}
        </form>
      </div>

      <SavePromptDialog
        open={savePromptOpen}
        onOpenChange={setSavePromptOpen}
        promptText={promptToSave}
        canShare={canShare}
      />
    </div>
  );
}
