# CC-146 · Iteration 2 plan (council of sub-agents)

Source: council of 5 reviewers (strategist, UX/UI, Japan, psychometrician, QA), 7 Nov 2026, commit `c93a7ad`.
Code and commits in English; UI texts ja/uk/en. Phase 0 contracts are in commit `7dbce68`
(`src/config.ts`, `src/state/types.ts`, `src/engine/errorBands.ts`, `src/engine/economics.ts`).

**Goal:** honest, stable re-test; economics on the phone; jury strips = deck numbers; demo ≤ 60 s to Index.
No new games or screens except one — "Loop economics" (`#/economics`).

## 1. Findings

| ID | Pri | Problem | Where |
| --- | --- | --- | --- |
| F1 | P0 | Re-test deltas are noise of 15 s tasks. Real SD of difference: memory 12, attention 13, logic 23, speed 19. "±12" understates error 2–3×. Weak zone flips on noise; `whyBack` claims "visible change" for any sign | `Retest.tsx:18,91,107`, `parts.tsx:37`, `reducer.ts` (assessmentDone) |
| F2 | P0 | Form B is contaminated: first training already uses B (`pickForm` alternates), re-test always B, Series has only 12 fixed items. "not memorised answers" becomes false | `forms.ts`, `banks.ts`, `Retest.tsx:43`, `Play.tsx` |
| F3 | P1 | `?jury=1` on iPhone Safari (visible height 664): ≈89 px jury strip pushes games off screen (Stroop to 711 px, Corsi 702, Flash 676). On iPhone SE (375×553) games overflow even without jury | `Screen.tsx`, `AssessmentRunner.tsx`, `Play.tsx`, game CSS |
| F4 | P1 | No economics: ROMI, LTV/CAC, 66%/15% mechanics not shown anywhere | new screen |
| F5 | P1 | Jury strips ≠ deck: onboarding "45→65%" (deck 55–65%), retest "22→26–32%" (deck 27/32%), "charge 1 38→≥42%" missing, no numbers on Index/Today/Flash, slogans in metrics, "Reason: —" on Landing/Quiz/Profile, onboarding metric "after result" instead of "after purchase" | `src/i18n/*.json` → `jury.*` |
| F6 | P1 | Duplicates in plan `[g, g, flash41]`; same plan every day. First onboarding training is memory although "2 of 3 on logic" was promised; "Now" is the 3rd item | `forms.ts:36`, `Onboarding.tsx` |
| F7 | P1 | Memory ceiling ≈50: Corsi timing doesn't let a human finish length 6 in 15 s → "weak = memory" for 75–91% of players. `scoring.test.ts:175` tests an unreachable case | `CorsiGrid/index.tsx:15`, `scoring.ts` |
| F8 | P1 | Logic measured by 1–3 items in 15 s; one item = ±30–35 points | `Series/index.tsx`, `scoring.ts:84`, `banks.ts` |
| F9 | P1 | Index saturates: 1000 by day 16; +3 even for score 0 (farmable in 13 min); "+30 days" = +90 contradicts real pace ≈ +27/day | `wittioIndex.ts:28` |
| F10 | P1 | Weak "wow" on Index: "+15" on 1000 scale without "before → after" anchor, 0.9 s counter; day 1 chart "07.11 → 07.11", "1 day streak", LINE "keep your 1-day streak" | `IndexStreak.tsx`, `CountUp.tsx`, `Sparkline.tsx` |
| F11 | P1 | Japanese texts (see S4-2) incl. 特商法 pricing disclosure | `ja.json` |
| F12 | P1 | After new deploy, first open shows old version (SW without reload) | `vite.config.ts`, `main.tsx` |
| F13 | P1 | Demo too long: Landing → Index ≈ 96–100 s, with retest ≈ 170 s. Autostart of tasks 2–4 after 3 s doesn't let people read the Corsi instruction | `config.ts`, `AssessmentRunner.tsx` |
| F14 | P2 | Paywall in jury mode: sticky button covers price. Report vanished from paywall with no compensation | `Paywall.tsx`, `funnel.module.css` |
| F15 | P2 | Under bottom nav: "LINE reminder (mock)" on Today and "What's in 4 weeks" on Report are hidden | `app.module.css .withTabs` |
| F16 | P2 | Dishonest durations: 45 s training labelled "~3 min". Day-1 report "1 min per week", "Memory +13" after one game (Corsi and FlashGrid mixed on one scale) | i18n, `model.ts`, `scoring.ts` |
| F17 | P2 | Re-scanning the QR mid-funnel loses progress; "Take the test" resets index and streak without confirmation | `Landing.tsx` |
| F18 | P2 | Two tabs overwrite each other (no `storage` listener) | `store.tsx` |
| F19 | P2 | Landscape and safe-area left/right; timers eat tasks while app is backgrounded | `app.module.css`, games |
| F20 | P2 | Fonts: Cyrillic without `unicode-range` (66 KB); Onest on Slow 4G swaps in only at 3.7 s | `main.tsx`, `index.html` |
| F21 | P2 | `word-break: auto-phrase` is Chromium-only; JA headings may break badly on iPhone | `global.css:55` |
| F22 | P2 | Pitch voice inside the product ("…that's why they come back"), "Рівень Lv 5", dangling "·" | i18n |

