import { expect, test } from '@playwright/test';

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
    // Pixel comparison runs only in CI, where the Linux baselines are generated and committed.
    if (process.env.CI) {
      await expect(page).toHaveScreenshot(`math-${theme}.png`, { fullPage: true });
    }
  });
}
