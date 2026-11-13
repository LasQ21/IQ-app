/** Live jury dashboard — statistics over the anonymous records (pure; used by api/jury.ts, tested in aggregate.test.ts). */
// Runtime imports carry a .js extension: this module is also loaded by the Node ESM function api/jury.ts.
import { economics } from '../engine/economics.js';
import type { Ability, Lang } from '../state/types';
import { ABILITIES, LANGS } from '../state/types.js';
import type { LiveRecord, Step, Vote } from './schema';
import { STEPS, VOTES } from './schema.js';

export interface LiveStats {
  /** Phones that opened the prototype in the window. */
  opened: number;
  /** …and finished the 4-task test (have scores). */
  tested: number;
  /** How many phones reached each step (first visit). */
  funnel: Record<Step, number>;
  /** Median seconds: start of the test → profile (teaser), runs done in one sitting (≤ MAX_SITTING_SEC). */
  quizSecMedian: number | null;
  /** Median seconds: start of the test → first exercise finished ("opened the product"), in one sitting. */
  loopSecMedian: number | null;
  /** Of those who tapped "Start" on the paywall, how many finished the first exercise (0–1). */
  startToTrained: { start: number; trained: number; rate: number | null };
  /** Mean 0–100 score per ability over the tested phones. */
  abilities: Record<Ability, number | null>;
  /** Weak zone (standardised, as in the app) per ability. */
  weak: Record<Ability, number>;
  /** Number of different weak zones among the tested phones. */
  weakKinds: number;
  /** Mean Wittio Index after the first exercise. */
  indexMean: number | null;
  vote: Record<Vote, number> & { total: number; yesShare: number | null };
  /** Mean of the Loop-economics sliders the jury left, and what the model gives for it. */
  econ: { n: number; opened: number; churn: number; ltvCac: number; romi: number } | null;
  retest: { n: number; better: number; stable: number; lower: number };
  langs: Record<Lang, number>;
  juryMode: number;
  lastAt: number | null;
}

const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10);

/**
 * Longest gap (s) still counted as one sitting in the time medians. A phone keeps its record in localStorage until
 * "Reset demo", so `reach.quiz` can be from yesterday's rehearsal and `reach.trained` from today: that run says
 * nothing about how long the loop takes and would pull the median to ~1 day. The demo loop itself is minutes.
 */
export const MAX_SITTING_SEC = 30 * 60;
/** Seconds from `from` to `to`, or null if a step is missing, out of order or not in one sitting. */
const sitting = (from: number | undefined, to: number | undefined): number | null => {
  if (from === undefined || to === undefined || to < from) return null;
  const sec = (to - from) / 1000;
  return sec <= MAX_SITTING_SEC ? sec : null;
};

/** Records in the window: updated at or after `since`, rehearsals (`test`) left out unless asked for. */
export function selectRecords(records: LiveRecord[], since: number, includeTest = false): LiveRecord[] {
  return records.filter((r) => r.t >= since && (includeTest || !r.test));
}

export function aggregate(records: LiveRecord[]): LiveStats {
  const funnel = Object.fromEntries(STEPS.map((s) => [s, 0])) as Record<Step, number>;
  const weak = Object.fromEntries(ABILITIES.map((a) => [a, 0])) as Record<Ability, number>;
  const langs = Object.fromEntries(LANGS.map((l) => [l, 0])) as Record<Lang, number>;
  const vote = { yes: 0, maybe: 0, no: 0 } as Record<Vote, number>;
  const scoreLists = Object.fromEntries(ABILITIES.map((a) => [a, [] as number[]])) as Record<Ability, number[]>;
  const quizSec: number[] = [];
  const loopSec: number[] = [];
  const index: number[] = [];
  const econO: number[] = [];
  const econC: number[] = [];
  const retest = { n: 0, better: 0, stable: 0, lower: 0 };
  let start = 0;
  let startTrained = 0;
  let tested = 0;
  let juryMode = 0;
  let lastAt: number | null = null;

  for (const r of records) {
    for (const s of STEPS) if (r.reach[s] !== undefined) funnel[s]++;
    // Opening the app at all counts as "landing", even if the phone came back mid-loop.
    if (r.reach.landing === undefined && Object.keys(r.reach).length > 0) funnel.landing++;
    langs[r.lang]++;
    if (r.jury) juryMode++;
    lastAt = Math.max(lastAt ?? 0, r.t);
    if (r.scores) {
      tested++;
      for (const a of ABILITIES) scoreLists[a].push(r.scores[a]);
      if (r.weakest) weak[r.weakest]++;
    }
    const { quiz, teaser, trained } = r.reach;
    const q = sitting(quiz, teaser);
    if (q !== null) quizSec.push(q);
    const l = sitting(quiz, trained);
    if (l !== null) loopSec.push(l);
    if (r.reach.start !== undefined) {
      start++;
      if (trained !== undefined) startTrained++;
    }
    if (trained !== undefined && r.index !== undefined) index.push(r.index);
    if (r.vote) vote[r.vote]++;
    if (r.econ) {
      econO.push(r.econ.o);
      econC.push(r.econ.c);
    }
    if (r.retest) {
      retest.n++;
      retest.better += r.retest.better;
      retest.stable += r.retest.stable;
      retest.lower += r.retest.lower;
    }
  }

  const voteTotal = vote.yes + vote.maybe + vote.no;
  let econ: LiveStats['econ'] = null;
  if (econO.length) {
    const o = mean(econO)!;
    const c = mean(econC)!;
    const e = economics(o / 100, c / 100);
    econ = { n: econO.length, opened: Math.round(o), churn: Math.round(c), ltvCac: Math.round(e.ltvCac * 100) / 100, romi: Math.round(e.romi * 100) / 100 };
  }

  return {
    opened: records.length,
    tested,
    funnel,
    quizSecMedian: round1(median(quizSec)),
    loopSecMedian: round1(median(loopSec)),
    startToTrained: { start, trained: startTrained, rate: start ? startTrained / start : null },
    abilities: Object.fromEntries(ABILITIES.map((a) => [a, round1(mean(scoreLists[a]))])) as Record<Ability, number | null>,
    weak,
    weakKinds: ABILITIES.filter((a) => weak[a] > 0).length,
    indexMean: index.length ? Math.round(mean(index)!) : null,
    vote: { ...vote, total: voteTotal, yesShare: voteTotal ? vote.yes / voteTotal : null },
    econ,
    retest,
    langs,
    juryMode,
    lastAt,
  };
}

export { VOTES };
