import { expect, test } from '@playwright/test';

/**
 * /glossary (VISION §7): every term grouped by field, a field filter row
 * (`?field=`), a text filter on term + aliases, and `#id` deep links that
 * scroll to and highlight an entry.
 */
test('lists at least 40 terms grouped by field', async ({ page }) => {
  await page.goto('/glossary');
  await expect(page.locator('h1')).toHaveText('Glossary');
  expect(await page.locator('.glossary-entry').count()).toBeGreaterThanOrEqual(40);
  expect(await page.locator('[data-field-group]').count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator('.katex-error')).toHaveCount(0);
  await expect(page.locator('#bayes-rule')).toContainText("Bayes' rule");
  await expect(page.locator('#bayes-rule [data-glossary-first-used] a')).toHaveAttribute(
    'href',
    /^\/units\//,
  );
  await expect(page.locator('#bayes-rule [data-glossary-related] a').first()).toHaveAttribute(
    'href',
    /^#/,
  );
});

test('the field filter reduces the list and is reflected in the URL', async ({ page }) => {
  await page.goto('/glossary');
  const all = await page.locator('.glossary-entry:visible').count();
  await page.locator('[data-field-filter="linear-algebra"]').click();
  await expect(page.locator('[data-field-filter="linear-algebra"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const some = await page.locator('.glossary-entry:visible').count();
  expect(some).toBeGreaterThan(0);
  expect(some).toBeLessThan(all);
  expect(page.url()).toContain('field=linear-algebra');
  await expect(page.locator('[data-field-group="probability"]')).toBeHidden();

  await page.goto('/glossary?field=evaluation');
  await expect(page.locator('[data-field-filter="evaluation"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('[data-field-group="probability"]')).toBeHidden();
  await expect(page.locator('[data-field-group="evaluation"]')).toBeVisible();
});

test('the text filter matches terms and aliases', async ({ page }) => {
  await page.goto('/glossary');
  const box = page.getByLabel('Filter terms');
  await box.fill('theorem'); // an alias of Bayes' rule
  await expect(page.locator('#bayes-rule')).toBeVisible();
  expect(await page.locator('.glossary-entry:visible').count()).toBeLessThan(10);
  await box.fill('zzzz-nothing');
  await expect(page.locator('[data-glossary-empty]')).toBeVisible();
  await box.fill('');
  expect(await page.locator('.glossary-entry:visible').count()).toBeGreaterThanOrEqual(40);
});

test('#bayes-rule scrolls the entry into view and highlights it', async ({ page }) => {
  await page.goto('/glossary#bayes-rule');
  const entry = page.locator('#bayes-rule');
  await expect(entry).toBeInViewport();
  await expect(entry).toHaveAttribute('data-highlight', '');
  await page.screenshot({ path: 'test-results/glossary-target.png' });
});

for (const theme of ['light', 'dark'] as const) {
  test(`glossary renders in ${theme} theme`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    await page.goto('/glossary');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('h1')).toBeVisible();
    expect(consoleErrors).toEqual([]);
    await page.screenshot({ path: `test-results/glossary-${theme}.png`, fullPage: true });
  });
}
