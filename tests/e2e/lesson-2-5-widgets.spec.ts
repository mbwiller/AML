import { expect, test } from '@playwright/test';

const LESSON = '/units/u2-risk-and-gradient-descent/step-size-and-conditioning/';

/**
 * Lesson 2.5 embeds four widgets; each hydrates on the lesson page with the
 * props the lesson authored (src/content/units/u2-risk-and-gradient-descent/
 * 05-step-size-and-conditioning.mdx), and the lesson's challenge line
 * overrides the manifest's.
 */
test('lesson 2.5 hydrates all four widgets with their authored props', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(LESSON);

  const hydrated = async (name: string) => {
    const figure = page.locator(`figure[data-widget="${name}"]`).first();
    await figure.scrollIntoViewIfNeeded();
    await expect(figure).toHaveAttribute('data-hydrated', '', { timeout: 20_000 });
    await expect(figure.locator('.katex-error')).toHaveCount(0);
    return figure;
  };

  // gd-1d-quadratic: a = 2, b = −4, c = 0, η = 0.25, both markers.
  const q = await hydrated('gd-1d-quadratic');
  await expect(q).toHaveAttribute('data-widget-params', /"a":2,"b":-4,"c":0,"eta":0\.25/);
  await expect(q).toHaveAttribute('data-widget-params', /"markers":\["eta_opt","two_eta_opt"\]/);
  await expect(q.getByRole('slider', { name: 'Step size' })).toHaveValue('0.25');
  await expect(q.getByTestId('g1q-regime')).toHaveText('monotone convergence');
  await expect(q.locator('[data-marker="eta_opt"]')).toHaveCount(1);
  await expect(q.locator('.widget-challenge')).toContainText('converges in exactly one step');

  // gd-2d-eigen: λ = (1, 3), rotation 0, η = 0.25, start (−15, 15), modes on.
  const e = await hydrated('gd-2d-eigen');
  await expect(e).toHaveAttribute('data-widget-params', /"start":\[-15,15\]/);
  await expect(e.locator('.g2e')).toHaveAttribute('data-kappa', '3.000');
  await expect(e.getByTestId('g2e-factor-1')).toHaveText('0.750');
  await expect(e.getByTestId('g2e-factor-2')).toHaveText('0.250');
  await expect(e.getByTestId('g2e-modes')).toBeVisible();
  await expect(e.locator('.widget-challenge')).toContainText('Reproduce L4 p.53');

  // learning-rate-schedules: inverse, η₀ = 1, β = 0.1, cumulative on.
  const s = await hydrated('learning-rate-schedules');
  await expect(s).toHaveAttribute('data-widget-params', /"schedule":"inverse"/);
  await expect(s.getByRole('radio', { name: /^Inverse η₀\/\(t\+1\)$/ })).toBeChecked();
  await expect(s.getByTestId('lrs-cumulative-chart')).toBeVisible();
  await expect(s.locator('.widget-challenge')).toContainText('Which schedules stall');

  // sgd-noise: n = 100, b = 1, η = 0.1, full gradient on.
  const n = await hydrated('sgd-noise');
  await expect(n).toHaveAttribute('data-widget-params', /"n":100,"batchSize":1,"eta":0\.1/);
  await expect(n.getByRole('slider', { name: 'Batch size' })).toHaveValue('1');
  await expect(n.locator('[data-layer="full-gradient"]')).toHaveCount(1);
  await expect(n.locator('.widget-challenge')).toContainText(
    'average many sampled gradient arrows',
  );

  expect(consoleErrors, 'console errors').toEqual([]);
});
