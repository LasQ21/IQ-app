// Game timings shared by the game components and the simulated player (engine/sim.ts),
// so the Monte-Carlo error bands are computed with exactly the timing the person sees.

export interface FlashTiming {
  /** a cell stays lit this long */
  onMs: number;
  /** distance between two flashes */
  stepMs: number;
  /** pause before the first flash */
  leadMs: number;
}

/**
 * Corsi in the 15 s assessment: fast enough that span 6 fits (4 → 5 → 6 ≈ 14.8 s at human tapping speed),
 * so the memory score has no artificial ceiling. Training keeps the calmer pace.
 */
export const CORSI_TIMING: Record<'assessment' | 'training', FlashTiming> = {
  assessment: { onMs: 300, stepMs: 380, leadMs: 250 },
  training: { onMs: 380, stepMs: 480, leadMs: 350 },
};

/** Corsi start span: assessment starts one step higher so a 15 s run can reach span 6; training warms up at 3. */
export const CORSI_START_SPAN = { assessment: 4, training: 3 } as const;

export const FLASH_TIMING: FlashTiming = { onMs: 360, stepMs: 480, leadMs: 450 };
/** FlashGrid №41: level of the very first session (later sessions start at last final level − 1). */
export const FLASH_FIRST_LEVEL = 3;

/** Feedback pause after a grid trial (shared/useSeqSession). */
export const SEQ_FEEDBACK_MS = { ok: 550, bad: 800 } as const;

/** Series feedback pauses: short, so a 15 s run measures ≥ 4 items. */
export const SERIES_FEEDBACK_MS = { ok: 250, bad: 450 } as const;

/** Mirrors of the Stroop / Go-No-Go component constants (used by the simulator only). */
export const STROOP_FEEDBACK_MS = 220;
export const GNG_TIMING = { goWindowMs: 800, nogoMs: 700, fbOkMs: 250, fbBadMs: 450 } as const;

/** Training session sizes (mirrors of the component constants; a session also ends at TRAINING_MAX_MS). */
export const TRAINING_TRIALS = { stroop: 24, corsi: 10, series: 12, gonogo: 30, flash41: 10 } as const;

/** Session time actually played (ms since `startedAt`), never more than the session cap. */
export function playedMs(startedAt: number, capMs?: number): number {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = Math.max(0, Math.round(now - startedAt));
  return capMs && capMs > 0 ? Math.min(ms, capMs) : ms;
}
