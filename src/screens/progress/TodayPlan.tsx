import { navigate, PATHS } from '../../app/router';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Ring } from '../../ui/Ring';
import { Screen } from '../../ui/Screen';
import { joinParts } from '../../ui/text';
import { ArrowIcon, CheckIcon } from './icons';
import { abilityOf, daysSinceBaseline, daysUntilRetest, formatDay, livePlan, nowMs, today, weakest } from './model';
import { StreakChip } from './parts';
import s from './progress.module.css';

const MIN_PER_ITEM = 3;
const PLAN_MIN = 10;

export function TodayPlan() {
  const t = useT();
  const { state } = useStore();
  const items = livePlan(state);
  const weak = weakest(state);
  const done = items.filter((it) => it.done).length;
  const total = items.length || 3;
  const weakCount = items.filter((it) => abilityOf(it) === weak).length;
  const left = items.length - done;
  const untilRetest = daysUntilRetest(state);

  const hour = new Date(nowMs(state)).getHours();
  const greeting =
    hour < 11 ? t('progress.today.greetMorning') : hour < 18 ? t('progress.today.greetDay') : t('progress.today.greetEvening');
  const date = formatDay(state.lang, today(state), { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <Screen juryKey="today" className={s.page}>
      <div className={s.head}>
        <div>
          <p className={s.kicker} data-testid="today-date">
            {joinParts([t('progress.today.dayOf', { n: daysSinceBaseline(state) + 1 }), date])}
          </p>
          <h1>{greeting}</h1>
        </div>
      </div>
      <div className={s.chips}>
        <StreakChip days={state.streakDays} />
        {state.current && (
          <a className={[s.chip, s.chipAccent].join(' ')} href={'#' + PATHS.index}>
            {t('progress.index.name')} {state.current.index}
          </a>
        )}
      </div>

      <Card className={s.planCard} data-testid="today-plan">
        <div className={s.planTop}>
          <Ring
            value={done / total}
            size={92}
            stroke={9}
            label={`${done}/${total}`}
            ariaLabel={t('progress.today.ringAria', { done, total })}
          />
          <div>
            <h2>{t('progress.today.title')}</h2>
            <p className="muted small">
              {left > 0 ? t('progress.today.left', { n: left, m: Math.ceil((PLAN_MIN * left) / total) }) : t('progress.today.allDone')}
            </p>
          </div>
        </div>
        {weakCount > 0 && (
          <p className="small muted">
            {t('progress.today.weakHint', { n: weakCount, total: items.length, ability: t(`common.abilities.${weak}`) })}
          </p>
        )}
        <ol className={s.list}>
          {items.map((it, i) => {
            const ab = abilityOf(it);
            const isWeak = ab === weak;
            return (
              <li key={`${it.gameId}-${i}`} className={s.item} data-testid="plan-item" data-done={it.done} data-game={it.gameId}>
                <span className={s.check} aria-hidden>
                  {it.done && <CheckIcon />}
                </span>
                <div className={s.itemMain}>
                  <span className={s.itemName}>
                    {t(`games.${it.gameId}.name`)}
                    {it.done && <span className="visually-hidden"> · {t('common.done')}</span>}
                  </span>
                  <span className={s.tags}>
                    <span className={[s.tag, isWeak ? s.tagWeak : ''].join(' ')}>
                      {joinParts([t(`common.abilities.${ab}`), isWeak && t('progress.weakZone')])}
                    </span>
                    <span>{t('progress.today.approx', { n: MIN_PER_ITEM })}</span>
                  </span>
                </div>
                <Button
                  className={s.playBtn}
                  variant={it.done ? 'ghost' : 'primary'}
                  data-testid={`plan-play-${i}`}
                  aria-label={`${it.done ? t('progress.today.again') : t('progress.today.play')}: ${t(`games.${it.gameId}.name`)}`}
                  onClick={() => navigate(PATHS.play(it.gameId, 'today'))}
                >
                  {it.done ? t('progress.today.again') : t('progress.today.play')}
                </Button>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card tone="accent">
        <a className={s.linkCard} href={'#' + PATHS.retest} data-testid="today-retest">
          <div>
            <h3>
              {untilRetest > 0 ? t('progress.today.retestIn', { n: untilRetest }) : t('progress.today.retestDue')}
            </h3>
            <p className="small muted">{t('progress.today.retestText')}</p>
          </div>
          <ArrowIcon className={s.arrow} />
        </a>
      </Card>

      <a className={s.textLink} href={'#' + PATHS.line} data-testid="today-line">
        {t('progress.today.lineLink')}
        <ArrowIcon className={s.arrow} />
      </a>
    </Screen>
  );
}
