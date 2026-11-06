// PHASE-1 PLACEHOLDER — subagent B replaces.
/** 2-up / 1-down staircase. `streak` = correct answers in a row INCLUDING this one. Levels 2–9. */
export function nextLevel(level: number, correct: boolean, streak: number): number {
  if (!correct) return Math.max(2, level - 1);
  return streak >= 2 ? Math.min(9, level + 1) : level;
}
