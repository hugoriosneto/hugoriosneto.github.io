import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

// Derived, not typed in. A literal here drifts the moment an entry is added or
// removed, and a count test that silently tracks nothing is worse than no count test.
const TALKS: number = parse(
  readFileSync(new URL('../../src/content/talks.yaml', import.meta.url), 'utf8'),
).length;

// Deriving the count buys drift-resistance but opens one hole: if the parse ever yields
// an empty list, every toHaveCount(TALKS) below passes against a 404 just as happily as
// against the real page. Close it once, here.
test('the expected talk count is a real number', () => expect(TALKS).toBeGreaterThan(0));

test('lists every talk', async ({ page }) => {
  await page.goto('/talks');
  await expect(page.getByTestId('talk-card')).toHaveCount(TALKS);
});

test('loads no iframes until a card is clicked', async ({ page }) => {
  await page.goto('/talks');
  // The card assertion first: on its own, "no iframes" passes against a 404 page just as
  // happily as against a correct one.
  await expect(page.getByTestId('talk-card')).toHaveCount(TALKS);
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
  // posters that never loaded and no link anywhere — and embedUrl is a player URL,
  // so a reader could not even recover it by hand.
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto('/talks');
  const hrefs = await p.locator('.talk-frame').evaluateAll((as) =>
    as.map((a) => (a as HTMLAnchorElement).href));
  expect(hrefs).toHaveLength(TALKS);
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
  await expect(page.getByTestId('talk-card')).toHaveCount(TALKS);
  expect(external).toEqual([]);
});

test('tags language and format', async ({ page }) => {
  await page.goto('/talks');
  await expect(page.getByTestId('talk-card').filter({ hasText: 'Data Footure' })).toContainText('PT');
  await expect(page.getByTestId('talk-card').filter({ hasText: 'Opta Pro Forum' })).toContainText('Winner');
});
