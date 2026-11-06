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

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n).getTime());
}
