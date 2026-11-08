import { TRAINING_PLAN_GAMES_PER_DAY } from '../config';
import type { GameResult } from '../state/types';
import { normalize } from './scoring';

export const INDEX_MAX = 1000;
/** A training game below this normalized score (e.g. tapped "Finish", random tapping) gives +0. */
export const MIN_SCORE_FOR_GAIN = 15;
/** gain = (GAIN_BASE + GAIN_PERF · score/100) · headroom */
export const GAIN_BASE = 2;
export const GAIN_PERF = 10;
/** headroom = clamp((1000 − prev) / HEADROOM_SPAN, HEADROOM_MIN, 1): the closer to 1000, the slower. */
export const HEADROOM_SPAN = 600;
export const HEADROOM_MIN = 0.05;
/**
 * Mean normalized score of the average player's training games (engine/sim.ts AVERAGE_PLAYER over the plan
 * games). Used for the "+30 days" demo jump and the trajectory test.
 */
export const AVERAGE_TRAINING_SCORE = 47;

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

function safeIndex(prev: number): number {
  return Number.isFinite(prev) ? Math.round(clamp(prev, 0, INDEX_MAX)) : 0;
}

/**
 * Index gain of one counted training game with normalized score `score` (0–100) at index `prev`:
 *
 *   gain = (2 + 10 · score/100) · clamp((1000 − prev) / 600, 0.05, 1), rounded UP (≥ +1 while < 1000)
 *   score < 15 → +0 (no farming with empty games)
 *
 * Average player (score ≈ 47, 3 counted games a day from 500): day 0 ≈ 520, day 1 ≈ 538, day 7 ≈ 630,
 * day 30 ≈ 850, day 60 ≈ 970 — 1000 is never reached within the first month.
 */
export function indexGain(prev: number, score: number): number {
  const p = safeIndex(prev);
  const s = Number.isFinite(score) ? clamp(score, 0, 100) : 0;
  if (s < MIN_SCORE_FOR_GAIN || p >= INDEX_MAX) return 0;
  const headroom = clamp((INDEX_MAX - p) / HEADROOM_SPAN, HEADROOM_MIN, 1);
  return Math.min(INDEX_MAX - p, Math.ceil((GAIN_BASE + (GAIN_PERF * s) / 100) * headroom - 1e-9));
}

/**
 * Wittio Index after one finished training game. Never decreases; capped at 1000.
 * Only the first TRAINING_PLAN_GAMES_PER_DAY games of a day may be passed here (the reducer counts them
 * in `indexGamesByDay`); later games of the day must not call it.
 */
export function updateIndex(prev: number, result: GameResult): number {
  const p = safeIndex(prev);
  return p + indexGain(p, normalize(result));
}

/**
 * Index at the end of each of `days` simulated days with `gamesPerDay` counted games of score `avgScore`
 * (element 0 = after the first simulated day). Same formula as real play, so the "+30 days" demo jump
 * moves at the real pace: `simulateDays(current.index, 30, AVERAGE_TRAINING_SCORE)`.
 */
export function simulateDays(
  index: number,
  days: number,
  avgScore = AVERAGE_TRAINING_SCORE,
  gamesPerDay = TRAINING_PLAN_GAMES_PER_DAY,
): number[] {
  const n = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  const g = Number.isFinite(gamesPerDay) ? Math.max(0, Math.floor(gamesPerDay)) : 0;
  const out: number[] = [];
  let idx = safeIndex(index);
  for (let d = 0; d < n; d++) {
    for (let k = 0; k < g; k++) idx += indexGain(idx, avgScore);
    out.push(idx);
  }
  return out;
}
