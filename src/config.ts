/** Illustrative pricing taken from the case. Shown in JPY with an "illustrative" label. */
export const USD_JPY = 150;
export const TRIAL_USD = 1;
export const PRICE_USD_4W = 35;

export const TRIAL_JPY = TRIAL_USD * USD_JPY; // ¥150
export const PRICE_JPY_4W = PRICE_USD_4W * USD_JPY; // ¥5,250

/** Assessment task length (ms). 4 tasks × 15 s = 60 s quiz. */
export const ASSESSMENT_MS = 15_000;
/** Fast jury mode (?jury=1 or ?fast=1): 4 tasks × 10 s. */
export const JURY_FAST_TASK_MS = 10_000;
/** No auto-start: the person taps "Start" once they have read the instruction. */
export const ASSESSMENT_AUTOSTART_MS = 0;
/** Only the first N training games of a day count toward the Wittio Index. */
export const TRAINING_PLAN_GAMES_PER_DAY = 3;

/** Assessment task length for the current mode. */
export function assessmentMs(fastMode: boolean): number {
  return fastMode ? JURY_FAST_TASK_MS : ASSESSMENT_MS;
}

/** Unit economics of the monthly cohort (brief, deck slides 2/3/9/13). */
export const ECON = {
  trialsPerMonth: 9_000,
  adBudgetUsd: 300_000,
  cacUsd: 300_000 / 9_000, // $33.3
  trialUsd: 1,
  priceUsd: 35,
  netFactor: 0.9, // −10% refunds/chargebacks
  /** Share of the trial cohort still paying at charges 1…6 today (brief p. 7). */
  baseCharges: [0.38, 0.22, 0.14, 0.1, 0.08, 0.06],
  /** Charges 7–13: decay ×0.74 per charge (team estimate, sums to ≈15% as in the brief). */
  tailCharges: 7,
  tailStep: 0.74,
  /** Renewal at charge 1: opened the product after paying vs not (team estimate; 0.45·66%+0.55·15% = 38%). */
  renewOpened: 0.66,
  renewNotOpened: 0.15,
  /** Gates (slide 11): opened ≥ 60%, charge 1 ≥ 42%. */
  gateOpened: 0.6,
  gateCharge1: 0.42,
} as const;
/** Upper bound for one training session in the demo (ms). */
export const TRAINING_MAX_MS = 45_000;
/** Fast jury mode: the onboarding warm-up starts right away (the onboarding screen already explains it) and lasts 10 s, like a quiz task. */
export const FAST_WARMUP_MS = 10_000;
/** Days the demo button jumps forward. */
export const DEMO_JUMP_DAYS = 30;

export const STORAGE_KEY = 'cc146-wittio-v1';

export function formatJPY(n: number): string {
  return '¥' + n.toLocaleString('en-US'); // ¥5,250 — the format Japanese readers expect
}
