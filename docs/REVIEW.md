# Acceptance review — iteration 2 (council of 5 reviewers)

Reviewed commit `99720de` (8 Nov 2026), read-only, fresh context per reviewer, against the acceptance table in
`docs/ITERATION-2-PLAN.md` §6. Then one round of fixes (commits `b79dbc7`, `b3327e2` and the docs commit after them),
re-checked by the orchestrator. The previous review (iteration 1, commit `85f134c`) is in git history; its Lighthouse
numbers (78–89) are obsolete.

## Verdicts

| Reviewer | Verdict at `99720de` | After the fix round |
|---|---|---|
| Strategist | ACCEPT WITH FIXES — numbers and economics right; 2 of 6 jury questions unanswered ("opened", variety); 60 s with no margin | All P0/P1 fixed (below). Demo margin is still ≈ 0 s at a brisk pace: 50 s are fixed task time |
| UX/UI | ACCEPT WITH FIXES — all 7 criteria pass; Landing CTA below the fold at 664/553; "10 min" vs "~3 min" | Fixed |
| Japan | ACCEPT WITH FIXES — S4-2 applied; 特商法 block incomplete (trial ¥150 without 税込, CTA not saying a paid plan follows) | Fixed; trial length (7 days) remains a team decision |
| Psychometrician | ACCEPT WITH FIXES — bands honestly derived; Weekly Report showed raw deltas; memory ceiling at 10 s; weak-zone bias; 15 s weak zone kept only 8/12 with the old bot | Fixed; instrument sensitivity remains a stated limitation |
| QA | ACCEPT WITH FIXES — all gates green; reload during the 2nd re-test added +30 days each time; Go/No-Go ran while hidden; landscape | Fixed |

## Acceptance criteria — final state

| Criterion (plan §6) | Result | Evidence |
|---|---|---|
| Every jury strip has a deck number | PASS | e2e `jury-numbers` (ja/uk/en); `i18n:check` requires a digit in every `jury.*.metric` and no "—" |
| Loop economics 1.09 / 1.39 / 1.47 / 1.75× and ROMI +9 / +39 / +47 / +75 % | PASS | unit `economics.test.ts`, e2e `economics` at the 4 presets |
| Demo ≤ 60 s to Index, ≤ 120 s with re-test | PASS (no margin) | e2e `fast-mode`: 1 s/screen ≤ 60 s (59.9 s measured), 2–2.5 s/screen ≤ 72 s; with re-test ≈ 110 s |
| 6 jury questions answered on the phone | PASS | ROMI → Economics "how" + footer; conversion → Paywall strip + charge tiles; index → `progress.index.explain` ("not IQ"); re-test drops → `whyLower` + band note; repeats → Today strip (rotation, levels 2–9); "opened" → Economics hint (team definition) |
| No overlaps at 390×664 (jury), 375×553; landscape | PASS | e2e `layout-fit` incl. 844×390 |
| Index "before → after" + visible animation; no plan duplicates; nothing under the tab bar; Paywall price visible | PASS | UX review; unit plan test (240 plans); e2e |
| JA S4-2 lines, 特商法 block, new disclaimer, no banned words | PASS | Japan review + `i18n:check` |
| Identical-skill bot ≥ 80 % "Stable" on 12 seeds; weak zone kept | PASS | 10 s: 45–47/48, kept 11/12 · 15 s: 44/48, kept 11/12 |
| Human timings within ±15; Index < 1000 before day 30; empty games +0; forms never in training | PASS | `sim.test.ts`, `wittioIndex.test.ts`, `banks.test.ts` |
| e2e green; SW never reloads during play; Lighthouse Perf ≥ 95, A11y 100; offline loop | PASS | 31/31 e2e (Chromium); Lighthouse 99/97 · 100 · 100; WebKit not installed |

## Fixes applied after the review

**P0**
- Weekly Report: re-test deltas inside the error band are neutral ("within error"), per ability (`WeeklyReport.tsx`, `parts.tsx`).
- Loop economics defines "opened" (≥ 1 exercise within 7 days of paying — team definition).
- Today jury strip answers "repetitive": sessions 3.0 → 0.5 · 15 % "repetitive" → games rotate daily, difficulty adapts.

**P1**
- Re-test reload bug: the next re-test is due right after the demo jump (`daysUntilRetest` → `Math.max(0, …)`), the
  result title counts days to the re-test day, not to today.
- Landing: the primary action is sticky (visible at 390×664 and 375×553); only it, not the restart block.
- "10 minutes a day" → "3 exercises a day" (Landing, Paywall, LINE, demo texts; simulated days = 3 min).
- JA paywall: 「¥150で7日間のお試しをはじめる」, ¥150（税込）, auto-renewal note under the CTA, cancellation sentence +
  特定商取引法に基づく表記（デモ） on its own line; re-test demo title rewritten.
- Index explanation: "not IQ; abilities are measured only by the re-test". Fast-mode error note on the re-test.
- Corsi 10 s: span scale 2 → 5.5 and early slips count as span 3 → no ceiling at 88; fast memory band 48 → 43.
- Weak zone on standardised scores (population norms from `scripts/sim-norms.ts`); `weakestStable` in SD units.
- e2e: 15 s re-test stability run added; the scripted bot answers Series with the engine's item model.

**P2**
- Go/No-Go paused while the page is hidden; landscape layouts for Stroop, Series, Corsi and FlashGrid.
- Forms equated: 2 No-Go in the first 10 stimuli of every Go/No-Go form; Series form A tier 3 no longer steps by 5s.
- Economics: LTV/CAC and ROMI tiles first. Onboarding "Round 2" label. Paywall price column without a dangling "·".
- Count-up ticks evenly for small deltas. JA: ・ separators, 11月8日（日）, 継続 / 連続{n}日目, 苦手分野 everywhere,
  form-agnostic re-test texts (the 3rd test uses A2). Dead keys removed. SW e2e builds outside `test-results/`.

## Open items (not blocking)
- **Trial length** (7 days) is a placeholder — team decision.
- **Instrument sensitivity:** 1-minute tests detect a +1 SD change only ≈ 20–30 % of the time (15 s) — say so if asked.
- **Demo margin:** ≈ 0 s at a brisk pace; practise the taps or start the demo from the QR before speaking.
- **WebKit/Safari** not tested in the container (only Chromium is installed); check on a real iPhone before the pitch,
  especially Japanese heading breaks (zero-width spaces + `keep-all` fallback).
- Test with ~10 real people before the pitch (the simulated player is an assumption).
