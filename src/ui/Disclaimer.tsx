import { useT } from '../i18n/useT';

/** Mandatory non-medical disclaimer (Paywall, Retest). */
export function Disclaimer() {
  const t = useT();
  return (
    <p className="muted small" data-testid="disclaimer" style={{ marginTop: 8 }}>
      {t('common.disclaimer')}
    </p>
  );
}
