import { test, expect } from '@playwright/test';

test('offers all five editions as tabs', async ({ page }) => {
  await page.goto('/salab-fame');
  await expect(page.getByRole('tab')).toHaveCount(5);
});

test('opens on the most recent edition that has actually happened', async ({ page }) => {
  await page.goto('/salab-fame');
  // Not the last tab — that is the upcoming one, whose panel is nearly empty.
  await expect(page.getByTestId('fame-panel')).toContainText('3 September 2025');
});

test('switching edition swaps the panel', async ({ page }) => {
  await page.goto('/salab-fame');
  await page.getByRole('tab', { name: /2022/ }).click();
  const panel = page.getByTestId('fame-panel');
  await expect(panel).toContainText('21 October 2022');
  await expect(panel).toContainText('first football analytics event');
});

test('shows sponsors where there are any and omits the row where there are none', async ({ page }) => {
  await page.goto('/salab-fame');
  await page.getByRole('tab', { name: /2024/ }).click();
  await expect(page.getByTestId('fame-panel')).toContainText('OneFan');
  await page.getByRole('tab', { name: /2022/ }).click();
  // Visibility, not count: every edition's panel is in the DOM now, so '24's sponsors
  // line still exists — it is just inside a hidden panel. Scoped to #fame-panel-2 (2024
  // is the third edition, index 2): the unscoped fame-panel testid is the wrapper around
  // all five panels, and 2023/2024/2025 all carry sponsors, so an unscoped query for
  // fame-sponsors resolves to three elements and fails strict mode outright.
  await expect(page.locator('#fame-panel-2').getByTestId('fame-sponsors')).toBeHidden();
});

test('renders the upcoming edition without a programme', async ({ page }) => {
  await page.goto('/salab-fame');
  await page.getByRole('tab', { name: /2026/ }).click();
  const panel = page.getByTestId('fame-panel');
  await expect(panel).toContainText('Programme to be announced');
  await expect(panel).toContainText('Upcoming');
});

test('the default edition is server-rendered, so it survives with JavaScript off', async ({ browser }) => {
  // The panel used to be an empty div the script filled. With scripts off that lost the
  // whole of FAME — on the page that exists to carry it.
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto('/salab-fame');
  const panel = p.getByTestId('fame-panel');
  await expect(panel).toContainText('3 September 2025');
  await expect(panel).toContainText('4th edition');
  await expect(panel).toContainText('Gradient Sports');
  // Every edition is in the served HTML, not only the default. Spec §3 singles out FAME
  // '26 as "a fact, not an aspiration", and this date previously appeared in zero
  // rendered bytes anywhere on the site without JavaScript.
  await expect(p.locator('#fame-panel-4')).toContainText('28 September 2026');
  await expect(p.locator('#fame-panel-4')).toContainText('Upcoming');
  await ctx.close();
});

test('the panels are reachable by keyboard', async ({ page }) => {
  await page.goto('/salab-fame');
  // None of the panels contains a focusable element, so without tabindex="0" Tab jumps
  // from the tablist straight to the footer and the selected content is unreachable.
  // axe has no rule for this — Task 19's gate would pass it.
  const tabbable = await page.locator('.fame-panel:not([hidden])').getAttribute('tabindex');
  expect(tabbable).toBe('0');
});

test('the upcoming badge is a separate word', async ({ page }) => {
  await page.goto('/salab-fame');
  await page.getByRole('tab', { name: /2026/ }).click();
  // ml-2 gives the visual gap but no word boundary; this read as "5th editionUPCOMING".
  await expect(page.getByTestId('fame-panel')).toContainText('5th edition Upcoming');
});

test('the page links out to both institutions', async ({ page }) => {
  await page.goto('/salab-fame');
  // The page whose whole function is proof previously had zero outbound links.
  await expect(page.getByTestId('salab-link')).toHaveAttribute('href', 'https://salabufmg.github.io/');
  await expect(page.getByTestId('fame-link')).toHaveAttribute('href', 'https://salabufmg.github.io/FAME26/');
  await expect(page.getByTestId('salab-link')).toHaveAttribute('rel', 'noopener');
});

test('the tablist stays on one row at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/salab-fame');
  const rows = await page.getByRole('tab').evaluateAll((els) =>
    new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size);
  expect(rows, '2026 orphans onto a second row').toBe(1);
});

test('Home and End jump to the ends of the tablist', async ({ page }) => {
  await page.goto('/salab-fame');
  const tab = page.getByRole('tab', { name: /2024/ });
  await tab.click();
  await tab.press('Home');
  await expect(page.getByTestId('fame-panel')).toContainText('21 October 2022');
  await page.getByRole('tab', { name: /2022/ }).press('End');
  await expect(page.getByTestId('fame-panel')).toContainText('28 September 2026');
});

test('tabs are keyboard navigable', async ({ page }) => {
  await page.goto('/salab-fame');
  const first = page.getByRole('tab', { name: /2022/ });
  await first.click();
  // locator.press so this exercises WebKit too — see the note on Tab in Task 11.
  await first.press('ArrowRight');
  await expect(page.getByTestId('fame-panel')).toContainText('17 November 2023');
});
