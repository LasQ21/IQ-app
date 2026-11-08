// Population norms (mean, SD) of the 4 assessment scores, used to pick the weak zone on standardised scores
// (engine/scoring.ts POP_NORMS / POP_NORMS_FAST), so no ability is the "weak zone" more often by construction.
//
//   npx vite-node scripts/sim-norms.ts          (N players with skill z ~ N(0, 1) per ability, independent)
import { ASSESSMENT_MS, JURY_FAST_TASK_MS } from '../src/config';
import { normalize } from '../src/engine/scoring';
import { playerAt, simulateAssessment } from '../src/engine/sim';
import { ABILITIES, type Ability } from '../src/state/types';

const N = Number(process.env.SIM_N ?? 4000);
let s = 12345;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
for (const [label, ms] of [
  ['15 s', ASSESSMENT_MS],
  ['10 s', JURY_FAST_TASK_MS],
] as const) {
  const xs: number[][] = ABILITIES.map(() => []);
  for (let i = 0; i < N; i++) {
    const z = Object.fromEntries(ABILITIES.map((a) => [a, gauss()])) as Record<Ability, number>;
    const rs = simulateAssessment(playerAt(z), 'A', 777_000 + i, ms);
    ABILITIES.forEach((a, k) => xs[k].push(normalize(rs.find((r) => r.ability === a)!)));
  }
  const out = Object.fromEntries(
    ABILITIES.map((a, k) => {
      const m = xs[k].reduce((p, q) => p + q, 0) / N;
      const sd = Math.sqrt(xs[k].reduce((p, q) => p + (q - m) ** 2, 0) / (N - 1));
      return [a, { mean: Math.round(m), sd: Math.round(sd) }];
    }),
  );
  console.log(label, JSON.stringify(out));
}
