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

// --- the hero portrait ---------------------------------------------------------
// Scoped through getByTestId('hero') everywhere. The homepage carries exactly one
// <img> today, so an unscoped locator would pass — but the research teaser renders a
// slice of the same collection that /research renders with four thumbnails, and the
// day it grows thumbnails here, an unscoped getByRole('img') starts asserting
// eager/high-priority/4:5 against a paper cover instead of the portrait.
const portraitOf = (scope: import('@playwright/test').Page) =>
  scope.getByTestId('hero').getByRole('img');

test('the hero portrait renders with a non-empty accessible name', async ({ page }) => {
  await page.goto('/');
  const portrait = portraitOf(page);
  // Exactly one: getByRole('img') never matches alt="" (that is role=presentation),
  // so a count of 1 already proves the image is named rather than decorative.
  await expect(portrait).toHaveCount(1);
  await expect(portrait).toBeVisible();
  const name = (await portrait.getAttribute('alt')) ?? '';
  expect(name.trim().length, 'the portrait has an empty accessible name').toBeGreaterThan(0);
  expect(name).toContain('Hugo Rios-Neto');
});

test('the portrait is eager and high priority, never lazy', async ({ page }) => {
  await page.goto('/');
  const portrait = portraitOf(page);
  // On desktop the portrait is above the fold and is the LCP element. loading="lazy"
  // would push the largest paint behind the lazy-load heuristic and cost the 0.95
  // performance gate; fetchpriority="high" is what pulls it ahead of the fonts.
  await expect(portrait).not.toHaveAttribute('loading', 'lazy');
  await expect(portrait).toHaveAttribute('loading', 'eager');
  await expect(portrait).toHaveAttribute('fetchpriority', 'high');
});

test('the portrait offers width candidates so a phone skips the desktop asset', async ({ page }) => {
  await page.goto('/');
  const portrait = portraitOf(page);
  // widths + sizes, not densities: densities emits 1x/2x descriptors, which force
  // every viewport to reason from the desktop candidate.
  await expect(portrait).toHaveAttribute('srcset', /\b280w\b/);
  await expect(portrait).toHaveAttribute('sizes', /340px/);
});

test('the portrait renders as a non-zero 4:5 box', async ({ page }) => {
  await page.goto('/');
  const portrait = portraitOf(page);
  await expect(portrait).toBeVisible();
  const box = await portrait.evaluate((el: HTMLImageElement) => {
    const r = el.getBoundingClientRect();
    return {
      w: r.width, h: r.height,
      naturalW: el.naturalWidth, naturalH: el.naturalHeight,
      attrW: Number(el.getAttribute('width')), attrH: Number(el.getAttribute('height')),
    };
  });
  // Non-zero asserted on each side in absolute px before any ratio: a 0x0 box makes
  // w/h NaN in some engines and NaN comparisons are not what this test is for. The
  // floors are well under the 280px phone rendering and well over a collapsed box.
  expect(box.w, 'the portrait rendered with no width').toBeGreaterThan(200);
  expect(box.h, 'the portrait rendered with no height').toBeGreaterThan(250);
  // Decoded, not a broken-image placeholder.
  expect(box.naturalW, 'the portrait never decoded').toBeGreaterThan(0);
  // 4:5 = 0.8. Both engines measure the border-box rect at exactly 340x425 (desktop)
  // and 280x350 (phone), so the tolerance is only absorbing sub-pixel rounding, not
  // covering for a shape that is off. Mutation-tested at md:h-[300px] — 1.13, fails.
  expect(box.w / box.h, `portrait box is ${box.w}x${box.h}`).toBeCloseTo(0.8, 2);
  // The intrinsic attributes are what reserve the box before the bytes land — this
  // is the no-layout-shift guarantee, and it is 4:5 exactly.
  expect(box.attrW / box.attrH, `width/height attrs are ${box.attrW}x${box.attrH}`).toBeCloseTo(0.8, 5);
});

test('the portrait stays inside the viewport and the text column on a phone', async ({ page }) => {
  // 375 is the spec width. 320 is added because that is where the clamp starts doing
  // work: the column is 272px there against a 280px image, so with the clamp defeated
  // the photo hangs 8px into the page gutter while still sitting inside the viewport —
  // which is why the column edge is asserted separately and not folded into the
  // viewport check. Mutation-tested: max-w-none alone fails only the column assertion,
  // max-w-none with a wrong width class fails both.
  // Note the clamp is Tailwind preflight's `img{max-width:100%}`, not the `max-w-full`
  // in the class list, which restates it. Removing `max-w-full` alone changes nothing
  // and this test correctly does not fire on it.
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/');
    const m = await portraitOf(page).evaluate((el) => {
      const main = el.closest('main')!;
      const mr = main.getBoundingClientRect();
      const pad = parseFloat(getComputedStyle(main).paddingRight);
      return {
        right: el.getBoundingClientRect().right,
        columnRight: mr.right - pad,
        viewport: document.documentElement.clientWidth,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(m.right, `portrait right edge ${m.right} past the ${m.viewport}px viewport at ${width}px`)
      .toBeLessThanOrEqual(m.viewport + 1);
    expect(m.right, `portrait right edge ${m.right} past the column edge ${m.columnRight} at ${width}px`)
      .toBeLessThanOrEqual(m.columnRight + 1);
    expect(m.overflow, `the page scrolls horizontally at ${width}px`).toBeLessThanOrEqual(1);
  }
});

test('on a phone the claim comes before the portrait', async ({ page }) => {
  // Deliberate source order: the h1 is the strongest claim on the site, so when the
  // grid collapses to one column the photograph must land after the identity block,
  // not between the reader and the sentence.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const [h1Bottom, legendBottom, imgTop] = await Promise.all([
    page.locator('h1').evaluate((e) => e.getBoundingClientRect().bottom),
    page.getByTestId('legend').evaluate((e) => e.getBoundingClientRect().bottom),
    portraitOf(page).evaluate((e) => e.getBoundingClientRect().top),
  ]);
  expect(imgTop, `portrait top ${imgTop} is not below the h1 bottom ${h1Bottom}`).toBeGreaterThan(h1Bottom);
  expect(imgTop, `portrait top ${imgTop} is not below the legend bottom ${legendBottom}`).toBeGreaterThan(legendBottom);
});

test('the portrait is server-rendered, so it survives with JavaScript off', async ({ browser }) => {
  // astro:assets emits a plain <img> at build time; nothing here should depend on a
  // client bundle, a content blocker, or a crawler that runs JS.
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto('/');
  const portrait = portraitOf(p);
  await expect(portrait).toBeVisible();
  await expect(portrait).toHaveAttribute('src', /portrait/);
  await expect(portrait).toHaveAttribute('alt', /Hugo Rios-Neto/);
  await ctx.close();
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

test('both "Co-" role clauses use a non-breaking hyphen', async ({ page }) => {
  await page.goto('/');
  // U+2011, not the ASCII U+002D. With a plain hyphen both clauses break after it at
  // every legend width under ~370px (measured at 375, 414 and 768), leaving a line that
  // ends "Co-". Asserting the character is what keeps a later tidy-up of the HTML entity
  // from silently reintroducing the break — the rendered text looks identical here.
  const text = (await page.getByTestId('legend').textContent()) ?? '';
  expect(text).toContain('Co‑founder');
  expect(text).toContain('Co‑organizer');
  expect(text, 'an ASCII hyphen came back in a "Co-" clause').not.toMatch(/Co-(founder|organizer)/);
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
