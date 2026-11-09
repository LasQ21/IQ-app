/**
// Runtime imports carry a .js extension: this module is also loaded by the Node ESM function api/jury.ts.
 * Live jury dashboard — the anonymous record one phone sends to `/api/jury` (deck slide 13).
 *
 * No personal data: a random id per demo run, the four 0–100 scores, which screens were reached and when,
 * the Loop-economics sliders and a one-tap "would you come back tomorrow?" answer.
 * Shared by the app (client.ts), the Vercel function (api/jury.ts) and the unit tests.
 */
import type { Ability, Lang } from '../state/types';
import { ABILITIES, LANGS } from '../state/types.js';

/** Funnel steps in loop order. Values in `reach` are real (not demo-shifted) epoch ms of the first visit. */
export const STEPS = ['landing', 'quiz', 'teaser', 'paywall', 'start', 'trained', 'today', 'econ', 'retest'] as const;
export type Step = (typeof STEPS)[number];

export type Vote = 'yes' | 'maybe' | 'no';
export const VOTES: Vote[] = ['yes', 'maybe', 'no'];

export interface LiveRecord {
  v: 1;
  /** Random per demo run; "Reset demo" / "Take the test again" start a new one. */
  id: string;
  lang: Lang;
  jury: boolean;
  fast: boolean;
  /** Rehearsals and automated checks: stored, but the dashboard leaves them out. */
  test?: boolean;
  /** First and last update (epoch ms, set by the phone; the server clamps them to its own clock). */
  t0: number;
  t: number;
  reach: Partial<Record<Step, number>>;
  scores?: Record<Ability, number>;
  weakest?: Ability;
  index?: number;
  /** Loop economics sliders: opened % (30–80), churn cut % (0–30). */
  econ?: { o: number; c: number };
  vote?: Vote;
  retest?: { better: number; stable: number; lower: number };
}

export const ID_RE = /^[a-z0-9-]{8,40}$/;
/** Upper bound of a request body (bytes) — a record is ≈ 0.5 kB. */
export const MAX_BODY = 4096;

const num = (v: unknown, lo: number, hi: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Whitelists and clamps an untrusted record. Returns null if it is not a record at all.
 * `now` (server clock) bounds every timestamp: nothing from the future, nothing older than 7 days.
 */
export function sanitize(raw: unknown, now: number): LiveRecord | null {
  if (!isObj(raw)) return null;
  if (typeof raw.id !== 'string' || !ID_RE.test(raw.id)) return null;
  const lo = now - 7 * 24 * 3600_000;
  const ts = (v: unknown) => {
    const n = num(v, lo, now);
    return n === undefined ? undefined : Math.round(n);
  };
  const t = ts(raw.t) ?? now;
  const t0 = Math.min(ts(raw.t0) ?? t, t);
  const rec: LiveRecord = {
    v: 1,
    id: raw.id,
    lang: LANGS.includes(raw.lang as Lang) ? (raw.lang as Lang) : 'ja',
    jury: raw.jury === true,
    fast: raw.fast === true,
    t0,
    t,
    reach: {},
  };
  if (raw.test === true) rec.test = true;
  if (isObj(raw.reach)) {
    for (const s of STEPS) {
      const v = ts(raw.reach[s]);
      if (v !== undefined) rec.reach[s] = v;
    }
  }
  if (isObj(raw.scores)) {
    const sc = {} as Record<Ability, number>;
    let ok = true;
    for (const a of ABILITIES) {
      const v = num(raw.scores[a], 0, 100);
      if (v === undefined) ok = false;
      else sc[a] = Math.round(v);
    }
    if (ok) rec.scores = sc;
  }
  if (ABILITIES.includes(raw.weakest as Ability)) rec.weakest = raw.weakest as Ability;
  const idx = num(raw.index, 0, 1000);
  if (idx !== undefined) rec.index = Math.round(idx);
  if (isObj(raw.econ)) {
    const o = num(raw.econ.o, 0, 100);
    const c = num(raw.econ.c, 0, 100);
    if (o !== undefined && c !== undefined) rec.econ = { o: Math.round(o), c: Math.round(c) };
  }
  if (VOTES.includes(raw.vote as Vote)) rec.vote = raw.vote as Vote;
  if (isObj(raw.retest)) {
    const b = num(raw.retest.better, 0, 4);
    const s = num(raw.retest.stable, 0, 4);
    const l = num(raw.retest.lower, 0, 4);
    if (b !== undefined && s !== undefined && l !== undefined) {
      rec.retest = { better: Math.round(b), stable: Math.round(s), lower: Math.round(l) };
    }
  }
  return rec;
}