**Keep as is:** Lighthouse 98–99, no Google Fonts, offline, "Reset demo", double-tap safety, FlashGrid №41 smoothness
and 2-up/1-down rule, disclaimer, no 診断/効果/脳年齢, LINE at 20:00, "CC-146 concept" label.

## 2. Ownership

| Role | Files (owned) | Findings |
| --- | --- | --- |
| O · Orchestrator | `src/state/types.ts`, `src/config.ts`, `vite.config.ts`, `main.tsx`, `docs/*` | F12, merges |
| S1 · Measurement | `src/engine/*`, `src/games/banks.ts`, `src/games/types.ts`, `src/games/CorsiGrid/*`, `src/games/Series/*`, `src/games/FlashGrid41/*`, `src/app/Play.tsx` (start level / form only) | F1 (engine), F2, F6 (engine), F7, F8, F9, F16 (scale) |
| S2 · Re-test, demo, economics | `src/screens/progress/Retest.tsx`, `src/state/reducer.ts`, `src/app/AssessmentRunner.tsx`, `src/app/router.ts`, `src/app/App.tsx`, new `src/screens/economics/*` | F1 (UI), F4, F13 |
| S3 · UX & layout | `src/ui/*`, `src/screens/funnel/*` (not texts), `src/screens/progress/{IndexStreak,TodayPlan,WeeklyReport,Profile,LineMock,parts}.tsx`, all `*.module.css` | F3, F6 (order), F10, F14, F15, F17, F19 |
| S4 · Texts & jury | `src/i18n/*.json`, `scripts/i18n-check.mjs` | F5, F11, F16 (texts), F21 (`<wbr>`), F22 |
| S5 · Platform & QA | `src/state/store.tsx`, `src/state/persist.ts`, `index.html`, `tests/*`, `playwright.config.ts` (+ `vite.config.ts`/`main.tsx` for SW & fonts, delegated by O) | F12 (code), F18, F20, e2e |

Merge order S1 → S2 → S3 → S4 → S5. JSON conflicts are resolved toward S4; `reducer.ts` toward S2.
New i18n keys: each agent adds the keys it needs to **all three** `src/i18n/{ja,uk,en}.json` (keep the change minimal, append keys
inside the relevant section); S4 owns final wording.

## 3. Phase 0 contracts (done, commit `7dbce68`)

- `config.ts`: `JURY_FAST_TASK_MS = 10_000`, `ASSESSMENT_AUTOSTART_MS = 0`, `TRAINING_PLAN_GAMES_PER_DAY = 3`,
  `assessmentMs(fastMode)`, `ECON` constants.
- `types.ts`: `FormId = 'A'|'B'|'A2'|'T'`, `DeltaClass`, `AbilityChange`, `Economics`;
  `AppState.fastMode`, `AppState.trainingSeedDay`, `AppState.indexGamesByDay?`; action `setFast`.
