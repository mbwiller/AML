import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'dgp-sampler';

/**
 * `dgp-sampler` (STYLE_GUIDE.md §7) against the static build: hydrates on
 * /dev/widgets, sliders and "Draw again" change the readouts, the population
 * R² follows the formula, both themes screenshot cleanly, and it fits 360 px.
 * Lesson 2.1's embedding is checked in widgets-u2-lessons.spec.ts.
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
  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`)).toContainText('sigmaEps');
  await expect(figure.locator('.widget-title')).toHaveText(
    'Sampling from a linear data-generating distribution',
  );
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(figure.locator('[data-layer="scatter"] circle')).toHaveCount(20);
  await expect(figure.locator('[data-testid="dgp-pop-r2"]')).toHaveText('0.500');
  await expect(figure.locator('[data-testid="dgp-r2"]')).toHaveText(/^0\.\d{3}$/);
  await expect(
    figure.locator('[data-testid="dgp-convergence"] [data-layer="path"]'),
  ).toHaveAttribute('d', /^M/);
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('sliders are keyboard-operable and move the readouts', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const noise = figure.getByRole('slider', { name: 'Noise standard deviation' });
  const pop = figure.locator('[data-testid="dgp-pop-r2"]');
  const r2 = figure.locator('[data-testid="dgp-r2"]');

  await noise.focus();
  await page.keyboard.press('Home');
  await expect(noise).toHaveValue('0');
  await expect(pop).toHaveText('1.000');
  await expect(r2).toHaveText('1.000');
  await expect(figure.locator('[data-testid="dgp-mse"]')).toHaveText('0.000');

  // σ_ε = 2 with β = σ_X = 1: R² = 1 / (1 + 4) = 0.2.
  for (let i = 0; i < 20; i += 1) await page.keyboard.press('ArrowRight');
  await expect(noise).toHaveValue('2');
  await expect(pop).toHaveText('0.200');

  const box = await noise.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  const n = figure.getByRole('slider', { name: 'Sample size' });
  await n.focus();
  await page.keyboard.press('End');
  await expect(n).toHaveValue('1000');
  await expect(figure.locator('[data-layer="scatter"] circle')).toHaveCount(1000);

  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(noise).toHaveValue('1');
  await expect(n).toHaveValue('20');
});

test('"Draw again" draws a new sample and the curve can track the training MSE', async ({
  page,
}) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const fit = figure.locator('[data-testid="dgp-fit"]');
  const before = await fit.textContent();
  await figure.getByRole('button', { name: 'Draw again' }).click();
  await expect(figure.locator('[data-testid="dgp-seed"]')).toHaveText('draw 2');
  await expect(fit).not.toHaveText(before ?? '');
  // The population R² does not depend on the draw.
  await expect(figure.locator('[data-testid="dgp-pop-r2"]')).toHaveText('0.500');

  const plot = figure.locator('[data-testid="dgp-convergence"]');
  await expect(plot).toHaveAttribute('aria-label', /sample R²/);
  await figure.getByRole('radio', { name: 'Training MSE' }).check();
  await expect(plot).toHaveAttribute('aria-label', /training MSE/);
  await expect(plot).toHaveAttribute('aria-label', /σ_ε² 1\.000/);
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
    await expect(figure.locator('[data-layer="scatter"]')).toHaveAttribute('fill', expected);
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
  await expect(figure.getByRole('slider', { name: 'Sample size' })).toBeVisible();
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});
