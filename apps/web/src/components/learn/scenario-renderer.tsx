'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button, Badge, MonoLabel, cn } from '@levelup/ui';
import type { ScenarioScene, SceneAssetMap, CharacterKey } from '@levelup/types';
import { progress as progressClient } from '@/lib/api';
import { usePostHog } from '@/lib/analytics/posthog-provider';

interface ScenarioRendererProps {
  scenes: ScenarioScene[];
  sceneAssets: SceneAssetMap;
  /** For analytics + the POST /progress/lessons/:id/complete call. */
  lessonId: string;
  isCompleted: boolean;
  /** Optional href to navigate to after marking complete. */
  nextLessonHref?: string | null;
}

const CHARACTER_LABEL: Record<CharacterKey, string> = {
  sara: 'Sara',
  dev: 'Dev',
  pat: 'Pat',
  narrator: 'Narrator',
};

// Bubble palette tuned for BOTH the dark Mission Brief surface and the light
// tenant themes (kapitus, ceolawyer). The bubble background is a 15% tint of
// the brand color, so the effective surface is pale on light themes (e.g.
// orange-500/15 over white ≈ #FEEADC) and very dark on Mission Brief (e.g.
// orange-500/15 over ink-900 ≈ #2C190F). A single pale text shade (text-*-200)
// works ONLY on the dark surface — it's ~1.1:1 on the pale tinted surface,
// effectively invisible. We pick a light shade as the default (Mission Brief
// is the canonical theme) and the tenant stylesheets
// (kapitus.css / ceolawyer.css) override these classes inside their scopes to
// the *-700 variant so each surface keeps ≥4.4:1 contrast.
//
// We intentionally do NOT use Tailwind arbitrary variants like
// `[.kapitus_&]:text-indigo-700` here. JIT support for that syntax depends on
// the Tailwind toolchain version + content-glob resolution at build time, and
// the Vercel sandbox has historically failed to compile it cleanly. Plain CSS
// in the tenant stylesheets is portable across every build environment.
//
// Narrator already routes through the --paper-* token bridge, which the
// tenant CSS remaps to dark slate on light surfaces — no override needed.
const CHARACTER_STYLE: Record<CharacterKey, string> = {
  sara: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
  dev: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
  pat: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
  narrator: 'bg-paper-500/10 text-paper-300 border-paper-500/30',
};

/**
 * Branching chat-bubble renderer for scenario lessons. The scene tree lives
 * entirely client-side once the server hands us the parsed scenes. We never
 * call back to the API to advance — the next-scene link is just a slug
 * lookup. Completion routes through the existing
 * `POST /progress/lessons/:id/complete` endpoint via the parent callback.
 */
