import type { Ability, FormId, GameId, GameResult, PlanItem, Profile } from '../state/types';
import { ABILITIES } from '../state/types';
import { dayKey, dayNumber } from './days';

// ─────────────────────────────── forms ───────────────────────────────

/** Assessment forms in order of use: baseline A → 1st re-test B → 2nd re-test A2 → (B, A2, A …). */
const ASSESSMENT_CYCLE = ['A', 'B', 'A2'] as const;

/** Form of the n-th assessment (0 = baseline). Training never uses these forms. */
export function assessmentForm(n: number): 'A' | 'B' | 'A2' {
  const i = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  return ASSESSMENT_CYCLE[i % ASSESSMENT_CYCLE.length];
}

/** Assessments already taken = the most assessment results any single ability has. */
export function assessmentsTaken(results: GameResult[]): number {
  const list = Array.isArray(results) ? results : [];
  const counts: Record<string, number> = {};
  for (const r of list) {
    if (r && r.meta?.mode === 'assessment' && r.gameId !== 'flash41') counts[r.ability] = (counts[r.ability] ?? 0) + 1;
  }
  return Math.max(0, ...Object.values(counts));
}

/** Form for the next assessment given the results so far (baseline → A, first re-test → B, then A2). */
export function nextAssessmentForm(results: GameResult[]): 'A' | 'B' | 'A2' {
  return assessmentForm(assessmentsTaken(results));
}

/** Training always uses generated items ('T'), seeded by `trainingSeed(trainingSeedDay, slot)`. */
export const TRAINING_FORM: FormId = 'T';

/** Training seed-day for a demo-day key ('YYYY-MM-DD'): whole days since 1970-01-01. */
export function trainingSeedDayOf(day: string): number {
  return dayNumber(day);
}

/** Slot of the next training game on `day` = training games already played that day (0, 1, 2 …). */
export function trainingSlot(results: GameResult[], day: string): number {
  const list = Array.isArray(results) ? results : [];
  return list.filter((r) => r && r.meta?.mode === 'training' && Number.isFinite(r.playedAt) && dayKey(r.playedAt) === day).length;
}

// ─────────────────────────────── plan ───────────────────────────────

/** Main training game per ability (memory has two: flash41 and corsi). */
export const GAME_FOR: Record<Ability, GameId> = {
  memory: 'flash41',
  attention: 'stroop',
  logic: 'series',
  speed: 'gonogo',
};

/** Series tier the second weak-zone round starts at (skips the 4 warm-up items). */
export const SECOND_ROUND_SERIES_TIER = 5;

const mod3 = (n: number) => ((Math.floor(Number.isFinite(n) ? n : 0) % 3) + 3) % 3;

/**
 * Today's 3 exercises, 2 of them on the weak zone, never two identical cards in a row, varying by day.
 * - weak ≠ memory → [weak game, rotation[day % 3], weak game · second round]
 *   rotation = the games of the other three abilities (flash41 for memory);
 * - weak = memory → [flash41, rotation[day % 3], corsi], rotation = stroop / series / gonogo.
 * `day` = any whole day number (e.g. `trainingSeedDayOf(today)`).
 */
export function planItemsForToday(profile: Profile, day = 0): PlanItem[] {
  const weakest: Ability = profile && ABILITIES.includes(profile.weakest) ? profile.weakest : 'memory';
  if (weakest === 'memory') {
    const rotation: GameId[] = ['stroop', 'series', 'gonogo'];
    return [
      { gameId: 'flash41', done: false },
      { gameId: rotation[mod3(day)], done: false },
      { gameId: 'corsi', done: false },
    ];
  }
  const g = GAME_FOR[weakest];
  const rotation = ABILITIES.filter((a) => a !== weakest).map((a) => GAME_FOR[a]);
  const second: PlanItem = { gameId: g, done: false, variant: 'second' };
  if (g === 'series') second.startLevel = SECOND_ROUND_SERIES_TIER;
  return [{ gameId: g, done: false }, { gameId: rotation[mod3(day)], done: false }, second];
}

/** Game ids of today's plan (see planItemsForToday). */
export function planForToday(profile: Profile, day = 0): GameId[] {
  return planItemsForToday(profile, day).map((it) => it.gameId);
}
