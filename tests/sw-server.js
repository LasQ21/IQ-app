// Helpers for the SW-update e2e test (plain JS: the project has no @types/node).
// buildTo(): a production build with a given build id into its own folder (no tsc, just vite build).
// serve(): a tiny static server whose root can be switched between two builds — a "deploy" in one call.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};

/** `vite build` with APP_BUILD=<id> into test-results/sw-builds/<id>. Returns the absolute folder. */
export function buildTo(id) {
  const outDir = resolve('test-results', 'sw-builds', id);
  execFileSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'warn'], {
    env: { ...process.env, APP_BUILD: id },
    stdio: 'inherit',
  });
  return outDir;
}

/** Static server on a free port. `setRoot(dir)` switches the served build. SPA fallback like vercel.json. */
export async function serve(root) {
  let current = root;
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let file = normalize(join(current, path));
    if (!file.startsWith(current)) {
      res.writeHead(403).end();
      return;
    }
    if (!existsSync(file) || statSync(file).isDirectory()) {
      if (path.startsWith('/assets/') || extname(path)) {
        res.writeHead(404).end();
        return;
      }
      file = join(current, 'index.html');
    }
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(readFileSync(file));
  });
  await new Promise((ok) => server.listen(0, ok));
  const { port } = server.address();
  return {
    url: `http://localhost:${port}`,
    setRoot(dir) {
      current = dir;
    },
    close: () => new Promise((ok) => server.close(() => ok())),
  };
}
