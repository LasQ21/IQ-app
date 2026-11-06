# Japanese copy review (ja.json)

All 227 UI strings, grouped by screen, for a review by a native Japanese speaker.
The Japanese is an editorial draft. It was not written by a native speaker, so `ja.json` keeps `"_review": true`.

- **⚠️ = check these first.** These are the strings we are least sure about. The last column says why.
- EN shows what each string means. UK is the Ukrainian the jury reads.
- `{n}`, `{ability}`, `{price}`… are placeholders that the app fills in. Keep them exactly as they are, but you may move them within the sentence.
- To propose a change, edit the value in `src/i18n/ja.json` (never the key), then run `npm run i18n:check`.

## Top 10 to check first

1. `funnel.landing.start` テストをはじめる (and `funnel.quiz.title` 60秒テスト): we use **テスト**, not 診断, so it does not read as a medical diagnosis. Is 診断 better for an ad landing page, and is it acceptable?
2. `progress.retest.title` 30日ごとの再測定: is **再測定** the right word for "re-test"? (The alternative is 再テスト.)
3. `progress.today.retestText` 別の問題セット（B）…: is **問題セットA/B** clear for the psychometric "parallel forms"?
4. `games.common.wrong` おしい！: is it the right tone for every wrong answer?
5. `jury.teaser.reason` 30%「知りたいことは分かった」: does this render the exit-survey answer "got what I wanted" naturally?
6. `funnel.onboarding.sub` 結果を見た今が、はじめどきです。
7. `progress.index.scale` トレーニングの積み重ねを0〜1000で表します: it must not promise that abilities go up.
8. `common.brandShort` CC-146のコンセプト案: it must make clear that this is not the real company.
9. `games.flash41.name` FlashGrid No.41: we kept the Latin name because the katakana version wrapped onto two lines.
10. `funnel.landing.titleWeak` “弱点”: the landing headline comes from the brief and is unchanged, except that the straight quotes were made curly. Would 「弱点」 be better?

## Glossary (one term per concept, used on every screen)

| Concept | 日本語 | EN | UK | Notes |
|---|---|---|---|---|
| weak zone / weak spot | 弱点 | weak spot | слабке місце | The headline highlights it as “弱点”. Inside a sentence the ability is quoted: 弱点の「処理速度」 |
| first assessment | テスト（最初のテスト） | test (first test) | тест (перший тест) | Not 診断: it suggests a medical diagnosis |
| re-test (day 30) | 再測定 | re-test | повторний тест | Verb: 測り直す / 再測定する |
| parallel form A / B | 問題セットA / B | form A / B | форма A / B | Short form in the radar legend: 現在（B） / 30日前（A） |
| assessment task (15 s) | 課題 | task | завдання | Only for the 4 quiz tasks |
| training / one exercise | トレーニング | training / exercise | тренування / вправа | EN uses "exercise" for one game in the plan and "session" for the daily 10 minutes |
| plan | プラン | plan | план | 4週間のプラン, 今日のプラン |
| Wittio Index | Wittio指数 (指数 for short) | Wittio Index | Wittio Index / індекс | The product's own score. Never written as an IQ |
| streak | 連続日数 (label) · {n}日連続 (value) | streak · {n}-day streak | серія · {n} дн. поспіль | |
| ability names | 記憶力・注意力・論理力・処理速度 | Memory, Attention, Logic, Speed | Пам’ять, Увага, Логіка, Швидкість | |
| reminder | リマインダー / リマインド | reminder | нагадування | LINE is shown as a mock only |
| start (CTA verbs) | 〜をはじめる (hiragana) | Start … | Почати / Пройти | The generic game-intro button stays スタート |

## Typography rules applied

- Polite です/ます style in sentences. Short buttons and labels use noun phrases or 〜する. In-game feedback interjections (正解！ おしい！ もう少し速く！) are plain-form on purpose.
- Numbers and Latin letters are half-width (60秒, Lv 2, No.41, 0〜1000). Japanese punctuation is full-width (、。「」（）：！？／＝).
- Ranges use 〜 (0〜100, 26〜32%).
- Separators: `・` lists short tags (登録不要・お支払いなし・…). ` · ` separates a title from a meta value (今日のプラン · 10分). The second rule matches the ` · ` that the code inserts between fields.
- No spaces between Japanese words, or between Japanese and Latin words (CC-146のコンセプト案). The exceptions are unit spacing in `平均 {n} ms` and `Lv {n}`.
- UK uses «» quotes, the apostrophe ’, a non-breaking space between a number and its unit (10 хв, 30 днів), and **застосунок** instead of *додаток*. EN uses ’ and “”.

## Compliance notes

