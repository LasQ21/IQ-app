// Simulated player: replays the real games (banks, timings, adaptation rules, session clock) against a
// parametric person, and returns GameResults exactly as the components would. Used by the tests and by
// `scripts/sim-bands.ts` (Monte-Carlo error bands). Pure TS, deterministic for a given PRNG.
//
// Player model (per game; "average" values are typical adult values on a phone, in brackets):
// - Stroop:   RT per answer lognormal(σ .25) around `stroopRtMs` [1200 ms], P(correct) = `stroopAcc` [.93].
// - Corsi:    P(sequence of length L recalled) = 1 / (1 + e^((L − span)/0.55)), `span` [4.2: 380 ms per
//             step on a 3×3 grid is harder than the classic 1 s/block Corsi, where adults reach ≈ 5–6];
//             a failed trial has a uniform correct prefix; one tap every `tapMs` [400–600 ms] (human timing).
// - Series:   P(correct) = .25 + .75·σ(1.3·(logic − b_tier)), `logic` θ [0]; RT = `seriesRtMs` [2400 ms] ×
//             tier factor × lognormal(σ .3). Easy warm-up tiers ≈ 2.4–3 s, later tiers 4–7 s.
// - Go/No-Go: Go RT normal(`gngRtMs` [420], `gngRtSdMs` [70]); omission `omission` [.02]; a No-Go is tapped
//             with P = `commission` [.2]; a Go slower than the 800 ms window is a miss.
// - FlashGrid (training only): like Corsi on 4×4 with `flashSpan` [5.5], 2-up/1-down staircase.
// Every run also draws a "day state" RT factor e^N(0, .05), so two runs at the same skill differ a bit more
// than pure trial noise (tiredness, phone in the other hand…).

import { ASSESSMENT_MS, TRAINING_MAX_MS } from '../config';
import { corsiBank, flashBank, gonogoBank, mulberry32, seriesBank } from '../games/banks';
import { CORSI_MAX, CORSI_MIN, FLASH_MAX, FLASH_MIN } from '../games/banks';
import type { Ability, FormId, GameId, GameResult } from '../state/types';
import { nextLevel } from './adaptive';
import {
  CORSI_START_SPAN,
  CORSI_TIMING,
  FLASH_FIRST_LEVEL,
  FLASH_TIMING,
  GNG_TIMING,
  SEQ_FEEDBACK_MS,
  SERIES_FEEDBACK_MS,
  STROOP_FEEDBACK_MS,
  TRAINING_TRIALS,
} from './timing';

export interface PlayerSkill {
  stroopRtMs: number;
  stroopAcc: number;
  span: number;
  flashSpan: number;
  tapMs: [number, number];
  logic: number;
  seriesRtMs: number;
  gngRtMs: number;
  gngRtSdMs: number;
  omission: number;
  commission: number;
}

export const AVERAGE_PLAYER: PlayerSkill = {
  stroopRtMs: 1200,
  stroopAcc: 0.93,
  span: 4.2,
  flashSpan: 5.5,
  tapMs: [400, 600],
  logic: 0,
  seriesRtMs: 2400,
  gngRtMs: 420,
  gngRtSdMs: 70,
  omission: 0.02,
  commission: 0.2,
};

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/**
 * A player `z` standard deviations from the average on every ability (z ∈ −2…+2).
 * Pass a per-ability record to make one ability weaker / stronger than the others.
 */