- `engine/errorBands.ts`: `errorBand`, `ERROR_BAND` (start: memory 20, attention 21, logic 37, speed 31),
  `classifyChange`, `scoreRange`, `weakestStable`, `illustrativePractice`.
- `engine/economics.ts`: `economics(openRate, churnCut)` + tests (1.09/1.39/1.47/1.75×, ROMI +9/+39/+47/+75%).
- `store.tsx`: `?jury=1` or `?fast=1` → `fastMode`.

## 4. Tasks

### S1 · Measurement
1. **Error bands** (`engine/errorBands.ts`). After items 2–3, re-derive by Monte-Carlo (≥ 4000 players per level, unchanged skill),
   band = 1.645 × SD(difference); write final numbers with a comment on their origin.
2. **Memory without ceiling.** Corsi assessment timing `{onMs: 300, stepMs: 380, leadMs: 250}` so length 6 fits in ≈ 14.8 s.
   Score `0.5·lin(span,2,6) + 0.5·lin(recalled,3,12)`. New test: a player with human timings (tap every 400–600 ms) has all
   4 abilities within ±15 of the middle.
3. **More reliable logic.** Series feedback pauses 450/900 → 250/450 ms. Start with 4 short easy items so an average player answers ≥ 4.
   Align numbers of form B with form A (step size, magnitude).
4. **No contaminated forms.** Training uses **generated** items with `seed = trainingSeedDay·10 + slot`. Forms A and B only for assessments:
   baseline A, re-test B, next A2 (new generator with its own equivalence check).
5. **No mixed scales.** Profile "memory" uses only test instruments (Corsi). FlashGrid feeds only the Index and its own level.
   No more "Memory +13" after one game.
6. **Index formula.** `gain = (2 + 10·s/100) · clamp((1000 − prev)/600, 0.05, 1)`. Only the first 3 plan games per day count;
   score < 15 gives +0. Monotonic. Expected average trajectory (test it): day 0 ≈ 522, 1 ≈ 540, 7 ≈ 633, 30 ≈ 852, 60 ≈ 965;
   300 empty games give +0.
7. **Plan without duplicates.** Weak ≠ memory: `[weak game, rotation[day % 3], weak game with another start/level]`.
   Weak = memory: `[flash41, rotation, corsi training]`. Two identical cards in a row impossible; 2 of 3 on the weak zone.
8. **FlashGrid №41.** First session starts at level 3, next ones at `final level − 1` (not `maxLevel − 1`). 2-up/1-down unchanged.
9. **Tests (Vitest):** bands, change classification, `weakestStable`, Index trajectory, no plan duplicates over 30 days per weak zone,
   `economics()` (already present).

### S2 · Re-test, demo and economics
1. **Honest re-test screen** (`Retest.tsx`). Instead of "+42", classification from `classifyChange`: "Noticeably better" / "Lower"
   only outside the band, otherwise "Stable (within ±N)"; range "74 (55–90)"; demo title "Demo: re-test just now · 30 days simulated
   for the index only"; `whyBack` depends on the outcome (some "better" → one message; all "stable" → "changes are still within the
   error — normal for the first weeks"). The weak zone changes only via `weakestStable` (reducer).
2. **Separate labelled illustration** (jury mode only): under the real result a card "Typical picture after 30 days of regular practice —
   illustration, not your result", data from `illustrativePractice`. Never tweak the real measurement.
3. **"Loop economics" screen** (`#/economics`, linked from the jury strip on Landing, Paywall and Profile). Two sliders:
   "Opened the product after paying" 45–65% and "Lower churn between charges" 0–20%. Live: charge 1, charge 2, net LTV, LTV/CAC, ROMI,
   absolute ROMI per month (9 000 trials, CAC $33.3, $300k). Gate marks "≥60% opened", "≥42% charge 1". Use `economics()`.
   Footer: "Data — case brief; 66% / 15% — CC-146 team estimate".
4. **Fast jury mode** (`state.fastMode`): quiz tasks 10 s (`assessmentMs`). No autostart: the person taps "Start". Target
   Landing → Index ≤ 60 s at human pace. The "+30 days" demo jump must use the new index formula pace (≈ +11/day near 540 → realistic,
   e.g. simulate 3 average games/day with the S1 gain function), not +2…+4/day hardcode.

