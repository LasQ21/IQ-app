import type { Ability, AbilityChange, DeltaClass, Profile } from '../state/types';
import { ABILITIES } from '../state/types';
import { POP_NORMS, POP_NORMS_FAST, standardScore } from './scoring';

/**
 * Error band per ability = 1.645 × SD of the difference between two runs at the SAME skill
 * (90 %: a change inside ±band is indistinguishable from noise).
 *
 * Origin: Monte-Carlo, `npx vite-node scripts/sim-bands.ts` (Nov 2026, after the Corsi/Series/Go-No-Go
 * recalibration). 4000 simulated players × 7 skill levels (−1.5 … +1.5 SD, engine/sim.ts playerAt),
 * unchanged skill, baseline form A → re-test form B with independent trial noise and day state, scored by the
 * real `normalize`; band = RMS over the levels of 1.645 × SD(after − before), rounded up.
 * 15 s quiz: memory 38, attention 21, logic 32, speed 21 (Phase-0 guess was 20 / 21 / 37 / 31).
 * Memory is the noisiest: a 15 s Corsi run is only ≈ 3 sequences.
 */
export const ERROR_BAND: Record<Ability, number> = {
  memory: 38,
  attention: 21,
  logic: 32,
  speed: 21,
};

/** Same simulation for the 10 s fast jury mode (fewer trials → wider bands). */
export const ERROR_BAND_FAST: Record<Ability, number> = {
  memory: 43,
  attention: 27,
  logic: 42,
  speed: 33,
};

/** Band of one ability; `fast` = the assessments were taken in the 10 s fast mode (state.fastMode). */
export function errorBand(ability: Ability, fast = false): number {
  return (fast ? ERROR_BAND_FAST : ERROR_BAND)[ability] ?? 30;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const safe = (v: unknown, fb = 50) => (typeof v === 'number' && Number.isFinite(v) ? v : fb);

/** Per-ability change between two assessments, classified against the error band. */
export function classifyChange(before: Profile, after: Profile, fast = false): AbilityChange[] {
  return ABILITIES.map((ability) => {
    const b = Math.round(safe(before?.scores?.[ability]));
    const a = Math.round(safe(after?.scores?.[ability]));
    const delta = a - b;
    const band = errorBand(ability, fast);
    const cls: DeltaClass = Math.abs(delta) <= band ? 'stable' : delta > 0 ? 'better' : 'lower';
    return { ability, before: b, after: a, delta, band, cls };
  });
}

/** Display range of one score: "74 (55–90)". */
export function scoreRange(ability: Ability, score: number, fast = false): [number, number] {
  const band = errorBand(ability, fast);
  return [Math.round(clamp(score - band, 0, 100)), Math.round(clamp(score + band, 0, 100))];
}

/**
 * Selection margin for the weak zone. The candidate is the MINIMUM of three other noisy scores, which favours
 * noise; ×1.1 ≈ Bonferroni for the best of 3 comparisons (z 1.83 / 1.645). Monte-Carlo (sim.ts,
 * identical skill, A → B): the weak zone is kept in ≈ 91 % of re-tests (15 s) and ≈ 86 % (10 s fast mode),
 * vs 27–47 % if it simply followed the new lowest score.
 */
export const WEAK_ZONE_MARGIN = 1.1;

/**
 * Weak zone after a re-test. It only moves when the evidence is outside noise:
 * the new candidate must be lower than the previous weak zone (in the NEW profile) by more than the 90 % band
 * of the gap between two independent scores, √(band_prev² + band_new²) / √2, times WEAK_ZONE_MARGIN.
 * Otherwise the previous weak zone stays.
 */
export function weakestStable(prev: Profile, next: Profile, fast = false): Ability {
  const prevWeak = prev && ABILITIES.includes(prev.weakest) ? prev.weakest : undefined;
  const cand = next && ABILITIES.includes(next.weakest) ? next.weakest : 'memory';
  if (!prevWeak || prevWeak === cand) return cand;
  // Compared on standardised scores (the weak zone is picked on them): gap and bands in SD units.
  const norms = fast ? POP_NORMS_FAST : POP_NORMS;
  const gap = standardScore(prevWeak, safe(next.scores?.[prevWeak]), fast) - standardScore(cand, safe(next.scores?.[cand]), fast);
  const bp = errorBand(prevWeak, fast) / norms[prevWeak].sd;
  const bc = errorBand(cand, fast) / norms[cand].sd;
  const band = (WEAK_ZONE_MARGIN * Math.sqrt(bp ** 2 + bc ** 2)) / Math.SQRT2;
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
