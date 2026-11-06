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

// ─────────────────────────────── normalize ───────────────────────────────

/**
 * → 0–100 for the game's own ability. Deterministic, clamped, safe for garbage input.
 *
 * Every formula uses duration-independent measures (accuracy, RT, span/level), so a 15 s
 * assessment and a 45 s training session land on the same scale. Calibration targets
 * (typical adult, 15 s assessment) are noted per game and land in ≈ 40–75.
 *
 * - stroop  (attention): 4 choices. 100 · aboveChance(acc, .25) · (0.35 + 0.65 · speed),
 *   speed = RT 1700 ms → 0 … 600 ms → 1. Volume: 6 answers. Typical acc .95, RT 1100 → ≈ 66.
 * - series  (logic): 4 choices. 100 · aboveChance(acc, .25) · (0.3 + 0.7 · speed),
 *   speed = 9000 ms/item → 0 … 1500 → 1. Volume: 2 answers. Typical 3/4 at 4 s → ≈ 51.
 * - gonogo  (speed): rawScore = mean RT of hits; acc = balanced accuracy (chance .5).
 *   100 · (0.15 + 0.85 · speed) · aboveChance(acc, .5)^0.7, speed = RT 700 → 0 … 250 → 1.
 *   Volume: 8 stimuli. No hits → 0. Typical RT 420, acc .9 → ≈ 57.
 * - corsi   (memory): rawScore = longest correct span. 100 · lin(span, 2 → 0, 8 → 1) · (0.75 + 0.25 · acc).
 *   Typical span 5, acc .75 → ≈ 47; span 6 → ≈ 63.
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
      const speed = Number.isFinite(rt) ? lin(rt, 9000, 1500) : 0;
      return finalize(100 * aboveChance(acc, 0.25) * (0.3 + 0.7 * speed) * volume(total, 2));
    }
    case 'gonogo': {
      const hitRt = num(result.rawScore) > 0 ? num(result.rawScore) : rt;
      if (!total || !Number.isFinite(hitRt) || hitRt <= 0) return 0;
      const speed = lin(hitRt, 700, 250);
      return finalize(100 * (0.15 + 0.85 * speed) * aboveChance(acc, 0.5) ** 0.7 * volume(total, 8));
    }
    case 'corsi': {
      const span = clamp(num(result.rawScore), 0, 9);
      if (span <= 0) return 0;
      return finalize(100 * lin(span, 2, 8) * (0.75 + 0.25 * acc));
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
 * Per ability: mean of normalize() over the latest up to 3 measured results; missing → 50.
 * weakest = lowest score (ties → stable order memory, attention, logic, speed).
 */
export function buildProfile(results: GameResult[]): Profile {
  const list = Array.isArray(results) ? results.filter((r) => r && typeof r === 'object') : [];
  const scores = {} as Record<Ability, number>;
  for (const a of ABILITIES) {
    const rs = list.filter((r) => r.ability === a && isMeasured(r)).slice(-3);
    scores[a] = rs.length ? Math.round(rs.reduce((s, r) => s + normalize(r), 0) / rs.length) : 50;
  }
  const weakest = ABILITIES.reduce((w, a) => (scores[a] < scores[w] ? a : w), ABILITIES[0]);
  const mean = ABILITIES.reduce((s, a) => s + scores[a], 0) / ABILITIES.length;
  return { scores, weakest, index: indexFromMean(mean) };
}
