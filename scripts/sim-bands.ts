// Monte-Carlo error bands for the 4 assessment scores (engine/errorBands.ts ERROR_BAND / ERROR_BAND_FAST).
//
//   npx vite-node scripts/sim-bands.ts            (a few seconds; SIM_N=… to change the sample)
//
// For each skill level z ∈ {−1.5 … +1.5} (SD units, engine/sim.ts playerAt) we simulate N players whose
// skill does NOT change, each taking the assessment twice (baseline form A, re-test form B, independent
// trial noise and day state), score both with the real `normalize`, and take band = 1.645 × SD(after − before)
// (90 %: a change inside ±band is indistinguishable from noise). The final band per ability is the RMS over
// the skill levels, rounded up. Run for the 15 s quiz and the 10 s fast jury mode.
import { ASSESSMENT_MS, JURY_FAST_TASK_MS } from '../src/config';
import { normalize } from '../src/engine/scoring';
import { playerAt, simulateAssessment, AVERAGE_PLAYER } from '../src/engine/sim';
import { ABILITIES, type GameResult } from '../src/state/types';

const N = Number(process.env.SIM_N ?? 4000);
const LEVELS = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];
const sd = (xs: number[]) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

for (const [label, ms] of [
  ['15 s quiz', ASSESSMENT_MS],
  ['10 s fast mode', JURY_FAST_TASK_MS],
] as const) {
  console.log(`\n== ${label}: ${N} players × ${LEVELS.length} skill levels, unchanged skill, A → B`);
  const bandsByLevel: number[][] = ABILITIES.map(() => []);
  for (const z of LEVELS) {
    const p = playerAt(z);
    const before: number[][] = ABILITIES.map(() => []);
    const diff: number[][] = ABILITIES.map(() => []);
    for (let i = 0; i < N; i++) {
      const byAbility = (rs: GameResult[]) => ABILITIES.map((ab) => normalize(rs.find((r) => r.ability === ab)!));
      const a = byAbility(simulateAssessment(p, 'A', 10_000 + i, ms));
      const b = byAbility(simulateAssessment(p, 'B', 5_000_000 + i, ms));
      a.forEach((s, k) => {
        before[k].push(s);
        diff[k].push(b[k] - s);
      });
    }
    const row = ABILITIES.map((ab, k) => {
      const band = 1.645 * sd(diff[k]);
      bandsByLevel[k].push(band);
      return `${ab} ${mean(before[k]).toFixed(0)}±${band.toFixed(1)}`;
    });
    console.log(`z=${z >= 0 ? '+' : ''}${z}`.padEnd(6), row.join(' | '));
  }
  const final = Object.fromEntries(ABILITIES.map((ab, k) => [ab, Math.ceil(Math.sqrt(mean(bandsByLevel[k].map((b) => b * b))))]));
  console.log('band (RMS over levels, rounded up):', JSON.stringify(final));
}
console.log('\naverage player:', JSON.stringify(AVERAGE_PLAYER));
