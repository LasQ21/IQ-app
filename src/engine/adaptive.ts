export const MIN_LEVEL = 2;
export const MAX_LEVEL = 9;

/**
 * 2-up / 1-down staircase, levels 2–9.
 * `streak` = correct answers in a row INCLUDING this one. A mistake → level − 1; every second
 * consecutive correct answer (streak 2, 4, 6…) → level + 1, so callers may reset the streak after a
 * level change or not — both behave as 2-up. Garbage input is clamped / treated as level 2.
 */
export function nextLevel(level: number, correct: boolean, streak: number): number {
  const lv = Number.isFinite(level) ? Math.round(level) : MIN_LEVEL;
  const cur = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, lv));
  if (!correct) return Math.max(MIN_LEVEL, cur - 1);
  const s = Number.isFinite(streak) ? Math.floor(streak) : 0;
  return s >= 2 && s % 2 === 0 ? Math.min(MAX_LEVEL, cur + 1) : cur;
}
