import { describe, expect, it } from 'vitest';
import { ASSESSMENT_MS, JURY_FAST_TASK_MS } from '../config';
import { ABILITIES, type Ability, type GameResult } from '../state/types';
import { classifyChange, ERROR_BAND, ERROR_BAND_FAST, weakestStable } from './errorBands';
import { buildProfile, normalize } from './scoring';
import { AVERAGE_PLAYER, playerAt, simulateAssessment } from './sim';

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const scoreOf = (rs: GameResult[], a: Ability) => normalize(rs.find((r) => r.ability === a)!);

describe('simulated average player with human timings (taps every 400–600 ms)', () => {
  it.each([
    ['15 s', ASSESSMENT_MS],
    ['10 s fast mode', JURY_FAST_TASK_MS],
  ])('%s: every ability lands within ±15 of the middle (35–65)', (_, ms) => {
    expect(AVERAGE_PLAYER.tapMs).toEqual([400, 600]);
    const runs = Array.from({ length: 400 }, (_, i) => simulateAssessment(AVERAGE_PLAYER, 'A', 100 + i, ms));
    for (const a of ABILITIES) {
      const m = mean(runs.map((rs) => scoreOf(rs, a)));
      expect(m, a).toBeGreaterThanOrEqual(35);
      expect(m, a).toBeLessThanOrEqual(65);
    }
  });

  it('15 s and 10 s runs are on a comparable scale (mean gap ≤ 10 per ability)', () => {
    const a = Array.from({ length: 400 }, (_, i) => simulateAssessment(AVERAGE_PLAYER, 'A', 100 + i, ASSESSMENT_MS));
    const b = Array.from({ length: 400 }, (_, i) => simulateAssessment(AVERAGE_PLAYER, 'A', 100 + i, JURY_FAST_TASK_MS));
    for (const ab of ABILITIES) {
      expect(Math.abs(mean(a.map((rs) => scoreOf(rs, ab))) - mean(b.map((rs) => scoreOf(rs, ab)))), ab).toBeLessThanOrEqual(10);
    }
  });

  it('Series: ≥ 4 answers in 15 s and ≥ 3 in 10 s', () => {
    const answered = (ms: number) =>
      Array.from({ length: 300 }, (_, i) => simulateAssessment(AVERAGE_PLAYER, 'A', 500 + i, ms).find((r) => r.gameId === 'series')!.meta!.total!);
    const at15 = answered(ASSESSMENT_MS);
    const at10 = answered(JURY_FAST_TASK_MS);
    expect(mean(at15)).toBeGreaterThanOrEqual(4);
    expect(at15.filter((n) => n >= 4).length / at15.length).toBeGreaterThanOrEqual(0.9);
    expect(at10.filter((n) => n >= 3).length / at10.length).toBeGreaterThanOrEqual(0.9);
  });

  it('10 s fast mode: every instrument produces a real measurement', () => {
    for (let i = 0; i < 200; i++) {
      const rs = simulateAssessment(AVERAGE_PLAYER, 'A', 900 + i, JURY_FAST_TASK_MS);
      const by = Object.fromEntries(rs.map((r) => [r.gameId, r]));
      expect(by.corsi.meta!.total!).toBeGreaterThanOrEqual(2); // ≥ 2 sequences
      expect(by.series.meta!.total!).toBeGreaterThanOrEqual(2);
      expect(by.stroop.meta!.total!).toBeGreaterThanOrEqual(5);
      expect(by.gonogo.meta!.total!).toBeGreaterThanOrEqual(6); // incl. both No-Go of block 1
      expect(by.gonogo.rawScore).toBeGreaterThan(0);
    }
  });

  it('better players score higher on every ability', () => {
    const at = (z: number) => Array.from({ length: 200 }, (_, i) => simulateAssessment(playerAt(z), 'A', 300 + i));
    const lo = at(-1);
    const hi = at(1);
    for (const a of ABILITIES) expect(mean(hi.map((rs) => scoreOf(rs, a))), a).toBeGreaterThan(mean(lo.map((rs) => scoreOf(rs, a))) + 15);
  });
});

describe('error bands (Monte-Carlo, unchanged skill)', () => {
  it.each([
    ['15 s', ASSESSMENT_MS, ERROR_BAND],
    ['10 s', JURY_FAST_TASK_MS, ERROR_BAND_FAST],
  ] as const)('%s: ERROR_BAND matches 1.645 × SD(re-test − baseline) within 20 %%', (_, ms, bands) => {
    const diffs: Record<Ability, number[]> = { memory: [], attention: [], logic: [], speed: [] };
    for (const z of [-1, 0, 1]) {
      const p = playerAt(z);
      for (let i = 0; i < 700; i++) {
        const a = simulateAssessment(p, 'A', 7_000 + i, ms);
        const b = simulateAssessment(p, 'B', 3_000_000 + i, ms);
        for (const ab of ABILITIES) diffs[ab].push(scoreOf(b, ab) - scoreOf(a, ab));
      }
    }
    for (const ab of ABILITIES) {
      const band = 1.645 * sd(diffs[ab]);
      expect(band / bands[ab], `${ab}: simulated ${band.toFixed(1)} vs ${bands[ab]}`).toBeGreaterThan(0.8);
      expect(band / bands[ab], `${ab}: simulated ${band.toFixed(1)} vs ${bands[ab]}`).toBeLessThan(1.2);
    }
  });

  it.each([
    ['15 s', ASSESSMENT_MS, false],
    ['10 s', JURY_FAST_TASK_MS, true],
  ] as const)('%s: identical-skill bot on 12 seeds → ≥ 80 %% "stable", weak zone kept', (_, ms, fast) => {
    let stable = 0;
    let total = 0;
    let kept = 0;
    // a person with a real (−0.7 SD) weak zone, and the flat average person
    for (const p of [playerAt({ logic: -0.7 }), AVERAGE_PLAYER]) {
      for (let seed = 1; seed <= 12; seed++) {
        const before = buildProfile(simulateAssessment(p, 'A', seed * 1_009, ms));
        const after = buildProfile(simulateAssessment(p, 'B', seed * 7_919 + 13, ms));
        const ch = classifyChange(before, after, fast);
        stable += ch.filter((c) => c.cls === 'stable').length;
        total += ch.length;
        if (weakestStable(before, after, fast) === before.weakest) kept += 1;
      }
    }
    expect(stable / total).toBeGreaterThanOrEqual(0.8);
    expect(kept).toBeGreaterThanOrEqual(20); // of 24
  });
});