### S3 · UX and layout
1. Hide the jury strip during play (`Screen` prop `hideJury`, on when `phase === 'play'`). Limit game height:
   `width: min(100%, calc(100dvh − 330px))`. On 390×664 with jury and 375×553 without, all game elements within `innerHeight`.
2. **"Wow" on Index:** big number in accent colour with anchor "526 → 541"; counter 1.3–1.5 s; "pop" on the "+15" chip;
   `navigator.vibrate?.(20)`; respect `prefers-reduced-motion`; day 1: labels "Before / After training" instead of two equal dates;
   streak on day 1 — "Streak started".
3. **Onboarding:** "Now" first; first exercise on the weak zone, or FlashGrid with "Warm-up: feel the level grow".
4. **Paywall:** sticky button never covers the price (also in jury mode). Line "Your 4-ability profile is already yours" (report = bonus).
   Price "≈ ¥188 per day". Jury mode: small card "Was: 'Get my IQ report' → Now: plan for the weak zone · A/B on 20% of traffic".
5. `.withTabs { padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 16px) }`; LINE link and "What's included"
   fully visible; `env(safe-area-inset-left/right)` for landscape.
6. **Landing for a returning user:** primary "Continue" for any stage after the baseline (goes to that stage's screen).
   "Take the test again" secondary with confirmation "Progress on this device will be reset".
7. **Small:** "Level 5" not "Level Lv 5"; remove dangling "·"; pause games on `visibilitychange` (timer doesn't run in background).

### S4 · Texts and jury
1. **Jury strips = deck** (3 languages). Every Metric/Goal is a number, no slogans, no "—".

   | Screen | Reason | Metric · goal |
   | --- | --- | --- |
   | Landing | Business today | ROMI +9% · LTV/CAC 1.09× → goal +39–75% |
   | Quiz | 55% of payers never opened the product | Test time ≤ 60 s |
   | Teaser | 30% "got what I wanted" | Result = start of the plan |
   | Paywall | 25% "too expensive" | Charge 1: 38% → 43–48% (gate ≥ 42%) · risk: A/B on 20% |
   | Onboarding | 25% "didn't use it" | Opened the product after purchase: 45% → 55–65% (gate ≥ 60%) |
   | FlashGrid | 15% "repetitive"; 60% of sessions in 3 of 40 games | Difficulty grows with the person |
   | Index / LINE | Habit | D7 20% · D30 5% → ≥ 10% |
   | Today | Sessions 3.0 → 0.5 per week | Keep ≥ 3 sessions per week |
   | Retest | 30% "got what I wanted" | Charge 2: 22% → 27–32% (gate ≥ 26%) |
   | Report / Profile | 25% "too expensive" | Value of 4 weeks visible → Loop economics |

2. **Japanese fixes** (key: → new):
   - `progress.streak`: {n}日連続 → 連続{n}日目
   - `progress.line.bodyStreak` → 今日の10分トレーニングの時間です。連続記録（{n}日）を伸ばしましょう！
   - `progress.today.lineLink` / `progress.line.caption`: モック → イメージ / デモ
   - `funnel.landing.titleWeak`: remove “ ” around 弱点
   - `funnel.landing.sub` → 4つの能力をチェック・登録不要
   - `funnel.teaser.eyebrow`, `progress.profile.title` → 能力プロフィール
   - `funnel.teaser.title` → 苦手分野は「{ability}」でした
   - `funnel.paywall.trial` → 初回お試し（{days}日間） — trial length TBD by the team; use 7日間 and flag in REPORT
   - `funnel.paywall.then` → お試し終了後は{price}（税込）／4週間ごとに自動更新
   - new `funnel.paywall.cancel` → いつでも解約できます（次回更新日の前日まで）· 特定商取引法に基づく表記（デモ）
   - `funnel.paywall.start` → {trial}でお試しをはじめる
   - `common.illustrative` → ※表示価格は仮の設定です
   - `progress.report.perSession` → 1日あたり約{price}
   - `common.disclaimer` → ※本サービスは医療機器ではなく、認知症などの病気の診断・治療・予防を目的としたものではありません。IQの向上を示すものでもありません。
   - `progress.retest.whyBack` → 変化を確かめながら、無理なく続けましょう。
   - `progress.index.deltaNow` / `deltaLast` → 今回のトレーニング / 前回のトレーニング
   - `progress.today.play` → はじめる
   - `jury.onboarding.metric` → 購入後にアプリを開いた割合 (uk «після оплати», en «after purchase»)
   - `jury.teaser.reason` → 30%「結果が分かったので満足」
   - fewer あなた; no モック; no “弱点” quotes
3. **UK/EN:** same for streak ("Серію розпочато" / "Серія: {n} дн."), price disclosure (trial length, auto-renewal, cancellation),
   "Рівень", voice (no "that's why they come back" in user-facing text).
4. **Honest durations:** "~1 min" for 45 s trainings; "Today's plan · ~3 min".
5. **JA typography:** no space between Japanese sentences (`Retest.tsx:99`), date range "12/1〜12/7" (`WeeklyReport.tsx:44`) via a
   localized helper; `<wbr>` in `ja.json` headings as Safari fallback (coordinate keys).
6. **`npm run i18n:check`**: banned JA words (診断, 効果, 改善, 脳年齢, 予防 outside the disclaimer), no "—" in `jury.*`,
   every `jury.*.metric` contains a digit.

### S5 · Platform and QA
1. **SW update:** turn off `injectRegister`, register via `virtual:pwa-register` (`registerType: 'prompt'`). After `controllerchange`
   reload only on stages `landing` or `home` (Today), **never** during quiz or play.
2. **Fonts:** import `@fontsource/onest/{400,500,700}.css` (with `unicode-range`), `<link rel="preload">` for cyrillic-400 and 700.
3. **Tab sync:** `storage` listener in `store.tsx` re-reads state.
4. **e2e (Playwright):** a) `devices['iPhone 13']` with real height 664 (+ WebKit if available); game controls within `innerHeight`
   with `jury=1`; b) human pace: Landing → Index ≤ 60 s in fast mode; c) re-test of a bot with **identical** skills on 12 seeds —
   ≥ 10 of 12 abilities "Stable", weak zone unchanged; d) jury strips contain the numbers from S4-1; e) "Loop economics" values from
   S2-3; f) SW update between two builds; g) re-scan mid-funnel, two tabs, back gesture and reload mid-re-test; h) whole loop offline.

