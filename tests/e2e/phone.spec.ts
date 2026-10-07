import { expect, test } from '@playwright/test';

/** STYLE_GUIDE §5: no horizontal page scroll on phones (16 px gutters, 390 px wide). */
const PAGES = [
  '/units/u6-generative-models-and-naive-bayes/naive-bayes/',
  '/dev/kitchen-sink/',
  '/units/',
];

test.use({ viewport: { width: 390, height: 844 } });

for (const path of PAGES) {
  test(`no horizontal overflow at 390px: ${path}`, async ({ page }) => {
    await page.goto(path);
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(
      widths.scroll,
      `page scrollWidth ${widths.scroll} > viewport ${widths.client}`,
    ).toBeLessThanOrEqual(widths.client);
  });
}
