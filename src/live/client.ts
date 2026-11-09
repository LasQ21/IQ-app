/**
 * Live jury dashboard — the phone side. Keeps one anonymous record per demo run in localStorage and sends it
 * (debounced, fire-and-forget) to `/api/jury` on the app's own origin. Never blocks or breaks the demo:
 * every failure is swallowed, offline phones simply send on the next change.
 *
 * Sends only from the production host (the QR codes) — not from dev, previews, e2e or the screenshot script —
 * unless `?livetest=1` was opened once on this device (then records are marked `test` and the dashboard skips them).
 */
import { classifyChange } from '../engine/errorBands';
import { previousAssessment } from '../screens/progress/RetestParts';
import type { AppState, GameResult } from '../state/types';
import type { LiveRecord, Step, Vote } from './schema';

export const LIVE_ENDPOINT = '/api/jury';
export const LIVE_HOSTS = ['cc146-wittio.vercel.app'];
const REC_KEY = 'cc146-live-rec-v1';
const TEST_KEY = 'cc146-live-test';
const DEBOUNCE_MS = 700;

type Listener = () => void;
const listeners = new Set<Listener>();
let rec: LiveRecord | null = null;
let timer: number | undefined;
let lastSent = '';

/** localStorage that never throws (private mode, blocked storage): reads give null, writes are dropped. */
function getItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function setItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* keep it in memory */
  }
}

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `r${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function isTestDevice(): boolean {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('livetest') === '1') {
      setItem(TEST_KEY, '1');
      url.searchParams.delete('livetest');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  } catch {
    /* ignore */
  }
  return getItem(TEST_KEY) === '1';
}

const TEST_DEVICE = typeof window === 'undefined' ? false : isTestDevice();

/** Whether this page sends records at all. */
export function liveEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (TEST_DEVICE) return true;
  try {
    if (navigator.webdriver) return false;
  } catch {
    /* ignore */
  }
  return LIVE_HOSTS.includes(window.location.hostname);
}

function fresh(state?: AppState): LiveRecord {
  const now = Date.now();
  return {
    v: 1,
    id: randomId(),
    lang: state?.lang ?? 'ja',
    jury: state?.juryMode ?? false,
    fast: state?.fastMode ?? false,
    t0: now,
    t: now,
    reach: {},
    ...(TEST_DEVICE ? { test: true } : {}),
  };
}

function load(): LiveRecord {
  if (rec) return rec;
  try {
    const raw = getItem(REC_KEY);
    const v = raw ? (JSON.parse(raw) as LiveRecord) : null;
    if (v && typeof v.id === 'string' && v.reach && typeof v.reach === 'object') {
      rec = v;
      return rec;
    }
  } catch {
    /* corrupt — start over */
  }
  rec = fresh();
  return rec;
}

function save(r: LiveRecord): void {
  rec = r;
  setItem(REC_KEY, JSON.stringify(r));
  listeners.forEach((l) => l());
  schedule();
}

function send(): void {
  timer = undefined;
  if (!liveEnabled() || !rec) return;
  // A record started before `?livetest=1` was opened on this device is a rehearsal too.
  const body = JSON.stringify(TEST_DEVICE && !rec.test ? { ...rec, test: true } : rec);
  if (body === lastSent) return;
  try {
    void fetch(LIVE_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).then(
      (res) => {
        if (res.ok) lastSent = body;
      },
      () => undefined,
    );
  } catch {
    /* ignore */
  }
}

function schedule(): void {
  if (typeof window === 'undefined') return;
  if (timer !== undefined) window.clearTimeout(timer);
  timer = window.setTimeout(send, DEBOUNCE_MS);
}

/** Flush now (tab hidden / page closing). */
export function liveFlush(): void {
  if (timer !== undefined) window.clearTimeout(timer);
  send();
}

/** Current record (read-only view for the UI, e.g. the vote card). */
export function liveRecord(): LiveRecord {
  return load();
}

export function subscribeLive(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Marks the first visit of a step (later visits keep the first time). */
export function liveReach(step: Step): void {
  const r = load();
  if (r.reach[step] !== undefined) return;
  const now = Date.now();
  save({ ...r, t: now, reach: { ...r.reach, [step]: now } });
}

export function liveEcon(opened: number, churn: number): void {
  const r = load();
  if (r.econ && r.econ.o === opened && r.econ.c === churn) return;
  save({ ...r, t: Date.now(), econ: { o: opened, c: churn } });
}

export function liveVote(vote: Vote): void {
  save({ ...load(), t: Date.now(), vote });
}

/** "Reset demo" / "Take the test again": the next run is a new anonymous record. */
export function liveNewRun(state?: AppState): void {
  lastSent = '';
  save(fresh(state));
}

const isTraining = (r: GameResult) => r.form === 'T' || r.meta?.mode === 'training';

/** Copies what the dashboard needs from the app state (scores, weak zone, index, re-test outcome). */
export function liveSyncState(state: AppState): void {
  const r = load();
  const next: LiveRecord = { ...r, lang: state.lang, jury: r.jury || state.juryMode, fast: r.fast || state.fastMode };
  const b = state.baseline;
  if (b) {
    next.scores = {
      memory: Math.round(b.scores.memory),
      attention: Math.round(b.scores.attention),
      logic: Math.round(b.scores.logic),
      speed: Math.round(b.scores.speed),
    };
    next.weakest = b.weakest;
  }
  if (state.current && state.results.some(isTraining)) next.index = state.current.index;
  if (state.retest) {
    // Same classes as the re-test screen: a change within the ability's error band is "stable".
    const prev = previousAssessment(state);
    if (prev) {
      const counts = { better: 0, stable: 0, lower: 0 };
      for (const c of classifyChange(prev.profile, state.retest, state.fastMode)) counts[c.cls]++;
      next.retest = counts;
    }
  }
  const same =
    next.lang === r.lang &&
    next.jury === r.jury &&
    next.fast === r.fast &&
    next.weakest === r.weakest &&
    next.index === r.index &&
    JSON.stringify(next.scores) === JSON.stringify(r.scores) &&
    JSON.stringify(next.retest) === JSON.stringify(r.retest);
  if (same) return;
  save({ ...next, t: Date.now() });
}
