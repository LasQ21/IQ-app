import { describe, expect, it } from 'vitest';
import { AVERAGE_TRAINING_SCORE, indexGain, simulateDays, updateIndex } from './wittioIndex';
import { normalize } from './scoring';
import type { GameResult } from '../state/types';

const stroop = (acc: number, rt: number, total = 12): GameResult => ({
  gameId: 'stroop',
  ability: 'attention',
  rawScore: Math.round(acc * total),
  form: 'T',
  playedAt: 0,
  meta: { correct: Math.round(acc * total), total, accuracy: acc, meanRtMs: rt, mode: 'training' },
});

describe('indexGain / updateIndex', () => {
  it('follows gain = (2 + 10·s/100) · clamp((1000 − prev)/600, 0.05, 1), rounded up', () => {
    expect(indexGain(400, 50)).toBe(7); // full headroom
    expect(indexGain(700, 50)).toBe(Math.ceil(7 * 0.5)); // 4
    expect(indexGain(990, 100)).toBe(1); // floor 0.05 → 0.6 → +1
    expect(indexGain(999, 100)).toBe(1);
    expect(indexGain(1000, 100)).toBe(0);
  });

  it('score < 15 gives +0 (empty games cannot farm the index)', () => {
    expect(indexGain(500, 14)).toBe(0);
    expect(indexGain(500, 15)).toBeGreaterThan(0);
    let idx = 500;
    const empty = stroop(0.25, 600, 12); // chance level → score 0
    expect(normalize(empty)).toBeLessThan(15);
    for (let i = 0; i < 300; i++) idx = updateIndex(idx, empty);
    expect(idx).toBe(500);
    expect(updateIndex(500, stroop(0, 0, 0))).toBe(500);
  });

  it('scales with performance', () => {
    const mid = stroop(0.9, 1100);
    const top = stroop(1, 700);
    expect(updateIndex(560, top) - 560).toBeGreaterThan(updateIndex(560, mid) - 560);
    expect(updateIndex(560, top) - 560).toBeLessThanOrEqual(12);
  });

  it('is monotonic, integer and capped at 1000', () => {
    let idx = 500;
    for (let i = 0; i < 2000; i++) {
      const next = updateIndex(idx, stroop(i % 3 === 0 ? 0.4 : 0.95, 900 + (i % 5) * 100));
      expect(next).toBeGreaterThanOrEqual(idx);
      expect(next).toBeLessThanOrEqual(1000);
      expect(Number.isInteger(next)).toBe(true);
      idx = next;
    }
    expect(updateIndex(1000, stroop(1, 600))).toBe(1000);
  });

  it('handles garbage previous values', () => {
    expect(updateIndex(NaN, stroop(0.9, 1000))).toBeGreaterThanOrEqual(3);
    expect(updateIndex(5000, stroop(0.9, 1000))).toBe(1000);
    expect(updateIndex(-50, stroop(0.9, 1000))).toBeGreaterThanOrEqual(3);
    expect(simulateDays(NaN, NaN)).toEqual([]);
  });
});

describe('average trajectory (3 counted games a day)', () => {
  const traj = simulateDays(500, 61, AVERAGE_TRAINING_SCORE);
  it.each([
    [0, 522],
    [1, 540],
    [7, 633],
    [30, 852],
    [60, 965],
  ])('day %i ≈ %i (±10)', (day, expected) => {
    expect(Math.abs(traj[day] - expected)).toBeLessThanOrEqual(10);
  });

  it('stays below 1000 for the first month and never decreases', () => {
    expect(Math.max(...traj.slice(0, 31))).toBeLessThan(1000);
    for (let i = 1; i < traj.length; i++) expect(traj[i]).toBeGreaterThanOrEqual(traj[i - 1]);
  });

  it('the +30 days demo jump moves at the real pace (≈ +10…+20 a day near 540)', () => {
    const jump = simulateDays(540, 30);
    expect(jump).toHaveLength(30);
    expect(jump[0] - 540).toBeGreaterThanOrEqual(10);
    expect(jump[0] - 540).toBeLessThanOrEqual(20);
    expect(jump[29]).toBeLessThan(900);
  });
});
