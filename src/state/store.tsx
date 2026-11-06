import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { clearState, loadState, saveState } from './persist';
import { initialState, reducer } from './reducer';
import type { Action, AppState, Lang } from './types';
import { LANGS } from './types';

interface Store {
  state: AppState;
  dispatch: (a: Action) => void;
}

const StoreContext = createContext<Store | null>(null);

function readUrlFlags(): { lang?: Lang; jury?: boolean } {
  try {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get('lang') as Lang | null;
    const jury = params.get('jury');
    return {
      lang: lang && LANGS.includes(lang) ? lang : undefined,
      jury: jury === null ? undefined : jury === '1' || jury === 'true',
    };
  } catch {
    return {};
  }
}

// Read once at startup (StrictMode calls reducer initializers twice; the URL is cleaned on the first call).
const URL_FLAGS = typeof window === 'undefined' ? {} : readUrlFlags();

function init(): AppState {
  const saved = loadState();
  const flags = URL_FLAGS;
  const base = { ...initialState(), ...(saved ?? {}) } as AppState;
  if (flags.lang) base.lang = flags.lang;
  if (flags.jury !== undefined) base.juryMode = flags.jury;
  // The QR deep link sets the language once; drop the flags so a later manual switch survives reloads.
  if (flags.lang || flags.jury !== undefined) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('lang');
      url.searchParams.delete('jury');
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

  useEffect(() => {
    document.documentElement.lang = state.lang;
  }, [state.lang]);

  const value = useMemo(
    () => ({
      state,
      dispatch: (a: Action) => {
        if (a.type === 'reset') clearState();
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
