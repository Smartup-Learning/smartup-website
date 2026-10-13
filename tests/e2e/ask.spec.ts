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

test('a search hides category headings that have no matching questions', async ({ page }) => {
  await page.goto('/ask');
  await page.getByLabel('Search questions').fill('syllabus');
  await expect(page.locator('.group h3').filter({ visible: true })).toHaveCount(1);
  await page.getByLabel('Search questions').fill('');
  await expect(page.locator('.group h3').filter({ visible: true })).toHaveCount(await page.locator('.group').count());
});

test('topic chips and the search box narrow the questions together', async ({ page }) => {
  await page.goto('/ask');
  const items = page.locator('[data-faq]');
  await page.getByRole('button', { name: 'Parents', exact: true }).click();
  expect(await items.filter({ visible: true }).count()).toBeGreaterThan(0);
  await expect(page.locator('.group h3').filter({ visible: true })).toHaveText(['Parents']);
  await page.getByLabel('Search questions').fill('zzzz');
  await expect(items.filter({ visible: true })).toHaveCount(0);
  await page.getByLabel('Search questions').fill('');
  await page.getByRole('button', { name: 'All topics' }).click();
  await expect(items.filter({ visible: true })).toHaveCount(await items.count());
});

test('each question shows a plus sign inside the page edge that turns into a minus when open', async ({ page }) => {
  await page.goto('/ask');
  const summary = page.locator('[data-faq] summary').first();
  expect(await summary.evaluate(s => getComputedStyle(s, '::before').content)).toBe('"+"');
  await summary.click();
  expect(await summary.evaluate(s => getComputedStyle(s, '::before').content)).toBe('"−"');
  expect((await summary.boundingBox())!.x).toBeGreaterThanOrEqual(12);
});
