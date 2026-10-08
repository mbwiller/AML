import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'gd-1d-quadratic';

/**
 * `gd-1d-quadratic` (STYLE_GUIDE.md §7) against the static build: hydrates
 * on /dev/widgets, the η slider changes the contraction factor and regime
 * readouts, the η_opt and 2η_opt buttons land on "exact in one step" and
 * "bounces forever", Play/Step reveal iterates, both themes screenshot
 * cleanly, and it fits 360 px.
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
  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`)).toContainText('markers');
  await expect(figure.locator('.widget-title')).toHaveText('Gradient descent on a parabola');
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(figure.locator('[data-testid="g1q-readout"] .katex').first()).toBeVisible();
  await expect(figure.locator('[data-layer="iterates"] circle')).toHaveCount(12);
  await expect(figure.locator('[data-marker="eta_opt"]')).toHaveCount(1);
  await expect(figure.locator('[data-marker="two_eta_opt"]')).toHaveCount(1);
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('the η slider changes the contraction factor and the regime', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const slider = figure.getByRole('slider', { name: 'Step size' });
  const regime = figure.getByTestId('g1q-regime');
  const factor = figure.getByTestId('g1q-factor');

  await expect(slider).toHaveValue('0.25');
  await expect(regime).toHaveText('monotone convergence');
  await expect(factor).toContainText('0.500');

  await slider.focus();
  for (let i = 0; i < 50; i += 1) await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('0.75');
  await expect(regime).toHaveText('oscillating convergence');
  await expect(factor).toContainText('−0.500');
  await expect(figure.locator('.g1q')).toHaveAttribute('data-regime', 'oscillating');

  await page.keyboard.press('End');
  await expect(regime).toHaveText('divergence');

  const box = await slider.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await figure.getByRole('button', { name: /^Set η to η_opt/ }).click();
  await expect(regime).toHaveText('exact in one step');
  await expect(factor).toContainText('0.000');
  await figure.getByRole('button', { name: /^Set η to 2η_opt/ }).click();
  await expect(regime).toHaveText('bounces forever');
  await expect(factor).toContainText('−1.000');

  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(slider).toHaveValue('0.25');
});

test('Step reveals the iterates one at a time; Show all restores them', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const dots = figure.locator('[data-layer="iterates"] circle');
  await expect(dots).toHaveCount(12);
  await figure.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(dots).toHaveCount(0);
  await expect(figure.getByTestId('pk-player-status')).toHaveText('Step 0 of 12');
  await figure.getByRole('button', { name: 'Step', exact: true }).click();
  await figure.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(dots).toHaveCount(2);
  await figure.getByRole('button', { name: 'Show all' }).click();
  await expect(dots).toHaveCount(12);
  await figure.getByRole('button', { name: 'Play' }).click();
  await expect(figure.getByTestId('pk-player-status')).toHaveText('Step 12 of 12', {
    timeout: 10_000,
  });
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
