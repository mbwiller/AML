import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'bow-nb-scorer';
const LESSON = '/units/u6-generative-models-and-naive-bayes/naive-bayes/';

/**
 * `bow-nb-scorer` (STYLE_GUIDE.md §7) against the static build: hydrates on
 * /dev/widgets, typing changes the score, smoothing off with a word unseen in
 * one class shows the −∞ state, both themes screenshot cleanly, it fits
 * 360 px, and lesson 6.3 hydrates it with its authored props.
 *
 * "intentional" and "appetite" are pinned as fixtures by
 * src/components/widgets/bow-nb-scorer/math.test.ts (at the default seed and
 * trainSize the first is unseen in non-serious reports, the second in serious).
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
  await expect(figure.getByRole('textbox', { name: 'Report text' })).toBeVisible();
  return { figure, consoleErrors };
}

test('/dev/widgets renders the widget with its manifest', async ({ page }) => {
  const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');

  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`)).toContainText(
    'smoothing',
  );
  await expect(figure.locator('.widget-title')).toHaveText(
    'Bernoulli Naive Bayes, one word at a time',
  );
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(figure.locator('.bnb-math .katex').first()).toBeVisible();
  await expect(figure.locator('.bnb-bars li')).toHaveCount(12);
  await expect(figure.getByRole('checkbox', { name: 'Laplace smoothing (add one)' })).toBeChecked();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('typing a word changes the bag of words and the score', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const textbox = figure.getByRole('textbox', { name: 'Report text' });
  const scoreOut = figure.locator('[data-testid="bnb-score"]');
  const before = await scoreOut.textContent();
  expect(before).toMatch(/^[+−]\d+\.\d\d$/);

  await textbox.fill('Patient reports appetite loss and a zzqx rash.');
  await expect(figure.locator('.bnb-chips')).toContainText('appetite');
  await expect(figure.locator('.bnb-unknown')).toContainText('zzqx');
  await expect(scoreOut).not.toHaveText(before ?? '');
  await expect(scoreOut).toHaveText(/^[+−]\d+\.\d\d$/);
  await expect(figure.locator('[data-testid="bnb-posterior"]')).toHaveText(/^0\.\d{3}$|^1\.000$/);
});

test('smoothing off with a word unseen in one class shows the −∞ state', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const smoothing = figure.getByRole('checkbox', { name: 'Laplace smoothing (add one)' });
  const textbox = figure.getByRole('textbox', { name: 'Report text' });
  const failure = figure.locator('[data-testid="bnb-failure"]');

  await textbox.fill('intentional');
  await expect(failure).toHaveCount(0);
  await expect(figure.locator('[data-testid="bnb-score"]')).toHaveText(/^[+−]\d+\.\d\d$/);

  await smoothing.focus();
  await page.keyboard.press('Space');
  await expect(smoothing).not.toBeChecked();
  await expect(failure).toBeVisible();
  await expect(failure).toContainText('−∞');
  await expect(failure).toContainText('non-serious');
  await expect(figure.locator('[data-testid="bnb-score"]')).toHaveText('+∞');
  await expect(figure.locator('[data-testid="bnb-posterior"]')).toHaveText('1.000');
  await expect(figure.locator('[data-testid="bnb-decision"]')).toHaveText('serious');
  await expect(figure.locator('.bnb-bars li').first()).toContainText('intentional');
  await figure.screenshot({ path: `test-results/widget-${NAME}-failure.png` });

  // Back on: finite again.
  await page.keyboard.press('Space');
  await expect(smoothing).toBeChecked();
  await expect(failure).toHaveCount(0);
  await expect(figure.locator('[data-testid="bnb-score"]')).toHaveText(/^[+−]\d+\.\d\d$/);
});

test('the training-size slider is keyboard-operable and "Another report" is a button', async ({
  page,
}) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const slider = figure.getByRole('slider', { name: 'Training reports' });
  await expect(slider).toHaveValue('2000');
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveValue('1900');
  const box = await slider.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  const id = figure.locator('.bnb-report-id');
  const first = await id.textContent();
  await figure.getByRole('button', { name: 'Another report' }).click();
  await expect(id).not.toHaveText(first ?? '');

  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(slider).toHaveValue('2000');
  await expect(id).toHaveText(first ?? '');
});

for (const theme of THEMES) {
  test(`widget renders in ${theme} theme`, async ({ page }) => {
    const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    // Bar fills are read from the theme's computed tokens (useVizTheme) and
    // re-read on data-theme changes without a reload.
    // Compare computed colors on both sides so the browser's normalisation of
    // oklch() strings does not matter.
    const expected = await page.evaluate(() => {
      const probe = (token: string) => {
        const el = document.createElement('div');
        el.style.backgroundColor = `var(${token})`;
        document.body.append(el);
        const color = getComputedStyle(el).backgroundColor;
        el.remove();
        return color;
      };
      return {
        raw: getComputedStyle(document.documentElement).getPropertyValue('--viz-positive').trim(),
        pos: probe('--viz-positive'),
        neg: probe('--viz-negative'),
      };
    });
    expect(expected.raw).toMatch(/^oklch\(/);
    expect(expected.pos).not.toBe(expected.neg);
    const fills = await figure
      .locator('[data-layer="vote"]')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
    expect(fills.length).toBeGreaterThan(0);
    for (const fill of fills) expect([expected.pos, expected.neg]).toContain(fill);
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
  await expect(figure.getByRole('slider', { name: 'Training reports' })).toBeVisible();
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});

test('lesson 6.3 embeds the hydrated widget with its authored params', async ({ page }) => {
  const { figure, consoleErrors } = await hydrate(page, LESSON);
  await expect(figure).toHaveAttribute('data-widget-params', /"smoothing":false/);
  await expect(figure).toHaveAttribute('data-widget-params', /"dataset":"notes"/);
  await expect(
    figure.getByRole('checkbox', { name: 'Laplace smoothing (add one)' }),
  ).not.toBeChecked();
  await expect(figure.locator('.widget-challenge')).toContainText('smoothing off');
  await expect(figure.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});
