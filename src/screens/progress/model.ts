// View-model helpers shared by the progress screens (read-only over AppState).
import { DEMO_JUMP_DAYS } from '../../config';
import { addDays, dayKey, demoNow, planItemsForToday, trainingSeedDayOf } from '../../engine';
import { GAMES } from '../../games';
import { todayOf } from '../../state/reducer';
import type { Ability, AppState, GameResult, Lang, PlanItem } from '../../state/types';

const LOCALES: Record<Lang, string> = { ja: 'ja-JP', uk: 'uk-UA', en: 'en-US' };

export function localeOf(lang: Lang): string {
  return LOCALES[lang];
}

function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days from `a` to `b` ('YYYY-MM-DD'). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);
}

export function formatDay(lang: Lang, day: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(localeOf(lang), opts).format(parseDay(day));
  } catch {
    return day;
  }
}

/** "+7", "±0", "−3" (true minus sign). */
export function signed(n: number): string {
  const v = Math.round(n);
  if (v > 0) return `+${v}`;
  if (v < 0) return `−${Math.abs(v)}`;
  return '±0';
}

export function tone(n: number): 'pos' | 'neg' | 'zero' {
  const v = Math.round(n);
  return v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero';
}

export function today(state: AppState): string {
  return todayOf(state);
}

/** Demo-shifted current time in ms. */
export function nowMs(state: AppState): number {
  return demoNow(state.demoDayOffset);
}

/** Today's plan items; falls back to a fresh plan if the stored one is missing or stale. */
export function livePlan(state: AppState): PlanItem[] {
  if (state.plan && state.plan.day === todayOf(state)) return state.plan.items;
  const profile = state.current ?? state.baseline;
  return profile ? planItemsForToday(profile, trainingSeedDayOf(todayOf(state))) : [];
}

export function weakest(state: AppState): Ability {
  return (state.current ?? state.baseline)?.weakest ?? 'memory';
}

export function abilityOf(item: PlanItem): Ability {
  return GAMES[item.gameId].ability;
}

export function sortedHistory(state: AppState) {
  const t = todayOf(state);
  return [...state.indexHistory].filter((p) => p.day <= t).sort((a, b) => (a.day < b.day ? -1 : 1));
}

export function baselineDay(state: AppState): string {
  return sortedHistory(state)[0]?.day ?? todayOf(state);
}

export function daysSinceBaseline(state: AppState): number {
  return Math.max(0, diffDays(baselineDay(state), todayOf(state)));
}

/** Demo-day of the latest finished re-test (form-B assessment results), if any. */
export function lastRetestDay(state: AppState): string | undefined {
  if (!state.retest) return undefined;
  if (state.lastRetestDay) return state.lastRetestDay;
  let ts = 0;
  for (const r of state.results) if (r.form !== 'A' && r.meta?.mode === 'assessment') ts = Math.max(ts, r.playedAt);
  return ts ? dayKey(ts) : undefined;
}

/** Days until the next 30-day re-test (from the last re-test, else the baseline); 0 = due now. */
export function daysUntilRetest(state: AppState): number {
  const since = daysSinceBaseline(state);
  if (!state.retest) return Math.max(0, DEMO_JUMP_DAYS - since);
  const last = lastRetestDay(state);
  if (last) return Math.max(1, DEMO_JUMP_DAYS - diffDays(last, todayOf(state)));
  return DEMO_JUMP_DAYS - (since % DEMO_JUMP_DAYS);
}

/** The `n` demo-days ending today (oldest first). */
export function lastDays(state: AppState, n: number): string[] {
  const t = todayOf(state);
  return Array.from({ length: n }, (_, i) => addDays(t, i - (n - 1)));
}

export function isTraining(r: GameResult): boolean {
  return r.meta?.mode !== 'assessment';
}

/** Index value at the end of `day` (last history point on or before it). */
export function indexAt(state: AppState, day: string): number | undefined {
  let v: number | undefined;
  for (const p of sortedHistory(state)) if (p.day <= day) v = p.index;
  return v;
}