## 6. Acceptance (fresh-context reviewers, read-only)

| Reviewer | Accepted when |
| --- | --- |
| Strategist | Every jury strip has a deck number; Loop economics shows 1.09/1.39/1.47/1.75 and ROMI +9/+39/+47/+75; demo ≤ 60 s to Index and ≤ 120 s with re-test; the 6 jury questions (where ROMI comes from, conversion, what the index measures, what if the re-test drops, why repeats, how "opened" is measured) are answered on the phone |
| UX/UI | No overlaps at 390×664 (jury) and 375×553; Index has "before → after" anchor and visible animation; no plan duplicates; nothing hidden under the nav; Paywall price visible in both modes |
| Japan | All S4-2 lines applied; 特商法 block (term, 税込, 自動更新, 解約); new disclaimer; no banned words |
| Psychometrician | Identical-skill bot: ≥ 80% abilities "Stable" on 12 seeds; human timings give scores within ±15; Index < 1000 before day 30; empty games farm = 0; test forms never appear in training |
| QA | e2e green (Chromium + WebKit if available); SW update never reloads during play; Lighthouse Perf ≥ 95, A11y 100; offline loop passes |

## 8. Don'ts
- Don't tweak the real measurement or hardcode deltas without an "illustration" label.
- No new games, tutorials or onboarding slides; test not longer than 60 s.
- No IRT or norm tables before the pitch.
- No animation libraries, confetti, Google Fonts or Japanese web fonts.
- No SW auto-reload regardless of stage.
- Never 診断, 脳年齢, 効果, 改善, "raises IQ", "against dementia".
- No real payment, LINE integration or data collection; no real LINE or Wittio logos.