- The only medical or IQ wording is in `common.disclaimer` (ja/uk/en), which is allow-listed. `scripts/i18n-check.mjs` blocks claims like these in all three languages: IQ gain or IQ results, 頭が良くなる, 認知症, 脳の老化, 〈ability〉が向上/改善, 臨床/科学的に証明, *smarter*, *clinically / scientifically proven*, *improve/boost your memory/brain*, *розумніш*, *клінічн*, *покращ… пам’ять/увагу*.
- We avoid wording that implies improvement. We use 鍛える / train, 変化 / change instead of growth, and 実際の変化を測る / measure real change. The paywall says 数値はお約束しません (we don't promise numbers).
- The brand appears as "Wittio" + CC-146のコンセプト案 in the header, and as "Wittio（CC-146のコンセプト案）" as the sender of the mock notification.
- No string contains a hard-coded price. Every ¥ amount comes from `{price}` / `{trial}` (`src/config.ts`).

## All strings

### Header, shared and disclaimer

| | Key | 日本語 | EN (meaning) | UK | Note for reviewer |
|---|---|---|---|---|---|
|  | `common.brand` | Wittio · CC-146チームによるコンセプト案 | Wittio · concept by team CC-146 | Wittio · концепт команди CC-146 |  |
| ⚠️ | `common.brandShort` | CC-146のコンセプト案 | CC-146 concept | концепт CC-146 | Header sub-line under "Wittio". コンセプト案 is meant to make clear this is NOT the real company. Natural? |
|  | `common.jury` | 審査員 | Jury | Журі |  |
|  | `common.juryReason` | 離脱理由 | Churn reason | Причина відтоку |  |
|  | `common.juryMetric` | 指標 | Metric | Метрика |  |
|  | `common.juryGoal` | 目標 | Goal | Мета |  |
|  | `common.lang` | 言語 | Language | Мова |  |
|  | `common.next` | 次へ | Next | Далі |  |
|  | `common.back` | 戻る | Back | Назад |  |
|  | `common.close` | 閉じる | Close | Закрити |  |
|  | `common.start` | スタート | Start | Почати |  |
|  | `common.done` | 完了 | Done | Готово |  |
|  | `common.minutes` | {n}分 | {n} min | {n} хв |  |
|  | `common.days` | {n}日 | {n} d | {n} дн. |  |
|  | `common.illustrative` | ※価格はイメージです | * prices are illustrative | * ціни ілюстративні |  |
|  | `common.disclaimer` | ※本アプリは医療機器ではなく、IQの向上や認知症の予防を保証するものではありません。 | This app is not a medical device and does not guarantee higher IQ or dementia prevention. | Застосунок не є медичним виробом і не гарантує підвищення IQ чи профілактику деменції. |  |
|  | `common.resetDemo` | デモをリセット | Reset demo | Скинути демо |  |
|  | `common.resetConfirm` | デモをリセットしますか？すべての進捗が消えます。 | Reset the demo? All progress will be cleared. | Скинути демо? Увесь прогрес буде видалено. |  |
|  | `common.abilities.memory` | 記憶力 | Memory | Пам’ять |  |
|  | `common.abilities.attention` | 注意力 | Attention | Увага |  |
|  | `common.abilities.logic` | 論理力 | Logic | Логіка |  |
|  | `common.abilities.speed` | 処理速度 | Speed | Швидкість |  |
|  | `common.nav.today` | 今日 | Today | Сьогодні |  |
|  | `common.nav.index` | 指数 | Index | Індекс |  |
|  | `common.nav.report` | レポート | Report | Звіт |  |
|  | `common.nav.profile` | プロフィール | Profile | Профіль |  |
|  | `app.progress` | {n} / {total} | {n} / {total} | {n} / {total} |  |
|  | `app.seconds` | {n}秒 | {n} s | {n} с |  |

### Jury strip (jury mode only)

| | Key | 日本語 | EN (meaning) | UK | Note for reviewer |
|---|---|---|---|---|---|
|  | `jury.landing.reason` | — | — | — |  |
|  | `jury.landing.metric` | テスト開始率 | Ad → test conversion | Конверсія в тест |  |
|  | `jury.landing.goal` | 広告からの流入をテストへ | Send ad traffic into the test | Трафік з реклами → тест |  |
|  | `jury.quiz.reason` | — | — | — |  |
|  | `jury.quiz.metric` | テスト完了率 | Test completion | Завершення тесту |  |
|  | `jury.quiz.goal` | 60秒で完了 | Done in 60 s | Тест за 60 секунд |  |
| ⚠️ | `jury.teaser.reason` | 30%「知りたいことは分かった」 | 30% “got what I wanted” | 30% «отримав, що хотів» | Rendering of the exit-survey answer "got what I wanted" (people saw their score and left). Natural? |
|  | `jury.teaser.metric` | 結果はゴールではなくスタート | Result = a start, not the end | Результат = початок, а не кінець |  |
|  | `jury.teaser.goal` | 弱点を見せて次の一歩へ | Show the weak spot and the next step | Показати слабке місце і наступний крок |  |
|  | `jury.paywall.reason` | 25%「高すぎる」 | 25% “too expensive” | 25% «задорого» |  |
|  | `jury.paywall.metric` | レポートではなく、プランと進捗を売る | Sell the plan and progress, not a report | Продаємо план і прогрес, а не звіт |  |
|  | `jury.paywall.goal` | 4週間で価値を見える化 | Value visible within 4 weeks | Цінність видно за 4 тижні |  |
|  | `jury.onboarding.reason` | 25%「使わなかった」 | 25% “didn’t use it” | 25% «не користувався» |  |
|  | `jury.onboarding.metric` | 結果のあとにアプリを開いた割合 | % who open the product after the result | % тих, хто відкрив продукт після результату |  |
|  | `jury.onboarding.goal` | 45% → 65% | 45% → 65% | 45% → 65% |  |
|  | `jury.today.reason` | 25%「使わなかった」 | 25% “didn’t use it” | 25% «не користувався» |  |
|  | `jury.today.metric` | 週あたりのセッション数 | Sessions per week | Сесій на тиждень |  |
|  | `jury.today.goal` | 1日10分の習慣 | A 10-minute daily habit | Звичка: 10 хв на день |  |
|  | `jury.flash41.reason` | 15%「同じことの繰り返し」 | 15% “it’s repetitive” | 15% «усе повторюється» |  |
|  | `jury.flash41.metric` | 成長に合わせて難易度が上がる | Difficulty grows with the user | Складність зростає разом із користувачем |  |
|  | `jury.flash41.goal` | 飽きさせない | Never gets stale | Не набридає |  |
|  | `jury.index.reason` | 25%「使わなかった」 | 25% “didn’t use it” | 25% «не користувався» |  |
|  | `jury.index.metric` | D7 / D30 | D7 / D30 | D7 / D30 |  |
|  | `jury.index.goal` | 毎日戻ってくる理由 | A reason to come back daily | Причина повертатися щодня |  |
|  | `jury.line.reason` | 25%「使わなかった」 | 25% “didn’t use it” | 25% «не користувався» |  |
|  | `jury.line.metric` | D30 | D30 | D30 |  |
|  | `jury.line.goal` | 5% → 10%以上 | 5% → ≥ 10% | 5% → ≥ 10% |  |
|  | `jury.retest.reason` | 30%「知りたいことは分かった」 | 30% “got what I wanted” | 30% «отримав, що хотів» |  |
|  | `jury.retest.metric` | 2回目の課金 | 2nd charge | Друге списання |  |
|  | `jury.retest.goal` | 22% → 26〜32% | 22% → 26–32% | 22% → 26–32% |  |
|  | `jury.report.reason` | 25%「高すぎる」 | 25% “too expensive” | 25% «задорого» |  |
|  | `jury.report.metric` | 4週間の価値が見える | 4-week value is visible | Видно цінність 4 тижнів |  |
|  | `jury.report.goal` | 更新率を高める | More renewals | Більше продовжень |  |
|  | `jury.profile.reason` | — | — | — |  |
|  | `jury.profile.metric` | — | — | — |  |
|  | `jury.profile.goal` | — | — | — |  |

### 1 · Landing `/`

| | Key | 日本語 | EN (meaning) | UK | Note for reviewer |
|---|---|---|---|---|---|
|  | `funnel.landing.eyebrow` | 無料・60秒 | Free · 60 seconds | Безкоштовно · 60 секунд |  |
|  | `funnel.landing.title` | あなたの脳の{weak}を見つけて、1日10分で鍛えよう | Find your brain’s {weak} and train it 10 minutes a day | Знайдіть {weak} свого мозку й тренуйте його 10 хвилин на день |  |
| ⚠️ | `funnel.landing.titleWeak` | “弱点” | “weak spot” | «слабке місце» | Landing headline from the brief, unchanged except the quote marks: straight "弱点" → curly “弱点”. Would 「弱点」 be better? |
|  | `funnel.landing.sub` | 60秒のテスト・4つの能力・無料 | 60-second test · 4 abilities · free | Тест на 60 секунд · 4 здібності · безкоштовно |  |
|  | `funnel.landing.chipsLabel` | 測定する4つの能力 | Abilities we measure | Здібності, які ми вимірюємо |  |
|  | `funnel.landing.illoLabel` | 弱点がハイライトされた能力プロフィールから、1日10分のプランが作られます | An ability profile with a highlighted weak spot turns into a 10-minute daily plan | Профіль здібностей із виділеним слабким місцем перетворюється на щоденний план на 10 хвилин |  |
| ⚠️ | `funnel.landing.start` | テストをはじめる | Start the test | Пройти тест | Chose テスト instead of the earlier 診断 (avoids a "medical diagnosis" reading). Is 診断 more natural / more clickable for an ad landing — and acceptable? |
|  | `funnel.landing.continue` | プランを続ける | Continue my plan | Продовжити мій план |  |
|  | `funnel.landing.note` | 登録不要・お支払いなし・CC-146のコンセプト案 | No sign-up · no payment · concept by CC-146 | Без реєстрації · без оплати · концепт CC-146 |  |
|  | `funnel.landing.loopLabel` | しくみ | How it works | Як це працює |  |
|  | `funnel.landing.loop1` | 60秒のテスト | 60-second test | Тест на 60 секунд |  |
|  | `funnel.landing.loop2` | 1日10分 | 10 min a day | 10 хвилин на день |  |
|  | `funnel.landing.loop3` | 30日後に再測定 | Re-test on day 30 | Повторний тест на 30-й день |  |

### 2 · Quiz `/quiz` (4 × 15 s) — and the same games in the re-test

| | Key | 日本語 | EN (meaning) | UK | Note for reviewer |
|---|---|---|---|---|---|
| ⚠️ | `funnel.quiz.title` | 60秒テスト | 60-second test | Тест на 60 секунд | Same choice: 60秒テスト vs 60秒診断. |
|  | `funnel.quiz.sub` | 4つの短い課題・各15秒 | 4 short tasks · 15 s each | 4 короткі завдання · по 15 с |  |
|  | `games.common.finish` | 終了 | Finish | Завершити |  |
|  | `games.common.secondsLeft` | 残り{n}秒 | {n}s | {n} с |  |
|  | `games.common.timeLeft` | 残り時間 | Time left | Залишилося часу |  |
|  | `games.common.correctN` | 正解：{n} | Correct: {n} | Правильно: {n} |  |
| ⚠️ | `games.common.correct` | 正解！ | Correct! | Правильно! | Plain-form interjection 正解！ (not です/ます) — fine for in-game feedback? |
| ⚠️ | `games.common.wrong` | おしい！ | Not quite | Не зовсім | おしい！ ("so close!") as soft feedback for every wrong answer — OK in tone, even when the answer was clearly wrong (Stroop)? |
|  | `games.common.watch` | よく見てください | Watch | Запам’ятовуйте |  |
|  | `games.common.yourTurn` | 同じ順番でタップしてください | Your turn — repeat the order | Повторіть порядок |  |
|  | `games.common.cell` | マス{n} | Cell {n} | Клітинка {n} |  |
|  | `games.stroop.name` | 色と文字 | Color & word | Колір і слово |  |
|  | `games.stroop.howto` | 文字の意味ではなく、文字の「色」をタップしてください。 | Tap the ink color of the word, not what the word says. | Натисніть колір, яким написано слово, а не той, що воно означає. |  |
|  | `games.stroop.prompt` | 文字の色はどれですか？ | What color is the ink? | Яким кольором написано слово? |  |
|  | `games.stroop.colors.red` | 赤 | Red | Червоний |  |
|  | `games.stroop.colors.blue` | 青 | Blue | Синій |  |
|  | `games.stroop.colors.green` | 緑 | Green | Зелений |  |
|  | `games.stroop.colors.black` | 黒 | Black | Чорний |  |
|  | `games.corsi.name` | 光る順番 | Flash order | Порядок спалахів |  |
|  | `games.corsi.howto` | 光ったマスを同じ順番でタップしてください。正解するたびに1つずつ長くなります。 | Tap the squares in the order they lit up. Each correct answer makes the next sequence longer. | Натисніть клітинки в тому порядку, у якому вони спалахнули. Після кожної правильної відповіді ряд стає довшим. |  |
| ⚠️ | `games.corsi.span` | {n}マス | Span {n} | Довжина {n} | Sequence length in the Corsi task, e.g. 5マス. Clear? |
|  | `games.series.name` | 数の並び | Number series | Числовий ряд |  |
|  | `games.series.howto` | 並びのルールを見つけて、次の数を選んでください。 | Find the rule and pick the next number. | Знайдіть правило ряду й оберіть наступне число. |  |
|  | `games.series.prompt` | 次に来る数はどれですか？ | What comes next? | Яке число наступне? |  |
|  | `games.series.item` | {n}問目 | Item {n} | Завдання {n} |  |
|  | `games.gonogo.name` | すばやく反応 | Quick reaction | Швидка реакція |  |
|  | `games.gonogo.howto` | 緑の丸が出たらすぐにタップ。赤い丸はタップしないでください。 | Green circle — tap right away. Red circle — don’t tap. | Зелене коло — натискайте одразу. Червоне — не натискайте. |  |
|  | `games.gonogo.avg` | 平均 {n} ms | Avg {n} ms | Середнє {n} мс |  |
|  | `games.gonogo.stage` | 反応エリア：緑の丸が出たらタップしてください | Reaction area: tap when the green circle appears | Зона реакції: натисніть, коли з’явиться зелене коло |  |
|  | `games.gonogo.ms` | {n} ms | {n} ms | {n} мс |  |
| ⚠️ | `games.gonogo.dontTap` | 赤は待ちましょう | Red — don’t tap | Червоне — не натискайте | Feedback after tapping a red circle (No-Go). 赤は待ちましょう — clear enough? |
|  | `games.gonogo.tooSlow` | もう少し速く！ | A bit faster | Трохи швидше |  |
|  | `games.gonogo.legendGo` | 緑＝タップ | Green = tap | Зелене — натискайте |  |
|  | `games.gonogo.legendNoGo` | 赤＝待つ | Red = wait | Червоне — чекайте |  |

### 3 · Result teaser `/teaser`

| | Key | 日本語 | EN (meaning) | UK | Note for reviewer |
|---|---|---|---|---|---|
|  | `funnel.teaser.eyebrow` | あなたの能力プロフィール | Your ability profile | Ваш профіль здібностей |  |
|  | `funnel.teaser.title` | あなたの弱点：{ability} | Your weak spot: {ability} | Ваше слабке місце: {ability} |  |
|  | `funnel.teaser.scoresLabel` | 能力別スコア（0〜100） | Scores by ability, 0–100 | Бали за здібностями, 0–100 |  |
|  | `funnel.teaser.startTitle` | 結果はゴールではなく、スタートです | This is the start, not the end | Це початок, а не кінець |  |
|  | `funnel.teaser.startBody` | 弱点の「{ability}」に合わせて、4週間のプランを作りました。 | We’ve built a 4-week plan around your weak spot: {ability}. | Ми склали план на 4 тижні з фокусом на вашому слабкому місці: {ability}. |  |
|  | `funnel.teaser.next` | プランを見る | See my plan | Подивитися мій план |  |

### 4 · Paywall `/paywall`

| | Key | 日本語 | EN (meaning) | UK | Note for reviewer |
|---|---|---|---|---|---|
| ⚠️ | `funnel.paywall.eyebrow` | テスト結果から作成 | Based on your result | На основі вашого результату | Eyebrow above "あなた専用の4週間トレーニングプラン" (was a duplicate あなた専用). |
|  | `funnel.paywall.title` | あなた専用の4週間トレーニングプラン | Your personal 4-week training plan | Ваш персональний план тренувань на 4 тижні |  |
|  | `funnel.paywall.weakLabel` | 弱点 | Weak spot | Слабке місце |  |
|  | `funnel.paywall.perDay` | 1日10分 | 10 minutes a day | 10 хвилин на день |  |
|  | `funnel.paywall.focus` | 毎日3つのうち2つのトレーニングで「{ability}」を鍛えます | 2 of 3 daily exercises target your weak spot ({ability}) | 2 з 3 вправ — на ваше слабке місце ({ability}) |  |
|  | `funnel.paywall.retest` | 30日後に再測定して、変化を確かめられます | Re-test on day 30 to see what has changed | Повторний тест через 30 днів покаже, що змінилося |  |
|  | `funnel.paywall.timelineLabel` | 現在の{ability}：{score}。30日後に再測定します。 | {ability} now: {score}. Day 30: measured by the re-test. | {ability} зараз: {score}. На 30-й день — повторний тест. |  |
|  | `funnel.paywall.now` | 現在 | Now | Зараз |  |
|  | `funnel.paywall.week` | {n}週目 | W{n} | Т{n} |  |
|  | `funnel.paywall.day30` | 30日後 | Day 30 | День 30 |  |
|  | `funnel.paywall.timelineNote` | 数値はお約束しません。30日後の再測定で、実際の変化を測ります。 | We don’t promise a number — on day 30 the re-test measures your real change. | Ми не обіцяємо цифр — на 30-й день повторний тест виміряє реальну зміну. |  |
|  | `funnel.paywall.trial` | お試し | Trial | Пробний період |  |
| ⚠️ | `funnel.paywall.then` | その後{price}／4週間 | then {price} / 4 weeks | далі {price} / 4 тижні | Price line, e.g. その後¥5 250／4週間. Note: the price format with a space (¥5 250) comes from code — a native would expect ¥5,250. |
|  | `funnel.paywall.start` | プランをはじめる | Start my plan | Почати план |  |
|  | `funnel.paywall.demoNote` | デモのため、お支払いは発生しません | Demo: no payment is taken | Демо: оплата не списується |  |

### 5 · Onboarding `/onboarding`

| | Key | 日本語 | EN (meaning) | UK | Note for reviewer |
|---|---|---|---|---|---|
|  | `funnel.onboarding.eyebrow` | プランの準備ができました | Your plan is ready | Ваш план готовий |  |
|  | `funnel.onboarding.title` | さっそく最初のトレーニング（3分） | Your first exercise — right now, 3 minutes | Перше тренування просто зараз — 3 хвилини |  |
| ⚠️ | `funnel.onboarding.sub` | 結果を見た今が、はじめどきです。 | Start while your result is fresh. | Почніть, поки результат свіжий. | Free rewrite of "Start while your result is fresh." — はじめどき natural? |
|  | `funnel.onboarding.planTitle` | 今日のプラン · 10分 | Today’s plan · 10 min | План на сьогодні · 10 хв |  |
|  | `funnel.onboarding.now` | 今すぐ | Now | Зараз |  |
|  | `funnel.onboarding.later` | 今日中に | Later today | Протягом дня |  |
|  | `funnel.onboarding.weakTag` | 弱点 | Weak spot | Слабке місце |  |
|  | `funnel.onboarding.start` | 最初のトレーニングをはじめる | Start the first exercise | Почати перше тренування |  |
|  | `funnel.onboarding.note` | 約3分 · いつでも中断できます | About 3 minutes · stop anytime | Близько 3 хвилин · можна зупинитися будь-коли |  |

### 7 · FlashGrid No.41 `/play/flash41`

| | Key | 日本語 | EN (meaning) | UK | Note for reviewer |
|---|---|---|---|---|---|
| ⚠️ | `games.flash41.name` | FlashGrid No.41 | FlashGrid #41 | FlashGrid № 41 | Kept the Latin product name (katakana フラッシュグリッド No.41 wrapped to 2 lines in the plan list). OK, or prefer katakana? |
|  | `games.flash41.howto` | 光ったマスを順番どおりにタップしてください。2回続けて正解するとレベルが上がり、まちがえると1つ下がります（Lv 2〜9）。 | Repeat the flash sequence. 2 correct in a row — level up; a mistake — level down (Lv 2–9). | Повторіть послідовність спалахів. 2 правильні відповіді поспіль — рівень вище, помилка — рівень нижче (Lv 2–9). |  |
|  | `games.flash41.round` | {n}/{total}回目 | Round {n}/{total} | Раунд {n}/{total} |  |
|  | `games.flash41.level` | レベル | Level | Рівень |  |
|  | `games.flash41.lv` | Lv {n} | Lv {n} | Lv {n} |  |
|  | `games.flash41.up` | Lv {n} ↑ | Lv {n} ↑ | Lv {n} ↑ |  |
|  | `games.flash41.down` | Lv {n} ↓ | Lv {n} ↓ | Lv {n} ↓ |  |

### 8 · Wittio指数 `/index`

| | Key | 日本語 | EN (meaning) | UK | Note for reviewer |
|---|---|---|---|---|---|
|  | `progress.index.name` | Wittio指数 | Wittio Index | Wittio Index |  |
| ⚠️ | `progress.index.deltaNow` | 今回のトレーニングで | from this exercise | за це тренування | Label shown right after a big "+12". Reads as "+12 from this training". Natural? |
|  | `progress.index.deltaLast` | 前回のトレーニングで | from your last exercise | за останнє тренування |  |
| ⚠️ | `progress.index.scale` | トレーニングの積み重ねを0〜1000で表します | Your training progress on a 0–1000 scale | Ваш тренувальний прогрес за шкалою 0–1000 | 積み重ね (accumulation) to describe the 0–1000 index without promising ability gain. Natural? |
|  | `progress.index.todayPlan` | 今日のプラン | Today’s plan | План на сьогодні |  |
|  | `progress.index.streakLabel` | 連続日数 | Streak | Серія |  |
|  | `progress.index.history` | 指数の推移 | Index over time | Динаміка індексу |  |
|  | `progress.index.sparkAria` | 指数の推移：{from}から{to} | Index history: from {from} to {to} | Динаміка індексу: від {from} до {to} |  |
|  | `progress.index.explain` | 指数は、続けるほど、そして成績が良いほど上がります。休んだ日は伸びがゆるやかになります。 | The Index grows when you train regularly and perform well. Skipped days slow it down. | Індекс зростає, коли ви тренуєтеся регулярно й показуєте добрі результати. Пропущені дні його сповільнюють. |  |
|  | `progress.index.ctaOnboarding` | 次へ：毎日のリマインダー | Next: a daily reminder | Далі: щоденне нагадування |  |
|  | `progress.index.ctaToday` | 今日のプランに戻る | Back to today’s plan | До плану на сьогодні |  |

### 9 · LINE mock `/line`

| | Key | 日本語 | EN (meaning) | UK | Note for reviewer |
|---|---|---|---|---|---|
|  | `progress.line.title` | 続けるためのリマインダー | A reminder that brings you back | Нагадування, яке повертає |  |
|  | `progress.line.mockNote` | LINE通知のデモです。実際には送信されません。 | Demo of a LINE notification — nothing is sent. | Демо сповіщення в LINE — нічого не надсилається. |  |
|  | `progress.line.sender` | Wittio（CC-146のコンセプト案） | Wittio (CC-146 concept) | Wittio (концепт CC-146) |  |
|  | `progress.line.now` | 今 | now | зараз |  |
|  | `progress.line.body` | 今日の10分トレーニングの時間です | Time for today’s 10-minute training. | Час для сьогоднішнього 10-хвилинного тренування. |  |
|  | `progress.line.bodyStreak` | 今日の10分トレーニングの時間です。{n}日連続をキープしましょう！ | Time for today’s 10-minute training. Keep your {n}-day streak going! | Час для сьогоднішнього 10-хвилинного тренування. Збережіть серію: {n} дн. поспіль! |  |
|  | `progress.line.tapHint` | 通知をタップしてください | Tap the notification | Натисніть на сповіщення |  |
|  | `progress.line.timeLabel` | 通知の時間 | Reminder time | Час нагадування |  |
| ⚠️ | `progress.line.caption` | お好きな時間にLINEでお知らせします。これはモックのため、メッセージの送信やデータの収集は行いません。 | Reminders arrive at the time you choose via LINE, the messenger most people use in Japan. This is a mock: no messages are sent and no data is collected. | Нагадування приходять у вибраний вами час через LINE — найпопулярніший месенджер у Японії. Це макет: повідомлення не надсилаються, дані не збираються. | Dropped the "most-used messenger in Japan" explanation (obvious to Japanese users; kept in UK/EN for the jury). |
|  | `progress.line.cta` | 今日のプランへ | Go to today’s plan | До плану на сьогодні |  |

### 6 · Today plan `/today` (+ streak chip, shared)

| | Key | 日本語 | EN (meaning) | UK | Note for reviewer |
|---|---|---|---|---|---|
|  | `progress.streak` | {n}日連続 | {n}-day streak | {n} дн. поспіль |  |
| ⚠️ | `progress.streakZero` | 今日から始めましょう | Start your streak today | Почніть серію сьогодні | Shown only when the streak is 0 (next to a flame icon / under 連続日数). Clear without a noun? |
|  | `progress.weakZone` | 弱点 | weak spot | слабке місце |  |
|  | `progress.today.greetMorning` | おはようございます | Good morning | Доброго ранку |  |
|  | `progress.today.greetDay` | こんにちは | Hello | Добрий день |  |
|  | `progress.today.greetEvening` | こんばんは | Good evening | Добрий вечір |  |
|  | `progress.today.dayOf` | プラン{n}日目 | Day {n} of your plan | День {n} вашого плану |  |
|  | `progress.today.title` | 今日のプラン · 10分 | Today’s plan · 10 min | План на сьогодні · 10 хв |  |
|  | `progress.today.left` | 残り{n}つ · 約{m}分 | {n} left · about {m} min | Залишилося {n} · близько {m} хв |  |
|  | `progress.today.allDone` | 今日のプランは完了です。また明日！ | All done for today. See you tomorrow! | План на сьогодні виконано. До завтра! |  |
|  | `progress.today.ringAria` | {total}つ中{done}つ完了 | {done} of {total} exercises done | Виконано {done} з {total} вправ |  |
|  | `progress.today.weakHint` | {total}つのうち{n}つで、弱点の「{ability}」を鍛えます。 | {n} of {total} exercises train your weak spot: {ability}. | {n} з {total} вправ тренують ваше слабке місце: {ability}. |  |
|  | `progress.today.approx` | 約{n}分 | ~{n} min | ~{n} хв |  |
|  | `progress.today.play` | プレイ | Play | Грати |  |
|  | `progress.today.again` | もう一度 | Again | Ще раз |  |
|  | `progress.today.retestIn` | 再測定まであと{n}日 | Days to re-test: {n} | Повторний тест через {n} дн. |  |
|  | `progress.today.retestDue` | 再測定を受けられます | Your re-test is ready | Повторний тест уже доступний |  |
| ⚠️ | `progress.today.retestText` | 別の問題セット（B）で、実際の変化を確かめます。 | A new parallel form shows what has really changed. | Нова паралельна форма тесту покаже реальну зміну. | 問題セット（B） for the psychometric "parallel form B". Is 問題セット clear, or would 別バージョンの問題 / テストB read better? |
|  | `progress.today.lineLink` | LINEで毎日リマインド（モック） | Daily reminder in LINE (mock) | Щоденне нагадування в LINE (макет) |  |

### 10 · Re-test `/retest`

| | Key | 日本語 | EN (meaning) | UK | Note for reviewer |
|---|---|---|---|---|---|
| ⚠️ | `progress.retest.title` | 30日ごとの再測定 | Re-test every 30 days | Повторний тест кожні 30 днів | Term choice 再測定 for "re-test" (used everywhere). Alternative: 再テスト. Which feels more natural in a consumer app? |
|  | `progress.retest.intro` | 30日ごとに、別の問題セット（B）で測り直します。答えを覚えたかどうかではなく、実際の変化がわかります。 | Every 30 days you take the test again on a new parallel form (B), so you see real change — not remembered answers. | Кожні 30 днів ви проходите тест на новій паралельній формі (B), тож бачите реальну зміну, а не завчені відповіді. |  |
|  | `progress.retest.baselineCaption` | 最初のテスト（問題セットA）の結果です。弱点をハイライトしています。 | Your first test (form A). Your weak spot is highlighted. | Ваш перший тест (форма A). Слабке місце виділено. |  |
|  | `progress.retest.simulate` | デモ：1日10分のトレーニングを{n}日間続けたと仮定します。そのあと問題セットBで、実際に測定します。 | Demo: we simulate {n} days of 10-minute training. Then your abilities are measured for real on form B. | Демо: моделюємо {n} днів тренувань по 10 хв. Потім здібності вимірюються по-справжньому на формі B. |  |
|  | `progress.retest.dueNote` | 30日が経ちました。問題セットBで60秒の再測定を受けましょう。 | 30 days have passed. Take the 60-second re-test on form B. | Минуло 30 днів. Пройдіть 60-секундний повторний тест на формі B. |  |
|  | `progress.retest.advance` | デモ：+{n}日 | Demo: +{n} days | Демо: +{n} днів |  |
|  | `progress.retest.start` | 再測定をはじめる | Start the re-test | Почати повторний тест |  |
|  | `progress.retest.runKicker` | {n}日目 · 問題セットB | Day {n} · form B | День {n} · форма B |  |
|  | `progress.retest.runTitle` | 再測定 · 60秒 | Re-test · 60 seconds | Повторний тест · 60 секунд |  |
|  | `progress.retest.resultKicker` | 問題セットBと最初のテスト（A）の比較 | Form B vs your first test (form A) | Форма B проти першого тесту (форма A) |  |
|  | `progress.retest.resultTitle` | {n}日間の変化 | Your change in {n} days | Ваша зміна за {n} днів |  |
|  | `progress.retest.legendNow` | 現在（B） | Now (form B) | Зараз (форма B) |  |
|  | `progress.retest.legendThen` | {n}日前（A） | {n} days ago (form A) | {n} дн. тому (форма A) |  |
|  | `progress.retest.honest` | 問題セットBで測った実際の結果です。スコアが下がることもあります。 | These are your real form-B results — scores can also go down. | Це ваші реальні результати на формі B — бали можуть і знижуватися. |  |
|  | `progress.retest.indexTitle` | {n}日間の指数の推移 | Index over {n} days | Індекс за {n} днів |  |
|  | `progress.retest.whyBack` | 変化が見えるから、続けたくなります。 | Seeing real change is why people come back. | Видима зміна — ось чому повертаються. |  |
|  | `progress.retest.next` | 次の再測定は{n}日後です。プランは新しい弱点「{ability}」に合わせて更新しました。 | Next re-test in {n} days. Your plan now focuses on your new weak spot: {ability}. | Наступний повторний тест — через {n} днів. План тепер зосереджено на новому слабкому місці: {ability}. |  |
|  | `progress.retest.cta` | 今日のプランへ | Go to today’s plan | До плану на сьогодні |  |
|  | `progress.retest.again` | もう一度再測定する（+{n}日） | Run the re-test again (+{n} days) | Пройти тест ще раз (+{n} днів) |  |

### 11 · Weekly report `/report`

| | Key | 日本語 | EN (meaning) | UK | Note for reviewer |
|---|---|---|---|---|---|
|  | `progress.report.title` | 週間レポート | Weekly report | Тижневий звіт |  |
|  | `progress.report.total` | 今週の合計 | this week | за тиждень |  |
| ⚠️ | `progress.report.games` | 実施回数 | exercises done | виконано вправ | Short tile label (must fit ~6 full-width chars): 実施回数 = number of exercises done this week. |
|  | `progress.report.indexWeek` | 指数（7日間） | Index, 7 days | Індекс за 7 днів |  |
|  | `progress.report.minutesTitle` | 1日のトレーニング（分） | Minutes per day | Хвилин на день |  |
|  | `progress.report.activeDays` | 7日中{n}日実施 | {n}/7 active days | {n}/7 активних днів |  |
|  | `progress.report.barsAria` | 1日のトレーニング時間：{list} | Minutes per day: {list} | Хвилин на день: {list} |  |
|  | `progress.report.simulated` | デモで再現した日（1日約10分）を含みます。 | Includes simulated demo days (about 10 min a day). | Ураховано змодельовані демо-дні (близько 10 хв на день). |  |
|  | `progress.report.growthTitle` | 最初のテストからの変化 | Change since your first test | Зміна від першого тесту |  |
|  | `progress.report.valueTitle` | 4週間のプランに含まれるもの | What’s included in 4 weeks | Що входить у 4 тижні |  |
|  | `progress.report.perSession` | 10分のトレーニング1回あたり約{price} | About {price} per 10-minute session | Близько {price} за одне 10-хвилинне заняття |  |
|  | `progress.report.valueText` | お試し{trial}のあとは4週間{price}。毎日のトレーニング{n}回、週間レポート、再測定が含まれます。 | {price} per 4 weeks after a {trial} trial: {n} daily sessions, a weekly report and a re-test. | {price} за 4 тижні після пробного періоду за {trial}: {n} щоденних занять, тижневий звіт і повторний тест. |  |
|  | `progress.report.retestLink` | 30日後の再測定を見る | See your 30-day re-test | Повторний тест через 30 днів |  |

### 12 · Profile `/profile` (reset demo)

| | Key | 日本語 | EN (meaning) | UK | Note for reviewer |
|---|---|---|---|---|---|
|  | `progress.profile.title` | あなたの能力プロフィール | Your ability profile | Ваш профіль здібностей |  |
|  | `progress.profile.legendNow` | 現在 | Now | Зараз |  |
|  | `progress.profile.legendStart` | 最初のテスト | First test | Перший тест |  |
|  | `progress.profile.retestLink` | 30日ごとの再測定 | 30-day re-test | Повторний тест кожні 30 днів |  |
|  | `progress.profile.resetNote` | この端末の進捗をすべて消去し、最初の画面に戻ります。 | Clears all progress on this device and returns to the start. | Видаляє весь прогрес на цьому пристрої й повертає на початок. |  |
|  | `progress.profile.cancel` | キャンセル | Cancel | Скасувати |  |
|  | `progress.profile.confirm` | リセットする | Yes, reset | Так, скинути |  |

