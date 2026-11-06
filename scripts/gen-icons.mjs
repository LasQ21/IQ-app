// Renders PWA icons from an inline SVG with the pre-installed Chromium (Playwright).
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const mark = (size, pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" ${pad ? '' : 'rx="22"'} fill="#5B47FF"/>
  <g transform="translate(50 50) scale(${pad ? 0.62 : 0.8}) translate(-50 -50)">
    <circle cx="50" cy="50" r="27" fill="none" stroke="#fff" stroke-width="9" stroke-dasharray="127 43" stroke-linecap="round" transform="rotate(-90 50 50)"/>
    <circle cx="50" cy="50" r="8" fill="#F26B3A"/>
  </g>
</svg>`;

const out = [
  ['public/pwa-192.png', 192, false],
  ['public/pwa-512.png', 512, false],
  ['public/pwa-maskable-512.png', 512, true],
  ['public/apple-touch-icon.png', 180, true],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, pad] of out) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${mark(size, pad)}</body></html>`);
  writeFileSync(file, await page.locator('svg').screenshot({ omitBackground: true }));
  console.log('wrote', file);
}
// OG image 1200×630
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<html><body style="margin:0;width:1200px;height:630px;display:flex;align-items:center;gap:48px;padding:0 96px;box-sizing:border-box;background:#F5F6FA;font-family:sans-serif">
${mark(220, false)}<div><div style="font-size:64px;font-weight:700;color:#10111C">Wittio · CC-146</div>
<div style="font-size:32px;color:#565A75;margin-top:12px">Retention-loop concept prototype</div></div></body></html>`);
writeFileSync('public/og-image.png', await page.screenshot());
console.log('wrote public/og-image.png');
await browser.close();
