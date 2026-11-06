import { expect, test, type Page } from '@playwright/test';

/**
 * Smoke test of the whole retention loop (screens 1 → 12) at 390×844.
 * Uses Playwright's fake clock to fast-forward the 15-second assessment tasks.
 */

const ABILITIES = ['memory', 'attention', 'logic', 'speed'] as const;

function watchPage(page: Page) {
  const errors: string[] = [];
  const foreign: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.hostname === 'localhost') return;
    if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') return;
    if (u.protocol === 'data:' || u.protocol === 'blob:') return;
    foreign.push(r.url());
  });
  return { errors, foreign };
}

async function runAssessment(page: Page) {
  for (let i = 0; i < 4; i++) {
    await page.getByTestId('game-start').click();
    await page.clock.runFor(16_000);
  }
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const lang of ['ja', 'uk', 'en'] as const) {
  test(`full loop · ${lang}`, async ({ page }) => {
    const { errors, foreign } = watchPage(page);
    await page.clock.install();
    await page.goto(`/?lang=${lang}`);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.getByTestId('brand')).toContainText('CC-146');

    // 1 Landing
    await expect(page.locator('[data-screen="landing"]')).toBeVisible();
    await noHorizontalScroll(page);
    await page.getByTestId('landing-start').click();

    // 2 Quiz (4 × 15 s)
    await expect(page.locator('[data-screen="quiz"]')).toBeVisible();
    await runAssessment(page);

    // 3 Teaser — radar, no IQ number
    await expect(page.locator('[data-screen="teaser"]')).toBeVisible();
    await expect(page.locator('[data-screen="teaser"]')).not.toContainText(/IQ\s*[=:＝]/);
    await noHorizontalScroll(page);
    await page.getByTestId('teaser-next').click();

    // 4 Paywall — disclaimer, no payment
    await expect(page.locator('[data-screen="paywall"]')).toBeVisible();
    await expect(page.getByTestId('disclaimer')).toBeVisible();
    await expect(page.locator('[data-screen="paywall"]')).toContainText('150');
    await noHorizontalScroll(page);
    await page.getByTestId('paywall-start').click();

    // 5 Onboarding → 7 FlashGrid
    await expect(page.locator('[data-screen="onboarding"]')).toBeVisible();
    await page.getByTestId('onboarding-start').click();
    await expect(page.locator('[data-screen="flash41"]')).toBeVisible();
    await page.getByTestId('game-start').click();
    await page.clock.runFor(1_000);
    await page.getByTestId('game-finish').click();

    // 8 IndexStreak — index grew
    await expect(page.locator('[data-screen="index"]')).toBeVisible();
    await expect(page.getByTestId('index-delta')).toContainText('+');
    await page.clock.runFor(2_000);
    await page.getByTestId('index-continue').click();

    // 9 LINE mock
    await expect(page.locator('[data-screen="line"]')).toBeVisible();
    await page.clock.runFor(1_500);
    await page.getByTestId('line-notification').click();

    // 6 TodayPlan
    await expect(page.locator('[data-screen="today"]')).toBeVisible();
    await expect(page.getByTestId('plan-item')).toHaveCount(3);
    await expect(page.locator('[data-testid="plan-item"][data-done="true"]')).toHaveCount(1);
    await noHorizontalScroll(page);

    // jury mode strip
    await page.getByTestId('jury-toggle').click();
    await expect(page.locator('[data-screen="today"] aside')).toBeVisible();
    await page.getByTestId('jury-toggle').click();

    // 10 Retest on form B
    await page.getByTestId('today-retest').click();
    await expect(page.locator('[data-screen="retest"]')).toBeVisible();
    await page.getByTestId('retest-advance').click();
    await runAssessment(page);
    for (const a of ABILITIES) await expect(page.getByTestId(`retest-delta-${a}`)).toBeVisible();
    await expect(page.getByTestId('disclaimer')).toBeVisible();

    // 11 Weekly report
    await page.goto(`/?lang=${lang}#/report`);
    await expect(page.getByTestId('report-root')).toBeVisible();
    await noHorizontalScroll(page);

    // 12 Reset demo
    await page.getByTestId('tab-profile').click();
    await expect(page.locator('[data-screen="profile"]')).toBeVisible();
    await page.getByTestId('profile-reset').click();
    await page.getByTestId('profile-reset-confirm').click();
    await expect(page.locator('[data-screen="landing"]')).toBeVisible();

    expect(errors, 'console errors').toEqual([]);
    expect(foreign, 'unexpected network requests').toEqual([]);
  });
}

test('works offline after first open', async ({ page, context }) => {
  await page.goto('/?lang=uk');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-screen="landing"]')).toBeVisible();
  await context.setOffline(false);
});
