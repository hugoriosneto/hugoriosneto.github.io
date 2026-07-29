import { test, expect } from '@playwright/test';

// Must stay in lockstep with the `redirects` map in astro.config.mjs. A redirect
// missing from both is invisible to this test, so check the config when editing.
const REDIRECTS: [string, string][] = [
  ['/papers', '/research'],
  ['/blog', '/'],
  ['/repositories', '/'],
  ['/blog/2020/tactical-influence-analytics', '/'],
  ['/blog/2023/fame-recap', '/'],
  ['/news', '/'],
  ['/news/1_welcome', '/'],
  ['/news/2_leave_cam', '/'],
  ['/news/3_join_gemini', '/'],
];

for (const [from, to] of REDIRECTS) {
  test(`${from} redirects to ${to}`, async ({ page }) => {
    await page.goto(from);
    await page.waitForURL((url) => url.pathname.replace(/\/$/, '') === to.replace(/\/$/, '') || url.pathname === to);
    expect(page.url()).toContain(to === '/' ? '' : to);
  });
}

test('unknown URLs render the 404 page', async ({ page }) => {
  const res = await page.goto('/nope-not-here');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText("doesn't exist");
});

test('sitemap is generated and excludes the OG card', async ({ request }) => {
  const res = await request.get('/sitemap-index.xml');
  expect(res.status()).toBe(200);
  const idx = await request.get('/sitemap-0.xml');
  expect(idx.status()).toBe(200);
  expect(await idx.text()).not.toContain('/og/');
});

test('the OG card is a designed image, not a page screenshot', async ({ request, page }) => {
  const res = await request.get('/img/og.png');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image');
  // The card page renders the claims at display size so they survive a thumbnail.
  await page.goto('/og/');
  const size = await page.locator('.font-serif').first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  // Headline is 46px (see og.astro) — well above the byline (34px) and title (22px)
  // on the same card, so 40 still distinguishes display type from body copy.
  expect(size).toBeGreaterThan(40);
});

test('every internal link on every page resolves', async ({ page, request }) => {
  const pages = ['/', '/research', '/salab-fame', '/talks', '/cv'];
  const seen = new Set<string>();
  for (const p of pages) {
    await page.goto(p);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!));
    for (const h of hrefs) seen.add(h);
  }
  for (const href of seen) {
    const res = await request.get(href);
    expect(res.status(), `${href} should not 404`).toBeLessThan(400);
  }
});

test('paper PDFs keep the URLs they are cited at', async ({ request }) => {
  // These paths appear in external citations. A redirect cannot rescue them —
  // an Astro redirect key ending in .pdf emits a directory containing index.html
  // and would answer a PDF request with HTML. Task 5 must place them at
  // public/assets/pdf/ so these URLs survive untouched.
  for (const f of ['eniac23', 'gabr', 'obso']) {
    const res = await request.get(`/assets/pdf/${f}.pdf`);
    expect(res.status(), `/assets/pdf/${f}.pdf should still resolve`).toBe(200);
    expect(res.headers()['content-type']).toContain('pdf');
  }
});
