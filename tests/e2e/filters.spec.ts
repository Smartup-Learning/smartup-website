import { test, expect } from '@playwright/test';

test('choosing a subject shows only that group', async ({ page }) => {
  await page.goto('/faculty');
  const people = page.locator('#team-list > li');
  const total = await people.count();
  await page.getByRole('button', { name: 'Chemistry' }).click();
  await expect(page.getByRole('button', { name: 'Chemistry' })).toHaveAttribute('aria-pressed', 'true');
  const visible = await people.evaluateAll(items => items.filter(i => !(i as HTMLElement).hidden).length);
  expect(visible).toBe(5);
  await page.getByRole('button', { name: 'Everyone' }).click();
  await expect(people.filter({ visible: true })).toHaveCount(total);
});

test('without JavaScript everyone is listed and the chips are hidden', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/faculty');
  await expect(page.locator('#team-list > li')).toHaveCount(35);
  await expect(page.getByRole('button', { name: 'Chemistry' })).toBeHidden();
  await context.close();
});

test('choosing a year on Results shows only that year', async ({ page }) => {
  await page.goto('/results');
  await page.getByRole('button', { name: '2023' }).click();
  await expect(page.locator('section[data-year]:visible')).toHaveCount(1);
  await expect(page.locator('section[data-year="2023"]')).toBeVisible();
});
