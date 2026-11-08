// Re-test result pieces (S2): honest change rows against the error band, and the labelled illustration.
import { buildProfile, dayKey, illustrativePractice, scoreRange } from '../../engine';
import { ASSESSMENT_ORDER } from '../../games';
import { useT } from '../../i18n/useT';
import type { AbilityChange, AppState, Lang, Profile } from '../../state/types';
import { ABILITIES } from '../../state/types';
import { Card } from '../../ui/Card';
import { signed } from './model';
import r from './retest.module.css';

/**
 * The assessment the latest re-test is compared with: the previous re-test if there was one,
 * otherwise the baseline. Real measured scores only — never adjusted.
 */
export function previousAssessment(state: AppState): { profile: Profile; isBaseline: boolean; day?: string } | undefined {
  if (!state.baseline) return undefined;
  const prior = state.results.slice(0, state.profileFrom ?? 0).filter((x) => x.meta?.mode === 'assessment');
  const n = ASSESSMENT_ORDER.length;
  if (prior.length <= n) return { profile: state.baseline, isBaseline: true };
  const block = prior.slice(-n);
  return { profile: buildProfile(block), isBaseline: false, day: dayKey(block[block.length - 1].playedAt) };
}

export type RetestOutcome = 'better' | 'stable' | 'lower';

/** Any "better" wins; otherwise any "lower"; otherwise all stable. */
export function outcomeOf(changes: AbilityChange[]): RetestOutcome {
  if (changes.some((c) => c.cls === 'better')) return 'better';
  if (changes.some((c) => c.cls === 'lower')) return 'lower';
  return 'stable';
}

export function joinList(lang: Lang, items: string[]): string {
  return items.join(lang === 'ja' ? '、' : ', ');
}

function ClsIcon({ cls }: { cls: AbilityChange['cls'] }) {
  const d = cls === 'better' ? 'M6 10V2M2.5 5.5 6 2l3.5 3.5' : cls === 'lower' ? 'M6 2v8M2.5 6.5 6 10l3.5-3.5' : 'M2 6h8';
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** One row per ability: "Memory · was 52 · now 61 (41–81)" + "Stable (within ±20)" / "Noticeably better" / "Lower". */
export function ChangeList({ changes, testIdPrefix }: { changes: AbilityChange[]; testIdPrefix?: string }) {
  const t = useT();
  return (
    <ul className={r.changes}>
      {changes.map((c) => {
        const [lo, hi] = scoreRange(c.ability, c.after);
        const label =
          c.cls === 'better'
            ? t('progress.retest.clsBetter')
            : c.cls === 'lower'
              ? t('progress.retest.clsLower')
              : t('progress.retest.clsStable', { n: c.band });
        return (
          <li
            key={c.ability}
            className={r.row}
            data-testid={testIdPrefix ? `${testIdPrefix}${c.ability}` : undefined}
            data-cls={c.cls}
            data-delta={c.delta}
            data-band={c.band}
          >
            <span className={r.rowName}>{t(`common.abilities.${c.ability}`)}</span>
            <span className={r.badge} data-cls={c.cls}>
              <ClsIcon cls={c.cls} />
              {label}
            </span>
            <span className={r.rowScore}>{t('progress.retest.rowScore', { before: c.before, after: c.after, lo, hi })}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * LABELLED illustration (jury mode only): typical picture after `days` of regular practice from the previous
 * measurement. Separate card, dashed, with an "illustration, not your result" badge — the real result is untouched.
 */
export function PracticeIllustration({ from, days }: { from: Profile; days: number }) {
  const t = useT();
  const illo = illustrativePractice(from, days);
  return (
    <Card className={['stack', r.illo].join(' ')} style={{ gap: 10 }} data-testid="retest-illustration" aria-label={t('progress.retest.illoBadge')}>
      <span className={r.illoBadge}>{t('progress.retest.illoBadge')}</span>
      <h3>{t('progress.retest.illoTitle', { n: days })}</h3>
      <ul className={r.illoGrid}>
        {ABILITIES.map((ab) => {
          const before = Math.round(from.scores[ab]);
          const after = Math.round(illo.scores[ab]);
          return (
            <li key={ab}>
              <span>{t(`common.abilities.${ab}`)}</span>
              <b>
                {before} → {after} ({signed(after - before)})
              </b>
            </li>
          );
        })}
      </ul>
      <p className="small muted">{t('progress.retest.illoNote')}</p>
    </Card>
  );
}
