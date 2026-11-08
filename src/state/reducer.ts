import { TRAINING_PLAN_GAMES_PER_DAY } from '../config';
import {
  buildProfile,
  updateIndex,
  planItemsForToday,
  trainingSeedDayOf,
  simulateDays,
  dayKey,
  demoNow,
  addDays,
  weakestStable,
} from '../engine';
import type { Action, AppState, Lang, PlanItem, Profile } from './types';

export function initialState(lang: Lang = 'ja'): AppState {
  return {
    lang,
    stage: 'landing',
    results: [],
    profileFrom: 0,
    streakDays: 0,
    demoDayOffset: 0,
    juryMode: false,
    indexHistory: [],
    minutesByDay: {},
    fastMode: false,
    trainingSeedDay: 0,
  };
}

export function todayOf(state: Pick<AppState, 'demoDayOffset'>, now = Date.now()): string {
  return dayKey(demoNow(state.demoDayOffset, now));
}

const sameCard = (a: PlanItem, b: PlanItem) => a.gameId === b.gameId && (a.variant ?? '') === (b.variant ?? '');

/** Today's plan from the live profile; varies by day (rotation). Cards already done today stay ticked. */
function freshItems(state: AppState, keepDone: PlanItem[] = []): PlanItem[] {
  if (!state.current) return [];
  const done = keepDone.filter((it) => it.done);
  return planItemsForToday(state.current, trainingSeedDayOf(todayOf(state))).map((it) => {
    const i = done.findIndex((d) => sameCard(d, it));
    if (i >= 0) done.splice(i, 1);
    return { ...it, done: i >= 0 };
  });
}

/** Ensure `plan` belongs to today; regenerate from the live profile otherwise. */
export function withFreshPlan(state: AppState, now = Date.now()): AppState {
  const today = todayOf(state, now);
  if (!state.current || state.plan?.day === today) return state;
  return { ...state, plan: { day: today, items: freshItems(state) } };
}

/**
 * Index history keeps the first point of each day (e.g. the baseline) and the latest one,
 * so day 1 already shows a rising line after the first training.
 */
export function pushHistory(history: AppState['indexHistory'], day: string, index: number): AppState['indexHistory'] {
  const sameDay = history.filter((p) => p.day === day);
  const others = history.filter((p) => p.day !== day);
  const kept = sameDay.length ? [sameDay[0], { day, index }] : [{ day, index }];
  return [...others, ...kept].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0)); // stable within a day
}

/**
 * Live profile = results since the latest assessment (baseline or re-test), so older tests don't drag it back.
 * The weak zone is sticky: it only moves when the new evidence is outside the error band (`weakestStable`).
 */
function liveProfile(results: AppState['results'], from: number, prev?: Profile, fast = false): Profile {
  const p = buildProfile(results.slice(from));
  return prev ? { ...p, weakest: weakestStable(prev, p, fast) } : p;
}


export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setLang':
      return { ...state, lang: action.lang };
    case 'setStage':
      return { ...state, stage: action.stage };
    case 'toggleJury':
      return { ...state, juryMode: action.on ?? !state.juryMode };
    case 'setFast':
      return { ...state, fastMode: action.on };

    case 'assessmentDone': {
      const from = state.results.length;
      const results = [...state.results, ...action.results];
      const profile = buildProfile(action.results);
      const today = todayOf(state);
      if (action.kind === 'baseline') {
        const next: AppState = {
          ...state,
          results,
          profileFrom: from,
          baseline: profile,
          current: profile,
          retest: undefined,
          lastRetestDay: undefined,
          plan: undefined,
          indexGamesByDay: {},
          indexHistory: pushHistory([], today, profile.index),
        };
        return withFreshPlan(next);
      }
      // Re-test: abilities come from the new form-B assessment (never adjusted); the index keeps its trained value.
      // The weak zone moves only when the new candidate is weaker by more than the error band.
      const prev = state.current ?? state.retest ?? state.baseline;
      const weakest = prev ? weakestStable(prev, profile, state.fastMode) : profile.weakest;
      const retest: Profile = { ...profile, weakest };
      const current: Profile = { ...retest, index: Math.max(state.current?.index ?? 0, profile.index) };
      const next: AppState = { ...state, results, profileFrom: from, retest, lastRetestDay: today, current };
      // Weak zone (possibly) changed → new plan for today, but exercises already done today stay ticked.
      const keep = state.plan?.day === today ? state.plan.items : [];
      return { ...next, plan: { day: today, items: freshItems(next, keep) } };
    }

    case 'trainingDone': {
      const s = withFreshPlan(state);
      const today = todayOf(s);
      const prevIndex = s.current?.index ?? 0;
      // Only the first TRAINING_PLAN_GAMES_PER_DAY games of a day move the index (no farming).
      const counted = s.indexGamesByDay?.[today] ?? 0;
      const index = counted < TRAINING_PLAN_GAMES_PER_DAY ? updateIndex(prevIndex, action.result) : prevIndex;
      const results = [...s.results, action.result];
      const current = { ...liveProfile(results, s.profileFrom ?? 0, s.current, s.fastMode), index };

      let streakDays = s.streakDays;
      if (s.lastActiveDay !== today) {
        streakDays = s.lastActiveDay && addDays(s.lastActiveDay, 1) === today ? s.streakDays + 1 : 1;
      }

      let marked = false;
      // Mark the exact card played (gameId + variant); fall back to any open card of the same game.
      const gameId = action.result.gameId;
      let variant = action.variant;
      if (s.plan && !s.plan.items.some((it) => !it.done && sameCard(it, { gameId, done: false, variant }))) {
        variant = s.plan.items.find((it) => !it.done && it.gameId === gameId)?.variant;
      }
      const plan = s.plan && {
        ...s.plan,
        items: s.plan.items.map((it) => {
          if (!marked && !it.done && sameCard(it, { gameId, done: false, variant })) {
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
        indexGamesByDay: { ...s.indexGamesByDay, [today]: counted + 1 },
        indexHistory: pushHistory(s.indexHistory, today, index),
        minutesByDay: { ...s.minutesByDay, [today]: (s.minutesByDay[today] ?? 0) + minutes },
      };
    }

    case 'demoAdvance': {
      // Simulated adherence: the user trained every day of the jump (3 average plan games, ~3 min/day).
      // Only the index is simulated (real Index-formula pace); abilities do NOT change here —
      // the re-test measures them for real on a new form.
      const startDay = todayOf(state);
      const active = state.lastActiveDay === startDay || (state.lastActiveDay && addDays(state.lastActiveDay, 1) === startDay);
      let index = state.current?.index ?? 0;
      let history = state.indexHistory;
      const minutesByDay = { ...state.minutesByDay };
      const simulated = simulateDays(index, action.days);
      for (let i = 1; i <= action.days; i++) {
        const day = addDays(startDay, i);
        index = Math.round(simulated[i - 1] ?? index);
        history = pushHistory(history.filter((p) => p.day !== day), day, index);
        minutesByDay[day] = 3;
      }
      const next: AppState = {
        ...state,
        demoDayOffset: state.demoDayOffset + action.days,
        current: state.current && { ...state.current, index },
        indexHistory: history,
        minutesByDay,
        streakDays: (active ? state.streakDays : 0) + action.days,
        lastActiveDay: addDays(startDay, action.days),
        plan: undefined,
      };
      return withFreshPlan(next);
    }

    case 'reset':
      return { ...initialState(state.lang), juryMode: state.juryMode, fastMode: state.fastMode };
    case 'hydrate': // another tab saved a newer state (store.tsx `storage` listener)
      return action.state;
  }
}
