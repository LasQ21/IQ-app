import { expect, test, type Page } from '@playwright/test';
import { buildTo, serve } from './sw-server.js';
import { watchPage } from './helpers';

/**
 * F12 · sw-update. Two production builds ("A" and "B", differing in the APP_BUILD constant → new bundle and
 * new sw.js) behind one static server; switching the server root = a deploy. Real timers (no fake clock).
 * - On the landing page the new version activates and the page reloads into it.
 * - During the quiz the page never reloads; the update waits and is applied once the user is back on landing.
 */
test.describe('sw-update', () => {
  test.describe.configure({ mode: 'serial' });
  let dirA = '';
  let dirB = '';
  let server: Awaited<ReturnType<typeof serve>>;

  test.beforeAll(async () => {
    test.setTimeout(240_000);
    dirA = buildTo('A');
    dirB = buildTo('B');
    server = await serve(dirA);
  });
  test.afterAll(async () => {
    await server?.close();
  });

  const controlled = (page: Page) => page.evaluate(() => !!navigator.serviceWorker.controller);
  const checkForUpdate = (page: Page) =>
    page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update();
    });
  const hasWaitingWorker = (page: Page) =>
    page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting);

  test('landing: a new deploy activates and reloads into the new version', async ({ page }) => {
    server.setRoot(dirA);
    const { errors } = watchPage(page);
    await page.goto(`${server.url}/?lang=en`);
    await expect(page.locator('html')).toHaveAttribute('data-build', 'A');
    await expect.poll(() => controlled(page), { timeout: 30_000 }).toBe(true);

    server.setRoot(dirB); // deploy
    await checkForUpdate(page);
    await expect(page.locator('html')).toHaveAttribute('data-build', 'B', { timeout: 30_000 });
    await expect(page.locator('[data-screen="landing"]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('quiz: never reloads while playing; updates once back on landing', async ({ page }) => {
    server.setRoot(dirA);
    await page.goto(`${server.url}/?lang=en&fast=1`);
    await expect(page.locator('html')).toHaveAttribute('data-build', 'A');
    await expect.poll(() => controlled(page), { timeout: 30_000 }).toBe(true);

    await page.getByTestId('landing-start').click();
    await page.getByTestId('game-start').click();
    await expect(page.getByTestId('assessment')).toHaveAttribute('data-phase', 'play');
    await page.evaluate(() => ((window as unknown as { __samePage: boolean }).__samePage = true));

    server.setRoot(dirB); // deploy in the middle of the quiz
    await checkForUpdate(page);
    await expect.poll(() => hasWaitingWorker(page), { timeout: 30_000 }).toBe(true);
    await expect(page.locator('html')).toHaveAttribute('data-sw-update', 'waiting');
    await page.waitForTimeout(3_000);
    // still the same document, same build, new worker still waiting
    expect(await page.evaluate(() => (window as unknown as { __samePage?: boolean }).__samePage)).toBe(true);
    await expect(page.locator('html')).toHaveAttribute('data-build', 'A');
    expect(await hasWaitingWorker(page)).toBe(true);
    await expect(page.locator('[data-screen="quiz"]')).toBeVisible();

    // leave the quiz → landing is safe → activate + reload into B
    await page.evaluate(() => (window.location.hash = '#/'));
    await expect(page.locator('html')).toHaveAttribute('data-build', 'B', { timeout: 30_000 });
    await expect(page.locator('[data-screen="landing"]')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __samePage?: boolean }).__samePage)).toBeUndefined();
  });

  test('fonts: the uk page preloads the hashed Cyrillic woff2 files (and ja preloads nothing)', async ({ page }) => {
    server.setRoot(dirA);
    const fontResponses: { url: string; status: number }[] = [];
    page.on('response', (r) => {
      if (r.url().endsWith('.woff2')) fontResponses.push({ url: r.url(), status: r.status() });
    });
    await page.goto(`${server.url}/?lang=uk`);
    const hrefs = await page.locator('link[rel="preload"][as="font"]').evaluateAll((els) => els.map((e) => (e as HTMLLinkElement).href));
    expect(hrefs).toHaveLength(2);
    expect(hrefs.join(' ')).toMatch(/onest-cyrillic-400-normal-[\w-]+\.woff2.*onest-cyrillic-700-normal-[\w-]+\.woff2/);
    await expect.poll(() => fontResponses.filter((r) => /onest-cyrillic-400/.test(r.url) && r.status === 200).length).toBeGreaterThan(0);

    await page.goto(`${server.url}/?lang=ja`);
    expect(await page.locator('link[rel="preload"][as="font"]').count()).toBe(0);
  });
});
