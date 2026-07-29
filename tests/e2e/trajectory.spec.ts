import { test, expect } from '@playwright/test';

test('starts on the most recent role', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('trajectory-detail')).toContainText('RSC Anderlecht');
});

test('capabilities accumulate rather than replace', async ({ page }) => {
  await page.goto('/');
  const chips = page.getByTestId('trajectory-chips').locator('li');

  await page.getByRole('button', { name: /Atlético Mineiro/ }).click();
  const first = await chips.count();
  await expect(chips).toContainText(['Built a department from zero']);

  await page.getByRole('button', { name: /RSC Anderlecht/ }).click();
  const last = await chips.count();

  expect(last).toBeGreaterThan(first);
  // The earliest capability is still on screen at the final stop.
  await expect(page.getByTestId('trajectory-chips')).toContainText('Built a department from zero');
  await expect(page.getByTestId('trajectory-chips')).toContainText('Recruitment decision-making');
});

test('selecting a stop updates the detail panel', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Orlando City SC/ }).click();
  const detail = page.getByTestId('trajectory-detail');
  await expect(detail).toContainText('Orlando City SC');
  await expect(detail).toContainText('Owned');
});

test('never shows headcount or reporting lines, in the detail OR the chips', async ({ page }) => {
  await page.goto('/');
  for (const org of ['Atlético Mineiro', 'Gemini Sports Analytics', 'Orlando City SC', 'RSC Anderlecht']) {
    await page.getByRole('button', { name: new RegExp(org) }).click();
    // Both surfaces — an earlier version read only the detail panel, which left the
    // accumulated capability chips with no coverage at any layer.
    const detail = await page.getByTestId('trajectory-detail').innerText();
    const chips = await page.getByTestId('trajectory-chips').innerText();
    expect(detail + '\n' + chips).not.toMatch(/team of|reports? to|reported to|headcount/i);
  }
});

test('is keyboard operable with arrow keys', async ({ page }) => {
  await page.goto('/');
  // locator.press, not keyboard.press after a Tab walk — WebKit does not Tab to
  // links or buttons by default, so a Tab-based version passes vacuously on mobile.
  const first = page.getByRole('button', { name: /Atlético Mineiro/ });
  await first.focus();
  await first.press('ArrowRight');
  await expect(page.getByTestId('trajectory-detail')).toContainText('SALab');
});

test('marks the selected stop for assistive tech', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Gemini/ }).click();
  await expect(page.getByRole('button', { name: /Gemini/ })).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('.traj-stop[aria-current="true"]')).toHaveCount(1);
});

test('announces the change and names the chip list', async ({ page }) => {
  await page.goto('/');
  // Without aria-live the panel changes silently behind a screen-reader user, which
  // makes the site's signature interaction invisible without sight.
  await expect(page.getByTestId('trajectory-detail')).toHaveAttribute('aria-live', 'polite');
  await expect(page.getByTestId('trajectory-chips')).toHaveAttribute('aria-labelledby', 'traj-added');
  await expect(page.getByRole('button', { name: /Gemini/ })).toHaveAttribute('aria-controls', 'traj-detail');
});

test('marks new chips with text, not only colour', async ({ page }) => {
  await page.goto('/');
  // Freshness was encoded only in border and text colour — WCAG 1.4.1, and invisible
  // to assistive tech. The two Anderlecht chips are the new ones at the final stop.
  // Marking is per selected stop, not "only ever the last of the five": each stop's own
  // newly-revealed chips are the ones flagged. Anderlecht contributes two.
  await page.getByRole('button', { name: /RSC Anderlecht/ }).click();
  await expect(page.getByTestId('trajectory-chips').locator('.sr-only')).toHaveCount(2);
  // Atlético contributes two of its own, so this is 2 rather than 0.
  await page.getByRole('button', { name: /Atlético Mineiro/ }).click();
  await expect(page.getByTestId('trajectory-chips').locator('.sr-only')).toHaveCount(2);
  // Orlando contributes exactly one — the clearest proof the count tracks the stop.
  await page.getByRole('button', { name: /Orlando City SC/ }).click();
  await expect(page.getByTestId('trajectory-chips').locator('.sr-only')).toHaveCount(1);
});

