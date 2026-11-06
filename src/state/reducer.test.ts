import { describe, expect, it } from 'vitest';
import { initialState, pushHistory, reducer, todayOf } from './reducer';
import type { AppState, GameId, GameResult } from './types';
import { addDays } from '../engine';

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
});
