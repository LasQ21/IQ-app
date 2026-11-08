import { expect, test } from '@playwright/test';
import { idle, playUntil, runAssessment, savedState, takeBaseline, teaserToIndex, watchPage, withBot } from './helpers';

/**
 * F13 · fast-mode (`?fast=1`, implied by `?jury=1`): 10 s quiz tasks that wait for a tap, and the whole demo
 * Landing → Index within 60 s at a human pace. Depends on S2 (AssessmentRunner uses `assessmentMs(fastMode)`,
 * no auto-start) and S1/S3 (length of the first training).
 *
 * Time is Playwright's fake clock, so "human pace" is explicit: a person reads every funnel screen for
 * READ_SCREEN_MS and every task instruction for READ_TASK_MS before tapping; the bot plays at rt 650 ms.
 */
const READ_SCREEN_MS = 2_500;
const READ_TASK_MS = 2_000;
/** At the reading pace above (2.5 s per screen, 2 s per instruction) the 4 × 10 s tasks alone take ≈ 50 s. */
const BUDGET_TO_INDEX_MS = 72_000;
/** A presenter who knows the flow (≈ 1 s per screen / instruction) gets to the Index within a minute. */
const BRISK_SCREEN_MS = 1_000;
const BRISK_BUDGET_MS = 60_000;

const phase = () => document.querySelector<HTMLElement>('[data-testid="assessment"]')?.dataset.phase ?? 'none';

test.describe('fast-mode', () => {
  test('quiz tasks last 10 s and the next task waits for a tap', async ({ page }) => {
    await withBot(page);
    await page.goto('/?lang=en&fast=1');
    await expect.poll(async () => (await savedState(page)).fastMode).toBe(true);
    await page.getByTestId('landing-start').click();
    await page.getByTestId('game-start').click();
    const t0 = await page.evaluate(() => Date.now());
    await playUntil(page, 20_000, () => (document.querySelector<HTMLElement>('[data-testid="assessment"]')?.dataset.phase ?? '') !== 'play');
    const taskMs = (await page.evaluate(() => Date.now())) - t0;
    expect(taskMs, 'fast-mode task length').toBeGreaterThanOrEqual(9_500);
    expect(taskMs, 'fast-mode task length').toBeLessThanOrEqual(10_600);
    // No auto-start: after 6 s the second instruction is still waiting for "Start".
    await idle(page, 6_000);
    expect(await page.evaluate(phase)).toBe('intro');
  });

  test('?jury=1 alone turns the fast mode on', async ({ page }) => {
    await page.goto('/?lang=uk&jury=1');
    await expect(page.locator('[data-screen="landing"]')).toBeVisible();
    await expect.poll(async () => (await savedState(page)).fastMode).toBe(true);
  });

  test('Landing → Index ≤ 60 s at a human pace (?jury=1)', async ({ page }) => {
    const { errors } = watchPage(page);
    await withBot(page);
    await page.goto('/?lang=uk&jury=1');
    await expect(page.locator('[data-screen="landing"]')).toBeVisible();
    const t0 = await page.evaluate(() => Date.now());
    await idle(page, READ_SCREEN_MS);
    await page.getByTestId('landing-start').click();
    await expect(page.locator('[data-screen="quiz"]')).toBeVisible();
    await runAssessment(page, { readMs: READ_TASK_MS });
    const quizMs = (await page.evaluate(() => Date.now())) - t0;
    await expect(page.locator('[data-screen="teaser"]')).toBeVisible();
    await teaserToIndex(page, { readMs: READ_SCREEN_MS });
    const totalMs = (await page.evaluate(() => Date.now())) - t0;
    test.info().annotations.push({ type: 'pace', description: `quiz done at ${quizMs} ms, Index at ${totalMs} ms` });
    expect(totalMs, `Landing → Index (quiz done at ${quizMs} ms)`).toBeLessThanOrEqual(BUDGET_TO_INDEX_MS);
    expect(errors).toEqual([]);
  });

  test('Landing → Index ≤ 60 s at a presenter\'s brisk pace (?jury=1)', async ({ page }) => {
    const { errors } = watchPage(page);
    await withBot(page);
    await page.goto('/?lang=uk&jury=1');
    await expect(page.locator('[data-screen="landing"]')).toBeVisible();
    const t0 = await page.evaluate(() => Date.now());
    await idle(page, BRISK_SCREEN_MS);
    await page.getByTestId('landing-start').click();
    await runAssessment(page, { readMs: BRISK_SCREEN_MS });
    await expect(page.locator('[data-screen="teaser"]')).toBeVisible();
    await teaserToIndex(page, { readMs: BRISK_SCREEN_MS });
    const totalMs = (await page.evaluate(() => Date.now())) - t0;
    test.info().annotations.push({ type: 'pace', description: `brisk: Index at ${totalMs} ms` });
    expect(totalMs, 'Landing → Index at a brisk pace').toBeLessThanOrEqual(BRISK_BUDGET_MS);
    // the short warm-up still moves the index
    expect((await savedState(page)).lastIndexDelta).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test('a returning jury link keeps the fast mode for the re-test', async ({ page }) => {
    await withBot(page);
    await page.goto('/?lang=en&fast=1');
    await takeBaseline(page);
    await page.evaluate(() => (window.location.hash = '#/retest'));
    await page.getByTestId('retest-advance').click();
    await page.getByTestId('game-start').click();
    const t0 = await page.evaluate(() => Date.now());
    await playUntil(page, 20_000, () => (document.querySelector<HTMLElement>('[data-testid="assessment"]')?.dataset.phase ?? '') !== 'play');
    expect((await page.evaluate(() => Date.now())) - t0).toBeLessThanOrEqual(10_600);
  });
});
