// Locale-aware typography helpers for strings that the UI glues together from several i18n keys.
import type { Lang } from '../state/types';

/** Joins sentences: Japanese puts no space after 。, other languages use one space. Empty parts are skipped. */
export function joinSentences(lang: Lang, ...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(lang === 'ja' ? '' : ' ');
}

/** Range of two already formatted dates: "12/1〜12/7" in Japanese, "01.12 – 07.12" elsewhere. */
export function dateRange(lang: Lang, from: string, to: string): string {
  return lang === 'ja' ? `${from}〜${to}` : `${from} – ${to}`;
}
