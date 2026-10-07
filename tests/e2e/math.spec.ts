import { expect, test } from '@playwright/test';

import { hasBaseline } from './baselines';

const THEMES = ['light', 'dark'] as const;

/**
 * The math spike page exercises the KaTeX pipeline (macros, \htmlClass symbol
 * coloring, sticky notes). Besides the kitchen-sink checks it asserts that at
 * least one semantically colored symbol (`.sym-theta`) made it into the HTML.
 */
for (const theme of THEMES) {
  test(`math page renders in ${theme} theme`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/dev/math');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);

    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('.katex-error')).toHaveCount(0);
    expect(await page.locator('.sym-theta').count()).toBeGreaterThan(0);
    expect(consoleErrors, 'console errors').toEqual([]);

    await page.screenshot({ path: `test-results/math-${theme}.png`, fullPage: true });
    // Pixel comparison runs only in CI and only once a Linux baseline has been committed
    // (seed them with the "Update e2e snapshots" workflow).
    if (process.env.CI && hasBaseline(`math-${theme}.png`)) {
      await expect(page).toHaveScreenshot(`math-${theme}.png`, { fullPage: true });
    }
  });
}
