import { expect, test } from '@playwright/test';
import { numbersIn, setRange, watchPage } from './helpers';

/**
 * F4 · economics. "Loop economics" (`#/economics`) shows the deck's values at the four slider presets
 * (plan S2-3; engine/economics.ts). Depends on S2. Test ids the screen must expose:
 *   econ-opened  <input type="range"> "Opened the product after paying", 45–65 (%; a 0.45–0.65 fraction also works)
 *   econ-churn   <input type="range"> "Lower churn between charges", 0–20
 *   econ-ltvcac  LTV/CAC, e.g. "1.09×"           econ-romi  ROMI, e.g. "+9%"
 *   econ-charge1 charge 1 share, e.g. "38%"       econ-charge2 charge 2 share, e.g. "22%"
 */
const PRESETS: { opened: number; churn: number; ltvCac: string; romi: string }[] = [
  { opened: 45, churn: 0, ltvCac: '1.09', romi: '9' },
  { opened: 55, churn: 10, ltvCac: '1.39', romi: '39' },
  { opened: 60, churn: 10, ltvCac: '1.47', romi: '47' },
  { opened: 65, churn: 20, ltvCac: '1.75', romi: '75' },
];

test.describe('economics', () => {
  test('Loop economics shows LTV/CAC 1.09/1.39/1.47/1.75 and ROMI +9/+39/+47/+75% at the presets', async ({ page }) => {
    const { errors } = watchPage(page);
    await page.goto('/?lang=en#/economics');
    await expect(page.getByTestId('econ-opened')).toBeVisible();
    for (const p of PRESETS) {
      await setRange(page, 'econ-opened', p.opened);
      await setRange(page, 'econ-churn', p.churn);
      await expect.poll(async () => numbersIn((await page.getByTestId('econ-ltvcac').textContent()) ?? ''), `LTV/CAC at ${p.opened}% / ${p.churn}%`).toContain(p.ltvCac);
      const romi = (await page.getByTestId('econ-romi').textContent()) ?? '';
      expect(romi, `ROMI at ${p.opened}% / ${p.churn}%`).toContain('+');
      expect(numbersIn(romi)).toContain(p.romi);
    }
    // today's baseline: charge 1 ≈ 38%, charge 2 ≈ 22%
    await setRange(page, 'econ-opened', 45);
    await setRange(page, 'econ-churn', 0);
    await expect.poll(async () => numbersIn((await page.getByTestId('econ-charge1').textContent()) ?? '')).toContain('38');
    expect(numbersIn((await page.getByTestId('econ-charge2').textContent()) ?? '')).toContain('22');
    expect(errors).toEqual([]);
  });

  test('works without a baseline and in all languages', async ({ page }) => {
    for (const lang of ['ja', 'uk', 'en']) {
      await page.goto(`/?lang=${lang}#/economics`);
      await expect(page.getByTestId('econ-ltvcac')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    }
  });

  test('the landing jury strip links to Loop economics', async ({ page }) => {
    await page.goto('/?lang=en&jury=1');
    await page.locator('[data-screen="landing"] aside a[href="#/economics"]').click();
    await expect(page.getByTestId('econ-ltvcac')).toBeVisible();
  });
});
