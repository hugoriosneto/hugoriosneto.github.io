import { test, expect } from '@playwright/test';

test('lists every role with correct dates', async ({ page }) => {
  await page.goto('/cv');
  const cv = page.getByTestId('cv');
  await expect(cv).toContainText('01/2026 – now');
  await expect(cv).toContainText('07/2025 – 12/2025');
  await expect(cv).toContainText('07/2023 – 06/2025');
  await expect(cv).toContainText('04/2021 – 07/2023');
});

test('shows both degrees with the confirmed BSc dates', async ({ page }) => {
  await page.goto('/cv');
  const cv = page.getByTestId('cv');
  await expect(cv).toContainText('03/2018 – 08/2022');
  await expect(cv).toContainText('Computational Mathematics');
  await expect(cv).toContainText('defended 02/2026');
});

test('states no headcount and no reporting lines anywhere', async ({ page }) => {
  await page.goto('/cv');
  const text = await page.getByTestId('cv').innerText();
  expect(text).not.toMatch(/team of|reports? to|reported to|direct reports?/i);
});

test('the printed CV carries the name and contact details', async ({ page }) => {
  await page.goto('/cv');
  // Nav and footer are .no-print, so this block is the only place a printed CV
  // gets a name on it. Emulate print media rather than trusting the class name.
  await page.emulateMedia({ media: 'print' });
  const header = page.locator('.print-only');
  await expect(header).toBeVisible();
  await expect(header).toContainText('Hugo Rios-Neto');
  await expect(header).toContainText('LinkedIn');
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await expect(header).toBeHidden();
});

test('SALab appears under Founded, never under Experience', async ({ page }) => {
  await page.goto('/cv');
  // cv.astro filters Experience with a bare `r.id !== 'salab-fame'` string literal.
  // Rename that id in roles.yaml and SALab silently appears twice.
  await expect(page.getByTestId('cv-experience')).not.toContainText('SALab');
  await expect(page.getByTestId('cv-founded')).toContainText('SALab');
});

test('contains no trace of the old Einstein template', async ({ page }) => {
  await page.goto('/cv');
  // A pure negative passes against a 404 as happily as against a correct page. Assert
  // the CV actually rendered first, or this cannot tell "clean" from "absent".
  await expect(page.getByTestId('cv-experience')).toContainText('RSC Anderlecht');
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/Einstein|Nobel|Max Planck|Zurich/i);
});

test('every surface follows a change to the facts module', async ({ page }) => {
  // Step 0's whole purpose. The thesis defence date is rendered in three places and in
  // two formats; a sentinel check found /cv silently not following, because its date
  // column was an independent literal.
  await page.goto('/cv');
  await expect(page.getByTestId('cv-education')).toContainText('02/2026');
  await expect(page.getByTestId('cv-education')).toContainText('Towards Learning Representations');
  await page.goto('/research');
  await expect(page.getByTestId('thesis')).toContainText('February 2026');
  await page.goto('/');
  await expect(page.locator('body')).toContainText('February 2026');
});

test('lists both MLSA editions and the Opta win', async ({ page }) => {
  await page.goto('/cv');
  const cv = page.getByTestId('cv');
  await expect(cv).toContainText('12th and 13th editions');
  await expect(cv).toContainText('Opta Pro Forum');
});
