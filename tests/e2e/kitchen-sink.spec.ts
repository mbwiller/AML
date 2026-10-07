import { expect, test } from '@playwright/test';

import { hasBaseline } from './baselines';

const THEMES = ['light', 'dark'] as const;

/**
 * The kitchen-sink page renders every MDX component in both themes. This spec
 * is the CI guard from STYLE_GUIDE.md: no KaTeX errors, no console errors, and a
 * full-page screenshot per theme attached to the run for visual review.
 */
for (const theme of THEMES) {
  test(`kitchen sink renders in ${theme} theme`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/dev/kitchen-sink');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);

    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('.katex-error')).toHaveCount(0);
    expect(consoleErrors, 'console errors').toEqual([]);

    await page.screenshot({ path: `test-results/kitchen-sink-${theme}.png`, fullPage: true });
    // Pixel comparison runs only in CI and only once a Linux baseline has been committed
    // (seed them with the "Update e2e snapshots" workflow).
    if (process.env.CI && hasBaseline(`kitchen-sink-${theme}.png`)) {
      await expect(page).toHaveScreenshot(`kitchen-sink-${theme}.png`, { fullPage: true });
    }
  });
}
