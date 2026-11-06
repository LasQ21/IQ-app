import { describe, expect, it } from 'vitest';
import { updateIndex } from './wittioIndex';
import { normalize } from './scoring';
import type { GameResult } from '../state/types';

const stroop = (acc: number, rt: number, total = 12): GameResult => ({
  gameId: 'stroop',
  ability: 'attention',
  rawScore: Math.round(acc * total),
  form: 'B',
  playedAt: 0,
  meta: { correct: Math.round(acc * total), total, accuracy: acc, meanRtMs: rt, mode: 'training' },
});

describe('updateIndex', () => {
  it('never decreases and always shows at least +3', () => {
    const results = [stroop(0, 3000, 0), stroop(0.3, 1700), stroop(0.9, 1100), stroop(1, 600)];
    for (const prev of [0, 120, 350, 500, 650, 800, 950, 990]) {
      for (const r of results) {
        const next = updateIndex(prev, r);
        expect(next - prev).toBeGreaterThanOrEqual(Math.min(3, 1000 - prev));
        expect(Number.isInteger(next)).toBe(true);
      }
    }
  });

  it('gives a typical +8…+15 that scales with performance', () => {
    const mid = stroop(0.9, 1100);
    const top = stroop(1, 700);
    const dMid = updateIndex(560, mid) - 560;
    const dTop = updateIndex(560, top) - 560;
    expect(normalize(mid)).toBeGreaterThan(40);
    expect(dMid).toBeGreaterThanOrEqual(8);
    expect(dMid).toBeLessThanOrEqual(15);
    expect(dTop).toBeGreaterThan(dMid);
    expect(dTop).toBeLessThanOrEqual(20);
  });

  it('is monotonic over a long sequence of games and capped at 1000', () => {
    let idx = 500;
    for (let i = 0; i < 200; i++) {
      const next = updateIndex(idx, stroop(i % 3 === 0 ? 0.4 : 0.95, 900 + (i % 5) * 100));
      expect(next).toBeGreaterThanOrEqual(idx);
      expect(next).toBeLessThanOrEqual(1000);
      idx = next;
    }
    expect(idx).toBe(1000);
    expect(updateIndex(1000, stroop(1, 600))).toBe(1000);
  });

  it('handles garbage previous values', () => {
    expect(updateIndex(NaN, stroop(0.9, 1000))).toBeGreaterThanOrEqual(3);
    expect(updateIndex(5000, stroop(0.9, 1000))).toBe(1000);
    expect(updateIndex(-50, stroop(0.9, 1000))).toBeGreaterThanOrEqual(3);
  });
});
