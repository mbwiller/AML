import { expect, test, type Page } from '@playwright/test';

import { hasBaseline } from './baselines';

/**
 * /atlas: the concept graph island (VISION §7, §9.4). The graph is built from
 * 50 nodes.yaml nodes plus 44 glossary terms, so ≥ 90 nodes must render.
 */
const NODE = 'bernoulli-nb-mle';
const THEMES = ['light', 'dark'] as const;

async function setTheme(page: Page, theme: (typeof THEMES)[number]) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
}

const svg = (page: Page) => page.locator('svg.atlas-svg');
const node = (page: Page, id: string) => page.locator(`#atlas-node-${id}`);
const panel = (page: Page) => page.locator('[data-atlas-panel]');

test.use({ viewport: { width: 1440, height: 900 } });

test('renders the graph with every node and edge', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  await page.goto('/atlas');
  await expect(svg(page)).toBeVisible();
  const nodes = await page.locator('.atlas-node').count();
  const edges = await page.locator('.atlas-edge').count();
  expect(nodes, 'nodes').toBeGreaterThanOrEqual(90);
  expect(edges, 'edges').toBeGreaterThan(0);
  await expect(svg(page)).toHaveAttribute('data-highlight-mode', 'none');
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('clicking a node opens the panel with its label', async ({ page }) => {
  await page.goto('/atlas');
  await expect(svg(page)).toBeVisible();
  const target = node(page, NODE);
  const label = (await target.getAttribute('aria-label'))?.split(',')[0] ?? '';
  expect(label.length).toBeGreaterThan(0);
  await target.dispatchEvent('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 });
  await target.dispatchEvent('pointerup', { button: 0, clientX: 0, clientY: 0, pointerId: 1 });
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).locator('h2')).toHaveText(label);
  await expect(target).toHaveAttribute('aria-pressed', 'true');
  expect(page.url()).toContain(`node=${NODE}`);
});

test('?node=<id> opens the panel on load and "Show prerequisites" dims non-ancestors', async ({
  page,
}) => {
  await page.goto(`/atlas?node=${NODE}`);
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).locator('h2')).toContainText(/NB MLE/i);

  const toggle = panel(page).locator('[data-show-prerequisites]');
  await toggle.click();
  await expect(svg(page)).toHaveAttribute('data-highlight-mode', 'prerequisites');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  const total = await page.locator('.atlas-node').count();
  const dimmed = await page.locator('.atlas-node[data-dim]').count();
  const onPath = await page.locator('.atlas-node[data-path]').count();
  expect(onPath, 'ancestors + selected').toBeGreaterThan(1);
  expect(dimmed, 'dimmed').toBeGreaterThan(0);
  expect(dimmed + onPath).toBe(total);
  await expect(node(page, NODE)).toHaveAttribute('data-path', 'true');
  expect(await page.locator('.atlas-edge[data-path]').count()).toBeGreaterThan(0);

  await page.screenshot({ path: 'test-results/atlas-panel.png' });

  await toggle.click();
  await expect(svg(page)).toHaveAttribute('data-highlight-mode', 'none');
});

test('keyboard: Enter opens the panel, arrows walk prerequisites, Escape closes', async ({
  page,
}) => {
  await page.goto('/atlas');
  await expect(svg(page)).toBeVisible();
  const target = node(page, NODE);
  await target.focus();
  await expect(target).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();

  await page.keyboard.press('ArrowLeft');
  const focused = await page.evaluate(() => document.activeElement?.id ?? '');
  expect(focused.startsWith('atlas-node-')).toBe(true);
  expect(focused).not.toBe(`atlas-node-${NODE}`);

  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
});

test('search focuses a node and the unit filter hides nodes', async ({ page }) => {
  await page.goto('/atlas');
  const search = page.getByLabel('Find a concept by name');
  await search.fill('Bernoulli NB MLE');
  await search.press('Enter');
  await expect(panel(page)).toBeVisible();
  await expect(node(page, NODE)).toBeFocused();

  const before = await page.locator('.atlas-node').count();
  await page.getByRole('button', { name: 'U6', exact: true }).click();
  const after = await page.locator('.atlas-node').count();
  expect(after).toBeLessThan(before);
});

for (const theme of THEMES) {
  test(`atlas renders in ${theme} theme`, async ({ page }) => {
    await page.goto('/atlas');
    await setTheme(page, theme);
    await expect(svg(page)).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-results/atlas-${theme}.png` });
    if (process.env.CI && hasBaseline(`atlas-${theme}.png`)) {
      await expect(page).toHaveScreenshot(`atlas-${theme}.png`);
    }
  });
}
