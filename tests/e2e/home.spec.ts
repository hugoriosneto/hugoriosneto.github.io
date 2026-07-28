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

/** The candidate this engine actually picked, plus the box it picked it for. */
async function resolvedCandidate(browser: import('@playwright/test').Browser,
                                 width: number, deviceScaleFactor: number) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor });
  const p = await ctx.newPage();
  await p.goto('/');
  await p.evaluate(() => document.fonts.ready);
  const r = await p.getByTestId('hero').getByRole('img').evaluate((el: HTMLImageElement) => {
    const map = new Map<string, number>();
    for (const c of (el.getAttribute('srcset') ?? '').split(',')) {
      const [u, w] = c.trim().split(/\s+/);
      if (u && w) map.set(u.split('/').pop()!, Number(w.replace('w', '')));
    }
    return {
      box: el.getBoundingClientRect().width,
      resolved: map.get(el.currentSrc.split('/').pop()!) ?? 0,
      largest: Math.max(...map.values()),
    };
  });
  await ctx.close();
  return r;
}

test('the portrait resolves a candidate sized to its box, and the list stops at 2x', async ({ page, browser }) => {
  // RENAMED. This was "…so a phone skips the desktop asset", which the two string
  // matches under it never asserted — and which is not even true: a 375px DPR3 phone
  // needs 981 device px and therefore resolves to the LARGEST candidate on the list.
  // The name now states the contract the assertions actually check.
  // ORDER MATTERS. Real resolution is asserted FIRST. With the string matches on top,
  // any mutation of `sizes` tripped a regex and the loop below never ran — an assertion
  // that cannot be reached is an assertion that cannot fail. Mutating `sizes` alone now
  // fails here, on what the browser actually fetched.
  //
  // Measured ratios: 1.00 at every DPR1 width (1.04 at 375, where a 327px box takes the
  // 340 candidate) and 1.00 at 768/1280 DPR2. The ceilings sit just above that, so
  // drifting the CSS box away from `sizes` in either direction trips one of them.
  for (const [width, dpr] of [[375, 1], [768, 1], [896, 1], [1280, 1], [768, 2], [1280, 2]] as const) {
    const r = await resolvedCandidate(browser, width, dpr);
    expect(r.resolved, `${width}@${dpr}x resolved nothing`).toBeGreaterThan(0);
    expect(r.resolved, `${width}@${dpr}x: ${r.resolved}w is blurry on a ${r.box}px box`)
      .toBeGreaterThanOrEqual(r.box * dpr - 1);
    expect(r.resolved, `${width}@${dpr}x: ${r.resolved}w over-fetches a ${r.box}px box`)
      .toBeLessThanOrEqual(r.box * dpr * (dpr === 1 ? 1.15 : 1.10));
  }

  // The 2x ceiling, stated rather than implied: a 390px DPR3 phone wants 1026 device px,
  // finds nothing above 1130 and settles for the top of the list at 3.30x its CSS box.
  // That is the trade — do not "fix" it by adding a 1695 candidate.
  //
  // The bound is 1131px, NOT a multiple of this phone's box. An earlier draft asserted
  // resolved/box < 4, which cannot fail: the source portrait is intrinsically 1260px
  // wide, Astro clamps every candidate to it, and 1260/342 is 3.68. 1131 is 2x the
  // widest CSS box the portrait ever occupies (the 565.3px 56ch cap), so it is the
  // actual definition of "2x-class" and a candidate above it does fail.
  const phone = await resolvedCandidate(browser, 390, 3);
  expect(phone.resolved, 'a DPR3 phone no longer lands on the top candidate').toBe(phone.largest);
  expect(phone.resolved, `a DPR3 phone pulled ${phone.resolved}w — above the 2x ceiling`)
    .toBeLessThanOrEqual(1131);

  await page.goto('/');
  const portrait = portraitOf(page);
  const declared = await portrait.evaluate((el: HTMLImageElement) =>
    (el.getAttribute('srcset') ?? '').split(',')
      .map((c) => Number(c.trim().split(/\s+/)[1]?.replace('w', ''))));
  // widths + sizes, not densities: densities emits 1x/2x descriptors, which force every
  // viewport to reason from the desktop candidate. The list is exact because each entry
  // pairs with a CSS boundary — 340 and 680 for the desktop column, 565 and 1130 for the
  // 56ch cap below the split. 1130 is a deliberate ceiling: nothing above it, so a DPR3
  // phone takes the top of the list instead of pulling a 3x asset.
  expect(declared).toEqual([280, 340, 400, 565, 680, 800, 1130]);
  // sizes must track the same boundaries or the tablet band fetches the wrong candidate.
  await expect(portrait).toHaveAttribute('sizes', /\(min-width:\s*896px\)\s*340px/);
  await expect(portrait).toHaveAttribute('sizes', /\(min-width:\s*613px\)\s*565px/);
  await expect(portrait).toHaveAttribute('sizes', /calc\(100vw\s*-\s*3rem\)/);
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

/**
 * Words on the last visual line of the thinnest-ending h1 sentence.
 *
 * Counting lines via Range.getClientRects() over the whole span does NOT work: it
 * returns one rect per DOM fragment, not per visual line, and every sentence contains
 * a nested <span class="highlight">. A five-word sentence yields five rects and the
 * ratio computes to 1 regardless of how it actually wraps. So walk word by word and
 * group by the top edge instead, then count the words sharing the lowest line.
 */
const worstOrphan = (page: import('@playwright/test').Page) =>
  page.locator('h1 > span.block').evaluateAll((spans) =>
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

test('no sentence in the h1 ends on a one-word orphan', async ({ page }) => {
  await page.goto('/');
  // At the project default — 1280 desktop, 390 mobile. Balanced, all three sentences
  // break onto two lines carrying at least two words onto the second.
  expect(await worstOrphan(page), 'a sentence in the h1 ends on a single stranded word')
    .toBeGreaterThan(1);
});

// --- the tablet band ------------------------------------------------------------
// Everything below runs at widths the two Playwright projects never visit. The orphan
// test above only ever ran at 1280 and 390, which is exactly why it did not see the
// defect: the hero split into two columns at md: (768) while Base.astro's max-w-4xl +
// px-6 container does not reach its full 848px until viewport 896, so from 768 to 895
// the text column was crushed to 332–398px. Measured before the fix, at 768: column
// 332px, and both "department." and "conference." stranded alone on their own line.
// 768 / 810 / 820 / 834 are iPad 9th, 10th, Air and Pro 11" in portrait; 895 is the
// last pixel before the split.
const BAND = [768, 810, 820, 834, 895];

test('the h1 keeps its balanced wrap across the tablet band', async ({ page }) => {
  for (const width of BAND) {
    await page.setViewportSize({ width, height: 1024 });
    await page.goto('/');
    expect(await worstOrphan(page), `a sentence in the h1 strands one word at ${width}px`)
      .toBeGreaterThan(1);
  }
});

test('the hero text column stays full width across the tablet band', async ({ page }) => {
  // The floor is 440px because that is just under the 460px the column locks at from 896
  // up, and far above the 332–398px the md: split produced. This is the assertion that
  // bites at 820, where the pre-fix column (384px) was still wide enough to avoid an
  // orphan — the orphan test alone would have passed there.
  for (const width of BAND) {
    await page.setViewportSize({ width, height: 1024 });
    await page.goto('/');
    const m = await page.getByTestId('hero').evaluate((hero) => {
      const col = hero.firstElementChild!;
      const lead = hero.querySelector('p')!;
      return {
        col: col.getBoundingClientRect().width,
        lead: lead.getBoundingClientRect().width,
      };
    });
    expect(m.col, `hero text column is only ${m.col}px at ${width}px`).toBeGreaterThanOrEqual(440);
    // max-w-[56ch] on the lead is 565.3px. Below ~613 the column is the binding
    // constraint; through this band the cap must be what binds, not the column — that
    // is the difference between a readable measure and a 332px one.
    expect(m.lead, `the lead measures only ${m.lead}px at ${width}px`).toBeGreaterThanOrEqual(500);
  }
});

test('the portrait shares both edges with the identity rule below the split', async ({ page }) => {
  // The whole justification for max-w-[56ch] on the portrait: 56ch is the cap already on
  // the lead and the identity block, so the photo's left and right edges land on exactly
  // the same two verticals as the rule above it. Pinned at 280px it aligned to nothing —
  // the rule ran to 327px at 375, 366px at 414 and 565.3px at 767 — and the photo read
  // as a thumbnail that had failed to load.
  for (const width of [375, 414, 613, 767, ...BAND]) {
    await page.setViewportSize({ width, height: 1024 });
    await page.goto('/');
    const m = await page.getByTestId('hero').evaluate((hero) => {
      const rule = hero.querySelector('.border-t-2')!.getBoundingClientRect();
      const img = hero.querySelector('img')!.getBoundingClientRect();
      return { ruleL: rule.left, ruleR: rule.right, imgL: img.left, imgR: img.right, imgW: img.width };
    });
    // Non-zero floor first: two collapsed boxes would otherwise "align" perfectly at 0.
    expect(m.imgW, `the portrait collapsed at ${width}px`).toBeGreaterThan(200);
    expect(Math.abs(m.imgL - m.ruleL),
      `at ${width}px the portrait starts at ${m.imgL}, the rule at ${m.ruleL}`).toBeLessThan(1);
    expect(Math.abs(m.imgR - m.ruleR),
      `at ${width}px the portrait ends at ${m.imgR}, the rule at ${m.ruleR}`).toBeLessThan(1);
  }

  // Pinned from above as well, or "below the split" is satisfiable by never splitting:
  // at 896 — the first width at which max-w-4xl stops growing — the portrait must be
  // beside the text column, not under it.
  await page.setViewportSize({ width: 896, height: 1024 });
  await page.goto('/');
  const gap = await page.getByTestId('hero').evaluate((hero) =>
    hero.querySelector('img')!.getBoundingClientRect().left
    - hero.querySelector('.border-t-2')!.getBoundingClientRect().right);
  expect(gap, 'the hero did not split into two columns at 896px').toBeGreaterThan(0);
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
