import { expect, test, type Page } from '@playwright/test';

/**
 * Lessons 1.1, 6.1, and 6.2 embed `encoding-explorer`,
 * `generative-vs-discriminative-toggle`, and `bow-vectorizer` with authored
 * props: each hydrates on its lesson page, carries exactly those props, shows
 * the lesson's challenge line, and starts in the state the props describe.
 */

async function hydrate(page: Page, path: string, name: string) {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(path);
  const figure = page.locator(`figure[data-widget="${name}"]`).first();
  await figure.scrollIntoViewIfNeeded();
  await expect(figure).toHaveAttribute('data-hydrated', '', { timeout: 15_000 });
  await expect(figure.locator('.widget-fallback')).toBeHidden();
  return { figure, consoleErrors };
}

test('lesson 1.1 hydrates encoding-explorer with the five zip codes and four encodings', async ({
  page,
}) => {
  const { figure, consoleErrors } = await hydrate(
    page,
    '/units/u1-linear-regression/components-of-a-learning-problem/',
    'encoding-explorer',
  );
  await expect(figure).toHaveAttribute(
    'data-widget-params',
    /"categories":\["10040","10041","10042","10043","10044"\]/,
  );
  await expect(figure).toHaveAttribute(
    'data-widget-params',
    /"encodings":\["integer","standardized","one-hot","one-hot-drop-first"\]/,
  );
  await expect(figure.locator('.widget-challenge')).toContainText(
    'Make 10042 the highest-risk zip code',
  );
  await expect(figure.getByRole('group', { name: 'Encoding' }).getByRole('radio')).toHaveCount(4);
  await expect(figure.locator('.encx')).toHaveAttribute('data-encoding', 'integer');
  await expect(figure.getByRole('slider', { name: 'Target for 10042' })).toBeVisible();
  await expect(figure.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('lesson 6.1 hydrates generative-vs-discriminative-toggle on ADVERSE age and eGFR', async ({
  page,
}) => {
  const { figure, consoleErrors } = await hydrate(
    page,
    '/units/u6-generative-models-and-naive-bayes/generative-vs-discriminative/',
    'generative-vs-discriminative-toggle',
  );
  await expect(figure).toHaveAttribute('data-widget-params', /"dataset":"adverse"/);
  await expect(figure).toHaveAttribute('data-widget-params', /"features":\["age","egfr"\]/);
  await expect(figure.locator('.widget-challenge')).toContainText("cohort's event rate");
  await expect(figure.locator('.widget-challenge .katex')).toHaveCount(1);
  await expect(figure.getByRole('radio', { name: 'Generative: p(x | y) p(y)' })).toBeChecked();
  await expect(figure.getByRole('slider', { name: 'Prior p(y = 1)' })).toHaveValue('0.06');
  await expect(figure.locator('.gvd-axes')).toContainText('eGFR');
  await expect(figure.locator('[data-layer="bayes"] polyline')).toHaveCount(1);
  await expect(figure.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});

test('lesson 6.2 hydrates bow-vectorizer on NOTES, binary, no preprocessing', async ({ page }) => {
  const { figure, consoleErrors } = await hydrate(
    page,
    '/units/u6-generative-models-and-naive-bayes/text-as-features/',
    'bow-vectorizer',
  );
  await expect(figure).toHaveAttribute('data-widget-params', /"dataset":"notes"/);
  await expect(figure).toHaveAttribute('data-widget-params', /"binary":true/);
  await expect(figure).toHaveAttribute('data-widget-params', /"removeStopWords":false/);
  await expect(figure).toHaveAttribute('data-widget-params', /"stem":false/);
  await expect(figure.locator('.widget-challenge')).toContainText(
    'Fit the vocabulary on the training reports',
  );
  await expect(figure.getByRole('checkbox', { name: 'Binary (0/1)' })).toBeChecked();
  await expect(figure.getByRole('checkbox', { name: 'Remove stop words' })).not.toBeChecked();
  await expect(figure.getByRole('checkbox', { name: 'Stem (suffix stripping)' })).not.toBeChecked();
  await expect(
    figure.getByRole('textbox', { name: 'Report to vectorize (transform)' }),
  ).not.toHaveValue('');
  await expect(figure.locator('.katex-error')).toHaveCount(0);
  expect(consoleErrors, 'console errors').toEqual([]);
});
