import { useCallback, useEffect, useMemo, useRef, type PointerEvent, type MouseEvent } from 'react';
import type { GameResult } from '../../state/types';

/**
 * One-shot finisher. `end(result)` calls `onDone` at most once per mounted game, even under
 * StrictMode double effects or racing timers/taps. Never call it inside a setState updater.
 */
export function useEnd(onDone: (r: GameResult) => void) {
  const endedRef = useRef(false);
  const cb = useRef(onDone);
  useEffect(() => {
    cb.current = onDone;
  });
  const end = useCallback((r: GameResult) => {
    if (endedRef.current) return;
    endedRef.current = true;
    cb.current(r);
  }, []);
  return { end, endedRef };
}

/**
 * Session clock: fires `onTimeUp` once `durationMs` has elapsed since mount (StrictMode-safe:
 * the timer is cleared and re-armed on the simulated remount). Returns the start timestamp ref.
 */
export function useSessionClock(durationMs: number | undefined, onTimeUp: () => void) {
  const startRef = useRef(typeof performance !== 'undefined' ? performance.now() : 0);
  const cb = useRef(onTimeUp);
  useEffect(() => {
    cb.current = onTimeUp;
  });
  useEffect(() => {
    startRef.current = performance.now();
    if (!durationMs || durationMs <= 0) return;
    const id = window.setTimeout(() => cb.current(), durationMs);
    return () => window.clearTimeout(id);
  }, [durationMs]);
  return startRef;
}

/** setTimeout registry cleared on unmount. */
export function useTimeouts() {
  const ids = useRef(new Set<number>());
  useEffect(() => {
    const set = ids.current;
    return () => {
      set.forEach((id) => window.clearTimeout(id));
      set.clear();
    };
  }, []);
  return useMemo(
    () => ({
      set(fn: () => void, ms: number) {
        const id = window.setTimeout(() => {
          ids.current.delete(id);
          fn();
        }, ms);
        ids.current.add(id);
        return id;
      },
      clearAll() {
        ids.current.forEach((id) => window.clearTimeout(id));
        ids.current.clear();
      },
    }),
    [],
  );
}

/**
 * Fast touch handler: fires on pointerdown (no 300 ms click delay), and on keyboard-generated
 * clicks (detail === 0) so the game stays operable without a pointer.
 */
export function press(handler: () => void) {
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      handler();
    },
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (e.detail === 0) handler();
    },
  };
}

export function clampInt(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.max(lo, Math.min(hi, n));
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
