# Wittio · CC-146 concept — retention-loop prototype

Prototype by team **CC-146** for the Case Challenge 3.0 final (SKELAR × Horizon Capital × Mastercard).
**Not an official Wittio product** — no real logo, no sign-up, no personal data, no payment.

`test → ability profile → daily 10-min plan → live Wittio Index → re-test after 30 days → again`

- UI languages: **Japanese** (default), **Ukrainian**, **English** — header switch `JA / UK / EN`, or `?lang=uk`, `?lang=en`.
- Jury mode: header toggle or `?jury=1` — each screen shows *churn reason · metric · goal*.
- Installable PWA, works offline after the first open. State lives only in `localStorage` on the device.

## Run

```bash
npm ci
```

```bash
npm run dev
```

| Script | What |
| --- | --- |
| `npm run build` | type-check + production build (`dist/`) |
| `npm test` | Vitest unit tests for the scoring engine (`src/engine`) |
| `npm run e2e` | Playwright smoke test of the whole loop at 390×844 in ja/uk/en + offline |
| `npm run i18n:check` | missing keys, unknown keys in code, banned medical/IQ claims, list of ja strings to review |
| `npm run icons` | re-render PWA icons |

## Structure

```
src/
  app/        App (routes), Shell (header, language, jury), router (hash), AssessmentRunner, Play
  state/      types (shared contracts), reducer, store (context + useReducer), persist (localStorage)
  engine/     scoring, adaptive (2-up/1-down), forms (A/B + daily plan), days — pure functions + tests
  games/      Stroop, CorsiGrid, Series, GoNoGo, FlashGrid41
  screens/    funnel/ (Landing, Quiz, ResultTeaser, Paywall, Onboarding)
              progress/ (TodayPlan, IndexStreak, LineMock, Retest, WeeklyReport, Profile)
  i18n/       ja.json, uk.json, en.json, useT
  ui/         Button, Card, Screen, Radar, Ring, Sparkline, CountUp, PhoneNotification, Toast, Disclaimer
```

## What is simulated

- **Payment** — the paywall shows illustrative prices (¥150 trial → ¥5,250 / 4 weeks at `USD_JPY = 150`), nothing is charged.
- **LINE reminder** — a mock lock-screen notification; nothing is sent.
- **30 days** — "Demo: +30 days" shifts the demo clock and assumes daily training (index history, minutes);
  the ability deltas on the re-test are **real** results of the form-B assessment you just played.

See `docs/BRIEF.md` for the full brief and `docs/REPORT.md` for the demo script and the Japanese strings to review.
