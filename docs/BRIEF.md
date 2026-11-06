# CC-146 · Wittio retention-loop prototype — brief for all agents

## Context
Team CC-146, Case Challenge 3.0 final (SKELAR × Horizon Capital × Mastercard).
Case: Wittio — web service "IQ test → brain-training subscription". Business barely pays back ads (ROMI +9%)
because people pay for a one-off IQ report and leave. Our solution (track A) is a **retention loop**:

`test → ability profile → daily 10-min plan → live score (Wittio Index) → re-test after 30 days → again`

The prototype must **show this loop live on a jury member's phone in 60–90 s** via a QR code.

### Hard constraints
1. **Japan = 100% of users.** UI defaults to Japanese. Jury speaks Ukrainian → switcher `JA / UK / EN`
   in the header; `?lang=uk` / `?lang=en` deep links. (English was added at the team's request.)
2. **Data-driven.** Every screen is tied to an exit-survey churn reason and a metric (jury mode, see below).
3. **Do not pose as Wittio.** Header says "Wittio · CC-146 concept". No real logo, no personal data collection,
   no real payment.
4. **No medical promises.** Never write "raises IQ", "prevents dementia" (Lumosity/FTC 2016) — except inside the
   mandatory disclaimer `common.disclaimer`.

### Numbers from the case used in UI
- Trial $1, then $35 every 4 weeks → shown in JPY via `src/config.ts` (`USD_JPY = 150`) with an
  "illustrative" note: ¥150 / ¥5 250 per 4 weeks. Use `formatJPY(TRIAL_JPY)` etc., never hard-code.
- Exit survey: 30% "got what I wanted", 25% "didn't use it", 25% "too expensive", 15% "repetitive".
- 55% of payers never opened the product after the result; D30 = 5%.

## Tech (do not change without a reason)
Vite 6 + React 18 + TS (strict), context + useReducer persisted to localStorage (try/catch, see `src/state/persist.ts`),
vite-plugin-pwa (offline after first open), CSS variables (`src/styles/global.css`) + CSS modules, **no UI libraries,
no chart libraries** — hand-written SVG; CSS transitions + requestAnimationFrame for counters; i18n in
`src/i18n/{ja,uk,en}.json` + `useT()`; Vitest for `src/engine/*`; Playwright smoke test.

Design tokens: bg `#F5F6FA`, cards `#FFFFFF`, borders `#E2E4EE`, text `#10111C`, muted `#565A75`, accent `#5B47FF`,
accent-soft `#EFEDFF`, risk `#F26B3A` (risk is **not** a text colour on white — contrast < 4.5; use `#B6431B` for
risk text or put it on fills). Fonts: Noto Sans JP (ja), Onest (uk/en). Layout for 390×844, min tap target 44 px,
text contrast ≥ 4.5:1. Respect `prefers-reduced-motion`.

## What already exists (Phase 1, orchestrator)
- `src/state/types.ts` — **shared contracts** (Ability, Lang, GameId, GameResult, Profile, AppState, Action).
- `src/state/reducer.ts` / `store.tsx` — actions: `setLang`, `setStage`, `toggleJury`,
  `assessmentDone {kind:'baseline'|'retest', results}`, `trainingDone {result, durationMs}`,
  `demoAdvance {days}`, `reset`. Reducer handles index, streak, today's plan, minutes, index history.
- `src/engine/*` — **placeholder** implementations with the fixed signatures:
  `normalize`, `buildProfile`, `updateIndex`, `nextLevel`, `pickForm`, `planForToday` (+ `days.ts` helpers).
- `src/games/index.ts` — `GAMES` registry + `ASSESSMENT_ORDER`; currently placeholder components.
  `src/games/types.ts` — `GameProps { mode, form, onDone, durationMs?, startLevel?, demoDayOffset? }`.
- `src/app/router.ts` — hash router: `useRoute()`, `navigate(path, {replace})`, `PATHS`.
- `src/app/Shell.tsx` — header (brand, JA/UK/EN, Jury toggle), bottom tab bar on home screens
  (today / index / report / profile).
- `src/app/AssessmentRunner.tsx` — runs 4 × 15 s assessment on a form, calls `onComplete(results)`.
  Used by Quiz (form A) and Retest (form B).
- `src/app/Play.tsx` — `/play/:gameId?from=onboarding|today`: intro → training game → dispatch `trainingDone`
  → navigate to `/index?from=…` (IndexStreak shows the "+N" delta from `state.lastIndexDelta`).
- `src/ui/Screen.tsx` — **every screen's root**: `<Screen juryKey="paywall">` sets `data-reason`/`data-metric`
  and renders the jury strip (texts in `jury.<key>.*`). `Button`, `Card`, `Toast`, `Disclaimer`, `Radar` exist.
- `scripts/i18n-check.mjs` (`npm run i18n:check`) — missing keys across ja/uk/en, unknown `t('…')` keys in code,
  placeholder mismatches, banned medical/IQ claims, list of ja strings marked `_review`.

## Screens (each root is `<Screen juryKey=…>`)
| # | Screen | Route | What happens | Churn reason → metric |
|---|---|---|---|---|
| 1 | Landing | `/` | Ad-entry imitation: 「あなたの脳の"弱点"を見つけて、1日10分で鍛えよう」, CTA "Start the assessment" | — → test conversion |
| 2 | Quiz (60 s) | `/quiz` | 4 mini tasks × 15 s: Stroop (attention), Corsi (memory), number series (logic), Go/No-Go (speed). Progress bar | — → completed test |
| 3 | ResultTeaser | `/teaser` | Radar of 4 abilities + highlighted weak zone. **No "IQ = …"** | 30% got what wanted → result = start |
| 4 | Paywall | `/paywall` | 「あなた専用の4週間トレーニングプラン」, weak zone, "re-test in 30 days", ¥150 → ¥5 250 / 4 weeks (illustrative). "Start plan" → **no payment**. Disclaimer at bottom | 25% too expensive → sell plan & progress |
| 5 | Onboarding | `/onboarding` | "First training right now — 3 min"; straight into first exercise (FlashGrid №41) | 25% didn't use → % opened product 45% → 65% |
| 6 | TodayPlan | `/today` | 3 exercises / 10 min, 2 on weak zone; check marks | → sessions/week |
| 7 | FlashGrid №41 | `/play/flash41` | Own adaptive game: cells flash, repeat sequence; levels 2–9, 2-up/1-down, level visible live | 15% repetitive → difficulty grows |
| 8 | IndexStreak | `/index` | Wittio Index with animated counter (+12), day ring, streak 「3日連続」 | → D7/D30 |
| 9 | LineMock | `/line` | Mock LINE-style push: 「今日の10分トレーニングの時間です」 (no real LINE logo) | 25% didn't use → D30 ≥ 10% |
| 10 | Retest | `/retest` | Button "Demo: +30 days" → re-assessment on **form B** → "Attention +7, memory +4" + progress line. Disclaimer at bottom | 30% got what wanted → 2nd charge 22% → 26–32% |
| 11 | WeeklyReport | `/report` | Minutes, games, growth per ability | 25% too expensive → value visible |
| 12 | Reset demo | (Profile) | Clears state → Landing | — |

Jury mode (`?jury=1` or header toggle) — strip on top of each screen: "Churn reason · Metric · Goal".

Mandatory disclaimer at the bottom of Paywall and Retest: `<Disclaimer />` (key `common.disclaimer`).

Japanese texts are drafts: `ja.json` has `"_review": true` at top level; the check script lists them.

## Rules for subagents
- Work only in your zone; you may add i18n keys **only under your own prefix** (`funnel.*`, `games.*`, `progress.*`)
  in **all three** files `ja.json`, `uk.json`, `en.json`. Short phrases, polite Japanese (です/ます).
- Do not change `src/state/types.ts`, `src/state/reducer.ts`, `src/app/*`, `src/ui/Screen.tsx` — if you really need a
  contract change, describe it in your final report instead.
- Use `t('…')` with string literals (so `i18n:check` can verify keys).
- Before finishing: `npm run typecheck`, `npm test`, `npm run i18n:check`, `npm run build` must pass.
- Commit your work in your worktree with clear English messages. Report the branch name and a summary.
