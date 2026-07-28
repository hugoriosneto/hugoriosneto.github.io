import { test, expect } from '@playwright/test';

test('lists all six talks', async ({ page }) => {
  await page.goto('/talks');
  await expect(page.getByTestId('talk-card')).toHaveCount(6);
});

test('loads no iframes until a card is clicked', async ({ page }) => {
  await page.goto('/talks');
  // The card assertion first: on its own, "no iframes" passes against a 404 page just as
  // happily as against a correct one.
  await expect(page.getByTestId('talk-card')).toHaveCount(6);
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('clicking a card loads exactly that one embed', async ({ page }) => {
  await page.goto('/talks');
  await page.getByRole('link', { name: /Watch Opta Pro Forum/ }).click();
  await expect(page.locator('iframe')).toHaveCount(1);
  await expect(page.locator('iframe')).toHaveAttribute('src', /player\.vimeo\.com/);
});

test('every talk is reachable without JavaScript', async ({ browser }) => {
  // The page exists to surface the media. With scripts off the earlier version rendered
  // six posters that never loaded and no link anywhere — and embedUrl is a player URL,
  // so a reader could not even recover it by hand.
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto('/talks');
  const hrefs = await p.locator('.talk-frame').evaluateAll((as) =>
    as.map((a) => (a as HTMLAnchorElement).href));
  expect(hrefs).toHaveLength(6);
  for (const h of hrefs) expect(h).toMatch(/^https:\/\/(www\.youtube\.com|vimeo\.com|open\.spotify\.com)\//);
  await ctx.close();
});

test('makes no third-party requests before a click', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const host = new URL(r.url()).host;
    if (!host.includes('localhost')) external.push(host);
  });
  await page.goto('/talks');
  await page.waitForLoadState('networkidle');
  // Same reasoning: a 404 also makes no third-party requests.
  await expect(page.getByTestId('talk-card')).toHaveCount(6);
  expect(external).toEqual([]);
});

test('tags language and format', async ({ page }) => {
  await page.goto('/talks');
  await expect(page.getByTestId('talk-card').filter({ hasText: 'Data Footure' })).toContainText('PT');
  await expect(page.getByTestId('talk-card').filter({ hasText: 'Opta Pro Forum' })).toContainText('Winner');
});
