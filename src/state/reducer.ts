import { buildProfile, updateIndex, planForToday, dayKey, demoNow, addDays } from '../engine';
import type { Action, AppState, Lang } from './types';

export function initialState(lang: Lang = 'ja'): AppState {
  return {
    lang,
    stage: 'landing',
    results: [],
    streakDays: 0,
    demoDayOffset: 0,
    juryMode: false,
    indexHistory: [],
    minutesByDay: {},
  };
}

export function todayOf(state: Pick<AppState, 'demoDayOffset'>, now = Date.now()): string {
  return dayKey(demoNow(state.demoDayOffset, now));
}

/** Ensure `plan` belongs to today; regenerate from the live profile otherwise. */
export function withFreshPlan(state: AppState, now = Date.now()): AppState {
  const today = todayOf(state, now);
  if (!state.current || state.plan?.day === today) return state;
  return {
    ...state,
    plan: { day: today, items: planForToday(state.current).map((gameId) => ({ gameId, done: false })) },
  };
}

function pushHistory(state: AppState, day: string, index: number): AppState['indexHistory'] {
  const rest = state.indexHistory.filter((p) => p.day !== day);
  return [...rest, { day, index }].sort((a, b) => (a.day < b.day ? -1 : 1));
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setLang':
      return { ...state, lang: action.lang };
    case 'setStage':
      return { ...state, stage: action.stage };
    case 'toggleJury':
      return { ...state, juryMode: action.on ?? !state.juryMode };

    case 'assessmentDone': {
      const results = [...state.results, ...action.results];
      const profile = buildProfile(action.results);
      const today = todayOf(state);
      if (action.kind === 'baseline') {
        const next: AppState = {
          ...state,
          results,
          baseline: profile,
          current: profile,
          retest: undefined,
          lastRetestDay: undefined,
          plan: undefined,
          indexHistory: pushHistory(state, today, profile.index),
        };
        return withFreshPlan(next);
      }
      // retest: abilities come from the new form-B assessment; index keeps its trained value
      const current = { ...profile, index: Math.max(state.current?.index ?? 0, profile.index) };
      return withFreshPlan({ ...state, results, retest: profile, lastRetestDay: today, current, plan: undefined });
    }

    case 'trainingDone': {
      const s = withFreshPlan(state);
      const today = todayOf(s);
      const prevIndex = s.current?.index ?? 0;
      const index = updateIndex(prevIndex, action.result);
      const results = [...s.results, action.result];
      const live = buildProfile(results);
      const current = { ...live, index };

      let streakDays = s.streakDays;
      if (s.lastActiveDay !== today) {
        streakDays = s.lastActiveDay && addDays(s.lastActiveDay, 1) === today ? s.streakDays + 1 : 1;
      }

      let marked = false;
      const plan = s.plan && {
        ...s.plan,
        items: s.plan.items.map((it) => {
          if (!marked && !it.done && it.gameId === action.result.gameId) {
            marked = true;
            return { ...it, done: true };
          }
          return it;
        }),
      };

      const minutes = Math.max(1, Math.round(action.durationMs / 60_000));
      return {
        ...s,
        results,
        current,
        plan,
        streakDays,
        lastActiveDay: today,
        lastIndexDelta: index - prevIndex,
        indexHistory: pushHistory(s, today, index),
        minutesByDay: { ...s.minutesByDay, [today]: (s.minutesByDay[today] ?? 0) + minutes },
      };
    }

    case 'demoAdvance': {
      // Simulated adherence: the user trained every day of the jump (~10 min/day).
      // Index gets a gentle simulated drift so the progress line has a shape; abilities do NOT change
      // here — the retest measures them for real on form B.
      const startDay = todayOf(state);
      let index = state.current?.index ?? 0;
      let history = state.indexHistory;
      const minutesByDay = { ...state.minutesByDay };
      for (let i = 1; i <= action.days; i++) {
        const day = addDays(startDay, i);
        index = Math.min(1000, index + 2 + (i % 3));
        history = [...history.filter((p) => p.day !== day), { day, index }];
        minutesByDay[day] = 10;
      }
      const next: AppState = {
        ...state,
        demoDayOffset: state.demoDayOffset + action.days,
        current: state.current && { ...state.current, index },
        indexHistory: history,
        minutesByDay,
        streakDays: state.streakDays + action.days,
        lastActiveDay: addDays(startDay, action.days),
        plan: undefined,
      };
      return withFreshPlan(next);
    }

    case 'reset':
      return { ...initialState(state.lang), juryMode: state.juryMode };
  }
}
