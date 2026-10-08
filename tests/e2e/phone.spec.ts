import { expect, test } from '@playwright/test';

/** STYLE_GUIDE §5: no horizontal page scroll on phones (16 px gutters, 360 px wide). */
const PAGES = [
  '/units/u6-generative-models-and-naive-bayes/naive-bayes/',
  '/dev/kitchen-sink/',
  '/units/',
  '/atlas/',
];

test.use({ viewport: { width: 360, height: 780 } });

for (const path of PAGES) {
  test(`no horizontal overflow at 360px: ${path}`, async ({ page }) => {
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
