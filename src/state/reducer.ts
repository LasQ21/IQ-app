import { TRAINING_PLAN_GAMES_PER_DAY } from '../config';
import { buildProfile, updateIndex, planForToday, dayKey, demoNow, addDays, weakestStable } from '../engine';
import type { Action, AppState, GameId, Lang, PlanItem, Profile } from './types';

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

function freshItems(state: AppState, keepDone: PlanItem[] = []): PlanItem[] {
  if (!state.current) return [];
  const done = keepDone.filter((it) => it.done).map((it) => it.gameId);
  return planForToday(state.current).map((gameId: GameId) => {
    const i = done.indexOf(gameId);
    if (i >= 0) done.splice(i, 1);
    return { gameId, done: i >= 0 };
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
function liveProfile(results: AppState['results'], from: number, prev?: Profile): Profile {
  const p = buildProfile(results.slice(from));
  return prev ? { ...p, weakest: weakestStable(prev, p) } : p;
}

/** Average plan game in the "+N days" demo jump (normalized score ≈ 50, 3 games/day). */
export const SIM_SCORE = 50;

/**
 * Index gain of one simulated plan game — the iteration-2 Index formula:
 * gain = (2 + 10·s/100) · clamp((1000 − prev)/600, 0.05, 1). ≈ +16/day near 540, slowing toward 1000.
 * Kept in one place so it can be swapped for an engine helper.
 */
export function simulatedIndexGain(prev: number, score = SIM_SCORE): number {
  const room = Math.max(0.05, Math.min(1, (1000 - prev) / 600));
  return (2 + (10 * score) / 100) * room;
}

/** Index after one simulated demo day of TRAINING_PLAN_GAMES_PER_DAY average plan games. */
export function simulateIndexDay(prev: number, score = SIM_SCORE): number {
  let index = prev;
  for (let g = 0; g < TRAINING_PLAN_GAMES_PER_DAY; g++) index = Math.min(1000, Math.round(index + simulatedIndexGain(index, score)));
  return index;
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
      const weakest = prev ? weakestStable(prev, profile) : profile.weakest;
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
      const current = { ...liveProfile(results, s.profileFrom ?? 0, s.current), index };

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
        indexGamesByDay: { ...s.indexGamesByDay, [today]: counted + 1 },
        indexHistory: pushHistory(s.indexHistory, today, index),
        minutesByDay: { ...s.minutesByDay, [today]: (s.minutesByDay[today] ?? 0) + minutes },
      };
    }

    case 'demoAdvance': {
      // Simulated adherence: the user trained every day of the jump (~10 min/day, 3 average plan games).
      // Only the index is simulated (real Index-formula pace); abilities do NOT change here —
      // the re-test measures them for real on a new form.
      const startDay = todayOf(state);
      const active = state.lastActiveDay === startDay || (state.lastActiveDay && addDays(state.lastActiveDay, 1) === startDay);
      let index = state.current?.index ?? 0;
      let history = state.indexHistory;
      const minutesByDay = { ...state.minutesByDay };
      for (let i = 1; i <= action.days; i++) {
        const day = addDays(startDay, i);
        index = simulateIndexDay(index);
        history = pushHistory(history.filter((p) => p.day !== day), day, index);
        minutesByDay[day] = 10;
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
  }
}
