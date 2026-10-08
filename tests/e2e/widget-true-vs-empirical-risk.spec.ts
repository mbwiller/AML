import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'true-vs-empirical-risk';
const LESSON = '/units/u2-risk-and-gradient-descent/true-and-empirical-risk/';

/**
 * `true-vs-empirical-risk` (STYLE_GUIDE.md §7) against the static build:
 * hydrates on /dev/widgets with its manifest and the lesson 2.2 numbers
 * (θ* = −2.25, σ² = 67.24 for placebo), "Resample" draws a fresh training
 * set and changes the training risk, with θ̂ = ȳ the training risk lands
 * below the true risk on average, both themes screenshot cleanly, it fits
 * 360 px, and lesson 2.2 hydrates it with its authored props.
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
  await expect(figure.locator('[data-testid="tver-risk"]')).toBeVisible();
  return { figure, consoleErrors };
}

const number = (text: string | null) => Number((text ?? '').replace('−', '-'));

test('/dev/widgets renders the widget with its manifest and the placebo numbers', async ({
  page,
}) => {
  const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`)).toContainText(
    'showTrainingRisk',
  );
  await expect(figure.locator('.widget-title')).toHaveText('True risk and training risk');
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(figure.locator('[data-testid="tver-theta-star"]')).toHaveText('−2.25');
  await expect(figure.locator('[data-testid="tver-sigma2"]')).toHaveText('67.24');
  await expect(figure.locator('.tver-caption').first()).toContainText(
    'the trial’s 50 placebo patients',
  );
  await expect(figure.locator('[data-layer="gap"]')).toHaveCount(1);
  await expect(figure.locator('.tver-formula .katex')).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('Resample draws a fresh training set; the n slider is keyboard-operable', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const train = figure.locator('[data-testid="tver-train"]');
  const before = await train.textContent();
  await figure.getByRole('button', { name: 'Resample', exact: true }).click();
  await expect(figure.locator('.tver')).toHaveAttribute('data-draw', '1');
  await expect(train).not.toHaveText(before ?? '');
  await expect(figure.locator('.tver-caption').first()).toContainText('fresh training set #1');
  await expect(figure.locator('[data-layer="history"] circle')).toHaveCount(2);

  const slider = figure.getByRole('slider', { name: 'Patients per training set' });
  await expect(slider).toHaveValue('50');
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveValue('49');
  const box = await slider.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  // New settings restart the record of training sets.
  await expect(figure.locator('[data-layer="history"] circle')).toHaveCount(1);

  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(slider).toHaveValue('50');
  await expect(figure.locator('.tver')).toHaveAttribute('data-draw', '0');
  await expect(train).toHaveText(before ?? '');
});

test('with θ̂ = ȳ the training risk is optimistic on average', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  await figure.getByRole('radio', { name: 'fitted mean ȳ' }).check();
  await expect(figure.locator('.tver')).toHaveAttribute('data-theta-mode', 'fitted');
  const slider = figure.getByRole('slider', { name: 'Patients per training set' });
  await slider.fill('5');
  await expect(slider).toHaveValue('5');
  await expect(figure.locator('[data-testid="tver-expected-diff"]')).toHaveText('−26.90');
  for (let i = 0; i < 3; i += 1) {
    await figure.getByRole('button', { name: 'Resample 100×' }).click();
  }
  await expect(figure.locator('[data-layer="history"] circle')).toHaveCount(301);
  const meanDiff = number(await figure.locator('[data-testid="tver-mean-diff"]').textContent());
  expect(meanDiff).toBeLessThan(-15);
  expect(meanDiff).toBeGreaterThan(-40);
});

for (const theme of THEMES) {
  test(`widget renders in ${theme} theme`, async ({ page }) => {
    const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await figure.getByRole('button', { name: 'Resample 100×' }).click();
    const expected = await page.evaluate(() => {
      const probe = (token: string) => {
        const el = document.createElement('div');
        el.style.color = `var(${token})`;
        document.body.append(el);
        const color = getComputedStyle(el).color;
        el.remove();
        return color;
      };
      return { train: probe('--viz-6'), truth: probe('--viz-1') };
    });
    const stroke = (layer: string) =>
      figure
        .locator(`[data-layer="${layer}"] path`)
        .first()
        .evaluate((el) => getComputedStyle(el).stroke);
    expect(await stroke('training-risk')).toBe(expected.train);
    expect(await stroke('true-risk')).toBe(expected.truth);
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
  await expect(figure.getByRole('slider', { name: 'Patients per training set' })).toBeVisible();
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});

test('lesson 2.2 embeds the hydrated widget with its authored params', async ({ page }) => {
  const { figure, consoleErrors } = await hydrate(page, LESSON);
  const params = figure;
  await expect(params).toHaveAttribute('data-widget-params', /"dataset":"vasco"/);
  await expect(params).toHaveAttribute('data-widget-params', /"arm":"placebo"/);
  await expect(params).toHaveAttribute('data-widget-params', /"model":"constant"/);
  await expect(params).toHaveAttribute('data-widget-params', /"n":50/);
  await expect(params).toHaveAttribute('data-widget-params', /"resample":true/);
  await expect(figure.locator('[data-testid="tver-sigma2"]')).toHaveText('67.24');
  await expect(figure.getByRole('button', { name: 'Resample', exact: true })).toBeVisible();
  await expect(figure.locator('.widget-challenge')).toContainText('Resample the 50 placebo');
  await expect(figure.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});
