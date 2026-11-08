import { expect, test, type Page } from '@playwright/test';
import { idle, playUntil, takeBaseline, withBot } from './helpers';

/**
 * F3 · layout-fit (runs in the `iphone-664` project: iPhone 13 profile, visible height 664 like Safari with its
 * toolbars). Every game control must be inside the viewport while the game runs — with the jury strip on, and on
 * an iPhone SE (375×553) without it. Depends on S3 (`Screen hideJury` during play, game size limits).
 */

const GAMES = ['stroop', 'corsi', 'series', 'gonogo', 'flash41'] as const;

/** Controls of the running game that stick out of the viewport (empty = all visible). */
async function offscreenControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const game = document.querySelector('[data-testid="game"]');
    if (!game) return ['no [data-testid="game"] on screen'];
    const h = window.innerHeight;
    const w = window.innerWidth;
    const sel = 'button, [data-cell], [data-color], [data-value], [data-testid="gonogo-stage"], [data-testid="stroop-word"], [data-testid="series-seq"]';
    return [...game.querySelectorAll<HTMLElement>(sel)]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height > 0)
      .filter(({ r }) => r.top < -0.5 || r.bottom > h + 0.5 || r.left < -0.5 || r.right > w + 0.5)
      .map(({ el, r }) => {
        const id = el.dataset.testid ?? (el.dataset.cell !== undefined ? `cell ${el.dataset.cell}` : el.textContent?.trim().slice(0, 16));
        return `${game.getAttribute('data-game')}: ${id} top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} (viewport ${w}×${h})`;
      });
  });
}

async function checkAllGames(page: Page, query: string) {
  const problems: string[] = [];
  await withBot(page);
  await page.goto(`/?lang=uk${query}`);

  // Assessment mode: the 4 quiz tasks.
  await page.getByTestId('landing-start').click();
  for (let i = 0; i < 4; i++) {
    await page.getByTestId('game-start').click();
    await idle(page, 900); // first stimulus / grid on screen
    problems.push(...(await offscreenControls(page)));
    await playUntil(page, 25_000, () => {
      const el = document.querySelector<HTMLElement>('[data-testid="assessment"]');
      return !el || el.dataset.phase !== 'play';
    });
  }
  await expect(page.locator('[data-screen="teaser"]')).toBeVisible();

  // Training mode: every game from Today's plan.
  for (const id of GAMES) {
    await page.evaluate((g) => (window.location.hash = `#/play/${g}?from=today`), id);
    await page.getByTestId('game-start').click();
    await idle(page, 900);
    problems.push(...(await offscreenControls(page)));
    await page.evaluate(() => (window.location.hash = '#/today'));
    await expect(page.getByTestId('game')).toHaveCount(0);
  }
  expect(problems, 'game controls outside the visible viewport').toEqual([]);
}

test.describe('layout-fit', () => {
  test('390×664 with the jury strip (?jury=1): all game controls visible', async ({ page }) => {
    expect(page.viewportSize()).toEqual({ width: 390, height: 664 });
    await checkAllGames(page, '&jury=1');
  });

  test.describe('iPhone SE 375×553', () => {
    test.use({ viewport: { width: 375, height: 553 } });
    test('without jury: all game controls visible', async ({ page }) => {
      await checkAllGames(page, '');
    });
  });

  test.describe('phone in landscape 844×390', () => {
    test.use({ viewport: { width: 844, height: 390 } });
    test('all game controls visible', async ({ page }) => {
      await checkAllGames(page, '');
    });
  });

  test('no horizontal scroll on the funnel at 390×664 with jury', async ({ page }) => {
    await withBot(page);
    await page.goto('/?lang=uk&jury=1');
    await expect(page.locator('[data-screen="landing"] aside')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await takeBaseline(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});
