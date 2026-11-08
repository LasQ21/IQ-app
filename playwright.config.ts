import { defineConfig, devices } from '@playwright/test';

// No @types/node in this project: declare the Node global the config reads.
declare const process: { env: Record<string, string | undefined> };

/**
 * PORT: preview server port (default 4173). Parallel worktrees/agents use their own port, e.g.
 *   PORT=4185 npx playwright test --trace off
 * A server already listening on PORT is reused outside CI — make sure it serves the current build
 * (or pick a free port); `--strictPort` makes a busy port fail instead of silently moving elsewhere.
 *
 * Projects:
 * - chromium   — 390×844 phone (the main suite)
 * - iphone-664 — iPhone 13 profile with the real Safari visible height 664 (jury strip on), Chromium engine
 *                (WebKit isn't installed in this environment; add a webkit project where it is).
 */
const PORT = Number(process.env.PORT ?? 4173);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests',
  timeout: 360_000,
  // Under full-suite load (4 workers, 4 browser contexts in retest-stability, two vite builds in sw-update) a render
  // can take > 5 s of real time; the app itself transitions synchronously.
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    trace: 'off',
    // fail fast when a feature another agent adds is missing, instead of waiting for the 6-minute test timeout
    actionTimeout: 20_000,
  },
  projects: [
    { name: 'chromium', testIgnore: /layout\.spec\.ts/ },
    {
      name: 'iphone-664',
      testMatch: /layout\.spec\.ts/,
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        viewport: { width: 390, height: 664 },
      },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
