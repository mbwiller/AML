import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'line-fit-playground';

/** The Lecture 2 companion's printed fit (cell 15). */
const COMPANION = { slope: 37.37884216052121, intercept: -797.0817390343262 };

/**
 * `line-fit-playground` against the static build (STYLE_GUIDE.md §7):
 * hydrates on /dev/widgets, a slider changes the metric readouts, "Snap to
 * OLS" lands on the companion's slope and intercept, residual squares toggle,
 * both themes screenshot cleanly, and it fits a 360 px screen.
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
  const root = figure.locator('.lfp');
  await expect(root.locator('svg.lfp-svg')).toBeVisible();
  return { figure, root, consoleErrors };
}

test('/dev/widgets renders the widget with its manifest', async ({ page }) => {
  const { figure, root, consoleErrors } = await hydrate(page, '/dev/widgets');
  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`).first()).toContainText(
    'theta1',
  );
  await expect(figure.locator('.widget-title')).toHaveText('Fitting a line to 20 patients');
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(root.locator('[data-layer="points"] circle')).toHaveCount(20);
  await expect(root.locator('[data-layer="residuals"] line')).toHaveCount(20);
  await expect(root.locator('[data-layer="squares"]')).toHaveCount(0);
  await expect(root.locator('.lfp-math .katex').first()).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('the slope slider is keyboard-operable and changes the readouts', async ({ page }) => {
  const { figure, root } = await hydrate(page, '/dev/widgets');
  const slope = figure.getByRole('slider', { name: 'Slope' });
  await expect(slope).toHaveValue('25');
  const box = await slope.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  const mse = root.getByTestId('lfp-mse');
  const r2 = root.getByTestId('lfp-r2');
  const mseBefore = await mse.textContent();
  const r2Before = await r2.textContent();
  await slope.focus();
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowRight');
  await expect(slope).toHaveValue('25.5');
  await expect(mse).not.toHaveText(mseBefore ?? '');
  await expect(r2).not.toHaveText(r2Before ?? '');
  await expect(root).toHaveAttribute('data-theta1', '25.5');

  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(slope).toHaveValue('25');
  await expect(mse).toHaveText(mseBefore ?? '');
});

test('"Snap to OLS" lands on the companion’s slope and intercept', async ({ page }) => {
  const { figure, root } = await hydrate(page, '/dev/widgets');
  const snap = figure.getByRole('button', { name: 'Snap to OLS' });
  await snap.click();
  await expect(root).toHaveAttribute('data-at-ols', 'true');
  await expect(snap).toBeDisabled();
  const theta1 = Number(await root.getAttribute('data-theta1'));
  const theta0 = Number(await root.getAttribute('data-theta0'));
  expect(Math.abs(theta1 - COMPANION.slope)).toBeLessThan(1e-12);
  expect(Math.abs(theta0 - COMPANION.intercept)).toBeLessThan(1e-9);
  await expect(root.getByTestId('lfp-theta')).toContainText('θ₀ = −797.0817, θ₁ = 37.3788');
  // At the least-squares line "your line" and "least squares" agree.
  const row = root.locator('[data-metric="mse"] td');
  await expect(row.nth(0)).toHaveText((await row.nth(1).textContent()) ?? '');
});

test('squares and the MAE loss: least absolute deviations beats OLS on MAE', async ({ page }) => {
  const { figure, root } = await hydrate(page, '/dev/widgets');
  await figure.getByRole('checkbox', { name: 'Squares' }).check();
  await expect(root.locator('[data-layer="squares"] rect')).toHaveCount(20);

  await figure.getByRole('radio', { name: 'MAE' }).check();
  await expect(root).toHaveAttribute('data-loss', 'mae');
  await expect(root.getByTestId('lfp-headline')).toContainText('MAE');
  await figure.getByRole('button', { name: 'Snap to OLS' }).click();
  const maeOls = Number((await root.getByTestId('lfp-mae').textContent())?.replace('−', '-'));
  await figure.getByRole('button', { name: 'Snap to least absolute deviations' }).click();
  await expect(root).toHaveAttribute('data-at-ols', 'false');
  const maeLad = Number((await root.getByTestId('lfp-mae').textContent())?.replace('−', '-'));
  expect(maeLad).toBeLessThan(maeOls);
});

for (const theme of THEMES) {
  test(`widget renders in ${theme} theme`, async ({ page }) => {
    const { figure, root, consoleErrors } = await hydrate(page, '/dev/widgets');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const expected = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--viz-1').trim(),
    );
    expect(expected).toMatch(/^oklch\(/);
    await expect(root.locator('[data-layer="points"]')).toHaveAttribute('fill', expected);
    await figure.getByRole('checkbox', { name: 'Squares' }).check();
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
  await expect(figure.getByRole('slider', { name: 'Intercept' })).toBeVisible();
  const snap = await figure.getByRole('button', { name: 'Snap to OLS' }).boundingBox();
  expect(snap?.height ?? 0).toBeGreaterThanOrEqual(44);
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});

test('the reserved height covers the hydrated body', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const reserved = await figure.evaluate((el) =>
    parseFloat(getComputedStyle(el).getPropertyValue('--widget-height')),
  );
  const live = await figure
    .locator('.widget-live')
    .evaluate((el) => el.getBoundingClientRect().height);
  expect(live).toBeLessThanOrEqual(reserved + 8);
});
