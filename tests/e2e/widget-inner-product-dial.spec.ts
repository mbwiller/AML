import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'inner-product-dial';

/**
 * `inner-product-dial` (STYLE_GUIDE.md §7) against the static build:
 * hydrates on /dev/widgets; the angle slider, the dial handle (keyboard and
 * pointer drag), and the gradient sliders change the readouts; gᵀu and
 * ‖g‖cos φ always agree; both themes screenshot cleanly; it fits 360 px.
 * Lesson 2.3's embedding is checked in widgets-u2-lessons.spec.ts.
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
  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`)).toContainText('gradient');
  await expect(figure.locator('.widget-title')).toHaveText('The slope in every direction');
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(figure.locator('[data-testid="ipd-g"]')).toHaveText('(3.0, 4.0)');
  await expect(figure.locator('[data-testid="ipd-u"]')).toHaveText('(−0.50, 0.87)');
  await expect(figure.locator('[data-testid="ipd-rate"]')).toHaveText('1.96');
  await expect(figure.locator('[data-testid="ipd-cos"]')).toHaveText('1.96');
  await expect(figure.locator('[data-testid="ipd-steepest"]')).toHaveText('(−0.60, −0.80)');
  await expect(figure.locator('[data-testid="ipd"]')).toHaveAttribute('data-kind', 'ascent');
  await expect(figure.locator('[data-layer="descent-band"]')).toHaveCount(1);
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('turning u changes the rate, and gᵀu always equals ‖g‖ cos φ', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const slider = figure.getByRole('slider', { name: 'Direction of u', exact: true });
  const rate = figure.locator('[data-testid="ipd-rate"]');
  const cos = figure.locator('[data-testid="ipd-cos"]');
  const root = figure.locator('[data-testid="ipd"]');

  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('121');
  await expect(rate).toHaveText('1.88');
  await expect(cos).toHaveText('1.88');

  // Opposite the gradient (53.13° + 180°): rate −‖g‖, a descent direction.
  await slider.fill('233');
  await expect(rate).toHaveText('−5.00');
  await expect(cos).toHaveText('−5.00');
  await expect(root).toHaveAttribute('data-kind', 'descent');
  await expect(figure.locator('[data-testid="ipd-phi"]')).toHaveText('179.9°');

  // Nearly perpendicular: the rate is about zero.
  await slider.fill('143');
  await expect(rate).toHaveText('0.01');
  await expect(cos).toHaveText('0.01');

  const box = await slider.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await figure.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(slider).toHaveValue('120');
  await expect(rate).toHaveText('1.96');
});

test('the dial handle is keyboard-operable and draggable', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  const dial = figure.getByRole('slider', { name: 'Direction of u on the dial' });
  const slider = figure.getByRole('slider', { name: 'Direction of u', exact: true });

  await dial.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(dial).toHaveAttribute('aria-valuenow', '119');
  await expect(slider).toHaveValue('119');
  await page.keyboard.press('PageUp');
  await expect(slider).toHaveValue('134');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveValue('359');

  // Drag the handle to the top of the ring: u points along +θ₂, ϑ = 90°.
  const ring = await figure.locator('[data-layer="dial"] > circle').first().boundingBox();
  const handle = await dial.boundingBox();
  if (!ring || !handle) throw new Error('dial not rendered');
  const cx = ring.x + ring.width / 2;
  const cy = ring.y + ring.height / 2;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(cx + 20, cy - ring.height / 2, { steps: 4 });
  await page.mouse.move(cx, cy - ring.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(slider).toHaveValue('90');
  await expect(figure.locator('[data-testid="ipd-rate"]')).toHaveText('4.00');
});

test('the gradient sliders move g, and g = 0 is a critical point', async ({ page }) => {
  const { figure } = await hydrate(page, '/dev/widgets');
  await figure.getByRole('slider', { name: 'Gradient, first component' }).fill('0');
  await figure.getByRole('slider', { name: 'Gradient, second component' }).fill('0');
  await expect(figure.locator('[data-testid="ipd-g"]')).toHaveText('(0.0, 0.0)');
  await expect(figure.locator('[data-testid="ipd-rate"]')).toHaveText('0.00');
  await expect(figure.locator('[data-testid="ipd-phi"]')).toHaveText('undefined');
  await expect(figure.locator('[data-testid="ipd"]')).toHaveAttribute('data-kind', 'critical');
  await expect(figure.locator('[data-testid="ipd-steepest"]')).toHaveCount(0);
  await expect(figure.locator('[data-layer="descent-band"]')).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`widget renders in ${theme} theme`, async ({ page }) => {
    const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const expected = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--viz-4').trim(),
    );
    expect(expected).toMatch(/^oklch\(/);
    await expect(figure.locator('[data-layer="curve"]')).toHaveAttribute('stroke', expected);
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
  await expect(figure.getByRole('slider', { name: 'Direction of u', exact: true })).toBeVisible();
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});
