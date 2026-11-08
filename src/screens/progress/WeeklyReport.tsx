import { PATHS } from '../../app/router';
import { formatJPY, PRICE_JPY_4W, TRIAL_JPY } from '../../config';
import { addDays, dayKey } from '../../engine';
import { dateRange } from '../../i18n/typography';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { ArrowIcon } from './icons';
import { formatDay, indexAt, isTraining, lastDays, signed, sortedHistory, today, tone } from './model';
import { DeltaGrid } from './parts';
import s from './progress.module.css';

const SESSIONS_4W = 28;
/** Simulated demo days (demoAdvance) carry minutes but no game results: ~10 min ≈ the 3-game plan. */
const SIMULATED_GAMES_PER_DAY = 3;

export function WeeklyReport() {
  const t = useT();
  const { state } = useStore();
  const days = lastDays(state, 7);
  const first = days[0];
  const last = days[days.length - 1];

  const minutes = days.map((d) => state.minutesByDay[d] ?? 0);
  const totalMin = minutes.reduce((a, b) => a + b, 0);
  const activeDays = minutes.filter((m) => m > 0).length;

  const played = state.results.filter((r) => {
    const d = dayKey(r.playedAt);
    return isTraining(r) && d >= first && d <= last;
  });
  const playedDays = new Set(played.map((r) => dayKey(r.playedAt)));
  const simulatedDays = days.filter((d, i) => minutes[i] > 0 && !playedDays.has(d)).length;
  const games = played.length + simulatedDays * SIMULATED_GAMES_PER_DAY;

  const idxNow = state.current?.index ?? indexAt(state, last) ?? 0;
  // index at the end of the day before the window; a newer user is compared with their first index
  const before = indexAt(state, addDays(first, -1)) ?? sortedHistory(state)[0]?.index ?? idxNow;
  const idxDelta = idxNow - before;

  const profile = state.current ?? state.retest;
  const perSession = formatJPY(Math.round(PRICE_JPY_4W / SESSIONS_4W));

  const md = { month: 'numeric', day: 'numeric' } as const;
  const range = dateRange(state.lang, formatDay(state.lang, first, md), formatDay(state.lang, last, md));

  return (
    <Screen juryKey="report" className={s.page}>
      <div data-testid="report-root" className="stack" style={{ gap: 'var(--gap)' }}>
        <div>
          <p className={s.kicker}>{range}</p>
          <h1>{t('progress.report.title')}</h1>
        </div>

        <div className={s.statGrid}>
          <div className={s.stat} data-testid="report-minutes" data-value={totalMin}>
            <b>{t('common.minutes', { n: totalMin })}</b>
            <span>{t('progress.report.total')}</span>
          </div>
          <div className={s.stat} data-testid="report-games" data-value={games}>
            <b>{games}</b>
            <span>{t('progress.report.games')}</span>
          </div>
          <div className={s.stat} data-testid="report-index" data-tone={tone(idxDelta)} data-value={idxDelta}>
            <b>{signed(idxDelta)}</b>
            <span>{t('progress.report.indexWeek')}</span>
          </div>
        </div>

        <Card className="stack" style={{ gap: 8 }}>
          <div className={s.sectionTitle}>
            <h3>{t('progress.report.minutesTitle')}</h3>
            <span className="small muted">{t('progress.report.activeDays', { n: activeDays })}</span>
          </div>
          <Bars
            days={days}
            minutes={minutes}
            today={today(state)}
            label={(d) => formatDay(state.lang, d, { weekday: 'narrow' })}
            ariaLabel={t('progress.report.barsAria', {
              list: days.map((d, i) => `${formatDay(state.lang, d, { weekday: 'short' })} ${minutes[i]}`).join(', '),
            })}
          />
          {simulatedDays > 0 && <p className="small muted">{t('progress.report.simulated')}</p>}
        </Card>

        {state.baseline && profile && (
          <Card className="stack" style={{ gap: 10 }}>
            <h3>{t('progress.report.growthTitle')}</h3>
            <DeltaGrid now={profile.scores} then={state.baseline.scores} testIdPrefix="report-delta-" />
          </Card>
        )}

        <Card tone="accent" className="stack" style={{ gap: 6 }} data-testid="report-value">
          <h3>{t('progress.report.valueTitle')}</h3>
          <p>
            {t('progress.report.perSession', { price: perSession })}
          </p>
          <p className="small muted">
            {t('progress.report.valueText', { price: formatJPY(PRICE_JPY_4W), trial: formatJPY(TRIAL_JPY), n: SESSIONS_4W })}
          </p>
          <p className="small muted">{t('common.illustrative')}</p>
        </Card>

        <a className={s.textLink} href={'#' + PATHS.retest}>
          {t('progress.report.retestLink')}
          <ArrowIcon className={s.arrow} />
        </a>
      </div>
    </Screen>
  );
}

/** Hand-made SVG bar chart: minutes per day, today highlighted, value above each bar. */
function Bars({
  days,
  minutes,
  today,
  label,
  ariaLabel,
}: {
  days: string[];
  minutes: number[];
  today: string;
  label: (d: string) => string;
  ariaLabel: string;
}) {
  const W = 320;
  const H = 150;
  const top = 20;
  const bottom = 22;
  const chartH = H - top - bottom;
  const slot = W / days.length;
  const bw = Math.min(28, slot * 0.56);
  const max = Math.max(10, ...minutes);

  return (
    <svg className={s.bars} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} data-testid="report-bars">
      <line x1={0} x2={W} y1={top + chartH} y2={top + chartH} stroke="var(--border)" strokeWidth={1} />
      {days.map((d, i) => {
        const m = minutes[i];
        const h = m > 0 ? Math.max(4, (m / max) * chartH) : 0;
        const x = i * slot + (slot - bw) / 2;
        const y = top + chartH - h;
        const isToday = d === today;
        return (
          <g key={d} data-minutes={m}>
            {m > 0 ? (
              <rect x={x} y={y} width={bw} height={h} rx={6} fill={isToday ? 'var(--accent)' : 'var(--accent-soft)'} stroke="var(--accent)" strokeWidth={isToday ? 0 : 1} />
            ) : (
              <rect x={x} y={top + chartH - 3} width={bw} height={3} rx={1.5} fill="var(--border)" />
            )}
            <text x={x + bw / 2} y={(m > 0 ? y : top + chartH - 3) - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={m > 0 ? 'var(--text)' : 'var(--muted)'}>
              {m}
            </text>
            <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize={11} fontWeight={isToday ? 700 : 500} fill={isToday ? 'var(--accent)' : 'var(--muted)'}>
              {label(d)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
