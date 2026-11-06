# CC-146 · Wittio retention-loop prototype — team report

## Links
- **Production:** https://cc146-wittio.vercel.app/ (Japanese by default)
- Ukrainian: https://cc146-wittio.vercel.app/?lang=uk · English: https://cc146-wittio.vercel.app/?lang=en
- Jury mode: add `&jury=1` (or tap «Журі» in the header)
- Vercel project: `cc146-wittio` in team *The best team*; every push to `claude/wittio-retention-loop-4en8i2` deploys to production automatically.

## QR codes (`docs/demo/`)
| File | Opens |
| --- | --- |
| `qr.png` | `?lang=uk` — for the jury (slides 1 and 7) |
| `qr-ja.png` | Japanese (default) |
| `qr-en.png` | `?lang=en` |
| `qr-jury-uk.png` | `?lang=uk&jury=1` — with churn-reason strips |

## Deck screenshots (`docs/demo/screens/`, 1170×2532)
`{lang}-1-paywall.png`, `{lang}-2-today.png`, `{lang}-3-index.png`, `{lang}-4-retest.png` for uk, ja, en.
They are produced by `scripts/screenshots.mjs`: a scripted player plays every game for real on a fake clock.
The re-test is played with higher accuracy and faster taps to illustrate a user after 30 days of practice — say so if asked.

## 60-second demo script (Sasha, slide 7)
1. Jury scans the QR → assessment landing in Japanese; tap `UK` (or use the UK QR).
2. 4 mini-tasks × 15 s (colour/word, flash order, number series, quick reaction) → radar: "weak zone — memory".
3. Paywall: "4-week plan + re-test in 30 days", no payment → «Почати план».
4. FlashGrid №41: the level grows live → Wittio Index "+N", streak "1 day" → LINE-style reminder mock.
5. Today → «Демо: +30 днів» → re-test on form B → deltas per ability → "this is why people come back".

Timing: the quiz is exactly 60 s; everything else is ~15–25 s of taps.

## What is simulated (known limitations)
- **Payment** — illustrative prices only (¥150 trial → ¥5,250 / 4 weeks at `USD_JPY = 150`); nothing is charged.
- **LINE** — a mock lock-screen notification; nothing is sent, no real LINE logo.
- **30 days** — "Demo: +30 days" shifts the demo clock and assumes daily 10-minute training (index history, minutes, streak).
- **Re-test deltas are real** — they are the results of the form-B assessment just played, compared with form A.
  On stage they can be ±0 or negative if the person plays worse the second time. The screen says so honestly.
- **No backend** — state lives only in `localStorage` on the phone; "Reset demo" (Profile tab) clears it.
- **Offline** — works after the first open (service worker); fonts fall back to system fonts if not cached.

## Japanese strings to review
See `docs/JA_REVIEW.md` (all strings by screen, ⚠️ marks the ones to check first with a native speaker).
