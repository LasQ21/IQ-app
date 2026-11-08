import { describe, expect, it } from 'vitest';
import { buildProfile, normalize } from './scoring';
import { mulberry32 } from '../games/banks';
import type { Ability, GameId, GameResult } from '../state/types';

const ABILITY: Record<GameId, Ability> = {
  stroop: 'attention',
  corsi: 'memory',
  series: 'logic',
  gonogo: 'speed',
  flash41: 'memory',
};

function res(gameId: GameId, rawScore: number, meta: GameResult['meta'] = {}, extra: Partial<GameResult> = {}): GameResult {
  return { gameId, ability: ABILITY[gameId], rawScore, form: 'A', playedAt: 0, meta, ...extra };
}

/** Typical adult results for a 15 s assessment (and a training FlashGrid). */
const TYPICAL: GameResult[] = [
  res('stroop', 10, { correct: 10, total: 11, accuracy: 10 / 11, meanRtMs: 1100, mode: 'assessment' }),
  res('corsi', 4, { correct: 2, total: 3, accuracy: 2 / 3, meanRtMs: 500, recalled: 10, durationMs: 15_000, mode: 'assessment' }),
  res('series', 4, { correct: 4, total: 4, accuracy: 1, meanRtMs: 2700, durationMs: 15_000, mode: 'assessment' }),
  res('gonogo', 420, { correct: 14, total: 15, accuracy: 0.9, meanRtMs: 420, mode: 'assessment' }),
  res('flash41', 6, { correct: 6, total: 9, accuracy: 0.67, maxLevel: 6, meanRtMs: 500, mode: 'training' }, { level: 5 }),
];

