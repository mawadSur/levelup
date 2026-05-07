'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onboarding } from '@/lib/api';
import type { OnboardingState } from '@levelup/types';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface OnboardingContextValue {
  state: OnboardingState | null;
  loading: boolean;
  advance(step: number): Promise<void>;
  dismiss(): Promise<void>;
  restart(): Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load state on mount — tolerant of network errors (returns null state).
  useEffect(() => {
    let cancelled = false;
    onboarding
      .getOnboardingState()
      .then((s) => {
        if (!cancelled && mountedRef.current) {
          setState(s);
        }
      })
      .catch(() => {
        // Swallow errors: tour simply won't show.
      })
      .finally(() => {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const advance = useCallback(async (step: number) => {
    try {
      const next = await onboarding.advanceOnboarding(step);
      if (mountedRef.current) setState(next);
    } catch {
      // Non-fatal — tour just stays where it is.
    }
  }, []);

  const dismiss = useCallback(async () => {
    try {
      const next = await onboarding.dismissOnboarding();
      if (mountedRef.current) setState(next);
    } catch {
      // Non-fatal.
    }
  }, []);

  const restart = useCallback(async () => {
    try {
      const next = await onboarding.restartOnboarding();
      if (mountedRef.current) setState(next);
    } catch {
      // Non-fatal.
    }
  }, []);

  return (
    <OnboardingContext.Provider value={{ state, loading, advance, dismiss, restart }}>
      {children}
    </OnboardingContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding() must be used inside <OnboardingProvider>');
  }
  return ctx;
}
