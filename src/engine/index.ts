// PHASE-1 PLACEHOLDER — subagent B replaces. Public engine API lives here.
import type { GameResult } from '../state/types';
import { normalize } from './scoring';

export { normalize, buildProfile } from './scoring';
export { nextLevel } from './adaptive';
export { pickForm, planForToday } from './forms';
export { demoNow, dayKey, addDays } from './days';

/** EMA with a visible gain after every finished game. 0–1000. */
export function updateIndex(prev: number, result: GameResult): number {
  const target = normalize(result) * 10;
  return Math.min(1000, Math.round(prev + 0.2 * (target - prev)) + 5);
}
