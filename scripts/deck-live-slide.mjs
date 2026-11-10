#!/usr/bin/env node
/**
 * Replaces the last slide of the exported deck with the live jury dashboard.
 *
 *   node scripts/deck-live-slide.mjs <deck-in.html> <deck-out.html> [--api https://…/api/jury] [--notes docs/deck/speaker-notes.json]
 *
 * --live <live.html>: also writes a page with only the dashboard (for PowerPoint's Web Viewer add-in or a second
 *   screen). It counts a rolling window (?window=<minutes>, default 30) and has no window buttons.
 * --notes: {"1": "БОГДАН · 0:55. …", …} replaces every slide's speaker notes (kept in sync with the team's speech doc).
 *
 * The slide polls GET /api/jury (api/jury.ts) every 5 s while it is on screen, renders the funnel, weak zones,
 * the "come back tomorrow?" vote and a short conclusion computed from the numbers. Offline it shows the last
 * data it saw (localStorage). The deck's CSP gets `connect-src <api origin>` — nothing else is opened up.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , inPath, outPath, ...rest] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: node scripts/deck-live-slide.mjs <deck-in.html> <deck-out.html> [--api URL]');
  process.exit(1);
}
const apiIdx = rest.indexOf('--api');
const API = apiIdx >= 0 ? rest[apiIdx + 1] : 'https://cc146-wittio.vercel.app/api/jury';
const liveIdx = rest.indexOf('--live');
const LIVE_OUT = liveIdx >= 0 ? rest[liveIdx + 1] : null;
const notesIdx = rest.indexOf('--notes');
const NOTES = notesIdx >= 0 ? JSON.parse(readFileSync(rest[notesIdx + 1], 'utf8')) : null;
const attr = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const API_ORIGIN = new URL(API).origin;

let html = readFileSync(inPath, 'utf8');

// ---- slide bounds -------------------------------------------------------------------------------------------
const slideStarts = [...html.matchAll(/<section class="deck-slide" id="(\d+)"/g)];
if (slideStarts.length === 0) throw new Error('no .deck-slide sections found');
const total = slideStarts.length;
const last = slideStarts[total - 1];
const lastStart = last.index;
const lastEnd = html.indexOf('</section>', lastStart) + '</section>'.length;

// QR of the prototype (slide 7 or 1 carry it as an SVG data URI) — reused so jurors who missed it can scan here.
const qr = /alt="QR-код[^"]*"[^>]*?src="(data:image\/svg\+xml;base64,[^"]+)"/.exec(html);
if (!qr) throw new Error('QR image not found in the deck');
const QR_SRC = qr[1];

// ---- styles --------------------------------------------------------------------------------------------------
const C = {
  ink: '#10111c',
  muted: '#565a75',
  faint: '#8a8ea8',
  line: '#e2e4ee',
  track: '#eceef5',
  card: '#ffffff',
  bg: '#f5f6fa',
  accent: '#5b47ff',
  accentSoft: '#efedff',
  accentMid: '#a99bff',
  neutral: '#c9cbe0',
  orange: '#c2410c',
};
const FONT = 'Onest, Arial, ui-sans-serif, system-ui, sans-serif';

const css = `
.lv{position:absolute;inset:0;font-family:${FONT};color:${C.ink};font-variant-numeric:tabular-nums}
.lv *{box-sizing:border-box}
.lv-abs{position:absolute}
.lv-eyebrow{font-size:24px;font-weight:700;line-height:1.4;letter-spacing:3px;text-transform:uppercase;color:${C.accent};display:flex;align-items:center;gap:14px}
.lv-dot{width:14px;height:14px;border-radius:50%;background:${C.orange};box-shadow:0 0 0 0 rgba(194,65,12,.45);animation:lv-pulse 1.8s ease-out infinite}
.lv[data-state="offline"] .lv-dot,.lv[data-state="loading"] .lv-dot{background:${C.faint};animation:none}
@keyframes lv-pulse{0%{box-shadow:0 0 0 0 rgba(194,65,12,.45)}70%{box-shadow:0 0 0 14px rgba(194,65,12,0)}100%{box-shadow:0 0 0 0 rgba(194,65,12,0)}}
@media (prefers-reduced-motion:reduce){.lv-dot{animation:none}.lv-bar>i,.lv-stack>i{transition:none!important}}
.lv-head{display:flex;flex-direction:column;gap:14px}
.lv-title{font-size:52px;font-weight:700;line-height:1.1;letter-spacing:-1px;margin:0;text-wrap:balance}
.lv-sub{font-size:26px;line-height:1.35;color:${C.muted};margin:0;text-wrap:pretty}
.lv-qr{display:flex;flex-direction:column;align-items:center;gap:6px;background:${C.card};border:1px solid ${C.line};border-radius:16px;padding:12px}
.lv-qr img{width:128px;height:128px;display:block}
.lv-qr span{font-size:16px;line-height:1.2;color:${C.muted};text-align:center}
.lv-tile{background:${C.card};border:1px solid ${C.line};border-radius:16px;padding:18px 22px;display:flex;flex-direction:column;gap:2px;height:150px}
.lv-tile.is-key{background:${C.accentSoft};border:2px solid ${C.accent}}
.lv-tile b{font-size:20px;font-weight:600;line-height:1.3;color:${C.muted}}
.lv-tile.is-key b{color:${C.accent}}
.lv-tile strong{font-size:52px;font-weight:700;line-height:1.1;letter-spacing:-1px}
.lv-tile small{font-size:18px;line-height:1.3;color:${C.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lv-card{background:${C.card};border:1px solid ${C.line};border-radius:16px;padding:24px 28px;display:flex;flex-direction:column}
.lv-h{font-size:22px;font-weight:700;line-height:1.3;margin:0 0 14px}
.lv-h span{font-weight:400;color:${C.muted}}
.lv-rows{display:flex;flex-direction:column;gap:9px}
.lv-row{display:grid;grid-template-columns:270px 1fr 112px;align-items:center;gap:14px;font-size:21px;line-height:1.2}
.lv-row.is-key .lv-lab{font-weight:700}
.lv-mid .lv-row{grid-template-columns:120px 1fr 44px}
.lv-lab{color:${C.ink};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lv-num{text-align:right;color:${C.ink};font-weight:600;white-space:nowrap}
.lv-num em{font-style:normal;font-weight:400;color:${C.muted}}
.lv-bar{height:26px;background:${C.track};border-radius:4px;overflow:hidden;position:relative}
.lv-bar>i{position:absolute;left:0;top:0;bottom:0;background:${C.accent};border-radius:0 4px 4px 0;transition:width .6s cubic-bezier(.2,.7,.2,1)}
.lv-bar.is-soft>i{background:${C.accentMid}}
.lv-sep{height:1px;background:${C.line};margin:18px 0}
.lv-stack{display:flex;gap:2px;height:30px;border-radius:4px;overflow:hidden;background:${C.track}}
.lv-stack>i{display:block;height:100%;transition:flex-grow .6s cubic-bezier(.2,.7,.2,1)}
.lv-legend{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:12px;font-size:19px;color:${C.muted}}
.lv-legend span{display:inline-flex;align-items:center;gap:8px}
.lv-legend i{width:14px;height:14px;border-radius:3px;display:inline-block}
.lv-legend b{color:${C.ink}}
.lv-note{font-size:18px;line-height:1.35;color:${C.muted};margin:12px 0 0}
.lv-concl{background:${C.ink};color:#fff;border-radius:16px;padding:26px 30px;display:flex;flex-direction:column;gap:14px}
.lv-concl h3{margin:0;font-size:24px;font-weight:700;line-height:1.3;color:#fff}
.lv-concl ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px}
.lv-concl li{font-size:20px;line-height:1.36;color:#e2e4ee;padding-left:22px;position:relative}
.lv-concl li::before{content:"";position:absolute;left:0;top:11px;width:10px;height:10px;border-radius:2px;background:${C.accentMid}}
.lv-concl li b{color:#fff}
.lv-concl p{margin:auto 0 0;font-size:16px;line-height:1.35;color:#a3a7bf}
.lv-foot{font-size:22px;line-height:1.4;color:${C.muted};white-space:nowrap}
.lv-foot b{color:${C.ink}}
.lv-ctl{display:flex;gap:6px;align-items:center;font-size:18px;color:${C.muted}}
.lv-ctl a{cursor:pointer;padding:4px 12px;border-radius:999px;border:1px solid ${C.line};background:${C.card};color:${C.ink};text-decoration:none;user-select:none}
.lv-ctl a[aria-pressed="true"]{background:${C.accent};border-color:${C.accent};color:#fff}
.lv-ctl a:focus-visible{outline:3px solid ${C.accent};outline-offset:2px}
.lv-empty{color:${C.faint}}
`;

// ---- markup --------------------------------------------------------------------------------------------------
const tile = (id, label, key = false) =>
  `<div class="lv-tile${key ? ' is-key' : ''}" id="lv-k-${id}"><b>${label}</b><strong>—</strong><small>&nbsp;</small></div>`;

const TILE_W = 326;
const tiles = [
  ['tested', 'Пройшли тест'],
  ['quiz', 'Тест, медіана'],
  ['loop', 'Від тесту до 1-ї вправи'],
  ['act', '«Почати» → 1-ша вправа', true],
  ['vote', 'Повернулися б завтра'],
]
  .map(([id, label, key], i) => `<div class="lv-abs" style="left:${96 + i * (TILE_W + 24)}px;top:262px;width:${TILE_W}px">${tile(id, label, key)}</div>`)
  .join('');

const notes =
  'БОГДАН · 40 с. Поки ми говорили, ви пройшли нашу петлю — це ваші результати з прототипу наживо. ' +
  'Прочитати заголовок і висновок справа. Чесно: журі — не цільова аудиторія, і кілька людей — це не статистика. ' +
  'Але видно головне: після «Почати» людина одразу робить першу вправу, а слабке місце в усіх різне — тому план персональний. ' +
  'Саме це ми й перевіримо на A/B на 20% трафіку і на воротах шостого місяця. Дякуємо! Радо відповімо на ваші питання.';

const slide = `<section class="deck-slide" id="${total}" aria-roledescription="slide" aria-label="Slide ${total} of ${total}" data-document-role="page" data-label="Наживо: результати журі з прототипу" data-speaker-notes="${notes}"><div class="deck-fit"><div class="deck-scaler"><div style="width: 1920px; height: 1080px; position: relative; background: rgb(245, 246, 250); overflow: clip; contain: paint;" class="slide" data-canvas-width="1920" data-canvas-height="1080">
<style>${css}</style>
<div class="lv" id="lv" data-api="${API}" data-state="loading">
  <div data-frame-id="lv-top" style="position:absolute;left:0;top:0;width:1920px;height:8px;background-image:linear-gradient(90deg, rgb(91, 71, 255) 0%, rgb(15, 129, 201) 100%)"></div>
  <div class="lv-abs" style="left:96px;top:56px;width:1500px"><div class="lv-eyebrow"><span class="lv-dot" aria-hidden="true"></span>Наживо · результати журі з прототипу</div></div>
  <div class="lv-abs lv-head" style="left:96px;top:100px;width:1500px"><h2 class="lv-title" id="lv-title" role="heading" aria-level="2">Пройдіть петлю — результати з’являться тут наживо</h2><p class="lv-sub" id="lv-sub">Анонімно, без імен і контактів. Журі — не цільова аудиторія, тож це живий зріз, а не статистика.</p></div>
  <div class="lv-abs" style="right:96px;top:40px;width:160px"><div class="lv-qr"><img alt="QR-код: cc146-wittio.vercel.app, українська версія" src="${QR_SRC}"><span>Ще не пройшли?<br>Скануйте</span></div></div>
  ${tiles}
  <div class="lv-abs" style="left:96px;top:436px;width:700px;height:504px"><div class="lv-card" style="height:100%">
    <h3 class="lv-h">Петля крок за кроком <span id="lv-funnel-n"></span></h3>
    <div class="lv-rows" id="lv-funnel"></div>
    <p class="lv-note" style="margin-top:auto">% — від тих, хто відкрив прототип. Виділено крок, який у Wittio сьогодні робить лише 45% платників.</p>
  </div></div>
  <div class="lv-abs lv-mid" style="left:820px;top:436px;width:420px;height:504px"><div class="lv-card" style="height:100%">
    <h3 class="lv-h">Слабке місце</h3>
    <div class="lv-rows" id="lv-weak"></div>
    <p class="lv-note" id="lv-weak-note">&nbsp;</p>
    <div class="lv-sep"></div>
    <h3 class="lv-h">Повернулися б до плану завтра?</h3>
    <div class="lv-stack" id="lv-vote" role="img" aria-label="Відповідей ще немає"></div>
    <div class="lv-legend" id="lv-vote-legend"></div>
  </div></div>
  <div class="lv-abs" style="left:1264px;top:436px;width:560px;height:504px"><div class="lv-concl" style="height:100%">
    <h3>Висновок</h3>
    <ul id="lv-concl"><li>Скануйте QR і пройдіть тест — висновок порахується з ваших результатів.</li></ul>
    <p id="lv-caveat">Порівнюємо з даними брифу: сьогодні продукт після оплати відкривають 45%; ворота 6-го місяця — ≥ 50%.</p>
  </div></div>
  <div class="lv-abs" style="left:96px;top:968px;width:1728px;height:1px;background:rgb(223, 225, 236)"></div>
  <div class="lv-abs" style="left:96px;top:990px;width:1000px"><div class="lv-foot" id="lv-status"><b>Case Challenge 3.0 · CC-146</b> · Підключаємося до прототипу…</div></div>
  <div class="lv-abs" style="right:330px;top:988px"><div class="lv-ctl" id="lv-ctl" aria-label="Вікно даних"><span>Дані:</span><a role="button" tabindex="0" data-since="3h">3 год</a><a role="button" tabindex="0" data-since="today">сьогодні</a><a role="button" tabindex="0" data-since="now" title="Рахувати лише нові результати, з цієї секунди">з нуля</a></div></div>
  <div class="lv-abs" style="right:96px;top:990px;width:200px"><div class="lv-foot" style="text-align:right">${total} / ${total}</div></div>
</div>
<script>${clientScript()}</script>
</div></div></div></section>`;

html = html.slice(0, lastStart) + slide + html.slice(lastEnd);

// ---- CSP: allow the one API origin ----------------------------------------------------------------------------
html = html.replace(/connect-src [^;"]*/, (m) => (m.includes(API_ORIGIN) ? m : `connect-src ${API_ORIGIN}`));
if (!html.includes(`connect-src ${API_ORIGIN}`)) throw new Error('CSP connect-src not updated');

