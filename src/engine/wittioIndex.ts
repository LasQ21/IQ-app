import type { GameResult } from '../state/types';
import { indexFromMean, normalize } from './scoring';

export const INDEX_MAX = 1000;
/** Smallest visible gain after a finished game. */
export const MIN_GAIN = 3;
/** Extra gain at a perfect normalized score (gain = 3 … 15). */
export const PERF_GAIN = 12;
/** EMA weight toward the performance target, and the cap on that catch-up step. */
export const EMA_ALPHA = 0.1;
export const EMA_MAX_STEP = 15;

/**
 * Wittio Index after one finished training game. Never decreases, always ≥ +3 (until the 1000 cap).
 *
 * gain   = 3 + 12 · score/100                       (score = normalize(result); typical +8…+15)
 * ema    = 0.1 · (indexFromMean(score) − prev)      (EMA pull toward the level this game shows)
 * delta  = max(gain, min(ema, 15))                   → a strong game well above your index catches up faster
 */
export function updateIndex(prev: number, result: GameResult): number {
  const p = Number.isFinite(prev) ? Math.round(Math.max(0, Math.min(INDEX_MAX, prev))) : 0;
  const score = normalize(result);
  const gain = MIN_GAIN + (PERF_GAIN * score) / 100;
  const ema = EMA_ALPHA * (indexFromMean(score) - p);
  const delta = Math.max(gain, Math.min(ema, EMA_MAX_STEP));
  return Math.min(INDEX_MAX, Math.round(p + delta));
}
