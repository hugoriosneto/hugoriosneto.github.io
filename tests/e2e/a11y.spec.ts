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
    // 'best-practice' added alongside the wcag2*/wcag21* tags: axe tags rules like
    // heading-order as best-practice only, not any WCAG criterion, so a wcag-only
    // filter cannot see them even though Lighthouse's unfiltered axe run does. That
    // asymmetry — one gate silent where the other one fires — is what let TalkCard's
    // h1->h3 skip through as a passing axe run. Both gates now check the same rules.
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

// WCAG 2.5.3 Label in Name (Level A). axe cannot gate this: its
// label-content-name-mismatch rule is EXPERIMENTAL and therefore off by default, so
// the axe run above is silent on it. A speech-input user says the words they can read
// on screen ("click MLSA at ECML PKDD"), and the match is made against the accessible
// name — so when a control carries an aria-label, that label must CONTAIN the visible
// text, not replace it. This caught aria-label="MLSA — Machine Learning ..." on a link
// reading "MLSA @ ECML/PKDD", where the visible string appeared nowhere in the name.
//
// Controls with no visible text (the five trajectory dots) are skipped, not failed:
// 2.5.3 applies only where there IS a visible text label.
// aria-hidden subtrees are stripped first — they are visible to the eye but excluded
// from the accessible name, so counting them would invert the very comparison.
//
// The five /talks poster links used to sit here as a documented exemption: they read
// "play here, or open on youtube|vimeo" but were named "Watch <talk title> on
// youtube|vimeo", trading 2.5.3 for 2.4.4 because the label was the only thing telling
// five identical-looking links apart. TalkCard.astro now composes the name from a
// visually-hidden title inside the link instead, which satisfies both, so the exemption
// expired as designed and is gone. Because those links no longer carry an aria-label at
// all they fall outside this selector — talks.spec.ts asserts their exact composed names.
test('every labelled control contains its visible text in its accessible name', async ({ page }) => {
  let checked = 0;
  for (const path of PAGES) {
    await page.goto(path);
    const rows = await page.$$eval('a[aria-label], button[aria-label]', (els) =>
      els.map((el) => {
        const visibleText = (node: Element): string =>
          [...node.childNodes].map((c) => {
            if (c.nodeType === Node.TEXT_NODE) return c.textContent ?? '';
            if (!(c instanceof Element)) return '';
            if (c.getAttribute('aria-hidden') === 'true') return '';
            if (getComputedStyle(c).display === 'none') return '';
            return visibleText(c);
          }).join('');
        return { visible: visibleText(el), name: el.getAttribute('aria-label') ?? '' };
      }));
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    for (const { visible, name } of rows) {
      const v = norm(visible);
      if (v === '') continue; // icon-only: no visible text label, 2.5.3 does not apply
      checked++;
      expect(norm(name), `${path}: visible "${visible.trim()}" is not in accessible name "${name}"`)
        .toContain(v);
    }
  }
  // The counter guards the loop itself. Without it a selector change that returned no
  // rows would skip every assertion above and the test would pass having verified nothing.
  expect(checked, 'no labelled controls were checked at all').toBeGreaterThanOrEqual(6);
});

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
