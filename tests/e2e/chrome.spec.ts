import { test, expect } from '@playwright/test';

test('nav exposes all five pages and marks the current one', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  for (const label of ['Research', 'SALab & FAME', 'Talks', 'CV']) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible();
  }
  // The homepage's current-page marker sits on the brand link, since the nav renders
  // links.slice(1). Without this assertion the whole suite had no aria-current coverage
  // on any page, and `current="home"` was dead code nothing noticed.
  await expect(nav.getByRole('link', { name: 'Hugo Rios-Neto' })).toHaveAttribute('aria-current', 'page');
});

test('the nav is one row on desktop and two tidy rows on mobile', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Primary' });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  expect(await nav.evaluate((n) => n.getBoundingClientRect().height)).toBeLessThan(60);

  // Brand plus four labels plus gaps is ~424px, so one row is impossible on a phone.
  // Two rows is the design; what must not happen is a label breaking mid-word or the
  // nav growing past global.css's 5rem scroll-padding-top and hiding anchor targets.
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const h = await nav.evaluate((n) => n.getBoundingClientRect().height);
    expect(h, `nav is ${h}px at ${width}px — taller than scroll-padding-top`).toBeLessThan(80);
    // No item may wrap internally: each link's height stays within one line-box.
    const tallest = await nav.locator('a').evaluateAll((as) =>
      Math.max(...as.map((a) => a.getBoundingClientRect().height)));
    expect(tallest, `a nav label wrapped onto a second line at ${width}px`).toBeLessThan(28);
  }
});

test('footer shows social links and no email address', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'LinkedIn' })).toBeVisible();
  const html = await page.content();
  expect(html).not.toMatch(/mailto:/);
  expect(html).not.toMatch(/@dcc\.ufmg\.br/);
});

test('page declares schema.org Person data', async ({ page }) => {
  await page.goto('/');
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(ld!)['@type']).toBe('Person');
});
