import { ECON } from '../config';
import type { Economics } from '../state/types';

/**
 * Monthly-cohort unit economics, reconciled with the deck (slides 2, 3, 9, 13).
 *
 * charge1 = p·66% + (1−p)·15%                        (p = opened the product after paying)
 * charge k+1 = charge k · (1 − churn_k·(1 − r))        churn_k from today's curve 38/22/14/10/8/6%
 * charges 7–13: churn 26% (step ×0.74), also ×(1 − r)
 * gross LTV = $1 + $35 · Σ charges;  net = ×0.9;  ROMI = (net − CAC)/CAC
 *
 * Control values: (45%, 0) → 1.09× / +9%; (55%, 10%) → 1.39× / +39%; (60%, 10%) → 1.47× / +47%;
 * (65%, 20%) → 1.75× / +75%.
 */
export function economics(openRate: number, churnCut: number): Economics {
  const p = Math.max(0, Math.min(1, Number.isFinite(openRate) ? openRate : 0.45));
  const r = Math.max(0, Math.min(1, Number.isFinite(churnCut) ? churnCut : 0));
  const base = ECON.baseCharges;
  const charges: number[] = [p * ECON.renewOpened + (1 - p) * ECON.renewNotOpened];
  for (let k = 1; k < base.length; k++) {
    const churn = 1 - base[k] / base[k - 1];
    charges.push(charges[k - 1] * (1 - churn * (1 - r)));
  }
  const tailChurn = 1 - ECON.tailStep;
  for (let i = 0; i < ECON.tailCharges; i++) {
    charges.push(charges[charges.length - 1] * (1 - tailChurn * (1 - r)));
  }
  const sum = charges.reduce((s, c) => s + c, 0);
  const netLtv = ECON.netFactor * (ECON.trialUsd + ECON.priceUsd * sum);
  const ltvCac = netLtv / ECON.cacUsd;
  return {
    charge1: charges[0],
    charge2: charges[1],
    netLtv,
    ltvCac,
    romi: ltvCac - 1,
    romiMonthUsd: netLtv * ECON.trialsPerMonth - ECON.adBudgetUsd,
  };
}
