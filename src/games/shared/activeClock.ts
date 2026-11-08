import { useEffect, useState } from 'react';

/**
 * "Active" clock for games: like performance.now(), but it stands still while the page is hidden
 * (tab in the background, phone locked, app switcher). Game timers measure remaining time on this
 * clock, so a task never runs out while the person is away.
 */
let hiddenTotal = 0;
let hiddenSince: number | null = null;
const listeners = new Set<(hidden: boolean) => void>();

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function isPageHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

if (typeof document !== 'undefined') {
  if (isPageHidden()) hiddenSince = now();
  document.addEventListener('visibilitychange', () => {
    const t = now();
    const hidden = isPageHidden();
    if (hidden) {
      if (hiddenSince === null) hiddenSince = t;
    } else if (hiddenSince !== null) {
      hiddenTotal += t - hiddenSince;
      hiddenSince = null;
    }
    listeners.forEach((l) => l(hidden));
  });
}

/** performance.now() minus all the time the page has spent hidden. */
export function activeNow(): number {
  const t = now();
  return t - hiddenTotal - (hiddenSince !== null ? t - hiddenSince : 0);
}

/** Subscribe to page visibility changes; returns the unsubscribe function. */
export function onPageVisibility(fn: (hidden: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** React state mirror of `document.hidden`. */
export function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(isPageHidden);
  useEffect(() => {
    setHidden(isPageHidden());
    return onPageVisibility(setHidden);
  }, []);
  return hidden;
}
