import type { GameId } from '../state/types';
import type { GameDef } from './types';
import { Stroop } from './Stroop';
import { CorsiGrid } from './CorsiGrid';
import { Series } from './Series';
import { GoNoGo } from './GoNoGo';
import { FlashGrid41 } from './FlashGrid41';

export const GAMES: Record<GameId, GameDef> = {
  stroop: { id: 'stroop', ability: 'attention', component: Stroop, inAssessment: true, adaptive: false },
  corsi: { id: 'corsi', ability: 'memory', component: CorsiGrid, inAssessment: true, adaptive: false },
  series: { id: 'series', ability: 'logic', component: Series, inAssessment: true, adaptive: false },
  gonogo: { id: 'gonogo', ability: 'speed', component: GoNoGo, inAssessment: true, adaptive: false },
  flash41: { id: 'flash41', ability: 'memory', component: FlashGrid41, inAssessment: false, adaptive: true },
};

/** Order of the 60-second assessment (quiz and retest). */
export const ASSESSMENT_ORDER: GameId[] = ['stroop', 'corsi', 'series', 'gonogo'];

export type { GameProps, GameDef } from './types';
