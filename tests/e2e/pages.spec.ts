import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * The content pages around the lessons (VISION §7): /homework/<hw>,
 * /homework, /cases, /cases/<id>, /materials, and the components that link
 * into them (<HomeworkBridge>, <SlideRef>, <Notebook>, <Example case>).
 */

/** Every `/path#hash` href resolves to a page that has an element with that id. */
async function expectAnchorsExist(request: APIRequestContext, hrefs: string[]): Promise<void> {
  const byPath = new Map<string, Set<string>>();
  for (const href of hrefs) {
    const [path = '', hash] = href.split('#');
    if (!hash) continue;
    const set = byPath.get(path) ?? new Set<string>();
    set.add(decodeURIComponent(hash));
    byPath.set(path, set);
  }
  expect(byPath.size).toBeGreaterThan(0);
  for (const [path, hashes] of byPath) {
    const res = await request.get(path);
    expect(res.status(), `${path} should exist`).toBe(200);
    const html = await res.text();
    for (const hash of hashes) {
      expect(html.includes(`id="${hash}"`), `${path}#${hash} should exist`).toBe(true);
    }
  }
}

async function hrefs(page: Page, selector: string): Promise<string[]> {
  return page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
}

test.describe('/homework/hw3 (live)', () => {
  test('shows the live badge and no walkthrough or solution section', async ({ page }) => {
    await page.goto('/homework/hw3');
    await expect(page.locator('h1')).toContainText('Homework 3');
    await expect(page.locator('[data-live-badge]')).toHaveText(
      'Live until 2026-10-19: skills map and lesson links only',
    );
    const headings = await page.locator('main :is(h1, h2, h3, h4)').allTextContents();
    expect(headings.length).toBeGreaterThan(3);
    expect(headings.filter((h) => /walkthrough|solution/i.test(h))).toEqual([]);
    await expect(page.locator('.katex-error')).toHaveCount(0);
  });

  test('skill rows link to lesson anchors that exist', async ({ page, request }) => {
    await page.goto('/homework/hw3');
    const rows = page.locator('#skills-from-the-lessons ~ .homework-bridge tr[data-skill]');
    expect(await rows.count()).toBeGreaterThanOrEqual(10);
    // Every row teaches somewhere.
    for (const row of await rows.all()) {
      expect(await row.locator('a[data-skill-lesson]').count()).toBeGreaterThan(0);
    }
    const derivations = await hrefs(page, 'tr[data-skill] a[data-skill-derivation]');
    expect(derivations.length).toBeGreaterThan(5);
    const practice = await hrefs(page, 'a[data-practice-item]');
    expect(practice.filter((h) => h.includes('#check-')).length).toBeGreaterThan(10);
    const bodyLinks = await hrefs(page, '.hw-body a[href^="/units/"]');
    await expectAnchorsExist(request, [
      ...derivations,
      ...practice.filter((h) => h.includes('#')),
      ...bodyLinks,
    ]);
  });

  test('the readiness tables link their check ids to the checks', async ({ page }) => {
    await page.goto('/homework/hw3');
    const link = page.locator('.hw-body td a[data-practice-item="q-u6-l3-009"]').first();
    await expect(link).toHaveAttribute('href', /naive-bayes#check-q-u6-l3-009$/);
  });
});

test('/homework/hw1 (past) renders its walkthrough', async ({ page }) => {
  await page.goto('/homework/hw1');
  await expect(page.locator('[data-hw-state="past"]')).toBeVisible();
  await expect(page.locator('[data-live-badge]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Part I: NumPy and PyTorch/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Part II: the housing prices/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Level 2/ })).toBeVisible();
});

test('/homework lists the calendar with the live homework badged and past ones muted', async ({
  page,
}) => {
  await page.goto('/homework');
  await expect(page.locator('[data-homework-row="hw3"] [data-live-badge]')).toBeVisible();
  await expect(page.locator('[data-homework-row="hw1"]')).toHaveAttribute('data-past', 'true');
  await expect(page.locator('[data-homework-row="hw1"] a')).toHaveAttribute(
    'href',
    '/homework/hw1',
  );
});

test('a lesson bridge links its skills to lesson anchors that exist', async ({ page, request }) => {
  await page.goto('/units/u7-gaussian-discriminant-analysis/gaussian-discriminant-analysis');
  const bridge = page.locator('#homework-hw3');
  await expect(
    bridge.locator('tr[data-skill="gda-mle-mean"] a[data-skill-derivation]'),
  ).toHaveAttribute('href', /#der-7-2-\d+$/);
  await expectAnchorsExist(request, [
    ...(await hrefs(page, '#homework-hw3 a[data-skill-derivation]')),
    ...(await hrefs(page, '#homework-hw3 a[data-practice-item][href*="#"]')),
  ]);
});

test.describe('cases', () => {
  test('/cases lists the eight cases, with pages or as coming', async ({ page }) => {
    await page.goto('/cases');
    await expect(page.locator('[data-case-row]')).toHaveCount(8);
    await expect(page.locator('[data-case-row="notes"] a')).toHaveAttribute('href', '/cases/notes');
    await expect(page.locator('[data-case-row="vasco"]')).toHaveAttribute(
      'data-case-state',
      'coming',
    );
  });

  test('/cases/notes shows 10 sample rows, stats, the download, and used-in links', async ({
    page,
    request,
  }) => {
    await page.goto('/cases/notes');
    await expect(page.locator('[data-case-sample] tr[data-case-row]')).toHaveCount(10);
    await expect(page.locator('[data-case-sample] td.note').first()).toHaveText(/^[A-Z].*\.$/);
    await expect(page.locator('[data-case-stats]')).toContainText('6,000');
    await expect(page.locator('.katex-error')).toHaveCount(0);
    const download = await page.locator('[data-case-download]').getAttribute('href');
    expect(download).toBe('/data/notes.json');
    const json = await request.get(download ?? '');
    expect(json.status()).toBe(200);
    expect((await json.json()).n).toBe(6000);
    const used = await hrefs(page, '[data-case-used-in] a');
    expect(used.length).toBeGreaterThanOrEqual(3);
    for (const href of used) expect((await request.get(href)).status()).toBe(200);
  });

  test('an <Example case> chip links to an existing case page', async ({ page, request }) => {
    await page.goto('/units/u7-gaussian-discriminant-analysis/gaussian-discriminant-analysis');
    const href = await page.locator('.example a[href^="/cases/"]').first().getAttribute('href');
    expect(href).toBe('/cases/adverse');
    expect((await request.get(href ?? '')).status()).toBe(200);
  });
});

test.describe('materials', () => {
  test('/materials lists the lectures with PDFs and a page index', async ({ page, request }) => {
    await page.goto('/materials');
    expect(
      await page.locator('[data-materials-lectures] [data-lecture]').count(),
    ).toBeGreaterThanOrEqual(10);
    await expect(page.locator('#L9 [data-page-index] a[href^="/units/"]').first()).toBeVisible();
    const pdf = await page.locator('#L9 [data-material-pdf]').getAttribute('href');
    const res = await request.head(pdf ?? '');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('application/pdf');
    // The L6 companion implements L7 (docs/course-map/00-course-overview.md).
    await expect(page.locator('#notebook-l6-code-companion-ipynb')).toContainText('L7');
  });

  test('a SlideRef in a lesson points at an existing PDF page', async ({ page, request }) => {
    await page.goto('/units/u6-generative-models-and-naive-bayes/naive-bayes');
    const href = (await page.locator('a.slideref').first().getAttribute('href')) ?? '';
    expect(href).toMatch(/^\/materials\/files\/lectures\/l\d+[^#]*\.pdf#page=\d+$/);
    const res = await request.head(href.split('#')[0] ?? '');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('application/pdf');
  });

  test('a Notebook chip points at an existing notebook row', async ({ page, request }) => {
    await page.goto('/units/u1-linear-regression/components-of-a-learning-problem');
    const href = (await page.locator('a.notebook').first().getAttribute('href')) ?? '';
    expect(href).toMatch(/^\/materials#notebook-/);
    await expectAnchorsExist(request, [href]);
  });
});

const SHOTS = [
  ['homework-hw3', '/homework/hw3'],
  ['homework', '/homework'],
  ['cases', '/cases'],
  ['cases-notes', '/cases/notes'],
  ['materials', '/materials'],
] as const;

for (const theme of ['light', 'dark'] as const) {
  for (const [name, path] of SHOTS) {
    test(`${path} renders in ${theme} theme`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text());
      });
      // No color transitions mid-screenshot when the theme flips.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      await expect(page.locator('h1')).toBeVisible();
      expect(consoleErrors).toEqual([]);
      await page.screenshot({ path: `test-results/pages-${name}-${theme}.png`, fullPage: true });
    });
  }
}
