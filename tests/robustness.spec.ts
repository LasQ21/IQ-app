import { expect, test } from '@playwright/test';
import { idle, runAssessment, savedState, takeBaseline, watchPage, withBot } from './helpers';

/**
 * F17/F18 + interruptions: re-scanning the QR mid-funnel, two tabs, back gesture and reload during the re-test.
 * `tab-sync` and `retest-recovery` cover S5's own code; `rescan` needs S3's "Continue" on Landing.
 */

test.describe('rescan', () => {
  test('opening /?lang=uk&jury=1 again mid-funnel keeps progress and offers "Continue"', async ({ page }) => {
    await withBot(page);
    await page.goto('/?lang=uk&jury=1');
    await takeBaseline(page);
    const before = await savedState(page);
    expect(before.baseline).toBeTruthy();

    await page.goto('/?lang=uk&jury=1'); // the jury scans the QR code again
    await expect(page.locator('[data-screen="landing"]')).toBeVisible();
    const after = await savedState(page);
    expect(after.baseline).toEqual(before.baseline);
    expect(after.results).toHaveLength(before.results.length);

    // S3-6: primary "Continue" for any stage after the baseline → that stage's screen (here: the teaser);
    // "Take the test again" (landing-restart) needs a confirmation, so landing-start is not offered directly.
    await expect(page.getByTestId('landing-start')).toHaveCount(0);
    await page.locator('[data-testid="landing-continue"], [data-testid="landing-resume"]').first().click();
    await expect(page.locator('[data-screen="teaser"]')).toBeVisible();
  });
});

test.describe('tab-sync', () => {
  test('two tabs: changes in one are adopted by the other, never overwritten', async ({ context }) => {
    const a = await context.newPage();
    const b = await context.newPage();
    const errs = [watchPage(a).errors, watchPage(b).errors];
    await withBot(a);
    await a.goto('/?lang=uk');
    await b.goto('/');
    await expect(b.locator('html')).toHaveAttribute('lang', 'uk'); // B read A's saved language

    // B switches the language → A follows (storage event), and A's next save keeps it
    await b.getByTestId('lang-en').click();
    await expect(a.locator('html')).toHaveAttribute('lang', 'en');
    await a.getByTestId('jury-toggle').click();
    await expect(b.locator('[data-screen="landing"] aside')).toBeVisible();
    expect((await savedState(a)).lang).toBe('en');
    expect((await savedState(b)).juryMode).toBe(true);

    // A takes the test → B (still on landing) has the baseline and can open the teaser
    await takeBaseline(a);
    await expect.poll(async () => !!(await savedState(b)).baseline).toBe(true);
    await b.evaluate(() => (window.location.hash = '#/teaser'));
    await expect(b.locator('[data-screen="teaser"]')).toBeVisible();
    // an action in B after the sync must not drop A's baseline
    await b.getByTestId('lang-uk').click();
    const s = await savedState(a);
    expect(s.baseline).toBeTruthy();
    expect(s.lang).toBe('uk');
    await expect(a.locator('html')).toHaveAttribute('lang', 'uk');
    expect(errs.flat()).toEqual([]);
  });
});

test.describe('retest-recovery', () => {
  test('back gesture and reload in the middle of the re-test keep the data consistent', async ({ page }) => {
    const { errors } = watchPage(page);
    await withBot(page);
    await page.goto('/?lang=en&fast=1');
    await takeBaseline(page);
    await page.evaluate(() => (window.location.hash = '#/today'));
    await expect(page.locator('[data-screen="today"]')).toBeVisible();
    await page.getByTestId('today-retest').click();
    await expect(page.locator('[data-screen="retest"]')).toBeVisible();

    // start the re-test, play 2 s, then swipe back
    await page.getByTestId('retest-advance').click();
    await page.getByTestId('game-start').click();
    await idle(page, 2_000);
    const offset = (await savedState(page)).demoDayOffset;
    await page.goBack();
    await expect(page.locator('[data-screen="today"]')).toBeVisible();
    let s = await savedState(page);
    expect(s.baseline).toBeTruthy();
    expect(s.retest).toBeUndefined();

    // forward again → the re-test is due now (no second clock jump); start, play 2 s, reload
    await page.goForward();
    await expect(page.locator('[data-screen="retest"]')).toBeVisible();
    await page.getByTestId('retest-advance').click();
    await page.getByTestId('game-start').click();
    await idle(page, 2_000);
    await page.reload();
    await expect(page.locator('[data-screen="retest"]')).toBeVisible();
    s = await savedState(page);
    expect(s.retest).toBeUndefined();
    expect(s.demoDayOffset).toBe(offset);

    // finish it properly this time
    await page.getByTestId('retest-advance').click();
    await runAssessment(page);
    await expect(page.getByTestId('retest-result')).toBeVisible();
    s = await savedState(page);
    expect(s.retest).toBeTruthy();
    expect(s.demoDayOffset).toBe(offset);
    expect(errors).toEqual([]);
  });
});
