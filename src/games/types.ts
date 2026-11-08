import type { ComponentType } from 'react';
import type { Ability, FormId, GameId, GameResult } from '../state/types';

export interface GameProps {
  mode: 'assessment' | 'training';
  /** Assessment form A / B / A2, or 'T' = generated training items (see `seed`). */
  form: FormId;
  /** Training only: seed of the generated items (`trainingSeed(seedDay, slot)` in games/banks). */
  seed?: number;
  /** Must be called exactly once when the game ends. */
  onDone: (result: GameResult) => void;
  /** Assessment: game ends after this many ms (ASSESSMENT_MS = 15 s). Training: optional cap. */
  durationMs?: number;
  /**
   * Adaptive games: level to start at (e.g. last final level − 1).
   * Series training: difficulty tier to start at (1 = easy warm-up; > 1 = second round on the weak zone).
   */
  startLevel?: number;
  /** Demo clock offset in days — add to Date.now() for `playedAt`. */
  demoDayOffset?: number;
}

export interface GameDef {
  id: GameId;
  ability: Ability;
  component: ComponentType<GameProps>;
  /** i18n keys: games.<id>.name / games.<id>.howto */
  inAssessment: boolean;
  adaptive: boolean;
}
