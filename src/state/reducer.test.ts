import { describe, expect, it } from 'vitest';
import { initialState, pushHistory, reducer, todayOf } from './reducer';
import type { Ability, AppState, GameId, GameResult } from './types';
import { ABILITIES } from './types';
import { addDays, buildProfile, errorBand, indexGain, simulateDays, weakestStable } from '../engine';
import { TRAINING_PLAN_GAMES_PER_DAY } from '../config';

const ABILITY = { stroop: 'attention', corsi: 'memory', series: 'logic', gonogo: 'speed', flash41: 'memory' } as const;

function res(gameId: GameId, accuracy: number, extra: Partial<GameResult> = {}, mode: 'assessment' | 'training' = 'assessment'): GameResult {
  const total = 10;
  return {
    gameId,
    ability: ABILITY[gameId],
    rawScore: gameId === 'gonogo' ? 400 : gameId === 'corsi' ? 5 : Math.round(accuracy * total),
    level: gameId === 'flash41' ? 5 : undefined,
    form: 'A',
    playedAt: Date.now(),
    meta: { correct: Math.round(accuracy * total), total, accuracy, meanRtMs: 900, maxLevel: 6, mode },
    ...extra,
  };
}

const quiz = (acc: number) => (['stroop', 'corsi', 'series', 'gonogo'] as GameId[]).map((g) => res(g, acc));

function afterBaseline(): AppState {
  return reducer(initialState('uk'), { type: 'assessmentDone', kind: 'baseline', results: quiz(0.8) });
}

describe('reducer', () => {
  it('baseline sets profile, plan and the first index point', () => {
    const s = afterBaseline();
    expect(s.baseline).toBeDefined();
    expect(s.plan?.items).toHaveLength(3);
    expect(s.indexHistory).toHaveLength(1);
    expect(s.profileFrom).toBe(0);
  });

  it('training raises the index, starts the streak, ticks the plan', () => {
    const s0 = afterBaseline();
    const s1 = reducer(s0, { type: 'trainingDone', result: res('flash41', 0.8, {}, 'training'), durationMs: 120_000 });
    expect(s1.current!.index).toBeGreaterThan(s0.current!.index);
    expect(s1.lastIndexDelta).toBeGreaterThanOrEqual(3);
    expect(s1.streakDays).toBe(1);
    expect(s1.plan!.items.filter((i) => i.done).length).toBe(s0.plan!.items.some((i) => i.gameId === 'flash41') ? 1 : 0);
    // day 1 keeps the baseline point and adds the trained one → the line is not flat
    expect(s1.indexHistory).toHaveLength(2);
  });

  it('a second training on the same day keeps the streak at 1', () => {
    let s = afterBaseline();
    s = reducer(s, { type: 'trainingDone', result: res('flash41', 0.8, {}, 'training'), durationMs: 60_000 });
    s = reducer(s, { type: 'trainingDone', result: res('corsi', 0.8, {}, 'training'), durationMs: 60_000 });
    expect(s.streakDays).toBe(1);
  });

  it('+30 days continues an active streak and resets a stale one', () => {
    let s = afterBaseline();
    s = reducer(s, { type: 'trainingDone', result: res('flash41', 0.8, {}, 'training'), durationMs: 60_000 });
    const active = reducer(s, { type: 'demoAdvance', days: 30 });
    expect(active.streakDays).toBe(31);
    expect(active.demoDayOffset).toBe(30);
    expect(active.plan?.day).toBe(todayOf(active));

    const stale = reducer({ ...s, streakDays: 5, lastActiveDay: addDays(todayOf(s), -10) }, { type: 'demoAdvance', days: 30 });
    expect(stale.streakDays).toBe(30);
  });

  it('re-test compares with baseline and the live profile does not slip back afterwards', () => {
    let s = afterBaseline();
    s = reducer(s, { type: 'demoAdvance', days: 30 });
    s = reducer(s, { type: 'assessmentDone', kind: 'retest', results: quiz(1).map((r) => ({ ...r, form: 'B' as const })) });
    expect(s.retest).toBeDefined();
    expect(s.lastRetestDay).toBe(todayOf(s));
    const attentionAfterRetest = s.current!.scores.attention;
    s = reducer(s, { type: 'trainingDone', result: res('flash41', 0.8, {}, 'training'), durationMs: 60_000 });
    expect(s.current!.scores.attention).toBe(attentionAfterRetest);
  });

  it('re-test keeps exercises already done today', () => {
    let s = afterBaseline();
    const first = s.plan!.items[0].gameId;
    s = reducer(s, { type: 'trainingDone', result: res(first, 0.8, {}, 'training'), durationMs: 60_000 });
    s = reducer(s, { type: 'assessmentDone', kind: 'retest', results: quiz(0.9) });
    const doneIds = s.plan!.items.filter((i) => i.done).map((i) => i.gameId);
    if (s.plan!.items.some((i) => i.gameId === first)) expect(doneIds).toContain(first);
  });

  it('pushHistory keeps the first and the latest point of a day', () => {
    let h = pushHistory([], '2026-01-01', 400);
    h = pushHistory(h, '2026-01-01', 410);
    h = pushHistory(h, '2026-01-01', 420);
    expect(h.map((p) => p.index)).toEqual([400, 420]);
  });

  it('reset clears progress but keeps language and jury mode', () => {
    const s = reducer({ ...afterBaseline(), juryMode: true }, { type: 'reset' });
    expect(s.baseline).toBeUndefined();
    expect(s.lang).toBe('uk');
    expect(s.juryMode).toBe(true);
  });

  it('reset keeps the fast jury mode', () => {
    const s = reducer({ ...afterBaseline(), juryMode: true, fastMode: true }, { type: 'reset' });
    expect(s.fastMode).toBe(true);
  });
});