export function ScenarioRenderer({
  scenes,
  sceneAssets,
  lessonId,
  isCompleted,
  nextLessonHref,
}: ScenarioRendererProps) {
  const router = useRouter();
  const sceneMap = useMemo(() => {
    const map = new Map<string, ScenarioScene>();
    for (const s of scenes) map.set(s.slug, s);
    return map;
  }, [scenes]);

  const firstSlug = scenes[0]?.slug ?? null;
  const [currentSlug, setCurrentSlug] = useState<string | null>(firstSlug);
  const [history, setHistory] = useState<string[]>(firstSlug ? [firstSlug] : []);
  const [revealedLines, setRevealedLines] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const phog = usePostHog();
  const viewedRef = useRef(new Set<string>());

  const current = currentSlug ? (sceneMap.get(currentSlug) ?? null) : null;

  // Fire scene_viewed once per unique scene per mount. Idempotent across
  // re-renders, accurate across replays of the same scene.
  useEffect(() => {
    if (!current) return;
    if (viewedRef.current.has(current.slug)) return;
    viewedRef.current.add(current.slug);
    phog?.capture('scenario.scene_viewed', {
      lessonId,
      sceneSlug: current.slug,
      isTerminal: current.terminal,
    });
  }, [current, phog, lessonId]);

  // Drip-feed dialogue lines so the scene feels like a conversation rather
  // than a wall of text. Respects prefers-reduced-motion via instant reveal.
  useEffect(() => {
    if (!current) return;
    setRevealedLines(0);
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setRevealedLines(current.lines.length);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setRevealedLines(i);
      if (i >= current.lines.length) window.clearInterval(id);
    }, 420);
    return () => window.clearInterval(id);
  }, [current]);

  function handleChoice(label: string, nextSlug: string) {
    if (!current) return;
    phog?.capture('scenario.choice_made', {
      lessonId,
      sceneSlug: current.slug,
      choiceLabel: label,
      nextSceneSlug: nextSlug,
    });
    const nextScene = sceneMap.get(nextSlug);
    if (!nextScene) {
      // Author error — fall through to a terminal-style state but log it.
      console.warn(`[scenario] choice points at missing scene "${nextSlug}"`);
      return;
    }
    setCurrentSlug(nextSlug);
    setHistory((prev) => (prev[prev.length - 1] === nextSlug ? prev : [...prev, nextSlug]));
  }

  function handleRetrace(slug: string) {
    if (slug === currentSlug) return;
    setCurrentSlug(slug);
    // History stays — we don't truncate; the bar shows the full visited path.
  }

  async function handleComplete() {
    if (completing) return;
    setCompleting(true);
    setCompletionError(null);
    try {
      await progressClient.completeLesson(lessonId);
      // Auto-advance: take the learner straight into the next lesson rather
      // than refreshing in place. Falls back to a refresh when there's no
      // next lesson (path complete — the refresh surfaces the cert state).
      if (nextLessonHref) {
        router.push(nextLessonHref);
      } else {
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'failed to mark complete';
      setCompletionError(message);
      setCompleting(false);
    }
  }

  if (!current) {
    return (
      <div className="rounded-md border border-dashed border-ink-600 p-10 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
        SCENARIO HAS NO SCENES
      </div>
    );
  }

  const imageUrl = sceneAssets[current.slug];
  const allLinesShown = revealedLines >= current.lines.length;
  const showChoices = allLinesShown && current.choices && current.choices.length > 0;
  const showCompleteButton = allLinesShown && current.terminal;

  return (
    <div className="space-y-6">
      {/* Visited-scenes breadcrumb */}
      {history.length > 1 && (
        <nav
          aria-label="Visited scenes"
          className="flex flex-wrap items-center gap-1.5"
          data-testid="scenario-breadcrumb"
        >
          <MonoLabel className="mr-1">PATH</MonoLabel>
          {history.map((slug, idx) => (
            <button
              key={`${slug}-${idx}`}
              type="button"
              onClick={() => handleRetrace(slug)}
              className={cn(
                'rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors',
                slug === currentSlug
                  ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-100'
                  : 'border-ink-600 bg-transparent text-paper-400 hover:border-paper-500/50 hover:text-paper-200',
              )}
            >
              {slug}
            </button>
          ))}
        </nav>
      )}

      {/* Scene image */}
      {imageUrl ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-md border border-ink-600 bg-ink-800">
          {imageUrl.startsWith('data:') ? (
            // Data URL (stub mode) — Next/Image refuses unconfigured data URLs.
            // Use plain <img>. The styled SVG is already optimised at ~1 KB.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={`Scene: ${current.slug}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <Image
              src={imageUrl}
              alt={`Scene: ${current.slug}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
              unoptimized
            />
          )}
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-ink-600 bg-ink-800/50 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          {current.slug.toUpperCase()}
        </div>
      )}

      {/* Dialogue */}
      <div className="space-y-3" aria-live="polite">
        {current.lines.slice(0, revealedLines).map((line, idx) => (
          <DialogueBubble
            key={`${current.slug}-${idx}`}
            character={line.character}
            text={line.text}
          />
        ))}
        {!allLinesShown && (
          <div className="flex items-center gap-2 px-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-paper-500" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-paper-500 [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-paper-500 [animation-delay:240ms]" />
          </div>
        )}
      </div>

      {/* Choices */}
      {showChoices && current.choices && (
        <div className="space-y-2 border-t border-ink-600 pt-6" data-testid="scenario-choices">
          <MonoLabel>WHAT DO YOU DO?</MonoLabel>
          <div className="grid gap-2 sm:grid-cols-1">
            {current.choices.map((choice, idx) => (
              <button
                key={`${current.slug}-choice-${idx}`}
                type="button"
                onClick={() => handleChoice(choice.label, choice.next)}
                className="rounded-md border border-ink-600 bg-ink-800/50 px-4 py-3 text-left text-paper-100 transition-colors hover:border-indigo-400/60 hover:bg-indigo-500/10 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                data-testid="scenario-choice"
              >
                <span className="font-sans text-base">{choice.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Terminal scene → complete */}
      {showCompleteButton && (
        <div className="border-t border-ink-600 pt-6">
          {isCompleted ? (
            <div className="flex flex-wrap items-center gap-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-success">
              <Badge variant="success">COMPLETED</Badge>
              <span>Scenario complete — replay any branch to explore another path.</span>
              {nextLessonHref && (
                <Button asChild variant="primary">
                  <a href={nextLessonHref}>Next lesson →</a>
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={handleComplete} disabled={completing} variant="primary">
                {completing ? 'Marking complete…' : 'Mark complete'}
              </Button>
              {completionError && (
                <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-danger">
                  {completionError}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface DialogueBubbleProps {
  character: CharacterKey;
  text: string;
}

function DialogueBubble({ character, text }: DialogueBubbleProps) {
  const isNarrator = character === 'narrator';
  return (
    <div
      className={cn('flex animate-mission-in', isNarrator ? 'justify-center' : 'justify-start')}
      data-testid="scenario-dialogue-bubble"
    >
      <div
        className={cn(
          'max-w-[36rem] rounded-2xl border px-4 py-3',
          CHARACTER_STYLE[character],
          isNarrator && 'italic',
        )}
      >
        {!isNarrator && (
          // No opacity-80 here: at 10px the label is "small text" under WCAG AA
          // (needs ≥4.5:1). Knocking the foreground to 80% pushes orange/cyan
          // on the kapitus/ceolawyer pale-tinted bubble down to ~3.3:1 — the
          // "PAT" / "DEV" labels in the original screenshot were unreadable
          // because of this. The label already reads as secondary because it's
          // smaller, uppercased, and tracked — opacity wasn't carrying weight.
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em]">
            {CHARACTER_LABEL[character]}
          </div>
        )}
        <p className="font-sans text-base leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
