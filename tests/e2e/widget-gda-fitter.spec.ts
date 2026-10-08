import { expect, test, type Locator, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'gda-fitter';
const LESSON_72 = '/units/u7-gaussian-discriminant-analysis/gaussian-discriminant-analysis/';
const LESSON_73 =
  '/units/u7-gaussian-discriminant-analysis/shared-covariance-and-logistic-regression/';

/**
 * `gda-fitter` against the static build (STYLE_GUIDE.md §7): hydrates on
 * /dev/widgets, the shared-covariance toggle turns the boundary into a line,
 * the logistic overlay appears on demand, points are keyboard-editable, both
 * themes screenshot cleanly, and lessons 7.2 and 7.3 embed it with their
 * authored props.
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
  await expect(figure.locator('.MafsView svg').first()).toBeVisible();
  return { figure, root: figure.locator('.gdf'), consoleErrors };
}

const toggle = (figure: Locator, name: string) => figure.getByRole('checkbox', { name });

test('/dev/widgets renders the widget with its manifest and a quadratic boundary', async ({
  page,
}) => {
  const { figure, root, consoleErrors } = await hydrate(page, '/dev/widgets');

  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`)).toContainText(
    'sharedCovariance',
  );
  await expect(figure.locator('.widget-title')).toHaveText(
    'Gaussian discriminant analysis, fitted',
  );
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(root).toHaveAttribute('data-boundary', 'quadratic');
  await expect(root).toHaveAttribute('data-logistic', 'off');
  await expect(figure.locator('[data-layer="boundary"] polyline').first()).toBeVisible();
  await expect(figure.locator('[data-layer="ellipse-0"] ellipse')).toHaveCount(2);
  await expect(figure.locator('[data-layer="ellipse-1"] ellipse')).toHaveCount(2);
  await expect(figure.locator('[data-testid="gdf-readout"] .katex').first()).toBeVisible();
  await expect(figure.locator('[data-testid="gdf-accuracy"]')).toContainText('GDA');
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('shared covariance makes the boundary a line; the logistic overlay appears on demand', async ({
  page,
}) => {
  const { figure, root } = await hydrate(page, '/dev/widgets');

  const shared = toggle(figure, 'Shared covariance');
  await shared.focus();
  await page.keyboard.press('Space');
  await expect(shared).toBeChecked();
  await expect(root).toHaveAttribute('data-boundary', 'linear');
  // One straight segment: a polyline with exactly two points.
  const line = figure.locator('[data-layer="boundary"] polyline');
  await expect(line).toHaveCount(1);
  const pointCount = await line.evaluate((el) => (el as SVGPolylineElement).points.numberOfItems);
  expect(pointCount).toBe(2);
  await expect(figure.locator('[data-testid="gdf-readout"]')).toContainText('θ');

  await expect(figure.locator('[data-layer="logistic"]')).toHaveCount(0);
  await toggle(figure, 'Logistic regression').check();
  await expect(root).toHaveAttribute('data-logistic', 'on');
  await expect(figure.locator('[data-layer="logistic"] polyline')).toHaveCount(1);
  await expect(figure.locator('[data-testid="gdf-accuracy"]')).toContainText('logistic regression');

  // Back to per-class covariances: the boundary is a contour again.
  await shared.uncheck();
  await expect(root).toHaveAttribute('data-boundary', 'quadratic');
});

test('sliders are keyboard-operable and reset restores the authored values', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const slider = figure.getByRole('slider', { name: 'Separation of the means' });
  await expect(slider).toHaveValue('2');
  const box = await slider.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('2.2');
  await expect(slider).toHaveAttribute('aria-valuetext', '2.2');

  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(slider).toHaveValue('2');
});

test('edit mode: a point is focusable, movable with the keyboard, and removable', async ({
  page,
}) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  await toggle(figure, 'Edit points').check();
  const points = figure.getByRole('button', { name: /^Class [01] point/ });
  const before = await points.count();
  expect(before).toBeGreaterThan(50);

  const first = points.first();
  const nameBefore = (await first.getAttribute('aria-label')) ?? '';
  const id = /point (\d+) /.exec(nameBefore)?.[1] ?? '';
  expect(id).not.toBe('');
  const thisPoint = figure.getByRole('button', { name: new RegExp(`^Class [01] point ${id} `) });
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(thisPoint).not.toHaveAttribute('aria-label', nameBefore);
  await expect(figure.getByRole('button', { name: 'Undo point edits' })).toBeEnabled();

  // Delete removes this point (another of its class may become draggable in its place,
  // so the count of draggable points is not the thing to check).
  await page.keyboard.press('Delete');
  await expect(thisPoint).toHaveCount(0);
  await expect(points.count()).resolves.toBeLessThanOrEqual(before);

  await figure.getByRole('button', { name: 'Undo point edits' }).click();
  await expect(thisPoint).toHaveCount(1);
  await expect(thisPoint).toHaveAttribute('aria-label', nameBefore);
});

test('removing a class down to two points removes the boundary and explains why', async ({
  page,
}) => {
  const { figure, root } = await hydrate(page, '/dev/widgets');
  // Fewest points, all of class 1: n ≈ 50 × 0.05 ≈ 2–4 events.
  const prior = figure.getByRole('slider', { name: 'Prior of class 1' });
  await prior.focus();
  await page.keyboard.press('Home');
  await expect(prior).toHaveValue('0.05');
  const n = figure.getByRole('slider', { name: 'Points' });
  await n.focus();
  await page.keyboard.press('Home');
  await expect(n).toHaveValue('50');

  await toggle(figure, 'Edit points').check();
  const events = figure.getByRole('button', { name: /^Class 1 point/ });
  while ((await events.count()) > 2) {
    await events.first().focus();
    await page.keyboard.press('Delete');
  }
  await expect(root).toHaveAttribute('data-boundary', 'none');
  await expect(figure.locator('[data-testid="gdf-degenerate"]')).toContainText(
    'MLE does not exist',
  );
  await expect(figure.locator('[data-layer="boundary"] polyline')).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`widget renders in ${theme} theme`, async ({ page }) => {
    const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const expected = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--viz-negative').trim(),
    );
    await expect(figure.locator('[data-layer="scatter-0"]')).toHaveAttribute('fill', expected);
    expect(expected).toMatch(/^oklch\(/);
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
  await expect(figure.getByRole('slider', { name: 'Points' })).toBeVisible();
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});

for (const [label, path] of [
  ['/dev/widgets', '/dev/widgets'],
  ['lesson 7.2', LESSON_72],
  ['lesson 7.3', LESSON_73],
] as const) {
  test(`the reserved height covers the hydrated body on ${label}`, async ({ page }) => {
    const { figure } = await hydrate(page, path);
    const reserved = await figure.evaluate((el) =>
      parseFloat(getComputedStyle(el).getPropertyValue('--widget-height')),
    );
    const live = await figure
      .locator('.widget-live')
      .evaluate((el) => el.getBoundingClientRect().height);
    // No layout shift after mount: the body fits in the manifest's height (plus a small tolerance).
    expect(live).toBeLessThanOrEqual(reserved + 8);
  });
}

test('lesson 7.2 embeds the ADVERSE cohort with per-class covariances', async ({ page }) => {
  const { figure, root, consoleErrors } = await hydrate(page, LESSON_72);
  await expect(figure).toHaveAttribute('data-widget-params', /"dataset":"adverse"/);
  await expect(figure).toHaveAttribute('data-widget-params', /"features":\["age","egfr"\]/);
  await expect(figure.getByRole('radio', { name: 'ADVERSE cohort' })).toBeChecked();
  await expect(toggle(figure, 'Shared covariance')).not.toBeChecked();
  await expect(root).toHaveAttribute('data-boundary', 'quadratic');
  await expect(figure.locator('.gdf-axes')).toContainText('eGFR');
  await expect(figure.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('lesson 7.3 embeds the shared-covariance fit with the logistic overlay', async ({ page }) => {
  const { figure, root, consoleErrors } = await hydrate(page, LESSON_73);
  await expect(figure).toHaveAttribute('data-widget-params', /"sharedCovariance":true/);
  await expect(toggle(figure, 'Shared covariance')).toBeChecked();
  await expect(toggle(figure, 'Logistic regression')).toBeChecked();
  await expect(root).toHaveAttribute('data-boundary', 'linear');
  await expect(root).toHaveAttribute('data-logistic', 'on');
  await expect(figure.locator('[data-layer="logistic"] polyline')).toHaveCount(1);
  await expect(figure.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});
