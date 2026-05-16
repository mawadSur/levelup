'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition, type SyntheticEvent } from 'react';
import type { Locale } from '@/lib/i18n';

interface LocaleOption {
  value: Locale;
  label: string;
}

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
};

interface LocaleSwitcherProps {
  /** List of supported locales (passed from server to avoid hardcoding). */
  supported: readonly Locale[];
  /** Currently-active locale resolved server-side via `getLocale()`. */
  current: Locale;
}

/**
 * Tiny `<select>` that navigates to `?locale=xx` of the current pathname.
 * The middleware writes the `levelup-locale` cookie when it sees that query
 * param (see `apps/web/middleware.ts`), then we `router.refresh()` so server
 * components re-render with the new bundle.
 */
export function LocaleSwitcher({ supported, current }: LocaleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const options: LocaleOption[] = supported.map((value) => ({
    value,
    label: LOCALE_LABELS[value],
  }));

  function handleChange(next: string) {
    if (next === current) return;
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('locale', next);
    const url = `${pathname}?${params.toString()}`;
    startTransition(() => {
      router.push(url);
      router.refresh();
    });
  }

  // Radix's DropdownMenuContent listens for pointerdown / focusout outside its
  // own subtree and closes the menu. The native <select>'s OS-level popup
  // steals focus on macOS/iOS, which Radix interprets as "user clicked
  // outside" and dismisses the parent menu before the user can pick a locale.
  //
  // Swallowing pointerdown/mousedown/keydown at the wrapper level prevents
  // those events from bubbling up to Radix's outside-click detector. The
  // native select still receives the events because they bubble from the
  // <select> element itself — we only stop them after they've been handled
  // by the select. Combined with the parent DropdownMenuContent's own
  // `onCloseAutoFocus={(e) => e.preventDefault()}` (added in learner-shell),
  // the menu stays open across locale changes on every platform.
  function swallow(e: SyntheticEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className="px-3 py-2"
      onPointerDown={swallow}
      onMouseDown={swallow}
      onKeyDown={swallow}
      onFocusCapture={swallow}
    >
      <label
        htmlFor="locale-switcher"
        className="block font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500"
      >
        LANGUAGE
      </label>
      <select
        id="locale-switcher"
        value={current}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        className="mt-1 block w-full rounded-sm border border-ink-600 bg-ink-800 px-2 py-1 font-sans text-body-sm text-paper-100 focus:border-signal focus:outline-none disabled:opacity-50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
