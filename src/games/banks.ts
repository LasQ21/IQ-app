// Deterministic task banks.
//
// Assessment forms A (baseline), B (1st re-test) and A2 (2nd re-test) are fixed and equated by construction:
// - Stroop: B and A2 = form A with every colour passed through a fixed derangement (two different ones),
//   so incongruence, colour balance and repeat structure are identical while every single item differs.
// - Corsi / FlashGrid: B = form A rotated 90°, A2 = form A rotated 180°. Rotation keeps every distance and
//   direction change of the path, so the sequences are geometrically equivalent but use other cells.
// - Series: per item the same rule type, the same step / factor, the same number of shown terms, the same
//   distractor rules and answer position, answers of the same magnitude (digits) — only the start differs.
// - Go/No-Go: same block structure (blocks of 8, 2 No-Go per block, same ISI set per block), other order.
//
// Training ('T') never uses assessment items. Training items are GENERATED from a seed
// (`trainingSeed(seedDay, slot)` = seedDay·10 + slot) and rejected if they overlap an assessment item
// (same sequence, or for Series a sequence that shows an assessment item's answer in context).
// Pure TS (no React) so the engine tests can check the structure.

import type { FormId } from '../state/types';

export type { FormId };
/** Fixed, equated assessment forms in the order they are used: baseline, 1st re-test, 2nd re-test. */
export const ASSESSMENT_FORMS = ['A', 'B', 'A2'] as const;
export type AssessmentFormId = (typeof ASSESSMENT_FORMS)[number];

/** Seed of the `slot`-th training game on training day `seedDay` (slot 0–9). */
export function trainingSeed(seedDay: number, slot: number): number {
  const d = Number.isFinite(seedDay) ? Math.max(0, Math.floor(seedDay)) : 0;
  const s = Number.isFinite(slot) ? Math.max(0, Math.floor(slot)) % 10 : 0;
  return d * 10 + s;
}

