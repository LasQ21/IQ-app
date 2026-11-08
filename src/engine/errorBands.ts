import type { Ability, AbilityChange, DeltaClass, Profile } from '../state/types';
import { ABILITIES } from '../state/types';

/**
 * Error band per ability = 1.645 × SD of the difference between two runs at the SAME skill
 * (90% one-sided: a change inside ±band is indistinguishable from noise).
 *
 * Phase-0 starting values from the council's simulation of the 15 s tasks
 * (SD of the difference: memory 12, attention 13, logic 23, speed 19).
 * S1 re-derives them by Monte-Carlo after recalibrating Corsi/Series and writes the final numbers here.
 */
export const ERROR_BAND: Record<Ability, number> = {
  memory: 20,
  attention: 21,
  logic: 37,
  speed: 31,
};

export function errorBand(ability: Ability): number {
  return ERROR_BAND[ability] ?? 30;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const safe = (v: unknown, fb = 50) => (typeof v === 'number' && Number.isFinite(v) ? v : fb);

/** Per-ability change between two assessments, classified against the error band. */
export function classifyChange(before: Profile, after: Profile): AbilityChange[] {
  return ABILITIES.map((ability) => {
    const b = Math.round(safe(before?.scores?.[ability]));
    const a = Math.round(safe(after?.scores?.[ability]));
    const delta = a - b;
    const band = errorBand(ability);
    const cls: DeltaClass = Math.abs(delta) <= band ? 'stable' : delta > 0 ? 'better' : 'lower';
    return { ability, before: b, after: a, delta, band, cls };
  });
}

/** Display range of one score: "74 (55–90)". */
export function scoreRange(ability: Ability, score: number): [number, number] {
  const band = errorBand(ability);
  return [Math.round(clamp(score - band, 0, 100)), Math.round(clamp(score + band, 0, 100))];
}

/**
 * Weak zone after a re-test. It only moves when the evidence is outside noise:
 * the new candidate must beat the previous weak zone by more than the band of the difference
 * (√(band_prev² + band_new²) / √2 ≈ the combined 90% band of two independent scores' gap).
 * Otherwise the previous weak zone stays.
 */
export function weakestStable(prev: Profile, next: Profile): Ability {
  const prevWeak = prev && ABILITIES.includes(prev.weakest) ? prev.weakest : undefined;
  const cand = next && ABILITIES.includes(next.weakest) ? next.weakest : 'memory';
  if (!prevWeak || prevWeak === cand) return cand;
  const gap = safe(next.scores?.[prevWeak]) - safe(next.scores?.[cand]);
  const band = Math.sqrt(errorBand(prevWeak) ** 2 + errorBand(cand) ** 2) / Math.SQRT2;
  return gap > band ? cand : prevWeak;
}

/**
 * LABELLED illustration ("typical picture after N days of regular practice — not your result").
 * +3…+12 per ability, the most on the weak zone; deterministic. Never used for the real measurement.
 */
export function illustrativePractice(profile: Profile, days: number): Profile {
  const k = clamp(safe(days, 30) / 30, 0, 1);
  const bump: Record<Ability, number> = { memory: 5, attention: 4, logic: 6, speed: 3 };
  const scores = {} as Record<Ability, number>;
  for (const a of ABILITIES) {
    const add = a === profile.weakest ? 12 : bump[a];
    scores[a] = Math.round(clamp(safe(profile.scores?.[a]) + add * k, 0, 100));
  }
  return { scores, weakest: profile.weakest, index: profile.index };
}
