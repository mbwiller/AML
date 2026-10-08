import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'linear-bias-probe';
const LESSON = '/units/u1-linear-regression/datasets-models-and-model-classes/';

/**
 * `linear-bias-probe` (STYLE_GUIDE.md §7) against the static build: hydrates
 * on /dev/widgets with its manifest, the probe-dose slider changes the
 * step readouts (the model's step stays the same, the truth's shrinks),
 * swapping the dose feature for D/(6 + D) drives the squared bias to 0,
 * both themes screenshot cleanly, it fits 360 px, and lesson 1.2 hydrates it
 * with its authored props.
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
  await expect(figure.locator('[data-testid="lbp-slice"]')).toBeVisible();
  return { figure, consoleErrors };
}

const number = (text: string | null) => Number((text ?? '').replace('−', '-').split(' ')[0]);

test('/dev/widgets renders the widget with its manifest', async ({ page }) => {
  const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`)).toContainText(
    'showInteraction',
  );
  await expect(figure.locator('.widget-title')).toHaveText('What a linear model must get wrong');
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(figure.locator('[data-testid="lbp-equation"] .katex')).toBeVisible();
  await expect(figure.locator('[data-layer="model-contours"]')).toHaveAttribute('d', /^M/);
  await expect(figure.locator('[data-layer="truth"]')).toHaveAttribute('d', /^M/);
  await expect(figure.locator('[data-layer="bias-curve"]')).toHaveAttribute('d', /^M/);
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('the probe slider moves the +10 mg step: uniform for the line, not for the truth', async ({
  page,
}) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const slider = figure.getByRole('slider', { name: 'Probe dose' });
  const model = figure.locator('[data-testid="lbp-step-model"]');
  const truth = figure.locator('[data-testid="lbp-step-truth"]');
  await expect(slider).toHaveValue('0');
  const modelAt0 = number(await model.textContent());
  const truthAt0 = number(await truth.textContent());
  expect(truthAt0).toBeLessThan(-10);

  await slider.focus();
  for (let i = 0; i < 8; i += 1) await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('20');
  await expect(figure.locator('.lbp-stats')).toContainText('20 → 30 mg');
  expect(number(await model.textContent())).toBeCloseTo(modelAt0, 2);
  const truthAt20 = number(await truth.textContent());
  expect(Math.abs(truthAt20)).toBeLessThan(Math.abs(truthAt0) / 3);

  const box = await slider.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(slider).toHaveValue('0');
});

test('D/(6 + D) puts the truth in the class; the interaction does not shrink the bias', async ({
  page,
}) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const bias = figure.locator('[data-testid="lbp-bias"]');
  const before = number(await bias.textContent());
  expect(before).toBeGreaterThan(5);

  await figure.getByRole('checkbox', { name: 'Interaction: dose feature × B' }).check();
  await expect(figure.locator('[data-testid="lbp-equation"]')).toContainText('⋅');
  expect(number(await bias.textContent())).toBeCloseTo(before, 2);

  await figure.getByRole('checkbox', { name: 'Dose D' }).uncheck();
  await figure.getByRole('checkbox', { name: 'D/(6 + D)' }).check();
  await expect(bias).toHaveText('0.00 mmHg²');
  await expect(figure.locator('.lbp')).toHaveAttribute('data-features', 'emax_dose,baseline_sbp');
});

for (const theme of THEMES) {
  test(`widget renders in ${theme} theme`, async ({ page }) => {
    const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    // Strokes are computed theme colors (useVizTheme), re-read without a reload.
    const expected = await page.evaluate(() => {
      const probe = (token: string) => {
        const el = document.createElement('div');
        el.style.color = `var(${token})`;
        document.body.append(el);
        const color = getComputedStyle(el).color;
        el.remove();
        return color;
      };
      return { model: probe('--viz-6'), truth: probe('--viz-1') };
    });
    const stroke = (layer: string) =>
      figure.locator(`[data-layer="${layer}"]`).evaluate((el) => getComputedStyle(el).stroke);
    expect(await stroke('fit')).toBe(expected.model);
    expect(await stroke('truth')).toBe(expected.truth);
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
  await expect(figure.getByRole('slider', { name: 'Probe baseline' })).toBeVisible();
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});

test('lesson 1.2 embeds the hydrated widget with its authored params', async ({ page }) => {
  const { figure, consoleErrors } = await hydrate(page, LESSON);
  await expect(figure).toHaveAttribute('data-widget-params', /"dataset":"vasco"/);
  await expect(figure).toHaveAttribute(
    'data-widget-params',
    /"features":\["dose","baseline_sbp"\]/,
  );
  await expect(figure).toHaveAttribute('data-widget-params', /"showInteraction":false/);
  await expect(figure.getByRole('checkbox', { name: 'True mean' })).toBeChecked();
  await expect(figure.locator('.widget-challenge')).toContainText('+10 mg step');
  await expect(figure.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});
