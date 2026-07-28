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
  await page.getByRole('button', { name: /RSC Anderlecht/ }).click();
  await expect(page.getByTestId('trajectory-chips').locator('.sr-only')).toHaveCount(2);
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
