import { describe, expect, it } from 'vitest';
import { nextLevel } from './adaptive';

describe('nextLevel (2-up / 1-down, levels 2–9)', () => {
  it('one correct answer keeps the level', () => {
    expect(nextLevel(4, true, 1)).toBe(4);
  });
  it('two correct in a row → +1', () => {
    expect(nextLevel(4, true, 2)).toBe(5);
  });
  it('every second consecutive correct levels up even without a streak reset', () => {
    expect(nextLevel(5, true, 3)).toBe(5);
    expect(nextLevel(5, true, 4)).toBe(6);
  });
  it('a mistake → −1', () => {
    expect(nextLevel(4, false, 0)).toBe(3);
    expect(nextLevel(4, false, 5)).toBe(3);
  });
  it('clamps to 2–9', () => {
    expect(nextLevel(2, false, 0)).toBe(2);
    expect(nextLevel(9, true, 2)).toBe(9);
    expect(nextLevel(1, false, 0)).toBe(2);
    expect(nextLevel(42, true, 2)).toBe(9);
    expect(nextLevel(-3, true, 2)).toBe(3);
    expect(nextLevel(NaN, true, 2)).toBe(3);
    expect(nextLevel(5, true, NaN)).toBe(5);
  });
  it('simulated run: staircase follows the answers', () => {
    const answers = [true, true, true, true, false, true, true, false, false];
    let level = 3;
    let streak = 0;
    const path: number[] = [];
    for (const ok of answers) {
      streak = ok ? streak + 1 : 0;
      const next = nextLevel(level, ok, streak);
      if (next !== level) streak = 0;
      level = next;
      path.push(level);
    }
    expect(path).toEqual([3, 4, 4, 5, 4, 4, 5, 4, 3]);
    for (const l of path) {
      expect(l).toBeGreaterThanOrEqual(2);
      expect(l).toBeLessThanOrEqual(9);
    }
  });
});
