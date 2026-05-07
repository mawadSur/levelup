'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getMyFlags } from '@/lib/api/flags';

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------
interface FlagsContextValue {
  flags: Record<string, boolean>;
  loaded: boolean;
}

const FlagsContext = createContext<FlagsContextValue>({
  flags: {},
  loaded: false,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function FlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    getMyFlags()
      .then((data) => {
        setFlags(data);
        setLoaded(true);
      })
      .catch(() => {
        // On error, treat everything as off — safe degradation
        setLoaded(true);
      });
  }, []);

  return <FlagsContext.Provider value={{ flags, loaded }}>{children}</FlagsContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Returns the evaluated boolean value for a flag key.
 * Returns `false` until the flags have loaded (first render / SSR is "all off").
 * This is the documented behaviour — features flip on after hydration.
 */
export function useFlag(key: string): boolean {
  const { flags } = useContext(FlagsContext);
  return flags[key] ?? false;
}

/**
 * Same as `useFlag` but lets you provide a fallback for SSR / pre-load state.
 */
export function useFlagWithFallback(key: string, fallback: boolean): boolean {
  const { flags, loaded } = useContext(FlagsContext);
  if (!loaded) return fallback;
  return flags[key] ?? false;
}

/**
 * Returns whether the flags have finished loading.
 */
export function useFlagsLoaded(): boolean {
  return useContext(FlagsContext).loaded;
}

/**
 * Returns a stable getter function to read any flag without subscribing to
 * the full context on every render.
 */
export function useFlagGetter(): (key: string) => boolean {
  const { flags } = useContext(FlagsContext);
  return useCallback((key: string) => flags[key] ?? false, [flags]);
}