test('Home and End jump to the ends of the rail', async ({ page }) => {
  await page.goto('/');
  const gemini = page.getByRole('button', { name: /Gemini/ });
  await gemini.click();
  await gemini.press('Home');
  await expect(page.getByTestId('trajectory-detail')).toContainText('Atlético Mineiro');
  await page.getByRole('button', { name: /Atlético Mineiro/ }).press('End');
  await expect(page.getByTestId('trajectory-detail')).toContainText('RSC Anderlecht');
});

test('the play control walks through every stop', async ({ page }) => {
  await page.goto('/');
  // On touch there is no hover, so without this the interaction is "poke an unlabelled
  // dot and hope". Spec §6 calls for it.
  await page.getByRole('button', { name: /Play/ }).click();
  await expect(page.getByTestId('trajectory-detail')).toContainText('Atlético Mineiro');
  await expect(page.getByTestId('trajectory-detail')).toContainText('RSC Anderlecht', { timeout: 8000 });
});

test('splits on the same 896 boundary as the hero, so the chips never single-file', async ({ page }) => {
  // The trajectory used to split at md: (768) while the hero splits at 896. At 768 the
  // 1fr chip column resolved to 320px against ~326px of chips, which tipped all 12
  // capability chips into a 12-row single-file stack and grew this section by ~250px.
  // Measured before the fix: 12 rows at 768, 810 and 820; after: 4, 4 and 3.
  for (const width of [768, 810, 820]) {
    await page.setViewportSize({ width, height: 1024 });
    await page.goto('/');
    const m = await page.evaluate(() => {
      const chips = document.getElementById('traj-chips')!;
      const rows = new Set([...chips.children].map((c) => Math.round(c.getBoundingClientRect().top)));
      const detail = document.getElementById('traj-detail')!.getBoundingClientRect();
      return { count: chips.children.length, rows: rows.size, detailL: detail.left,
               chipsL: chips.getBoundingClientRect().left };
    });
    // Guard the denominator: 12 chips must actually be on screen, or "few rows" is free.
    expect(m.count, `only ${m.count} chips rendered at ${width}px`).toBe(12);
    expect(m.rows, `the 12 chips stacked into ${m.rows} rows at ${width}px`).toBeLessThanOrEqual(6);
    // Stacked, not columned — the chip block starts at the detail block's left edge.
    expect(Math.abs(m.chipsL - m.detailL),
      `at ${width}px the trajectory is still two columns`).toBeLessThan(1);
  }

  // And it does split, at the same pixel the hero does.
  await page.setViewportSize({ width: 896, height: 1024 });
  await page.goto('/');
  const split = await page.evaluate(() => {
    const chips = document.getElementById('traj-chips')!.getBoundingClientRect();
    const detail = document.getElementById('traj-detail')!.getBoundingClientRect();
    return chips.left - detail.right;
  });
  expect(split, 'the trajectory did not split into two columns at 896px').toBeGreaterThan(0);
});

test('the final stop is server-rendered, so it survives with JavaScript off', async ({ browser }) => {
  // The script is is:inline, so this covers content blockers, any future CSP (Astro
  // does not hash or nonce inline scripts) and crawlers that do not run JS —
  // LinkedIn's preview bot among them, and spec §7 makes LinkedIn the de facto inbox.
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto('/');
  await expect(p.getByTestId('trajectory-detail')).toContainText('RSC Anderlecht');
  await expect(p.getByTestId('trajectory-detail')).toContainText('Recruitment analytics');
  await expect(p.getByTestId('trajectory-chips').locator('li')).toHaveCount(12);
  await ctx.close();
});

