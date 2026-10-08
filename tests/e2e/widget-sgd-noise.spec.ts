import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'sgd-noise';

/**
 * `sgd-noise` (STYLE_GUIDE.md §7) against the static build: hydrates on
 * /dev/widgets, raising the batch size shrinks the spread by about √b, more
 * draws bring the average closer to the full gradient, the path view
 * renders, both themes screenshot cleanly, and it fits 360 px.
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

const num = (s: string | null) => Number((s ?? '').replace('−', '-'));

test('/dev/widgets renders the widget with its manifest', async ({ page }) => {
  const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`).first()).toContainText(
    'batchSize',
  );
  await expect(figure.locator('.widget-title')).toHaveText(
    'Minibatch gradients: unbiased and noisy',
  );
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(figure.locator('[data-layer="samples"] circle')).toHaveCount(40);
  await expect(figure.locator('[data-layer="full-gradient"]')).toHaveCount(1);
  await expect(figure.locator('[data-layer="sample-mean"]')).toHaveCount(1);
  await expect(figure.locator('[data-testid="sgn-readout"] .katex').first()).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('batch size 4 and 16 shrink the spread by about 2 and 4', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const batch = figure.getByRole('slider', { name: 'Batch size' });
  const draws = figure.getByRole('slider', { name: 'Minibatches drawn' });
  await draws.focus();
  await page.keyboard.press('End');
  await expect(draws).toHaveValue('400');
  await expect(figure.locator('[data-layer="samples"] circle')).toHaveCount(400);

  await expect(batch).toHaveValue('1');
  await expect(figure.getByTestId('sgn-ratio')).toHaveText('1.00');
  await batch.focus();
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowRight');
  await expect(batch).toHaveValue('4');
  const r4 = num(await figure.getByTestId('sgn-ratio').textContent());
  expect(r4).toBeGreaterThan(1.8);
  expect(r4).toBeLessThan(2.2);
  for (let i = 0; i < 12; i += 1) await page.keyboard.press('ArrowRight');
  await expect(batch).toHaveValue('16');
  const r16 = num(await figure.getByTestId('sgn-ratio').textContent());
  expect(r16).toBeGreaterThan(3.5);
  expect(r16).toBeLessThan(4.5);

  const box = await batch.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test('the path view draws SGD and GD; the probe is keyboard-movable', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const probe = figure.getByRole('button', { name: /^Probe point θ at/ });
  const before = await probe.getAttribute('aria-label');
  await probe.focus();
  await page.keyboard.press('ArrowUp');
  await expect(figure.getByRole('button', { name: /^Probe point θ at/ })).not.toHaveAttribute(
    'aria-label',
    before ?? '',
  );
  await figure.getByRole('radio', { name: 'SGD path' }).check();
  await expect(figure.locator('[data-layer="sgd-path"]')).toHaveCount(1);
  await expect(figure.locator('[data-layer="gd-path"]')).toHaveCount(1);
  await expect(figure.getByTestId('sgn-floor')).toContainText('RMS distance');
  await figure.screenshot({ path: `test-results/widget-${NAME}-path.png` });
});

for (const theme of THEMES) {
  test(`widget renders in ${theme} theme`, async ({ page }) => {
    const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const expected = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--viz-1').trim(),
    );
    expect(expected).toMatch(/^oklch\(/);
    await expect(figure.locator('[data-layer="samples"]')).toHaveAttribute('stroke', expected);
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
  await expect(figure.getByRole('slider', { name: 'Batch size' })).toBeVisible();
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});

test('hydration does not shift the layout at desktop width', async ({ page }) => {
  await page.goto('/dev/widgets');
  const figure = page.locator(`figure[data-widget="${NAME}"]`).first();
  await figure.scrollIntoViewIfNeeded();
  const before = (await figure.boundingBox())?.height ?? 0;
  await expect(figure).toHaveAttribute('data-hydrated', '', { timeout: 20_000 });
  await expect(figure.locator('.MafsView svg').first()).toBeVisible();
  const after = (await figure.boundingBox())?.height ?? 0;
  expect(Math.abs(after - before), `height ${before} → ${after}`).toBeLessThanOrEqual(24);
});
