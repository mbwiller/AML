import { readFileSync } from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

/**
 * /practice (VISION §7 "Practice", §9.5, §9.11): the FSRS review queue, the
 * quiz builder, progress with export/import, and the home "Due today" card.
 * Every test starts with empty storage (a fresh browser context).
 */
const THEMES = ['light', 'dark'] as const;
const DAY = 86_400_000;

async function open(page: Page, hash = '') {
  await page.goto(`/practice${hash}`);
  await expect(page.locator('[data-practice][data-ready]')).toBeVisible();
}

const remaining = (page: Page) => page.locator('[data-review-remaining]');

async function rateWithKeys(page: Page, key: '1' | '2' | '3' | '4') {
  const id = await page.locator('[data-card-id]').getAttribute('data-card-id');
  await page.keyboard.press('Space');
  await expect(page.locator('[data-card-back]')).toBeVisible();
  await page.keyboard.press(key);
  // The rating is saved before the next card shows unrevealed.
  await expect(page.locator('[data-card-back]')).toBeHidden();
  return id;
}

async function setTheme(page: Page, theme: (typeof THEMES)[number]) {
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
}

test('loads the deck and reviews cards with the keyboard; the count drops and persists', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await open(page);
  await expect(remaining(page)).toHaveAttribute('data-review-remaining', '10');
  await expect(page.locator('[data-card-id]')).toHaveAttribute('data-card-id', /^card:/);

  // Easy graduates the card: it leaves today's queue.
  const first = await rateWithKeys(page, '4');
  await expect(remaining(page)).toHaveAttribute('data-review-remaining', '9');
  await expect(page.locator('[data-card-id]')).not.toHaveAttribute('data-card-id', first ?? '');
  await expect(page.locator('[data-review-status]')).toContainText('Rated Easy');

  // Again keeps the card in today's queue (it comes back after the others).
  await rateWithKeys(page, '1');
  await expect(remaining(page)).toHaveAttribute('data-review-remaining', '9');

  await page.reload();
  await expect(page.locator('[data-practice][data-ready]')).toBeVisible();
  await expect(remaining(page)).toHaveAttribute('data-review-remaining', '9');
  expect(errors).toEqual([]);
});

test('home "Due today" reflects the store', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-due-count]')).toHaveText('Start reviewing');

  await open(page);
  await rateWithKeys(page, '4');
  await expect(remaining(page)).toHaveAttribute('data-review-remaining', '9');

  await page.goto('/');
  await expect(page.locator('[data-due-count]')).toHaveText('0 reviews');
  await expect(page.locator('[data-due-note]')).toHaveText('Plus 9 new cards today.');
  await expect(page.locator('[data-due-count]')).toHaveAttribute('href', '/practice#review');

  // A month later the reviewed card is due and a new day's new cards are back.
  await page.clock.install({ time: Date.now() + 40 * DAY });
  await page.goto('/');
  await expect(page.locator('[data-due-count]')).toHaveText('1 review');
  await expect(page.locator('[data-due-note]')).toHaveText('Plus 10 new cards today.');
});

test('a quiz of three items grades each answer and totals the score', async ({ page }) => {
  await open(page, '#quiz');
  await expect(page.locator('#pr-tab-quiz')).toHaveAttribute('aria-selected', 'true');
  const count = page.getByLabel('Questions');
  await expect(count).toBeVisible();
  await count.fill('3');
  await page.getByRole('button', { name: 'Start quiz' }).click();

  for (let i = 1; i <= 3; i++) {
    const item = page.locator('[data-quiz-item]');
    await expect(item).toBeVisible();
    await expect(item).toContainText(`Question ${i} of 3`);
    const type = await item.getAttribute('data-quiz-type');
    if (type === 'numeric') await item.getByLabel('Your answer').fill('0');
    else await item.locator('.pr-option').first().click();
    await item.getByRole('button', { name: 'Check' }).click();
    await expect(item).toHaveAttribute('data-quiz-state', /^(correct|incorrect)$/);
    await expect(item.locator('.pr-verdict')).toHaveText(/Correct\.|Not quite\./);
    const next = item.getByRole('button', { name: i === 3 ? 'See results' : 'Next question' });
    await expect(next).toBeFocused();
    await next.click();
  }
  const results = page.locator('[data-quiz-results]');
  await expect(results.locator('h2')).toHaveText(/^[0-3] of 3 correct$/);
  await expect(results.locator('.pr-result')).toHaveCount(3);
});

