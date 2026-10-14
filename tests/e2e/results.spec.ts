import { test, expect } from '@playwright/test';

test('every result poster keeps its own shape', async ({ page }) => {
  await page.goto('/results');
  await page.waitForLoadState('networkidle');
  // Posters folded away behind "Show all" are not drawn, so only the visible ones are measured.
  const shapes = await page.locator('.result img').evaluateAll(images => images
    .map(img => { const box = img.getBoundingClientRect(); return { w: box.width, h: box.height, real: Number(img.getAttribute('width')) / Number(img.getAttribute('height')) }; })
    .filter(shape => shape.h > 0)
    .slice(0, 40));
  expect(shapes.length).toBeGreaterThan(10);
  for (const shape of shapes) expect(Math.abs(shape.w / shape.h / shape.real - 1), JSON.stringify(shape)).toBeLessThan(0.02);
});

test('on a phone a long exam group shows two rows, then everything after Show all', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'two rows of two on a phone');
  await page.goto('/results');
  const group = page.locator('section[data-year="2026"] .exam').filter({ hasText: 'Plus Two' });
  const visible = () => group.locator('.result:visible').count();
  expect(await visible()).toBe(4);
  await group.getByRole('button', { name: /^Show all \d+/ }).click();
  expect(await visible()).toBe(9);
});

test('the home results row shows whole posters at one height', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'checked on a wide screen');
  await page.goto('/');
  const heights = await page.locator('#results .result img').evaluateAll(images => images.map(img => Math.round(img.getBoundingClientRect().height)));
  expect(heights.length).toBeGreaterThan(2);
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
});
