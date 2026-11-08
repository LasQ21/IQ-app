import { describe, expect, it } from 'vitest';
import {
  ASSESSMENT_FORMS,
  CORSI_BANK,
  CORSI_N,
  FLASH_BANK,
  FLASH_N,
  GNG_BLOCK,
  GNG_ISI,
  GNG_NOGO_PER_BLOCK,
  GONOGO_BANK,
  SERIES_BANK,
  SERIES_LEN,
  SERIES_TEMPLATES,
  STROOP_BANK,
  STROOP_COLORS,
  corsiBank,
  flashBank,
  gonogoBank,
  gonogoOverlapsAssessment,
  isAssessmentSeq,
  rotateCell,
  seriesBank,
  seriesOverlapsAssessment,
  seriesTerm,
  stroopBank,
  stroopOverlapsAssessment,
  trainingSeed,
  type SeqBank,
  type SeriesRule,
} from '../games/banks';

const dist = (a: number, b: number, n: number) => Math.hypot(Math.floor(a / n) - Math.floor(b / n), (a % n) - (b % n));
/** Training seeds of 40 days × 4 slots (seed = seedDay·10 + slot). */
const SEEDS = Array.from({ length: 40 }, (_, d) => [0, 1, 2, 3].map((s) => trainingSeed(20_400 + d, s))).flat();

