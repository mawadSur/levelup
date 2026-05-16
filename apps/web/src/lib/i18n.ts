/**
 * Minimal i18n helper for the web app (CR.38).
 *
 * Deliberately avoids `next-intl` / `react-i18next` for this first wave — those
 * libraries can be swapped in later without changing the call shape if we keep
 * the API surface here small: `getLocale()` reads the locale, `getTranslations(ns)`
 * returns a synchronous `t(key)` function scoped to a namespace.
 *
 * Resolution order at request time:
 *   1. `levelup-locale` cookie (set explicitly by the user — see future locale
 *      switcher).
 *   2. `Accept-Language` header (best-match against SUPPORTED_LOCALES).
 *   3. `defaultLocale` ('en').
 *
 * The bundle is loaded statically via `import` so the bundler can tree-shake
 * unused locales. Missing keys fall back to English; missing English keys
 * return the dotted key itself (visible in dev, harmless in prod).
 */

import 'server-only';
import { cookies, headers } from 'next/headers';
import en from '../../messages/en.json';
import es from '../../messages/es.json';
import fr from '../../messages/fr.json';
import pt from '../../messages/pt.json';

export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'pt'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'levelup-locale';

type MessageTree = { [key: string]: string | MessageTree };

const BUNDLES: Record<Locale, MessageTree> = {
  // JSON imports get inferred literal types — cast through `unknown` to silence
  // the widening complaint without losing strict mode elsewhere in the file.
  en: en as unknown as MessageTree,
  es: es as unknown as MessageTree,
  fr: fr as unknown as MessageTree,
  pt: pt as unknown as MessageTree,
};

function isSupportedLocale(value: string | undefined | null): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve the active locale for the current request. Safe to call from server
 * components and route handlers. Never throws.
 */
export async function getLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
    if (isSupportedLocale(fromCookie)) return fromCookie;
  } catch {
    // cookies() can throw if called in a build context — fall through.
  }

  try {
    const headerStore = await headers();
    const acceptLanguage = headerStore.get('accept-language') ?? '';
    const fromHeader = pickFromAcceptLanguage(acceptLanguage);
    if (isSupportedLocale(fromHeader)) return fromHeader;
  } catch {
    // ditto
  }

  return DEFAULT_LOCALE;
}

/** Parses `Accept-Language` and returns the best-matching supported locale. */
function pickFromAcceptLanguage(header: string): Locale | null {
  if (header === '') return null;
  const parts = header.split(',').map((part) => {
    const [tagRaw, qRaw] = part.trim().split(';');
    const tag = (tagRaw ?? '').toLowerCase();
    const q = qRaw && qRaw.startsWith('q=') ? parseFloat(qRaw.slice(2)) : 1;
    return { tag, q: Number.isNaN(q) ? 0 : q };
  });
  parts.sort((a, b) => b.q - a.q);
  for (const { tag } of parts) {
    // Match the language subtag — `es-MX` should resolve to `es`.
    const primary = tag.split('-')[0] ?? '';
    if (isSupportedLocale(primary)) return primary;
  }
  return null;
}

function resolveNamespace(bundle: MessageTree, namespace: string): MessageTree | null {
  const segments = namespace.split('.').filter((s) => s.length > 0);
  let node: MessageTree | string = bundle;
  for (const segment of segments) {
    if (typeof node !== 'object' || node === null || !(segment in node)) return null;
    const next: MessageTree | string | undefined = (node as MessageTree)[segment];
    if (next === undefined) return null;
    node = next;
  }
  return typeof node === 'object' ? node : null;
}

export interface Translator {
  (key: string): string;
}

/**
 * Returns a synchronous translator scoped to a namespace.
 *
 *   const t = await getTranslations('nav');
 *   t('signIn'); // 'Sign in'
 *
 * Missing keys fall back to the English bundle; missing English keys return
 * the dotted lookup path so they're easy to spot in dev.
 */
export async function getTranslations(namespace: string): Promise<Translator> {
  const locale = await getLocale();
  const active = resolveNamespace(BUNDLES[locale], namespace);
  const fallback =
    locale === DEFAULT_LOCALE ? null : resolveNamespace(BUNDLES[DEFAULT_LOCALE], namespace);

  return (key: string): string => {
    const fromActive = active && typeof active[key] === 'string' ? (active[key] as string) : null;
    if (fromActive !== null) return fromActive;
    const fromFallback =
      fallback && typeof fallback[key] === 'string' ? (fallback[key] as string) : null;
    if (fromFallback !== null) return fromFallback;
    return `${namespace}.${key}`;
  };
}