const formB = (rs: GameResult[]) => rs.map((r) => ({ ...r, form: 'B' as const }));

describe('reducer · honest re-test', () => {
  it('stores the measured re-test scores untouched', () => {
    let s = afterBaseline();
    s = reducer(s, { type: 'demoAdvance', days: 30 });
    const results = formB(quiz(0.6));
    s = reducer(s, { type: 'assessmentDone', kind: 'retest', results });
    expect(s.retest!.scores).toEqual(buildProfile(results).scores);
    expect(s.current!.scores).toEqual(buildProfile(results).scores);
  });

  it('identical skill → the weak zone does not move', () => {
    let s = afterBaseline();
    const weak = s.current!.weakest;
    s = reducer(s, { type: 'demoAdvance', days: 30 });
    s = reducer(s, { type: 'assessmentDone', kind: 'retest', results: formB(quiz(0.8)) });
    expect(s.current!.weakest).toBe(weak);
    expect(s.retest!.weakest).toBe(weak);
  });

  it('a new candidate within the error band keeps the previous weak zone', () => {
    const results = formB(quiz(0.8));
    const next = buildProfile(results);
    // previous weak zone = the ability closest to the new minimum (a gap inside the band)
    const others = ABILITIES.filter((a) => a !== next.weakest);
    const prevWeak = others.reduce((b, a) => (next.scores[a] < next.scores[b] ? a : b));
    const gap = next.scores[prevWeak] - next.scores[next.weakest];
    const band = Math.sqrt(errorBand(prevWeak) ** 2 + errorBand(next.weakest) ** 2) / Math.SQRT2;
    expect(gap).toBeLessThanOrEqual(band); // precondition

    const s0 = afterBaseline();
    const s = reducer({ ...s0, current: { ...s0.current!, weakest: prevWeak } }, { type: 'assessmentDone', kind: 'retest', results });
    expect(s.current!.weakest).toBe(prevWeak);
    // plan follows the (unchanged) weak zone
    expect(s.plan!.items).toHaveLength(3);
  });

  it('a clearly weaker ability (outside the band) becomes the new weak zone and the plan follows', () => {
    // logic collapses, everything else strong
    const results = formB((['stroop', 'corsi', 'series', 'gonogo'] as GameId[]).map((g) => res(g, g === 'series' ? 0 : 1)));
    const next = buildProfile(results);
    expect(next.weakest).toBe('logic');
    const prevWeak: Ability = 'attention';
    expect(next.scores.attention - next.scores.logic).toBeGreaterThan(errorBand('logic')); // precondition
    const s0 = afterBaseline();
    const prev = { ...s0.current!, weakest: prevWeak };
    const s = reducer({ ...s0, current: prev }, { type: 'assessmentDone', kind: 'retest', results });
    expect(s.current!.weakest).toBe(weakestStable(prev, next));
    expect(s.current!.weakest).toBe('logic');
    expect(s.plan!.items.some((i) => i.gameId === 'series')).toBe(true);
  });

  it('training afterwards does not flip the weak zone on noise', () => {
    const s0 = afterBaseline();
    const training = res('flash41', 0.8, {}, 'training');
    const live = buildProfile([...s0.results, training].slice(s0.profileFrom ?? 0));
    const others = ABILITIES.filter((a) => a !== live.weakest);
    const prevWeak = others.reduce((b, a) => (live.scores[a] < live.scores[b] ? a : b));
    const band = Math.sqrt(errorBand(prevWeak) ** 2 + errorBand(live.weakest) ** 2) / Math.SQRT2;
    expect(live.scores[prevWeak] - live.scores[live.weakest]).toBeLessThanOrEqual(band); // precondition
    const s = reducer({ ...s0, current: { ...s0.current!, weakest: prevWeak } }, { type: 'trainingDone', result: training, durationMs: 45_000 });
    expect(s.current!.weakest).toBe(prevWeak);
  });
});