describe('Stroop bank', () => {
  it('A, B, A2 have the same size and every item is incongruent', () => {
    for (const f of ASSESSMENT_FORMS) {
      expect(STROOP_BANK[f].length).toBe(STROOP_BANK.A.length);
      for (const it of STROOP_BANK[f]) expect(it.word).not.toBe(it.ink);
    }
  });
  it('is colour-balanced in blocks of 4 and never repeats the ink twice in a row (all forms + training)', () => {
    for (const b of [...ASSESSMENT_FORMS.map((f) => STROOP_BANK[f]), stroopBank('T', 7)]) {
      for (let i = 0; i + 4 <= b.length; i += 4) {
        expect(new Set(b.slice(i, i + 4).map((x) => x.ink)).size).toBe(STROOP_COLORS.length);
      }
      for (let i = 1; i < b.length; i++) expect(b[i].ink).not.toBe(b[i - 1].ink);
    }
  });
  it('B and A2 use different items at every position (from A and from each other)', () => {
    STROOP_BANK.A.forEach((a, i) => {
      expect(STROOP_BANK.B[i].ink).not.toBe(a.ink);
      expect(STROOP_BANK.A2[i].ink).not.toBe(a.ink);
      expect(STROOP_BANK.A2[i].ink).not.toBe(STROOP_BANK.B[i].ink);
    });
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
  it('Corsi A/B/A2: same spans, sizes and path geometry; different cells', () => {
    checkSeqBank(CORSI_BANK.A, CORSI_BANK.B, CORSI_N);
    checkSeqBank(CORSI_BANK.A, CORSI_BANK.A2, CORSI_N);
    checkSeqBank(CORSI_BANK.B, CORSI_BANK.A2, CORSI_N);
    expect(Object.keys(CORSI_BANK.A).map(Number)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it('FlashGrid A/B/A2: same levels 2–9, sizes and path geometry; different cells', () => {
    checkSeqBank(FLASH_BANK.A, FLASH_BANK.B, FLASH_N);
    checkSeqBank(FLASH_BANK.A, FLASH_BANK.A2, FLASH_N);
    expect(Object.keys(FLASH_BANK.A).map(Number)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it('no sequence is shared between two assessment forms', () => {
    for (const bank of [CORSI_BANK, FLASH_BANK]) {
      const seen = new Map<string, string>();
      for (const f of ASSESSMENT_FORMS) {
        for (const seqs of Object.values(bank[f])) {
          for (const s of seqs) {
            const k = s.join(',');
            if (seen.has(k)) expect(seen.get(k)).toBe(f);
            seen.set(k, f);
          }
        }
      }
    }
  });
});

const shape = (r: SeriesRule) => {
  // everything except the "where it starts" parameters must match between forms
  const { start: _s, s1: _a, s2: _b, add, a: _fa, b: _fb, ...rest } = r as Record<string, number | string | undefined>;
  return r.type === 'square' ? { ...rest } : r.type === 'fib' ? { type: r.type } : { ...rest, ...(add !== undefined ? { add } : {}) };
};

describe('Series bank', () => {
  it('A, B and A2 are equated item by item: rule type, step/factor, length, answer position, magnitude', () => {
    for (const f of ['B', 'A2'] as const) {
      expect(SERIES_BANK[f].length).toBe(SERIES_BANK.A.length);
      SERIES_BANK.A.forEach((a, i) => {
        const b = SERIES_BANK[f][i];
        expect(b.rule.type).toBe(a.rule.type);
        expect(shape(b.rule)).toEqual(shape(a.rule));
        expect(b.shown.length).toBe(a.shown.length);
        expect(b.answerPos).toBe(a.answerPos);
        expect(b.tier).toBe(a.tier);
        expect(b.shown).not.toEqual(a.shown);
        expect(String(b.answer).length, `item ${i + 1} ${f}`).toBe(String(a.answer).length); // same magnitude
      });
    }
  });
  it('starts with 4 short easy items (4 shown terms, linear or ×2)', () => {
    for (const it of SERIES_BANK.A.slice(0, 4)) {
      expect(it.shown).toHaveLength(4);
      expect(['add', 'mul']).toContain(it.rule.type);
      expect(it.answer).toBeLessThan(100);
    }
  });
  it('every item (forms and training) is well-formed: correct answer, 4 unique positive options', () => {
    const banks = [...ASSESSMENT_FORMS.map((f) => SERIES_BANK[f]), ...SEEDS.slice(0, 40).map((s) => seriesBank('T', s))];
    for (const bank of banks) {
      expect(bank).toHaveLength(SERIES_LEN);
      for (const it of bank) {
        expect(it.answer).toBe(seriesTerm(it.rule, it.shown.length));
        expect(it.options).toHaveLength(4);
        expect(new Set(it.options).size).toBe(4);
        expect(it.options[it.answerPos]).toBe(it.answer);
        for (const o of [...it.options, ...it.shown]) {
          expect(Number.isInteger(o)).toBe(true);
          expect(o).toBeGreaterThan(0);
          expect(o).toBeLessThan(1000);
        }
      }
    }
  });
  it('every template has training candidates', () => {
    for (let tier = 1; tier <= SERIES_TEMPLATES.length; tier++) {
      const tiers = new Set(SEEDS.flatMap((s) => seriesBank('T', s).map((it) => it.tier)));
      expect(tiers.has(tier)).toBe(true);
    }
  });
  it('second round starts at a harder tier', () => {
    expect(seriesBank('T', 5, 5)[0].tier).toBe(5);
    expect(seriesBank('T', 5)[0].tier).toBe(1);
  });
});

describe('Go/No-Go bank', () => {
  it('A, B, A2: same length, same No-Go count per block, same ISI set per block', () => {
    for (const f of ASSESSMENT_FORMS) {
      const b = GONOGO_BANK[f];
      expect(b.length).toBe(GONOGO_BANK.A.length);
      expect(b[0].kind).toBe('go');
      expect(b[1].kind).toBe('go');
      // both No-Go of the first block by stimulus 6 → a 10 s run measures inhibition twice
      expect(b.slice(0, 6).filter((x) => x.kind === 'nogo')).toHaveLength(GNG_NOGO_PER_BLOCK);
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
    expect(GONOGO_BANK.A2.map((x) => x.kind)).not.toEqual(GONOGO_BANK.A.map((x) => x.kind));
  });
});

describe('training never uses assessment items', () => {
  it('Corsi and FlashGrid: no generated training sequence is an assessment sequence', () => {
    for (const seed of SEEDS) {
      for (const [game, bank] of [
        ['corsi', corsiBank('T', seed)],
        ['flash41', flashBank('T', seed)],
      ] as const) {
        for (const seqs of Object.values(bank)) for (const s of seqs) expect(isAssessmentSeq(game, s)).toBe(false);
      }
    }
  });
  it('Series: no training item shows an assessment item (or its answer in context)', () => {
    for (const seed of SEEDS) for (const it of seriesBank('T', seed)) expect(seriesOverlapsAssessment(it)).toBe(false);
    // sanity: the check does catch the assessment items themselves
    for (const f of ASSESSMENT_FORMS) for (const it of SERIES_BANK[f]) expect(seriesOverlapsAssessment(it)).toBe(true);
  });
  it('Stroop and Go/No-Go: training runs never repeat an assessment run', () => {
    for (const seed of SEEDS) {
      expect(stroopOverlapsAssessment(stroopBank('T', seed))).toBe(false);
      expect(gonogoOverlapsAssessment(gonogoBank('T', seed))).toBe(false);
    }
    for (const f of ASSESSMENT_FORMS) {
      expect(stroopOverlapsAssessment(STROOP_BANK[f])).toBe(true);
      expect(gonogoOverlapsAssessment(GONOGO_BANK[f])).toBe(true);
    }
  });
  it('training items vary with the seed (day and slot)', () => {
    const key = (seed: number) => seriesBank('T', seed).map((it) => it.shown.join(',')).join('|');
    expect(key(trainingSeed(20_400, 0))).not.toBe(key(trainingSeed(20_400, 1)));
    expect(key(trainingSeed(20_400, 0))).not.toBe(key(trainingSeed(20_401, 0)));
    expect(corsiBank('T', 1)[5]).not.toEqual(corsiBank('T', 2)[5]);
    expect(trainingSeed(20_400, 2)).toBe(204_002);
  });
  it('the T entries of the static banks are generated items too', () => {
    expect(stroopOverlapsAssessment(STROOP_BANK.T)).toBe(false);
    expect(gonogoOverlapsAssessment(GONOGO_BANK.T)).toBe(false);
    for (const it of SERIES_BANK.T) expect(seriesOverlapsAssessment(it)).toBe(false);
    for (const seqs of Object.values(CORSI_BANK.T)) for (const s of seqs) expect(isAssessmentSeq('corsi', s)).toBe(false);
  });
});

describe('assessment forms are equated where a short run can tell', () => {
  it('Go/No-Go: every form has exactly 2 No-Go in its first 10 stimuli (a 10 s run) and 8 in total', () => {
    for (const f of ['A', 'B', 'A2'] as const) {
      const items = GONOGO_BANK[f];
      expect(items.slice(0, 10).filter((x) => x.kind === 'nogo').length, f).toBe(2);
      expect(items.filter((x) => x.kind === 'nogo').length, f).toBe(8);
    }
  });
  it('Series: forms share tiers; no additive item steps through multiples of 5 (those are much easier)', () => {
    const tiers = (f: 'A' | 'B' | 'A2') => SERIES_BANK[f].map((x) => x.tier).join();
    expect(tiers('B')).toBe(tiers('A'));
    expect(tiers('A2')).toBe(tiers('A'));
    for (const f of ['A', 'B', 'A2'] as const) {
      for (const it of SERIES_BANK[f].filter((x) => x.rule.type === 'add')) {
        expect(it.shown.every((n) => n % 5 === 0), `${f} tier ${it.tier}`).toBe(false);
      }
    }
  });
});
