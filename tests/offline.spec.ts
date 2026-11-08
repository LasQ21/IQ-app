import { expect, test } from '@playwright/test';
import { BOT } from './bot.js';
import { indexToToday, runAssessment, savedState, takeBaseline, teaserToIndex, watchPage } from './helpers';

/**
 * offline-loop: after one online visit (SW installed, precache done), the whole loop works with no network —
 * quiz → teaser → paywall → onboarding → training → Index → LINE → Today → re-test → report → profile.
 */
test.describe('offline-loop', () => {
  test('whole loop offline after the first open', async ({ page, context }) => {
    const { errors, failed, foreign } = watchPage(page);
    await page.goto('/?lang=uk');
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 30_000 }).toBe(true);

    await page.addInitScript(BOT);
    await page.clock.install();
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('[data-screen="landing"]')).toBeVisible();

    await takeBaseline(page);
    await teaserToIndex(page);
    await indexToToday(page);
    await page.getByTestId('today-retest').click();
    await page.getByTestId('retest-advance').click();
    await runAssessment(page);
    await expect(page.getByTestId('retest-result')).toBeVisible();
    await page.evaluate(() => (window.location.hash = '#/report'));
    await expect(page.getByTestId('report-root')).toBeVisible();
    await page.getByTestId('tab-profile').click();
    await expect(page.locator('[data-screen="profile"]')).toBeVisible();
    // and a cold start while offline lands on the saved progress
    await page.reload();
    await expect(page.locator('#root')).not.toBeEmpty();
    expect((await savedState(page)).retest).toBeTruthy();

    await context.setOffline(false);
    expect(errors, 'console errors').toEqual([]);
    expect(failed, 'failed requests while offline').toEqual([]);
    expect(foreign).toEqual([]);
  });
});