// ---- motion: the dashboard has one static step ------------------------------------------------------------------
html = html.replace(/(<script type="application\/json" id="deck-motion">)([\s\S]*?)(<\/script>)/, (_, a, json, c) => {
  const m = JSON.parse(json);
  m.slides[total - 1] = { transition: 'fade', bg: '#f5f6fa', steps: [{ hidden: [], events: [], auto: false }], embeds: [], plays: [] };
  return a + JSON.stringify(m) + c;
});

// ---- speaker notes ----------------------------------------------------------------------------------------------
if (NOTES) {
  html = html.replace(/(<section class="deck-slide" id="(\d+)"[^>]*?data-speaker-notes=")([^"]*)(")/g, (m, a, id, _old, z) =>
    NOTES[id] ? a + attr(NOTES[id]) + z : m,
  );
} else {
  // Slide 12 leads into the dashboard instead of closing.
  html = html.replace('Дякуємо! Радо відповімо на ваші питання.">', 'А тепер подивімося, що вийшло у вас.">');
}

writeFileSync(outPath, html);
console.log(`slide ${total} → live dashboard (${API}); wrote ${outPath}`);

if (LIVE_OUT) {
  // The same page with only the dashboard slide: no other slides, no paging, rolling 30-minute window.
  const first = html.indexOf('<section class="deck-slide"');
  const lastStartNow = html.lastIndexOf('<section class="deck-slide"');
  let live = html.slice(0, first) + html.slice(lastStartNow);
  live = live
    .replace(/<section class="deck-slide" id="\d+"([^>]*?)aria-label="Slide \d+ of \d+"/, '<section class="deck-slide" id="1"$1aria-label="Живий дашборд журі"')
    .replace(/data-speaker-notes="[^"]*"/, '')
    .replace('class="lv" id="lv"', 'class="lv" id="lv" data-window="30"')
    .replace(`>${total} / ${total}</div>`, '></div>')
    .replace('<title>CC-146 — Wittio: інвестиційне рішення</title>', '<title>CC-146 · Живий дашборд журі</title>')
    .replace(/(<script type="application\/json" id="deck-motion">)([\s\S]*?)(<\/script>)/, (_, a, json, c) => {
      const m = JSON.parse(json);
      m.slides = [m.slides[total - 1]];
      return a + JSON.stringify(m) + c;
    });
  if (!live.includes('data-window="30"')) throw new Error('live page: dashboard root not found');
  writeFileSync(LIVE_OUT, live);
  console.log(`wrote ${LIVE_OUT} (dashboard only, rolling 30 min)`);
}

