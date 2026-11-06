// Deck screenshots at 1170×2532 (390×844 @3x): Paywall, TodayPlan, IndexStreak, Retest.
// A scripted player plays every game for real (reads the games' data-* attributes) on a fake clock.
// The re-test is played with higher accuracy / faster reactions to illustrate a user after 30 days of practice.
//
// Usage:  npm run build && npx vite preview --port 4190 --strictPort &
//         node scripts/screenshots.mjs http://localhost:4190 uk ja en
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4190';
const langs = process.argv.slice(3).length ? process.argv.slice(3) : ['uk'];
const out = 'docs/demo/screens';
mkdirSync(out, { recursive: true });

const BOT = `
window.__bot = { skill: { acc: 0.8, rt: 650 }, q: [], seq: [], lastLit: null, handled: null, lastStim: 'none', answering: false };
window.__botTick = function () {
  const b = window.__bot, now = performance.now(), rnd = Math.random;
  b.q = b.q.filter((a) => (a.at <= now ? (a.fn(), false) : true));
  if (b.q.length) return;
  const click = (el) => el && el.click();
  // Stroop
  const word = document.querySelector('[data-testid="stroop-word"]');
  if (word) {
    const key = word.textContent + word.dataset.ink;
    if (b.handled !== key) {
      b.handled = key;
      const ok = rnd() < b.skill.acc;
      b.q.push({
        at: now + b.skill.rt,
        fn: () => {
          const w = document.querySelector('[data-testid="stroop-word"]');
          if (!w) return;
          const btns = [...document.querySelectorAll('button[data-color]')];
          click(ok ? btns.find((x) => x.dataset.color === w.dataset.ink) : btns.find((x) => x.dataset.color !== w.dataset.ink));
        },
      });
    }
    return;
  }
  // Series
  const seq = document.querySelector('[data-testid="series-seq"]');
  if (seq) {
    const key = seq.textContent;
    if (b.handled !== key) {
      b.handled = key;
      const ok = rnd() < b.skill.acc;
      b.q.push({
        at: now + b.skill.rt * 3.5,
        fn: () => {
          const sq = document.querySelector('[data-testid="series-seq"]');
          if (!sq) return;
          const btns = [...document.querySelectorAll('button[data-value]')];
          click(ok ? btns.find((x) => x.dataset.value === sq.dataset.answer) : btns.find((x) => x.dataset.value !== sq.dataset.answer));
        },
      });
    }
    return;
  }
  // Go / No-Go
  const stage = document.querySelector('[data-testid="gonogo-stage"]');
  if (stage) {
    const stim = stage.dataset.stim;
    if (stim !== b.lastStim) {
      if (stim === 'go' && rnd() < b.skill.acc + 0.1) b.q.push({ at: now + b.skill.rt * 0.6, fn: () => click(stage) });
      if (stim === 'nogo' && rnd() > b.skill.acc + 0.1) b.q.push({ at: now + b.skill.rt * 0.6, fn: () => click(stage) });
    }
    b.lastStim = stim;
    return;
  }
  // Corsi / FlashGrid
  const grid = document.querySelector('[data-input]');
  if (grid) {
    if (grid.dataset.input === 'off') {
      b.answering = false;
      const lit = grid.querySelector('[data-lit="1"]');
      const idx = lit ? Number(lit.dataset.cell) : null;
      if (idx !== null && idx !== b.lastLit) b.seq.push(idx);
      b.lastLit = idx;
    } else if (!b.answering && b.seq.length) {
      b.answering = true;
      const cells = [...grid.querySelectorAll('[data-cell]')];
      const s = b.seq.slice();
      b.seq = [];
      b.lastLit = null;
      const mistakeAt = rnd() < b.skill.acc ? -1 : Math.floor(rnd() * s.length);
      s.forEach((c, i) => {
        const cell = i === mistakeAt ? (c + 1) % cells.length : c;
        b.q.push({ at: now + 250 + i * b.skill.rt * 0.4, fn: () => click(cells[cell]) });
      });
    }
  }
};
`;

async function play(page, ms, until) {
  for (let t = 0; t < ms; t += 50) {
    await page.clock.runFor(50);
    await page.evaluate(() => window.__botTick && window.__botTick());
    if (until && (await until())) return;
  }
}

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