export function playerAt(z: number | Partial<Record<Ability, number>>): PlayerSkill {
  const zz = (a: Ability) => clamp(typeof z === 'number' ? z : (z[a] ?? 0), -3, 3);
  const A = AVERAGE_PLAYER;
  const fast = (a: Ability) => Math.exp(-0.18 * zz(a)); // +1 SD → ≈ 16 % faster
  return {
    stroopRtMs: A.stroopRtMs * fast('attention'),
    stroopAcc: clamp(A.stroopAcc + 0.03 * zz('attention'), 0.5, 0.995),
    span: A.span + 0.9 * zz('memory'),
    flashSpan: A.flashSpan + 0.9 * zz('memory'),
    tapMs: A.tapMs,
    logic: A.logic + zz('logic'),
    seriesRtMs: A.seriesRtMs * fast('logic'),
    gngRtMs: A.gngRtMs * fast('speed'),
    gngRtSdMs: A.gngRtSdMs,
    omission: clamp(A.omission * Math.exp(-0.5 * zz('speed')), 0, 0.3),
    commission: clamp(A.commission * Math.exp(-0.4 * zz('speed')), 0.01, 0.6),
  };
}

/** Item difficulty b per Series tier (1–12) and RT factor relative to the easiest tier. */
const SERIES_B = [-2.5, -2.2, -2.4, -1.6, -0.8, -0.6, -0.7, -0.2, 0.3, 0.5, 0.8, 1.0];
const SERIES_RT = [1, 1.05, 1, 1.25, 1.8, 1.8, 1.6, 2.0, 2.3, 2.5, 2.7, 3.0];

type Rnd = () => number;

