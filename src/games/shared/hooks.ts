import { useCallback, useEffect, useMemo, useRef, type PointerEvent, type MouseEvent } from 'react';
import type { GameResult } from '../../state/types';
import { activeNow, isPageHidden, onPageVisibility } from './activeClock';

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
 * Session clock: fires `onTimeUp` once `durationMs` of *active* time has elapsed since mount
 * (StrictMode-safe: the timer is cleared and re-armed on the simulated remount). While the page is
 * hidden the timer is paused, so the remaining time does not run out in the background.
 * Returns the start timestamp ref (performance.now()).
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
    const startActive = activeNow();
    let id = 0;
    const arm = () => {
      window.clearTimeout(id);
      const left = durationMs - (activeNow() - startActive);
      id = window.setTimeout(() => cb.current(), Math.max(0, left));
    };
    if (!isPageHidden()) arm();
    const off = onPageVisibility((hidden) => (hidden ? window.clearTimeout(id) : arm()));
    return () => {
      window.clearTimeout(id);
      off();
    };
  }, [durationMs]);
  return startRef;
}

/**
 * setTimeout registry cleared on unmount. Pending timeouts are paused while the page is hidden and
 * re-armed with their remaining (active) time when it becomes visible again.
 */
export function useTimeouts() {
  const pending = useRef(new Map<number, { fn: () => void; due: number; tid: number }>());
  const seq = useRef(0);
  useEffect(() => {
    const map = pending.current;
    const fire = (key: number) => {
      const e = map.get(key);
      if (!e) return;
      map.delete(key);
      e.fn();
    };
    const off = onPageVisibility((hidden) => {
      map.forEach((e, key) => {
        window.clearTimeout(e.tid);
        if (!hidden) e.tid = window.setTimeout(() => fire(key), Math.max(0, e.due - activeNow()));
      });
    });
    return () => {
      off();
      map.forEach((e) => window.clearTimeout(e.tid));
      map.clear();
    };
  }, []);
  return useMemo(
    () => ({
      set(fn: () => void, ms: number) {
        const key = ++seq.current;
        const map = pending.current;
        const entry = { fn, due: activeNow() + ms, tid: 0 };
        map.set(key, entry);
        if (!isPageHidden()) {
          entry.tid = window.setTimeout(() => {
            const e = map.get(key);
            if (!e) return;
            map.delete(key);
            e.fn();
          }, ms);
        }
        return key;
      },
      clearAll() {
        pending.current.forEach((e) => window.clearTimeout(e.tid));
        pending.current.clear();
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
