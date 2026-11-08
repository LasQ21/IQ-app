import { expect, test, type Page } from '@playwright/test';
import { BOT, play } from './bot.js';
import { runAssessment } from './helpers';

/**
 * Smoke test of the whole retention loop (screens 1 → 12) at 390×844, in ja / uk / en.
 * A scripted player (tests/bot.js) really plays every game on Playwright's fake clock.
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
    if (u.hostname === 'localhost' || u.protocol === 'data:' || u.protocol === 'blob:') return;
    foreign.push(r.url());
  });
  return { errors, foreign };
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Every visible button/link/role=button is at least 44×44 px (WCAG 2.5.5 target used by the brief). */
async function tapTargetsOk(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, a[href], [role="button"]')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && (r.width < 44 || r.height < 44))
      .map(({ el, r }) => `${el.dataset.testid ?? el.textContent?.trim().slice(0, 20)} ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(small, 'tap targets < 44 px').toEqual([]);
}

/** FlashGrid №41 from its intro: play until the Index screen, the adaptive level must grow. */
async function flashLevelGrows(page: Page) {
  await expect(page.locator('[data-screen="flash41"]')).toBeVisible();
  // The mechanism under test is the staircase (2 correct → level up), not the bot's luck: a strong player here.
  const acc = await page.evaluate(() => {
    const b = window.__bot!;
    const prev = b.skill.acc;
    b.skill.acc = 0.95;
    return prev;
  });
  await page.getByTestId('game-start').click();
  const level = page.getByTestId('flash-level');
  const startLevel = Number(await level.getAttribute('data-level'));
  let maxLevel = startLevel;
  await play(page, 46_000, async () => {
    if ((await page.locator('[data-screen="index"]').count()) > 0) return true;
    const l = Number((await level.getAttribute('data-level', { timeout: 1_000 }).catch(() => null)) ?? 0);
    maxLevel = Math.max(maxLevel, l);
    return false;
  });
  await page.evaluate((v) => (window.__bot!.skill.acc = v), acc);
  expect(maxLevel, 'FlashGrid level should grow').toBeGreaterThan(startLevel);
  await expect(page.locator('[data-screen="index"]')).toBeVisible();
}

/** Day-1 streak: `data-streak="1"` (S3: text becomes "Streak started"), or the digit before S3 lands. */
async function streakIsOne(page: Page) {
  const tile = page.getByTestId('index-streak');
  const own = await tile.getAttribute('data-streak');
  const inner = await tile.locator('[data-streak]').first().getAttribute('data-streak', { timeout: 1_000 }).catch(() => null);
  const n = own ?? inner;
  if (n !== null) expect(n).toBe('1');
  else await expect(tile).toContainText('1');
}

for (const lang of ['ja', 'uk', 'en'] as const) {
  test(`full loop · ${lang}`, async ({ page }) => {
    const { errors, foreign } = watchPage(page);
    await page.addInitScript(BOT);
    await page.clock.install();
    await page.goto(`/?lang=${lang}`);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.getByTestId('brand')).toContainText('CC-146');
    await expect(page).not.toHaveURL(/lang=/); // the deep-link flag is consumed

    // 1 Landing
    await expect(page.locator('[data-screen="landing"]')).toBeVisible();
    await noHorizontalScroll(page);
    await tapTargetsOk(page);
    await page.getByTestId('landing-start').click();

    // 2 Quiz (4 × 15 s, played by the bot)
    await expect(page.locator('[data-screen="quiz"]')).toBeVisible();
    await runAssessment(page);

    // 3 Teaser — radar, weak zone, no IQ number
    const teaser = page.locator('[data-screen="teaser"]');
    await expect(teaser).toBeVisible();
    await expect(teaser).not.toContainText(/IQ\s*[=:＝]/);
    await expect(page.getByTestId('teaser-weak')).toHaveAttribute('data-ability', /memory|attention|logic|speed/);
    await noHorizontalScroll(page);
    await page.getByTestId('teaser-next').click();

    // 4 Paywall — price, disclaimer, no payment
    await expect(page.locator('[data-screen="paywall"]')).toBeVisible();
    await expect(page.getByTestId('disclaimer')).toBeVisible();
    await expect(page.locator('[data-screen="paywall"]')).toContainText('¥150');
    await expect(page.locator('[data-screen="paywall"]')).toContainText('¥5,250');
    await noHorizontalScroll(page);
    await tapTargetsOk(page);
    await page.getByTestId('paywall-start').click();

    // 5 Onboarding → first training (FlashGrid №41, or — after S3 — the weak-zone game) → Index
    await expect(page.locator('[data-screen="onboarding"]')).toBeVisible();
    const firstGame = (await page.getByTestId('onboarding-start').getAttribute('data-game')) ?? 'flash41';
    await page.getByTestId('onboarding-start').click();
    if (firstGame === 'flash41') {
      await flashLevelGrows(page);
    } else {
      await page.getByTestId('game-start').click();
      await play(page, 60_000, async () => (await page.locator('[data-screen="index"]').count()) > 0);
    }

    // 8 IndexStreak — index grew, streak = 1
    await expect(page.locator('[data-screen="index"]')).toBeVisible();
    const delta = Number(await page.getByTestId('index-delta').getAttribute('data-delta'));
    expect(delta).toBeGreaterThan(0);
    await expect(page.getByTestId('index-delta')).toContainText('+');
    await streakIsOne(page);
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
    await tapTargetsOk(page);

    // language switch on a deep screen persists across reload
    const other = lang === 'uk' ? 'en' : 'uk';
    await page.getByTestId(`lang-${other}`).click();
    await expect(page.locator('html')).toHaveAttribute('lang', other);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', other);
    await page.getByTestId(`lang-${lang}`).click();

    // jury mode strip: reason · metric · goal
    await page.getByTestId('jury-toggle').click();
    await expect(page.locator('[data-screen="today"] aside')).toBeVisible();
    await expect(page.locator('[data-screen="today"]')).toHaveAttribute('data-reason', /15%/);
    await page.getByTestId('jury-toggle').click();

    // 10 Retest on form B, deltas vs baseline
    await page.getByTestId('today-retest').click();
    await expect(page.locator('[data-screen="retest"]')).toBeVisible();
    await page.getByTestId('retest-advance').click();
    await runAssessment(page);
    for (const a of ABILITIES) {
      const d = page.getByTestId(`retest-delta-${a}`);
      await expect(d).toBeVisible();
      expect(Number.isFinite(Number(await d.getAttribute('data-delta')))).toBe(true);
    }
    await expect(page.getByTestId('disclaimer')).toBeVisible();
    await noHorizontalScroll(page);

    // 11 Weekly report
    await page.evaluate(() => (window.location.hash = '#/report'));
    await expect(page.getByTestId('report-root')).toBeVisible();
    await noHorizontalScroll(page);

    // 7 FlashGrid №41 (if onboarding started with another game): the level grows while playing
    if (firstGame !== 'flash41') {
      await page.evaluate(() => (window.location.hash = '#/play/flash41?from=today'));
      await flashLevelGrows(page);
    }

    // 12 Reset demo
    await page.getByTestId('tab-profile').click();
    await expect(page.locator('[data-screen="profile"]')).toBeVisible();
    await page.getByTestId('profile-reset').click();
    await page.getByTestId('profile-reset-confirm').click();
    await expect(page.locator('[data-screen="landing"]')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cc146-wittio-v1') ?? '{}').baseline)).toBeUndefined();

    expect(errors, 'console errors').toEqual([]);
    expect(foreign, 'unexpected network requests').toEqual([]);
  });
}

test('?jury=1 deep link shows the strip on the landing page', async ({ page }) => {
  await page.goto('/?lang=uk&jury=1');
  await expect(page.locator('[data-screen="landing"] aside')).toBeVisible();
});

test('works when localStorage throws', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
  });
  await page.goto('/?lang=uk');
  await page.getByTestId('landing-start').click();
  await expect(page.locator('[data-screen="quiz"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('works offline after the first open', async ({ page, context }) => {
  await page.goto('/?lang=uk');
  // first open only: wait until the service worker has precached and taken control (clientsClaim)
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30_000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-screen="landing"]')).toBeVisible();
  await page.getByTestId('landing-start').click();
  await expect(page.locator('[data-screen="quiz"]')).toBeVisible();
  await context.setOffline(false);
});
