import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'hessian-classifier';

/**
 * `hessian-classifier` (STYLE_GUIDE.md §7) against the static build:
 * hydrates on /dev/widgets; the eigenvalue sliders move the classification
 * through minimum, saddle, maximum, and degenerate; a higher-order term
 * changes the actual critical point but not the test; both themes screenshot
 * cleanly; it fits 360 px. Lesson 2.3's embedding is checked in
 * widgets-u2-lessons.spec.ts.
 */

async function hydrate(page: Page, path: string) {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(path);
  const figure = page.locator(`figure[data-widget="${NAME}"]`).first();
  await figure.scrollIntoViewIfNeeded();
  await expect(figure).toHaveAttribute('data-hydrated', '', { timeout: 20_000 });
  await expect(figure.locator('.MafsView svg').first()).toBeVisible();
  return { figure, consoleErrors };
}

test('/dev/widgets renders the widget with its manifest', async ({ page }) => {
  const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`)).toContainText(
    'eigenvalues',
  );
  await expect(figure.locator('.widget-title')).toHaveText(
    'Classifying a critical point from the Hessian',
  );
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(figure.locator('[data-testid="hc-kind"]')).toHaveText('Minimum');
  await expect(figure.locator('[data-testid="hc"]')).toHaveAttribute(
    'data-actual',
    'strict-minimum',
  );
  await expect(figure.locator('polyline[data-level="pos"]').first()).toBeAttached();
  await expect(figure.locator('polyline[data-level="neg"]')).toHaveCount(0);
  await expect(figure.locator('.hc-math .katex').first()).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('the eigenvalue sliders classify every sign pattern', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const l1 = figure.getByRole('slider', { name: 'First eigenvalue' });
  const l2 = figure.getByRole('slider', { name: 'Second eigenvalue' });
  const kind = figure.locator('[data-testid="hc-kind"]');
  const root = figure.locator('[data-testid="hc"]');

  // λ₂ from 0.5 down through 0 to −0.5 with the keyboard.
  await l2.focus();
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowLeft');
  await expect(l2).toHaveValue('0');
  await expect(kind).toHaveText('Degenerate');
  await expect(root).toHaveAttribute('data-actual', 'non-strict-minimum');
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowLeft');
  await expect(l2).toHaveValue('-0.5');
  await expect(kind).toHaveText('Saddle');
  await expect(figure.locator('polyline[data-level="zero"]').first()).toBeAttached();
  await expect(figure.locator('polyline[data-level="neg"]').first()).toBeAttached();

  await l1.fill('-2');
  await expect(kind).toHaveText('Maximum');
  await expect(root).toHaveAttribute('data-actual', 'strict-maximum');

  const box = await l1.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(l1).toHaveValue('2');
  await expect(l2).toHaveValue('0.5');
  await expect(kind).toHaveText('Minimum');
});

test('a higher-order term decides the degenerate case without changing H', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  await figure.getByRole('slider', { name: 'Second eigenvalue' }).fill('0');
  const kind = figure.locator('[data-testid="hc-kind"]');
  const root = figure.locator('[data-testid="hc"]');
  const matrix = figure.locator('.hc-math');
  const before = await matrix.locator('.katex-mathml').nth(1).textContent();

  await figure.getByRole('radio', { name: '−¼ z⁴' }).check();
  await expect(kind).toHaveText('Degenerate');
  await expect(root).toHaveAttribute('data-actual', 'saddle');
  await figure.getByRole('radio', { name: '+¼ z⁴' }).check();
  await expect(root).toHaveAttribute('data-actual', 'strict-minimum');
  await figure.getByRole('radio', { name: '⅓ z³' }).check();
  await expect(root).toHaveAttribute('data-actual', 'saddle');
  await expect(figure.locator('[data-testid="hc-actual"]')).toContainText('saddle point');
  // H itself never changed.
  await expect(matrix.locator('.katex-mathml').nth(1)).toHaveText(before ?? '');
});

for (const theme of THEMES) {
  test(`widget renders in ${theme} theme`, async ({ page }) => {
    const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const expected = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--viz-3').trim(),
    );
    expect(expected).toMatch(/^oklch\(/);
    await expect(figure.locator('[data-layer="slice-1"]')).toHaveAttribute('stroke', expected);
    expect(consoleErrors, 'console errors').toEqual([]);
    await figure.screenshot({ path: `test-results/widget-${NAME}-${theme}.png` });
  });
}

test('widget works at 360 px width', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  const { figure } = await hydrate(page, '/dev/widgets');
  const box = await figure.boundingBox();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
  const overflow = await figure.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(figure.getByRole('slider', { name: 'First eigenvalue' })).toBeVisible();
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});
