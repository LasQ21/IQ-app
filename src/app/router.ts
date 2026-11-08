import { useSyncExternalStore } from 'react';

/** Hash router: `#/path?x=1`. Works on static hosting and offline. */
export interface Route {
  path: string; // e.g. '/play/flash41'
  segments: string[]; // ['play', 'flash41']
  query: URLSearchParams;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  const clean = path.startsWith('/') ? path : '/' + path;
  return { path: clean, segments: clean.split('/').filter(Boolean), query: new URLSearchParams(qs) };
}

let current = typeof window === 'undefined' ? ({ path: '/', segments: [], query: new URLSearchParams() } as Route) : parse();
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    current = parse();
    listeners.forEach((l) => l());
    window.scrollTo(0, 0);
  });
}

export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  const hash = '#' + (to.startsWith('/') ? to : '/' + to);
  if (opts.replace) {
    const url = window.location.pathname + window.location.search + hash;
    window.history.replaceState(null, '', url);
    current = parse();
    listeners.forEach((l) => l());
    window.scrollTo(0, 0);
  } else {
    window.location.hash = hash;
  }
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

/** Route paths used across the app (single source of truth). */
export const PATHS = {
  landing: '/',
  quiz: '/quiz',
  teaser: '/teaser',
  paywall: '/paywall',
  onboarding: '/onboarding',
  today: '/today',
  play: (gameId: string, from?: string) => `/play/${gameId}${from ? `?from=${from}` : ''}`,
  index: '/index',
  line: '/line',
  retest: '/retest',
  report: '/report',
  profile: '/profile',
  economics: '/economics',
} as const;
