// Deterministic task banks for the parallel forms A and B.
//
// Equal difficulty by construction:
// - Stroop: form B = form A with every colour passed through a fixed derangement, so incongruence,
//   colour balance and repeat structure are identical while every single item differs.
// - Corsi / FlashGrid: form B = form A rotated 90° on the grid. Rotation keeps every distance and
//   direction change of the path, so the sequences are geometrically equivalent but use other cells.
// - Series: same rule type, same distractor pattern and same answer position per item, other numbers.
// - Go/No-Go: same block structure (blocks of 8, 2 No-Go per block, same ISI set per block),
//   different order.
// Pure TS (no React) so the engine tests can check the structure.

export type FormId = 'A' | 'B';

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

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

function buildStroopA(): StroopItem[] {
  const rnd = mulberry32(146_001);
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

/** Fixed derangement used to derive form B. */
const STROOP_SIGMA: Record<StroopColor, StroopColor> = {
  red: 'green',
  blue: 'black',
  green: 'blue',
  black: 'red',
};

const STROOP_A = buildStroopA();
export const STROOP_BANK: Record<FormId, StroopItem[]> = {
  A: STROOP_A,
  B: STROOP_A.map((it) => ({ word: STROOP_SIGMA[it.word], ink: STROOP_SIGMA[it.ink] })),
};

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

function buildSeqBank(n: number, minLen: number, maxLen: number, perLen: number, seed: number): SeqBank {
  const rnd = mulberry32(seed);
  const bank: SeqBank = {};
  for (let len = minLen; len <= maxLen; len++) {
    bank[len] = Array.from({ length: perLen }, () => randomPath(len, n * n, rnd));
  }
  return bank;
}

function rotateBank(bank: SeqBank, n: number): SeqBank {
  const out: SeqBank = {};
  for (const [len, seqs] of Object.entries(bank)) out[Number(len)] = seqs.map((s) => s.map((c) => rotateCell(c, n)));
  return out;
}

export const CORSI_N = 3;
export const CORSI_MIN = 2;
export const CORSI_MAX = 9;
const CORSI_A = buildSeqBank(CORSI_N, CORSI_MIN, CORSI_MAX, 4, 146_002);
export const CORSI_BANK: Record<FormId, SeqBank> = { A: CORSI_A, B: rotateBank(CORSI_A, CORSI_N) };

export const FLASH_N = 4;
export const FLASH_MIN = 2;
export const FLASH_MAX = 9;
const FLASH_A = buildSeqBank(FLASH_N, FLASH_MIN, FLASH_MAX, 6, 146_041);
export const FLASH_BANK: Record<FormId, SeqBank> = { A: FLASH_A, B: rotateBank(FLASH_A, FLASH_N) };

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
  | { type: 'square'; offset: number }
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
      return (rule.offset + i) ** 2;
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

export interface SeriesItem {
  rule: SeriesRule;
  /** 5 shown terms */
  shown: number[];
  answer: number;
  /** 4 options, answer at `answerPos` */
  options: number[];
  answerPos: number;
}

export const SERIES_SHOWN = 5;

/** Per item: distractor offsets from the answer and answer position — identical for A and B. */
const SERIES_SHAPE: { deltas: [number, number, number]; pos: number }[] = [
  { deltas: [2, -1, 1], pos: 2 },
  { deltas: [-2, 4, 2], pos: 0 },
  { deltas: [-16, 4, -4], pos: 3 },
  { deltas: [-1, 1, -2], pos: 1 },
  { deltas: [-1, -4, 1], pos: 1 },
  { deltas: [-81, -27, 81], pos: 3 },
  { deltas: [-6, -1, 13], pos: 0 },
  { deltas: [-2, -1, 3], pos: 2 },
  { deltas: [1, -1, 3], pos: 3 },
  { deltas: [-8, -2, 2], pos: 0 },
  { deltas: [-1, -16, 1], pos: 2 },
  { deltas: [-1, 1, -121], pos: 1 },
];

/** Rules in ascending difficulty; index i in A and B has the same rule type. */
const SERIES_RULES: Record<FormId, SeriesRule[]> = {
  A: [
    { type: 'add', start: 3, step: 2 },
    { type: 'add', start: 30, step: -4 },
    { type: 'mul', start: 2, factor: 2 },
    { type: 'incDiff', start: 1, d0: 1 },
    { type: 'alt', start: 5, a: 3, b: 1 },
    { type: 'mul', start: 1, factor: 3 },
    { type: 'square', offset: 1 },
    { type: 'fib', a: 1, b: 2 },
    { type: 'interleave', s1: 2, step1: 2, s2: 9, step2: -1 },
    { type: 'doubleDiff', start: 3, d0: 1 },
    { type: 'mulAdd', start: 1, f: 2, add: 1 },
    { type: 'mulAdd', start: 2, f: 3, add: -1 },
  ],
  B: [
    { type: 'add', start: 4, step: 3 },
    { type: 'add', start: 35, step: -4 },
    { type: 'mul', start: 3, factor: 2 },
    { type: 'incDiff', start: 3, d0: 1 },
    { type: 'alt', start: 4, a: 4, b: 1 },
    { type: 'mul', start: 2, factor: 3 },
    { type: 'square', offset: 2 },
    { type: 'fib', a: 2, b: 3 },
    { type: 'interleave', s1: 1, step1: 3, s2: 10, step2: -2 },
    { type: 'doubleDiff', start: 5, d0: 1 },
    { type: 'mulAdd', start: 2, f: 2, add: 1 },
    { type: 'mulAdd', start: 1, f: 3, add: 1 },
  ],
};

function buildSeries(form: FormId): SeriesItem[] {
  return SERIES_RULES[form].map((rule, i) => {
    const shown = Array.from({ length: SERIES_SHOWN }, (_, k) => seriesTerm(rule, k));
    const answer = seriesTerm(rule, SERIES_SHOWN);
    const { deltas, pos } = SERIES_SHAPE[i];
    const options = deltas.map((d) => answer + d);
    options.splice(pos, 0, answer);
    return { rule, shown, answer, options, answerPos: pos };
  });
}

export const SERIES_BANK: Record<FormId, SeriesItem[]> = { A: buildSeries('A'), B: buildSeries('B') };

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

function buildGoNoGo(seed: number): GoNoGoItem[] {
  const rnd = mulberry32(seed);
  const out: GoNoGoItem[] = [];
  for (let b = 0; b < GNG_BLOCKS; b++) {
    let kinds: GoNoGoItem['kind'][];
    // The very first two stimuli are Go (learn the response); no more than 2 No-Go in a row.
    for (;;) {
      kinds = shuffle(
        Array.from({ length: GNG_BLOCK }, (_, i) => (i < GNG_NOGO_PER_BLOCK ? 'nogo' : 'go')),
        rnd,
      );
      const seq = [...out.map((o) => o.kind), ...kinds];
      const firstOk = b > 0 || (kinds[0] === 'go' && kinds[1] === 'go');
      const runOk = !seq.some((k, i) => k === 'nogo' && seq[i - 1] === 'nogo' && seq[i - 2] === 'nogo');
      if (firstOk && runOk) break;
    }
    const isis = shuffle(GNG_ISI, rnd);
    kinds.forEach((kind, i) => out.push({ kind, isiMs: isis[i] }));
  }
  return out;
}

export const GONOGO_BANK: Record<FormId, GoNoGoItem[]> = { A: buildGoNoGo(146_101), B: buildGoNoGo(146_202) };
