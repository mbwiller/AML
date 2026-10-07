import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const baseURL = `http://localhost:${PORT}`;

/**
 * Smoke + screenshot tests against the static build (`pnpm build` first).
 * Screenshots are written to test-results/ for PR review; pixel baselines via
 * `toHaveScreenshot` are a documented follow-up because they are platform-specific.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  // Baselines are committed from Linux CI only (see .github/workflows/update-snapshots.yml);
  // no platform suffix so local runs on macOS never write them.
  snapshotPathTemplate: '{testDir}/__snapshots__/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node scripts/serve-dist.mjs dist ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
