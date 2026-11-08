/**
 * "A game or assessment task is running right now" — read by the service-worker updater (src/pwa.ts),
 * which never reloads the page while this is on. Games/runners set it for the duration of play:
 *
 *   useEffect(() => { setPlaying(phase === 'play'); return () => setPlaying(false); }, [phase]);
 *
 * Mirrored on `window.__ccPlaying` so tests (and anything outside the bundle) can read it.
 */
declare global {
  interface Window {
    __ccPlaying?: boolean;
  }
}

const listeners = new Set<(on: boolean) => void>();

export function setPlaying(on: boolean): void {
  if (typeof window === 'undefined') return;
  const was = Boolean(window.__ccPlaying);
  window.__ccPlaying = on;
  if (was !== on) listeners.forEach((l) => l(on));
}

export function isPlaying(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__ccPlaying);
}

/** Subscribe to play on/off changes; returns the unsubscribe function. */
export function onPlayingChange(l: (on: boolean) => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/**
 * May the service-worker updater reload the page now? Only on the landing screen or on Today (stage 'home'),
 * and never while something is being played. `hash` is `location.hash`, `stage` the persisted stage.
 */
export function isSafeToReload(hash: string, stage: string | undefined, playing: boolean): boolean {
  if (playing) return false;
  const first = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  if (first === '') return true; // landing screen
  return first === 'today' && stage === 'home';
}
