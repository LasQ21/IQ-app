// Deck screenshots at 1170×2532 (390×844 @3x): Paywall, TodayPlan, IndexStreak, Retest.
// A scripted player plays every game for real (reads the games' data-* attributes) on a fake clock.
// The re-test is played with higher accuracy / faster reactions to illustrate a user after 30 days of practice.
//
// Usage:  npm run build && npx vite preview --port 4190 --strictPort &
//         node scripts/screenshots.mjs http://localhost:4190 uk ja en
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { BOT, play } from '../tests/bot.js';

const base = process.argv[2] ?? 'http://localhost:4190';
const langs = process.argv.slice(3).length ? process.argv.slice(3) : ['uk'];
const out = 'docs/demo/screens';
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
  await skill(0.92, 520);
  await quiz();
  await shot('4-retest');
  await ctx.close();
}
await browser.close();
