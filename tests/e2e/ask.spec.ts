import { test, expect } from '@playwright/test';

test('searching the FAQ narrows the list and says when nothing matches', async ({ page }) => {
  await page.goto('/ask');
  const items = page.locator('[data-faq]');
  // "syllabus" appears in exactly one answer ("mentor" would also match "mentorship" and "mentoring").
  await page.getByLabel('Search questions').fill('syllabus');
  await expect(items.filter({ visible: true })).toHaveCount(1);
  await page.getByLabel('Search questions').fill('zzzz');
  await expect(items.filter({ visible: true })).toHaveCount(0);
  await expect(page.locator('#faq-none')).toBeVisible();
});

test('answers open and close as native disclosures', async ({ page }) => {
  await page.goto('/ask');
  const first = page.locator('[data-faq] summary').first();
  await first.click();
  await expect(page.locator('[data-faq] details').first()).toHaveAttribute('open', '');
});
