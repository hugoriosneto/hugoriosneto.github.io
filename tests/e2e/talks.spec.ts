import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

// Derived, not typed in. A literal here drifts the moment an entry is added or
// removed, and a count test that silently tracks nothing is worse than no count test.
const ENTRIES: { title: string; provider: string }[] = parse(
  readFileSync(new URL('../../src/content/talks.yaml', import.meta.url), 'utf8'),
);
const TALKS: number = ENTRIES.length;

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
  await page.getByRole('link', { name: /^Opta Pro Forum/ }).click();
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

// WCAG 2.5.3 Label in Name (A) and 2.4.4 Link Purpose (A) at once, for the one place on
// the site where they pull against each other. All five posters carry identical visible
// copy, so the accessible name must disambiguate them (2.4.4) while still CONTAINING the
// visible string verbatim (2.5.3) — a speech-input user says what they can read. This
// lived in a11y.spec.ts as a documented exemption while the links used aria-label, which
// buys the first by breaking the second; it is asserted properly here now that the name
// is composed from a visually-hidden title inside the link.
//
// The name is pinned EXACTLY, not by substring, because the ordering is the whole fix:
// title-then-CTA passes 2.5.3, and so does an aria-label of "<title> play here…", but a
// substring check would also wave through the aria-label form that has no visible text
// in it at all. Exact + count 1 is what pins both properties in one assertion.
test('each poster link is named "<title> <the words on screen>", uniquely', async ({ page }) => {
  await page.goto('/talks');
  // Without this, every toHaveCount(0) below passes against a 404 just as happily.
  await expect(page.getByTestId('talk-card')).toHaveCount(TALKS);

  // 2.4.4 first, deliberately: no poster may be named by the shared CTA alone. Left at
  // the end of this test it was unreachable — every mutation that produces a bare-CTA
  // name also breaks the exact-name check in the loop below, so the loop always failed
  // first and this line could never be the failure. Hoisted, it is the assertion that
  // fires when the hidden titles go missing.
  await expect(page.getByRole('link', { name: /^play here, or open on/ }),
    'a poster is named by the shared CTA alone — five links, one name').toHaveCount(0);

  for (const { title, provider } of ENTRIES) {
    const name = `${title} play here, or open on ${provider}`;
    const link = page.getByRole('link', { name, exact: true });
    await expect(link, `no link accessibly named "${name}"`).toHaveCount(1);

    // ...and the disambiguator must stay invisible: if it renders, the title becomes part
    // of the VISIBLE label, which changes what a speech-input user would say and puts the
    // card's whole design back on the table. The count assertion first — on its own,
    // boundingBox() on a missing span just blocks until the test times out, which is a
    // failure, but a 30-second one that names the wrong line.
    const hidden = link.locator('span.sr-only');
    await expect(hidden, `${title}: no visually-hidden title inside the link`).toHaveCount(1);
    const box = (await hidden.boundingBox())!;
    expect(box.width, `${title}: the hidden title is ${box.width}px wide`).toBeLessThanOrEqual(1);
    expect(box.height, `${title}: the hidden title is ${box.height}px tall`).toBeLessThanOrEqual(1);
  }
});

test('tags language and format', async ({ page }) => {
  await page.goto('/talks');
  await expect(page.getByTestId('talk-card').filter({ hasText: 'Data Footure' })).toContainText('PT');
  await expect(page.getByTestId('talk-card').filter({ hasText: 'Opta Pro Forum' })).toContainText('Winner');
});
