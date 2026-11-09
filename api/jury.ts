/**
 * Live jury dashboard API (Vercel Function, Node.js runtime).
 *
 *   POST /api/jury            one anonymous record from a phone (src/live/client.ts) → Blob `jury/<id>.json`
 *   GET  /api/jury?since=ms   records updated since `since` + statistics (deck slide 13 polls this)
 *
 * Storage: the private Vercel Blob store connected to the project (BLOB_READ_WRITE_TOKEN).
 * No personal data: see src/live/schema.ts.
 */
import { get, list, put } from '@vercel/blob';
import { aggregate, selectRecords } from '../src/live/aggregate.js';
import { MAX_BODY, sanitize, type LiveRecord } from '../src/live/schema.js';

const PREFIX = 'jury/';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request): Promise<Response> {
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: 'too large' }, 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  const now = Date.now();
  const rec = sanitize(raw, now);
  if (!rec) return json({ error: 'bad record' }, 400);
  // "Last update" is the server's receipt time, not the phone's clock: the dashboard window ("з нуля") is in
  // server time too, so a phone or laptop whose clock is a few minutes off can't fall out of it.
  rec.t = now;
  await put(`${PREFIX}${rec.id}.json`, JSON.stringify(rec), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
  return json({ ok: true }, 200, { 'cache-control': 'no-store' });
}

async function readRecord(pathname: string): Promise<LiveRecord | null> {
  try {
    const res = await get(pathname, { access: 'private', useCache: false });
    if (!res || !res.stream) return null;
    const raw = (await new Response(res.stream).json()) as unknown;
    // Stored records were sanitized on the way in; re-check against today's clock anyway.
    return sanitize(raw, Date.now());
  } catch {
    return null;
  }
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const now = Date.now();
  const sinceRaw = Number(url.searchParams.get('since'));
  const since = Number.isFinite(sinceRaw) && sinceRaw > 0 ? sinceRaw : now - 6 * 3600_000;
  const includeTest = url.searchParams.get('test') === '1';

  const paths: string[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    const res = await list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const b of res.blobs) {
      // uploadedAt = last overwrite; older blobs cannot hold a record updated after `since`.
      if (new Date(b.uploadedAt).getTime() >= since - 60_000) paths.push(b.pathname);
    }
    if (!res.hasMore || !res.cursor) break;
    cursor = res.cursor;
  }

  const records = (await Promise.all(paths.map(readRecord))).filter((r): r is LiveRecord => r !== null);
  const selected = selectRecords(records, since, includeTest).sort((a, b) => a.t0 - b.t0);
  return json(
    {
      now,
      since,
      stats: aggregate(selected),
      records: selected.map(({ id: _id, ...rest }) => rest),
    },
    200,
    { ...CORS, 'cache-control': 'public, max-age=0, s-maxage=3, stale-while-revalidate=10' },
  );
}
