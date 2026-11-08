import { expect, type Page } from '@playwright/test';
import { BOT } from './bot.js';

/**
 * Shared e2e helpers. Selectors are the app's data-testid / data-screen attributes. Ids other agents add are
 * listed in the spec that needs them (economics.spec.ts: econ-*; retest-stability.spec.ts: data-cls).
 */

export const ABILITIES = ['memory', 'attention', 'logic', 'speed'] as const;
export const STORAGE_KEY = 'cc146-wittio-v1';

declare global {
  interface Window {
    __botTick?: () => void;
    __bot?: { seed: number; skill: { acc: number; rt: number } };
    __ccPlaying?: boolean;
  }
}

/** Collects console errors, page errors, failed requests and requests to foreign hosts. */
export function watchPage(page: Page) {
  const errors: string[] = [];
  const foreign: string[] = [];
  const failed: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.hostname === 'localhost' || u.protocol === 'data:' || u.protocol === 'blob:') return;
    foreign.push(r.url());
  });
  page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText ?? ''}`));
  return { errors, foreign, failed };
}

/** Inject the scripted player (tests/bot.js) and install the fake clock. Call before the first goto. */
export async function withBot(page: Page, opts: { seed?: number; clock?: boolean } = {}) {
  await page.addInitScript(BOT);
  if (opts.seed !== undefined) {
    await page.addInitScript((seed) => {
      if (window.__bot) window.__bot.seed = seed;
    }, opts.seed);
  }
  if (opts.clock !== false) await page.clock.install();
}

/**
 * Advance the fake clock in 50 ms steps, letting the bot act, until `done()` (evaluated in the page) is true
 * or `maxMs` of fake time has passed. Returns the fake ms spent. One round trip per step.
 */
export async function playUntil(page: Page, maxMs: number, done: () => boolean): Promise<number> {
  const expr = `(window.__botTick && window.__botTick(), (${done.toString()})())`;
  for (let t = 0; t < maxMs; t += 50) {
    await page.clock.runFor(50);
    if (await page.evaluate(expr)) return t + 50;
  }
  return maxMs;
}

/** Advance the fake clock with the bot active (no stop condition). */
export async function idle(page: Page, ms: number) {
  await playUntil(page, ms, () => false);
}

const runnerPhase = () => document.querySelector<HTMLElement>('[data-testid="assessment"]')?.dataset.phase ?? 'none';

/**
 * Play one whole assessment (4 tasks) with the bot. Works with 15 s or 10 s tasks and with or without
 * auto-start: waits `readMs` on each intro like a person reading the instruction, then taps "Start" unless the
 * task already started by itself. Returns the fake ms spent.
 */
export async function runAssessment(page: Page, { readMs = 0 }: { readMs?: number } = {}): Promise<number> {
  let spent = 0;
  for (let i = 0; i < 4; i++) {
    await expect(page.getByTestId('assessment')).toHaveAttribute('data-phase', /intro|play/);
    if (readMs) {
      spent += await playUntil(page, readMs, () => (document.querySelector<HTMLElement>('[data-testid="assessment"]')?.dataset.phase ?? '') === 'play');
    }
    if ((await page.evaluate(runnerPhase)) === 'intro') {
      await page.getByTestId('game-start').click();
    }
    spent += await playUntil(page, 25_000, () => {
      const el = document.querySelector<HTMLElement>('[data-testid="assessment"]');
      return !el || el.dataset.phase !== 'play';
    });
  }
  await expect(page.getByTestId('assessment')).toHaveCount(0);
  return spent;
}

/** Landing → quiz (bot) → teaser. */
export async function takeBaseline(page: Page, opts: { readMs?: number } = {}) {
  await expect(page.locator('[data-screen="landing"]')).toBeVisible();
  await page.getByTestId('landing-start').click();
  await expect(page.locator('[data-screen="quiz"]')).toBeVisible();
  await runAssessment(page, opts);
  await expect(page.locator('[data-screen="teaser"]')).toBeVisible();
}

/** Teaser → paywall → onboarding → first training (bot) → Index. */
export async function teaserToIndex(page: Page, { readMs = 0 }: { readMs?: number } = {}) {
  const read = async () => {
    if (readMs) await idle(page, readMs);
  };
  await read();
  await page.getByTestId('teaser-next').click();
  await expect(page.locator('[data-screen="paywall"]')).toBeVisible();
  await read();
  await page.getByTestId('paywall-start').click();
  await expect(page.locator('[data-screen="onboarding"]')).toBeVisible();
  await read();
  await page.getByTestId('onboarding-start').click();
  await expect.poll(() => page.evaluate(() => location.hash)).toContain('/play/');
  // Fast jury mode starts the onboarding warm-up right away; otherwise the game intro waits for "Start".
  const fast = await page.evaluate((key) => Boolean(JSON.parse(localStorage.getItem(key) ?? '{}').fastMode), STORAGE_KEY);
  if (!fast) {
    await expect(page.getByTestId('game-start')).toBeVisible();
    await read();
    await page.getByTestId('game-start').click();
  }
  await playUntil(page, 60_000, () => !!document.querySelector('[data-screen="index"]'));
  await expect(page.locator('[data-screen="index"]')).toBeVisible();
}

/** Index → LINE mock → Today. */
export async function indexToToday(page: Page) {
  await page.clock.runFor(2_000);
  await page.getByTestId('index-continue').click();
  await expect(page.locator('[data-screen="line"]')).toBeVisible();
  await page.clock.runFor(1_500);
  await page.getByTestId('line-notification').click();
  await expect(page.locator('[data-screen="today"]')).toBeVisible();
}

/** The persisted app state (localStorage). */
export async function savedState(page: Page): Promise<Record<string, any>> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), STORAGE_KEY);
}

/** Numbers in a text, with decimal commas normalised ("1,09" → "1.09"). */
export function numbersIn(text: string): string[] {
  return text.replace(/(\d),(\d)/g, '$1.$2').match(/\d+(?:\.\d+)?/g) ?? [];
}

/** Set an <input type="range"> the way React sees it (native setter + input/change events). */
export async function setRange(page: Page, testId: string, percent: number) {
  await page.getByTestId(testId).evaluate((el, pct) => {
    const input = el as HTMLInputElement;
    // sliders may be in percent (45–65) or as a fraction (0.45–0.65)
    const value = Number(input.max || '100') <= 1 ? pct / 100 : pct;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, percent);
}
