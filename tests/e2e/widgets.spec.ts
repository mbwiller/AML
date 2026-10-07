import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'gaussian-2d-covariance';
const LESSON = '/units/u7-gaussian-discriminant-analysis/multivariate-gaussian-and-covariance/';

/**
 * The widget framework (STYLE_GUIDE.md §7) against the static build:
 * `/dev/widgets` hydrates the first real widget (client:visible), the Mafs
 * plane renders, sliders are keyboard-operable, "copy state link" round-trips
 * through the URL hash, both themes screenshot cleanly, and the lesson page
 * that embeds it hydrates too.
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
  return { figure, consoleErrors };
}

test('/dev/widgets renders the widget with its manifest', async ({ page }) => {
  const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');

  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`)).toContainText('rho');
  await expect(figure.locator('.widget-title')).toHaveText(
    'Covariance and the shape of a Gaussian',
  );
  await expect(figure.locator('.widget-challenge')).toContainText('Make the ellipse a circle');
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(figure.locator('[data-testid="g2c-matrix"] .katex').first()).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('the ρ slider is keyboard-operable and updates its readout', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const slider = figure.getByRole('slider', { name: 'Correlation' });
  const readout = figure.locator('output').nth(2);

  await expect(slider).toHaveValue('0.6');
  await expect(readout).toHaveText('0.60');
  await expect(slider).toHaveAttribute('aria-valuetext', '0.60');

  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveValue('0.5');
  await expect(readout).toHaveText('0.50');

  // ≥44 px hit area (STYLE_GUIDE.md §7 point 7)
  const box = await slider.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  // Reset restores the authored value
  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(slider).toHaveValue('0.6');
});

test('copy state link writes a hash that restores the same params on reload', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const { figure } = await hydrate(page, '/dev/widgets');
  const slider = figure.getByRole('slider', { name: 'Correlation' });
  await slider.focus();
  for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveValue('0.4');

  await figure.getByRole('button', { name: 'Copy state link' }).click();
  await expect(figure.locator('.widget-status')).toContainText(/Link/);
  expect(page.url()).toContain(`#w=${NAME}:`);

  await page.reload();
  const again = page.locator(`figure[data-widget="${NAME}"]`).first();
  await again.scrollIntoViewIfNeeded();
  await expect(again).toHaveAttribute('data-hydrated', '', { timeout: 15_000 });
  await expect(again.getByRole('slider', { name: 'Correlation' })).toHaveValue('0.4');
});

for (const theme of THEMES) {
  test(`widget renders in ${theme} theme`, async ({ page }) => {
    const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    // Scatter fill is read from the theme's computed tokens (useVizTheme) and
    // re-read on data-theme changes without a reload: --viz-1 differs per theme.
    const scatter = figure.locator('[data-layer="scatter"]');
    const expected = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--viz-1').trim(),
    );
    await expect(scatter).toHaveAttribute('fill', expected);
    expect(expected).toMatch(/^oklch\(/);
    expect(consoleErrors, 'console errors').toEqual([]);
    await figure.screenshot({ path: `test-results/widget-${NAME}-${theme}.png` });
  });
}

test('widget works at 360 px width', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { figure } = await hydrate(page, '/dev/widgets');
  // The figure fits the viewport and nothing inside it scrolls sideways
  // (the site header and dev-page prose are outside this contract point).
  const box = await figure.boundingBox();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
  const overflow = await figure.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(figure.getByRole('slider', { name: 'Correlation' })).toBeVisible();
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});

test('lesson 7.1 embeds the hydrated widget with its authored params', async ({ page }) => {
  const { figure, consoleErrors } = await hydrate(page, LESSON);
  await expect(figure).toHaveAttribute('data-widget-params', /"rho":0\.75/);
  await expect(figure.getByRole('slider', { name: 'Correlation' })).toHaveValue('0.75');
  await expect(figure.getByRole('slider', { name: 'Standard deviation of x' })).toHaveValue('2');
  // Scoped to the figure: the lesson prose itself is the content workstream's.
  await expect(figure.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('an unknown widget name still renders the placeholder', async ({ page }) => {
  await page.goto('/dev/kitchen-sink');
  const placeholder = page.locator('figure[data-widget="generative-vs-discriminative-toggle"]');
  await expect(placeholder).toHaveClass(/widget-placeholder/);
  await expect(placeholder).toContainText('Interactive explorable coming soon.');
});
