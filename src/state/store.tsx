import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { STORAGE_KEY } from '../config';
import { liveNewRun } from '../live/client';
import { clearState, loadState, parseState, saveState } from './persist';
import { initialState, reducer } from './reducer';
import type { Action, AppState, Lang } from './types';
import { LANGS } from './types';

interface Store {
  state: AppState;
  dispatch: (a: Action) => void;
}

const StoreContext = createContext<Store | null>(null);

function readUrlFlags(): { lang?: Lang; jury?: boolean; fast?: boolean } {
  try {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get('lang') as Lang | null;
    const jury = params.get('jury');
    const fast = params.get('fast');
    const juryOn = jury === null ? undefined : jury === '1' || jury === 'true';
    return {
      lang: lang && LANGS.includes(lang) ? lang : undefined,
      jury: juryOn,
      // ?jury=1 implies the fast demo mode; ?fast=1 turns it on alone.
      fast: fast !== null ? fast === '1' || fast === 'true' : juryOn,
    };
  } catch {
    return {};
  }
}

// Read once at startup (StrictMode calls reducer initializers twice; the URL is cleaned on the first call).
const URL_FLAGS = typeof window === 'undefined' ? {} : readUrlFlags();

/** Saved state on top of the defaults, so keys added in a newer build get their initial values. */
function withDefaults(saved: Partial<AppState> | undefined): AppState {
  return { ...initialState(), ...(saved ?? {}) } as AppState;
}

function init(): AppState {
  const saved = loadState();
  const flags = URL_FLAGS;
  const base = withDefaults(saved);
  if (flags.lang) base.lang = flags.lang;
  if (flags.jury !== undefined) base.juryMode = flags.jury;
  if (flags.fast !== undefined) base.fastMode = flags.fast;
  // The QR deep link sets the language once; drop the flags so a later manual switch survives reloads.
  if (flags.lang || flags.jury !== undefined || flags.fast !== undefined) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('lang');
      url.searchParams.delete('jury');
      url.searchParams.delete('fast');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch {
      /* ignore */
    }
  }
  return base;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Tab sync: another tab of the demo saved its state → adopt it, so the next save here doesn't overwrite it.
  // (Its removeItem on "Reset demo" is followed by a write of the fresh state, so a removal alone is ignored.)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      try {
        if (e.storageArea !== window.localStorage) return;
      } catch {
        return;
      }
      const saved = parseState(e.newValue);
      if (saved) dispatch({ type: 'hydrate', state: withDefaults(saved) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = state.lang;
  }, [state.lang]);

  const value = useMemo(
    () => ({
      state,
      dispatch: (a: Action) => {
        if (a.type === 'reset') {
          clearState();
          liveNewRun(state);
        }
        dispatch(a);
      },
    }),
    [state],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}
