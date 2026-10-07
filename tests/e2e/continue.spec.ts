import { expect, test } from '@playwright/test';

/** Opening a lesson records your place; the home "Continue" card shows it (VISION §9.11). */
test('home continue card remembers the last lesson', async ({ page }) => {
  await page.goto('/units/u6-generative-models-and-naive-bayes/naive-bayes/');
  await expect(page.locator('h1').first()).toContainText('Naive Bayes');
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(200);

  await page.goto('/');
  const card = page.locator('[data-continue]');
  await expect(card.locator('a')).toHaveAttribute(
    'href',
    '/units/u6-generative-models-and-naive-bayes/naive-bayes/',
  );
  await expect(card.locator('a')).toContainText('6.3 · Naive Bayes');
  await expect(card.locator('[data-continue-note]')).toContainText(/% read, just now/);
});

test('unknown routes get the 404 page', async ({ page }) => {
  const response = await page.goto('/atlas');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1').first()).toContainText('There is no page here');
});
