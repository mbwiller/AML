import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'learning-rate-schedules';

/**
 * `learning-rate-schedules` (STYLE_GUIDE.md §7) against the static build:
 * hydrates on /dev/widgets, switching the schedule and moving the start
 * changes the outcome readout (inverse-square stalls, inverse arrives), the
 * cumulative chart toggles, both themes screenshot cleanly, and it fits 360 px.
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
  await expect(figure.getByTestId('lrs-distance-chart')).toBeVisible();
  return { figure, consoleErrors };
}

test('/dev/widgets renders the widget with its manifest', async ({ page }) => {
  const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`).first()).toContainText(
    'showCumulative',
  );
  await expect(figure.locator('.widget-title')).toHaveText(
    'Decaying step sizes and the Robbins–Monro conditions',
  );
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(figure.getByTestId('lrs-cumulative-chart')).toBeVisible();
  await expect(figure.getByTestId('lrs-table').locator('tbody tr')).toHaveCount(4);
  await expect(figure.getByRole('radio', { name: /^Inverse η₀\/\(t\+1\)$/ })).toBeChecked();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('schedule and start change the outcome: inverse-square stalls, inverse arrives', async ({
  page,
}) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const outcome = figure.getByTestId('lrs-outcome');
  await expect(outcome).toContainText('arrives');
  await expect(figure.locator('.lrs')).toHaveAttribute('data-arrived', 'yes');

  const square = figure.getByRole('radio', { name: /^Inverse-square/ });
  await square.focus();
  await page.keyboard.press('Space');
  await expect(square).toBeChecked();
  await expect(outcome).toContainText('stalls');
  await expect(figure.locator('.lrs')).toHaveAttribute('data-arrived', 'no');

  // Exponential (β = 0.1) has budget ≈ 10.5: it arrives from 5 but stalls from 20.
  await figure.getByRole('radio', { name: /^Exponential/ }).check();
  await expect(outcome).toContainText('arrives');
  const start = figure.getByRole('slider', { name: 'Starting distance' });
  await start.focus();
  for (let i = 0; i < 30; i += 1) await page.keyboard.press('ArrowRight');
  await expect(start).toHaveValue('20');
  await expect(outcome).toContainText('stalls');

  const box = await start.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await figure.getByRole('checkbox', { name: 'Cumulative sums' }).uncheck();
  await expect(figure.getByTestId('lrs-cumulative-chart')).toHaveCount(0);
  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(figure.getByTestId('lrs-cumulative-chart')).toBeVisible();
  await expect(figure.getByRole('radio', { name: /^Inverse η₀\/\(t\+1\)$/ })).toBeChecked();
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
    await expect(
      figure.getByTestId('lrs-distance-chart').locator('[data-series="inverse"]'),
    ).toHaveAttribute('stroke', expected);
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
  await expect(figure.getByRole('slider', { name: 'Initial step size' })).toBeVisible();
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});

test('hydration does not shift the layout at desktop width', async ({ page }) => {
  await page.goto('/dev/widgets');
  const figure = page.locator(`figure[data-widget="${NAME}"]`).first();
  await figure.scrollIntoViewIfNeeded();
  const before = (await figure.boundingBox())?.height ?? 0;
  await expect(figure).toHaveAttribute('data-hydrated', '', { timeout: 20_000 });
  await expect(figure.getByTestId('lrs-distance-chart')).toBeVisible();
  const after = (await figure.boundingBox())?.height ?? 0;
  expect(Math.abs(after - before), `height ${before} → ${after}`).toBeLessThanOrEqual(24);
});
