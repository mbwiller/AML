import { expect, test, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const ID = 'der-6-1-1';

/**
 * The `<Derivation>` step engine on the kitchen-sink page (three steps,
 * `der-6-1-1`): reveal controls, keyboard, step fragments, persistence, and
 * a screenshot of the derivation in both themes.
 */

const derivation = (page: Page) => page.locator(`section[data-derivation="${ID}"]`);
const visibleSteps = (page: Page) => derivation(page).locator('li[data-step]:visible');
const count = (page: Page) => derivation(page).locator('[data-count][aria-live]');

async function setTheme(page: Page, theme: (typeof THEMES)[number]): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
}

for (const theme of THEMES) {
  test(`reveals steps with the controls and the keyboard (${theme})`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/dev/kitchen-sink');
    await setTheme(page, theme);

    const section = derivation(page);
    await expect(section).toHaveAttribute('data-enhanced', '');
    await expect(section).toHaveAttribute('data-ready', '');
    await expect(section).toHaveAttribute('data-step-count', '3');

    // Initial state: first step only, "1 of 3", first chunk current.
    await expect(count(page)).toHaveText('1 of 3');
    await expect(visibleSteps(page)).toHaveCount(1);
    await expect(section.locator('li[data-step][hidden]')).toHaveCount(2);
    await expect(section.locator('[data-chunk][aria-current="step"]')).toHaveCount(1);
    await expect(section.locator(`#${ID}-step-1`)).toBeVisible();

    // Keyboard: hover the derivation, ArrowRight twice → 3 of 3, focus on the newest step.
    await section.hover();
    await page.keyboard.press('ArrowRight');
    await expect(count(page)).toHaveText('2 of 3');
    await expect(page.locator(':focus')).toHaveId(`${ID}-step-2`);
    await page.keyboard.press('ArrowRight');
    await expect(count(page)).toHaveText('3 of 3');
    await expect(visibleSteps(page)).toHaveCount(3);
    await expect(section.locator('button[data-action="next"]').first()).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    // Persisted per derivation id.
    expect(await page.evaluate((id) => localStorage.getItem(`aml-derivation:${id}`), ID)).toBe('3');

    // ArrowLeft hides the last; `r` resets and clears storage; `a` reveals all.
    await page.keyboard.press('ArrowLeft');
    await expect(count(page)).toHaveText('2 of 3');
    await page.keyboard.press('r');
    await expect(count(page)).toHaveText('1 of 3');
    expect(
      await page.evaluate((id) => localStorage.getItem(`aml-derivation:${id}`), ID),
    ).toBeNull();
    await page.keyboard.press('a');
    await expect(count(page)).toHaveText('3 of 3');

    // Buttons: Reset, then Next step, then the step dot for 3.
    await section.getByRole('button', { name: 'Reset' }).first().click();
    await expect(count(page)).toHaveText('1 of 3');
    await section.getByRole('button', { name: 'Next step' }).first().click();
    await expect(count(page)).toHaveText('2 of 3');
    await section.getByRole('button', { name: 'Reveal through step 3' }).first().click();
    await expect(count(page)).toHaveText('3 of 3');

    // Keys do nothing while typing in an input.
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.id = 'typing-probe';
      document.querySelector('main')?.prepend(input);
      input.focus();
    });
    await page.keyboard.press('r');
    await expect(count(page)).toHaveText('3 of 3');
    await expect(page.locator('#typing-probe')).toHaveValue('r');

    await expect(page.locator('.katex-error')).toHaveCount(0);
    expect(consoleErrors, 'console errors').toEqual([]);

    await section.screenshot({ path: `test-results/derivation-${theme}.png` });
  });

  test(`a step fragment reveals exactly that prefix and highlights it (${theme})`, async ({
    page,
  }) => {
    await page.goto(`/dev/kitchen-sink#${ID}-step-2`);
    await setTheme(page, theme);

    const section = derivation(page);
    await expect(count(page)).toHaveText('2 of 3');
    await expect(visibleSteps(page)).toHaveCount(2);
    await expect(section.locator(`#${ID}-step-2`)).toBeVisible();
    await expect(section.locator(`#${ID}-step-3`)).toBeHidden();
    await expect(section.locator(`#${ID}-step-2`)).toHaveClass(/is-target/);
    await expect(section.locator(`#${ID}-step-2`)).toBeInViewport();

    // The fragment wins over a larger persisted count on the next load.
    await page.evaluate((id) => localStorage.setItem(`aml-derivation:${id}`, '3'), ID);
    await page.reload();
    await setTheme(page, theme);
    await expect(count(page)).toHaveText('2 of 3');

    // Every step has its stable id and a copy-link affordance.
    for (const n of [1, 2, 3]) {
      await expect(section.locator(`#${ID}-step-${n}`)).toHaveCount(1);
      await expect(
        section.locator(`#${ID}-step-${n} a[data-step-link][href$="#${ID}-step-${n}"]`),
      ).toHaveCount(1);
    }

    await section.screenshot({ path: `test-results/derivation-deeplink-${theme}.png` });
  });
}

test('without JavaScript every step is visible and the controls are absent', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/dev/kitchen-sink');
  const section = derivation(page);
  await expect(section).not.toHaveAttribute('data-enhanced', '');
  await expect(visibleSteps(page)).toHaveCount(3);
  await expect(section.locator('[data-derivation-controls]:visible')).toHaveCount(0);
  await context.close();
});

test('a revealed step with figureState dispatches aml:figure-state', async ({ page }) => {
  await page.goto('/dev/kitchen-sink');
  const section = derivation(page);
  await expect(section).toHaveAttribute('data-ready', '');

  // Give step 2 a figure state at runtime and listen on the section.
  await page.evaluate((id) => {
    document
      .getElementById(`${id}-step-2`)
      ?.setAttribute('data-figure-state', '{"highlight":"prior"}');
    const log: unknown[] = [];
    (window as unknown as { __figureLog: unknown[] }).__figureLog = log;
    document.addEventListener('aml:figure-state', (e) => {
      log.push((e as CustomEvent).detail);
    });
  }, ID);
  await section.getByRole('button', { name: 'Next step' }).first().click();
  await expect(count(page)).toHaveText('2 of 3');

  const log = await page.evaluate(
    () => (window as unknown as { __figureLog: unknown[] }).__figureLog,
  );
  expect(log).toEqual([{ derivation: ID, step: 2, state: { highlight: 'prior' } }]);
});
