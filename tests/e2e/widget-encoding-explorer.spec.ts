import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'encoding-explorer';
const LESSON = '/units/u1-linear-regression/components-of-a-learning-problem/';

/**
 * `encoding-explorer` (STYLE_GUIDE.md §7) against the static build: hydrates
 * on /dev/widgets, a target slider breaks the integer code's exact fit, the
 * one-hot-with-intercept matrix is rank deficient and its θ slides along the
 * null direction without moving ŷ, both themes screenshot cleanly, it fits
 * 360 px, and the reserved height covers the body.
 */

async function hydrate(page: Page, path: string) {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(path);
  const figure = page.locator(`figure[data-widget="${NAME}"]`).first();
  await figure.scrollIntoViewIfNeeded();
  await expect(figure).toHaveAttribute('data-hydrated', '', { timeout: 15_000 });
  await expect(figure.locator('[data-testid="encx-matrix"]')).toBeVisible();
  return { figure, root: figure.locator('.encx'), consoleErrors };
}

test('/dev/widgets renders the widget with its manifest', async ({ page }) => {
  const { figure, root, consoleErrors } = await hydrate(page, '/dev/widgets');
  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`).first()).toContainText(
    'categories',
  );
  await expect(figure.locator('.widget-title')).toHaveText(
    'One categorical column, four encodings',
  );
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(root).toHaveAttribute('data-encoding', 'integer');
  await expect(root).toHaveAttribute('data-columns', '2');
  await expect(root).toHaveAttribute('data-rank', '2');
  await expect(figure.locator('[data-testid="encx-summary"] tbody tr')).toHaveCount(4);
  await expect(figure.locator('.encx-math .katex').first()).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('a peak in the middle breaks the integer code but not one-hot', async ({ page }) => {
  const { figure, root } = await hydrate(page, '/dev/widgets');
  await expect(figure.locator('[data-testid="encx-exact-integer"]')).toContainText('yes');

  const slider = figure.getByRole('slider', { name: 'Target for 10042' });
  await slider.focus();
  await page.keyboard.press('End');
  await expect(slider).toHaveValue('10');
  await expect(root).toHaveAttribute('data-exact', 'no');
  await expect(figure.locator('[data-testid="encx-exact-integer"]')).toContainText('no');
  await expect(figure.locator('[data-testid="encx-exact-standardized"]')).toContainText('no');
  await expect(figure.locator('[data-testid="encx-exact-one-hot"]')).toContainText('yes');
  await expect(figure.locator('[data-testid="encx-exact-one-hot-drop-first"]')).toContainText(
    'yes',
  );
  await expect(figure.locator('[data-testid="encx-note"]')).toContainText('largest miss');

  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(slider).toHaveValue('3');
});

test('one-hot with an intercept is rank deficient; c moves θ but not ŷ', async ({ page }) => {
  const { figure, root } = await hydrate(page, '/dev/widgets');
  await figure.getByRole('radio', { name: 'One-hot', exact: true }).check();
  await expect(root).toHaveAttribute('data-columns', '6');
  await expect(root).toHaveAttribute('data-rank', '5');
  await expect(root).toHaveAttribute('data-unique', 'no');
  await expect(figure.locator('[data-testid="encx-shape"]')).toContainText('not unique');

  const fitColumn = () =>
    figure
      .locator('[data-testid="encx-matrix"] tbody tr td:last-child')
      .allTextContents()
      .then((cells) => cells.join(' '));
  const math = figure.locator('.encx-math');
  const thetaBefore = await math.textContent();
  const fitBefore = await fitColumn();

  const shift = figure.getByRole('slider', { name: 'Shift c along the null direction' });
  await shift.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(shift).toHaveValue('1');
  await expect(math).not.toHaveText(thetaBefore ?? '');
  expect(await fitColumn()).toBe(fitBefore);

  // Without the intercept the same one-hot columns are independent.
  await figure.getByRole('checkbox', { name: 'Intercept column θ₀' }).uncheck();
  await expect(root).toHaveAttribute('data-columns', '5');
  await expect(root).toHaveAttribute('data-rank', '5');
  await expect(root).toHaveAttribute('data-unique', 'yes');
  await expect(shift).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`widget renders in ${theme} theme`, async ({ page }) => {
    const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const expected = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--viz-2').trim(),
    );
    expect(expected).toMatch(/^oklch\(/);
    await expect(figure.locator('[data-layer="fit"]')).toHaveAttribute('fill', expected);
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
  const slider = figure.getByRole('slider', { name: 'Target for 10040' });
  await expect(slider).toBeVisible();
  expect((await slider.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});

for (const [label, path] of [
  ['/dev/widgets', '/dev/widgets'],
  ['lesson 1.1', LESSON],
] as const) {
  test(`the reserved height covers the hydrated body on ${label}`, async ({ page }) => {
    const { figure } = await hydrate(page, path);
    const reserved = await figure.evaluate((el) =>
      parseFloat(getComputedStyle(el).getPropertyValue('--widget-height')),
    );
    const live = await figure
      .locator('.widget-live')
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(live).toBeLessThanOrEqual(reserved + 8);
  });
}
