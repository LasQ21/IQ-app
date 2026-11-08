import { describe, expect, it } from 'vitest';
import {
  GAME_FOR,
  assessmentForm,
  assessmentsTaken,
  nextAssessmentForm,
  planForToday,
  planItemsForToday,
  trainingSlot,
} from './forms';
import { dayKey } from './days';
import { ABILITIES, type Ability, type GameId, type GameResult, type Profile } from '../state/types';

const ABILITY_OF: Record<GameId, Ability> = {
  stroop: 'attention',
  corsi: 'memory',
  series: 'logic',
  gonogo: 'speed',
  flash41: 'memory',
};

const r = (gameId: GameId, mode: 'assessment' | 'training', playedAt = 0): GameResult => ({
  gameId,
  ability: ABILITY_OF[gameId],
  rawScore: 1,
  form: mode === 'training' ? 'T' : 'A',
  playedAt,
  meta: { total: 1, accuracy: 1, mode },
});

const quiz = () => (['stroop', 'corsi', 'series', 'gonogo'] as GameId[]).map((g) => r(g, 'assessment'));

describe('assessment forms', () => {
  it('baseline A → re-test B → next A2 (then cycles)', () => {
    expect([0, 1, 2, 3, 4, 5].map(assessmentForm)).toEqual(['A', 'B', 'A2', 'A', 'B', 'A2']);
    expect(assessmentForm(NaN)).toBe('A');
  });

  it('counts assessments, not training games', () => {
    expect(nextAssessmentForm([])).toBe('A');
    const afterBaseline = [...quiz(), r('flash41', 'training'), r('stroop', 'training'), r('stroop', 'training')];
    expect(assessmentsTaken(afterBaseline)).toBe(1);
    expect(nextAssessmentForm(afterBaseline)).toBe('B');
    expect(nextAssessmentForm([...afterBaseline, ...quiz()])).toBe('A2');
  });

  it('counts the training slot of the day', () => {
    const t0 = new Date(2026, 10, 8, 9).getTime();
    const day = dayKey(t0);
    const rs = [r('stroop', 'training', t0), r('series', 'training', t0 + 1000), r('corsi', 'assessment', t0), r('stroop', 'training', t0 - 86_400_000)];
    expect(trainingSlot(rs, day)).toBe(2);
    expect(trainingSlot([], day)).toBe(0);
  });
});

describe('planForToday', () => {
  const profile = (weakest: Ability): Profile => ({
    scores: { memory: 60, attention: 60, logic: 60, speed: 60, [weakest]: 30 },
    weakest,
    index: 500,
  });
  const cardKey = (it: { gameId: GameId; variant?: string; startLevel?: number }) => `${it.gameId}|${it.variant ?? ''}|${it.startLevel ?? ''}`;

  for (const a of ABILITIES) {
    it(`30 days, weak = ${a}: 3 cards, ≥ 2 on the weak zone, no two identical cards in a row, varies by day`, () => {
      const plans = new Set<string>();
      for (let day = 20_000; day < 20_030; day++) {
        const items = planItemsForToday(profile(a), day);
        expect(items).toHaveLength(3);
        expect(items.filter((it) => ABILITY_OF[it.gameId] === a).length).toBeGreaterThanOrEqual(2);
        for (let i = 1; i < items.length; i++) {
          expect(items[i].gameId, `day ${day}`).not.toBe(items[i - 1].gameId);
        }
        // the two weak-zone cards are distinguishable (other game or a second-round variant)
        expect(new Set(items.map(cardKey)).size).toBe(3);
        expect(items.every((it) => !it.done)).toBe(true);
        plans.add(items.map(cardKey).join(','));
      }
      expect(plans.size).toBe(3); // rotation[day % 3]
    });
  }

  it('weak = memory → [flash41, rotation, corsi]', () => {
    expect(planForToday(profile('memory'), 0)).toEqual(['flash41', 'stroop', 'corsi']);
    expect(planForToday(profile('memory'), 1)).toEqual(['flash41', 'series', 'corsi']);
    expect(planForToday(profile('memory'), 2)).toEqual(['flash41', 'gonogo', 'corsi']);
  });

  it('weak ≠ memory → [weak, rotation, weak · second round]', () => {
    expect(planForToday(profile('speed'), 0)).toEqual(['gonogo', 'flash41', 'gonogo']);
    expect(planForToday(profile('attention'), 1)).toEqual(['stroop', 'series', 'stroop']);
    const logic = planItemsForToday(profile('logic'), 2);
    expect(logic.map((it) => it.gameId)).toEqual([GAME_FOR.logic, 'gonogo', GAME_FOR.logic]);
    expect(logic[2].variant).toBe('second');
    expect(logic[2].startLevel).toBeGreaterThan(1);
  });

  it('handles a garbage profile and negative days', () => {
    expect(planForToday({} as Profile, -4)).toHaveLength(3);
  });
});
