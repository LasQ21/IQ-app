// Shared contracts. Fixed in Phase 1 — do not change signatures without the orchestrator.

export type Ability = 'memory' | 'attention' | 'logic' | 'speed';
export const ABILITIES: Ability[] = ['memory', 'attention', 'logic', 'speed'];

export type Lang = 'ja' | 'uk' | 'en';
export const LANGS: Lang[] = ['ja', 'uk', 'en'];

export type GameId = 'stroop' | 'corsi' | 'series' | 'gonogo' | 'flash41';

/**
 * Item source. A / B / A2 are fixed, equated assessment forms (baseline A → re-test B → next A2);
 * 'T' = generated training items (seeded by trainingSeedDay·10 + slot), never shown in assessments.
 */
export type FormId = 'A' | 'B' | 'A2' | 'T';

export type DeltaClass = 'better' | 'stable' | 'lower';

export interface AbilityChange {
  ability: Ability;
  before: number;
  after: number;
  delta: number;
  /** Error band of this ability (engine/errorBands): changes within ±band are noise. */
  band: number;
  /** 'stable' when |delta| ≤ band. */
  cls: DeltaClass;
}

export interface Economics {
  charge1: number; // share of trial cohort paying charge 1 (0–1)
  charge2: number;
  netLtv: number; // USD
  ltvCac: number; // ×
  romi: number; // (netLtv − CAC) / CAC, e.g. 0.09
  romiMonthUsd: number; // netLtv × 9 000 − $300k
}

export interface GameResult {
  gameId: GameId;
  ability: Ability;
  rawScore: number; // correct answers / reaction ms — as defined by each game
  level?: number; // adaptive games
  form: FormId; // parallel test form, or 'T' for generated training items
  playedAt: number; // Date.now() (+ demo offset)
  /** Extra per-game details the engine may use (accuracy 0–1, trials, mean RT…). */
  meta?: {
    correct?: number;
    total?: number;
    accuracy?: number; // 0–1
    meanRtMs?: number;
    maxLevel?: number;
    recalled?: number; // sequence games: cells recalled in order (incl. correct prefixes of failed trials)
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
  /** Index in `results` where the latest assessment (baseline or re-test) starts — the live profile uses results from here. */
  profileFrom?: number;
  baseline?: Profile; // first assessment
  current?: Profile; // live profile
  retest?: Profile; // result of the +30 day re-assessment (form B)
  lastRetestDay?: string; // 'YYYY-MM-DD' (demo-shifted) of the latest finished re-test
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
  /** Fast jury/demo mode (?jury=1 or ?fast=1): 10 s quiz tasks, no auto-start. */
  fastMode: boolean;
  /** Seed for generated training items (separate from assessment forms A/B/A2). */
  trainingSeedDay: number;
  /** Training games counted toward the index per demo-day (only the first TRAINING_PLAN_GAMES_PER_DAY count). */
  indexGamesByDay?: Record<string, number>;
}

export type Action =
  | { type: 'setLang'; lang: Lang }
  | { type: 'setStage'; stage: Stage }
  | { type: 'toggleJury'; on?: boolean }
  | { type: 'setFast'; on: boolean }
  /** Assessment finished (quiz or retest). `kind` decides baseline vs retest. */
  | { type: 'assessmentDone'; kind: 'baseline' | 'retest'; results: GameResult[] }
  /** One training game finished. Updates index, streak, plan, minutes. */
  | { type: 'trainingDone'; result: GameResult; durationMs: number }
  /** Jump the demo clock forward N days (simulated adherence). */
  | { type: 'demoAdvance'; days: number }
  | { type: 'reset' };
