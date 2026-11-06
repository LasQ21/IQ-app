// Scripted player shared by the e2e test and the deck screenshot script.
// It reads the games' data-* attributes (stroop-word[data-ink], series-seq[data-answer],
// gonogo-stage[data-stim], grid cells [data-lit]) and taps like a person would.
// Inject with page.addInitScript(BOT); call window.__botTick() every ~50 ms of (fake) time;
// tune with window.__bot.skill = { acc: 0–1, rt: ms }.
export const BOT = `
window.__bot = { skill: { acc: 0.8, rt: 650 }, seed: 146, q: [], seq: [], lastLit: null, handled: null, lastStim: 'none', answering: false };
// deterministic PRNG (mulberry32) so runs are reproducible; reseed with window.__bot.seed = n
window.__botRnd = function () {
  let t = (window.__bot.seed = (window.__bot.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
window.__botTick = function () {
  const b = window.__bot, now = performance.now(), rnd = window.__botRnd;
  // drop actions queued for a previous game (e.g. a Series answer still pending when Go/No-Go starts)
  const kind = document.querySelector('[data-testid="stroop-word"]') ? 'stroop'
    : document.querySelector('[data-testid="series-seq"]') ? 'series'
    : document.querySelector('[data-testid="gonogo-stage"]') ? 'gonogo'
    : document.querySelector('[data-input]') ? 'grid' : 'none';
  if (kind !== b.kind) {
    b.kind = kind;
    b.q = [];
    b.seq = [];
    b.lastLit = null;
    b.answering = false;
    b.lastStim = 'none';
  }
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


/** Advance the fake clock in 50 ms steps, letting the bot act; stop early when `until()` is true. */
export async function play(page, ms, until) {
  for (let t = 0; t < ms; t += 50) {
    await page.clock.runFor(50);
    await page.evaluate(() => window.__botTick && window.__botTick());
    if (until && (await until())) return;
  }
}
