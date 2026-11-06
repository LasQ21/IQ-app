import type { ComponentType } from 'react';
import type { Ability, GameId, GameResult } from '../state/types';

export interface GameProps {
  mode: 'assessment' | 'training';
  form: 'A' | 'B';
  /** Must be called exactly once when the game ends. */
  onDone: (result: GameResult) => void;
  /** Assessment: game ends after this many ms (ASSESSMENT_MS = 15 s). Training: optional cap. */
  durationMs?: number;
  /** Adaptive games: level to start at (e.g. last reached level). */
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
