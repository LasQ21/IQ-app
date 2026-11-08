# CC-146 · Wittio retention-loop prototype — team report

*Iteration 2 (8 Nov 2026): honest re-test, loop economics on the phone, jury strips = deck numbers, fast jury mode.
Plan and council findings: `docs/ITERATION-2-PLAN.md`; acceptance review: `docs/REVIEW.md`.*

## Links
- **Production:** https://cc146-wittio.vercel.app/ (Japanese by default)
- Ukrainian: https://cc146-wittio.vercel.app/?lang=uk · English: https://cc146-wittio.vercel.app/?lang=en
- **Jury mode:** add `&jury=1` (or tap «Журі» in the header). It also turns on the **fast mode** (4 × 10 s tasks,
  10 s warm-up). `?fast=1` turns on the fast mode alone. Each screen shows *problem · metric · goal* with the deck numbers.
- **Loop economics:** `#/economics` (or `?econ=1`), linked from the jury strip on Landing, Paywall, Profile and Re-test.
- Vercel project `cc146-wittio` (team *The best team*). Iteration 2 was built on branch `claude/dazzling-hopper-4w5znp`
  (preview deployments) and, after the council's acceptance, deployed to production from commit `708af96`
  (deployment `dpl_5DCpSUgsD9SXzqPZxvbdeMwgSq7U`; the bundle hash matches the locally tested build). The URL — and
  therefore the QR codes — did not change. **Note:** the project's production branch is still
  `claude/wittio-retention-loop-4en8i2`; a push there would replace production with the old iteration. Roll back via
  Vercel → Deployments → the previous production deployment (`c93a7ad`) → "Promote".

## QR codes (`docs/demo/`)
| File | Opens |
| --- | --- |
| `qr.png` | `?lang=uk` — for the jury (slides 1 and 7) |
| `qr-ja.png` | Japanese (default) |
| `qr-en.png` | `?lang=en` |
| `qr-jury-uk.png` | `?lang=uk&jury=1` — strips + fast mode |

## Deck screenshots (`docs/demo/screens/`, 1170×2532)
`{uk,ja,en}-1-paywall.png`, `-2-today.png`, `-3-index.png`, `-4-retest.png`, `-4b-retest-illustration.png`, `-5-economics.png`.
Made by `scripts/screenshots.mjs`: a seeded scripted player plays every game for real on a fake clock.
**The re-test is played with the same skills as the baseline** — nothing is faked: every ability shows
"Stable (within ±N)". In jury mode a separate card labelled *"Illustration, not your result"* shows a typical
30-day picture (+3…+12, most on the weak zone). `5-economics` is the 60 % / 10 % gate scenario (LTV/CAC 1.47×, ROMI +47 %).

## Demo script (Sasha, slide 7) — fast jury mode
1. Jury scans the QR (`?lang=uk&jury=1`) → Landing with the strip "Business today: ROMI +9 % · LTV/CAC 1.09× → +39–75 %".
2. 4 tasks × 10 s (each waits for "Start", so people can read the instruction) → radar with the weak zone.
3. Paywall: plan for the weak zone + "your 4-ability profile is already yours"; price ≈ ¥188 / day; jury card
   "Was: Get my IQ report → Now: plan · A/B on 20 %" → «Почати».
4. Onboarding → 10 s warm-up starts right away → **Wittio Index "586 → 593, +7"**, "Streak started".
5. LINE-style reminder mock → Today (3 cards, 2 on the weak zone, the middle one rotates daily).
6. **Loop economics:** drag "Opened the product after paying" 45 → 60 % → LTV/CAC 1.09 → 1.47×, ROMI +9 → +47 %,
   both gates turn green.
7. Re-test — only if time is left: "+30 days" (index only is simulated) → re-test on a new form → honest classification.

**Timing (fake-clock e2e, `tests/demo-pace.spec.ts`):** Landing → Index **≈ 60 s** at a presenter's brisk pace
(1 s per screen), **≈ 70 s** at a 2–2.5 s reading pace; with the re-test **≈ 110 s**. 50 s of it are fixed
(4 × 10 s tasks + 10 s warm-up), so there is no slack: practise the taps.

## The re-test is honest — what the jury will see
- Each ability is classified against its **error band** (90 %: 1.645 × SD of the difference between two runs at the same
  skill, Monte-Carlo with 4000 simulated players per level — `scripts/sim-bands.ts`):

  | | memory | attention | logic | speed |
  |---|---|---|---|---|
  | 15 s quiz | ±38 | ±21 | ±32 | ±21 |
  | 10 s fast mode | ±43 | ±27 | ±42 | ±33 |

  "Noticeably better" / "Lower" only outside the band, otherwise "Stable (within ±N)"; scores shown as "74 (55–90)".
