const DAY_MS = 86_400_000;

/** Demo-shifted "now" in ms. */
export function demoNow(demoDayOffset: number, now = Date.now()): number {
  return now + demoDayOffset * DAY_MS;
}

/** Local 'YYYY-MM-DD' for a timestamp. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Whole days since 1970-01-01 for a 'YYYY-MM-DD' key (timezone-free; 0 for garbage). */
export function dayNumber(day: string): number {
  const [y, m, d] = String(day).split('-').map(Number);
  if (![y, m, d].every(Number.isFinite)) return 0;
  return Math.max(0, Math.round(Date.UTC(y, m - 1, d) / DAY_MS));
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n).getTime());
}
