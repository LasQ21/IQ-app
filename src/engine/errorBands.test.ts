import { describe, expect, it } from 'vitest';
import type { Ability, Profile } from '../state/types';
import { ABILITIES } from '../state/types';
import { classifyChange, ERROR_BAND, ERROR_BAND_FAST, errorBand, scoreRange, weakestStable } from './errorBands';
import { buildProfile } from './scoring';
import { playerAt, simulateAssessment } from './sim';

const prof = (scores: Record<Ability, number>): Profile => {
  const weakest = ABILITIES.reduce((w, a) => (scores[a] < scores[w] ? a : w), ABILITIES[0]);
  return { scores, weakest, index: 500 };
};

describe('error bands', () => {
  it('fast mode bands are wider than the 15 s ones', () => {
    for (const a of ABILITIES) {
      expect(errorBand(a)).toBe(ERROR_BAND[a]);
      expect(errorBand(a, true)).toBe(ERROR_BAND_FAST[a]);
      expect(ERROR_BAND_FAST[a]).toBeGreaterThan(ERROR_BAND[a]);
    }
  });

  it('classifyChange: stable within ±band, better / lower outside', () => {
    const before = prof({ memory: 50, attention: 50, logic: 50, speed: 50 });
    const after = prof({
      memory: 50 + ERROR_BAND.memory,
      attention: 50 + ERROR_BAND.attention + 1,
      logic: 50 - ERROR_BAND.logic - 1,
      speed: 40,
    });
    const ch = Object.fromEntries(classifyChange(before, after).map((c) => [c.ability, c]));
    expect(ch.memory.cls).toBe('stable');
    expect(ch.attention.cls).toBe('better');
    expect(ch.logic.cls).toBe('lower');
    expect(ch.speed.cls).toBe('stable');
    expect(ch.speed.delta).toBe(-10);
    expect(ch.speed.band).toBe(ERROR_BAND.speed);
    // the same +22 is noise in the 10 s fast mode
    expect(classifyChange(before, after, true).find((c) => c.ability === 'attention')!.cls).toBe('stable');
  });

  it('scoreRange clamps to 0–100', () => {
    expect(scoreRange('attention', 74)).toEqual([74 - ERROR_BAND.attention, Math.min(100, 74 + ERROR_BAND.attention)]);
    expect(scoreRange('memory', 5)[0]).toBe(0);
  });

  it('weakestStable: the weak zone only moves on evidence outside noise', () => {
    const prev = prof({ memory: 60, attention: 60, logic: 40, speed: 60 });
    expect(weakestStable(prev, prof({ memory: 60, attention: 45, logic: 50, speed: 60 }))).toBe('logic');
    expect(weakestStable(prev, prof({ memory: 60, attention: 20, logic: 70, speed: 60 }))).toBe('attention');
    expect(weakestStable(prev, prof({ memory: 60, attention: 60, logic: 30, speed: 60 }))).toBe('logic');
  });

  it('a large real change (old weak zone +2 SD, another ability −2 SD) does move the weak zone', () => {
    let moved = 0;
    let n = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const before = buildProfile(simulateAssessment(playerAt({ logic: -1 }), 'A', seed * 31));
      if (before.weakest !== 'logic') continue;
      n += 1;
      const after = buildProfile(simulateAssessment(playerAt({ logic: 1, attention: -2 }), 'B', seed * 37 + 5));
      if (weakestStable(before, after) === 'attention') moved += 1;
    }
    expect(n).toBeGreaterThan(100);
    expect(moved / n).toBeGreaterThan(0.5);
  });
});
