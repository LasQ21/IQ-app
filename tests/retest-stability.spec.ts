import { expect, test, type Browser } from '@playwright/test';
import { classifyChange } from '../src/engine/errorBands';
import type { Ability, Profile } from '../src/state/types';
import { ABILITIES, runAssessment, savedState, takeBaseline, withBot } from './helpers';

/**
 * F1 · retest-stability. A bot with IDENTICAL skills takes the baseline and the re-test on 12 seeds
 * (the real games, form A then B, fast mode). Nothing changed, so the re-test must say so:
 * - ≥ 10 of every 12 ability comparisons are "Stable" (≥ 40 of 48), classified with the engine's error bands
 *   (and, once S2 adds `data-cls` on `retest-delta-<ability>`, the screen must show the same class);
 * - the weak zone is unchanged in ≥ 10 of 12 runs (reducer uses `weakestStable`).
 * Depends on S1 (bands, Corsi/Series reliability, forms) and S2 (Retest screen, reducer).
 */
const SEEDS = Array.from({ length: 12 }, (_, i) => 1000 + i * 7919);
const CONCURRENCY = 4;

interface Run {
  seed: number;
  baseline: Profile;
  retest: Profile;
  weakBefore: Ability;
  weakAfter: Ability;
  uiCls: Partial<Record<Ability, string>>;
}

async function oneRun(browser: Browser, baseURL: string, seed: number): Promise<Run> {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await withBot(page, { seed });
    await page.goto('/?lang=en&fast=1');
    await takeBaseline(page);
    await page.evaluate(() => (window.location.hash = '#/retest'));
    await page.getByTestId('retest-advance').click();
    await runAssessment(page);
    await expect(page.getByTestId('retest-result')).toBeVisible();
    const s = await savedState(page);
    const uiCls: Partial<Record<Ability, string>> = {};
    for (const a of ABILITIES) {
      const cls = await page.getByTestId(`retest-delta-${a}`).getAttribute('data-cls');
      if (cls) uiCls[a] = cls;
    }
    return { seed, baseline: s.baseline, retest: s.retest, weakBefore: s.baseline.weakest, weakAfter: (s.current ?? s.retest).weakest, uiCls };
  } finally {
    await context.close();
  }
}

test.describe('retest-stability', () => {
  test('identical skills on 12 seeds: ≥ 10/12 abilities "Stable", weak zone kept', async ({ browser, baseURL }) => {
    test.setTimeout(900_000);
    const runs: Run[] = [];
    const queue = [...SEEDS];
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let seed = queue.shift(); seed !== undefined; seed = queue.shift()) runs.push(await oneRun(browser, baseURL!, seed));
      }),
    );
    runs.sort((a, b) => a.seed - b.seed);

    let stable = 0;
    let weakKept = 0;
    const lines: string[] = [];
    const uiMismatch: string[] = [];
    for (const r of runs) {
      const changes = classifyChange(r.baseline, r.retest);
      stable += changes.filter((c) => c.cls === 'stable').length;
      if (r.weakAfter === r.weakBefore) weakKept++;
      for (const c of changes) {
        if (r.uiCls[c.ability] && r.uiCls[c.ability] !== c.cls) uiMismatch.push(`seed ${r.seed} ${c.ability}: UI ${r.uiCls[c.ability]} ≠ ${c.cls}`);
      }
      lines.push(
        `seed ${r.seed}: ` +
          changes.map((c) => `${c.ability} ${c.before}→${c.after} (${c.delta >= 0 ? '+' : ''}${c.delta}/±${c.band} ${c.cls})`).join(', ') +
          ` · weak ${r.weakBefore}→${r.weakAfter}`,
      );
    }
    const total = runs.length * ABILITIES.length;
    test.info().annotations.push({ type: 'retest', description: `stable ${stable}/${total}, weak kept ${weakKept}/${runs.length}\n${lines.join('\n')}` });
    console.log(`retest-stability: stable ${stable}/${total}, weak kept ${weakKept}/${runs.length}\n${lines.join('\n')}`);

    expect(runs).toHaveLength(SEEDS.length);
    expect(uiMismatch, 'Retest screen class ≠ engine class').toEqual([]);
    expect(stable / total, `share of "Stable" (${stable}/${total})`).toBeGreaterThanOrEqual(10 / 12);
    expect(weakKept, 'runs with an unchanged weak zone').toBeGreaterThanOrEqual(10);
  });
});