describe('normalize', () => {
  it('lands a typical adult in ~40–75 for every game', () => {
    for (const r of TYPICAL) {
      const n = normalize(r);
      expect(n, r.gameId).toBeGreaterThanOrEqual(40);
      expect(n, r.gameId).toBeLessThanOrEqual(75);
    }
  });

  it('is deterministic and integer', () => {
    for (const r of TYPICAL) {
      expect(normalize(r)).toBe(normalize({ ...r, meta: { ...r.meta } }));
      expect(Number.isInteger(normalize(r))).toBe(true);
    }
  });

  it('rewards better performance (monotonic in the obvious directions)', () => {
    const stroop = (rt: number, acc: number) => normalize(res('stroop', 10, { total: 12, accuracy: acc, meanRtMs: rt }));
    expect(stroop(800, 1)).toBeGreaterThan(stroop(1200, 1));
    expect(stroop(1000, 1)).toBeGreaterThan(stroop(1000, 0.7));
    const gng = (rt: number, acc: number) => normalize(res('gonogo', rt, { total: 16, accuracy: acc, meanRtMs: rt }));
    expect(gng(320, 0.95)).toBeGreaterThan(gng(480, 0.95));
    expect(gng(400, 1)).toBeGreaterThan(gng(400, 0.7));
    expect(normalize(res('corsi', 6, { total: 4, accuracy: 0.75 }))).toBeGreaterThan(
      normalize(res('corsi', 4, { total: 4, accuracy: 0.75 })),
    );
    const flash = (max: number, lvl: number) =>
      normalize(res('flash41', 5, { correct: 5, total: 8, accuracy: 0.6, maxLevel: max }, { level: lvl }));
    expect(flash(7, 6)).toBeGreaterThan(flash(5, 4));
  });

  it('scores no-measurement results as 0 and random tapping near 0', () => {
    for (const id of ['stroop', 'series', 'gonogo', 'corsi', 'flash41'] as GameId[]) {
      expect(normalize(res(id, 0, { correct: 0, total: 0, accuracy: 0 }))).toBe(0);
    }
    // Go/No-Go: tapping everything → balanced accuracy 0.5 → 0
    expect(normalize(res('gonogo', 250, { total: 16, accuracy: 0.5, meanRtMs: 250 }))).toBe(0);
    // Stroop at chance level (25 %) → 0 however fast
    expect(normalize(res('stroop', 3, { total: 12, accuracy: 0.25, meanRtMs: 300 }))).toBe(0);
  });

  it('puts training results on the same scale as assessment results', () => {
    const a = res('stroop', 10, { total: 11, accuracy: 0.91, meanRtMs: 1050, mode: 'assessment' });
    const t = res('stroop', 22, { total: 24, accuracy: 0.91, meanRtMs: 1050, mode: 'training' });
    expect(normalize(t)).toBe(normalize(a));
  });

  it('always stays within 0–100 for extreme and garbage input', () => {
    const garbage: unknown[] = [NaN, Infinity, -Infinity, -1e9, 1e12, 0, -0.5, 0.5, undefined, null, '7', {}];
    const ids: unknown[] = ['stroop', 'corsi', 'series', 'gonogo', 'flash41', 'unknown', undefined];
    const pick = (rnd: () => number, xs: unknown[]) => xs[Math.floor(rnd() * xs.length)];
    const rnd = mulberry32(42);
    for (let i = 0; i < 4000; i++) {
      const r = {
        gameId: pick(rnd, ids),
        ability: 'memory',
        rawScore: pick(rnd, garbage),
        level: pick(rnd, garbage),
        form: 'A',
        playedAt: 0,
        meta:
          rnd() < 0.1
            ? undefined
            : {
                correct: pick(rnd, garbage),
                total: pick(rnd, garbage),
                accuracy: pick(rnd, garbage),
                meanRtMs: pick(rnd, garbage),
                maxLevel: pick(rnd, garbage),
              },
      } as unknown as GameResult;
      const n = normalize(r);
      expect(Number.isFinite(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(100);
    }
    expect(normalize(null as unknown as GameResult)).toBe(0);
  });

  it('caps perfect inhuman performance at 100', () => {
    expect(normalize(res('stroop', 99, { total: 99, accuracy: 1, meanRtMs: 1 }))).toBe(100);
    expect(normalize(res('gonogo', 1, { total: 99, accuracy: 1, meanRtMs: 1 }))).toBe(100);
    expect(normalize(res('corsi', 99, { total: 9, accuracy: 1 }))).toBeLessThanOrEqual(100);
    expect(normalize(res('flash41', 99, { correct: 9, total: 9, accuracy: 1, maxLevel: 99 }, { level: 99 }))).toBeLessThanOrEqual(100);
  });
});

describe('buildProfile', () => {
  it('missing abilities default to 50 and index is mid-range', () => {
    const p = buildProfile([]);
    expect(p.scores).toEqual({ memory: 50, attention: 50, logic: 50, speed: 50 });
    expect(p.weakest).toBe('memory'); // tie → stable order
    expect(p.index).toBe(500);
  });

  it('picks the weakest ability', () => {
    const p = buildProfile(TYPICAL.slice(0, 4));
    const min = Math.min(...Object.values(p.scores));
    expect(p.scores[p.weakest]).toBe(min);
    // gonogo very slow → speed weakest
    const slow = buildProfile([...TYPICAL.slice(0, 3), res('gonogo', 690, { total: 15, accuracy: 0.7, meanRtMs: 690 })]);
    expect(slow.weakest).toBe('speed');
  });

  it('breaks ties in the stable order memory, attention, logic, speed', () => {
    const s = (id: GameId) => res(id, 10, { total: 0 }); // unmeasured → ignored → 50
    expect(buildProfile([s('stroop'), s('series')]).weakest).toBe('memory');
    // attention and logic both low and equal → attention
    const low = (id: GameId) => res(id, 0, { total: 10, accuracy: 0.25, meanRtMs: 3000 });
    expect(buildProfile([low('series'), low('stroop')]).weakest).toBe('attention');
  });

  it('uses the mean of the latest 3 results per ability', () => {
    const strong = res('stroop', 12, { total: 12, accuracy: 1, meanRtMs: 700 });
    const weak = res('stroop', 2, { total: 12, accuracy: 0.4, meanRtMs: 1600 });
    const p = buildProfile([weak, weak, strong, strong, strong]);
    expect(p.scores.attention).toBe(normalize(strong));
    const q = buildProfile([strong, strong, weak]);
    expect(q.scores.attention).toBe(Math.round((2 * normalize(strong) + normalize(weak)) / 3));
  });

  it('ignores results with zero trials', () => {
    const r = res('series', 0, { total: 0, correct: 0, accuracy: 0 });
    expect(buildProfile([r]).scores.logic).toBe(50);
  });

  it('keeps the baseline index in a range that leaves headroom', () => {
    const p = buildProfile(TYPICAL.slice(0, 4));
    expect(p.index).toBeGreaterThanOrEqual(350);
    expect(p.index).toBeLessThanOrEqual(650);
    const perfect = buildProfile(
      (['stroop', 'corsi', 'series', 'gonogo'] as GameId[]).map((id) =>
        res(id, id === 'corsi' ? 9 : id === 'gonogo' ? 200 : 20, { total: 20, accuracy: 1, meanRtMs: id === 'gonogo' ? 200 : 500 }),
      ),
    );
    expect(perfect.index).toBeLessThan(1000);
  });
});

describe('corsi partial credit (meta.recalled)', () => {
  const corsi = (span: number, recalled: number, total = 4, extra: GameResult['meta'] = {}): GameResult => ({
    gameId: 'corsi',
    ability: 'memory',
    rawScore: span,
    form: 'A',
    playedAt: 0,
    meta: { correct: 2, total, accuracy: 0.5, recalled, mode: 'assessment', ...extra },
  });
  it('score = 0.5·lin(span, 2, 6) + 0.5·lin(recalled, 3, 12): no ceiling at ≈ 50', () => {
    expect(normalize(corsi(6, 15, 3))).toBe(100); // perfect 4 + 5 + 6
    expect(normalize(corsi(5, 9, 2))).toBe(Math.round(100 * (0.5 * 0.75 + 0.5 * (6 / 9)))); // 4 + 5 → 71
    expect(normalize(corsi(4, 4 + 2 + 3, 3))).toBe(Math.round(100 * (0.25 + 0.5 * (6 / 9)))); // slips → 58
  });
  it('one slip costs points, not half the score', () => {
    const perfect = normalize(corsi(5, 9, 2));
    const slip = normalize(corsi(4, 4 + 2 + 4, 3));
    expect(slip).toBeGreaterThan(perfect * 0.65);
    expect(slip).toBeLessThan(perfect);
  });
  it('more recalled cells → higher score', () => {
    expect(normalize(corsi(4, 12))).toBeGreaterThan(normalize(corsi(4, 8)));
  });
  it('a 10 s fast-mode run is scaled to 15 s; a 10-trial training run to 3 trials', () => {
    expect(normalize(corsi(5, 6, 2, { durationMs: 10_000 }))).toBe(normalize(corsi(5, 9, 2)));
    expect(normalize(corsi(6, 30, 10, { mode: 'training' }))).toBe(normalize(corsi(6, 9, 3)));
  });
});

describe('series rate score', () => {
  const series = (correct: number, total: number, meta: GameResult['meta'] = {}): GameResult =>
    res('series', correct, { correct, total, accuracy: correct / total, meanRtMs: 2800, durationMs: 15_000, mode: 'assessment', ...meta });
  it('more correct answers in the same time → higher; random tapping → ≈ 0', () => {
    expect(normalize(series(5, 5))).toBeGreaterThan(normalize(series(4, 4)));
    expect(normalize(series(4, 5))).toBeLessThan(normalize(series(4, 4)));
    expect(normalize(series(2, 8))).toBe(0); // chance level (net 0)
  });
  it('10 s fast mode is on the same per-15 s scale', () => {
    expect(normalize(series(3, 3, { durationMs: 10_000 }))).toBe(normalize(series(4.5, 4.5)));
  });
  it('one quick answer and "Finish" is not a high score', () => {
    expect(normalize(series(1, 1, { durationMs: 2_000 }))).toBeLessThan(15);
  });
});

describe('profile = assessment instruments only', () => {
  it('ignores training games and FlashGrid (no "Memory +13" after one game)', () => {
    const baseline = TYPICAL.slice(0, 4);
    const p0 = buildProfile(baseline);
    const strongFlash = res('flash41', 9, { correct: 9, total: 10, accuracy: 0.9, maxLevel: 8, mode: 'training' }, { level: 8 });
    const strongStroop = res('stroop', 24, { correct: 24, total: 24, accuracy: 1, meanRtMs: 600, mode: 'training' });
    const strongCorsi = res('corsi', 7, { correct: 9, total: 10, accuracy: 0.9, recalled: 50, mode: 'training' });
    const p1 = buildProfile([...baseline, strongFlash, strongStroop, strongCorsi]);
    expect(p1.scores).toEqual(p0.scores);
    expect(p1.weakest).toBe(p0.weakest);
  });
});
