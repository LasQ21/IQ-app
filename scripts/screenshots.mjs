// Deck screenshots at 1170×2532 (390×844 @3x): Paywall, TodayPlan, IndexStreak, Retest (+ illustration), Loop economics.
// A scripted player plays every game for real (reads the games' data-* attributes) on a fake clock.
// The re-test is played with the SAME skills as the baseline: the honest picture after a month is "Stable"
// (changes within the error band). The labelled illustration card (jury mode) shows a typical 30-day picture.
// The player is seeded (deterministic), so the same build gives the same screenshots.
//
// Usage:  npm run build && npx vite preview --port 4190 --strictPort &
//         node scripts/screenshots.mjs http://localhost:4190 uk ja en
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { BOT, play } from '../tests/bot.js';

const base = process.argv[2] ?? 'http://localhost:4190';
const langs = process.argv.slice(3).length ? process.argv.slice(3) : ['uk'];
const out = process.env.OUT ?? 'docs/demo/screens';
mkdirSync(out, { recursive: true });



const browser = await chromium.launch();
for (const lang of langs) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
  });
  await ctx.addInitScript(BOT);
  const page = await ctx.newPage();
  await page.clock.install();
  const skill = (acc, rt) => page.evaluate(([a, r]) => (window.__bot.skill = { acc: a, rt: r }), [acc, rt]);
  const shot = async (name) => {
    await page.clock.runFor(2_000);
    await page.waitForTimeout(1500); // CSS animations run on real time
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${out}/${lang}-${name}.png` });
    console.log('wrote', `${out}/${lang}-${name}.png`);
  };
  const quiz = async () => {
    for (let i = 0; i < 4; i++) {
      await page.getByTestId('game-start').click();
      await play(page, 15_600);
    }
  };

  await page.goto(`${base}/?lang=${lang}`);
  await page.evaluate((seed) => (window.__bot.seed = seed), Number(process.env.SEED ?? 14));
  await page.getByTestId('landing-start').click();
  await skill(0.75, 700);
  await quiz();
  await page.getByTestId('teaser-next').click();
  await shot('1-paywall');
  await page.getByTestId('paywall-start').click();
  await page.getByTestId('onboarding-start').click();
  await page.getByTestId('game-start').click();
  await skill(0.9, 600);
  await play(page, 46_000, async () => (await page.locator('[data-screen="index"]').count()) > 0);
  await page.clock.runFor(1_200);
  await shot('3-index');
  await page.getByTestId('index-continue').click();
  await page.clock.runFor(1_500);
  await page.getByTestId('line-notification').click();
  await shot('2-today');
  await page.getByTestId('today-retest').click();
  await page.getByTestId('retest-advance').click();
  await skill(0.75, 700); // identical skills — nothing is faked
  await quiz();
  await page.getByTestId('jury-toggle').click(); // the labelled illustration card is shown in jury mode only
  await shot('4-retest');
  await page.getByTestId('retest-illustration').scrollIntoViewIfNeeded();
  await page.clock.runFor(500);
  await page.screenshot({ path: `${out}/${lang}-4b-retest-illustration.png` });
  console.log('wrote', `${out}/${lang}-4b-retest-illustration.png`);
  await page.evaluate(() => (window.location.hash = '#/economics'));
  await page.getByTestId('econ-presetGate').click();
  await shot('5-economics');
  await ctx.close();
}
await browser.close();
