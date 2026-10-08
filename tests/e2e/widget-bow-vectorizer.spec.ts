import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const NAME = 'bow-vectorizer';
const LESSON = '/units/u6-generative-models-and-naive-bayes/text-as-features/';

/**
 * `bow-vectorizer` (STYLE_GUIDE.md §7) against the static build: hydrates on
 * /dev/widgets, an unseen word gets no column, binary off turns a repeated
 * word's entry into its count, stop-word removal and stemming shrink |V|
 * (and flag removed negations), both themes screenshot cleanly, it fits
 * 360 px, and the reserved height covers the body.
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
  const textbox = figure.getByRole('textbox', { name: 'Report to vectorize (transform)' });
  await expect(textbox).toBeVisible();
  return { figure, textbox, consoleErrors };
}

const count = async (text: Promise<string | null>) => Number((await text)?.replace(/,/g, ''));

test('/dev/widgets renders the widget with its manifest', async ({ page }) => {
  const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
  await expect(page.locator(`section[data-widget-demo="${NAME}"] table`).first()).toContainText(
    'removeStopWords',
  );
  await expect(figure.locator('.widget-title')).toHaveText(
    'Bag of words: fit a vocabulary, transform a report',
  );
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  await expect(figure.getByRole('checkbox', { name: 'Binary (0/1)' })).toBeChecked();
  expect(await figure.locator('[data-testid="bowv-entries"] tbody tr').count()).toBeGreaterThan(5);
  await expect(figure.locator('.bowv-math .katex').first()).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('an unseen word has no column; binary off counts a repeated word', async ({ page }) => {
  const { figure, textbox } = await hydrate(page, '/dev/widgets');
  const word = (await figure.locator('.bowv-vocab-list li').first().textContent()) ?? '';
  expect(word.length).toBeGreaterThan(1);

  await textbox.fill(`${word} zzqx`);
  await expect(figure.locator('[data-testid="bowv-dropped"]')).toContainText('zzqx');
  await expect(figure.locator('[data-testid="bowv-entries"] tbody tr')).toHaveCount(1);

  await textbox.fill(`${word} ${word} ${word}`);
  const entry = figure.locator(`[data-testid="bowv-entries"] tbody tr[data-word="${word}"] td`);
  await expect(entry.last()).toHaveText('1');
  await expect(figure.locator('[data-testid="bowv-summary"]')).toContainText('sum of entries 1');

  const binary = figure.getByRole('checkbox', { name: 'Binary (0/1)' });
  await binary.focus();
  await page.keyboard.press('Space');
  await expect(binary).not.toBeChecked();
  await expect(entry.last()).toHaveText('3');
  await expect(figure.locator('[data-testid="bowv-summary"]')).toContainText('sum of entries 3');
  await expect(figure.locator('[data-testid="bowv-dropped"]')).toHaveCount(0);
});

test('stop-word removal and stemming shrink |V|; removed negations are flagged', async ({
  page,
}) => {
  const { figure, textbox } = await hydrate(page, '/dev/widgets');
  const vocab = figure.locator('[data-testid="bowv-vocab"]');
  const raw = figure.locator('[data-testid="bowv-vocab-raw"]');
  const before = await count(vocab.textContent());
  expect(before).toBe(await count(raw.textContent()));

  await figure.getByRole('checkbox', { name: 'Remove stop words' }).check();
  await expect.poll(() => count(vocab.textContent())).toBeLessThan(before);
  const afterStop = await count(vocab.textContent());
  await figure.getByRole('checkbox', { name: 'Stem (suffix stripping)' }).check();
  await expect.poll(() => count(vocab.textContent())).toBeLessThan(afterStop);
  expect(await count(raw.textContent())).toBe(before);

  await textbox.fill('Patient reports no prior chemotherapy.');
  await expect(figure.locator('[data-testid="bowv-negations"]')).toContainText('“no”');
  await expect(figure.locator('.bowv-tokens .bowv-token-stemmed')).toContainText('report');

  // The training-size slider is keyboard-operable and refits the vocabulary.
  const slider = figure.getByRole('slider', { name: 'Training reports' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('25');
  await expect(figure.locator('[data-testid="bowv-stats"]')).toContainText('25 NOTES reports');
});

for (const theme of THEMES) {
  test(`widget renders in ${theme} theme`, async ({ page }) => {
    const { figure, consoleErrors } = await hydrate(page, '/dev/widgets');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const expected = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--viz-2').trim(),
    );
    expect(expected).toMatch(/^oklch\(/);
    await expect(figure.locator('[data-layer="strip"] g')).toHaveAttribute('stroke', expected);
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
  const slider = figure.getByRole('slider', { name: 'Training reports' });
  await expect(slider).toBeVisible();
  expect((await slider.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  await figure.screenshot({ path: `test-results/widget-${NAME}-phone.png` });
});

for (const [label, path] of [
  ['/dev/widgets', '/dev/widgets'],
  ['lesson 6.2', LESSON],
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
