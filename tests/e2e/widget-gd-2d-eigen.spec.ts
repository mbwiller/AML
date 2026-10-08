import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'gd-2d-eigen';

/**
 * `gd-2d-eigen` (STYLE_GUIDE.md §7) against the static build: hydrates on
 * /dev/widgets, the λ2 slider changes the condition number, the five L4 p.53
 * presets set η and the per-mode factors, rotation leaves the factors alone,
 * the start point is keyboard-movable, the small multiples render, both
 * themes screenshot cleanly, and it fits 360 px.
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
  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`).first()).toContainText(
    'showModes',
  );
  await expect(figure.locator('.widget-title')).toHaveText('One step size, two curvatures');
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(figure.locator('[data-testid="g2e-readout"] .katex').first()).toBeVisible();
  await expect(figure.locator('[data-layer="iterates"] circle')).toHaveCount(25);
  await expect(figure.getByTestId('g2e-modes')).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('the eigenvalue slider changes κ; presets set η and the per-mode factors', async ({
  page,
}) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const root = figure.locator('.g2e');
  await expect(root).toHaveAttribute('data-kappa', '3.000');

  const l2 = figure.getByRole('slider', { name: 'Eigenvalue 2' });
  await l2.focus();
  for (let i = 0; i < 10; i += 1) await page.keyboard.press('ArrowRight');
  await expect(l2).toHaveValue('4');
  await expect(root).toHaveAttribute('data-kappa', '4.000');
  await expect(figure.getByTestId('g2e-readout')).toContainText('4.00');
  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(root).toHaveAttribute('data-kappa', '3.000');

  // L4 p.53 with λ = (1, 3): 1.5/λmax is the best step, factors ±0.5.
  await figure.getByRole('button', { name: /^Set η to 1\.5 times/ }).click();
  await expect(figure.getByTestId('g2e-factor-1')).toHaveText('0.500');
  await expect(figure.getByTestId('g2e-factor-2')).toHaveText('−0.500');
  await expect(figure.getByTestId('g2e-verdict')).toContainText('at step 10');
  await figure.getByRole('button', { name: /^Set η to 2\.1 times/ }).click();
  await expect(figure.getByTestId('g2e-factor-2')).toHaveText('−1.100');
  await expect(figure.getByTestId('g2e-verdict')).toContainText('diverges');

  // Rotating the bowl leaves the per-mode factors unchanged.
  const rotation = figure.getByRole('slider', { name: 'Rotation' });
  await rotation.focus();
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowRight');
  await expect(rotation).toHaveValue('30');
  await expect(figure.getByTestId('g2e-factor-2')).toHaveText('−1.100');
});

test('the start point is keyboard-movable and Step reveals iterates', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const start = figure.getByRole('button', { name: /^Starting point θ\(0\) at \(−15\.0, 15\.0\)/ });
  await start.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    figure.getByRole('button', { name: /^Starting point θ\(0\) at \(−14\.0, 15\.0\)/ }),
  ).toBeVisible();
  await figure.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(figure.locator('[data-layer="iterates"] circle')).toHaveCount(0);
  await figure.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(figure.locator('[data-layer="iterates"] circle')).toHaveCount(1);
});

test('the five-step-size comparison renders five panels', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  await figure.getByRole('checkbox', { name: /five step sizes/ }).check();
  await expect(figure.locator('.g2e-small')).toHaveCount(5);
  await expect(figure.getByTestId('g2e-five')).toContainText('10 steps');
  await figure.getByTestId('g2e-five').screenshot({ path: `test-results/widget-${NAME}-five.png` });
});

for (const theme of THEMES) {
  test(`widget renders in ${theme} theme`, async ({ page }) => {
    const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const expected = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--field-calculus').trim(),
    );
    expect(expected).toMatch(/^oklch\(/);
    await expect(figure.locator('[data-layer="iterates"]')).toHaveAttribute('fill', expected);
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
  await expect(figure.getByRole('slider', { name: 'Step size' })).toBeVisible();
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
