import { describe, expect, it } from 'vitest';
import { GAME_FOR, pickForm, planForToday } from './forms';
import { ABILITIES, type Ability, type GameId, type GameResult, type Profile } from '../state/types';

const ABILITY_OF: Record<GameId, Ability> = {
  stroop: 'attention',
  corsi: 'memory',
  series: 'logic',
  gonogo: 'speed',
  flash41: 'memory',
};

const r = (gameId: GameId, form: 'A' | 'B'): GameResult => ({
  gameId,
  ability: ABILITY_OF[gameId],
  rawScore: 1,
  form,
  playedAt: 0,
  meta: { total: 1, accuracy: 1 },
});

describe('pickForm', () => {
  it('starts with A', () => {
    expect(pickForm([], 'memory')).toBe('A');
  });

  it('alternates A → B → A per ability', () => {
    const results: GameResult[] = [];
    const seq: string[] = [];
    for (let i = 0; i < 5; i++) {
      const f = pickForm(results, 'attention');
      seq.push(f);
      results.push(r('stroop', f));
    }
    expect(seq).toEqual(['A', 'B', 'A', 'B', 'A']);
  });

  it('is independent per ability', () => {
    const results = [r('stroop', 'A'), r('corsi', 'A'), r('flash41', 'B')];
    expect(pickForm(results, 'attention')).toBe('B');
    expect(pickForm(results, 'memory')).toBe('A'); // last memory result was B
    expect(pickForm(results, 'logic')).toBe('A');
  });

  it('follows the baseline (A) → retest (B) assessment pattern', () => {
    const baseline = (['stroop', 'corsi', 'series', 'gonogo'] as GameId[]).map((g) => r(g, 'A'));
    for (const a of ABILITIES) expect(pickForm(baseline, a)).toBe('B');
  });
});

describe('planForToday', () => {
  const profile = (weakest: Ability, scores: Partial<Record<Ability, number>> = {}): Profile => ({
    scores: { memory: 60, attention: 60, logic: 60, speed: 60, ...scores, [weakest]: 30 },
    weakest,
    index: 500,
  });

  for (const a of ABILITIES) {
    it(`gives 3 exercises with ≥ 2 on the weakest ability (${a})`, () => {
      const plan = planForToday(profile(a));
      expect(plan).toHaveLength(3);
      expect(plan.filter((g) => ABILITY_OF[g] === a).length).toBeGreaterThanOrEqual(2);
    });
  }

  it('memory → flash41 and corsi + the next-weakest ability', () => {
    const plan = planForToday(profile('memory', { logic: 40 }));
    expect(plan.slice(0, 2)).toEqual(['flash41', 'corsi']);
    expect(plan[2]).toBe('series');
  });

  it('other abilities → weakest game twice (rounds 1, 2) + flash41', () => {
    expect(planForToday(profile('speed'))).toEqual(['gonogo', 'gonogo', 'flash41']);
    expect(planForToday(profile('attention'))).toEqual(['stroop', 'stroop', 'flash41']);
    expect(planForToday(profile('logic'))).toEqual([GAME_FOR.logic, GAME_FOR.logic, 'flash41']);
  });
});
