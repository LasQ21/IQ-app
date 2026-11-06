import type { Ability, GameId, GameResult, Profile } from '../state/types';
import { ABILITIES } from '../state/types';

/** Alternate parallel forms per ability: none yet → A, last A → B, last B → A. */
export function pickForm(results: GameResult[], ability: Ability): 'A' | 'B' {
  const list = Array.isArray(results) ? results : [];
  for (let i = list.length - 1; i >= 0; i--) {
    const r = list[i];
    if (r && r.ability === ability) return r.form === 'A' ? 'B' : 'A';
  }
  return 'A';
}

/** Main training game per ability (memory has two: flash41 and corsi). */
export const GAME_FOR: Record<Ability, GameId> = {
  memory: 'flash41',
  attention: 'stroop',
  logic: 'series',
  speed: 'gonogo',
};

/**
 * Today's 3 exercises, ≥ 2 on the weakest ability.
 * - weakest memory → flash41, corsi + the game of the next-weakest ability;
 * - otherwise → weakest's game in rounds 1 and 2, then flash41 (the showcase adaptive game).
 */
export function planForToday(profile: Profile): GameId[] {
  const weakest: Ability = profile && ABILITIES.includes(profile.weakest) ? profile.weakest : 'memory';
  if (weakest === 'memory') {
    const scores = profile?.scores;
    const score = (a: Ability) => (scores && Number.isFinite(scores[a]) ? scores[a] : 50);
    const second = ABILITIES.filter((a) => a !== 'memory').reduce((w, a) => (score(a) < score(w) ? a : w));
    return ['flash41', 'corsi', GAME_FOR[second]];
  }
  const g = GAME_FOR[weakest];
  return [g, g, 'flash41'];
}
