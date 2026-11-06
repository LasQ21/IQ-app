# CC-146 · Wittio retention-loop prototype — team report

## Links
- **Production:** https://cc146-wittio.vercel.app/ (Japanese by default)
- Ukrainian: https://cc146-wittio.vercel.app/?lang=uk · English: https://cc146-wittio.vercel.app/?lang=en
- Jury mode: add `&jury=1` (or tap «Журі» in the header) — each screen shows *churn reason · metric · goal*.
- Vercel project `cc146-wittio` (team *The best team*). Every push to `claude/wittio-retention-loop-4en8i2`
  deploys to production automatically (it is the repo's only branch, so Vercel treats it as production).

## QR codes (`docs/demo/`)
| File | Opens |
| --- | --- |
| `qr.png` | `?lang=uk` — for the jury (slides 1 and 7) |
| `qr-ja.png` | Japanese (default) |
| `qr-en.png` | `?lang=en` |
| `qr-jury-uk.png` | `?lang=uk&jury=1` — with churn-reason strips |

## Deck screenshots (`docs/demo/screens/`, 1170×2532)
`{uk,ja,en}-1-paywall.png`, `-2-today.png`, `-3-index.png`, `-4-retest.png`.
Made by `scripts/screenshots.mjs`: a seeded scripted player plays every game for real on a fake clock;
the re-test is played slightly better (accuracy 0.78 vs 0.75, 680 vs 700 ms) to illustrate 30 days of practice,
and the seed was picked from 8 runs as a representative, modest result. They are illustrative — say so if asked.

## 60-second demo script (Sasha, slide 7)
1. Jury scans the QR → assessment landing (UK QR opens in Ukrainian; the JA/UK/EN switch is in the header).
2. 4 mini-tasks × 15 s (colour/word → flash order → number series → quick reaction); tasks 2–4 start by themselves
   after a 3-second countdown → radar with the weak zone.
3. Paywall: "4-week plan + re-test in 30 days", no payment → «Почати план».
4. FlashGrid №41: the level grows live → Wittio Index "+N", streak "1 day" → LINE-style reminder mock.
5. Today → «Повторний тест через 30 днів» → «Демо: +30 днів» → re-test on form B → change per ability.

**Timing (measured on a scripted run, realistic taps):** Landing → Onboarding ≈ 85–90 s (the quiz itself is 60 s
of tasks + countdowns); Landing → Index ≈ 100 s; the re-test adds another ≈ 70 s. A literal 60-second demo does not
fit a 60-second test — options: let the jury play during the talk, or show the re-test from the deck screenshot.

## Important caveat for the stage: re-test results are real and noisy
The re-test compares the form-B run you just played with form A — nothing is faked. Each 15-second task sees only
~6 items / 3–4 sequences, so two runs at the *same* skill differ by roughly ±10–40 points per ability. On stage a
jury member can therefore see a minus. The screen handles it honestly: changes within ±12 are grey and labelled
"у межах похибки", and a note explains why. For a real product the re-test should be longer (≈ 3 minutes)
and/or combine the last week of training sessions. Keep the deck screenshot as a backup for slide 7.

## What is simulated (known limitations)
- **Payment** — illustrative prices only (¥150 trial → ¥5,250 / 4 weeks at `USD_JPY = 150`); nothing is charged.
- **LINE** — a mock lock-screen notification; nothing is sent, no real LINE logo.
- **30 days** — "Demo: +30 days" shifts the demo clock and assumes daily 10-minute training (index history,
  minutes, streak). Abilities are *not* simulated — the re-test measures them.
- **No backend, no personal data** — state lives only in `localStorage` on the phone; "Reset demo" (Profile tab)
  clears it; taking the test again from the landing page also starts a fresh demo.
- **Fonts** — Onest (Cyrillic/Latin) is self-hosted; Japanese uses the phone's system font (Hiragino on iPhone,
  Noto Sans CJK JP on Android) instead of downloading Noto Sans JP from Google Fonts. Reason: Lighthouse
  performance (78–89 → 99–100) and offline use. No external requests at all.

## Quality checks (latest run)
| Check | Result |
| --- | --- |
| Unit tests (`npm test`) — engine + reducer | 53 passed |
| Playwright (`npm run e2e`) — full loop played by a bot in ja/uk/en, level growth, index delta, streak, re-test deltas, tap targets ≥ 44 px, no horizontal scroll, language persistence, `?jury=1`, blocked localStorage, offline on first open | 6 passed |
| Lighthouse mobile, landing | Performance 99–100 · Accessibility 100 · Best practices 100 |
| `npm run i18n:check` — keys in all 3 languages, banned medical/IQ claims | OK (230 keys) |
| Network | only the app's own origin |
| Disclaimer | bottom of Paywall and Re-test, all languages |

Independent review: `docs/REVIEW.md` (subagent E). Fixed after the review: memory calibration (memory was always the
weak zone), live profile slipping back after the re-test, stale streak on "+30 days", re-test clearing today's ticks,
"Finish" with zero trials counting, flat day-1 index line, 44 px language buttons and chips, render-blocking fonts,
SW not controlling the first open, iOS web-app meta, `?lang` overriding later choices, empty jury strip on Profile,
quiz auto-start (timing), e2e gaps, reducer tests. Not changed: per-task duration (15 s, as in the brief).

## Japanese strings to review
`docs/JA_REVIEW.md` lists every Japanese string by screen (⚠️ = check first) plus the glossary
(弱点 · 再測定 · プラン · Wittio指数 · 連続日数 · 問題セットA/B; 診断 avoided because it reads as a medical diagnosis).
Top items for a native speaker:
1. `funnel.landing.start` テストをはじめる / `funnel.quiz.title` 60秒テスト — テスト vs 診断
2. `progress.retest.title` 30日ごとの再測定 — 再測定 vs 再テスト
3. `progress.today.retestText` 別の問題セット（B）で、実際の変化を確かめます。
4. `games.common.wrong` おしい！
5. `jury.teaser.reason` 30%「知りたいことは分かった」
6. `funnel.onboarding.sub` 結果を見た今が、はじめどきです。
7. `progress.index.scale` トレーニングの積み重ねを0〜1000で表します
8. `common.brandShort` CC-146のコンセプト案
9. `games.flash41.name` FlashGrid No.41
10. `funnel.landing.titleWeak` “弱点” vs 「弱点」
11. `progress.retest.noiseNote` 短いテストのため、±{n}以内の変化は誤差の範囲です。 (added after the text pass)
