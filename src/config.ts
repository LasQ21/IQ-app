/** Illustrative pricing taken from the case. Shown in JPY with an "illustrative" label. */
export const USD_JPY = 150;
export const TRIAL_USD = 1;
export const PRICE_USD_4W = 35;

export const TRIAL_JPY = TRIAL_USD * USD_JPY; // ¥150
export const PRICE_JPY_4W = PRICE_USD_4W * USD_JPY; // ¥5 250

/** Assessment task length (ms). 4 tasks × 15 s = 60 s quiz. */
export const ASSESSMENT_MS = 15_000;
/** Upper bound for one training session in the demo (ms). */
export const TRAINING_MAX_MS = 45_000;
/** Days the demo button jumps forward. */
export const DEMO_JUMP_DAYS = 30;

export const STORAGE_KEY = 'cc146-wittio-v1';

export function formatJPY(n: number): string {
  return '¥' + n.toLocaleString('en-US').replace(/,/g, ' ');
}
