import { test, expect } from '@playwright/test';

test('hero leads with the trust headline and the demo action', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Make parents proud');
  await expect(page.locator('.hero').getByRole('link', { name: 'Book free demo' })).toHaveAttribute('href', '/demo');
  await expect(page.locator('.hero').getByRole('link', { name: 'Our story' })).toHaveAttribute('href', '/story');
});

test('about shows four featured chapters and links to the story', async ({ page }) => {
  await page.goto('/');
  const about = page.locator('#about');
  await expect(about.locator('li.chapter')).toHaveCount(4);
  await expect(about.getByRole('link', { name: 'Read our story' })).toHaveAttribute('href', '/story');
});

test('founders appear in the client order with photos', async ({ page }) => {
  await page.goto('/');
  const names = page.locator('#founders .founder-name');
  await expect(names).toHaveText(['Mohamed Rayees', 'Dhanesh Narayanan Achari', 'Mohamed Shihas K. Y.', 'Shanu K. Y.']);
  await expect(page.locator('#founders img')).toHaveCount(4);
});
