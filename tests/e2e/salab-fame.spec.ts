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
  await expect(page.getByTestId('fame-sponsors')).toHaveCount(0);
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
  await ctx.close();
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
