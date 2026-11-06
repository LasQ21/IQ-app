// Checks: every key exists in ja/uk/en; every literal t('…') key used in src exists;
// no medical / IQ-gain promises; lists ja strings marked `_review` for a native-speaker pass.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LANGS = ['ja', 'uk', 'en'];
const dicts = Object.fromEntries(
  LANGS.map((l) => [l, JSON.parse(readFileSync(new URL(`../src/i18n/${l}.json`, import.meta.url)))]),
);

function flatten(obj, prefix = '', out = {}, review = { list: [] }, inReview = false) {
  const marked = inReview || obj._review === true;
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out, review, marked);
    else {
      out[key] = v;
      if (marked) review.list.push(key);
    }
  }
  return out;
}

let errors = 0;
const flat = {};
const reviewJa = { list: [] };
for (const l of LANGS) flat[l] = flatten(dicts[l], '', {}, l === 'ja' ? reviewJa : { list: [] });

const all = new Set(LANGS.flatMap((l) => Object.keys(flat[l])));
for (const key of [...all].sort()) {
  for (const l of LANGS) {
    if (!(key in flat[l])) {
      console.error(`missing  ${l}: ${key}`);
      errors++;
    } else if (typeof flat[l][key] !== 'string' || flat[l][key].trim() === '') {
      console.error(`empty    ${l}: ${key}`);
      errors++;
    }
  }
}

// placeholders must match across languages
for (const key of all) {
  const ph = (s) => [...String(s ?? '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  const ref = ph(flat.en[key]);
  for (const l of LANGS) {
    if (key in flat[l] && ph(flat[l][key]) !== ref) {
      console.error(`placeholder mismatch ${l}: ${key} (${ph(flat[l][key])} vs en ${ref})`);
      errors++;
    }
  }
}

// keys used in code
function walk(dir, files = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(tsx?|jsx?)$/.test(f) && !/\.test\./.test(f)) files.push(p);
  }
  return files;
}
const srcDir = new URL('../src', import.meta.url).pathname;
for (const file of walk(srcDir)) {
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(/\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g)) {
    if (!all.has(m[1])) {
      console.error(`unknown key used in ${file.replace(srcDir, 'src')}: ${m[1]}`);
      errors++;
    }
  }
}

// compliance: no medical promises / IQ-gain claims outside the disclaimer
const ALLOW = new Set(['common.disclaimer']);
const BANNED = [
  /IQ\s*(が|を)?\s*(上が|上げ|向上|アップ)/,
  /認知症(を|の)?(予防|防)/,
  /підвищ\w*\s+(ваш\w*\s+)?IQ/i,
  /деменц/i,
  /(raise|boost|increase|improve)s?\s+(your\s+)?IQ/i,
  /dementia/i,
  /IQ\s*↑/,
];
for (const l of LANGS) {
  for (const [key, val] of Object.entries(flat[l])) {
    if (ALLOW.has(key)) continue;
    for (const re of BANNED) {
      if (re.test(val)) {
        console.error(`compliance ${l}: ${key} matches ${re} → "${val}"`);
        errors++;
      }
    }
    if (/Wittio(?!\s*(Index|指数|Індекс))/.test(val) && !/CC-146/.test(val) && !key.startsWith('common.brand')) {
      // brand mentions must carry the "concept by CC-146" note somewhere on screen; flag for review
      console.warn(`note ${l}: "${key}" mentions Wittio without CC-146 in the same string`);
    }
  }
}

console.log(`\nja strings marked _review (${reviewJa.list.length}):`);
for (const k of reviewJa.list) console.log(`  ${k}: ${flat.ja[k]}`);

if (errors) {
  console.error(`\n✗ i18n check failed: ${errors} problem(s)`);
  process.exit(1);
}
console.log(`\n✓ i18n OK — ${all.size} keys × ${LANGS.length} languages`);
