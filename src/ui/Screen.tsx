import type { ReactNode } from 'react';
import { useStore } from '../state/store';
import { useT } from '../i18n/useT';
import { isFilled } from './text';
import s from './ui.module.css';

/**
 * Root wrapper for every screen. `juryKey` → i18n `jury.<key>.reason|metric|goal`.
 * Puts data-reason / data-metric on the root and renders the jury strip when jury mode is on.
 * `hideJury` hides the strip (e.g. while a game is being played). While a game is mounted the
 * strip and the other screen chrome are also hidden by CSS (`ui.module.css`), so the game fits.
 */
export function Screen({
  juryKey,
  children,
  className,
  padded = true,
  hideJury = false,
}: {
  juryKey: string;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  hideJury?: boolean;
}) {
  const { state } = useStore();
  const t = useT();
  const reason = t(`jury.${juryKey}.reason`);
  const metric = t(`jury.${juryKey}.metric`);
  const goal = t(`jury.${juryKey}.goal`);
  const rows = [
    { label: t('common.juryReason'), value: reason },
    { label: t('common.juryMetric'), value: metric },
    { label: t('common.juryGoal'), value: goal },
  ].filter((r) => isFilled(r.value));
  return (
    <section
      className={[s.screen, padded ? s.padded : '', className ?? ''].join(' ')}
      data-screen={juryKey}
      data-reason={reason}
      data-metric={metric}
    >
      {state.juryMode && !hideJury && rows.length > 0 && (
        <aside className={s.jury} aria-label={t('common.jury')} data-testid="jury-strip">
          {rows.map((r) => (
            <span key={r.label}>
              <b>{r.label}:</b> {r.value}
            </span>
          ))}
        </aside>
      )}
      {children}
    </section>
  );
}
