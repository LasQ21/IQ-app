// PHASE-1 PLACEHOLDER — subagent B replaces with the real implementation + tests.
import type { Ability, GameResult, Profile } from '../state/types';
import { ABILITIES } from '../state/types';

/** → 0–100 for the game's own ability. */
export function normalize(result: GameResult): number {
  const acc = result.meta?.accuracy ?? 0.5;
  return Math.max(0, Math.min(100, Math.round(acc * 100)));
}

/** Mean of the latest results per ability. */
export function buildProfile(results: GameResult[]): Profile {
  const scores = {} as Record<Ability, number>;
  for (const a of ABILITIES) {
    const rs = results.filter((r) => r.ability === a).slice(-2);
    scores[a] = rs.length ? Math.round(rs.reduce((s, r) => s + normalize(r), 0) / rs.length) : 50;
  }
  const weakest = ABILITIES.reduce((w, a) => (scores[a] < scores[w] ? a : w), ABILITIES[0]);
  const mean = ABILITIES.reduce((s, a) => s + scores[a], 0) / ABILITIES.length;
  return { scores, weakest, index: Math.round(mean * 10) };
}
