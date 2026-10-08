import { expect, test, type Locator, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'generative-vs-discriminative-toggle';
const LESSON = '/units/u6-generative-models-and-naive-bayes/generative-vs-discriminative/';

/**
 * `generative-vs-discriminative-toggle` (STYLE_GUIDE.md §7) against the
 * static build: hydrates on /dev/widgets, the prior slider moves the Bayes
 * boundary and the flagged count while the logistic-regression boundary
 * stays put, the model toggle swaps which boundary is solid, both themes
 * screenshot cleanly, it fits 360 px, and the reserved height covers it.
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
  await expect(figure.locator('.MafsView svg').first()).toBeVisible();
  return { figure, root: figure.locator('.gvd'), consoleErrors };
}

const polylinePoints = (figure: Locator, layer: string) =>
  figure
    .locator(`[data-layer="${layer}"] polyline`)
    .first()
    .getAttribute('points')
    .then((p) => p ?? '');

test('/dev/widgets renders the widget with its manifest', async ({ page }) => {
  const { figure, root, consoleErrors } = await hydrate(page, '/dev/widgets');
  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`).first()).toContainText(
    'prior',
  );
  await expect(figure.locator('.widget-title')).toHaveText(
    'Generative or discriminative: who listens to the prior',
  );
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(root).toHaveAttribute('data-model', 'generative');
  await expect(root).toHaveAttribute('data-boundary', 'linear');
  await expect(figure.locator('[data-layer="bayes"] polyline')).toHaveCount(1);
  await expect(figure.locator('[data-layer="logistic"]')).toHaveAttribute('data-style', 'dashed');
  await expect(figure.locator('[data-layer="density-0"] ellipse')).toHaveCount(1);
  await expect(figure.locator('[data-testid="gvd-why"]')).toContainText('nearly coincides');
  await expect(figure.locator('.gvd-math .katex').first()).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('raising the prior moves the Bayes boundary, not logistic regression', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const prior = figure.getByRole('slider', { name: 'Prior p(y = 1)' });
  await expect(prior).toHaveValue('0.06');
  const flagged = figure.locator('[data-testid="gvd-flagged-bayes"]');
  const flaggedLr = figure.locator('[data-testid="gvd-flagged-lr"]');
  const before = Number((await flagged.textContent())?.split(' ')[0]);
  const lrBefore = await flaggedLr.textContent();
  const bayesBefore = await polylinePoints(figure, 'bayes');
  const lrLineBefore = await polylinePoints(figure, 'logistic');

  await prior.focus();
  for (let i = 0; i < 88; i += 1) await page.keyboard.press('ArrowRight');
  await expect(prior).toHaveValue('0.5');
  await expect(figure.locator('[data-testid="gvd-delta"]')).toHaveText(/^\+2\.\d\d$/);
  await expect(figure.locator('[data-testid="gvd-why"]')).toContainText('toward the no-event mean');

  const after = Number((await flagged.textContent())?.split(' ')[0]);
  expect(after).toBeGreaterThan(before);
  expect(await polylinePoints(figure, 'bayes')).not.toBe(bayesBefore);
  expect(await polylinePoints(figure, 'logistic')).toBe(lrLineBefore);
  await expect(flaggedLr).toHaveText(lrBefore ?? '');

  // The discriminative model: solid logistic line, explanation, and still unmoved by π.
  await figure.getByRole('radio', { name: 'Discriminative: p(y | x)' }).check();
  await expect(figure.locator('.gvd')).toHaveAttribute('data-model', 'discriminative');
  await expect(figure.locator('[data-layer="logistic"]')).toHaveAttribute('data-style', 'solid');
  await expect(figure.locator('[data-testid="gvd-why"]')).toContainText('does not move');
  await prior.focus();
  await page.keyboard.press('Home');
  expect(await polylinePoints(figure, 'logistic')).toBe(lrLineBefore);

  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(prior).toHaveValue('0.06');
  await expect(figure.locator('.gvd')).toHaveAttribute('data-model', 'generative');
});

test('separate covariances bend the Bayes boundary', async ({ page }) => {
  const { figure, root } = await hydrate(page, '/dev/widgets');
  await figure.getByRole('checkbox', { name: 'Shared covariance' }).uncheck();
  await expect(root).toHaveAttribute('data-boundary', 'quadratic');
  await expect(figure.locator('[data-layer="region"]')).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`widget renders in ${theme} theme`, async ({ page }) => {
    const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const expected = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--viz-positive').trim(),
    );
    expect(expected).toMatch(/^oklch\(/);
    await expect(figure.locator('[data-layer="scatter-1"]')).toHaveAttribute('fill', expected);
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
  const slider = figure.getByRole('slider', { name: 'Prior p(y = 1)' });
  await expect(slider).toBeVisible();
  expect((await slider.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});

for (const [label, path] of [
  ['/dev/widgets', '/dev/widgets'],
  ['lesson 6.1', LESSON],
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
