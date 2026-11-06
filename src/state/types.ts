// Shared contracts. Fixed in Phase 1 — do not change signatures without the orchestrator.

export type Ability = 'memory' | 'attention' | 'logic' | 'speed';
export const ABILITIES: Ability[] = ['memory', 'attention', 'logic', 'speed'];

export type Lang = 'ja' | 'uk' | 'en';
export const LANGS: Lang[] = ['ja', 'uk', 'en'];

export type GameId = 'stroop' | 'corsi' | 'series' | 'gonogo' | 'flash41';

export interface GameResult {
  gameId: GameId;
  ability: Ability;
  rawScore: number; // correct answers / reaction ms — as defined by each game
  level?: number; // adaptive games
  form: 'A' | 'B'; // parallel test form
  playedAt: number; // Date.now() (+ demo offset)
  /** Extra per-game details the engine may use (accuracy 0–1, trials, mean RT…). */
  meta?: {
    correct?: number;
    total?: number;
    accuracy?: number; // 0–1
    meanRtMs?: number;
    maxLevel?: number;
    mode?: 'assessment' | 'training';
  };
}

export interface Profile {
  scores: Record<Ability, number>; // 0–100
  weakest: Ability;
  index: number; // Wittio Index 0–1000
}

export type Stage = 'landing' | 'quiz' | 'teaser' | 'paywall' | 'onboarding' | 'home';

export interface PlanItem {
  gameId: GameId;
  done: boolean;
}

export interface TodayPlan {
  day: string; // 'YYYY-MM-DD' (demo-shifted)
  items: PlanItem[];
}

export interface IndexPoint {
  day: string; // 'YYYY-MM-DD'
  index: number;
}

export interface AppState {
  lang: Lang;
  stage: Stage;
  results: GameResult[];
  baseline?: Profile; // first assessment
  current?: Profile; // live profile
  retest?: Profile; // result of the +30 day re-assessment (form B)
  streakDays: number;
  lastActiveDay?: string; // 'YYYY-MM-DD'
  demoDayOffset: number; // for the "simulate +30 days" button
  juryMode: boolean;
  plan?: TodayPlan;
  indexHistory: IndexPoint[];
  /** Index delta produced by the last finished training game (for the "+12" animation). */
  lastIndexDelta?: number;
  /** Minutes trained per demo-day, for the weekly report. */
  minutesByDay: Record<string, number>;
}

export type Action =
  | { type: 'setLang'; lang: Lang }
  | { type: 'setStage'; stage: Stage }
  | { type: 'toggleJury'; on?: boolean }
  /** Assessment finished (quiz or retest). `kind` decides baseline vs retest. */
  | { type: 'assessmentDone'; kind: 'baseline' | 'retest'; results: GameResult[] }
  /** One training game finished. Updates index, streak, plan, minutes. */
  | { type: 'trainingDone'; result: GameResult; durationMs: number }
  /** Jump the demo clock forward N days (simulated adherence). */
  | { type: 'demoAdvance'; days: number }
  | { type: 'reset' };