function gauss(rnd: Rnd): number {
  const u = Math.max(1e-12, rnd());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

interface Run {
  mode: 'assessment' | 'training';
  durationMs: number;
  rnd: Rnd;
  /** day-state RT factor */
  day: number;
}

function result(gameId: GameId, ability: Ability, rawScore: number, form: FormId, run: Run, meta: GameResult['meta'], level?: number): GameResult {
  return { gameId, ability, rawScore, form, playedAt: 0, level, meta: { ...meta, mode: run.mode } };
}

function stroop(p: PlayerSkill, form: FormId, run: Run): GameResult {
  // Items do not change the difficulty (every item is incongruent, colour-balanced): only the timing matters.
  let t = 0;
  let correct = 0;
  let total = 0;
  const rts: number[] = [];
  for (;;) {
    const rt = p.stroopRtMs * run.day * Math.exp(0.25 * gauss(run.rnd) - 0.03);
    if (t + rt > run.durationMs) break;
    t += rt;
    total += 1;
    if (run.rnd() < p.stroopAcc) {
      correct += 1;
      rts.push(rt);
    }
    if (run.mode === 'training' && total >= TRAINING_TRIALS.stroop) break;
    t += STROOP_FEEDBACK_MS;
  }
  return result('stroop', 'attention', correct, form, run, {
    correct,
    total,
    accuracy: total ? correct / total : 0,
    meanRtMs: Math.round(mean(rts)),
  });
}

/** Shared grid loop (Corsi rule or 2-up/1-down staircase), mirroring games/shared/useSeqSession. */
function grid(
  p: PlayerSkill,
  run: Run,
  o: {
    startLen: number;
    span: number;
    timing: { stepMs: number; leadMs: number };
    trials: number;
    lens: (seqLen: number) => boolean;
    advance: (len: number, ok: boolean) => number;
  },
) {
  let t = 0;
  let len = o.startLen;
  const st = { correct: 0, total: 0, bestLen: 0, recalled: 0, maxLen: len, finalLen: len, taps: [] as number[] };
  for (;;) {
    if (!o.lens(len)) break;
    st.maxLen = Math.max(st.maxLen, len);
    t += o.timing.leadMs + len * o.timing.stepMs;
    if (t >= run.durationMs) break;
    const ok = run.rnd() < 1 / (1 + Math.exp((len - o.span) / 0.55));
    const prefix = ok ? len : Math.floor(run.rnd() * len);
    const taps = ok ? len : prefix + 1;
    let done = true;
    for (let i = 0; i < taps; i++) {
      const gap = (p.tapMs[0] + (p.tapMs[1] - p.tapMs[0]) * run.rnd()) * run.day;
      t += gap;
      st.taps.push(gap);
      if (t > run.durationMs) {
        done = false;
        break;
      }
    }
    if (!done) break;
    st.total += 1;
    st.recalled += prefix;
    if (ok) {
      st.correct += 1;
      st.bestLen = Math.max(st.bestLen, len);
    }
    len = o.advance(len, ok);
    st.finalLen = len;
    if (run.mode === 'training' && st.total >= o.trials) break;
    t += ok ? SEQ_FEEDBACK_MS.ok : SEQ_FEEDBACK_MS.bad;
    if (t >= run.durationMs) break;
  }
  return { ...st, t };
}

/** Session time as the component reports it: assessments always run into the clock. */
const played = (run: Run, t: number) => (run.mode === 'assessment' ? run.durationMs : Math.round(Math.min(t, run.durationMs)));

function corsi(p: PlayerSkill, form: FormId, seed: number, run: Run): GameResult {
  const bank = corsiBank(form, seed);
  let missedOnce = false;
  const st = grid(p, run, {
    startLen: CORSI_START_SPAN[run.mode],
    span: p.span,
    timing: CORSI_TIMING[run.mode],
    trials: TRAINING_TRIALS.corsi,
    lens: (l) => Array.isArray(bank[l]),
    advance: (span, ok) => {
      if (ok) {
        missedOnce = false;
        return Math.min(CORSI_MAX, span + 1);
      }
      if (!missedOnce) {
        missedOnce = true;
        return span;
      }
      missedOnce = false;
      return Math.max(CORSI_MIN, span - 1);
    },
  });
  return result('corsi', 'memory', st.bestLen, form, run, {
    correct: st.correct,
    total: st.total,
    accuracy: st.total ? st.correct / st.total : 0,
    meanRtMs: Math.round(mean(st.taps)),
    recalled: st.recalled,
    durationMs: played(run, st.t),
  });
}

function flash41(p: PlayerSkill, form: FormId, seed: number, run: Run, startLevel = FLASH_FIRST_LEVEL): GameResult {
  const bank = flashBank(form, seed);
  let streak = 0;
  const st = grid(p, run, {
    startLen: clamp(startLevel, FLASH_MIN, FLASH_MAX),
    span: p.flashSpan,
    timing: FLASH_TIMING,
    trials: TRAINING_TRIALS.flash41,
    lens: (l) => Array.isArray(bank[l]),
    advance: (level, ok) => {
      streak = ok ? streak + 1 : 0;
      const next = nextLevel(level, ok, streak);
      if (next !== level) streak = 0;
      return next;
    },
  });
  return result(
    'flash41',
    'memory',
    st.correct,
    form,
    run,
    {
      correct: st.correct,
      total: st.total,
      accuracy: st.total ? st.correct / st.total : 0,
      meanRtMs: Math.round(mean(st.taps)),
      maxLevel: st.maxLen,
    },
    st.finalLen,
  );
}

function series(p: PlayerSkill, form: FormId, seed: number, run: Run, startTier = 1): GameResult {
  const bank = seriesBank(form, seed, startTier);
  let t = 0;
  let correct = 0;
  let total = 0;
  const rts: number[] = [];
  for (;;) {
    const item = bank[total % bank.length];
    const k = item.tier - 1;
    const rt = p.seriesRtMs * SERIES_RT[k] * run.day * Math.exp(0.3 * gauss(run.rnd) - 0.045);
    if (t + rt > run.durationMs) break;
    t += rt;
    total += 1;
    rts.push(rt);
    const ok = run.rnd() < 0.25 + 0.75 * sigmoid(1.3 * (p.logic - SERIES_B[k]));
    if (ok) correct += 1;
    if (total >= bank.length) break;
    t += ok ? SERIES_FEEDBACK_MS.ok : SERIES_FEEDBACK_MS.bad;
  }
  return result('series', 'logic', correct, form, run, {
    correct,
    total,
    accuracy: total ? correct / total : 0,
    meanRtMs: Math.round(mean(rts)),
    durationMs: played(run, t),
  });
}

function gonogo(p: PlayerSkill, form: FormId, seed: number, run: Run): GameResult {
  const bank = gonogoBank(form, seed);
  let t = 0;
  let hits = 0;
  let misses = 0;
  let fa = 0;
  let cr = 0;
  const rts: number[] = [];
  for (let i = 0; i < bank.length; i++) {
    const it = bank[i];
    t += it.isiMs;
    if (t >= run.durationMs) break;
    let ok: boolean;
    if (it.kind === 'go') {
      const rt = Math.max(150, (p.gngRtMs + p.gngRtSdMs * gauss(run.rnd)) * run.day);
      if (run.rnd() < p.omission || rt > GNG_TIMING.goWindowMs) {
        t += GNG_TIMING.goWindowMs;
        if (t > run.durationMs) break;
        misses += 1;
        ok = false;
      } else {
        t += rt;
        if (t > run.durationMs) break;
        hits += 1;
        rts.push(rt);
        ok = true;
      }
    } else if (run.rnd() < p.commission) {
      t += Math.max(150, (p.gngRtMs + p.gngRtSdMs * gauss(run.rnd)) * run.day);
      if (t > run.durationMs) break;
      fa += 1;
      ok = false;
    } else {
      t += GNG_TIMING.nogoMs;
      if (t > run.durationMs) break;
      cr += 1;
      ok = true;
    }
    if (run.mode === 'training' && hits + misses + fa + cr >= TRAINING_TRIALS.gonogo) break;
    t += ok ? GNG_TIMING.fbOkMs : GNG_TIMING.fbBadMs;
  }
  const goN = hits + misses;
  const nogoN = fa + cr;
  const total = goN + nogoN;
  const meanRt = Math.round(mean(rts));
  return result('gonogo', 'speed', meanRt, form, run, {
    correct: hits + cr,
    total,
    accuracy: total ? ((goN ? hits / goN : 0) + (nogoN ? cr / nogoN : 1)) / 2 : 0,
    meanRtMs: meanRt,
  });
}

export interface SimOptions {
  mode?: 'assessment' | 'training';
  /** session length; default 15 s for assessments, TRAINING_MAX_MS for training */
  durationMs?: number;
  /** generated-item seed for training (form 'T') */
  seed?: number;
  /** FlashGrid start level / Series start tier */
  startLevel?: number;
}

/** One simulated game. `rnd` drives everything (trial noise and the day state). */
export function simulateGame(gameId: GameId, p: PlayerSkill, form: FormId, rnd: Rnd, opt: SimOptions = {}): GameResult {
  const mode = opt.mode ?? (form === 'T' ? 'training' : 'assessment');
  const run: Run = {
    mode,
    durationMs: opt.durationMs ?? (mode === 'training' ? TRAINING_MAX_MS : ASSESSMENT_MS),
    rnd,
    day: Math.exp(0.05 * gauss(rnd)),
  };
  const seed = opt.seed ?? 0;
  switch (gameId) {
    case 'stroop':
      return stroop(p, form, run);
    case 'corsi':
      return corsi(p, form, seed, run);
    case 'series':
      return series(p, form, seed, run, opt.startLevel);
    case 'gonogo':
      return gonogo(p, form, seed, run);
    case 'flash41':
      return flash41(p, form, seed, run, opt.startLevel);
  }
}

/** The 4-task assessment (Stroop → Corsi → Series → Go/No-Go) of one simulated player. */
export function simulateAssessment(p: PlayerSkill, form: FormId, seed: number, durationMs = ASSESSMENT_MS): GameResult[] {
  const rnd = mulberry32(seed);
  return (['stroop', 'corsi', 'series', 'gonogo'] as GameId[]).map((g) => simulateGame(g, p, form, rnd, { durationMs }));
}
