import type { Ability, GameResult, Profile } from '../state/types';
import { ABILITIES } from '../state/types';

// ─────────────────────────────── helpers ───────────────────────────────

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Finite number or fallback (NaN / ±Infinity / non-numbers → fallback). */
function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Linear map of x from [x0 → 0] to [x1 → 1], clamped to 0–1 (works with x0 > x1 too). */
function lin(x: number, x0: number, x1: number): number {
  return clamp((x - x0) / (x1 - x0), 0, 1);
}

/** Chance-corrected accuracy: chance level → 0, perfect → 1. */
function aboveChance(acc: number, chance: number): number {
  return clamp((acc - chance) / (1 - chance), 0, 1);
}

/** Fewer trials than `full` scale the score down (a 1-trial session is not a measurement). */
function volume(n: number, full: number): number {
  return clamp(n / full, 0, 1);
}

function accuracyOf(r: GameResult): number {
  const m = r.meta ?? {};
  if (Number.isFinite(m.accuracy)) return clamp(num(m.accuracy), 0, 1);
  const total = num(m.total);
  return total > 0 ? clamp(num(m.correct) / total, 0, 1) : 0;
}

function totalOf(r: GameResult): number {
  return Math.max(0, num(r.meta?.total));
}

const finalize = (x: number) => Math.round(clamp(num(x), 0, 100));

/** Trials in a typical 15 s Corsi run (training `recalled` is scaled to this). */
const CORSI_RUN_TRIALS = 3;
/** Reference run length for per-run rates (the standard 15 s assessment task). */
const RUN_MS = 15_000;
/** Rates are never computed over less than the 10 s fast-mode task (a 2 s "run" is no measurement). */
const MIN_RATE_WINDOW_MS = 10_000;

// ─────────────────────────────── normalize ───────────────────────────────

/**
 * → 0–100 for the game's own ability. Deterministic, clamped, safe for garbage input.
 *
 * Formulas use duration-independent measures (accuracy, RT, span/level, answers per 15 s), so a 15 s
 * assessment, a 10 s fast-mode assessment and a 45 s training session land on the same scale.
 * Calibration: the average simulated player (engine/sim.ts AVERAGE_PLAYER) lands at ≈ 50 ± 10 on each.
 *
 * - stroop  (attention): 4 choices. 100 · aboveChance(acc, .25) · (0.35 + 0.65 · speed),
 *   speed = RT 1700 ms → 0 … 600 ms → 1. Volume: 6 answers. Average acc .93, RT 1200 → ≈ 58.
 * - series  (logic): net = correct − wrong/3 (guess-corrected; random tapping → 0), rate = net per 15 s of
 *   session time (`meta.durationMs`, else estimated from answers × mean RT). 100 · lin(rate, 1 → 0, 7 → 1).
 *   Training (all 12 tiers): lin(rate, 0.5, 4.7). Volume: 3 answers. Average ≈ 4.4 answers in 15 s → ≈ 51. Each answer = speed × accuracy × reaching the
 *   harder items, which is far less jumpy than accuracy over 3–4 items.
 * - gonogo  (speed): rawScore = mean RT of hits; acc = balanced accuracy (chance .5).
 *   100 · (0.15 + 0.85 · speed) · aboveChance(acc, .5)^0.3, speed = RT 650 → 0 … 250 → 1.
 *   A single commission error on 2–4 No-Go trials no longer halves the score; tapping everything → 0.
 *   Volume: 6 stimuli. No hits → 0. Average RT 420, acc .89 → ≈ 58.
 * - corsi   (memory): rawScore = longest correct span. With `meta.recalled` (cells recalled in order,
 *   incl. correct prefixes of failed trials): 100 · (0.5 · lin(span, 2 → 0, 6 → 1) + 0.5 · lin(recalled, 3 → 0, 12 → 1)).
 *   The fast assessment timing lets span 6 fit into 15 s, so there is no ceiling at ≈ 50 any more.
 *   Training runs (10 trials) count `recalled` per 3 trials, the size of a 15 s run; a shorter assessment
 *   (10 s fast mode, `meta.durationMs`) scales `recalled` up to 15 s.
 *   Without `recalled`: 100 · lin(span, 2, 6) · (0.75 + 0.25 · acc).
 * - flash41 (memory): effective level = (maxLevel + final level) / 2, only if ≥ 1 correct sequence
 *   (else the best is assumed one below the level played). 100 · lin(eff, 2 → 0, 8 → 1) · (0.75 + 0.25 · acc).
 *   Volume: 3 sequences. Typical training eff 5.5, acc .7 → ≈ 54.
 * - anything else: accuracy × 100.
 */
