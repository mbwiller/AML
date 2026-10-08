import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'mse-bowl-gd';
const LESSON_24 = '/units/u2-risk-and-gradient-descent/gradient-descent/';

/**
 * `mse-bowl-gd` against the static build (STYLE_GUIDE.md §7): hydrates on
 * /dev/widgets with the Lecture 4 companion's settings and reproduces its run
 * (10,1xx iterations ending at θ ≈ (3.7142, 0.4577)); playback controls move
 * the iterate; standardization rounds the bowl and cuts the iteration count;
 * both themes screenshot cleanly; it fits 360 px; and lesson 2.4 embeds it
 * with exactly its authored props.
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
  const root = figure.locator('.mbg');
  await expect(root.locator('svg.mbg-svg').first()).toBeVisible();
  return { figure, root, consoleErrors };
}

async function iterations(root: ReturnType<Page['locator']>) {
  return Number(await root.getAttribute('data-iterations'));
}

test('/dev/widgets renders the widget and reproduces the companion’s run', async ({ page }) => {
  const { figure, root, consoleErrors } = await hydrate(page, '/dev/widgets');
  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`).first()).toContainText(
    'stopping',
  );
  await expect(figure.locator('.widget-title')).toHaveText(
    'Gradient descent on the least-squares bowl',
  );
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(root).toHaveAttribute('data-status', 'converged');
  const n = await iterations(root);
  expect(n).toBeGreaterThanOrEqual(10_100);
  expect(n).toBeLessThan(10_200);
  await expect(root).toHaveAttribute('data-t', String(n));
  // Lecture 4 companion cell 21 prints [3.71421938 0.45772775].
  await expect(root.getByTestId('mbg-current')).toContainText('3.7142');
  await expect(root.getByTestId('mbg-current')).toContainText('0.4577');
  await expect(root.getByTestId('mbg-star')).toContainText('3.7379');
  await expect(root.getByTestId('mbg-status')).toContainText('Stopped after 10,1');
  await expect(root.locator('[data-layer="contours"] path').first()).toBeAttached();
  await expect(root.locator('.mbg-math .katex').first()).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('playback: restart, step, scrub with the keyboard, and run to stop', async ({ page }) => {
  const { figure, root } = await hydrate(page, '/dev/widgets');
  const n = await iterations(root);
  await figure.getByRole('button', { name: 'Restart path' }).click();
  await expect(root).toHaveAttribute('data-t', '0');
  await expect(root.getByTestId('mbg-current')).toContainText('2.0000');

  await figure.getByRole('button', { name: 'Step' }).click();
  await expect(root).toHaveAttribute('data-t', '1');
  await expect(root.getByTestId('mbg-current')).not.toContainText('2.0000');

  const scrub = figure.getByRole('slider', { name: 'Iteration' });
  await scrub.focus();
  await page.keyboard.press('ArrowRight');
  await expect(root).toHaveAttribute('data-t', '2');
  const box = await scrub.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await figure.getByRole('button', { name: 'Run to stop' }).click();
  await expect(root).toHaveAttribute('data-t', String(n));

  // Play animates from the start to the end of the run.
  await figure.getByRole('button', { name: 'Play' }).click();
  await expect(root).toHaveAttribute('data-playing', 'true');
  await expect(root).toHaveAttribute('data-playing', 'false', { timeout: 10_000 });
  await expect(root).toHaveAttribute('data-t', String(n));
});

test('standardizing rounds the bowl and cuts the iteration count', async ({ page }) => {
  const { figure, root } = await hydrate(page, '/dev/widgets');
  const before = await iterations(root);
  await expect(root.getByTestId('mbg-compare')).toContainText('standardized feature');

  const toggle = figure.getByRole('checkbox', { name: 'Standardize bmi' });
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toBeChecked();
  await expect(root).toHaveAttribute('data-standardize', 'true');
  const after = await iterations(root);
  expect(after * 100).toBeLessThan(before);
  await expect(root.getByTestId('mbg-status')).toContainText(`Stopped after ${after} iterations`);
  await expect(root.getByTestId('mbg-raw-units')).toContainText('3.7379');
  await expect(root.locator('.mbg-math')).toContainText('1.00');
  await figure.screenshot({ path: `test-results/widget-${NAME}-standardized.png` });
});

test('the learning-rate slider changes the run; too large an η diverges', async ({ page }) => {
  const { figure, root } = await hydrate(page, '/dev/widgets');
  const eta = figure.getByRole('slider', { name: 'Learning rate' });
  await expect(eta).toHaveValue('0.1');
  const before = await iterations(root);
  await eta.focus();
  await page.keyboard.press('ArrowRight');
  await expect(eta).toHaveValue('0.11');
  await expect(root).not.toHaveAttribute('data-iterations', String(before));

  await page.keyboard.press('End');
  await expect(eta).toHaveValue('1.2');
  await expect(root).toHaveAttribute('data-status', 'diverged');
  await expect(root.getByTestId('mbg-status')).toContainText('Diverged');

  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(eta).toHaveValue('0.1');
  await expect(root).toHaveAttribute('data-iterations', String(before));
});

for (const theme of THEMES) {
  test(`widget renders in ${theme} theme`, async ({ page }) => {
    const { figure, root, consoleErrors } = await hydrate(page, '/dev/widgets');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const expected = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--viz-4').trim(),
    );
    expect(expected).toMatch(/^oklch\(/);
    await expect(root.locator('[data-layer="path"]')).toHaveAttribute('stroke', expected);
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
  await expect(figure.getByRole('slider', { name: 'Learning rate' })).toBeVisible();
  const play = await figure.getByRole('button', { name: 'Play' }).boundingBox();
  expect(play?.height ?? 0).toBeGreaterThanOrEqual(44);
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});

test('reduced motion: Play jumps straight to the end', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const { figure, root } = await hydrate(page, '/dev/widgets');
  const n = await iterations(root);
  await figure.getByRole('button', { name: 'Restart path' }).click();
  await expect(root).toHaveAttribute('data-t', '0');
  await figure.getByRole('button', { name: 'Play' }).click();
  await expect(root).toHaveAttribute('data-t', String(n));
  await expect(root).toHaveAttribute('data-playing', 'false');
  await context.close();
});

for (const [label, path] of [
  ['/dev/widgets', '/dev/widgets'],
  ['lesson 2.4', LESSON_24],
] as const) {
  test(`the reserved height covers the hydrated body on ${label}`, async ({ page }) => {
    const { figure } = await hydrate(page, path);
    const reserved = await figure.evaluate((el) =>
      parseFloat(getComputedStyle(el).getPropertyValue('--widget-height')),
    );
    const live = await figure
      .locator('.widget-live')
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(live).toBeLessThanOrEqual(reserved + 8);
  });
}

test('lesson 2.4 hydrates the widget with its authored props', async ({ page }) => {
  const { figure, root, consoleErrors } = await hydrate(page, LESSON_24);
  const authored = JSON.parse((await figure.getAttribute('data-widget-params')) ?? '{}') as Record<
    string,
    unknown
  >;
  expect(authored).toMatchObject({
    dataset: 'diabetes-bmi-20',
    eta: 0.1,
    init: [2, 1],
    standardize: false,
    stopping: 'parameter-change',
    tolerance: 0.00001,
    showResiduals: true,
  });
  await expect(figure.locator('.widget-challenge')).toContainText('Which coordinate is still off');
  await expect(figure.getByRole('slider', { name: 'Learning rate' })).toHaveValue('0.1');
  await expect(figure.getByRole('checkbox', { name: 'Standardize bmi' })).not.toBeChecked();
  await expect(figure.getByRole('radio', { name: 'Parameter change' })).toBeChecked();
  await expect(figure.getByRole('checkbox', { name: 'Data and residuals' })).toBeChecked();
  await expect(root.locator('[data-layer="fit-residuals"] line')).toHaveCount(20);
  await expect(root).toHaveAttribute('data-status', 'converged');
  await expect(root.getByTestId('mbg-current')).toContainText('3.7142');
  await expect(figure.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});
