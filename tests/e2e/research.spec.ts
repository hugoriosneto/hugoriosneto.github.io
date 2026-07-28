import { test, expect } from '@playwright/test';

test('lists all four papers newest first', async ({ page }) => {
  await page.goto('/research');
  const years = await page.getByTestId('paper-year').allInnerTexts();
  expect(years).toEqual(['2024', '2023', '2022', '2020']);
});

test('a paper row expands to show authors and links', async ({ page }) => {
  await page.goto('/research');
  const row = page.getByTestId('paper-gabr');
  await expect(row.getByText('Ricardo Furbino')).toBeHidden();
  await row.locator('summary').click();
  await expect(row.getByText('Ricardo Furbino')).toBeVisible();
  await expect(row.getByRole('link', { name: 'PDF' })).toHaveAttribute('href', '/assets/pdf/gabr.pdf');
});

test('the 2024 paper has no local PDF link', async ({ page }) => {
  await page.goto('/research');
  const row = page.getByTestId('paper-graphepv');
  await row.locator('summary').click();
  await expect(row.getByRole('link', { name: 'PDF' })).toHaveCount(0);
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
