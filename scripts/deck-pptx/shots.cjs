// Deck → .pptx, step 1: full-resolution screenshot of every slide (builds finished, slide 13 in its "open in browser" state).
// Usage: node scripts/deck-pptx/shots.cjs $PWD/docs/deck/CC-146-Wittio-deck.html <out-dir>
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [deck, outDir] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const empty = { now: Date.now(), since: Date.now(), stats: { opened: 0, tested: 0, funnel: {}, quizSecMedian: null, loopSecMedian: null, startToTrained: { start: 0, trained: 0, rate: null }, abilities: {}, weak: { memory: 0, attention: 0, logic: 0, speed: 0 }, weakKinds: 0, indexMean: null, vote: { yes: 0, maybe: 0, no: 0, total: 0, yesShare: null }, econ: null, retest: { n: 0, better: 0, stable: 0, lower: 0 }, langs: {}, juryMode: 0, lastAt: null }, records: [] };
  await p.route('https://cc146-wittio.vercel.app/api/jury**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(empty) }));
  await p.addStyleTag;
  await p.goto('file://' + deck + '#1');
  await p.addStyleTag({ content: '.deck-pager{display:none!important} .lv-dot{animation:none!important}' });
  const texts = {};
  for (let n = 1; n <= 13; n++) {
    await p.evaluate((n) => { location.hash = '#' + n; }, n);
    await p.waitForTimeout(7000);
    await p.evaluate(() => document.querySelectorAll('[data-build-hidden]').forEach((e) => e.removeAttribute('data-build-hidden')));
    if (n === 13) {
      await p.evaluate(() => {
        document.getElementById('lv-status').innerHTML = '<b>Case Challenge 3.0 · CC-146</b> · Живі дані: cc146-wittio.vercel.app/deck#13';
        document.getElementById('lv-ctl').style.visibility = 'hidden';
        document.getElementById('lv-concl').innerHTML = '<li>Цей слайд у браузері оновлюється наживо з результатів журі. Натисніть кнопку нижче — відкриється живий дашборд.</li>';
      });
    }
    await p.waitForTimeout(700);
    const sec = p.locator(`section.deck-slide[id="${n}"]`);
    texts[n] = await sec.evaluate((s) => {
      const lab = s.getAttribute('data-label') || '';
      const t = (s.querySelector('.slide') || s).innerText.replace(/\s+/g, ' ').trim();
      return { label: lab, text: t };
    });
    await p.screenshot({ path: `${outDir}/slide-${String(n).padStart(2, '0')}.png` });
  }
  fs.writeFileSync(`${outDir}/texts.json`, JSON.stringify(texts, null, 1));
  await b.close();
})();
