import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;

/**
 * `<Check>` on the kitchen sink (src/pages/dev/_kitchen-sink.mdx) renders
 * real bank items: q-u6-l1-001 (mc, "True" is correct), q-u6-l3-011
 * (numeric, seeded: K * d + K - 1, bank answer 602), q-u6-l1-013
 * (which-step on der-6-1-1, step 3), q-u6-l1-016 (order: unsupported), and
 * q-u9-l9-999 (not in the bank). Graded in the browser by the vanilla
 * controller; no React.
 */

const MC = '[data-check-item="q-u6-l1-001"]';
const NUMERIC = '[data-check-item="q-u6-l3-011"]';
const WHICH_STEP = '[data-check-item="q-u6-l1-013"]';

async function open(page: Page, theme: (typeof THEMES)[number]) {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto('/dev/kitchen-sink');
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await expect(page.locator('[data-check]').first()).toBeVisible();
  return consoleErrors;
}

for (const theme of THEMES) {
  test(`multiple choice grades instantly in ${theme} theme`, async ({ page }) => {
    const errors = await open(page, theme);
    const mc = page.locator(MC);
    await expect(mc).toHaveAttribute('data-check-state', 'idle');
    await expect(mc.locator('[data-check-feedback]')).toBeHidden();

    await mc.getByRole('radio', { name: 'True' }).check();
    await mc.getByRole('button', { name: 'Check answer to question 1' }).click();
    await expect(mc).toHaveAttribute('data-check-state', 'correct');
    await expect(mc.getByRole('status')).toContainText('Correct.');
    await expect(mc.locator('[data-check-explanation]')).toBeVisible();
    await mc.screenshot({ path: `test-results/check-mc-correct-${theme}.png` });

    await mc.getByRole('button', { name: 'Try question 1 again' }).click();
    await expect(mc).toHaveAttribute('data-check-state', 'idle');
    await expect(mc.getByRole('status')).toBeHidden();

    await mc.getByRole('radio', { name: 'False' }).check();
    await mc.getByRole('button', { name: 'Check answer to question 1' }).click();
    await expect(mc).toHaveAttribute('data-check-state', 'incorrect');
    await expect(mc.getByRole('status')).toContainText('Not quite.');
    await expect(mc.locator('[data-check-explanation]')).toBeVisible();
    await expect(mc.locator('[data-check-explanation]')).toContainText('probabilistic model');
    await mc.screenshot({ path: `test-results/check-mc-incorrect-${theme}.png` });

    expect(errors, 'console errors').toEqual([]);
  });

  test(`numeric grades, resamples, and accepts Enter in ${theme} theme`, async ({ page }) => {
    const errors = await open(page, theme);
    const numeric = page.locator(NUMERIC);
    const input = numeric.getByLabel('Your answer');

    // Bank instance: K = 3, d = 200 → 3 * 200 + 3 - 1 = 602.
    await input.fill('602');
    await input.press('Enter');
    await expect(numeric).toHaveAttribute('data-check-state', 'correct');
    await expect(numeric.getByRole('status')).toContainText('Correct.');
    await numeric.screenshot({ path: `test-results/check-numeric-correct-${theme}.png` });

    await input.fill('601');
    await numeric.getByRole('button', { name: 'Check answer to question 3' }).click();
    await expect(numeric).toHaveAttribute('data-check-state', 'incorrect');
    await expect(numeric.getByRole('status')).toContainText('Not quite.');
    await expect(numeric.locator('[data-check-explanation]')).toBeVisible();
    await numeric.screenshot({ path: `test-results/check-numeric-incorrect-${theme}.png` });

    await input.fill('six hundred');
    await input.press('Enter');
    await expect(numeric).toHaveAttribute('data-check-state', 'invalid');
    await expect(numeric.getByRole('status')).toContainText('Could not read');
    await expect(input).toHaveAttribute('aria-invalid', 'true');

    // New numbers: the controller publishes the sampled params; the key is K * d + K - 1.
    await numeric.getByRole('button', { name: 'New numbers for question 3' }).click();
    await expect(numeric).toHaveAttribute('data-check-state', 'idle');
    await expect(numeric.locator('[data-check-params]')).toBeVisible();
    const params = JSON.parse((await numeric.getAttribute('data-check-params')) ?? '{}') as Record<
      string,
      number
    >;
    const K = params['K'];
    const d = params['d'];
    expect(K).toBeDefined();
    expect(d).toBeDefined();
    const expected = (K ?? 0) * (d ?? 0) + (K ?? 0) - 1;
    await expect(numeric.locator('[data-check-params-list]')).toContainText(`K = ${K}`);

    await input.fill(String(expected));
    await input.press('Enter');
    await expect(numeric).toHaveAttribute('data-check-state', 'correct');
    await input.fill(String(expected + 1));
    await input.press('Enter');
    await expect(numeric).toHaveAttribute('data-check-state', 'incorrect');

    expect(errors, 'console errors').toEqual([]);
  });
}

test('which-step renders the derivation steps and links to the step', async ({ page }) => {
  await open(page, 'light');
  const item = page.locator(WHICH_STEP);
  const steps = item.getByRole('radio');
  await expect(steps).toHaveCount(7);
  await expect(item.locator('.katex-error')).toHaveCount(0);

  await steps.nth(0).check();
  await item.getByRole('button', { name: 'Check answer to question 4' }).click();
  await expect(item).toHaveAttribute('data-check-state', 'incorrect');
  await expect(item.getByRole('status')).toContainText('Not quite.');
  // der-6-1-1 is on the kitchen sink, so the derivation link resolves.
  const link = item.locator('[data-check-derivation-link]');
  await expect(link).toBeVisible();
  expect(await link.getAttribute('href')).toMatch(/^#der-6-1-1/);

  await steps.nth(2).check();
  await item.getByRole('button', { name: 'Check answer to question 4' }).click();
  await expect(item).toHaveAttribute('data-check-state', 'correct');
});

test('unsupported and unknown items render as muted rows', async ({ page }) => {
  await open(page, 'light');
  const order = page.locator('[data-check-item="q-u6-l1-016"]');
  await expect(order).toHaveAttribute('data-check-supported', 'false');
  await expect(order).toContainText('practice engine');
  await expect(order.getByRole('button')).toHaveCount(0);

  const missing = page.locator('[data-check-item="q-u9-l9-999"]');
  await expect(missing).toHaveAttribute('data-check-supported', 'false');
  await expect(missing).toContainText('not in the quiz bank yet');
});

test('a wrong mc answer links to the matching pitfall', async ({ page }) => {
  await open(page, 'light');
  // The kitchen sink has <Pitfall misconception="ignore-prior">; inject an item that tags it.
  await page.evaluate(() => {
    const li = document.querySelector<HTMLElement>('[data-check-item="q-u6-l1-001"]');
    if (!li) throw new Error('mc item missing');
    li.dataset['item'] = JSON.stringify({
      type: 'mc',
      options: [{ correct: true }, { misconception: 'ignore-prior' }],
    });
  });
  const mc = page.locator(MC);
  await mc.getByRole('radio', { name: 'False' }).check();
  await mc.getByRole('button', { name: 'Check answer to question 1' }).click();
  const link = mc.getByRole('link', { name: 'See the pitfall' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '#pitfall-ignore-prior');
  await expect(page.locator('#pitfall-ignore-prior')).toHaveAttribute(
    'data-misconception',
    'ignore-prior',
  );
});
