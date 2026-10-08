import { expect, test, type Page } from '@playwright/test';

const LESSON = '/units/u6-generative-models-and-naive-bayes/naive-bayes/';
const THEMES = ['light', 'dark'] as const;

/**
 * Sticky-note popover (VISION §9.2; STYLE_GUIDE §5, §8) on a real lesson page:
 * hover-intent opens the glossary card, Escape closes it, Enter on a focused
 * trigger opens it, and on a phone a tap opens and an outside tap closes.
 * The open card is screenshotted in both themes for PR review.
 */

async function setTheme(page: Page, theme: (typeof THEMES)[number]): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
}

/** The first prose trigger whose glossary card exists on the page, with the card's heading. */
async function firstResolvedTrigger(page: Page) {
  const trigger = page.locator('.prose [data-sticky][data-field]').first();
  await expect(trigger).toBeVisible();
  const id = (await trigger.getAttribute('data-sticky')) ?? '';
  const title = await page
    .locator(`template[data-sticky-card="${id}"]`)
    .evaluate((t) =>
      (t as HTMLTemplateElement).content.querySelector('[data-sticky-title]')?.textContent?.trim(),
    );
  return { trigger, id, title: title ?? '' };
}

for (const theme of THEMES) {
  test(`hover opens the card and Escape closes it (${theme})`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    await page.goto(LESSON);
    await setTheme(page, theme);

    const { trigger, title } = await firstResolvedTrigger(page);
    expect(title.length).toBeGreaterThan(0);
    await trigger.scrollIntoViewIfNeeded();
    await trigger.hover();

    const card = page.locator('#sticky-popover');
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('role', 'dialog');
    await expect(card).toHaveAttribute('data-open', '');
    await expect(card.locator('#sticky-popover-title')).toHaveText(title);
    await expect(card.locator('.sticky-card-foot a')).toHaveAttribute('href', /^\/glossary#/);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('aria-controls', 'sticky-popover');
    await expect(page.locator('.katex-error')).toHaveCount(0);

    // The card stays within the viewport.
    const box = await card.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (box && viewport) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }

    await page.screenshot({ path: `test-results/sticky-open-${theme}.png` });

    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Content moving under a still pointer fires a fresh pointerover; an Escape
    // dismissal must survive it (this reopened the card on slow CI runners).
    await trigger.dispatchEvent('pointerover', { pointerType: 'mouse', bubbles: true });
    await page.waitForTimeout(600);
    await expect(card).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Leaving and coming back opens it again.
    await page.mouse.move(0, 0);
    await trigger.hover();
    await expect(card).toBeVisible();
    expect(consoleErrors, 'console errors').toEqual([]);
  });
}

test('keyboard: Enter opens, Tab moves into the card, Escape returns focus', async ({ page }) => {
  await page.goto(LESSON);
  const { trigger } = await firstResolvedTrigger(page);
  await trigger.focus();
  await page.keyboard.press('Enter');
  const card = page.locator('#sticky-popover');
  await expect(card).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Tab');
  await expect(card.locator('.sticky-card-foot a')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  await expect(trigger).toBeFocused();

  // Space toggles too.
  await page.keyboard.press(' ');
  await expect(card).toBeVisible();
  await page.keyboard.press(' ');
  await expect(card).toBeHidden();
});

test('first use is emphasized, later uses are lighter, underline uses the field color', async ({
  page,
}) => {
  await page.goto(LESSON);
  const first = page.locator('.prose .sticky.sticky-first').first();
  await expect(first).toBeVisible();
  const style = await first.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      line: cs.textDecorationLine,
      styleName: cs.textDecorationStyle,
      thickness: cs.textDecorationThickness,
      offset: cs.textUnderlineOffset,
      color: cs.textDecorationColor,
      text: cs.color,
    };
  });
  expect(style.line).toContain('underline');
  expect(style.styleName).toBe('dotted');
  expect(style.thickness).toBe('2px');
  expect(style.offset).toBe('3px');
  expect(style.color).not.toBe(style.text);
  expect(await page.locator('.prose .sticky:not(.sticky-first)').count()).toBeGreaterThan(0);
});

test('a prerequisite chip opens the same card instead of navigating', async ({ page }) => {
  await page.goto(LESSON);
  const chip = page.locator('.prereq-chip[data-sticky]').first();
  await expect(chip).toBeVisible();
  const id = await chip.getAttribute('data-sticky');
  await chip.click();
  const card = page.locator('#sticky-popover');
  await expect(card).toBeVisible();
  expect(page.url()).not.toContain('/glossary');
  await expect(card.locator('.sticky-card-foot a')).toHaveAttribute('href', `/glossary#${id}`);
});

test.describe('phone', () => {
  // A 390px touch viewport. Not `isMobile`: the lesson page's minimum content
  // width is wider than 390px today (a pre-existing overflow unrelated to
  // stickies), and Chromium's mobile emulation would widen the layout viewport
  // to fit it, so touch coordinates would no longer map to the page.
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('tap opens, outside tap closes, card fits the viewport', async ({ page }) => {
    await page.goto(LESSON);
    const { trigger } = await firstResolvedTrigger(page);
    // Tap the first line box of the inline trigger: an inline span that wraps has a
    // bounding-box center that may fall between its lines, and the sticky mini-header
    // would catch a tap at the very top of the viewport.
    const tapAt = async (locator: typeof trigger) => {
      await locator.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      const point = await locator.evaluate((el) => {
        const r = el.getClientRects()[0] ?? el.getBoundingClientRect();
        return { x: r.left + Math.min(r.width / 2, 12), y: r.top + r.height / 2 };
      });
      await page.touchscreen.tap(point.x, point.y);
    };
    await tapAt(trigger);
    const card = page.locator('#sticky-popover');
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
    }

    await page.screenshot({ path: 'test-results/sticky-open-phone.png' });

    await tapAt(page.locator('h1').first());
    await expect(card).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});

test('each term costs one card template however often it is used', async ({ page }) => {
  await page.goto(LESSON);
  const ids = await page
    .locator('[data-sticky]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-sticky') ?? ''));
  const templates = await page
    .locator('template[data-sticky-card]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-sticky-card') ?? ''));
  expect(ids.length).toBeGreaterThan(templates.length);
  expect(new Set(templates).size).toBe(templates.length);
  for (const id of ids) expect(templates).toContain(id);
});
