// Deck → .pptx, step 2 (needs pptxgenjs: npm i --no-save pptxgenjs@3.12.0): one full-bleed image per slide, speaker notes,
// a clickable "open the live dashboard" button on slide 13.
// Usage: node scripts/deck-pptx/build.cjs <out-dir> docs/deck/speaker-notes.json docs/deck/CC-146-Wittio-deck.pptx
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const [dir, notesPath, out] = process.argv.slice(2);
const notes = JSON.parse(fs.readFileSync(notesPath, 'utf8'));
const texts = JSON.parse(fs.readFileSync(dir + '/texts.json', 'utf8'));
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.333" × 7.5" = 1920 × 1080 px at 144 px/in
pres.title = 'CC-146 — Wittio: інвестиційне рішення';
pres.author = 'Команда CC-146';
pres.subject = 'Case Challenge 3.0 · фінал';
const PX = 13.333 / 1920;
const LIVE = 'https://cc146-wittio.vercel.app/deck#13';
for (let n = 1; n <= 13; n++) {
  const s = pres.addSlide();
  s.background = { color: 'F5F6FA' };
  const t = texts[n];
  s.addImage({
    path: `${dir}/slide-${String(n).padStart(2, '0')}.png`,
    x: 0, y: 0, w: 13.333, h: 7.5,
    altText: (t.label + '. ' + t.text).slice(0, 1000),
  });
  let note = notes[String(n)] || '';
  if (n === 13) {
    s.addText('Відкрити живий дашборд  →', {
      shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.12,
      x: 1294 * PX, y: 640 * PX, w: 500 * PX, h: 76 * PX,
      fill: { color: '5B47FF' }, color: 'FFFFFF', fontFace: 'Arial', fontSize: 16, bold: true,
      align: 'center', valign: 'middle', margin: 0, isTextBox: true,
      objectName: 'Кнопка: живий дашборд',
    });
    s.addText('cc146-wittio.vercel.app/deck#13', {
      x: 1294 * PX, y: 726 * PX, w: 500 * PX, h: 34 * PX,
      color: 'A3A7BF', fontFace: 'Arial', fontSize: 11, align: 'center', valign: 'middle', margin: 0, isTextBox: true,
      objectName: 'Адреса дашборда',
    });
    // Clickable area over the button and the address (a link on a picture: no underlined, recoloured text).
    s.addImage({
      data: 'image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      x: 1294 * PX, y: 640 * PX, w: 500 * PX, h: 120 * PX, transparency: 100,
      hyperlink: { url: LIVE, tooltip: 'Відкрити живий дашборд у браузері' }, altText: 'Посилання: живий дашборд ' + LIVE,
    });
    note += ' [PowerPoint] Цей слайд у PowerPoint статичний. Натисніть кнопку «Відкрити живий дашборд» — у браузері відкриється ' + LIVE + ' з результатами журі наживо. Перед виступом відкрийте цю адресу й натисніть «з нуля» внизу слайда.';
  }
  s.addNotes(note);
}
pres.writeFile({ fileName: out }).then(() => console.log('wrote', out));
