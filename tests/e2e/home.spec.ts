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
