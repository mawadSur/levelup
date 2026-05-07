'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { game } from '@/lib/api';
import type { GameState } from '@levelup/types';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface XpState {
  /** Current game state from the server, or null while loading / on error. */
  state: GameState | null;
  loading: boolean;
  /** Re-fetches game state from the server. */
  refresh(): Promise<void>;
  /**
   * Notifies the context that an XP-earning action just happened.
   * Schedules a refresh after a short delay so the backend has time to commit.
   */
  notifyAction(kind: 'lesson' | 'quiz' | 'coach' | 'prompt'): void;
  /**
   * True when the player's level has incremented since the last time we saw
   * the state (used to trigger the level-up modal).
   */
  pendingLevelUp: boolean;
  /** New level number when pendingLevelUp is true. */
  newLevel: number;
  /** Call this when the level-up modal has been dismissed. */
  consumePendingLevelUp(): void;
}

const XpStateContext = createContext<XpState | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Delay (ms) after notifyAction before we re-fetch, giving the backend time. */
const NOTIFY_DELAY_MS = 1_200;

export function XpProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingLevelUp, setPendingLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);

  // Track the level from the previous successful fetch. Using a ref avoids
  // triggering the level-up modal on the very first load.
  const prevLevelRef = useRef<number | null>(null);
  const notifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyState = useCallback((next: GameState) => {
    if (!mountedRef.current) return;

    setState((prev) => {
      const prevLevel = prevLevelRef.current;

      // Detect level-up: only fire if we've seen at least one prior snapshot.
      if (prevLevel !== null && next.level > prevLevel) {
        setPendingLevelUp(true);
        setNewLevel(next.level);
      }

      prevLevelRef.current = prev?.level ?? next.level;
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await game.getGameState();
      if (!mountedRef.current) return;
      applyState(next);
    } catch {
      // Tolerate errors — HUD just won't render
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [applyState]);

  // Initial load
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const notifyAction = useCallback(
    (_kind: 'lesson' | 'quiz' | 'coach' | 'prompt') => {
      // Debounce: if a timer is already pending, reset it.
      if (notifyTimerRef.current !== null) {
        clearTimeout(notifyTimerRef.current);
      }
      notifyTimerRef.current = setTimeout(() => {
        notifyTimerRef.current = null;
        void refresh();
      }, NOTIFY_DELAY_MS);
    },
    [refresh],
  );

  // Cleanup pending timers on unmount
  useEffect(() => {
    return () => {
      if (notifyTimerRef.current !== null) {
        clearTimeout(notifyTimerRef.current);
      }
    };
  }, []);

  const consumePendingLevelUp = useCallback(() => {
    setPendingLevelUp(false);
  }, []);

  return (
    <XpStateContext.Provider
      value={{
        state,
        loading,
        refresh,
        notifyAction,
        pendingLevelUp,
        newLevel,
        consumePendingLevelUp,
      }}
    >
      {children}
    </XpStateContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useXpState(): XpState {
  const ctx = useContext(XpStateContext);
  if (!ctx) {
    throw new Error('useXpState() must be used inside <XpProvider>');
  }
  return ctx;
}
