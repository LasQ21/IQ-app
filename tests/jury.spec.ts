import { expect, test } from '@playwright/test';
import en from '../src/i18n/en.json' with { type: 'json' };
import ja from '../src/i18n/ja.json' with { type: 'json' };
import uk from '../src/i18n/uk.json' with { type: 'json' };
import { numbersIn } from './helpers';

/**
 * F5 · jury-numbers. Every jury strip carries the deck's numbers (plan S4-1), in all three languages:
 * no slogans, no "—", every metric has a digit. Depends on S4 (src/i18n/*.json → jury.*).
 */
const DECK: Record<string, string[]> = {
  landing: ['9', '1.09', '39', '75'], // ROMI +9% · LTV/CAC 1.09× → +39–75%
  quiz: ['55', '60'], // 55% never opened · test ≤ 60 s
  teaser: ['30'], // 30% "got what I wanted"
  paywall: ['25', '38', '43', '48', '42', '20'], // 25% too expensive · charge 1 38% → 43–48% (gate ≥ 42%) · A/B 20%
  onboarding: ['25', '45', '55', '65', '50'], // opened after purchase 45% → 55–65% (gate ≥ 50%, deck slide 12)
  flash41: ['15', '60', '3', '40'], // 15% repetitive; 60% of sessions in 3 of 40 games
  index: ['7', '20', '30', '5', '10'], // D7 20% · D30 5% → ≥ 10%
  line: ['7', '20', '30', '5', '10'],
  today: ['3', '0.5'], // sessions 3.0 → 0.5 per week · keep ≥ 3
  retest: ['30', '22', '27', '32', '26'], // charge 2: 22% → 27–32% (gate ≥ 26%)
  report: ['25', '4'], // 25% too expensive · value of 4 weeks
  profile: ['25', '4'],
};

type Jury = Record<string, { reason: string; metric: string; goal: string }>;
const LANGS = { ja: ja as unknown as { jury: Jury }, uk: uk as unknown as { jury: Jury }, en: en as unknown as { jury: Jury } };

test.describe('jury-numbers', () => {
  for (const [lang, dict] of Object.entries(LANGS)) {
    test(`jury strips carry the deck numbers · ${lang}`, () => {
      const problems: string[] = [];
      for (const [screen, nums] of Object.entries(DECK)) {
        const j = dict.jury[screen];
        if (!j) {
          problems.push(`${screen}: missing`);
          continue;
        }
        const text = `${j.reason} · ${j.metric} · ${j.goal}`;
        if (/—/.test(text)) problems.push(`${screen}: contains "—"`);
        if (!/\d/.test(j.metric)) problems.push(`${screen}: metric without a number ("${j.metric}")`);
        const found = new Set(numbersIn(text));
        const missing = nums.filter((n) => !found.has(n));
        if (missing.length) problems.push(`${screen}: missing ${missing.join(', ')} in "${text}"`);
      }
      expect(problems).toEqual([]);
    });
  }

  test('landing strip shows ROMI and LTV/CAC on the phone (?jury=1)', async ({ page }) => {
    await page.goto('/?lang=en&jury=1');
    const strip = page.locator('[data-screen="landing"] aside');
    await expect(strip).toBeVisible();
    const nums = numbersIn((await strip.textContent()) ?? '');
    expect(nums).toEqual(expect.arrayContaining(['9', '1.09']));
  });
});
