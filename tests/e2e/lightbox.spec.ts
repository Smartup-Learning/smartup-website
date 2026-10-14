import { test, expect } from '@playwright/test';

const viewer = (page: import('@playwright/test').Page) => page.locator('dialog.lightbox');

test('tapping a result poster opens it full size in the viewer, and Escape closes it', async ({ page }) => {
  await page.goto('/results');
  const poster = page.locator('main a[data-lightbox]').first();
  const href = await poster.getAttribute('href');
  await poster.click();
  await expect(viewer(page)).toBeVisible();
  await expect(viewer(page).locator('img')).toHaveAttribute('src', href!);
  expect(page.url()).toMatch(/\/results$/);
  await page.keyboard.press('Escape');
  await expect(viewer(page)).toBeHidden();
  await expect(poster).toBeFocused();
});

test('the viewer steps through the group, and the back button closes it without leaving the page', async ({ page }) => {
  await page.goto('/results');
  const posters = page.locator('main a[data-lightbox]');
  const first = await posters.nth(0).getAttribute('href');
  await posters.nth(0).click();
  await viewer(page).getByRole('button', { name: 'Next' }).click();
  await expect(viewer(page).locator('img')).not.toHaveAttribute('src', first!);
  await expect(viewer(page).locator('[data-lightbox-count]')).toHaveText(/^2 of \d+$/);
  await page.goBack();
  await expect(viewer(page)).toBeHidden();
  expect(page.url()).toMatch(/\/results$/);
});

test('story pictures on the home page open in the viewer', async ({ page }) => {
  await page.goto('/');
  const picture = page.locator('#about a[data-lightbox]').first();
  await picture.scrollIntoViewIfNeeded();
  await picture.click();
  await expect(viewer(page)).toBeVisible();
  await viewer(page).getByRole('button', { name: 'Close' }).click();
  await expect(viewer(page)).toBeHidden();
});

test('a swipe moves to the next picture on a phone', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone only');
  await page.goto('/results');
  const posters = page.locator('main a[data-lightbox]');
  const first = await posters.nth(0).getAttribute('href');
  await posters.nth(0).click();
  await expect.poll(() => viewer(page).locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const box = (await viewer(page).locator('img').boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, y, { steps: 6 });
  await page.mouse.up();
  await expect(viewer(page).locator('img')).not.toHaveAttribute('src', first!);
});

test('without JavaScript a poster link opens the full image in the same tab', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/results');
  const poster = page.locator('main a[data-lightbox]').first();
  await expect(poster).toHaveAttribute('href', /-1600\.webp$/);
  await expect(poster).not.toHaveAttribute('target', '_blank');
  await context.close();
});
