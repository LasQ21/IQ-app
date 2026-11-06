# Independent review — Wittio · CC-146 concept (reviewer E)

Reviewed commit `85f134c` (branch `worktree-agent-a0ebe25f95a4ac76b`). Nothing in `src/` was changed.
All browser checks ran against `npm run build && npx vite preview --port 4181` (a separate port, so they could not hit another worktree's server), in
Chromium 1243 with the iPhone 13 profile at 390×844 (`hasTouch`, `isMobile`). Lighthouse 12.8.2 ran in mobile mode.
Throwaway scripts were kept outside the repo (`…/scratchpad/review/specs/*.spec.ts`, `seed.mjs`, `unit/reducer.review.test.ts`).

## Summary

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Playwright smoke (`tests/e2e.spec.ts`) | **PASS** (4/4); coverage **PARTIAL** | ja 38 s, uk 38 s, en 38 s, offline 0.7 s; the gaps are listed below |
| 2 | Offline after the first open | **PASS** | The SW controls the page after the first load (clientsClaim). Offline reload showed Landing in 96 ms. The whole loop ran offline (quiz → teaser → paywall → FlashGrid → index → LINE → retest result), plus the `/#/report` deep link and the `/some/path` fallback. Fonts fall back to the system font. 3 console errors appear for the uncached Google Fonts CSS (#14) |
| 3a | Lighthouse Performance ≥ 90 | **FAIL** | Landing `/` (ja): **78** and **87** over two runs. `/?lang=en`: **89**. Seeded `/#/today`: 100, but measured with a warm HTTP cache. LCP 3.4–5.3 s, of which 91 % is render delay (#5) |
| 3b | Lighthouse Accessibility ≥ 90 | **PASS** | 100 on every run. Best Practices 100. SEO 91 (`robots.txt` is served as the SPA fallback by `vite preview`) |
| 3c | PWA installability (manual) | **PASS** (minor gaps) | The manifest has name, short_name, `start_url: "/"`, scope `/` and `display: standalone`. Icons 192 / 512 / maskable-512 return 200 and their real pixel sizes match. apple-touch-icon is 180×180. The SW has a navigate fallback and controls the page after the first load. Missing: iOS meta tags and manifest `id` (#16) |
| 4 | Network / localStorage / console | **PASS** | No request left the app origin and Google Fonts in any run. Every `localStorage` call is inside a try/catch (`src/state/persist.ts` only). The funnel and retest completed with `Storage.prototype.get/set/removeItem` throwing, and with the `window.localStorage` getter throwing. 0 `console.error`s or page errors online in all runs |
| 5 | Texts / compliance | **PASS** | The disclaimer is the last text of Paywall and Retest in ja/uk/en. There is no IQ number and no "IQ ↑". "IQ" and "dementia" appear only inside `common.disclaimer`. The header shows the "CC-146 concept / コンセプト / концепт" label on every screen. The LINE mock uses a generic green square with 3 dots, not the LINE logo. There are no inputs and no fetch/beacon calls. Payment is labelled "no payment" and "illustrative" |
| 6 | UX at 390×844, touch | **PARTIAL** | No horizontal overflow on any screen in 3 languages. Every game fits without scrolling (lowest control ≤ 626 px, page height = 844). Contrast passes (an automated per-text-node check, verified with a probe). Deep links, persistence, jury strip, Reset and reload mid-flow all work. **But** the language buttons are 36×40 px on every screen and the Index chip is 32 px tall (#6, #7) |
| 7 | Demo-script timing | **FAIL** | A human-paced run (real clock, real taps) took **96.5 s from Landing to Index** (target ≤ 90 s) and **174 s up to the retest deltas**. The 4 × 15 s quiz takes 75 s (#4) |
| 8 | Engine | **PARTIAL** | `npm test` 42/42 green. The index never decreases after training. But memory is structurally capped (#1), retest deltas are noisy (#2), the profile snaps back after the retest (#3), and there are several streak/plan edge cases (#9–#13) |
| 9 | Code review | **PASS** (minor findings) | Timers are cleared on unmount, `useEnd` guards against a double `onDone`, StrictMode-safe effects, no `any`, no `@ts-ignore`, and `tsc` is strict. iOS CSS falls back cleanly (#18) |

### Gaps in `tests/e2e.spec.ts` vs. the brief
1. No game is actually played: the fake clock runs every task out with no taps, so all scores are 0. Nothing checks that the radar renders, that the weak zone is highlighted, or that scores are sane.
2. Nothing checks that the FlashGrid level visibly grows. For "Index +N" it only checks for a `+` character. Streak "1 day" is not checked.
3. Nothing checks the effect of "Demo: +30 days" (day 31, streak 31). Retest deltas are only checked for visibility, never compared with the baseline values.
4. The language switcher buttons are never clicked; only `?lang=` is used. Persistence across reload, `?jury=1`, and the jury strip on any screen except Today are not tested.
5. The disclaimer test only checks visibility; it does not check that it is at the bottom of the screen. The banned-claims check is one regex (`IQ\s*[=:＝]`) on Teaser only.
6. The offline test does a second **online** reload before going offline, so it never tests "first open only", and it only checks that Landing renders, not the loop.
7. There are no tap-target, contrast, no-scroll-during-play, reload-mid-flow or localStorage-failure tests (my scripts above cover them).

### Lighthouse details (mobile, simulated throttling)
| URL | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `/` (ja) run 1 | 78 | 100 | 100 | 91 | 2.2 s | 5.3 s | 30 ms | 0 |
| `/` (ja) run 2 | 87 | 100 | 100 | 91 | 2.2 s | 3.7 s | 0 ms | 0 |
| `/?lang=en` | 89 | 100 | 100 | 91 | 2.2 s | 3.4 s | 0 ms | 0 |
| `/#/today` (seeded localStorage, SW removed, HTTP cache warm) | 100 | 100 | 100 | 91 | 0.8 s | 0.8 s | 0 ms | 0 |

Top failing audits on the landing page:
- `render-blocking-resources`: the Google Fonts CSS (93 KB, ~1.6 s), `registerSW.js` and the app CSS.
- `unused-css-rules`: 90 KB of the Google Fonts CSS.
- `unminified-css` (fonts CSS) and `unused-javascript` (38 KiB).
- LCP element = the h1. Render delay is 4.9 s (run 1) or 3.2 s (run 2), spent waiting on the CSS plus ~20 Noto Sans JP woff2 subsets (~480 KB).

JS 252 KB (82 KB gzip), CSS 31 KB (7 KB gzip), precache 16 entries, 334 KiB.

### Timing breakdown (human-paced run, en)
Simulated pauses: 3 s reading Landing, 2.5 s on each task intro, 3.5 s each on Teaser and Paywall, 2 s on Onboarding, and a ~650 ms reaction time.

| Mark | t (s) |
|---|---|
| Landing visible | 0.5 |
| Radar (Teaser) | **75.8** (the quiz alone takes 75 s) |
| Paywall | 79.4 |
| Onboarding | 82.9 |
| FlashGrid starts | 86.5 |
| FlashGrid level 2 → 3 | 95.7 |
| **Index "+5", streak "1 days in a row"** | **97.0** |
| Today | 101.6 |
| "Demo: +30 days" tapped | 104.7 |
| Retest deltas | 173.8 (memory −18, attention 0, logic 0, speed 0) |

---

## Defects (sorted by severity)

There are **no blockers**: the loop runs end to end in every language, online and offline, with no errors.

### Major

**1. Memory is structurally capped at ≈ 50, so the "weak zone" is almost always Memory.**
- *Where:* `src/games/CorsiGrid/index.tsx` (`TIMING`, `START_SPAN 3`), `src/engine/scoring.ts` (corsi: `lin(span, 2, 8)`), `ASSESSMENT_MS = 15 000`.
- *Repro:* play the quiz perfectly (my bot answered every item correctly).
- *Actual:* baseline memory 33, attention 91, logic 95, speed 85, so weakest = memory. Span 3 + span 4 + span 5 fit into 15 s only with near-instant taps (playback alone is 450 + k·560 ms). The best possible `bestLen` is 5, which scores 50. The other three tasks reach 85–95. A capable user is therefore always told "Memory", the plan is always flash41 + corsi, and the "data-driven" weak zone is an artefact of the scoring.
- *Expected:* the four abilities sit on comparable scales for the same level of skill.
- *Fix:* calibrate corsi against the span reachable in 15 s (e.g. `lin(span, 2, 6)`). Or speed up assessment playback (onMs ≈ 300, stepMs ≈ 400), or start at span 4. Add an engine test that a perfect player has all four abilities within ±15 of each other.

**2. Retest deltas are noisy and hit a ceiling: the jury can see "Memory −18" after "30 days of training".**
- *Where:* corsi scoring (one span step = 16.7 points); stroop/series at ~90+ for good players; `Retest.tsx` `DeltaGrid`.
- *Repro:* the human-paced run (perfect bot both times).
- *Actual:* memory 33 → 15 (−18) from a single missed span-4 sequence (only 2–3 trials fit in 15 s). Attention, logic and speed all 0, because they were at the ceiling. The brief's demo beat is "Attention +7, memory +4".
- *Fix:*
  - Make memory more reliable: more, shorter trials; score on accuracy plus span.
  - Raise the ceilings (harder late items in series/stroop).
  - Consider showing "measured change ± noise" or hiding deltas within ±5 as "stable".

  The deltas must stay real, but they should not be dominated by one tap.

**3. The live profile snaps back toward the baseline right after the retest.**
- *Where:* `src/state/reducer.ts` `trainingDone` → `buildProfile(results)` (last 3 results per ability, mixing baseline form A, retest form B and training).
- *Repro:* see `unit/reducer.review.test.ts`. Do a retest, then play one flash41 from Today.
- *Actual:* scores go from `{memory:33, attention:82, logic:77, speed:68}` to `{31, 73, 64, 63}`. Playing a *memory* game lowered attention by 9, so Profile and Report contradict the retest the user just saw.
- *Fix:* after a retest, build `current` only from results played since `lastRetestDay`, or update only the trained ability.

**4. The demo script does not fit the 60–90 s window.**
- *Where:* the funnel design (`ASSESSMENT_MS`, intro cards in `AssessmentRunner`), and again in Retest.
- *Actual:* Landing → Index 96.5 s; to the retest deltas 174 s. The slowest part is the 4 × 15 s quiz plus 4 intro cards (≈ 75 s, 78 % of the time). The retest repeats it (≈ 69 s).
- *Fix (jury mode only):* make the tasks 8–10 s, auto-start the next task (skip the intro card or use a 1.5 s countdown), and start FlashGrid one level below the growth threshold so the first two correct answers bump the level.

**5. Lighthouse mobile Performance is below 90 on Landing (78 / 87 ja, 89 en).**
- *Where:* `index.html`: the render-blocking `fonts.googleapis.com` stylesheet (Noto Sans JP 400/500/700 + Onest) and the `registerSW.js` script in `<head>`.
- *Actual:* LCP 3.4–5.3 s, with 91 % render delay. Noto Sans JP pulls ~120 `@font-face` blocks (93 KB of CSS) and ~20 woff2 files (~480 KB).
- *Fix:*
  - Load the fonts non-blocking (`rel=preload as=style` + onload swap, or `media="print" onload`).
  - Drop weight 500, or use the system Japanese fonts (`Hiragino Sans` on iOS, which is the jury's likely device) and keep only Onest.
  - Set vite-plugin-pwa `injectRegister: 'script-defer'`.
  - Optionally self-host and precache the Onest woff2.

**6. The language switcher tap targets are 36×40 px (brief: ≥ 44 px), on every screen.**
- *Where:* `src/app/app.module.css` `.seg button { min-width: 36px; min-height: 40px }`.
- *Repro:* measured on all screens in all 3 languages (`ux.spec.ts`).
- *Fix:* `min-width: 44px; min-height: 44px`. The header has room: brand + segment + Jury fit at 390 px; re-check that there is still no overflow.

### Minor

**7. The "Wittio Index NNN" chip on Today is 121–131 × 32 px** (`TodayPlan.tsx` `.chip`, an `<a>`). It is a link, so it needs a 44 px target. Fix: `min-height: 44px`, or pad the hit area.

**8. A zero-effort session counts.** Tapping "Finish" right after "Start" gives Index +3 and "Streak 1 day" (`trainingDone` with `meta.total = 0`; `updateIndex` minimum gain of 3). In the demo a jury member can tap Finish and see growth for nothing. Fix: when `total === 0`, don't update the index, streak or plan; or disable Finish until the first trial resolves.

**9. On day 1 the index sparkline is flat.** `pushHistory` replaces the same-day point, so the baseline 505 is overwritten by 508 and the "Index over time" card shows a single point. The key "live score" visual shows no growth. Fix: keep the baseline point (e.g. a `baselineIndex` field or `{day, index, kind}`), or plot intra-day points on day 1.

**10. `demoAdvance` adds 30 to a stale streak.** A streak of 5 last active 10 days ago becomes 35; it should be 30 (`reducer.ts` `demoAdvance`). Fix: reset to 0 first when `lastActiveDay < today − 1`. The same applies when today was not trained before the jump.

**11. A retest on the due day wipes today's check marks.** `assessmentDone` (retest) sets `plan: undefined` and then calls `withFreshPlan`, so 1 done item becomes 0. Fix: keep the `done` flags for games still in the regenerated plan, or regenerate from tomorrow.

**12. Re-taking the quiz from Landing silently rewrites the baseline and lowers the index (560 → 505).** It keeps the old results, streak and demo offset. "Start the assessment" stays the primary button even next to "Continue" (`Landing.tsx`). Fix: for a returning user, make Continue primary, and make a re-take reset the state (or ask for confirmation).

**13. `?lang=` / `?jury=` stay in the URL and override the persisted choice on every reload or reopen.** Scan the QR with `?lang=en`, switch to JA, reload: the app is back in EN (`store.tsx` `readUrlFlags`). Fix: after applying the flags, strip them with `history.replaceState`.

**14. Offline after only the first open, the Google Fonts CSS is not cached**, because the SW was not yet controlling that request. Every offline load logs 3× `Failed to load resource: net::ERR_FAILED`. The fallback font is fine. On a slow network ("lie-fi") the render-blocking stylesheet can hold the first paint until it times out. Fix: the same as #5 (non-blocking or self-hosted, precached fonts).

**15. The jury strip on Profile is "— · — · —"** (`jury.profile.*`). The strip is there but carries no reason, metric or goal; the brief wants all three on every screen. Fix: e.g. reason "30% got what they wanted", metric "repeat re-test", or hide the strip on a utility screen and say so.

**16. iOS PWA meta tags are missing.** There is no `apple-mobile-web-app-capable`, `mobile-web-app-capable`, `apple-mobile-web-app-title` (the home-screen name falls back to the long `<title>`) or `apple-mobile-web-app-status-bar-style`. The manifest has no `id`. Fix: add them to `index.html` and `vite.config.ts`.

**17. EN pluralisation: "1 days in a row".** This shows on the Index screen at the exact moment of the demo script (`en.json` `progress.streak`, also used by Profile and LINE). It needs a singular form or `Intl.PluralRules`. This is text, so it is low priority given the parallel i18n work, but it is visible.

**18. `Play.tsx` calls `navigate()` during render for an unknown `gameId`.** This is a side effect in render and is double-invoked under StrictMode. No warning was observed and `/play/nope` lands on `/today`. Fix: move it to `useEffect`.

**19. There are no unit tests for the reducer.** Streak, day-change and plan logic (#3, #9–#11) are only exercised indirectly through e2e. Fix: add `src/state/reducer.test.ts`.

### Nits

**20. Dead code and unused assets.** `src/ui/Toast.tsx` is unused. `public/og-image.png` (27 KB) is precached but referenced nowhere; there are no `og:` meta tags. Since the jury gets a QR or link, adding `og:title` / `og:image` would help messenger previews.

**21. `README.md` links `docs/REPORT.md`, which does not exist.**

**22. The `scripts/i18n-check.mjs` Ukrainian banned pattern `/підвищ\w*\s+…IQ/i` cannot match inflected forms.** `\w` does not match Cyrillic without `u` + `\p{L}`, so "підвищує ваш IQ" would pass. Fix: `/підвищ\p{L}*\s+(ваш\p{L}*\s+)?IQ/iu`.

**23. Saved state has no schema version or validation.** For example, `results: null` from a future shape would crash `trainingDone` (`[...s.results]`). The risk is low because only the app writes the key. Fix: add a `v` field, or validate and fall back to `initialState`.

**24. `navigate(..., { replace: true })` does not `scrollTo(0, 0)`**, unlike the `hashchange` path. No visible problem was found (the screens left this way are short), but it is inconsistent.

**25. The LINE notification slides in over the lock-screen clock for ~0.3 s** during its entrance transition (seen in a mid-animation screenshot). This is cosmetic.

**26. `robots.txt` resolves to `index.html` under `vite preview`** (Lighthouse SEO 91). On Vercel the rewrite skips dotted paths, so this is preview-only.

## Things checked and found OK
- No timers or rAF loops leak: `useTimeouts`, `useSessionClock`, `useFlashPlayback`, `GameFrame` and `CountUp` all clean up.
- `useEnd` makes `onDone` fire exactly once, even when a time-up and a "Finish" tap race.
- Game state survives a language switch mid-game, because keys are stable.
- Keys are unique; there is no `any` and no `@ts-ignore`; `tsc` is strict with `noUnused*`.
- iOS Safari fallbacks:
  - `word-break: auto-phrase` and `text-wrap` are simply ignored.
  - `100dvh` needs iOS 15.4+ (there is no `100vh` fallback, but `min-height` degrading to `auto` is harmless).
  - `backdrop-filter` is `-webkit-` prefixed in the build.
  - `:has()` and `structuredClone` are not used.
  - Pointer events need iOS 13+.
  - Games use `touch-action: manipulation`, `-webkit-user-select: none` and `-webkit-touch-callout: none`.
  - Safe-area insets are handled in the header and tab bar.
- Reload mid-flow:
  - Mid-quiz: restarts task 1.
  - `/teaser`, `/paywall`, mid-FlashGrid, `/index`, `/today`: restored.
  - Mid-retest: the +30 offset is kept, the intro offers "Start the re-test" with no double jump, and finishing it shows the deltas.
  - Corrupt saved state with a bad `lang` or empty `baseline.scores`: no crash.
- Reset demo: localStorage is cleared except `lang` and `juryMode` (by design). Guarded routes then bounce to Landing.
- Every jury strip (with `?jury=1&lang=uk`) shows three parts with no leaked i18n keys, including the Play screens.
