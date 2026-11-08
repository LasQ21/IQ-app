import { useId, useMemo, useState } from 'react';
import { navigate, PATHS, useRoute } from '../../app/router';
import { ECON } from '../../config';
import { economics } from '../../engine';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import type { Lang } from '../../state/types';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { localeOf } from '../progress/model';
import s from './economics.module.css';

/** Slider ranges (percent points). */
export const OPENED_MIN = 45;
export const OPENED_MAX = 65;
export const CHURN_MIN = 0;
export const CHURN_MAX = 20;

/** Deck scenarios: [opened %, churn cut %]. */
export const PRESETS = [
  { key: 'presetToday', opened: 45, churn: 0 },
  { key: 'presetCautious', opened: 55, churn: 10 },
  { key: 'presetGate', opened: 60, churn: 10 },
  { key: 'presetTarget', opened: 65, churn: 20 },
] as const;

/** Where "Back" returns to (`?from=` set by EconomicsLink). */
const FROM: Record<string, string> = {
  landing: PATHS.landing,
  paywall: PATHS.paywall,
  profile: PATHS.profile,
  retest: PATHS.retest,
  today: PATHS.today,
};

const clampInt = (v: string | null, lo: number, hi: number, fb: number) => {
  const n = v === null ? NaN : Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fb;
};

/** Locale-aware formatters (uk gets a decimal comma, ja "万" for compact amounts). */
export function econFormat(lang: Lang) {
  const loc = localeOf(lang);
  const pct1 = new Intl.NumberFormat(loc, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct0 = new Intl.NumberFormat(loc, { style: 'percent', maximumFractionDigits: 0 });
  const pctSigned = new Intl.NumberFormat(loc, { style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero' });
  const usd = new Intl.NumberFormat(loc, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usd0 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 });
  const usdK = new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    notation: 'compact',
    maximumSignificantDigits: 3,
    signDisplay: 'exceptZero',
  });
  const x2 = new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const int = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
  return {
    pct1: (v: number) => pct1.format(v),
    pct0: (v: number) => pct0.format(v),
    pctSigned: (v: number) => pctSigned.format(v),
    usd: (v: number) => usd.format(v),
    usd0: (v: number) => usd0.format(v),
    usdK: (v: number) => usdK.format(v),
    times: (v: number) => `${x2.format(v)}×`,
    int: (v: number) => int.format(v),
  };
}

function Mark({ pass }: { pass: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={pass ? 'M5 12.5l4.5 4.5L19 7.5' : 'M8 12h8'} />
    </svg>
  );
}