- Scripted player with **identical** skills, 12 seeds each (e2e `retest-stability`): 10 s — 45–47 / 48 abilities stable,
  weak zone kept 11 / 12; 15 s — 44 / 48 stable, weak zone kept 11 / 12.
- The weak zone is picked on **standardised** scores (`scripts/sim-norms.ts`), so no ability is "weak" more often by
  construction, and it only moves when the new evidence is outside noise (`weakestStable`).
- **Limitation to say out loud if asked:** short tasks are noisy. A real +1 SD improvement shows as "better" in only
  ≈ 20–30 % of 15 s re-tests (≈ 10–15 % in the 10 s mode); test–retest r ≈ 0.5–0.8. "Stable" is the expected picture in the
  first month — the screen says so. A real product needs a longer re-test (≈ 3 min) and/or pooled training data.
- Forms: baseline A → re-test B → next A2; training uses generated items (form "T") and never shows assessment items
  (checked for 5000 seeds per game).

## Wittio Index
`gain = ⌈(2 + 10·s/100) · clamp((1000 − prev)/600, 0.05, 1)⌉`; only the first 3 games of a day count; a game scoring
< 15 gives +0 (no farming). Average player: day 1 ≈ 540–560, day 7 ≈ 630–650, day 30 ≈ 850, 1000 not before ≈ day 69.
The index is *training regularity and performance* — not IQ, not abilities (the screen says so).

## Loop economics (`#/economics`, `src/engine/economics.ts`)
Charge 1 = opened × 66 % + not opened × 15 %; later charges keep today's curve (38/22/14/10/8/6 %, tail 7–13 × 0.74)
with churn cut by *r*; net LTV = 0.9 · ($1 + $35 · Σ); CAC $33.3 (9 000 trials, $300k).

| Opened / churn cut | LTV/CAC | ROMI | per month |
|---|---|---|---|
| 45 % / 0 (today) | 1.09× | +9 % | +$28k |
| 55 % / 10 % (cautious) | 1.39× | +39 % | +$117k |
| 60 % / 10 % (gate) | 1.47× | +47 % | +$141k |
| 65 % / 20 % (target) | 1.75× | +75 % | +$226k |

"Opened" = finished ≥ 1 exercise within 7 days of paying (**team definition**, shown on the screen). 66 % / 15 % are team
estimates; the rest is the brief.

## What is simulated (known limitations)
- **Payment** — illustrative prices only (¥150 trial → ¥5,250 / 4 weeks, tax incl., at `USD_JPY = 150`); nothing is charged.
  **The 7-day trial length is a placeholder — the team must confirm it** (it appears in the JA 特商法 block and the CTA).
- **LINE** — a mock lock-screen notification; nothing is sent, no real LINE logo.
- **30 days** — "Demo: +30 days" shifts the demo clock and assumes 3 plan games a day (index, minutes, streak) at the
  real Index pace. Abilities are *not* simulated — the re-test measures them.
- **No backend, no personal data** — state lives only in `localStorage`; "Reset demo" (Profile) clears it; "Take the test
  again" on Landing asks for confirmation first. Two tabs stay in sync.
- **Fonts** — Onest (Cyrillic/Latin, `unicode-range`) is self-hosted and preloaded for uk/en; Japanese uses the system font.
- **Service worker** — a new deploy is applied on the next Landing/Today, never during a quiz or a game.

## Quality checks (latest run, commit after `b3327e2`)
| Check | Result |
| --- | --- |
| Unit tests (`npm test`) — engine, economics, forms, Index, reducer | 112 passed |
| Playwright (`npm run e2e`, Chromium) — full loop ja/uk/en, layout at 390×664 + jury, 375×553, 844×390 landscape; fast-mode pace; re-test stability (10 s and 15 s); jury numbers; Loop economics; SW update between two builds; tab sync; QR re-scan; reload/back mid re-test; offline loop | 31 passed |
| WebKit | not installed in the build container — not run |
| Lighthouse mobile (`/`, `/?lang=uk`) | Performance 99 / 97 · Accessibility 100 · Best practices 100 · CLS 0 |
| `npm run i18n:check` — key parity, banned JA words (診断/効果/改善/脳年齢, 予防 outside the disclaimer), numbers in every jury metric, no "—" | OK (293 keys × 3) |
| Network | only the app's own origin |

## Stage operations
- Freeze deploys one hour before the pitch. Open the presenter's phone **twice** (the second open picks up the new SW).
- Keep a 40 s backup video of the demo and the deck screenshots for slide 7.
- If a re-test on stage shows "Lower": the screen explains it (noise of a 1-minute test); say the same.

## Japanese strings to review
`docs/JA_REVIEW.md` (glossary updated for iteration 2: 苦手分野, 連続{n}日目, 別の問題セット, 1日3つ). Open item: trial length.
