import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// '/404' is included alongside the five real pages: Astro emits it as a standalone
// dist/404.html (not nested under a route), so it is served directly at this path
// with a 200 rather than only as the fallback for an unmatched URL. It is a real
// page users land on and deserves the same accessibility gate as the rest — a page
// missing from this list is a page with no accessibility gate at all.
const PAGES = ['/', '/research', '/salab-fame', '/talks', '/cv', '/404'];

for (const path of PAGES) {
  test(`${path} has no axe violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test('every page has exactly one h1', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator('h1'), `${path} should have one h1`).toHaveCount(1);
  }
});

test('the body never scrolls horizontally on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of PAGES) {
    await page.goto(path);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} overflows at 375px`).toBeLessThanOrEqual(1);
  }
});

test('pages without an island ship no JavaScript bundle', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => { if (r.resourceType() === 'script') scripts.push(r.url()); });
  await page.goto('/cv');
  await page.waitForLoadState('networkidle');
  // The CV has only the inline print handler, so no external bundle should load.
  expect(scripts.filter((s) => s.endsWith('.js'))).toEqual([]);
});