/** Small deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** PRNG for generated training items of one game (`salt` keeps games independent). */
function trainingRnd(seed: number, salt: number): () => number {
  const s = Number.isFinite(seed) ? Math.floor(seed) : 0;
  return mulberry32((Math.imul(s + 1, 0x9e3779b1) ^ salt) >>> 0);
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sameSeq = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Memoised training banks (a session asks for the same seed on every render). */
function memo<T>(build: (seed: number) => T): (seed: number) => T {
  const cache = new Map<number, T>();
  return (seed: number) => {
    const key = Number.isFinite(seed) ? Math.floor(seed) : 0;
    let v = cache.get(key);
    if (v === undefined) {
      v = build(key);
      if (cache.size > 64) cache.clear();
      cache.set(key, v);
    }
    return v;
  };
}

// ───────────────────────── Stroop ─────────────────────────

export const STROOP_COLORS = ['red', 'blue', 'green', 'black'] as const;
export type StroopColor = (typeof STROOP_COLORS)[number];

/** Ink colours: distinguishable (Okabe–Ito based) and readable as large text on white (≥ 3:1). */
export const STROOP_INK: Record<StroopColor, string> = {
  red: '#D1361B',
  blue: '#0B63C5',
  green: '#00805A',
  black: '#10111C',
};

export interface StroopItem {
  word: StroopColor;
  ink: StroopColor;
}

export const STROOP_LEN = 40;

function buildStroop(rnd: () => number): StroopItem[] {
  const items: StroopItem[] = [];
  // Blocks of 4: every ink exactly once per block → colour-balanced; always incongruent.
  while (items.length < STROOP_LEN) {
    let inks = shuffle([...STROOP_COLORS], rnd);
    // no immediate ink repeat across block borders
    if (items.length && inks[0] === items[items.length - 1].ink) inks = [...inks.slice(1), inks[0]];
    for (const ink of inks) {
      const prevWord = items.length ? items[items.length - 1].word : undefined;
      const words = STROOP_COLORS.filter((w) => w !== ink && w !== prevWord);
      items.push({ ink, word: words[Math.floor(rnd() * words.length)] });
    }
  }
  return items;
}

/** Fixed derangements used to derive form B and A2 (σ2(x) ∉ {x, σ(x)}, so A, B, A2 differ at every position). */
const STROOP_SIGMA: Record<StroopColor, StroopColor> = { red: 'green', blue: 'black', green: 'blue', black: 'red' };
const STROOP_SIGMA2: Record<StroopColor, StroopColor> = { red: 'black', blue: 'green', green: 'red', black: 'blue' };
const mapStroop = (items: StroopItem[], s: Record<StroopColor, StroopColor>) =>
  items.map((it) => ({ word: s[it.word], ink: s[it.ink] }));

const STROOP_A = buildStroop(mulberry32(146_001));
const STROOP_ASSESS: StroopItem[][] = [STROOP_A, mapStroop(STROOP_A, STROOP_SIGMA), mapStroop(STROOP_A, STROOP_SIGMA2)];

/** Window length used to call a Stroop training run "the same as" an assessment form. */
export const STROOP_WINDOW = 8;
const stroopKey = (items: StroopItem[], i: number) =>
  items
    .slice(i, i + STROOP_WINDOW)
    .map((x) => x.word[0] + x.ink[0] + x.word[2] + x.ink[2])
    .join('|');
const STROOP_WINDOWS = new Set(
  STROOP_ASSESS.flatMap((f) => Array.from({ length: f.length - STROOP_WINDOW + 1 }, (_, i) => stroopKey(f, i))),
);

/** True if the run shares any STROOP_WINDOW-long stretch with an assessment form. */
export function stroopOverlapsAssessment(items: StroopItem[]): boolean {
  for (let i = 0; i + STROOP_WINDOW <= items.length; i++) if (STROOP_WINDOWS.has(stroopKey(items, i))) return true;
  return false;
}

/** Generated Stroop run for training (never shares an 8-item stretch with A/B/A2). */
export const stroopTraining = memo((seed: number) => {
  const rnd = trainingRnd(seed, 0x5700);
  for (;;) {
    const items = buildStroop(rnd);
    if (!stroopOverlapsAssessment(items)) return items;
  }
});

export const STROOP_BANK: Record<FormId, StroopItem[]> = {
  A: STROOP_ASSESS[0],
  B: STROOP_ASSESS[1],
  A2: STROOP_ASSESS[2],
  T: stroopTraining(0),
};

export function stroopBank(form: FormId, seed = 0): StroopItem[] {
  return form === 'T' ? stroopTraining(seed) : (STROOP_BANK[form] ?? STROOP_BANK.A);
}

// ───────────────────── Grid sequences (Corsi 3×3, FlashGrid 4×4) ─────────────────────

/** Rotate a cell index 90° clockwise on an n×n grid. */
export function rotateCell(cell: number, n: number): number {
  const r = Math.floor(cell / n);
  const c = cell % n;
  return c * n + (n - 1 - r);
}

function randomPath(len: number, cells: number, rnd: () => number): number[] {
  // distinct cells, no immediate repeats
  return shuffle(
    Array.from({ length: cells }, (_, i) => i),
    rnd,
  ).slice(0, len);
}

/** bank[level] = list of sequences of that length. */
export type SeqBank = Record<number, number[][]>;

function buildSeqBank(
  n: number,
  minLen: number,
  maxLen: number,
  perLen: number,
  rnd: () => number,
  reject?: (s: number[]) => boolean,
  accept?: (s: number[]) => void,
): SeqBank {
  const bank: SeqBank = {};
  for (let len = minLen; len <= maxLen; len++) {
    const list: number[][] = [];
    while (list.length < perLen) {
      const s = randomPath(len, n * n, rnd);
      if (reject?.(s) || list.some((x) => sameSeq(x, s))) continue;
      list.push(s);
      accept?.(s);
    }
    bank[len] = list;
  }
  return bank;
}

/** Rotate a cell `times` × 90° clockwise. */
function rotN(cell: number, n: number, times: number): number {
  let x = cell;
  for (let i = 0; i < times; i++) x = rotateCell(x, n);
  return x;
}

function rotateBank(bank: SeqBank, n: number, times = 1): SeqBank {
  const out: SeqBank = {};
  for (const [len, seqs] of Object.entries(bank)) out[Number(len)] = seqs.map((s) => s.map((c) => rotN(c, n, times)));
  return out;
}

function seqForms(n: number, minLen: number, maxLen: number, perLen: number, seed: number, salt: number) {
  // Form A rejects a path if any rotation of it is already taken, so A, B (90°) and A2 (180°) never share a path.
  const rotations = (seq: number[]) => [0, 1, 2, 3].map((k) => seq.map((c) => rotN(c, n, k)).join(','));
  const taken = new Set<string>();
  const A = buildSeqBank(
    n,
    minLen,
    maxLen,
    perLen,
    mulberry32(seed),
    (seq) => rotations(seq).some((k) => taken.has(k)),
    (seq) => rotations(seq).forEach((k) => taken.add(k)),
  );
  const assess: SeqBank[] = [A, rotateBank(A, n, 1), rotateBank(A, n, 2)];
  const used = new Set(assess.flatMap((b) => Object.values(b).flat().map((s) => s.join(','))));
  const training = memo((s: number) =>
    buildSeqBank(n, minLen, maxLen, perLen, trainingRnd(s, salt), (seq) => used.has(seq.join(','))),
  );
  const bank: Record<FormId, SeqBank> = { A: assess[0], B: assess[1], A2: assess[2], T: training(0) };
  return { bank, training, used };
}

export const CORSI_N = 3;
export const CORSI_MIN = 2;
export const CORSI_MAX = 9;
const CORSI = seqForms(CORSI_N, CORSI_MIN, CORSI_MAX, 4, 146_002, 0xc051);
export const CORSI_BANK: Record<FormId, SeqBank> = CORSI.bank;
export const corsiTraining = CORSI.training;
export function corsiBank(form: FormId, seed = 0): SeqBank {
  return form === 'T' ? corsiTraining(seed) : (CORSI_BANK[form] ?? CORSI_BANK.A);
}

export const FLASH_N = 4;
export const FLASH_MIN = 2;
export const FLASH_MAX = 9;
const FLASH = seqForms(FLASH_N, FLASH_MIN, FLASH_MAX, 6, 146_041, 0xf41a);
export const FLASH_BANK: Record<FormId, SeqBank> = FLASH.bank;
export const flashTraining = FLASH.training;
export function flashBank(form: FormId, seed = 0): SeqBank {
  return form === 'T' ? flashTraining(seed) : (FLASH_BANK[form] ?? FLASH_BANK.A);
}

/** True if `seq` is one of the assessment sequences of that grid game. */
export function isAssessmentSeq(game: 'corsi' | 'flash41', seq: number[]): boolean {
  return (game === 'corsi' ? CORSI : FLASH).used.has(seq.join(','));
}

/** Sequence for the k-th attempt at `len` (cycles through the bank). */
export function seqFor(bank: SeqBank, len: number, k: number): number[] {
  const list = bank[len];
  return list[((k % list.length) + list.length) % list.length];
}

// ───────────────────────── Number series ─────────────────────────

export type SeriesRule =
  | { type: 'add'; start: number; step: number }
  | { type: 'mul'; start: number; factor: number }
  | { type: 'incDiff'; start: number; d0: number }
  | { type: 'alt'; start: number; a: number; b: number }
  | { type: 'square'; offset: number; add?: number }
  | { type: 'fib'; a: number; b: number }
  | { type: 'interleave'; s1: number; step1: number; s2: number; step2: number }
  | { type: 'doubleDiff'; start: number; d0: number }
  | { type: 'mulAdd'; start: number; f: number; add: number };

/** i-th term (0-based) of a series rule. */
export function seriesTerm(rule: SeriesRule, i: number): number {
  switch (rule.type) {
    case 'add':
      return rule.start + i * rule.step;
    case 'mul':
      return rule.start * rule.factor ** i;
    case 'incDiff':
      // diffs d0, d0+1, d0+2…
      return rule.start + i * rule.d0 + (i * (i - 1)) / 2;
    case 'alt': {
      let v = rule.start;
      for (let k = 0; k < i; k++) v += k % 2 === 0 ? rule.a : -rule.b;
      return v;
    }
    case 'square':
      return (rule.offset + i) ** 2 + (rule.add ?? 0);
    case 'fib': {
      let [x, y] = [rule.a, rule.b];
      for (let k = 0; k < i; k++) [x, y] = [y, x + y];
      return x;
    }
    case 'interleave':
      return i % 2 === 0 ? rule.s1 + (i / 2) * rule.step1 : rule.s2 + ((i - 1) / 2) * rule.step2;
    case 'doubleDiff':
      // diffs d0, 2d0, 4d0…
      return rule.start + rule.d0 * (2 ** i - 1);
    case 'mulAdd': {
      let v = rule.start;
      for (let k = 0; k < i; k++) v = v * rule.f + rule.add;
      return v;
    }
  }
}

/**
 * Distractor rules: '+n' / '-n' = answer ± n; 'linear' = the "constant difference" mistake
 * (last + (last − previous)), the most common wrong continuation of a non-linear series.
 */
export type Distractor = 'linear' | `+${number}` | `-${number}`;

export interface SeriesItem {
  rule: SeriesRule;
  /** shown terms (4 for the short warm-up items, else 5) */
  shown: number[];
  answer: number;
  /** 4 options, answer at `answerPos` */
  options: number[];
  answerPos: number;
  /** Difficulty tier 1–12 (template position; the same in every form and in training). */
  tier: number;
}

/**
 * Item templates in ascending difficulty. The first 4 are short and easy (4 shown terms) so an average
 * player answers ≥ 4 items in 15 s (≥ 3 in the 10 s fast mode). `forms` are the equated assessment items;
 * `train` lists rules of the same type for generated training items (filtered against the forms below).
 */
interface SeriesTemplate {
  shown: number;
  pos: number;
  distractors: Distractor[];
  forms: Record<AssessmentFormId, SeriesRule>;
  train: SeriesRule[];
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const SERIES_TEMPLATES: SeriesTemplate[] = [
  {
    shown: 4,
    pos: 2,
    distractors: ['+2', '-2', '+1', '-1'],
    forms: { A: { type: 'add', start: 3, step: 2 }, B: { type: 'add', start: 4, step: 2 }, A2: { type: 'add', start: 6, step: 2 } },
    train: [3, 4].flatMap((step) => range(1, 9).map((start) => ({ type: 'add' as const, start, step }))),
  },
  {
    shown: 4,
    pos: 0,
    distractors: ['+3', '-1', '+1', '-3'],
    forms: { A: { type: 'add', start: 23, step: -3 }, B: { type: 'add', start: 25, step: -3 }, A2: { type: 'add', start: 28, step: -3 } },
    train: [-2, -4].flatMap((step) => range(16, 30).map((start) => ({ type: 'add' as const, start, step }))),
  },
  {
    shown: 4,
    pos: 3,
    distractors: ['-5', '+1', '+5', '-1'],
    forms: { A: { type: 'add', start: 5, step: 5 }, B: { type: 'add', start: 7, step: 5 }, A2: { type: 'add', start: 4, step: 5 } },
    train: [6, 7].flatMap((step) => range(1, 9).map((start) => ({ type: 'add' as const, start, step }))),
  },
  {
    shown: 4,
    pos: 1,
    distractors: ['linear', '+2', '-2', '+4'],
    forms: { A: { type: 'mul', start: 3, factor: 2 }, B: { type: 'mul', start: 2, factor: 2 }, A2: { type: 'mul', start: 5, factor: 2 } },
    train: range(4, 15).map((start) => ({ type: 'mul' as const, start, factor: 2 })),
  },
  {
    shown: 5,
    pos: 1,
    distractors: ['linear', '+1', '-1', '+2'],
    forms: { A: { type: 'incDiff', start: 1, d0: 1 }, B: { type: 'incDiff', start: 2, d0: 1 }, A2: { type: 'incDiff', start: 3, d0: 1 } },
    train: [1, 2].flatMap((d0) => range(4, 12).map((start) => ({ type: 'incDiff' as const, start, d0 }))),
  },
  {
    shown: 5,
    pos: 1,
    distractors: ['-1', 'linear', '+1', '+3'],
    forms: { A: { type: 'alt', start: 5, a: 3, b: 1 }, B: { type: 'alt', start: 4, a: 3, b: 1 }, A2: { type: 'alt', start: 6, a: 3, b: 1 } },
    train: [
      [4, 1],
      [3, 2],
      [5, 2],
    ].flatMap(([a, b]) => range(2, 10).map((start) => ({ type: 'alt' as const, start, a, b }))),
  },
  {
    shown: 4,
    pos: 3,
    distractors: ['linear', '+3', '-3', '+1'],
    forms: { A: { type: 'mul', start: 2, factor: 3 }, B: { type: 'mul', start: 3, factor: 3 }, A2: { type: 'mul', start: 4, factor: 3 } },
    train: range(3, 12).map((start) => ({ type: 'mul' as const, start, factor: 3 })),
  },
  {
    shown: 5,
    pos: 0,
    distractors: ['linear', '+1', '-1', '+2'],
    forms: {
      A: { type: 'square', offset: 2, add: 0 },
      B: { type: 'square', offset: 2, add: 1 },
      A2: { type: 'square', offset: 2, add: -1 },
    },
    train: [1, 3].flatMap((offset) => range(-3, 4).map((add) => ({ type: 'square' as const, offset, add }))),
  },
  {
    shown: 5,
    pos: 2,
    distractors: ['linear', '+1', '-1', '-2'],
    forms: { A: { type: 'fib', a: 1, b: 3 }, B: { type: 'fib', a: 1, b: 4 }, A2: { type: 'fib', a: 2, b: 5 } },
    train: range(1, 4).flatMap((a) => range(a + 1, 8).map((b) => ({ type: 'fib' as const, a, b }))),
  },
  {
    shown: 5,
    pos: 3,
    distractors: ['+1', '-1', '+2', '-2'],
    forms: {
      A: { type: 'interleave', s1: 2, step1: 2, s2: 19, step2: -1 },
      B: { type: 'interleave', s1: 3, step1: 2, s2: 20, step2: -1 },
      A2: { type: 'interleave', s1: 1, step1: 2, s2: 22, step2: -1 },
    },
    train: [3].flatMap((step1) =>
      [-1, -2].flatMap((step2) => range(1, 5).flatMap((s1) => range(10, 16).map((s2) => ({ type: 'interleave' as const, s1, step1, s2, step2 })))),
    ),
  },
  {
    shown: 5,
    pos: 0,
    distractors: ['linear', '+2', '-2', '+1'],
    forms: {
      A: { type: 'doubleDiff', start: 3, d0: 1 },
      B: { type: 'doubleDiff', start: 2, d0: 1 },
      A2: { type: 'doubleDiff', start: 4, d0: 1 },
    },
    train: [1, 2].flatMap((d0) => range(5, 12).map((start) => ({ type: 'doubleDiff' as const, start, d0 }))),
  },
  {
    shown: 5,
    pos: 2,
    distractors: ['linear', '+1', '-1', '+2'],
    forms: {
      A: { type: 'mulAdd', start: 1, f: 2, add: 3 },
      B: { type: 'mulAdd', start: 2, f: 2, add: 3 },
      A2: { type: 'mulAdd', start: 3, f: 2, add: 3 },
    },
    train: [1, -1, 2].flatMap((add) => range(2, 12).map((start) => ({ type: 'mulAdd' as const, start, f: 2, add }))),
  },
];

/** Number of items per series form. */
export const SERIES_LEN = SERIES_TEMPLATES.length;

function distractorValue(d: Distractor, terms: number[], answer: number): number {
  if (d === 'linear') {
    const last = terms[terms.length - 1];
    return last + (last - terms[terms.length - 2]);
  }
  return answer + Number(d);
}

function buildItem(rule: SeriesRule, tpl: SeriesTemplate, tier: number, pos: number): SeriesItem {
  const shown = Array.from({ length: tpl.shown }, (_, k) => seriesTerm(rule, k));
  const answer = seriesTerm(rule, tpl.shown);
  const wrong: number[] = [];
  const cands = [...tpl.distractors.map((d) => distractorValue(d, shown, answer)), answer + 3, answer - 3, answer + 4, answer + 5];
  for (const v of cands) {
    if (wrong.length < 3 && v > 0 && v !== answer && !wrong.includes(v)) wrong.push(v);
  }
  const options = [...wrong];
  options.splice(pos, 0, answer);
  return { rule, shown, answer, options, answerPos: pos, tier };
}

const SERIES_ASSESS: Record<AssessmentFormId, SeriesItem[]> = {
  A: SERIES_TEMPLATES.map((t, i) => buildItem(t.forms.A, t, i + 1, t.pos)),
  B: SERIES_TEMPLATES.map((t, i) => buildItem(t.forms.B, t, i + 1, t.pos)),
  A2: SERIES_TEMPLATES.map((t, i) => buildItem(t.forms.A2, t, i + 1, t.pos)),
};

const fullSeq = (it: SeriesItem) => [...it.shown, it.answer];
const containsRun = (hay: number[], run: number[]) =>
  hay.some((_, i) => i + run.length <= hay.length && run.every((x, k) => hay[i + k] === x));

/**
 * A series item is "contaminated" by an assessment item if it shows the same terms, or if its terms contain
 * the assessment item's last two shown terms followed by its answer (e.g. ×2 from 6 reveals "12, 24 → 48").
 */
export function seriesOverlapsAssessment(item: Pick<SeriesItem, 'shown' | 'answer'>): boolean {
  const seq = [...item.shown, item.answer];
  for (const f of ASSESSMENT_FORMS) {
    for (const a of SERIES_ASSESS[f]) {
      if (sameSeq(a.shown, item.shown)) return true;
      if (containsRun(seq, fullSeq(a).slice(-3))) return true;
    }
  }
  return false;
}

/** Training candidates per tier, filtered once: positive terms < 1000 and no overlap with A/B/A2. */
const SERIES_TRAIN: SeriesItem[][] = SERIES_TEMPLATES.map((t, i) =>
  t.train
    .map((rule) => buildItem(rule, t, i + 1, t.pos))
    .filter((it) => [...fullSeq(it), ...it.options].every((v) => Number.isInteger(v) && v > 0 && v < 1000))
    .filter((it) => it.options.length === 4 && !seriesOverlapsAssessment(it)),
);

/**
 * Generated training run: one item per tier from `startTier` (1 = easiest) to 12, then tiers 1… again,
 * each picked by the seed, answer position shuffled. `startTier` > 1 skips the warm-up (second round).
 */
export function seriesTraining(seed: number, startTier = 1): SeriesItem[] {
  const rnd = trainingRnd(seed, 0x5e41);
  const start = Math.max(1, Math.min(SERIES_LEN, Math.round(Number.isFinite(startTier) ? startTier : 1)));
  const tiers = [...range(start, SERIES_LEN), ...range(1, start - 1)];
  return tiers.map((tier) => {
    const pool = SERIES_TRAIN[tier - 1];
    const base = pool[Math.floor(rnd() * pool.length)];
    const pos = Math.floor(rnd() * 4);
    const wrong = base.options.filter((_, k) => k !== base.answerPos);
    const options = [...wrong];
    options.splice(pos, 0, base.answer);
    return { ...base, options, answerPos: pos };
  });
}

export const SERIES_BANK: Record<FormId, SeriesItem[]> = { ...SERIES_ASSESS, T: seriesTraining(0) };

export function seriesBank(form: FormId, seed = 0, startTier = 1): SeriesItem[] {
  return form === 'T' ? seriesTraining(seed, startTier) : (SERIES_BANK[form] ?? SERIES_BANK.A);
}

// ───────────────────────── Go / No-Go ─────────────────────────

export interface GoNoGoItem {
  kind: 'go' | 'nogo';
  /** blank interval before the stimulus, ms */
  isiMs: number;
}

export const GNG_BLOCK = 8;
export const GNG_NOGO_PER_BLOCK = 2;
export const GNG_BLOCKS = 4;
export const GNG_ISI = [200, 250, 300, 350, 400, 450, 500, 550];

function buildGoNoGo(rnd: () => number): GoNoGoItem[] {
  const out: GoNoGoItem[] = [];
  for (let b = 0; b < GNG_BLOCKS; b++) {
    let kinds: GoNoGoItem['kind'][];
    // The very first two stimuli are Go (learn the response); both No-Go of the first block come by stimulus 6,
    // so even a 10 s fast-mode run measures inhibition twice; no more than 2 No-Go in a row.
    for (;;) {
      kinds = shuffle(
        Array.from({ length: GNG_BLOCK }, (_, i) => (i < GNG_NOGO_PER_BLOCK ? 'nogo' : 'go')),
        rnd,
      );
      const seq = [...out.map((o) => o.kind), ...kinds];
      const firstOk = b > 0 || (kinds[0] === 'go' && kinds[1] === 'go' && kinds[6] === 'go' && kinds[7] === 'go');
      const runOk = !seq.some((k, i) => k === 'nogo' && seq[i - 1] === 'nogo' && seq[i - 2] === 'nogo');
      if (firstOk && runOk) break;
    }
    const isis = shuffle(GNG_ISI, rnd);
    kinds.forEach((kind, i) => out.push({ kind, isiMs: isis[i] }));
  }
  return out;
}

const gngKey = (b: GoNoGoItem[]) => b.map((x) => (x.kind === 'go' ? 'g' : 'n') + x.isiMs).join(',');
const GNG_ASSESS: GoNoGoItem[][] = [buildGoNoGo(mulberry32(146_101)), buildGoNoGo(mulberry32(146_202)), buildGoNoGo(mulberry32(146_303))];
const GNG_KEYS = new Set(GNG_ASSESS.map((b) => gngKey(b.slice(0, 2 * GNG_BLOCK))));

/** True if the first two blocks (≈ a 15 s run) equal an assessment form's. */
export function gonogoOverlapsAssessment(items: GoNoGoItem[]): boolean {
  return GNG_KEYS.has(gngKey(items.slice(0, 2 * GNG_BLOCK)));
}

export const gonogoTraining = memo((seed: number) => {
  const rnd = trainingRnd(seed, 0x6060);
  for (;;) {
    const items = buildGoNoGo(rnd);
    if (!gonogoOverlapsAssessment(items)) return items;
  }
});

export const GONOGO_BANK: Record<FormId, GoNoGoItem[]> = {
  A: GNG_ASSESS[0],
  B: GNG_ASSESS[1],
  A2: GNG_ASSESS[2],
  T: gonogoTraining(0),
};

export function gonogoBank(form: FormId, seed = 0): GoNoGoItem[] {
  return form === 'T' ? gonogoTraining(seed) : (GONOGO_BANK[form] ?? GONOGO_BANK.A);
}
