import { describe, expect, it } from 'vitest';
import { aggregate, selectRecords } from './aggregate';
import { sanitize, type LiveRecord } from './schema';

const NOW = Date.UTC(2026, 10, 9, 12, 0, 0);

function rec(over: Partial<LiveRecord> & { id: string }): LiveRecord {
  return { v: 1, lang: 'uk', jury: false, fast: false, t0: NOW - 120_000, t: NOW - 1_000, reach: {}, ...over };
}

describe('sanitize (untrusted POST body)', () => {
  it('keeps a valid record and clamps values', () => {
    const r = sanitize(
      {
        id: 'abcdef12-3456',
        lang: 'uk',
        jury: true,
        fast: 1,
        t0: NOW - 5_000,
        t: NOW + 10_000_000, // future → clamped to now
        reach: { quiz: NOW - 4_000, teaser: NOW - 1_000, bogus: NOW },
        scores: { memory: 140, attention: 50.4, logic: -3, speed: 61 },
        weakest: 'logic',
        index: 5000,
        econ: { o: 60, c: 10 },
        vote: 'yes',
        extra: 'dropped',
      },
      NOW,
    );
    expect(r).not.toBeNull();
    expect(r!.t).toBe(NOW);
    expect(r!.fast).toBe(false); // only `true` counts
    expect(r!.reach).toEqual({ quiz: NOW - 4_000, teaser: NOW - 1_000 });
    expect(r!.scores).toEqual({ memory: 100, attention: 50, logic: 0, speed: 61 });
    expect(r!.index).toBe(1000);
    expect(r!.vote).toBe('yes');
    expect((r as unknown as Record<string, unknown>).extra).toBeUndefined();
  });

  it('rejects garbage and bad ids', () => {
    expect(sanitize(null, NOW)).toBeNull();
    expect(sanitize([], NOW)).toBeNull();
    expect(sanitize({ id: '../../etc' }, NOW)).toBeNull();
    expect(sanitize({ id: 'short' }, NOW)).toBeNull();
  });

  it('drops partial scores, unknown votes and languages', () => {
    const r = sanitize({ id: 'abcdefgh1', lang: 'fr', scores: { memory: 50 }, vote: 'love', weakest: 'iq' }, NOW)!;
    expect(r.lang).toBe('ja');
    expect(r.scores).toBeUndefined();
    expect(r.vote).toBeUndefined();
    expect(r.weakest).toBeUndefined();
  });
});

describe('aggregate (dashboard numbers)', () => {
  const S = { memory: 60, attention: 40, logic: 70, speed: 50 };
  const records = [
    rec({
      id: 'a1aaaaaaaa',
      jury: true,
      reach: { landing: NOW - 100_000, quiz: NOW - 90_000, teaser: NOW - 40_000, paywall: NOW - 35_000, start: NOW - 30_000, trained: NOW - 15_000, today: NOW - 5_000 },
      scores: S,
      weakest: 'attention',
      index: 560,
      vote: 'yes',
      econ: { o: 60, c: 10 },
    }),
    rec({
      id: 'b2bbbbbbbb',
      reach: { landing: NOW - 100_000, quiz: NOW - 95_000, teaser: NOW - 45_000, paywall: NOW - 40_000, start: NOW - 38_000 },
      scores: { memory: 30, attention: 70, logic: 50, speed: 80 },
      weakest: 'memory',
      vote: 'maybe',
    }),
    rec({ id: 'c3cccccccc', reach: { landing: NOW - 10_000 } }),
    rec({ id: 'd4dddddddd', test: true, reach: { landing: NOW - 10_000 }, scores: S, weakest: 'logic' }),
    rec({ id: 'e5eeeeeeee', t: NOW - 10 * 3600_000, reach: { landing: NOW - 10 * 3600_000 } }),
  ];
  const sel = selectRecords(records, NOW - 3600_000);
  const st = aggregate(sel);

  it('filters the window and rehearsals', () => {
    expect(sel.map((r) => r.id)).toEqual(['a1aaaaaaaa', 'b2bbbbbbbb', 'c3cccccccc']);
    expect(selectRecords(records, NOW - 3600_000, true)).toHaveLength(4);
  });

  it('counts the funnel, the test and the step "Start" → first exercise', () => {
    expect(st.opened).toBe(3);
    expect(st.tested).toBe(2);
    expect(st.funnel.landing).toBe(3);
    expect(st.funnel.paywall).toBe(2);
    expect(st.funnel.trained).toBe(1);
    expect(st.startToTrained).toEqual({ start: 2, trained: 1, rate: 0.5 });
  });

  it('medians, means, weak zones, votes, economics', () => {
    expect(st.quizSecMedian).toBe(50);
    expect(st.loopSecMedian).toBe(75);
    expect(st.abilities.memory).toBe(45);
    expect(st.weak).toEqual({ memory: 1, attention: 1, logic: 0, speed: 0 });
    expect(st.weakKinds).toBe(2);
    expect(st.indexMean).toBe(560);
    expect(st.vote).toMatchObject({ yes: 1, maybe: 1, no: 0, total: 2, yesShare: 0.5 });
    expect(st.econ).toMatchObject({ n: 1, opened: 60, churn: 10, ltvCac: 1.47 });
    expect(st.juryMode).toBe(1);
  });

  it('leaves runs spread over days out of the time medians', () => {
    // Test opened yesterday (rehearsal), first exercise today: ~30 h, not the loop length.
    const stale = rec({
      id: 'f6ffffffff',
      reach: { quiz: NOW - 110_000_000, teaser: NOW - 109_950_000, start: NOW - 60_000, trained: NOW - 30_000 },
    });
    const s2 = aggregate([...sel, stale]);
    expect(s2.loopSecMedian).toBe(75);
    expect(s2.quizSecMedian).toBe(50);
    // The run still counts in the funnel and in "Start" → first exercise.
    expect(s2.funnel.trained).toBe(2);
    expect(s2.startToTrained).toEqual({ start: 3, trained: 2, rate: 2 / 3 });
    // Only stale runs: no median rather than a misleading one.
    expect(aggregate([stale]).loopSecMedian).toBeNull();
  });

  it('is empty-safe', () => {
    const e = aggregate([]);
    expect(e.opened).toBe(0);
    expect(e.quizSecMedian).toBeNull();
    expect(e.startToTrained.rate).toBeNull();
    expect(e.econ).toBeNull();
    expect(e.vote.yesShare).toBeNull();
  });
});
