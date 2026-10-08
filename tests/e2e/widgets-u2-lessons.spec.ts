import { expect, test, type Locator, type Page } from '@playwright/test';

const L21 = '/units/u2-risk-and-gradient-descent/data-generating-distributions/';
const L23 = '/units/u2-risk-and-gradient-descent/gradients-and-optimality/';

/**
 * Lessons 2.1 and 2.3 embed `dgp-sampler`, `inner-product-dial`, and
 * `hessian-classifier` with authored props; each hydrates with exactly
 * those props and the lesson's own challenge line, without console errors.
 */

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function hydrated(page: Page, name: string): Promise<Locator> {
  const figure = page.locator(`figure[data-widget="${name}"]`).first();
  await figure.scrollIntoViewIfNeeded();
  await expect(figure).toHaveAttribute('data-hydrated', '', { timeout: 20_000 });
  await expect(figure.locator('.MafsView svg').first()).toBeVisible();
  await expect(figure.locator('.katex-error')).toHaveCount(0);
  return figure;
}

test('lesson 2.1 embeds dgp-sampler with its authored params', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(L21);
  const figure = await hydrated(page, 'dgp-sampler');
  await expect(figure).toHaveAttribute('data-widget-params', /"n":20/);
  await expect(figure).toHaveAttribute('data-widget-params', /"showConditionalMean":true/);
  await expect(figure.getByRole('slider', { name: 'Sample size' })).toHaveValue('20');
  await expect(figure.getByRole('slider', { name: 'Noise standard deviation' })).toHaveValue('1');
  await expect(figure.getByRole('slider', { name: 'Slope' })).toHaveValue('1');
  await expect(figure.locator('[data-testid="dgp-pop-r2"]')).toHaveText('0.500');
  await expect(figure.locator('.widget-challenge')).toContainText('Set σ_ε = 0');
  await figure.screenshot({ path: 'test-results/widget-dgp-sampler-lesson-2-1.png' });
  expect(errors, 'console errors').toEqual([]);
});

test('lesson 2.3 embeds inner-product-dial and hessian-classifier with their authored params', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(L23);

  const dial = await hydrated(page, 'inner-product-dial');
  await expect(dial).toHaveAttribute('data-widget-params', /"gradient":\[3,4\]/);
  await expect(dial.locator('[data-testid="ipd-g"]')).toHaveText('(3.0, 4.0)');
  await expect(dial.locator('[data-testid="ipd-curve"]')).toBeVisible();
  await expect(dial.locator('[data-layer="descent-band"]')).toHaveCount(1);
  await expect(dial.locator('.widget-challenge')).toContainText('Rotate the unit step');
  await dial.screenshot({ path: 'test-results/widget-inner-product-dial-lesson-2-3.png' });

  const hessian = await hydrated(page, 'hessian-classifier');
  await expect(hessian).toHaveAttribute('data-widget-params', /"eigenvalues":\[2,-1\]/);
  await expect(hessian.getByRole('slider', { name: 'First eigenvalue' })).toHaveValue('2');
  await expect(hessian.getByRole('slider', { name: 'Second eigenvalue' })).toHaveValue('-1');
  await expect(hessian.getByRole('slider', { name: 'Rotation of the eigenvectors' })).toHaveValue(
    '30',
  );
  await expect(hessian.locator('[data-testid="hc-kind"]')).toHaveText('Saddle');
  await expect(hessian.locator('polyline[data-level="zero"]').first()).toBeAttached();
  await expect(hessian.locator('.widget-challenge')).toContainText('set one eigenvalue to 0');
  await hessian.screenshot({ path: 'test-results/widget-hessian-classifier-lesson-2-3.png' });

  expect(errors, 'console errors').toEqual([]);
});