test('export produces JSON that import accepts, restoring state after storage is cleared', async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => localStorage.setItem('aml-derivation:der-6-3-2', '4'));
  await rateWithKeys(page, '4');
  await rateWithKeys(page, '3');
  await expect(remaining(page)).toHaveAttribute('data-review-remaining', '9');

  await page.getByRole('tab', { name: 'Progress' }).click();
  const phases = page.locator('[data-progress-phases]');
  await expect(phases.locator('[data-phase="review"] dd')).toHaveText('1');
  await expect(phases.locator('[data-phase="learning"] dd')).toHaveText('1');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export progress' }).click();
  const file = await (await download).path();
  const json = JSON.parse(readFileSync(file, 'utf8')) as {
    format: string;
    version: number;
    practice: { cards: unknown[]; reviews: unknown[] };
    local: Record<string, string>;
  };
  expect(json.format).toBe('aml-atlas-progress');
  expect(json.version).toBe(1);
  expect(json.practice.cards).toHaveLength(2);
  expect(json.practice.reviews).toHaveLength(2);
  expect(json.local['aml-derivation:der-6-3-2']).toBe('4');

  // Clear everything from a page that does not hold the database open.
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('aml-atlas');
      req.onsuccess = req.onerror = req.onblocked = () => resolve(null);
    });
  });
  await open(page, '#progress');
  await expect(phases.locator('[data-phase="review"] dd')).toHaveText('0');

  await page.locator('[data-import-input]').setInputFiles(file);
  await expect(page.locator('[data-backup-status]')).toContainText('Imported 2 cards, 2 reviews');
  await expect(phases.locator('[data-phase="review"] dd')).toHaveText('1');
  await expect(phases.locator('[data-phase="learning"] dd')).toHaveText('1');
  expect(await page.evaluate(() => localStorage.getItem('aml-derivation:der-6-3-2'))).toBe('4');

  await page.getByRole('tab', { name: 'Review' }).click();
  await expect(remaining(page)).toHaveAttribute('data-review-remaining', '9');

  // A file that is not a progress export is rejected with a message.
  await page.getByRole('tab', { name: 'Progress' }).click();
  await page.locator('[data-import-input]').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"something-else"}'),
  });
  await expect(page.locator('[data-backup-status]')).toContainText(
    'not an AML Atlas progress file',
  );
});

test.describe('screenshots', () => {
  test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });

  for (const theme of THEMES) {
    test(`review and progress, ${theme}`, async ({ page }) => {
      await open(page);
      await setTheme(page, theme);
      await rateWithKeys(page, '4');
      await rateWithKeys(page, '3');
      await page.keyboard.press('Space');
      await expect(page.locator('[data-card-back]')).toBeVisible();
      await page.mouse.move(0, 0);
      await page.screenshot({ path: `test-results/practice-review-${theme}.png`, fullPage: true });

      await page.getByRole('tab', { name: 'Progress' }).click();
      await page.locator('.pr-unit summary').first().click();
      await page.screenshot({
        path: `test-results/practice-progress-${theme}.png`,
        fullPage: true,
      });
    });
  }
});

test('works at 360px without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await open(page);
  await page.keyboard.press('Space');
  await expect(page.locator('[data-card-back]')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'test-results/practice-review-phone.png', fullPage: true });
  await page.getByRole('tab', { name: 'Quiz' }).click();
  await expect(page.getByRole('button', { name: 'Start quiz' })).toBeVisible();
  await page.screenshot({ path: 'test-results/practice-quiz-phone.png', fullPage: true });
});
