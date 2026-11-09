import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { navigate, PATHS } from '../../app/router';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import { ABILITIES, type Stage } from '../../state/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { EconomicsLink } from '../economics';
import { AbilityIcon } from './icons';
import s from './funnel.module.css';

/** Hand-made illustration: a mini ability radar with a pulsing weak spot → a short daily plan. */
function HeroIllustration({ label }: { label: string }) {
  return (
    <svg className={s.illo} viewBox="0 0 320 150" role="img" aria-label={label}>
      {/* radar */}
      <g>
        <polygon points="80,23 132,75 80,127 28,75" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
        <polygon points="80,49 106,75 80,101 54,75" fill="none" stroke="var(--border)" strokeWidth="1" />
        <line x1="80" y1="23" x2="80" y2="127" stroke="var(--border)" />
        <line x1="28" y1="75" x2="132" y2="75" stroke="var(--border)" />
        <polygon
          points="80,52 124,75 80,111 38,75"
          fill="rgba(91,71,255,0.18)"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <circle cx="124" cy="75" r="4" fill="var(--accent)" />
        <circle cx="80" cy="111" r="4" fill="var(--accent)" />
        <circle cx="38" cy="75" r="4" fill="var(--accent)" />
        <circle className={s.pulse} cx="80" cy="52" r="8" fill="var(--risk)" opacity="0.5" />
        <circle cx="80" cy="52" r="6" fill="var(--risk)" stroke="var(--card)" strokeWidth="2" />
      </g>
      {/* arrow */}
      <path d="M146 75 C 158 62, 170 62, 180 72" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" />
      <path d="M174 72 L181 73 L179 66" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* plan card */}
      <g>
        <rect x="190" y="30" width="114" height="96" rx="14" fill="var(--card)" stroke="var(--border)" />
        {[0, 1, 2].map((i) => {
          const y = 52 + i * 26;
          const weak = i < 2;
          return (
            <g key={i}>
              <circle cx="208" cy={y} r="7" fill={weak ? 'var(--risk-soft)' : 'var(--accent-soft)'} />
              <path
                d={`M204.5 ${y} l2.5 2.5 l4.5 -5`}
                fill="none"
                stroke={weak ? 'var(--risk)' : 'var(--accent)'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect x="222" y={y - 4} width={i === 2 ? 50 : 66} height="8" rx="4" fill={weak ? 'var(--risk)' : 'var(--accent)'} opacity={weak ? 0.75 : 0.55} />
            </g>
          );
        })}
      </g>
      {/* 3 exercises a day badge */}
      <circle cx="298" cy="32" r="19" fill="var(--accent)" />
      <text x="298" y="33" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="var(--accent-ink)">
        3×
      </text>
    </svg>
  );
}

/** Where a returning user continues: the screen of their stage (anything after the baseline test). */
const RESUME: Partial<Record<Stage, string>> = {
  teaser: PATHS.teaser,
  paywall: PATHS.paywall,
  onboarding: PATHS.onboarding,
  home: PATHS.today,
};

