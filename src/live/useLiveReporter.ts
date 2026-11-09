import { useEffect, useSyncExternalStore } from 'react';
import type { Route } from '../app/router';
import type { AppState } from '../state/types';
import { liveFlush, liveReach, liveRecord, liveSyncState, subscribeLive } from './client';
import type { LiveRecord, Step } from './schema';

const ROUTE_STEP: Record<string, Step> = {
  '': 'landing',
  quiz: 'quiz',
  teaser: 'teaser',
  paywall: 'paywall',
  onboarding: 'start',
  today: 'today',
  economics: 'econ',
};

/** Feeds the anonymous live record from the route and the app state (mounted once, in App). */
export function useLiveReporter(route: Route, state: AppState): void {
  const step = ROUTE_STEP[route.segments[0] ?? ''];
  useEffect(() => {
    if (step) liveReach(step);
  }, [step]);

  useEffect(() => {
    liveSyncState(state);
    if (state.results.some((r) => r.form === 'T' || r.meta?.mode === 'training')) liveReach('trained');
    if (state.retest) liveReach('retest');
  }, [state]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') liveFlush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', liveFlush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', liveFlush);
    };
  }, []);
}

/** The live record as React state (e.g. to show the vote card's answer). */
export function useLiveRecord(): LiveRecord {
  return useSyncExternalStore(subscribeLive, liveRecord);
}
