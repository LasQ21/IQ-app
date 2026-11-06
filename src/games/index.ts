import type { GameId } from '../state/types';
import type { GameDef } from './types';
import { makePlaceholder } from './Placeholder';

// Subagent B replaces placeholders with real components from ./Stroop, ./CorsiGrid, ./Series, ./GoNoGo, ./FlashGrid41
export const GAMES: Record<GameId, GameDef> = {
  stroop: { id: 'stroop', ability: 'attention', component: makePlaceholder('stroop', 'attention'), inAssessment: true, adaptive: false },
  corsi: { id: 'corsi', ability: 'memory', component: makePlaceholder('corsi', 'memory'), inAssessment: true, adaptive: false },
  series: { id: 'series', ability: 'logic', component: makePlaceholder('series', 'logic'), inAssessment: true, adaptive: false },
  gonogo: { id: 'gonogo', ability: 'speed', component: makePlaceholder('gonogo', 'speed'), inAssessment: true, adaptive: false },
  flash41: { id: 'flash41', ability: 'memory', component: makePlaceholder('flash41', 'memory'), inAssessment: false, adaptive: true },
};

/** Order of the 60-second assessment (quiz and retest). */
export const ASSESSMENT_ORDER: GameId[] = ['stroop', 'corsi', 'series', 'gonogo'];

export type { GameProps, GameDef } from './types';
