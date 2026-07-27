import { test, expect } from '@playwright/test';

test('nav exposes all five pages and marks the current one', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  for (const label of ['Research', 'SALab & FAME', 'Talks', 'CV']) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible();
  }
});

test('footer shows social links and no email address', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'LinkedIn' })).toBeVisible();
  const html = await page.content();
  expect(html).not.toMatch(/mailto:/);
  expect(html).not.toMatch(/@dcc\.ufmg\.br/);
});

test('page declares schema.org Person data', async ({ page }) => {
  await page.goto('/');
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(ld!)['@type']).toBe('Person');
});
