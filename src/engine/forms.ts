// PHASE-1 PLACEHOLDER — subagent B replaces.
import type { Ability, GameId, GameResult, Profile } from '../state/types';

/** Alternate parallel forms per ability: first A, then B, then A… */
export function pickForm(results: GameResult[], ability: Ability): 'A' | 'B' {
  const last = [...results].reverse().find((r) => r.ability === ability);
  return last?.form === 'A' ? 'B' : 'A';
}

/** 3 exercises, 2 on the weakest ability. */
export function planForToday(profile: Profile): GameId[] {
  const byAbility: Record<Ability, GameId> = {
    memory: 'flash41',
    attention: 'stroop',
    logic: 'series',
    speed: 'gonogo',
  };
  const w = profile.weakest;
  if (w === 'memory') return ['flash41', 'corsi', 'stroop'];
  return [byAbility[w], 'flash41', byAbility[w]];
}