export function normalize(result: GameResult): number {
  if (!result || typeof result !== 'object') return 0;
  const m = result.meta ?? {};
  const acc = accuracyOf(result);
  const total = totalOf(result);
  const rt = num(m.meanRtMs, NaN);

  switch (result.gameId) {
    case 'stroop': {
      if (!total) return 0;
      const speed = Number.isFinite(rt) ? lin(rt, 1700, 600) : 0;
      return finalize(100 * aboveChance(acc, 0.25) * (0.35 + 0.65 * speed) * volume(total, 6));
    }
    case 'series': {
      if (!total) return 0;
      const correct = clamp(num(m.correct, acc * total), 0, total);
      const net = correct - (total - correct) / 3;
      const estimated = total * ((Number.isFinite(rt) ? rt : 9000) + 300);
      const elapsed = Math.max(MIN_RATE_WINDOW_MS, num(m.durationMs, 0) > 0 ? num(m.durationMs) : estimated);
      const rate = (net * RUN_MS) / elapsed;
      // Training runs go through all 12 tiers (the hard ones take 2–3× longer), so the same player has a lower
      // rate there; its range is shifted so the average player lands on the same ≈ 50.
      const [r0, r1] = m.mode === 'training' ? [0.5, 4.7] : [1, 7];
      return finalize(100 * lin(rate, r0, r1) * volume(total, 3));
    }
    case 'gonogo': {
      const hitRt = num(result.rawScore) > 0 ? num(result.rawScore) : rt;
      if (!total || !Number.isFinite(hitRt) || hitRt <= 0) return 0;
      const speed = lin(hitRt, 650, 250);
      return finalize(100 * (0.15 + 0.85 * speed) * aboveChance(acc, 0.5) ** 0.3 * volume(total, 6));
    }
    case 'corsi': {
      const span = clamp(num(result.rawScore), 0, 9);
      const recalled = num(m.recalled, NaN);
      if (Number.isFinite(recalled)) {
        if (!total) return 0;
        const dur = num(m.durationMs, 0);
        const perRun =
          m.mode === 'training'
            ? total > CORSI_RUN_TRIALS
              ? (recalled * CORSI_RUN_TRIALS) / total
              : recalled
            : dur > 0 && dur < RUN_MS
              ? (recalled * RUN_MS) / Math.max(dur, MIN_RATE_WINDOW_MS)
              : recalled;
        return finalize(100 * (0.5 * lin(span, 2, 6) + 0.5 * lin(perRun, 3, 12)));
      }
      if (span <= 0) return 0;
      return finalize(100 * lin(span, 2, 6) * (0.75 + 0.25 * acc));
    }
    case 'flash41': {
      if (!total) return 0;
      const correct = Math.max(0, num(m.correct, num(result.rawScore)));
      const maxLevel = clamp(num(m.maxLevel, num(result.level, 2)), 2, 9);
      const finalLevel = clamp(num(result.level, maxLevel), 2, 9);
      const eff = correct > 0 ? (maxLevel + finalLevel) / 2 : maxLevel - 1;
      return finalize(100 * lin(eff, 2, 8) * (0.75 + 0.25 * acc) * volume(total, 3));
    }
    default:
      return finalize(acc * 100);
  }
}

// ─────────────────────────────── profile ───────────────────────────────

/** Profile score (mean 0–100) → Wittio Index 0–1000. Baseline ≈ 350–650, leaves headroom for training. */
export function indexFromMean(meanScore: number): number {
  return Math.round(150 + clamp(num(meanScore, 50), 0, 100) * 7);
}

/** A result with zero trials carries no measurement (e.g. "Finish" tapped right away). */
function isMeasured(r: GameResult): boolean {
  return !(r.meta && typeof r.meta.total === 'number' && r.meta.total <= 0);
}

/**
 * Only assessment instruments measure abilities: training games (meta.mode 'training') and FlashGrid №41
 * (training-only, its own level scale) feed the Wittio Index and their own level, never the profile.
 * So the profile never mixes scales and does not move after one training game.
 */
export function isAssessmentResult(r: GameResult): boolean {
  return !!r && r.gameId !== 'flash41' && r.meta?.mode !== 'training';
}

/**
 * Per ability: mean of normalize() over the latest up to 3 measured ASSESSMENT results; missing → 50.
 * weakest = lowest score (ties → stable order memory, attention, logic, speed).
 */
export function buildProfile(results: GameResult[]): Profile {
  const list = Array.isArray(results) ? results.filter((r) => r && typeof r === 'object' && isAssessmentResult(r)) : [];
  const scores = {} as Record<Ability, number>;
  for (const a of ABILITIES) {
    const rs = list.filter((r) => r.ability === a && isMeasured(r)).slice(-3);
    scores[a] = rs.length ? Math.round(rs.reduce((s, r) => s + normalize(r), 0) / rs.length) : 50;
  }
  const weakest = ABILITIES.reduce((w, a) => (scores[a] < scores[w] ? a : w), ABILITIES[0]);
  const mean = ABILITIES.reduce((s, a) => s + scores[a], 0) / ABILITIES.length;
  return { scores, weakest, index: indexFromMean(mean) };
}
