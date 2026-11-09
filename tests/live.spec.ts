import { expect, test } from '@playwright/test';
import { indexToToday, takeBaseline, teaserToIndex, withBot } from './helpers';

// Live jury dashboard (deck slide 13): the phone sends one anonymous record to /api/jury.
test.describe('live jury record', () => {
  test('sends nothing from automated browsers (dev, e2e, screenshots)', async ({ page }) => {
    const posts: string[] = [];
    await page.route('**/api/jury', (r) => {
      posts.push(r.request().postData() ?? '');
      return r.fulfill({ status: 200, body: '{"ok":true}' });
    });
    await page.goto('/?lang=uk');
    await page.getByTestId('landing-start').click();
    await expect(page.locator('[data-screen="quiz"]')).toBeVisible();
    await page.waitForTimeout(1500);
    expect(posts).toEqual([]);
    await expect(page.getByTestId('landing-live-note')).toHaveCount(0); // note is on Landing, we left it
  });

  test('?livetest=1 sends an anonymous test record with the funnel steps', async ({ page }) => {
    const bodies: Record<string, unknown>[] = [];
    await page.route('**/api/jury', async (r) => {
      bodies.push(JSON.parse(r.request().postData() ?? '{}'));
      await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.goto('/?lang=uk&livetest=1');
    await expect(page.getByTestId('landing-live-note')).toBeVisible();
    await page.getByTestId('landing-start').click();
    await expect(page.locator('[data-screen="quiz"]')).toBeVisible();
    await expect.poll(() => bodies.length, { timeout: 5000 }).toBeGreaterThan(0);
    const last = bodies[bodies.length - 1] as { id: string; test: boolean; lang: string; reach: Record<string, number> };
    expect(last.test).toBe(true);
    expect(last.lang).toBe('uk');
    expect(last.id).toMatch(/^[a-z0-9-]{8,40}$/);
    expect(Object.keys(last.reach)).toEqual(expect.arrayContaining(['landing', 'quiz']));
    expect(Object.keys(last).sort()).toEqual(['fast', 'id', 'jury', 'lang', 'reach', 't', 't0', 'test', 'v']);
  });

  test('full loop: scores, steps up to Today, Index and the "come back tomorrow?" vote reach the record', async ({ page }) => {
    const bodies: Record<string, any>[] = [];
    await page.route('**/api/jury', async (r) => {
      bodies.push(JSON.parse(r.request().postData() ?? '{}'));
      await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await withBot(page, { seed: 3 });
    await page.goto('/?lang=uk&jury=1&livetest=1');
    await takeBaseline(page);
    await teaserToIndex(page);
    await indexToToday(page);
    const card = page.getByTestId('today-vote');
    await expect(card).toBeVisible();
    await page.getByTestId('vote-yes').click();
    await expect(page.getByTestId('vote-change')).toBeVisible();
    await page.clock.runFor(1_500);
    await expect.poll(() => bodies.at(-1)?.vote, { timeout: 5000 }).toBe('yes');
    const last = bodies.at(-1)!;
    expect(last.jury).toBe(true);
    expect(Object.keys(last.scores).sort()).toEqual(['attention', 'logic', 'memory', 'speed']);
    expect(['memory', 'attention', 'logic', 'speed']).toContain(last.weakest);
    expect(last.index).toBeGreaterThan(0);
    for (const step of ['landing', 'quiz', 'teaser', 'paywall', 'start', 'trained', 'today']) expect(last.reach[step]).toBeGreaterThan(0);
    // Changing the answer keeps one record (same id).
    await page.getByTestId('vote-change').click();
    await page.getByTestId('vote-maybe').click();
    await page.clock.runFor(1_500);
    await expect.poll(() => bodies.at(-1)?.vote, { timeout: 5000 }).toBe('maybe');
    expect(new Set(bodies.map((b) => b.id)).size).toBe(1);
  });
});
