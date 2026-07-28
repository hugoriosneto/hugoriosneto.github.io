import { test, expect } from '@playwright/test';

test('hero states the three firsts', async ({ page }) => {
  await page.goto('/');
  const hero = page.getByTestId('hero');
  await expect(hero).toContainText("Brazil's first club analytics department.");
  await expect(hero).toContainText('Its first sports analytics lab.');
  await expect(hero).toContainText('Its first football analytics conference.');
});

test('hero highlights exactly three words', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hero').locator('.highlight')).toHaveCount(3);
});

test('identity legend links to SALab, FAME and MLSA', async ({ page }) => {
  await page.goto('/');
  const legend = page.getByTestId('legend');
  // Substring matches: each link carries an aria-label expanding the acronym, so the
  // accessible name is longer than the visible text.
  await expect(legend.getByRole('link', { name: /^SALab/ })).toHaveAttribute('href', 'https://salabufmg.github.io/');
  await expect(legend.getByRole('link', { name: /^FAME/ })).toHaveAttribute('href', 'https://salabufmg.github.io/FAME26/');
  await expect(legend.getByRole('link', { name: /MLSA/ })).toHaveAttribute('href', /dtai\.cs\.kuleuven\.be/);
});

test('the highlighter survives print and forced-colors', async ({ page }) => {
  await page.goto('/');
  // The emphasis is a background gradient, and both of these modes strip backgrounds
  // by default — leaving three plain sentences with no trace of the site's central
  // device, and no error anywhere.
  await page.emulateMedia({ media: 'print' });
  const printAdjust = await page.locator('.highlight').first()
    .evaluate((el) => getComputedStyle(el).printColorAdjust || (getComputedStyle(el) as any).webkitPrintColorAdjust);
  expect(printAdjust).toBe('exact');

  await page.emulateMedia({ media: 'screen', forcedColors: 'active' });
  const forced = await page.locator('.highlight').first()
    .evaluate((el) => getComputedStyle(el).borderBottomWidth);
  expect(parseFloat(forced)).toBeGreaterThan(0);
  await page.emulateMedia({ media: 'screen', forcedColors: 'none' });
});

test('no sentence in the h1 ends on a one-word orphan', async ({ page }) => {
  await page.goto('/');
  // max-w-[23ch] produces an identical wrap from 414px to 1440px, so an orphan here is
  // an orphan at every desktop width, not an edge case.
  //
  // Counting lines via Range.getClientRects() over the whole span does NOT work: it
  // returns one rect per DOM fragment, not per visual line, and every sentence contains
  // a nested <span class="highlight">. A five-word sentence yields five rects and the
  // ratio computes to 1 regardless of how it actually wraps. So walk word by word and
  // group by the top edge instead, then count the words sharing the lowest line.
  const worst = await page.locator('h1 > span.block').evaluateAll((spans) =>
    Math.min(...spans.map((span) => {
      const tops: number[] = [];
      const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent || '';
        for (const m of text.matchAll(/\S+/g)) {
          const r = document.createRange();
          r.setStart(node, m.index!);
          r.setEnd(node, m.index! + m[0].length);
          tops.push(r.getBoundingClientRect().top);
        }
      }
      if (!tops.length) return 99;
      const lastTop = Math.max(...tops);
      return tops.filter((t) => Math.abs(t - lastTop) < 2).length;
    })));
  expect(worst, 'a sentence in the h1 ends on a single stranded word').toBeGreaterThan(1);
});

test('page states no ambition or forward-looking claim', async ({ page }) => {
  await page.goto('/');
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/Seleção|what's next|technical director|football director|aspire/i);
});

test('shows the two things built from nothing', async ({ page }) => {
  await page.goto('/');
  const built = page.getByTestId('built');
  await expect(built).toContainText('Sports Analytics Lab');
  await expect(built).toContainText('FAME');
  // "fifth edition", not the digit 5: the count is spelled out because "across 5
  // editions" implied five completed when the fifth is 28 September 2026.
  await expect(built).toContainText('fifth edition');
});

test('Why Brazil uses the approved W2 copy', async ({ page }) => {
  await page.goto('/');
  const why = page.getByTestId('why-brazil');
  await expect(why).toContainText('No country has won more World Cups than Brazil');
  await expect(why).toContainText('Closing that gap is what my career has been');
});

test('the research teaser carries the thesis and MLSA rows, not just papers', async ({ page }) => {
  await page.goto('/');
  const body = page.locator('body');
  await expect(body).toContainText('thesis defended');
  await expect(body).toContainText('13th edition');
});

test('the research and talks lists share one left edge', async ({ page }) => {
  await page.goto('/');
  // They previously started 56px apart with identical typography, which read as two
  // people having built them. The talks language gutter is what closes it.
  const [research, talks] = await Promise.all([
    page.getByTestId('research-title').first().evaluate((e) => e.getBoundingClientRect().x),
    page.getByTestId('talks-title').first().evaluate((e) => e.getBoundingClientRect().x),
  ]);
  expect(Math.abs(research - talks), `research titles at ${research}, talks at ${talks}`).toBeLessThan(2);
});

test('no list draws a trailing rule above the next section', async ({ page }) => {
  await page.goto('/');
  // The defect this guards: `border-b` on every <li> gave the LAST row a bottom rule,
  // 48px above the next section's `border-t` — two hairlines with only padding between.
  // An earlier version of this test looked for rules within 8px of each other, which
  // could never fire: the gap is a full section's padding. Assert the cause instead —
  // divide-y deliberately skips the last child, so a trailing border means someone
  // re-added border-b.
  // Scoped to lists that opted into divide-y — the only ones where a trailing border
  // is a defect. Plain `main ul` also catches the trajectory's capability-chip cloud,
  // whose chips are rounded pills with a border on all four sides, so its last child
  // always reports a bottom border and the test was unconditionally red.
  const trailing = await page.evaluate(() =>
    [...document.querySelectorAll('main ul[class*="divide-y"]')].map((ul, i) => {
      const last = ul.lastElementChild;
      const w = last ? parseFloat(getComputedStyle(last).borderBottomWidth) : 0;
      return { list: i, width: w };
    }).filter((r) => r.width > 0));
  expect(trailing, `list(s) drawing a trailing rule: ${JSON.stringify(trailing)}`).toEqual([]);
});

test('teasers link to the full pages', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /All research/ })).toHaveAttribute('href', '/research');
  await expect(page.getByRole('link', { name: /All talks/ })).toHaveAttribute('href', '/talks');
  // Scoped to the section: unscoped with .last() this fell through to the nav's own
  // /salab-fame link and passed even with the teaser link deleted. Mutation-tested.
  await expect(page.getByTestId('built-more')).toHaveAttribute('href', '/salab-fame');
});