/** "Loop economics" (#/economics): how "opened the product" and churn move LTV/CAC and ROMI of one monthly cohort. */
export function Economics() {
  const t = useT();
  const { state } = useStore();
  const route = useRoute();
  const uid = useId();
  const [opened, setOpened] = useState(() => clampInt(route.query.get('o'), OPENED_MIN, OPENED_MAX, 45));
  const [churn, setChurn] = useState(() => clampInt(route.query.get('c'), CHURN_MIN, CHURN_MAX, 0));
  const f = useMemo(() => econFormat(state.lang), [state.lang]);
  const e = economics(opened / 100, churn / 100);

  const passOpened = opened >= ECON.gateOpened * 100;
  const passCharge1 = e.charge1 >= ECON.gateCharge1 - 1e-9;

  const back = () => {
    const from = FROM[route.query.get('from') ?? ''];
    navigate(from ?? (state.baseline && state.stage === 'home' ? PATHS.today : PATHS.landing));
  };

  const openedId = `${uid}-opened`;
  const churnId = `${uid}-churn`;
  const tone = (v: number) => (v > 0 ? 'pos' : v < 0 ? 'neg' : undefined);

  const tiles: { key: string; label: string; value: string; raw: number; note: string; tone?: string; wide?: boolean }[] = [
    { key: 'charge1', label: t('economics.charge1'), value: f.pct1(e.charge1), raw: e.charge1, note: t('economics.ofTrials') },
    { key: 'charge2', label: t('economics.charge2'), value: f.pct1(e.charge2), raw: e.charge2, note: t('economics.ofTrials') },
    { key: 'netLtv', label: t('economics.netLtv'), value: f.usd(e.netLtv), raw: e.netLtv, note: t('economics.perTrial') },
    { key: 'ltvCac', label: t('economics.ltvCac'), value: f.times(e.ltvCac), raw: e.ltvCac, note: `CAC ${f.usd(ECON.cacUsd)}`, tone: tone(e.ltvCac - 1) },
    { key: 'romi', label: t('economics.romi'), value: f.pctSigned(e.romi), raw: e.romi, note: '(LTV − CAC) / CAC', tone: tone(e.romi) },
    { key: 'romiMonth', label: t('economics.romiMonth'), value: f.usdK(e.romiMonthUsd), raw: e.romiMonthUsd, note: t('economics.perCohort'), tone: tone(e.romiMonthUsd) },
  ];

  return (
    <Screen juryKey="economics" className={s.page}>
      <button type="button" className={s.back} onClick={back} data-testid="econ-back">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {t('common.back')}
      </button>

      <div className={s.head}>
        <h1>{t('economics.title')}</h1>
        <p className={s.sub}>
          {t('economics.sub', { trials: f.int(ECON.trialsPerMonth), budget: f.usd0(ECON.adBudgetUsd), cac: f.usd(ECON.cacUsd) })}
        </p>
      </div>

      <div className={s.presets} role="group" aria-label={t('economics.presets')}>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={s.preset}
            aria-pressed={opened === p.opened && churn === p.churn}
            data-testid={`econ-${p.key}`}
            onClick={() => {
              setOpened(p.opened);
              setChurn(p.churn);
            }}
          >
            {t(`economics.${p.key}`)}
            <span>
              {p.opened}/{p.churn}
            </span>
          </button>
        ))}
      </div>

      <Card className="stack" style={{ gap: 12 }}>
        <div className={s.slider}>
          <div className={s.sliderTop}>
            <label htmlFor={openedId}>{t('economics.opened')}</label>
            <output className={s.sliderValue} htmlFor={openedId} data-testid="econ-opened-value">
              {f.pct0(opened / 100)}
            </output>
          </div>
          <input
            id={openedId}
            className={s.range}
            type="range"
            min={OPENED_MIN}
            max={OPENED_MAX}
            step={1}
            value={opened}
            aria-valuetext={f.pct0(opened / 100)}
            aria-describedby={`${openedId}-hint`}
            data-testid="econ-opened"
            onChange={(ev) => setOpened(Number(ev.target.value))}
          />
          <span id={`${openedId}-hint`} className={s.hint}>
            {t('economics.openedHint')}
          </span>
        </div>
        <div className={s.slider}>
          <div className={s.sliderTop}>
            <label htmlFor={churnId}>{t('economics.churn')}</label>
            <output className={s.sliderValue} htmlFor={churnId} data-testid="econ-churn-value">
              {f.pct0(churn / 100)}
            </output>
          </div>
          <input
            id={churnId}
            className={s.range}
            type="range"
            min={CHURN_MIN}
            max={CHURN_MAX}
            step={1}
            value={churn}
            aria-valuetext={f.pct0(churn / 100)}
            aria-describedby={`${churnId}-hint`}
            data-testid="econ-churn"
            onChange={(ev) => setChurn(Number(ev.target.value))}
          />
          <span id={`${churnId}-hint`} className={s.hint}>
            {t('economics.churnHint')}
          </span>
        </div>
      </Card>

      <p className="visually-hidden" aria-live="polite">
        {t('economics.summary', { ltv: f.times(e.ltvCac), romi: f.pctSigned(e.romi) })}
      </p>

      <div className={s.grid} data-testid="econ-results">
        {tiles.map((x) => (
          <div key={x.key} className={s.tile} data-tone={x.tone} data-testid={`econ-${x.key}`} data-value={x.raw.toFixed(4)}>
            <span className={s.tileLabel}>{x.label}</span>
            <b>{x.value}</b>
            <span className={s.tileNote}>{x.note}</span>
          </div>
        ))}
      </div>

      <Card className="stack" style={{ gap: 8 }}>
        <h3>{t('economics.gates')}</h3>
        <ul className={s.gates}>
          {[
            { key: 'opened', label: t('economics.gateOpened'), pass: passOpened },
            { key: 'charge1', label: t('economics.gateCharge1'), pass: passCharge1 },
          ].map((g) => (
            <li key={g.key} className={s.gate} data-pass={g.pass} data-testid={`econ-gate-${g.key}`}>
              <span className={s.gateLabel}>{g.label}</span>
              <b>
                <Mark pass={g.pass} />
                {g.pass ? t('economics.gatePass') : t('economics.gateFail')}
              </b>
            </li>
          ))}
        </ul>
        <p className="small muted">{t('economics.how')}</p>
      </Card>

      <p className={s.foot}>{t('economics.footer')}</p>
    </Screen>
  );
}