describe('reducer · index pace', () => {
  it('simulated gain follows the iteration-2 formula', () => {
    // integer gains, rounded up: ceil((2 + 10·s/100) · clamp((1000 − prev)/600, 0.05, 1))
    expect(indexGain(400, 50)).toBe(7); // room clamped to 1
    expect(indexGain(540, 50)).toBe(Math.ceil(7 * (460 / 600)));
    expect(indexGain(999, 50)).toBe(1);
    const day = simulateDays(540, 1)[0] - 540;
    expect(day).toBeGreaterThanOrEqual(10);
    expect(day).toBeLessThanOrEqual(18);
  });

  it('"+30 days" drifts the index at a realistic, slowing pace (< 1000)', () => {
    const s0 = afterBaseline();
    const start = s0.current!.index;
    const s = reducer(s0, { type: 'demoAdvance', days: 30 });
    const expected = Math.round(simulateDays(start, 30)[29]);
    expect(s.current!.index).toBe(expected);
    expect(s.current!.index).toBeLessThan(1000);
    const pts = s.indexHistory.map((p) => p.index);
    const steps = pts.slice(1).map((v, i) => v - pts[i]);
    expect(steps.every((d) => d >= 0)).toBe(true);
    // slows down: last day's gain ≤ first simulated day's gain
    expect(steps[steps.length - 1]).toBeLessThanOrEqual(steps[1]);
    // abilities are not touched by the simulation
    expect(s.current!.scores).toEqual(s0.current!.scores);
  });

  it(`only the first ${TRAINING_PLAN_GAMES_PER_DAY} games of a day move the index`, () => {
    let s = afterBaseline();
    for (let i = 0; i < TRAINING_PLAN_GAMES_PER_DAY; i++) {
      s = reducer(s, { type: 'trainingDone', result: res('flash41', 0.8, {}, 'training'), durationMs: 45_000 });
      expect(s.lastIndexDelta).toBeGreaterThan(0);
    }
    const before = s.current!.index;
    s = reducer(s, { type: 'trainingDone', result: res('flash41', 0.8, {}, 'training'), durationMs: 45_000 });
    expect(s.lastIndexDelta).toBe(0);
    expect(s.current!.index).toBe(before);
    expect(s.indexGamesByDay?.[todayOf(s)]).toBe(TRAINING_PLAN_GAMES_PER_DAY + 1);
  });
});
