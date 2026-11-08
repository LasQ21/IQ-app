import { describe, expect, it } from 'vitest';
import { economics } from './economics';

describe('economics (deck slide 9)', () => {
  const cases: [number, number, number, number][] = [
    [0.45, 0, 1.09, 0.09],
    [0.55, 0.1, 1.39, 0.39],
    [0.6, 0.1, 1.47, 0.47],
    [0.65, 0.2, 1.75, 0.75],
  ];
  it.each(cases)('open %f, churn cut %f → LTV/CAC %f, ROMI %f', (p, r, ltvCac, romi) => {
    const e = economics(p, r);
    expect(Math.abs(e.ltvCac - ltvCac)).toBeLessThan(0.01);
    expect(Math.abs(e.romi - romi)).toBeLessThan(0.01);
  });
  it('today: charge 1 ≈ 38%, charge 2 ≈ 22%, ≈ +$28k / month', () => {
    const e = economics(0.45, 0);
    expect(e.charge1).toBeCloseTo(0.38, 2);
    expect(e.charge2).toBeCloseTo(0.22, 2);
    expect(e.romiMonthUsd).toBeGreaterThan(26_000);
    expect(e.romiMonthUsd).toBeLessThan(30_000);
  });
  it('is safe on garbage input', () => {
    expect(Number.isFinite(economics(NaN, NaN).ltvCac)).toBe(true);
  });
});
