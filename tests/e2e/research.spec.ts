import { test, expect } from '@playwright/test';

test('lists all four papers newest first', async ({ page }) => {
  await page.goto('/research');
  const years = await page.getByTestId('paper-year').allInnerTexts();
  expect(years).toEqual(['2024', '2023', '2022', '2020']);
});

test('a paper row expands to show authors and links', async ({ page }) => {
  await page.goto('/research');
  const row = page.getByTestId('paper-gabr');
  // .first(): the author paragraph, not the nested BibTeX <pre> — the escaped BibTeX
  // also contains "Ricardo Furbino" and both now share this row's testid.
  await expect(row.getByText('Ricardo Furbino').first()).toBeHidden();
  await row.locator('summary').first().click();
  await expect(row.getByText('Ricardo Furbino').first()).toBeVisible();
  await expect(row.getByRole('link', { name: /^PDF/ })).toHaveAttribute('href', '/assets/pdf/gabr.pdf');
});

test('the BibTeX entry is readable and copyable without JavaScript', async ({ browser }) => {
  // The entry used to live only in a data attribute behind a button that did nothing
  // when scripts were off — on a page whose whole premise is working without them.
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto('/research');
  const row = p.getByTestId('paper-gabr');
  await row.locator('summary').first().click();
  await row.locator('[data-bibtex-row] summary').click();
  await expect(row.locator('[data-bibtex-row] pre')).toContainText('@inproceedings{furbino2022generalized');
  // gabr's authors are Ricardo Furbino M. Nascimento and Hugo Rios-Neto — Wagner Meira
  // Jr. never co-authored this one, so that string could never appear here.
  await expect(row.locator('[data-bibtex-row] pre')).toContainText('{Ricardo Furbino M. Nascimento}');
  // No copy button exists without JS — the script creates it, so nothing dead renders.
  await expect(row.getByRole('button', { name: 'Copy' })).toHaveCount(0);
  await ctx.close();
});

test('copying twice does not strand the button label', async ({ page }) => {
  // grantPermissions(['clipboard-write']) is Chromium-only — WebKit (the mobile
  // project) rejects the permission name outright. The test is about the label's
  // state machine, not real OS clipboard access, so stub it instead: portable, and
  // deterministic across both projects.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.resolve() }, configurable: true,
    });
  });
  await page.goto('/research');
  const row = page.getByTestId('paper-gabr');
  await row.locator('summary').first().click();
  await row.locator('[data-bibtex-row] summary').click();
  const btn = row.getByRole('button', { name: /Copy/ });
  await btn.click();
  await btn.click();
  // Capturing the label inside the handler meant the second click saved "Copied" as the
  // text to restore, leaving the button permanently mislabelled.
  await expect(btn).toHaveText('Copy', { timeout: 4000 });
});

test('a failed copy says so instead of failing silently', async ({ page }) => {
  await page.goto('/research');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true,
    });
  });
  const row = page.getByTestId('paper-gabr');
  await row.locator('summary').first().click();
  await row.locator('[data-bibtex-row] summary').click();
  await row.getByRole('button', { name: /Copy/ }).click();
  await expect(row.getByRole('button')).toContainText('⌘C');
  await expect(page.locator('#bibtex-status')).toContainText('Copy failed');
});

test('the 2024 paper has no local PDF link', async ({ page }) => {
  await page.goto('/research');
  const row = page.getByTestId('paper-graphepv');
  await row.locator('summary').first().click();
  await expect(row.getByRole('link', { name: /^PDF/ })).toHaveCount(0);
});

test('shows the thesis with supervisor and co-supervisors', async ({ page }) => {
  await page.goto('/research');
  const thesis = page.getByTestId('thesis');
  await expect(thesis).toContainText('Towards Learning Representations from Spatiotemporal Grids in Soccer');
  await expect(thesis).toContainText('Wagner Meira Jr.');
  await expect(thesis).toContainText('Jesse Davis');
  await expect(thesis).toContainText('Adriano C. M. Pereira');
});

test('every paper shows a square preview thumbnail at a uniform size', async ({ page }) => {
  await page.goto('/research');
  const thumbs = page.getByTestId('paper-preview');
  await expect(thumbs).toHaveCount(4);
  // Hidden below sm: at 375px the row spends 155px on year + thumb + gaps, leaving
  // 172px for titles that then run to five or six ragged lines.
  if ((page.viewportSize()?.width ?? 0) < 640) return;
  // Sources range from 840x840 to 246x246 with mismatched aspect ratios, so the point
  // of the crop is that every rendered box is identical regardless.
  const boxes = await thumbs.evaluateAll((els) =>
    els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
  for (const [w, h] of boxes) {
    // toBeGreaterThan(0) first: comparing the four boxes only to each other stays green
    // if a CSS regression collapses all four to 0x0.
    expect(w).toBeGreaterThan(0);
    expect(w).toBe(h);
    expect(w).toBe(boxes[0][0]);
  }
});

test('shows MLSA service with both editions', async ({ page }) => {
  await page.goto('/research');
  const service = page.getByTestId('service');
  await expect(service).toContainText('13th edition');
  await expect(service).toContainText('12th edition');
  await expect(service).toContainText('Naples');
});
