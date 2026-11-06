import { describe, expect, it } from 'vitest';
import {
  CORSI_BANK,
  CORSI_N,
  FLASH_BANK,
  FLASH_N,
  GNG_BLOCK,
  GNG_ISI,
  GNG_NOGO_PER_BLOCK,
  GONOGO_BANK,
  SERIES_BANK,
  STROOP_BANK,
  STROOP_COLORS,
  rotateCell,
  seriesTerm,
  type SeqBank,
} from '../games/banks';

const dist = (a: number, b: number, n: number) => Math.hypot(Math.floor(a / n) - Math.floor(b / n), (a % n) - (b % n));

describe('Stroop bank', () => {
  it('A and B have the same size and every item is incongruent', () => {
    expect(STROOP_BANK.A.length).toBe(STROOP_BANK.B.length);
    for (const f of ['A', 'B'] as const) for (const it of STROOP_BANK[f]) expect(it.word).not.toBe(it.ink);
  });
  it('is colour-balanced in blocks of 4 and never repeats the ink twice in a row', () => {
    for (const f of ['A', 'B'] as const) {
      const b = STROOP_BANK[f];
      for (let i = 0; i + 4 <= b.length; i += 4) {
        expect(new Set(b.slice(i, i + 4).map((x) => x.ink)).size).toBe(STROOP_COLORS.length);
      }
      for (let i = 1; i < b.length; i++) expect(b[i].ink).not.toBe(b[i - 1].ink);
    }
  });
  it('form B uses different items at every position', () => {
    STROOP_BANK.A.forEach((a, i) => expect(STROOP_BANK.B[i].ink).not.toBe(a.ink));
  });
});

function checkSeqBank(A: SeqBank, B: SeqBank, n: number) {
  expect(Object.keys(A)).toEqual(Object.keys(B));
  for (const len of Object.keys(A).map(Number)) {
    expect(A[len].length).toBe(B[len].length);
    A[len].forEach((sa, k) => {
      const sb = B[len][k];
      expect(sa.length).toBe(len);
      expect(sb.length).toBe(len);
      expect(new Set(sa).size).toBe(len); // distinct cells
      expect(sb).not.toEqual(sa); // different items
      // same geometry: identical step distances
      for (let i = 1; i < len; i++) expect(dist(sb[i - 1], sb[i], n)).toBeCloseTo(dist(sa[i - 1], sa[i], n));
      for (const c of sb) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(n * n);
      }
    });
  }
}

describe('Corsi / FlashGrid banks', () => {
  it('rotateCell is a bijection', () => {
    for (const n of [3, 4]) {
      const img = new Set(Array.from({ length: n * n }, (_, i) => rotateCell(i, n)));
      expect(img.size).toBe(n * n);
    }
  });
  it('Corsi A/B: same spans, sizes and path geometry; different cells', () => {
    checkSeqBank(CORSI_BANK.A, CORSI_BANK.B, CORSI_N);
    expect(Object.keys(CORSI_BANK.A).map(Number)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it('FlashGrid A/B: same levels 2–9, sizes and path geometry; different cells', () => {
    checkSeqBank(FLASH_BANK.A, FLASH_BANK.B, FLASH_N);
    expect(Object.keys(FLASH_BANK.A).map(Number)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('Series bank', () => {
  it('A and B have equal size and the same rule type and answer position per item', () => {
    expect(SERIES_BANK.A.length).toBe(SERIES_BANK.B.length);
    SERIES_BANK.A.forEach((a, i) => {
      const b = SERIES_BANK.B[i];
      expect(b.rule.type).toBe(a.rule.type);
      expect(b.answerPos).toBe(a.answerPos);
      expect(b.shown).not.toEqual(a.shown);
      // same distractor pattern relative to the answer
      expect(b.options.map((o) => o - b.answer)).toEqual(a.options.map((o) => o - a.answer));
    });
  });
  it('every item is well-formed: correct answer, 4 unique positive options', () => {
    for (const f of ['A', 'B'] as const) {
      for (const it of SERIES_BANK[f]) {
        expect(it.shown).toHaveLength(5);
        expect(it.answer).toBe(seriesTerm(it.rule, 5));
        expect(it.options).toHaveLength(4);
        expect(new Set(it.options).size).toBe(4);
        expect(it.options[it.answerPos]).toBe(it.answer);
        expect(it.options.filter((o) => o === it.answer)).toHaveLength(1);
        for (const o of [...it.options, ...it.shown]) {
          expect(Number.isInteger(o)).toBe(true);
          expect(o).toBeGreaterThan(0);
          expect(o).toBeLessThan(1000);
        }
      }
    }
  });
});

describe('Go/No-Go bank', () => {
  it('A and B: same length, same No-Go count per block, same ISI set per block', () => {
    expect(GONOGO_BANK.A.length).toBe(GONOGO_BANK.B.length);
    for (const f of ['A', 'B'] as const) {
      const b = GONOGO_BANK[f];
      expect(b[0].kind).toBe('go');
      expect(b[1].kind).toBe('go');
      for (let i = 0; i < b.length; i += GNG_BLOCK) {
        const block = b.slice(i, i + GNG_BLOCK);
        expect(block.filter((x) => x.kind === 'nogo')).toHaveLength(GNG_NOGO_PER_BLOCK);
        expect(block.map((x) => x.isiMs).sort((x, y) => x - y)).toEqual([...GNG_ISI].sort((x, y) => x - y));
      }
      for (let i = 2; i < b.length; i++) {
        expect(b[i].kind === 'nogo' && b[i - 1].kind === 'nogo' && b[i - 2].kind === 'nogo').toBe(false);
      }
    }
    expect(GONOGO_BANK.B.map((x) => x.kind)).not.toEqual(GONOGO_BANK.A.map((x) => x.kind));
  });
});