test('the rail survives forced-colors', async ({ page, browserName }) => {
  // The rail is drawn entirely in backgrounds, and forced-colors strips both kinds.
  // Measured before the fix, in Chromium at 1280: the track's background-color went
  // rgb(221,208,164) -> rgb(255,255,255) (Canvas) and #traj-progress's inline
  // linear-gradient went -> none, with border-top-width 0px on both. The entire rail
  // disappeared, leaving five hollow circles between the labels "2021" and "now" with
  // nothing joining them — both the timeline and the how-far-along encoding gone.
  await page.goto('/');
  await page.emulateMedia({ media: 'screen', forcedColors: 'active', colorScheme: 'light' });

  const m = await page.evaluate(() => {
    // Read the live system colours rather than hard-coding a palette: Chromium and
    // WebKit resolve Highlight differently and both are legitimate.
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    const sys = (kw: string) => { probe.style.color = kw; return getComputedStyle(probe).color; };
    const sysHighlight = sys('Highlight');
    const sysCanvasText = sys('CanvasText');
    const sysCanvas = sys('Canvas');
    probe.remove();
    const read = (id: string) => {
      const el = document.getElementById(id)!;
      const s = getComputedStyle(el);
      return { width: parseFloat(s.borderTopWidth), color: s.borderTopColor };
    };
    return { track: read('traj-track'), prog: read('traj-progress'),
             sysHighlight, sysCanvasText, sysCanvas };
  });

  // A border keyed to a system colour is the one paint that survives forced-colors with
  // no forced-color-adjust opt-out — the same mechanism .highlight relies on. A literal
  // hex here would be forced to CanvasText and the progress bar would become
  // indistinguishable from the track, which is what the colour assertions below catch.
  expect.soft(m.track.width, 'the rail track has no forced-colors fallback').toBeGreaterThan(0);
  expect.soft(m.prog.width, 'the progress bar has no forced-colors fallback').toBeGreaterThan(0);
  expect.soft(m.track.color, 'the track is painted in Canvas — invisible').not.toBe(m.sysCanvas);
  expect.soft(m.prog.color, 'the progress bar is painted in Canvas — invisible').not.toBe(m.sysCanvas);
  expect.soft(m.prog.color, 'the progress bar is not the system Highlight').toBe(m.sysHighlight);
  expect.soft(m.track.color, 'the track is not the system CanvasText').toBe(m.sysCanvasText);
  // The "how far along" encoding only exists if the two bars differ from each other.
  expect.soft(m.prog.color, 'progress and track are the same colour — no progress is readable')
    .not.toBe(m.track.color);

  // WebKit's forced-colors emulation flips the media query but forces no palette — its
  // track keeps rgb(221,208,164) and its progress bar keeps the gradient — so the pixel
  // half below has nothing to measure there and would pass for the wrong reason.
  if (browserName !== 'chromium') return;

  // The assertion that actually bites: the rail must be INK on the page, not merely
  // carry the right computed values. Sample the rail's own centre row.
  const rail = page.getByTestId('trajectory-rail');
  await rail.scrollIntoViewIfNeeded();
  const box = await page.evaluate(() => {
    const t = document.getElementById('traj-track')!.getBoundingClientRect();
    return { x: t.x, y: t.y, w: t.width, h: t.height, dpr: window.devicePixelRatio };
  });
  const shot = await page.screenshot({
    clip: { x: box.x, y: box.y - 4, width: box.w, height: box.h + 8 },
  });
  const ink = await page.evaluate(async ({ b64, dpr, h }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0);
    const row = Math.round((4 + h / 2) * dpr);
    let painted = 0;
    for (let x = 0; x < c.width; x++) {
      const d = g.getImageData(x, row, 1, 1).data;
      if (!(d[0] > 245 && d[1] > 245 && d[2] > 245)) painted++;
    }
    return { painted, total: c.width };
  }, { b64: shot.toString('base64'), dpr: box.dpr, h: box.h });

  // The five stop dots sit on top of the rail and punch Canvas-coloured holes in it —
  // measured 5 runs totalling ~80 of 832 columns — so the floor is 85%, not 100%.
  // Before the fix this row was 0% painted end to end.
  expect(ink.painted / ink.total,
    `only ${ink.painted}/${ink.total} columns of the rail are painted in forced-colors`)
    .toBeGreaterThan(0.85);
});