// =================================================================================================================
function clientScript() {
  const src = String(function liveDashboard(root) {
    var API = root.getAttribute('data-api');
    var KEY_SINCE = 'cc146-dash-since';
    var KEY_CACHE = 'cc146-dash-cache';
    var KEY_SKEW = 'cc146-dash-skew';
    var POLL_MS = 5000;
    var TODAY_GATE = 45; // % of payers who open the product today (brief)
    var GATE_6M = 50; // deck slide 12: gate 1 at month 6
    var includeTest = /[?&]livetest=1/.test(location.search);
    var $ = function (id) { return root.querySelector('#' + id); };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var store = {
      get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    };
    var AB = { memory: 'Пам’ять', attention: 'Увага', logic: 'Логіка', speed: 'Швидкість' };
    var ABL = { memory: 'пам’ять', attention: 'увага', logic: 'логіка', speed: 'швидкість' };
    var STEPS = [
      ['landing', 'Відкрили прототип'],
      ['quiz', 'Почали тест'],
      ['teaser', 'Пройшли тест'],
      ['paywall', 'Побачили план і ціну'],
      ['start', 'Натиснули «Почати»'],
      ['trained', 'Зробили 1-шу вправу', true],
      ['today', 'Відкрили план на сьогодні'],
      ['econ', 'Подивилися економіку'],
      ['retest', 'Пройшли повторний тест'],
    ];
    function plural(n, one, few, many) {
      var m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return one;
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
      return many;
    }
    function pct(x) { return Math.round(x * 100) + '%'; }
    function sec(x) { return x == null ? '—' : (x >= 100 ? Math.round(x) : Math.round(x * 10) / 10).toString().replace('.', ',') + ' с'; }
    // Offset of the server clock from this laptop's (from each response): every window is in server time.
    var skew = Number(store.get(KEY_SKEW)) || 0;
    function serverNow() { return Date.now() + skew; }
    // Rolling window from the URL (?window=30 → the last 30 minutes): the dashboard-only page uses it, no buttons needed.
    var rollMin = Number((/[?&]window=(\d+)/.exec(location.search) || [])[1]) || (root.hasAttribute('data-window') ? Number(root.getAttribute('data-window')) : 0);
    function windowSince() {
      var now = serverNow();
      if (rollMin > 0) return { mode: 'roll', since: Math.floor((now - rollMin * 60e3) / 10e3) * 10e3 };
      var mode = store.get(KEY_SINCE) || '3h';
      if (mode === 'today') { var d = new Date(); d.setHours(0, 0, 0, 0); return { mode: mode, since: d.getTime() }; }
      if (/^\d+$/.test(mode)) return { mode: 'now', since: Number(mode) };
      return { mode: '3h', since: Math.floor((now - 3 * 3600e3) / 60e3) * 60e3 };
    }
    function setTile(id, value, note) {
      var el = $('lv-k-' + id);
      el.querySelector('strong').textContent = value;
      el.querySelector('small').textContent = note || ' ';
      el.querySelector('small').title = note || '';
    }
    function N(x) { var v = Number(x); return isFinite(v) ? v : 0; }
    function bar(label, n, max, cls, key, shareOf) {
      n = N(n);
      var w = max > 0 ? Math.max(n > 0 ? 1.5 : 0, (n / max) * 100) : 0;
      var share = shareOf > 0 ? ' <em>· ' + pct(n / shareOf) + '</em>' : '';
      return '<div class="lv-row' + (key ? ' is-key' : '') + '" title="' + esc(label + ': ' + n) + '">' +
        '<span class="lv-lab">' + esc(label) + '</span>' +
        '<span class="lv-bar' + (cls ? ' ' + cls : '') + '"><i style="width:' + w.toFixed(1) + '%"></i></span>' +
        '<span class="lv-num">' + n + esc(share).replace(/&lt;(\/?)em&gt;/g, '<$1em>') + '</span></div>';
    }
    // Every number the page prints goes through Number(): the API is ours, but the page never trusts markup from it.
    function clean(x) {
      if (x === null || typeof x !== 'object') return typeof x === 'number' ? N(x) : x;
      var o = Array.isArray(x) ? [] : {};
      for (var k in x) if (Object.prototype.hasOwnProperty.call(x, k)) o[k] = typeof x[k] === 'string' ? N(x[k]) : clean(x[k]);
      return o;
    }
    function conclusions(s) {
      var out = [];
      var a = s.startToTrained;
      if (s.tested === 0) {
        out.push(s.opened > 0
          ? 'Прототип уже відкрили <b>' + s.opened + '</b> — чекаємо на перші завершені тести.'
          : 'Скануйте QR і пройдіть тест — висновок порахується з ваших результатів.');
        return out;
      }
      if (a.start > 0) {
        var r = Math.round(a.rate * 100);
        var verdict = r >= GATE_6M ? 'вище за ворота 6-го місяця (≥ ' + GATE_6M + '%)' : r >= TODAY_GATE ? 'вище, ніж у Wittio сьогодні (' + TODAY_GATE + '%), але ще нижче воріт' : 'нижче, ніж у Wittio сьогодні (' + TODAY_GATE + '%) — онбординг треба доробити';
        out.push('Після «Почати» <b>' + a.trained + ' з ' + a.start + ' (' + r + '%)</b> одразу зробили першу вправу — ' + verdict + '.');
      }
      if (s.weakKinds >= 2) {
        var parts = Object.keys(AB).filter(function (k) { return s.weak[k] > 0; }).sort(function (x, y) { return s.weak[y] - s.weak[x]; })
          .map(function (k) { return ABL[k] + ' ' + s.weak[k]; });
        out.push('Слабке місце різне: <b>' + parts.join(', ') + '</b> — тому план персональний, а не один для всіх.');
      } else if (s.tested >= 1) {
        var only = Object.keys(AB).filter(function (k) { return s.weak[k] > 0; })[0];
        if (only) out.push('Поки в усіх слабке місце одне — <b>' + ABL[only] + '</b>; на більшій вибірці воно розходиться.');
      }
      if (s.vote.total > 0) {
        out.push('<b>' + s.vote.yes + ' з ' + s.vote.total + '</b> ' + plural(s.vote.yes, 'повернувся', 'повернулися', 'повернулися') + ' б до плану завтра' + (s.vote.maybe ? ', ще ' + s.vote.maybe + ' — «можливо»' : '') + ': саме цю звичку міряють ворота (D30 ≥ 10%).');
      }
      if (s.loopSecMedian != null && out.length < 3) {
        out.push('Від першого завдання до першої вправи — <b>' + sec(s.loopSecMedian) + '</b> (медіана): ' +
          (s.loopSecMedian <= 90 ? 'петля займає близько хвилини.' : s.loopSecMedian <= 180 ? 'тест, план і перша вправа — за кілька хвилин, без реєстрації.' : 'довше, ніж ми хотіли: скорочуємо кроки до першої вправи.'));
      }
      if (s.econ && out.length < 3) {
        out.push('На слайдері економіки ви залишили в середньому <b>' + s.econ.opened + '% «відкрили»</b> → LTV/CAC ' + String(s.econ.ltvCac.toFixed(2)).replace('.', ',') + '×, ROMI ' + (s.econ.romi >= 0 ? '+' : '') + Math.round(s.econ.romi * 100) + '%.');
      }
      return out.slice(0, 3);
    }
    function render(data, live) {
      var s = clean(data.stats);
      if (live !== null) root.setAttribute('data-state', live ? 'live' : 'offline');
      // Title
      var t;
      if (s.tested === 0) t = s.opened > 0 ? 'Вже ' + s.opened + ' ' + plural(s.opened, 'людина відкрила', 'людини відкрили', 'людей відкрили') + ' прототип — чекаємо на тести' : 'Пройдіть петлю — результати з’являться тут наживо';
      else {
        t = s.tested + ' ' + plural(s.tested, 'людина пройшла', 'людини пройшли', 'людей пройшли') + ' тест';
        if (s.startToTrained.start > 0) t += ' — ' + pct(s.startToTrained.rate) + ' одразу дійшли до вправи';
      }
      $('lv-title').textContent = t;
      // Tiles
      setTile('tested', String(s.tested), s.opened ? 'з ' + s.opened + ' ' + plural(s.opened, 'відкрив', 'відкрили', 'відкрили') + ' прототип' : 'чекаємо на перших');
      setTile('quiz', sec(s.quizSecMedian), '4 завдання · з інструкціями');
      setTile('loop', sec(s.loopSecMedian), 'медіана · з тестом і оплатою');
      var a = s.startToTrained;
      setTile('act', a.rate == null ? '—' : pct(a.rate), a.start ? a.trained + ' з ' + a.start + ' · Wittio сьогодні: ' + TODAY_GATE + '%' : 'Wittio сьогодні: ' + TODAY_GATE + '%');
      setTile('vote', s.vote.yesShare == null ? '—' : pct(s.vote.yesShare), s.vote.total ? s.vote.yes + ' так · ' + s.vote.maybe + ' можливо · ' + s.vote.no + ' ні' : 'питання на екрані «План»');
      // Funnel
      var max = Math.max(1, s.funnel.landing);
      $('lv-funnel').innerHTML = STEPS.map(function (st) { return bar(st[1], s.funnel[st[0]] || 0, max, st[2] ? '' : 'is-soft', st[2], s.funnel.landing); }).join('');
      $('lv-funnel-n').textContent = s.juryMode ? '· режим журі: ' + s.juryMode : '';
      // Weak zones
      var wmax = Math.max(1, Math.max.apply(null, Object.keys(AB).map(function (k) { return s.weak[k]; })));
      $('lv-weak').innerHTML = Object.keys(AB).map(function (k) { return bar(AB[k], s.weak[k], wmax, '', false, 0); }).join('');
      $('lv-weak-note').textContent = s.tested ? 'Різних слабких місць: ' + s.weakKinds + ' з 4 · у ' + s.tested + ' ' + plural(s.tested, 'людини', 'людей', 'людей') : 'Зона обирається за стандартизованими балами';
      // Vote
      var v = s.vote, colors = { yes: '#5b47ff', maybe: '#a99bff', no: '#c9cbe0' }, names = { yes: 'Так', maybe: 'Можливо', no: 'Ні' };
      var stack = $('lv-vote');
      stack.innerHTML = v.total ? ['yes', 'maybe', 'no'].filter(function (k) { return v[k] > 0; }).map(function (k) { return '<i title="' + names[k] + ': ' + v[k] + '" style="flex-grow:' + v[k] + ';background:' + colors[k] + '"></i>'; }).join('') : '';
      stack.setAttribute('aria-label', v.total ? 'Так ' + v.yes + ', можливо ' + v.maybe + ', ні ' + v.no : 'Відповідей ще немає');
      $('lv-vote-legend').innerHTML = ['yes', 'maybe', 'no'].map(function (k) { return '<span><i style="background:' + colors[k] + '"></i>' + names[k] + ' <b>' + v[k] + '</b></span>'; }).join('') + (v.total ? '' : '<span class="lv-empty">відповідей ще немає</span>');
      // Conclusion
      $('lv-concl').innerHTML = conclusions(s).map(function (x) { return '<li>' + x.replace(/([≥≈]) /g, '$1\u00a0').replace(/ —/g, '\u00a0—') + '</li>'; }).join('');
      $('lv-caveat').textContent = s.tested
        ? 'n = ' + s.tested + ' · журі — не цільова аудиторія: це перевірка, що петля працює, а не оцінка ефекту. Ефект покажуть A/B на 20% трафіку і ворота 6-го місяця.'
        : 'Порівнюємо з даними брифу: сьогодні продукт після оплати відкривають 45%; ворота 6-го місяця — ≥ ' + GATE_6M + '%.';
      // Status
      if (live === null) return;
      var at = new Date(data.now).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      $('lv-status').innerHTML = '<b>Case Challenge 3.0 · CC-146</b> · ' + (live ? 'Наживо, оновлено о ' + at : 'Немає зв’язку — дані на ' + at) + (rollMin > 0 ? ' · за останні ' + rollMin + ' хв' : '') + ' · cc146-wittio.vercel.app' + (includeTest ? ' · з репетиціями' : '');
    }
    function markCtl() {
      var mode = windowSince().mode;
      Array.prototype.forEach.call(root.querySelectorAll('#lv-ctl a'), function (a) { a.setAttribute('aria-pressed', String(a.getAttribute('data-since') === mode)); });
    }
    var busy = false;
    function poll() {
      if (busy) return;
      busy = true;
      var w = windowSince();
      var url = API + '?since=' + w.since + (includeTest ? '&test=1' : '');
      var ctl = typeof AbortController === 'function' ? new AbortController() : null;
      var to = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
      fetch(url, { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then(function (data) {
          if (typeof data.now === 'number') { skew = data.now - Date.now(); store.set(KEY_SKEW, String(skew)); }
          store.set(KEY_CACHE, JSON.stringify({ w: w.mode, since: w.since, data: data }));
          render(data, true);
        })
        .catch(function () {
          var c = null;
          try { c = JSON.parse(store.get(KEY_CACHE) || 'null'); } catch (e) { c = null; }
          if (c && c.data && c.since === w.since) render(c.data, false);
          else { root.setAttribute('data-state', 'offline'); $('lv-status').innerHTML = '<b>Case Challenge 3.0 · CC-146</b> · Немає зв’язку з прототипом — відкрийте колоду за адресою <b>cc146-wittio.vercel.app/deck</b>'; }
        })
        .then(function () { clearTimeout(to); busy = false; });
    }
    Array.prototype.forEach.call(root.querySelectorAll('#lv-ctl a'), function (a) {
      var act = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var m = a.getAttribute('data-since');
        store.set(KEY_SINCE, m === 'now' ? String(serverNow()) : m);
        markCtl();
        poll();
      };
      a.addEventListener('click', act);
      a.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') act(ev); else if (ev.key === ' ') { ev.stopPropagation(); act(ev); } });
    });
    markCtl();
    if (rollMin > 0) $('lv-ctl').style.display = 'none';
    var Z = { memory: 0, attention: 0, logic: 0, speed: 0 };
    render({ now: Date.now(), stats: { opened: 0, tested: 0, funnel: {}, quizSecMedian: null, loopSecMedian: null, startToTrained: { start: 0, trained: 0, rate: null }, weak: Z, weakKinds: 0, vote: { yes: 0, maybe: 0, no: 0, total: 0, yesShare: null }, econ: null, juryMode: 0 } }, null);
    // Poll only while the slide is on screen (and the tab is visible); render cached data at once.
    var visible = false;
    var section = root.closest('.deck-slide');
    if (typeof IntersectionObserver === 'function' && section) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting && !section.hasAttribute('data-off'); if (visible) poll(); }).observe(section);
    } else visible = true;
    if (section && typeof MutationObserver === 'function') {
      new MutationObserver(function () { if (!section.hasAttribute('data-off')) poll(); }).observe(section, { attributes: true, attributeFilter: ['data-off'] });
    }
    setInterval(function () {
      var on = visible && !(section && section.hasAttribute('data-off')) && document.visibilityState !== 'hidden';
      if (on) poll();
    }, POLL_MS);
    try {
      var c0 = JSON.parse(store.get(KEY_CACHE) || 'null');
      if (c0 && c0.data && c0.since === windowSince().since) render(c0.data, false);
    } catch (e) { /* ignore */ }
    poll();
  });
  return `(${src})(document.getElementById('lv'));`;
}