export function Landing() {
  const t = useT();
  const { state, dispatch } = useStore();
  const [before, after = ''] = t('funnel.landing.title').split('{weak}');
  // Re-scanning the QR mid-funnel must not lose progress: once there is a baseline, "Continue" is primary.
  const returning = Boolean(state.baseline);
  const [confirming, setConfirming] = useState(false);
  const restartRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  const dialogId = useId();

  useEffect(() => {
    // Focus management for the inline confirmation: into it on open, back to the trigger on close.
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) restartRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  const startQuiz = () => {
    // Taking the test again starts a fresh demo (instead of silently overwriting the baseline of an
    // existing plan) — only after the explicit confirmation below.
    if (state.baseline) dispatch({ type: 'reset' });
    dispatch({ type: 'setStage', stage: 'quiz' });
    navigate(PATHS.quiz);
  };

  const resume = () => {
    const path = RESUME[state.stage];
    if (path) {
      navigate(path);
      return;
    }
    // Baseline exists but the stage says landing/quiz (e.g. back gesture mid-funnel): the result is next.
    dispatch({ type: 'setStage', stage: 'teaser' });
    navigate(PATHS.teaser);
  };

  return (
    <Screen juryKey="landing" className={s.root}>
      <EconomicsLink from="landing" />
      <Card className={s.hero}>
        <HeroIllustration label={t('funnel.landing.illoLabel')} />
      </Card>

      <div className={s.head}>
        <span className={s.eyebrow}>
          <span className={s.eyebrowDot} aria-hidden />
          {t('funnel.landing.eyebrow')}
        </span>
        <h1 className={s.title}>
          {before}
          <span className={s.weakWord}>{t('funnel.landing.titleWeak')}</span>
          {after}
        </h1>
        <p className={s.lead}>{t('funnel.landing.sub')}</p>
      </div>

      <ul className={s.chips} aria-label={t('funnel.landing.chipsLabel')}>
        {ABILITIES.map((a) => (
          <li key={a} className={s.chip}>
            <AbilityIcon ability={a} />
            {t(`common.abilities.${a}`)}
          </li>
        ))}
      </ul>

      {/* Only the primary action is sticky (like Onboarding), so it stays on screen at 390×664 and 375×553
          without covering a quarter of the page; "Take the test again" and the note follow below. */}
      <div className={`${s.cta} ${s.sticky}`}>
        {returning ? (
          <Button block className={s.ctaBtn} onClick={resume} data-testid="landing-continue" data-stage={state.stage}>
            {state.stage === 'home' ? t('funnel.landing.continue') : t('funnel.landing.resume')}
          </Button>
        ) : (
          <Button block className={s.ctaBtn} onClick={startQuiz} data-testid="landing-start">
            {t('funnel.landing.start')}
          </Button>
        )}
      </div>
      <div className={s.cta}>
        {returning &&
          (confirming ? (
            <div
              className={s.confirm}
              role="alertdialog"
              aria-labelledby={`${dialogId}-t`}
              aria-describedby={`${dialogId}-d`}
              data-testid="landing-restart-confirm"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setConfirming(false);
              }}
            >
              <h2 id={`${dialogId}-t`} className={s.confirmTitle}>
                {t('funnel.landing.restartTitle')}
              </h2>
              <p id={`${dialogId}-d`} className={s.confirmBody}>
                {t('funnel.landing.restartBody')}
              </p>
              <div className={s.confirmRow}>
                <Button ref={cancelRef} variant="ghost" onClick={() => setConfirming(false)} data-testid="landing-restart-cancel">
                  {t('funnel.landing.restartNo')}
                </Button>
                <Button className={s.dangerBtn} onClick={startQuiz} data-testid="landing-start">
                  {t('funnel.landing.restartYes')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              ref={restartRef}
              block
              variant="ghost"
              onClick={() => setConfirming(true)}
              aria-haspopup="dialog"
              data-testid="landing-restart"
            >
              {t('funnel.landing.restart')}
            </Button>
          ))}
        <p className={s.note}>{t('funnel.landing.note')}</p>
        <p className={s.note} data-testid="landing-live-note">
          {t('funnel.landing.liveNote')}
        </p>
      </div>

      <ol className={s.loop} aria-label={t('funnel.landing.loopLabel')}>
        {[t('funnel.landing.loop1'), t('funnel.landing.loop2'), t('funnel.landing.loop3')].map((label, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <li aria-hidden className={s.loopArrow}>
                <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7h8M8 4l3 3-3 3" />
                </svg>
              </li>
            )}
            <li className={s.loopStep}>
              <span className={s.loopNum}>{i + 1}</span>
              {label}
            </li>
          </Fragment>
        ))}
      </ol>
    </Screen>
  );
}
